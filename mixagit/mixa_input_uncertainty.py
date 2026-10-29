"""Correlated raw-reference and concentration budgets for a fixed fitted model.

These calculations change uncertainty, not the estimator, masks or likelihood.
Raw traces are independent noise sources unless the same source ID is reused.
"""

import json

import numpy as np


INPUT_ERROR = "Local combined input standard uncertainty (not independent-repeat SD)"
DEFAULT_OPTIONS = dict(propagate_measurement=False, stock_cv=0., level_cv=0.,
                       raw_correlation_time_s=0., sample_noise_sd=0., control_noise_sd=0.,
                       draws=2048, seed=920271)


def input_options(options=None):
    result = {**DEFAULT_OPTIONS, **(options or {})}
    if set(result) != set(DEFAULT_OPTIONS) or not isinstance(result["propagate_measurement"], bool):
        raise ValueError("Unknown input-uncertainty option or invalid measurement switch.")
    for key in ["stock_cv", "level_cv", "raw_correlation_time_s", "sample_noise_sd", "control_noise_sd"]:
        value = float(result[key])
        if not np.isfinite(value) or value < 0:
            raise ValueError("Input standard uncertainties and correlation times must be finite and nonnegative.")
        result[key] = value
    if max(result["stock_cv"], result["level_cv"]) > .5:
        raise ValueError("Local concentration propagation supports CVs up to 50%; use a nonlinear calibration model above this.")
    if not isinstance(result["draws"], int) or not 256 <= result["draws"] <= 8192 or not isinstance(result["seed"], int) or result["seed"] < 0:
        raise ValueError("Use 256-8192 propagation draws and a nonnegative integer seed.")
    return result


def requested(options):
    o = input_options(options)
    return o["propagate_measurement"] or o["stock_cv"] > 0 or o["level_cv"] > 0


def curve_input(data, concentration):
    return dict(measurement_sources=data.get("measurement_sources", {}).get(concentration, []),
                input_uncertainty_options=input_options(data.get("input_uncertainty")),
                response_sign=float(data.get("response_sign", 1.)))


def common_options(curves):
    options = [input_options(c.get("input_uncertainty_options")) for c in curves]
    if any(o != options[0] for o in options[1:]):
        raise ValueError("All curves in one fit must use the same input-uncertainty settings.")
    return options[0] if options else input_options()


def estimator_sensitivity(jacobian):
    """Derivative of the fixed least-squares solution with respect to residual input."""
    jac = np.asarray(jacobian, float)
    if jac.ndim != 2 or not np.isfinite(jac).all() or jac.shape[0] <= jac.shape[1] or not jac.shape[1]:
        raise ValueError("Input propagation requires an identifiable free-parameter Jacobian.")
    scale = np.linalg.norm(jac, axis=0)
    if np.any(scale == 0):
        raise ValueError("Unresolved parameter sensitivity.")
    u, s, vt = np.linalg.svd(jac/scale, full_matrices=False)
    if s[-1] <= s[0]*max(jac.shape)*np.finfo(float).eps or s[0]/s[-1] > 1e10:
        raise ValueError("Input propagation cannot repair an unidentifiable fitted model.")
    return -((vt.T/s) @ u.T)/scale[:, None]


def whiten(values, times, tau):
    values = np.asarray(values, float)
    if tau <= 0 or len(times) < 2:
        return values
    alpha = np.exp(-np.diff(times)/tau)
    return np.concatenate([values[..., :1], (values[..., 1:]-alpha*values[..., :-1])/
                           np.sqrt(-np.expm1(-2*np.diff(times)/tau))], axis=-1)


def source_sd(source, on, options):
    supplied = source.get("noise_sd")
    if supplied is None:
        supplied = options["control_noise_sd" if source.get("role") == "Negative control" else "sample_noise_sd"] or None
    if supplied is not None:
        if not np.isfinite(supplied) or supplied < 0:
            raise ValueError("Supplied raw-source noise SD must be finite and nonnegative.")
        return float(supplied), "Supplied raw-source Gaussian SD"
    t, y = np.asarray(source["time"], float), np.asarray(source["response"], float)
    mask = t < on
    if mask.sum() < 5:
        raise ValueError("Raw-source noise estimation needs at least five pre-association observations, or a supplied SD.")
    t, y = t[mask], y[mask]
    tau = options["raw_correlation_time_s"]
    design = np.column_stack([np.ones(len(t)), t-t.mean()])
    design = whiten(design.T, t, tau).T
    y = whiten(y, t, tau)
    coefficients = np.linalg.lstsq(design, y, rcond=None)[0]
    residual = y-design @ coefficients
    sd = float(np.sqrt(residual @ residual/(len(t)-2)))
    if not np.isfinite(sd) or sd <= np.finfo(float).eps*max(1., float(np.max(np.abs(y)))):
        raise ValueError("Raw-source noise is unresolved from its baseline; supply its measurement SD.")
    return sd, "Pre-association linear-detrended Gaussian SD; supplied fixed OU time" if tau else "Pre-association linear-detrended IID Gaussian SD"


