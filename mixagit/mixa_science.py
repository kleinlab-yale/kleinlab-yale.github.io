"""Numerical and inferential safeguards independent of the Streamlit interface."""

import numpy as np
from scipy import stats
from scipy.integrate import solve_ivp
from scipy.linalg import expm
from scipy.optimize import brentq, minimize_scalar
from scipy.special import expit


CONDITIONAL_ERROR = "Conditional IID model SE (not independent-repeat SD)"


def json_safe(value):
    """Keep missing/open scientific results valid JSON, with meaning in metadata."""
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, np.ndarray):
        return json_safe(value.tolist())
    if isinstance(value, (tuple, list)):
        return [json_safe(v) for v in value]
    if isinstance(value, (float, np.floating)):
        return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.integer, np.bool_)):
        return value.item()
    return value


def scientific_metadata(result):
    keys = ["summary_eligible", "boundary_parameters", "identifiable", "saturation_coverage",
            "affinity_interpretation", "uncertainty_method", "scientific_warnings", "weighting",
            "covariance_status", "degrees_of_freedom", "n_fit_observations", "n_parameters",
            "jacobian_rank", "scaled_jacobian_condition", "KD_profile_ci95", "profile_interval_method",
            "bootstrap_diagnostics", "rmax_se_by_group", "residual_dependence", "information_criteria", "baseline_uncertainty", "input_uncertainty", "covariance_rates", "precision_screen"]
    metadata = {key: result[key] for key in keys if key in result}
    interval = result.get("KD_profile_ci95")
    if interval is not None:
        metadata["profile_lower_limit_open"] = bool(interval[0] == 0.)
        metadata["profile_upper_limit_open"] = bool(np.isinf(interval[1]))
    metadata["curves"] = [{"filename": fit.get("filename"),
                           "concentration_nM": fit.get("concentration", fit.get("concentration_nM")),
                           **{key: fit[key] for key in ["boundary_parameters", "residual_dependence", "uncertainty_method",
                                                       "affinity_interpretation", "microscopic_KD_first_step", "baseline_uncertainty"] if key in fit}}
                          for fit in result.get("individual_fits", result.get("curve_fits", []))]
    return json_safe(metadata)


def gaussian_information(residuals, n_mean_parameters, sigma=None):
    """Gaussian ML criteria, including the fitted residual-variance parameter."""
    r = np.asarray(residuals, dtype=float)
    n, k = r.size, int(n_mean_parameters) + 1
    if not n or not np.isfinite(r).all():
        return {"aic": np.inf, "aicc": np.inf, "bic": np.inf, "log_likelihood": -np.inf,
                "n": n, "k": k}
    noise_scale = np.ones(n) if sigma is None else np.asarray(sigma, dtype=float)
    if noise_scale.shape != r.shape or not np.all(np.isfinite(noise_scale) & (noise_scale > 0)):
        raise ValueError("Gaussian likelihood weights must be finite and positive.")
    variance = float((r / noise_scale) @ (r / noise_scale)) / n
    if variance <= 0:
        return {"aic": np.inf, "aicc": np.inf, "bic": np.inf, "log_likelihood": -np.inf,
                "n": n, "k": k}
    ll = -.5 * n * (np.log(2 * np.pi * variance) + 1) - np.log(noise_scale).sum()
    aic = -2 * ll + 2 * k
    return {"aic": float(aic), "aicc": float(aic + 2 * k * (k + 1) / (n - k - 1)) if n > k + 1 else np.inf,
            "bic": float(-2 * ll + k * np.log(n)), "log_likelihood": float(ll), "n": n, "k": k}


def boundary_flags(values, lower, upper, names):
    flags = []
    for value, lo, hi, name in zip(values, lower, upper, names):
        # Relative to each endpoint, not the full (often many-decade) bound width.
        low_tol = 1e-5 * max(abs(lo), abs(value), 1e-12)
        high_tol = 1e-5 * max(abs(hi), abs(value), 1e-12)
        if (np.isfinite(lo) and value - lo <= low_tol) or (np.isfinite(hi) and hi - value <= high_tol):
            flags.append(name)
    return flags


