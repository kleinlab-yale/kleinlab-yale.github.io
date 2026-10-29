"""Parametric calibration of nuisance-refitted rate and affinity confidence sets.

The critical statistic is simulated for this saved experiment, not selected from
benchmark coverage. All unsuccessful or unrun simulations remain in the record.
"""

import time

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import minimize

from mixa_inference import (MIN_DRAWS, MIN_SUCCESS_FRACTION, estimates, objective,
                            refit, sampling_setup, simulate_curves)
from mixa_science import boundary_flags


REVISION = "2026-10-20.1"


def target_definition(problem, target):
    values = {key: row["value"] for key, row in problem["controls"].items()}
    table = estimates(problem, values).set_index("estimate")
    if target not in table.index or not table.at[target, "estimated"]:
        raise ValueError("Choose an estimated rate or affinity from this saved fit.")
    if table.at[target, "label_exchangeable"]:
        raise ValueError("Exchangeable population labels require a label-invariant constrained analysis.")
    if target in values:
        rule = problem["controls"][target]
        return dict(kind="parameter", keys=[target], positive=rule["positive"], value=values[target],
                    lower=rule["lower"], upper=rule["upper"])
    metric, dependencies = target.split("::", 1)
    if metric not in {"KD_nM", "KD_first_step_nM", "KD_overall_nM", "KD_step_1_nM", "KD_step_2_nM"}:
        raise ValueError("This derived target does not have a supported exact constraint.")
    return dict(kind=metric, keys=dependencies.split("|"), positive=True,
                value=float(table.at[target, "value"]), lower=0., upper=np.inf)


def target_value(definition, values):
    keys = definition["keys"]
    if definition["kind"] == "parameter":
        return values[keys[0]]
    value = values[keys[1]]/values[keys[0]]*1e9
    if definition["kind"] == "KD_overall_nM":
        value *= values[keys[3]]/(values[keys[2]]+values[keys[3]])
    return value


def constrained_refit(problem, target, value, *, curves=None, initial=None, starts=1,
                      runtime_s=30., max_nfev=1000, seed=1729):
    """Exact equality for KD, with all free nuisance parameters and saved bounds."""
    definition = target_definition(problem, target)
    if not np.isfinite(value) or (definition["positive"] and value <= 0):
        raise ValueError("A finite target in its physical domain is required.")
    if definition["kind"] == "parameter":
        return refit(problem, curves=curves, forced={target: value}, initial=initial,
                     starts=starts, runtime_s=runtime_s, max_nfev=max_nfev, seed=seed)
    if not isinstance(starts, int) or starts < 1 or runtime_s <= 0 or max_nfev < 1:
        raise ValueError("Positive constrained-search budgets are required.")
    curves = problem["curves"] if curves is None else curves
    controls = problem["controls"]
    names = [key for key, rule in controls.items() if not rule["fixed"]]
    base = {key: row["value"] for key, row in controls.items()}
    base.update(initial or {})
    scales = {k: max(abs(controls[k]["lower"]), abs(controls[k]["upper"]), 1e-12) for k in names}

    def encode(key, x):
        return np.log(x) if controls[key]["positive"] else x/scales[key]

    def decode(z):
        return {**base, **{k: float(np.exp(v)) if controls[k]["positive"] else float(v*scales[k])
                          for k, v in zip(names, z)}}

    low = np.array([encode(k, controls[k]["lower"]) for k in names])
    high = np.array([encode(k, controls[k]["upper"]) for k in names])
    numerator = definition["keys"][1]
    if numerator in names:
        base[numerator] = np.clip(base[numerator]*value/target_value(definition, base),
                                  controls[numerator]["lower"], controls[numerator]["upper"])
    center = np.array([encode(k, np.clip(base[k], controls[k]["lower"], controls[k]["upper"])) for k in names])
    deadline, history, candidates = time.perf_counter()+runtime_s, [], []
    variance = max(problem["rss"]/problem["n_observations"], 1e-20)

    def cost(z):
        if time.perf_counter() >= deadline:
            raise TimeoutError("Constrained refit runtime limit")
        r = objective(problem, decode(z), curves)
        return float(r @ r)/(2*variance)

    def equality(z):
        return np.log(target_value(definition, decode(z))/value)

    def equality_jac(z):
        values = decode(z)
        keys, coefficients = definition["keys"], [-1., 1.]
        if definition["kind"] == "KD_overall_nM":
            ratio = values[keys[2]]/(values[keys[2]]+values[keys[3]])
            coefficients += [-ratio, ratio]
        by_key = dict(zip(keys, coefficients))
        return np.array([by_key.get(k, 0.) for k in names])

    if not np.any(equality_jac(center)):
        raise ValueError("This affinity is determined entirely by fixed parameters.")
    rng = np.random.default_rng(seed)
    for index in range(starts):
        start = center if index == 0 else np.clip(center+rng.normal(0., .5, len(names)), low, high)
        try:
            fit = minimize(cost, start, method="SLSQP", jac="3-point", bounds=list(zip(low, high)),
                           constraints=[dict(type="eq", fun=equality, jac=equality_jac)],
                           options=dict(maxiter=max_nfev, ftol=1e-9, finite_diff_rel_step=1e-5))
            valid = bool(fit.success and np.isfinite(fit.fun) and abs(equality(fit.x)) < 1e-7)
            history.append(dict(start=index+1, converged=valid, rss=float(fit.fun*2*variance),
                                equality_error=float(equality(fit.x)), message=fit.message))
            if valid:
                candidates.append(fit)
        except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
            history.append(dict(start=index+1, converged=False, message=str(exc)))
        except TimeoutError as exc:
            history.append(dict(start=index+1, converged=False, message=str(exc)))
            break
    if not candidates:
        raise RuntimeError("No equality-constrained refit converged within its budget.")
    best = min(candidates, key=lambda item: item.fun)
    return dict(values=decode(best.x), rss=float(best.fun*2*variance), history=history,
                complete=len(history) == starts and time.perf_counter() <= deadline,
                boundaries=boundary_flags(best.x, low, high, names), equality_error=float(equality(best.x)))


