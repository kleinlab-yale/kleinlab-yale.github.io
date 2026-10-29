"""Conditional Monte Carlo residual checks with local refitting projection.

The maximum statistic accounts for repeated serial-correlation looks across
curves/phases. This is a fitted-model approximation, not an exact omnibus test.
"""

import time

import numpy as np

from mixa_inference import objective, review_problem
from mixa_input_uncertainty import collect_sources, common_options, estimator_sensitivity, interpolation_grid, source_sd, whiten


def _noise(rng, draws, times, sd, tau):
    z = rng.normal(size=(draws, len(times)))
    if tau > 0:
        for i, dt in enumerate(np.diff(times), 1):
            z[:, i] = np.exp(-dt/tau)*z[:, i-1]+np.sqrt(-np.expm1(-2*dt/tau))*z[:, i]
    return z*sd


def _correlation(samples, left, right):
    x, y = samples[:, left], samples[:, right]
    x, y = x-x.mean(axis=1, keepdims=True), y-y.mean(axis=1, keepdims=True)
    denominator = np.sqrt(np.sum(x*x, axis=1)*np.sum(y*y, axis=1))
    return np.divide(np.sum(x*y, axis=1), denominator, out=np.zeros(len(samples)), where=denominator > 0)


def serial_null_check(result, *, draws=499, seed=731021, runtime_s=10.):
    if not isinstance(draws, int) or draws < 99 or not np.isfinite(runtime_s) or runtime_s <= 0:
        raise ValueError("Use at least 99 null draws and a finite positive diagnostic budget.")
    started = time.perf_counter()
    problem = review_problem(result)
    curves = problem["curves"]
    values = {key: row["value"] for key, row in problem["controls"].items()}
    free = [k for k, row in problem["controls"].items() if not row["fixed"]]
    columns = []
    for key in free:
        if time.perf_counter()-started > runtime_s:
            raise RuntimeError("Residual-check sensitivity budget expired.")
        rule = problem["controls"][key]
        plus, minus = values.copy(), values.copy()
        if rule["positive"]:
            plus[key], minus[key] = values[key]*np.exp(1e-4), values[key]*np.exp(-1e-4)
        else:
            step = 1e-4*max(abs(rule["lower"]), abs(rule["upper"]), 1e-12)
            plus[key], minus[key] = values[key]+step, values[key]-step
        columns.append((objective(problem, plus)-objective(problem, minus))/(2e-4))
    jacobian = np.column_stack(columns)
    sensitivity = estimator_sensitivity(jacobian)
    rng = np.random.default_rng(seed)
    options = common_options(curves)
    source_noise, sources = {}, {}
    if options["propagate_measurement"]:
        sources, _ = collect_sources(curves, options)
        if draws*sum(len(s["time"]) for s in sources.values()) > 5000000:
            raise ValueError("Residual calibration exceeds the bounded simulation size.")
        source_noise = {k: _noise(rng, draws, s["time"], s["sd"], options["raw_correlation_time_s"])
                        for k, s in sorted(sources.items())}
    blocks, pairs, noise_methods, position = [], [], [], 0
    for c in curves:
        if time.perf_counter()-started > runtime_s:
            raise RuntimeError("Residual-check simulation budget expired.")
        t, mask = np.asarray(c["time"]), c["fit_mask"]
        if source_noise:
            error = np.zeros((draws, len(t)))
            for term in c["measurement_sources"]:
                left, right, fraction = interpolation_grid(sources[term["id"]]["time"], t)
                z = source_noise[term["id"]]
                error += term["weight"]*((1-fraction)*z[:, left]+fraction*z[:, right])
            error *= c.get("response_sign", 1.)
        else:
            sigma = c.get("noise_sd", np.nan)
            if not np.isfinite(sigma) or sigma <= 0:
                sigma, method = source_sd(dict(time=t, response=c["response"], role="Sample"), c["on"],
                    {**options, "sample_noise_sd": 0., "raw_correlation_time_s": problem["correlation_time"]})
            else:
                method = "Saved supplied or baseline-estimated trace SD"
            noise_methods.append(dict(filename=c["filename"], concentration_nM=c["concentration_nM"], noise_sd=sigma, method=method))
            error = _noise(rng, draws, t, sigma, problem["correlation_time"])
        if c.get("baseline_estimated"):
            reference = np.isin(t, c["baseline_reference_times"])
            if not reference.any():
                raise ValueError("Measured baseline observations are unavailable to residual calibration.")
            drift = values.get(c["_review_keys"].get("drift"), 0.)
            trend = drift*(t[reference]-t[reference].mean())
            error -= (np.median(error[:, reference]+trend, axis=1)-np.median(trend))[:, None]
        blocks.append(whiten(error[:, mask], t[mask], problem["correlation_time"])/c.get("relative_sd", 1.))
        selected_indices = np.flatnonzero(mask)
        for phase, active in [("Association", t[mask] < c["off"]), ("Dissociation", t[mask] >= c["off"])]:
            adjacent = (np.diff(selected_indices) == 1) & active[:-1] & active[1:]
            left = np.flatnonzero(adjacent)+position
            if len(left) >= 20:
                pairs.append(dict(filename=c["filename"], concentration_nM=c["concentration_nM"], phase=phase,
                                  left=left, right=left+1))
        position += int(mask.sum())
    if not pairs:
        return dict(available=True, draws=draws, looks=0, p_mc=None, flag=False, seed=seed,
                    method="No phase has twenty contiguous adjacent pairs; serial screen unavailable, not evidence of independence")
    errors = np.concatenate(blocks, axis=1)
    errors += (errors @ sensitivity.T) @ jacobian.T
    observed = objective(problem, values)[None, :]
    observed_max, simulated_max, details = 0., np.zeros(draws), []
    for row in pairs:
        rho = float(_correlation(observed, row["left"], row["right"])[0])
        statistic = abs(rho)*np.sqrt(len(row["left"]))
        simulated = np.abs(_correlation(errors, row["left"], row["right"]))*np.sqrt(len(row["left"]))
        observed_max, simulated_max = max(observed_max, statistic), np.maximum(simulated_max, simulated)
        details.append({k: v for k, v in row.items() if k not in {"left", "right"}} |
                       dict(adjacent_pairs=len(row["left"]), lag1_correlation=rho, statistic=statistic))
    p = float((1+np.count_nonzero(simulated_max >= observed_max))/(draws+1))
    return dict(available=True, draws=draws, seed=seed, looks=len(pairs), observed_max_statistic=observed_max,
                null_95_threshold=float(np.quantile(simulated_max, .95)), p_mc=p, flag=p <= .05,
                traces=details, raw_measurement_budget=bool(source_noise),
                noise_scales=noise_methods,
                method="Conditional maximum lag-1 correlation Monte Carlo check across all eligible curves/phases; local fitted-parameter projection",
                scope="Prespecified 0.05 Monte Carlo tail rule with plus-one counting. Gaussian noise, supplied/plug-in SD and OU time; finite baselines and enabled shared raw controls simulated. Refitting effect is locally linearized, not a full nonlinear refit per null draw. No concentration calibration, model-selection correction or posterior model probability. Pooled irregular sampling/gaps are not joined.")