def conditional_covariance(jacobian, residuals):
    """Scale columns before SVD; never hide rank loss with a pseudoinverse."""
    jac = np.asarray(jacobian, dtype=float)
    r = np.asarray(residuals, dtype=float)
    n, p = jac.shape
    dof = n - p
    out = {"covariance": None, "degrees_of_freedom": dof, "jacobian_rank": 0,
           "scaled_jacobian_condition": np.inf, "covariance_status": "Insufficient residual degrees of freedom"}
    if dof <= 0 or not np.isfinite(jac).all():
        return out
    scale = np.linalg.norm(jac, axis=0)
    if np.any(scale == 0):
        out["covariance_status"] = "Unidentifiable parameter (zero sensitivity)"
        return out
    _, singular, vt = np.linalg.svd(jac / scale, full_matrices=False)
    rank = int(np.count_nonzero(singular > singular[0] * max(jac.shape) * np.finfo(float).eps))
    condition = float(singular[0] / singular[-1]) if singular[-1] > 0 else np.inf
    out.update(jacobian_rank=rank, scaled_jacobian_condition=condition)
    if rank < p or condition > 1e10:
        out["covariance_status"] = "Rank-deficient or ill-conditioned parameter sensitivities"
        return out
    cov = ((vt.T / singular**2) @ vt) * float(r @ r) / dof / np.outer(scale, scale)
    out.update(covariance=cov, covariance_status=CONDITIONAL_ERROR)
    return out


def prediction_covariance(function, time, response, parameters, bounds, reference_curves=None):
    """Recompute scaled sensitivities instead of trusting a solver pseudoinverse."""
    values = np.asarray(parameters, float)
    lower, upper = (np.asarray(endpoint, float) for endpoint in bounds)
    columns = []
    for index, value in enumerate(values):
        step = 1e-4 * abs(value) if value else 1e-5 * min(upper[index] - lower[index], 1.)
        step = max(step, np.finfo(float).eps)
        low, high = values.copy(), values.copy()
        low[index], high[index] = max(lower[index], value - step), min(upper[index], value + step)
        if high[index] <= low[index]:
            columns.append(np.zeros(len(time)))
        else:
            columns.append((function(time, *high) - function(time, *low)) / (high[index] - low[index]))
    jacobian = np.column_stack(columns)
    residual = np.asarray(response) - function(time, *values)
    info = conditional_covariance(jacobian, residual)
    if reference_curves is not None and info["covariance"] is not None:
        from mixa_uncertainty import propagate_baseline

        try:
            covariance, metadata = propagate_baseline(jacobian, residual, reference_curves)
            info["baseline_uncertainty"] = metadata
            info["conditional_on_baseline_covariance"] = info["covariance"]
            if covariance is not None:
                info["covariance"] = covariance
        except ValueError as exc:
            info.update(covariance=None, covariance_status="Unavailable: baseline uncertainty propagation failed",
                        baseline_uncertainty=dict(applied=False, error=str(exc)))
    return info