def collect_sources(curves, options):
    sources, uses = {}, {}
    for curve in curves:
        terms = curve.get("measurement_sources", [])
        if not terms:
            raise ValueError("Raw-source provenance is missing. Reapply dataset assignments before propagating shared controls.")
        for term in terms:
            key = term["id"]
            t = np.asarray(term["time"], float)
            y = np.asarray(term["response"], float)
            if t.ndim != 1 or len(t) < 2 or y.shape != t.shape or not np.isfinite(t).all() or not np.isfinite(y).all() or np.any(np.diff(t) <= 0) or not np.isfinite(term["weight"]):
                raise ValueError("Invalid raw-source time grid, response or subtraction weight.")
            sd, method = source_sd(term, curve["on"], options)
            if key in sources:
                old = sources[key]
                if sd != old["sd"] or not np.array_equal(t, old["time"]) or not np.array_equal(y, old["response"]):
                    raise ValueError("A reused raw-source ID has inconsistent observations or noise assumptions.")
            else:
                sources[key] = dict(time=t, response=y, sd=sd, noise_method=method, filename=term["filename"],
                                    concentration_nM=term["concentration_nM"], role=term.get("role", "Sample"))
            uses.setdefault(key, set()).add((curve["filename"], curve["concentration_nM"]))
    metadata = [dict(source_id=key, filename=value["filename"], concentration_nM=value["concentration_nM"],
                     role=value["role"], noise_sd=value["sd"], noise_method=value["noise_method"],
                     n_target_traces=len(uses[key])) for key, value in sorted(sources.items())]
    return sources, metadata


def interpolation_grid(source_times, target_times):
    t, q = np.asarray(source_times, float), np.asarray(target_times, float)
    if len(q) and (q.min() < t[0] or q.max() > t[-1]):
        raise ValueError("Uncertainty propagation cannot extrapolate a reference trace.")
    right = np.clip(np.searchsorted(t, q, side="right"), 1, len(t)-1)
    left = right-1
    fraction = (q-t[left])/(t[right]-t[left])
    return left, right, fraction


def linear_source_covariance(curves, projections, options):
    """Exact covariance of linear trace summaries, including reused controls and OU."""
    sources, metadata = collect_sources(curves, options)
    n_outputs = len(curves)
    by_source = {key: np.zeros((n_outputs, len(value["time"]))) for key, value in sources.items()}
    for i, (curve, projection) in enumerate(zip(curves, projections)):
        q, sensitivity = projection
        sensitivity = np.asarray(sensitivity, float)*curve.get("response_sign", 1.)
        if sensitivity.shape != np.asarray(q).shape or not np.isfinite(sensitivity).all():
            raise ValueError("Invalid observation sensitivity.")
        for term in curve["measurement_sources"]:
            left, right, fraction = interpolation_grid(sources[term["id"]]["time"], q)
            target = by_source[term["id"]][i]
            np.add.at(target, left, term["weight"]*sensitivity*(1-fraction))
            np.add.at(target, right, term["weight"]*sensitivity*fraction)
    covariance = np.zeros((n_outputs, n_outputs))
    tau = options["raw_correlation_time_s"]
    for key, coefficients in by_source.items():
        source = sources[key]
        if tau > 0:
            # Apply the AR(1) Cholesky transpose without constructing a dense time covariance.
            alpha = np.exp(-np.diff(source["time"])/tau)
            transformed = np.empty_like(coefficients)
            tail = coefficients[:, -1].copy()
            for j in range(coefficients.shape[1]-1, 0, -1):
                transformed[:, j] = tail*np.sqrt(-np.expm1(-2*(source["time"][j]-source["time"][j-1])/tau))
                tail = coefficients[:, j-1]+alpha[j-1]*tail
            transformed[:, 0] = tail
        else:
            transformed = coefficients
        covariance += source["sd"]**2*(transformed @ transformed.T)
    return covariance, metadata