def calibrated_profile(problem, target, *, draws=400, starts=1, runtime_s=600.,
                       per_fit_s=20., max_nfev=1000, seed=837291, measurement_sd=None,
                       confidence=.95, max_points=60, tolerance=1e-4):
    """Invert a bootstrap-calibrated RSS-ratio profile for one prespecified target."""
    if (not isinstance(draws, int) or not 1 <= draws <= 5000 or not 0 < confidence < 1
            or not isinstance(seed, int) or seed < 0 or runtime_s <= 0 or per_fit_s <= 0
            or not isinstance(starts, int) or starts < 1 or tolerance <= 0 or max_points < 4):
        raise ValueError("Invalid calibration/search controls.")
    definition = target_definition(problem, target)
    setup = sampling_setup(problem, measurement_sd)
    deadline, rng = time.perf_counter()+runtime_s, np.random.default_rng(seed)
    center = definition["value"]
    runs, histories = [], []
    for index in range(draws):
        row = dict(draw=index+1, status="Not run: runtime limit", statistic=np.nan)
        remaining = deadline-time.perf_counter()
        if remaining > 0:
            try:
                curves = simulate_curves(problem, setup, rng)
                unrestricted = refit(problem, curves=curves, starts=starts, runtime_s=min(per_fit_s, remaining),
                                     max_nfev=max_nfev, seed=seed+2*index)
                remaining = deadline-time.perf_counter()
                if remaining <= 0:
                    raise TimeoutError("Calibration runtime limit")
                restricted = constrained_refit(problem, target, center, curves=curves, initial=unrestricted["values"],
                    starts=starts, runtime_s=min(per_fit_s, remaining), max_nfev=max_nfev, seed=seed+2*index+1)
                for kind, fit in [("unrestricted", unrestricted), ("restricted", restricted)]:
                    histories += [dict(draw=index+1, fit=kind, **h) for h in fit["history"]]
                statistic = problem["n_observations"]*np.log(max(restricted["rss"], 1e-300)/max(unrestricted["rss"], 1e-300))
                if statistic < -1e-4:
                    raise RuntimeError("Constrained fit found a better optimum than the unrestricted fit.")
                complete = unrestricted["complete"] and restricted["complete"]
                row.update(status="Complete" if complete else "Incomplete search", statistic=max(float(statistic), 0.),
                           unrestricted_rss=unrestricted["rss"], restricted_rss=restricted["rss"],
                           boundaries=", ".join(unrestricted["boundaries"]),
                           restricted_boundaries=", ".join(restricted["boundaries"]))
            except (ValueError, RuntimeError, TimeoutError, FloatingPointError, np.linalg.LinAlgError) as exc:
                row.update(status="Failed", reason=str(exc))
        runs.append(row)
    run_table = pd.DataFrame(runs)
    statistics = np.sort(run_table.loc[run_table.status == "Complete", "statistic"].to_numpy())
    eligible = len(statistics) >= MIN_DRAWS and len(statistics)/draws >= MIN_SUCCESS_FRACTION
    critical, critical_low, critical_high = None, None, None
    points, limits, statuses, better = [], dict(lower=None, upper=None), {}, False
    if eligible:
        rank = min(int(np.ceil(confidence*(len(statistics)+1))), len(statistics))
        critical = float(statistics[rank-1])
        lo_rank = max(int(stats.binom.ppf(.025, len(statistics), confidence)), 1)
        hi_rank = min(int(stats.binom.ppf(.975, len(statistics), confidence))+1, len(statistics))
        critical_low, critical_high = float(statistics[lo_rank-1]), float(statistics[hi_rank-1])
        if not critical > 0:
            eligible = False
    scale = (max(abs(definition["lower"]), abs(definition["upper"]), 1e-12)
             if not definition["positive"] else 1.)
    encode = np.log if definition["positive"] else lambda value: value/scale
    decode = np.exp if definition["positive"] else lambda value: value*scale
    z0 = encode(center)
    low = encode(definition["lower"]) if definition["lower"] > 0 or not definition["positive"] else -700.
    high = encode(definition["upper"]) if np.isfinite(definition["upper"]) else 700.
    points.append(dict(value=center, statistic=0., status="Saved optimum"))

    def evaluate(z, initial):
        nonlocal better
        remaining = deadline-time.perf_counter()
        if remaining <= 0 or len(points) >= max_points:
            return None
        value = float(decode(z))
        try:
            fit = constrained_refit(problem, target, value, initial=initial, starts=starts,
                runtime_s=min(remaining, per_fit_s), max_nfev=max_nfev, seed=seed+draws+len(points))
            statistic = float(problem["n_observations"]*np.log(max(fit["rss"], 1e-300)/max(problem["rss"], 1e-300)))
            better |= statistic < -1e-3
            points.append(dict(value=value, statistic=statistic,
                               status="Complete" if fit["complete"] else "Incomplete search"))
            return (statistic, fit["values"]) if fit["complete"] and not better else None
        except (ValueError, RuntimeError, TimeoutError, FloatingPointError) as exc:
            points.append(dict(value=value, statistic=np.nan, status=str(exc)))
            return None

    for direction, side, bound in [(-1, "lower", low), (1, "upper", high)]:
        statuses[side] = "Insufficient calibration refits" if not eligible else "Incomplete profile search"
        if not eligible:
            continue
        inner, step, warm = z0, .15 if definition["positive"] else .01, None
        while len(points) < max_points:
            outer = max(bound, z0-step) if direction < 0 else min(bound, z0+step)
            point = evaluate(outer, warm)
            if point is None:
                break
            statistic, warm = point
            if statistic >= critical:
                while abs(outer-inner) > tolerance:
                    middle = .5*(inner+outer)
                    point = evaluate(middle, warm)
                    if point is None:
                        break
                    statistic, warm = point
                    if statistic >= critical:
                        outer = middle
                    else:
                        inner = middle
                if point is not None:
                    limits[side], statuses[side] = float(decode(.5*(inner+outer))), "Crossing resolved"
                break
            if outer == bound:
                statuses[side] = "Open at declared domain boundary"
                break
            inner, step = outer, step*1.8
    if better:
        limits = dict(lower=None, upper=None)
        statuses = dict(lower="Better optimum: rerun main fit", upper="Better optimum: rerun main fit")
    return dict(calibration_runs=run_table, searches=pd.DataFrame(histories), profile=pd.DataFrame(points).sort_values("value"),
        metadata=dict(revision=REVISION, fingerprint=problem["fingerprint"], target=target, estimate=center,
            confidence=confidence, lower=limits["lower"], upper=limits["upper"], lower_status=statuses["lower"],
            upper_status=statuses["upper"], critical_value=critical, critical_value_mc95=[critical_low, critical_high],
            requested_draws=draws, complete_draws=len(statistics), minimum_complete=MIN_DRAWS,
            minimum_success_fraction=MIN_SUCCESS_FRACTION, starts=starts, seed=seed, runtime_s=runtime_s,
            per_fit_s=per_fit_s, max_nfev=max_nfev, max_points=max_points, tolerance=tolerance,
            noise_scale=setup["objective_sd"], noise_scale_method=setup["noise_scale_method"], options=setup["options"],
            raw_sources=setup["source_metadata"], better_optimum_found=better,
            method="Invert N*log(RSS_constrained/RSS_min) at a parametric-refit calibrated critical value; upper finite-simulation order statistic ceil(confidence*(B+1)).",
            scope="Target-specific plug-in parametric calibration, not a benchmark-tuned inflation factor. Fresh noise, finite median baselines and enabled shared-source/calibration inputs are simulated. With enabled external budgets this is a hybrid measurement/calibration confidence set, not a conditional Gaussian likelihood interval. Noise-scale estimation, model/phase selection and between-repeat effects remain conditional. Disconnected regions are not excluded; unresolved/open limits are withheld."))