def drift_comparison(base, extra, shared=False):
    """Compare only identical observations with a declared common IID likelihood."""
    def observations(result):
        if shared:
            fits = result.get("individual_fits", [])
            keys = [(f.get("filename"), f.get("concentration"), tuple(np.flatnonzero(f.get("fit_mask", [])))) for f in fits]
            residuals = np.concatenate([np.asarray(f.get("residuals_fit", []), float) for f in fits]) if fits else np.array([])
        else:
            keys = [tuple(np.flatnonzero(result.get("fit_mask", [])))]
            residuals = np.asarray(result.get("residuals_fit", []), float)
        parameters = result.get("n_parameters" if shared else "n_params")
        return keys, residuals, parameters

    keys0, r0, p0 = observations(base)
    keys1, r1, p1 = observations(extra)
    comparable = keys0 == keys1 and len(r0) == len(r1) and p0 is not None and p1 is not None
    delta = np.nan
    reason = "Candidates do not have identical observations and declared parameter counts."
    accepted = False
    if comparable:
        delta = gaussian_information(r1, p1)["aicc"] - gaussian_information(r0, p0)["aicc"]
        eligible = extra.get("summary_eligible", False) and not extra.get("boundary_parameters")
        fits = extra.get("individual_fits", []) if shared else [extra]
        correlated = any(f.get("residual_dependence", {}).get("serial_correlation_flag", False) for f in fits)
        accepted = bool(np.isfinite(delta) and delta < -2. and eligible and not correlated)
        reason = "Drift has lower AICc by more than 2 with resolved parameters." if accepted else (
            "Drift lacks sufficient complexity-adjusted support, resolved parameters or an adequate IID residual model.")
    return dict(accepted=accepted, comparable=bool(comparable), delta_aicc=float(delta), reason=reason,
                policy="Same-observation conditional IID AICc; require improvement >2 and eligible uncorrelated fit. Not proof of physical drift.")


def residual_dependence(residuals, mask=None, signal_scale=None):
    """Descriptive serial-correlation screen, without joining trimmed intervals."""
    r = np.asarray(residuals, dtype=float)
    if mask is None:
        mask = np.ones(len(r), dtype=bool)
    mask = np.asarray(mask, dtype=bool)
    index = np.flatnonzero(mask)
    selected = r[mask]
    if signal_scale is not None and np.std(selected) <= 100 * np.finfo(float).eps * max(abs(signal_scale), np.finfo(float).tiny):
        return {"lag1_correlation": np.nan, "adjacent_pairs": 0, "serial_correlation_flag": False,
                "screen": "Residuals at numerical precision; serial correlation not interpretable"}
    adjacent = np.diff(index) == 1
    x, y = selected[:-1][adjacent], selected[1:][adjacent]
    rho = float(np.corrcoef(x, y)[0, 1]) if len(x) >= 3 and np.std(x) > 0 and np.std(y) > 0 else np.nan
    flagged = bool(len(x) >= 20 and np.isfinite(rho) and abs(rho) > max(.3, 2 / np.sqrt(len(x))))
    return {"lag1_correlation": rho, "adjacent_pairs": int(len(x)), "serial_correlation_flag": flagged,
            "screen": "Descriptive lag-1 screen; not a calibrated hypothesis test"}


def _linear_state(matrix, initial, times):
    """Exact two-dimensional linear propagation, including a repeated-root limit."""
    t = np.asarray(times, dtype=float)
    trace = np.trace(matrix)
    disc = max(float(trace**2 - 4 * np.linalg.det(matrix)), 0.)
    root = np.sqrt(disc)
    high, low = (trace + root) / 2, (trace - root) / 2
    if root < 1e-10 * max(abs(trace), 1e-12):
        return np.array([expm(matrix * dt) @ initial for dt in t]).T
    difference = np.exp(high * t) * (-np.expm1(-root * t)) / root
    return initial[:, None] * np.exp(low * t) + ((matrix - low * np.eye(2)) @ initial)[:, None] * difference


def two_state_signal(t, kon, koff, rmax, ka, kd, concentration, start, end):
    t = np.asarray(t, dtype=float)
    signal = np.zeros_like(t)
    if end <= start:
        raise ValueError("Dissociation must follow association.")
    a = kon * concentration
    if a == 0 or rmax == 0:
        return signal
    if ka == 0:
        rate = a + koff
        duration = np.maximum(np.minimum(t, end) - start, 0.)
        signal = rmax * a / rate * (-np.expm1(-rate * duration))
        signal[t > end] *= np.exp(-koff * (t[t > end] - end))
        return signal
    matrix = np.array([[-a - koff - ka, kd - a], [ka, -kd]], dtype=float)
    equilibrium = np.linalg.solve(matrix, np.array([-a * rmax, 0.]))
    assoc = (t >= start) & (t <= end)
    if assoc.any():
        states = equilibrium[:, None] - _linear_state(matrix, equilibrium, t[assoc] - start)
        signal[assoc] = states.sum(axis=0)
    # Transition state is at the physical phase boundary, never the last sampled point.
    transition = equilibrium - _linear_state(matrix, equilibrium, [end - start])[:, 0]
    off = t > end
    if off.any():
        off_matrix = np.array([[-koff - ka, kd], [ka, -kd]])
        signal[off] = _linear_state(off_matrix, transition, t[off] - end).sum(axis=0)
    return signal