def calibration_covariance(sensitivities, concentrations, options):
    """Common stock and concentration-level standard uncertainties do not average away."""
    d = np.asarray(sensitivities, float)
    concentrations = np.asarray(concentrations, float)
    if d.ndim != 2 or d.shape[1] != len(concentrations) or not np.isfinite(d).all():
        raise ValueError("Invalid concentration-calibration sensitivities.")
    stock = options["stock_cv"]**2*np.outer(d.sum(axis=1), d.sum(axis=1))
    level = np.zeros_like(stock)
    for concentration in np.unique(concentrations):
        v = d[:, concentrations == concentration].sum(axis=1)
        level += options["level_cv"]**2*np.outer(v, v)
    return stock+level, dict(stock_cv=options["stock_cv"], level_cv=options["level_cv"],
        stock_scope="One common stock scale across all fitted files/repeats",
        level_scope="Independent concentration-level errors, each shared across all fitted files/repeats",
        interpretation="First-order relative standard uncertainty; supplied calibration inputs, not fitted fudge factors")


def propagate_fit_inputs(jacobian, curves, conditional_covariance, concentration_derivatives=None,
                         objective_tau=0., transform=None):
    """Local covariance of a fixed estimator with finite-median raw-reference propagation.

    Gaussian raw-source draws are shared wherever a control is reused. Median
    preprocessing is evaluated, not differentiated at the observed median rank.
    The fitted-model sensitivity remains first order; likelihoods are unchanged.
    """
    options = common_options(curves)
    metadata = dict(applied=False, settings=options)
    if not requested(options):
        return conditional_covariance, metadata
    if conditional_covariance is None:
        raise ValueError("Input uncertainty is unavailable because the fitted model's sensitivity is unresolved.")
    sensitivity = estimator_sensitivity(jacobian)
    transform = np.ones(sensitivity.shape[0]) if transform is None else np.asarray(transform, float)
    sensitivity = sensitivity*transform[:, None]
    counts = [int(np.count_nonzero(c["fit_mask"])) for c in curves]
    if sum(counts) != sensitivity.shape[1]:
        raise ValueError("Input propagation does not match the saved selected observations.")
    measurement = np.asarray(conditional_covariance, float)
    if options["propagate_measurement"]:
        sources, source_metadata = collect_sources(curves, options)
        if sum(len(s["time"]) for s in sources.values()) > 250000:
            raise ValueError("Raw-source propagation exceeds the bounded integration size.")
        rng = np.random.default_rng(options["seed"])
        changes = []
        for start in range(0, options["draws"], 64):
            batch = min(64, options["draws"]-start)
            noise = {}
            tau = options["raw_correlation_time_s"]
            for key, source in sorted(sources.items()):
                z = rng.normal(size=(batch, len(source["time"])))
                if tau > 0:
                    for j, dt in enumerate(np.diff(source["time"]), 1):
                        alpha = np.exp(-dt/tau)
                        z[:, j] = alpha*z[:, j-1]+np.sqrt(-np.expm1(-2*dt/tau))*z[:, j]
                noise[key] = z*source["sd"]
            delta, position = np.zeros((batch, sensitivity.shape[0])), 0
            for curve, count in zip(curves, counts):
                selected = np.asarray(curve["time"])[curve["fit_mask"]]
                baseline = np.asarray(curve.get("baseline_reference_times", []), float) if curve.get("baseline_estimated") else np.array([])
                q = np.r_[selected, baseline]
                error = np.zeros((batch, len(q)))
                for term in curve["measurement_sources"]:
                    left, right, fraction = interpolation_grid(sources[term["id"]]["time"], q)
                    z = noise[term["id"]]
                    error += term["weight"]*((1-fraction)*z[:, left]+fraction*z[:, right])
                error *= curve.get("response_sign", 1.)
                normalized = error[:, :count].copy()
                if len(baseline):
                    trend = float(curve.get("baseline_trend", 0.))*(baseline-baseline.mean())
                    reference = np.median(error[:, count:]+trend, axis=1)-np.median(trend)
                    normalized -= reference[:, None]
                normalized = whiten(normalized, selected, objective_tau)/float(curve.get("relative_sd", 1.))
                delta += normalized @ sensitivity[:, position:position+count].T
                position += count
            changes.append(delta)
        changes = np.vstack(changes)
        measurement = np.atleast_2d(np.cov(changes, rowvar=False, ddof=1))
        half = len(changes)//2
        first, second = np.var(changes[:half], axis=0, ddof=1), np.var(changes[half:], axis=0, ddof=1)
        metadata.update(raw_sources=source_metadata, integration_draws=options["draws"], seed=options["seed"],
            half_run_variance_relative_difference=(np.abs(first-second)/np.maximum((first+second)/2, 1e-300)).tolist(),
            measurement_scope="Raw Gaussian sample/control noise, interpolation and measured median reference; fixed supplied or baseline-estimated source SDs and OU time")
    calibration = np.zeros_like(measurement)
    if options["stock_cv"] or options["level_cv"]:
        if concentration_derivatives is None or len(concentration_derivatives) != len(curves):
            raise ValueError("This estimator did not provide its concentration sensitivity.")
        columns, position = [], 0
        for count, derivative in zip(counts, concentration_derivatives):
            columns.append(sensitivity[:, position:position+count] @ np.asarray(derivative, float))
            position += count
        calibration, detail = calibration_covariance(np.column_stack(columns), [c["concentration_nM"] for c in curves], options)
        metadata["concentration_calibration"] = detail
    total = (measurement+calibration)
    total = (total+total.T)/2
    if not np.isfinite(total).all() or np.any(np.diag(total) < 0):
        raise ValueError("Invalid propagated input covariance.")
    metadata.update(applied=True, uncertainty_method=INPUT_ERROR,
        measurement_covariance=measurement.tolist(), calibration_covariance=calibration.tolist(),
        scope="Local fixed-model input propagation; not repeat SD, model-selection or phase-boundary uncertainty. Conditional likelihood/AIC/profiles are unchanged.",
        no_double_counting="Raw-source covariance replaces conditional measurement covariance when enabled; calibration covariance is then added once.")
    return total, metadata


