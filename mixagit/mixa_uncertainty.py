"""First-order propagation of the measured reference, not an extra fitted offset.

The optimizer and objective are unchanged. Gaussian raw measurement errors are
propagated through the actual sample median and the fitted-parameter sensitivity.
This includes the baseline/kinetic cross-covariance for a prespecified OU model.
"""

from functools import lru_cache

import numpy as np
from scipy import special, stats


BASELINE_ERROR = "Conditional IID measurement SE with baseline propagation (not independent-repeat SD)"
BASELINE_GLS_ERROR = "Conditional fixed-OU measurement SE with baseline propagation (not independent-repeat SD)"


def baseline_reference(times, on, estimated=True):
    t = np.asarray(times, float)
    mask = t < on
    return dict(baseline_estimated=bool(estimated and mask.any()), baseline_mask=mask if estimated else np.zeros(len(t), bool),
                baseline_reference_times=t[mask].copy() if estimated else np.array([], float))


@lru_cache(maxsize=128)
def _median_moments(times, tau, standardized_slope):
    """Finite-sample Gaussian median moments; deterministic integration draws.

    Stein's identity gives Cov(e_i, median(e_baseline)) = K_i,b E[grad median].
    For IID stationary samples the expected rank weights are exactly 1/n.
    """
    t = np.asarray(times)
    n = len(t)
    if n == 1:
        return 1., np.ones(1), "Exact one-point Gaussian reference", 0
    stationary_iid = tau == 0 and standardized_slope == 0
    if stationary_iid and n >= 128:
        return np.pi/(2*n), np.full(n, 1/n), "Large-sample Gaussian median variance", 0
    if n > 4096:
        raise ValueError("Correlated/trending baseline propagation requires at most 4096 reference observations.")
    power = 15 if n <= 128 else (12 if n <= 512 else 11)
    uniform = stats.qmc.Sobol(d=n, scramble=True, seed=624031).random_base2(power)
    samples = special.ndtri(np.clip(uniform, 1e-12, 1-1e-12))
    if tau > 0:
        for index, dt in enumerate(np.diff(t), 1):
            alpha = np.exp(-dt/tau)
            samples[:, index] = alpha*samples[:, index-1] + np.sqrt(-np.expm1(-2*dt/tau))*samples[:, index]
    samples += standardized_slope * (t-t.mean())
    middle = [n//2] if n % 2 else [n//2-1, n//2]
    order = np.argpartition(samples, middle, axis=1)[:, middle]
    medians = np.take_along_axis(samples, order, axis=1).mean(axis=1)
    weights = np.full(n, 1/n) if stationary_iid else np.bincount(order.ravel(), minlength=n)/order.size
    return float(np.var(medians, ddof=1)), weights, "Finite-sample Gaussian median propagation using scrambled Sobol draws", 2**power


def reference_moments(times, selected_times, correlation_time=0., standardized_slope=0.):
    base, selected = np.asarray(times, float), np.asarray(selected_times, float)
    if (not len(base) or not np.isfinite(base).all() or np.any(np.diff(base) <= 0)
            or not np.isfinite(selected).all() or not np.isfinite([correlation_time, standardized_slope]).all() or correlation_time < 0):
        raise ValueError("Reference propagation needs finite ordered baseline times.")
    origin = float(base[0])
    # Only spacings affect Gaussian reference moments; cache repeated designs.
    factor, weights, method, draws = _median_moments(tuple(base-origin), float(correlation_time), float(standardized_slope))
    if len(selected) and np.all(selected > base[-1]):
        cross = (np.exp(-(selected-base[-1])/correlation_time) * (np.exp(-(base[-1]-base)/correlation_time) @ weights)
                 if correlation_time > 0 else np.zeros(len(selected)))
    elif correlation_time > 0:
        cross = np.exp(-np.abs(selected[:, None]-base[None, :])/correlation_time) @ weights
    else:
        # Also supports overlapping masks in numerical tests without double counting.
        cross = np.equal(selected[:, None], base[None, :]) @ weights
    return dict(variance_factor=factor, cross_covariance_factor=cross, rank_weights=weights,
                integration_method=method, integration_draws=draws, n_reference=len(base))


def _whiten(values, times, tau):
    if tau <= 0:
        return np.asarray(values)
    alpha = np.exp(-np.diff(times)/tau)
    return np.r_[values[0], (values[1:]-alpha*values[:-1])/np.sqrt(-np.expm1(-2*np.diff(times)/tau))]


def propagate_baseline(jacobian, residuals, curves, correlation_time=0.):
    """Sandwich covariance for the existing least-squares estimator.

    Q = I + beta*u*u' - u*v' - v*u' in objective coordinates. The last
    two terms retain cross-phase raw-noise dependence rather than adding an
    independent reference error to OU data. No kinetic observation is added.
    """
    jac, residual = np.asarray(jacobian, float), np.asarray(residuals, float)
    n, p = jac.shape
    metadata = dict(applied=False, method="Measured-baseline first-order covariance propagation",
                    conditioning="Gaussian raw measurement noise; fixed relative weights, OU time, model, concentrations and controls",
                    kinetic_observations=n, free_parameters=p, references=[])
    if not p or not any(curve.get("baseline_estimated", False) for curve in curves):
        return None, metadata
    if residual.shape != (n,):
        raise ValueError("Residuals must match the selected-observation Jacobian.")
    scale = np.linalg.norm(jac, axis=0)
    if n <= p or np.any(scale == 0) or not np.isfinite(jac).all():
        raise ValueError("Baseline propagation requires identifiable free-parameter sensitivities.")
    u, singular, vt = np.linalg.svd(jac/scale, full_matrices=False)
    if singular[-1] <= singular[0]*max(jac.shape)*np.finfo(float).eps or singular[0]/singular[-1] > 1e10:
        raise ValueError("Baseline propagation cannot repair unidentifiable parameters.")
    influence = ((vt.T/singular) @ u.T)/scale[:, None]
    covariance_factor = influence @ influence.T
    variance_trace = float(n-p)
    provisional_sd = np.sqrt(float(residual @ residual)/(n-p))
    start = 0
    for curve in curves:
        selected_mask = np.asarray(curve["fit_mask"], bool)
        count = int(selected_mask.sum())
        stop = start+count
        if curve.get("baseline_estimated", False):
            times = np.asarray(curve["time"], float)
            base_mask = np.asarray(curve.get("baseline_mask", times < curve["on"]), bool)
            if "baseline_reference_times" in curve:
                reference_times = np.asarray(curve["baseline_reference_times"], float)
            elif base_mask.shape == times.shape:
                reference_times = times[base_mask]
            else:
                raise ValueError("Baseline mask does not match its time grid.")
            if not len(reference_times) or np.any(reference_times >= curve["on"]) or np.intersect1d(reference_times, times[selected_mask]).size:
                raise ValueError("Baseline references must be present and distinct from selected kinetic observations.")
            sd = provisional_sd*float(curve.get("relative_sd", 1.))
            slope = float(curve.get("baseline_trend", 0.))
            standardized = slope/sd if sd > 0 else 0.
            moments = reference_moments(reference_times, times[selected_mask], correlation_time, standardized)
            ones = _whiten(np.ones(count), times[selected_mask], correlation_time)
            cross = _whiten(moments["cross_covariance_factor"], times[selected_mask], correlation_time)
            influence_block = influence[:, start:stop]
            a, b = influence_block @ ones, influence_block @ cross
            beta = moments["variance_factor"]
            covariance_factor += beta*np.outer(a, a)-np.outer(a, b)-np.outer(b, a)
            # E[RSS] = sigma^2 tr((I-H)Q), not sigma^2*(N-p) after referencing.
            projection_a, projection_b = u[start:stop].T @ ones, u[start:stop].T @ cross
            variance_trace += beta*(ones @ ones-projection_a @ projection_a)-2*(ones @ cross-projection_a @ projection_b)
            metadata["references"].append(dict(filename=curve.get("filename"), concentration_nM=curve.get("concentration_nM"),
                n_reference=moments["n_reference"], variance_factor=beta, standardized_baseline_trend=standardized,
                integration_method=moments["integration_method"], integration_draws=moments["integration_draws"],
                raw_cross_phase_covariance_included=correlation_time > 0))
        start = stop
    if start != n or variance_trace <= 0 or not np.isfinite(variance_trace):
        raise ValueError("Reference propagation has incompatible residual blocks or noise degrees of freedom.")
    propagated = covariance_factor*float(residual @ residual)/variance_trace
    propagated = (propagated+propagated.T)/2
    # Physical-unit conditioning can be large; test PSD after diagonal scaling.
    diagonal = np.diag(propagated)
    if not np.isfinite(propagated).all() or np.any(diagonal < 0):
        raise ValueError("Invalid propagated covariance.")
    standard = np.sqrt(np.maximum(diagonal, np.finfo(float).tiny))
    if np.linalg.eigvalsh(propagated/np.outer(standard, standard)).min() < -1e-7:
        raise ValueError("Reference propagation covariance is not positive semidefinite.")
    metadata.update(applied=True, residual_variance_trace=variance_trace,
                    residual_noise_variance=float(residual @ residual)/variance_trace,
                    interval_scope="Local first-order parameter uncertainty including measured baseline; not shared-control, concentration or model-selection uncertainty",
                    likelihood_scope="Existing likelihood and exploratory RSS profiles remain conditional on preprocessing; this covariance repair does not redefine them")
    return propagated, metadata