def delivery_lag_signal(t, kon, koff, rmax, rate, concentration, start, end):
    """Empirical analyte-delivery lag, NOT a coupled surface mass-transport model."""
    t = np.asarray(t, dtype=float)
    signal = np.zeros_like(t)
    if end <= start:
        raise ValueError("Dissociation must follow association.")
    if not t.size or concentration == 0 or rmax == 0:
        return signal

    def rhs(elapsed, state):
        effective = concentration * (-np.expm1(-rate * elapsed))
        return kon * effective * (rmax - state) - koff * state

    sol = solve_ivp(rhs, (0., end - start), [0.], method="LSODA", dense_output=True,
                    rtol=1e-9, atol=max(abs(rmax) * 1e-11, 1e-13))
    if not sol.success:
        raise RuntimeError("Delivery-lag integration failed.")
    assoc = (t >= start) & (t <= end)
    if assoc.any():
        signal[assoc] = sol.sol(t[assoc] - start)[0]
    off = t > end
    signal[off] = sol.y[0, -1] * np.exp(-koff * (t[off] - end))
    return signal


def two_state_affinity(parameters, covariance):
    kon, koff, _, ka, kd = parameters[:5]
    affinity = koff / kon * kd / (ka + kd)
    gradient = np.zeros(len(parameters))
    gradient[[0, 1, 3, 4]] = [-affinity / kon, affinity / koff,
                              -affinity / (ka + kd), koff / kon * ka / (ka + kd)**2]
    error = float(np.sqrt(max(float(gradient @ covariance @ gradient), 0.))) if np.isfinite(covariance).all() else np.nan
    return float(affinity), error