def source_id(filename, concentration):
    return json.dumps([str(filename), float(concentration)], separators=(",", ":"))


def kobs_propagation(curves, concentrations_nM, means, weights, coefficients):
    """Propagate curve-rate covariance through the unchanged two-stage estimator.

    Technical files are averaged within Repeat ID before the concentration mean.
    No line-RSS scale multiplies the already estimated first-stage variances.
    """
    options = common_options(curves)
    levels = np.asarray(concentrations_nM, float)
    design = np.column_stack([levels, np.ones(len(levels))])
    w = np.asarray(weights, float)
    inverse = np.linalg.inv((design*w[:, None]).T @ (design*w[:, None]))
    line_map = inverse @ (design*w[:, None]**2).T
    aggregation = np.zeros((len(levels), len(curves)))
    for j, concentration in enumerate(levels):
        repeats = {c["repeat_id"] for c in curves if c["concentration_nM"] == concentration}
        for repeat in repeats:
            indices = [i for i, c in enumerate(curves) if c["concentration_nM"] == concentration and c["repeat_id"] == repeat]
            aggregation[j, indices] = 1./(len(repeats)*len(indices))
    if not np.allclose(aggregation.sum(axis=1), 1.):
        raise ValueError("Incomplete first-stage concentration aggregation.")
    metadata = dict(applied=False, settings=options, first_stage_propagated=True, parameter_order=["kon", "koff"],
                    offset_handling="A freely fitted association offset absorbs constant baseline/initial-level shifts; no duplicate reference variance is added.",
                    weighting_scope="Point-estimate line weights are held fixed; repeat SD is a separate reproducibility statistic.")
    if options["propagate_measurement"]:
        projections = [(np.asarray(c["assoc_time_abs_s"]), c["rate_sensitivity"]) for c in curves]
        rates, sources = linear_source_covariance(curves, projections, options)
        metadata.update(raw_sources=sources, applied=True)
    else:
        variances = np.array([c["kobs_err"]**2 for c in curves])
        if not np.isfinite(variances).all() or np.any(variances < 0):
            raise ValueError("An association-rate covariance is unavailable; second-stage propagated errors are withheld.")
        rates = np.diag(variances)
    mean_covariance = aggregation @ rates @ aggregation.T
    units = np.diag([1e9, 1.])
    propagated = units @ line_map @ mean_covariance @ line_map.T @ units
    residual = np.asarray(means)-design @ coefficients
    derivatives = []
    for j, concentration in enumerate(levels):
        rhs = np.array([concentration*w[j]**2*residual[j], 0.])-design[j]*w[j]**2*coefficients[0]*concentration
        derivatives.append(units @ inverse @ rhs)
    calibration, detail = calibration_covariance(np.column_stack(derivatives), levels, options)
    covariance = (propagated+calibration)
    metadata.update(applied=bool(metadata["applied"] or options["stock_cv"] or options["level_cv"]),
        concentration_calibration=detail, first_stage_rate_covariance=rates.tolist(),
        concentration_mean_rate_covariance=mean_covariance.tolist(),
        measurement_covariance=propagated.tolist(), calibration_covariance=calibration.tolist(),
        scope="First-order two-stage measurement/calibration uncertainty. Conditional on fitted 1:1 association models, chosen windows, relative line weights and raw-noise assumptions; not repeat SD or a model-discrepancy interval.")
    return covariance, metadata