def fit_profile_isotherm(concentrations, responses, sigma=None, model="simple"):
    """Positive isotherm with analytically profiled capacity, not an observed-max cap.

    Intervals use the approximate nonlinear extra-sum-of-squares F criterion.
    They are conditional on independent residuals and fixed relative weights.
    Infinite/open endpoints remain open; they are never replaced by search limits.
    """
    c, y = np.asarray(concentrations, float), np.asarray(responses, float)
    if model not in {"simple", "hill"} or np.any(c <= 0) or not np.isfinite(y).all():
        raise ValueError("Positive concentrations and a recognized isotherm model are required.")
    p = 3 if model == "hill" else 2
    weights = np.ones(len(y)) if sigma is None else 1 / np.asarray(sigma, float)
    if not np.all(np.isfinite(weights) & (weights > 0)):
        raise ValueError("Fitting errors must be finite and positive; missing errors cannot be replaced by zero.")
    weights /= np.median(weights)
    logc = np.log(c)
    limits = (float(logc.min() - 32), float(logc.max() + 32))

    def evaluate(logkd, hill=1.):
        occupancy = expit(hill * (logc - logkd))
        q = occupancy * weights
        capacity = max(float(q @ (y * weights) / (q @ q)), 0.)
        residual = (y - capacity * occupancy) * weights
        return float(residual @ residual), capacity, hill

    def profile(logkd):
        if model == "simple":
            return evaluate(logkd)
        opt = minimize_scalar(lambda logn: evaluate(logkd, np.exp(logn))[0],
                              bounds=(np.log(.1), np.log(10.)), method="bounded", options={"xatol": 1e-10})
        return min([evaluate(logkd, np.exp(opt.x)), evaluate(logkd, .1), evaluate(logkd, 1.),
                    evaluate(logkd, 10.)], key=lambda row: row[0])

    grid = np.linspace(*limits, 81)
    costs = np.array([profile(v)[0] for v in grid])
    candidates = [(costs[0], grid[0]), (costs[-1], grid[-1])]
    for index in range(1, len(grid) - 1):
        if costs[index] <= costs[index - 1] and costs[index] <= costs[index + 1]:
            opt = minimize_scalar(lambda value: profile(value)[0], bounds=(grid[index - 1], grid[index + 1]),
                                  method="bounded", options={"xatol": 1e-12})
            candidates.append((opt.fun, opt.x))
    _, logkd = min(candidates)
    rss, rmax, hill = profile(logkd)
    kd = float(np.exp(logkd))
    occupancy = expit(hill * (logc - logkd))
    fitted = rmax * occupancy
    jac = np.column_stack([occupancy, -rmax * occupancy * (1 - occupancy) * hill / kd])
    if model == "hill":
        jac = np.column_stack([jac, rmax * occupancy * (1 - occupancy) * (logc - logkd)])
    covariance = conditional_covariance(jac * weights[:, None], (y - fitted) * weights)
    cov = covariance.pop("covariance")
    errors = np.sqrt(np.diag(cov)) if cov is not None else np.full(p, np.nan)
    dof = len(y) - p
    interval = (np.nan, np.nan)
    if dof > 0:
        # A floating-point floor prevents spurious zero-width intervals for exact synthetic data.
        rss_floor = max(rss, float((y * weights) @ (y * weights)) * (100 * np.finfo(float).eps)**2)
        cutoff = rss + rss_floor * stats.f.ppf(.95, 1, dof) / dof

        def endpoint(direction):
            last = logkd
            edge = limits[0 if direction < 0 else 1]
            for _ in range(100):
                trial = max(edge, last - np.log(2)) if direction < 0 else min(edge, last + np.log(2))
                if profile(trial)[0] > cutoff:
                    return float(np.exp(brentq(lambda v: profile(v)[0] - cutoff, min(last, trial), max(last, trial), xtol=1e-12)))
                if trial == edge:
                    return 0. if direction < 0 else np.inf
                last = trial
            return 0. if direction < 0 else np.inf

        interval = (endpoint(-1), endpoint(1))
    flags = []
    if logkd <= limits[0] + .01 or logkd >= limits[1] - .01:
        flags.append("KD numerical search limit (unresolved)")
    if rmax <= 0:
        flags.append("Rmax")
    if model == "hill" and (hill <= .10001 or hill >= 9.9999):
        flags.append("Hill coefficient")
    warnings = []
    identifiable = bool(dof > 0 and interval[0] > 0 and np.isfinite(interval[1]) and not flags and cov is not None)
    covered = bool(c.min() <= kd and c.max() >= 2 * kd)
    if not identifiable:
        warnings.append("Affinity is not resolved by a finite two-sided profile interval; the curve is retained but excluded from routine parameter summaries.")
    if not covered:
        warnings.append("Concentrations do not bracket the fitted half-saturation value and extend to at least twice it; saturation coverage is insufficient for routine affinity reporting.")
    return {"Rmax": rmax, "KD": kd, "n_hill": hill, "Rmax_err": float(errors[0]), "KD_err": float(errors[1]),
            "n_hill_err": float(errors[2]) if model == "hill" else np.nan,
            "fitted_responses": fitted, "KD_profile_ci95": interval,
            "profile_interval_method": "Approximate profile-RSS F interval; independent residuals, fixed relative weights",
            "boundary_parameters": flags, "identifiable": identifiable, "saturation_coverage": covered,
            "summary_eligible": identifiable and covered, "scientific_warnings": warnings,
            "affinity_interpretation": "Hill half-saturation concentration (apparent affinity)" if model == "hill" else "1:1 equilibrium dissociation constant",
            "uncertainty_method": CONDITIONAL_ERROR, **covariance}