def isotherm_propagation(curves, raw_means, aggregation, concentrations, weights, parameters,
                         conditional_covariance, normalize_max=False):
    options = common_options(curves)
    metadata = dict(applied=False, settings=options, parameter_order=["Rmax", "KD"]+(["n_hill"] if len(parameters) == 3 else []))
    if not requested(options):
        return conditional_covariance, metadata
    if conditional_covariance is None:
        raise ValueError("Input uncertainty cannot repair unresolved isotherm parameters.")
    c = np.asarray(concentrations, float)
    rmax, kd = parameters[:2]
    hill = parameters[2] if len(parameters) == 3 else 1.
    log_ratio = np.clip(hill*(np.log(c)-np.log(kd)), -700, 700)
    f = 1/(1+np.exp(-log_ratio))
    jac = np.column_stack([f, -rmax*f*(1-f)*hill/kd])
    if len(parameters) == 3:
        jac = np.column_stack([jac, rmax*f*(1-f)*(np.log(c)-np.log(kd))])
    w = np.asarray(weights, float)
    influence = -estimator_sensitivity(jac*w[:, None])
    measurement = np.asarray(conditional_covariance)
    if options["propagate_measurement"]:
        projections = [(curve["sample_times"], np.full(len(curve["sample_times"]), 1/len(curve["sample_times"]))) for curve in curves]
        raw_covariance, sources = linear_source_covariance(curves, projections, options)
        transform = np.eye(len(curves))
        if normalize_max:
            y = np.asarray(raw_means, float)
            for filename in {curve["filename"] for curve in curves}:
                index = np.array([i for i, curve in enumerate(curves) if curve["filename"] == filename])
                peak = index[np.argmax(y[index])]
                if y[peak] <= 0 or np.count_nonzero(np.isclose(y[index], y[peak], rtol=1e-7, atol=1e-12)) > 1:
                    raise ValueError("Observed-maximum normalization has a nonpositive or tied maximum; local input propagation is unavailable.")
                for other in index[index != peak]:
                    gap_sd = np.sqrt(max(0., raw_covariance[peak, peak]+raw_covariance[other, other]-2*raw_covariance[peak, other]))
                    if y[peak]-y[other] <= 3*gap_sd:
                        raise ValueError("The observed maximum is not stable within three propagated gap SDs; local ratio propagation is withheld.")
                transform[index, :] = 0.
                transform[index, index] = 100/y[peak]
                transform[index, peak] -= 100*y[index]/y[peak]**2
            metadata["normalization_scope"] = "Local derivative of each file's observed-maximum ratio; assumes the identity of the maximum is stable. Not a measured saturation capacity."
        mapping = np.asarray(aggregation) @ transform
        covariance = mapping @ raw_covariance @ mapping.T
        measurement = influence @ (w[:, None]*covariance*w[None, :]) @ influence.T
        metadata["raw_sources"] = sources
    derivative = -influence*(rmax*f*(1-f)*hill*w)[None, :]
    calibration, detail = calibration_covariance(derivative, c, options)
    total = measurement+calibration
    metadata.update(applied=True, measurement_covariance=measurement.tolist(), calibration_covariance=calibration.tolist(),
        concentration_calibration=detail, uncertainty_method=INPUT_ERROR,
        scope="Local fixed-isotherm input propagation with fixed line weights and noise/calibration inputs; profile-RSS intervals remain conditional. Not repeat SD or evidence of equilibrium attainment.")
    return (total+total.T)/2, metadata
