"""Saved-objective refits, adaptive profiles and nonlinear sampling intervals.

Review never changes the original fit or chooses a new model. Input/noise
assumptions and all requested failures remain part of the exported evidence.
"""

from copy import deepcopy
import hashlib
import json
import time

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import least_squares

from mixa_input_uncertainty import collect_sources, common_options, interpolation_grid, whiten
from mixa_mechanisms import Parameter, _group, binding_prediction
from mixa_science import boundary_flags, conditional_covariance, delivery_lag_signal, json_safe
from mixa_uncertainty import propagate_baseline


REVISION = "2026-10-20.2"
OMISSION_UNITS = ["Concentration", "Independent repeat", "Curve"]
MIN_DRAWS = 200
MIN_SUCCESS_FRACTION = .95


def review_problem(result):
    """Record the original objective exactly, including every linked nuisance term."""
    if "parameter_controls" in result:
        rules = [Parameter(**row) for row in result["parameter_controls"]]
        controls = {key: dict(value=result["values"][key], positive=next(r.positive for r in rules if key.startswith(r.key+"::")),
                             **{k: v for k, v in row.items() if k != "initial"})
                    for key, row in result["instance_controls"].items()}
        spec = dict(model=result["model"], transport=result["transport"], nonspecific=result["nonspecific"],
                    controls=controls, links=[{r.key: f"{r.key}::{_group(r, c)}" for r in rules} for c in result["curves"]],
                    correlation_time=result["correlation_time"], loss=result["loss"], rss=result["rss"])
        curves = result["curves"]
        saved_predictions = [c["fitted"] for c in curves]
    elif result.get("fit_strategy") == "shared_kinetics" and result.get("refit_spec"):
        spec = deepcopy(result["refit_spec"])
        curves = result["curve_observations"]
        saved_predictions = [c["fitted_fitspace"] for c in result["individual_fits"]]
    else:
        raise ValueError("This saved run has no exact global-refit record. Rerun a shared or advanced kinetic fit.")
    if spec["loss"] != "linear":
        raise ValueError("Likelihood profiles and Gaussian simulation intervals require least squares, not a robust sensitivity fit.")
    prepared = []
    if len(curves) != len(spec["links"]):
        raise ValueError("Saved parameter linkage does not match the measured curves.")
    for curve, links in zip(curves, spec.pop("links")):
        prepared.append({**curve, "_review_keys": links})
    problem = {**spec, "curves": prepared, "revision": REVISION,
               "baseline_uncertainty": result.get("baseline_uncertainty", {})}
    values = {key: row["value"] for key, row in problem["controls"].items()}
    for curve, saved in zip(prepared, saved_predictions):
        if not np.allclose(predict(problem, curve, values), saved, rtol=2e-7, atol=1e-8):
            raise ValueError("The review prediction does not reproduce the saved fit. Review is disabled, not substituted.")
    residual = objective(problem, values)
    if not np.isclose(residual @ residual, spec["rss"], rtol=2e-6, atol=1e-10):
        raise ValueError("The review objective does not reproduce the saved selected-observation RSS.")
    n = len(residual)
    free = [k for k, row in problem["controls"].items() if not row["fixed"]]
    if n <= len(free) or not free:
        raise ValueError("Review requires free parameters and positive residual degrees of freedom.")
    problem["n_observations"] = n
    problem["n_parameters"] = len(free)
    problem["fingerprint"] = problem_fingerprint(problem)
    return problem


def problem_fingerprint(problem):
    record = {k: problem[k] for k in ["model", "transport", "nonspecific", "controls", "correlation_time", "loss", "revision"]}
    record["curves"] = [{k: c.get(k) for k in ["filename", "repeat_id", "concentration_M", "time", "response", "fit_mask",
                                              "on", "off", "relative_sd", "model_baseline", "_review_keys",
                                              "baseline_estimated", "baseline_reference_times", "response_sign",
                                              "measurement_sources", "input_uncertainty_options"]} for c in problem["curves"]]
    return hashlib.sha256(json.dumps(json_safe(record), sort_keys=True, allow_nan=False).encode()).hexdigest()


def predict(problem, curve, values, selected=False):
    p = {key: values[instance] for key, instance in curve["_review_keys"].items()}
    t = np.asarray(curve["time"])[curve["fit_mask"]] if selected else np.asarray(curve["time"])
    if problem["model"] == "delivery_lag":
        y = delivery_lag_signal(t, p["kon"], p["koff"], p["Rmax"], p["delivery_lag_rate"],
                                curve["concentration_M"], curve["on"], curve["off"])
        y += p.get("offset", 0.) + p.get("drift", 0.)*(t-curve["on"])
        y += p.get("ns_linear", 0.)*curve["concentration_M"]*np.clip(t-curve["on"], 0., curve["off"]-curve["on"])
    else:
        y = binding_prediction(t, curve["concentration_M"], curve["on"], curve["off"], p,
                               problem["model"], problem["transport"], problem["nonspecific"])
    return y + curve.get("model_baseline", 0.)


def objective(problem, values, curves=None):
    curves = problem["curves"] if curves is None else curves
    return np.concatenate([whiten(np.asarray(c["response"])[c["fit_mask"]]-predict(problem, c, values, True),
                                   np.asarray(c["time"])[c["fit_mask"]], problem["correlation_time"])/c.get("relative_sd", 1.)
                           for c in curves])


def refit(problem, *, curves=None, forced=None, initial=None, starts=2, runtime_s=30., max_nfev=1200, seed=1729,
          compute_scale=False):
    """Same bounds/weights/masks, no covariance screening or data-driven deletion."""
    if (not isinstance(starts, int) or starts < 1 or not np.isfinite(runtime_s) or runtime_s <= 0
            or not isinstance(max_nfev, int) or max_nfev < 1 or not isinstance(seed, int) or seed < 0):
        raise ValueError("Positive refit limits and at least one start are required.")
    curves = problem["curves"] if curves is None else curves
    controls, forced = problem["controls"], forced or {}
    active = {key for c in curves for key in c["_review_keys"].values()}
    if not curves or set(forced)-active:
        raise ValueError("No training data, or a profile target is absent from training data.")
    names = [key for key in controls if key in active and not controls[key]["fixed"] and key not in forced]
    base = {key: row["value"] for key, row in controls.items() if key in active}
    base.update({key: value for key, value in (initial or {}).items() if key in active})
    for key, value in forced.items():
        if controls[key]["fixed"] or not controls[key]["lower"] <= value <= controls[key]["upper"]:
            raise ValueError("Profile target must be free and within saved bounds.")
    base.update(forced)
    count = sum(int(np.count_nonzero(c["fit_mask"])) for c in curves)
    if count <= len(names):
        raise ValueError("Training observations do not exceed free training parameters.")
    scales = {k: max(abs(controls[k]["lower"]), abs(controls[k]["upper"]), 1e-12) for k in names}

    def encode(key, value):
        return np.log(value) if controls[key]["positive"] else value/scales[key]

    low = np.array([encode(k, controls[k]["lower"]) for k in names])
    high = np.array([encode(k, controls[k]["upper"]) for k in names])
    center = np.array([encode(k, np.clip(base[k], controls[k]["lower"], controls[k]["upper"])) for k in names])

    def decode(z):
        return {**base, **{k: float(np.exp(v)) if controls[k]["positive"] else float(v*scales[k]) for k, v in zip(names, z)}}

    deadline, history, candidates = time.perf_counter()+runtime_s, [], []

    def residual(z):
        if time.perf_counter() > deadline:
            raise TimeoutError("Refit runtime limit reached")
        return objective(problem, decode(z), curves)

    if not names:
        r = residual(np.array([]))
        return dict(values=base, rss=float(r @ r), boundaries=[], history=[], complete=True,
                    jacobian_rank=0, scaled_jacobian_condition=np.nan)
    rng = np.random.default_rng(seed)
    span = np.array([np.log(100.) if controls[k]["positive"] else .25*(hi-lo) for k, lo, hi in zip(names, low, high)])
    for i in range(starts):
        z0 = center if i == 0 else rng.uniform(np.maximum(low, center-span), np.minimum(high, center+span))
        try:
            opt = least_squares(residual, z0, bounds=(low, high), jac="3-point", diff_step=1e-4,
                                x_scale="jac", max_nfev=max_nfev, ftol=1e-9, xtol=1e-9, gtol=1e-9)
            history.append(dict(start=i+1, converged=bool(opt.success), rss=float(opt.fun @ opt.fun), message=opt.message))
            if opt.success and np.isfinite(opt.fun).all():
                candidates.append(opt)
        except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
            history.append(dict(start=i+1, converged=False, message=str(exc)))
        except TimeoutError as exc:
            history.append(dict(start=i+1, converged=False, message=str(exc)))
            break
    if not candidates:
        raise RuntimeError("No refit converged within the requested search limits.")
    best = min(candidates, key=lambda item: item.cost)
    values = decode(best.x)
    flags = boundary_flags(best.x, low, high, names)
    flags = sorted(set(flags) | {k for k, flag in zip(names, best.active_mask) if flag})
    info = conditional_covariance(best.jac, best.fun)
    scale_covariance = info["covariance"] if compute_scale and not flags else None
    if scale_covariance is not None and any(c.get("baseline_estimated") for c in curves):
        reference_curves = [{**c, "baseline_trend": values.get(c["_review_keys"].get("drift"), 0.)} for c in curves]
        try:
            propagated, _ = propagate_baseline(best.jac, best.fun, reference_curves, problem["correlation_time"])
            if propagated is not None:
                scale_covariance = propagated
        except ValueError:
            scale_covariance = None
    return dict(values=values, rss=float(best.fun @ best.fun), boundaries=flags, history=history,
                complete=len(history) == starts and time.perf_counter() <= deadline,
                jacobian_rank=info["jacobian_rank"], scaled_jacobian_condition=info["scaled_jacobian_condition"],
                scale_covariance=scale_covariance, free_names=names)


def coordinate_scales(problem, fit, table=None):
    """Studentization in log coordinates for positive estimands; full KD covariance."""
    covariance = fit.get("scale_covariance")
    if covariance is None:
        return {}
    names, values = fit["free_names"], fit["values"]
    original = (estimates(problem, values) if table is None else table).set_index("estimate")
    positions, output = {k: i for i, k in enumerate(names)}, {}
    for name, row in original.iterrows():
        gradient = np.zeros(len(names))
        if row.kind == "Parameter":
            rule = problem["controls"][name]
            coordinate = "log" if rule["positive"] else "linear"
            if name in positions:
                gradient[positions[name]] = 1. if rule["positive"] else max(abs(rule["lower"]), abs(rule["upper"]), 1e-12)
        else:
            coordinate = "log"
            metric, dependencies = name.split("::", 1)
            keys = dependencies.split("|")
            coefficients = [-1., 1.]
            if metric == "KD_overall_nM":
                forward, reverse = values[keys[2]], values[keys[3]]
                coefficients += [-forward/(forward+reverse), forward/(forward+reverse)]
            elif metric in {"KD_lower_population_nM", "KD_higher_population_nM"}:
                first, second = values[keys[1]]/values[keys[0]], values[keys[3]]/values[keys[2]]
                choose_first = (first <= second) == (metric == "KD_lower_population_nM")
                coefficients = [-1., 1., 0., 0.] if choose_first else [0., 0., -1., 1.]
            for key, coefficient in zip(keys, coefficients):
                if key in positions:
                    gradient[positions[key]] += coefficient
        output[name] = dict(coordinate=coordinate, se=float(np.sqrt(max(gradient @ covariance @ gradient, 0.))))
    return output


def estimates(problem, values):
    """Derived KD is evaluated for every refit, never a ratio of summary means."""
    rows = {key: dict(estimate=key, value=value, kind="Parameter", estimated=not problem["controls"][key]["fixed"],
                     label_exchangeable=problem["model"] == "heterogeneous" and key.split("::")[0] in
                     {"kon", "koff", "kon2", "koff2", "Rmax", "Rmax2"}) for key, value in values.items()}
    for c in problem["curves"]:
        keys = c["_review_keys"]
        if set(keys.values())-set(values):
            continue
        p = {k: values[v] for k, v in keys.items()}
        first = p["koff"]/p["kon"]*1e9
        if problem["model"] == "two_state":
            metrics = [("KD_first_step_nM", first, ["kon", "koff"]),
                       ("KD_overall_nM", first*p["k_reverse"]/(p["k_forward"]+p["k_reverse"]),
                        ["kon", "koff", "k_forward", "k_reverse"])]
        elif problem["model"] in {"heterogeneous", "sequential"}:
            second = p["koff2"]/p["kon2"]*1e9
            if problem["model"] == "heterogeneous":
                dependencies = ["kon", "koff", "kon2", "koff2"]
                metrics = [("KD_lower_population_nM", min(first, second), dependencies),
                           ("KD_higher_population_nM", max(first, second), dependencies)]
            else:
                metrics = [("KD_step_1_nM", first, ["kon", "koff"]), ("KD_step_2_nM", second, ["kon2", "koff2"])]
        elif problem["model"] == "bivalent":
            metrics = [("KD_per_arm_first_step_nM", first, ["kon", "koff"]),
                       ("KD_macroscopic_capture_nM", first/2, ["kon", "koff"])]
        else:
            metrics = [("KD_nM", first, ["kon", "koff"])]
        for name, value, dependencies in metrics:
            instances = [keys[k] for k in dependencies]
            key = name+" ["+", ".join(dict.fromkeys(k.split("::", 1)[-1] for k in instances))+"]"
            # Different parameter linkages must never accidentally merge estimands.
            identity = name+"::"+"|".join(instances)
            rows[identity] = dict(estimate=identity, label=key, value=value, kind="Affinity (nM)", label_exchangeable=False,
                                  estimated=any(not problem["controls"][k]["fixed"] for k in instances))
    return pd.DataFrame(rows.values())


def omission_review(problem, unit="Concentration", *, starts=2, runtime_s=120., per_fit_s=30., max_nfev=1200, seed=1729):
    if unit not in OMISSION_UNITS:
        raise ValueError("Choose a concentration, independent-repeat or curve omission.")
    if not np.isfinite([runtime_s, per_fit_s]).all() or min(runtime_s, per_fit_s) <= 0:
        raise ValueError("Finite positive review budgets are required.")
    curves = problem["curves"]
    def group(c):
        if unit == "Concentration":
            return f"{c['concentration_M']*1e9:.12g} nM"
        if unit == "Independent repeat":
            return str(c["repeat_id"])
        return f"{c['filename']} | {c['concentration_M']*1e9:.12g} nM"
    groups = list(dict.fromkeys(group(c) for c in curves))
    base = estimates(problem, {k: r["value"] for k, r in problem["controls"].items()}).set_index("estimate")
    deadline, cases, shifts, held_points, searches = time.perf_counter()+runtime_s, [], [], [], []
    for index, omitted in enumerate(groups):
        train = [c for c in curves if group(c) != omitted]
        held = [c for c in curves if group(c) == omitted]
        row = dict(omitted=omitted, status="Not run: runtime limit", training_curves=len(train), held_out_curves=len(held),
                   training_observations=sum(int(c["fit_mask"].sum()) for c in train),
                   held_out_observations=sum(int(c["fit_mask"].sum()) for c in held), scored_observations=0,
                   held_out_rmse=np.nan, held_out_bias=np.nan, objective_rmse=np.nan)
        remaining = deadline-time.perf_counter()
        if remaining > 0:
            try:
                fitted = refit(problem, curves=train, starts=starts, runtime_s=min(per_fit_s, remaining),
                               max_nfev=max_nfev, seed=seed+index)
                for item in fitted["history"]:
                    searches.append(dict(omitted=omitted, **item))
                row.update(status="Complete" if fitted["complete"] else "Incomplete search", training_rss=fitted["rss"],
                           boundaries=", ".join(fitted["boundaries"]), jacobian_rank=fitted["jacobian_rank"],
                           scaled_jacobian_condition=fitted["scaled_jacobian_condition"])
                changed = estimates(problem, fitted["values"]).set_index("estimate")
                for name in base.index:
                    new = changed.at[name, "value"] if name in changed.index else np.nan
                    old = base.at[name, "value"]
                    shifts.append(dict(omitted=omitted, estimate=name, label=base.loc[name].get("label", name), kind=base.at[name, "kind"],
                                       full_data_value=old, refit_value=new,
                                       change_percent=100*(new/old-1) if old != 0 else np.nan,
                                       label_exchangeable=base.at[name, "label_exchangeable"],
                                       status="Unavailable: local group omitted" if not np.isfinite(new) else row["status"]))
                errors, objective_errors = [], []
                unavailable = 0
                for c in held:
                    if set(c["_review_keys"].values())-set(fitted["values"]):
                        unavailable += 1
                        continue
                    mask = c["fit_mask"]
                    prediction = predict(problem, c, fitted["values"], True)
                    raw = np.asarray(c["response"])[mask]-prediction
                    errors.extend(raw)
                    objective_errors.extend(whiten(raw, np.asarray(c["time"])[mask], problem["correlation_time"])/c.get("relative_sd", 1.))
                    held_points.extend(dict(omitted=omitted, filename=c["filename"], repeat_id=c["repeat_id"],
                                            concentration_nM=c["concentration_M"]*1e9, time_s=t,
                                            observed=y, predicted=p, residual=e)
                                       for t, y, p, e in zip(np.asarray(c["time"])[mask], np.asarray(c["response"])[mask], prediction, raw))
                row["prediction_status"] = (f"Unavailable for {unavailable} curve(s): a free local parameter has no training data" if unavailable else "All held-out curves scored")
                if errors:
                    row.update(scored_observations=len(errors), held_out_rmse=float(np.sqrt(np.mean(np.square(errors)))),
                               held_out_bias=float(np.mean(errors)), objective_rmse=float(np.sqrt(np.mean(np.square(objective_errors)))))
            except (ValueError, RuntimeError, FloatingPointError) as exc:
                row.update(status="Failed", reason=str(exc), prediction_status="Unavailable: refit failed")
        cases.append(row)
    return dict(cases=pd.DataFrame(cases), shifts=pd.DataFrame(shifts), held_out_points=pd.DataFrame(held_points),
                searches=pd.DataFrame(searches), metadata=dict(revision=REVISION, fingerprint=problem["fingerprint"], unit=unit,
                    requested_cases=len(groups), starts=starts, runtime_s=runtime_s, per_fit_s=per_fit_s, max_nfev=max_nfev, seed=seed,
                    scope="Fixed-model deletion sensitivity. Held-out points never enter refitting. Missing local parameters are not filled from the full-data fit. Shared controls/preprocessing are held fixed, so this is not independent-experiment validation. No automatic exclusion or calibrated influence threshold."))


def adaptive_profile(problem, instance, *, confidence=.95, starts=2, runtime_s=120., max_nfev=1200,
                     max_points=80, tolerance=1e-3, seed=1729):
    controls = problem["controls"]
    if (instance not in controls or controls[instance]["fixed"] or not .5 < confidence < 1 or max_points < 6
            or not np.isfinite([runtime_s, tolerance]).all() or min(runtime_s, tolerance) <= 0):
        raise ValueError("A free saved parameter and valid profile controls are required.")
    rule = controls[instance]
    center, rss0 = rule["value"], problem["rss"]
    if rss0 <= 0:
        raise ValueError("A nonzero residual variance is required for profiling the Gaussian scale.")
    if boundary_flags([center], [rule["lower"]], [rule["upper"]], [instance]):
        raise ValueError("The target is at a saved bound. A regular two-sided profile interval is unavailable.")
    scale = max(abs(rule["lower"]), abs(rule["upper"]), 1e-12)
    encode = np.log if rule["positive"] else lambda x: x/scale
    decode = np.exp if rule["positive"] else lambda x: x*scale
    z0, lo, hi = map(encode, [center, rule["lower"], rule["upper"]])
    threshold = float(stats.chi2.ppf(confidence, 1))
    deadline, records, improved = time.perf_counter()+runtime_s, [], False
    values0 = {k: row["value"] for k, row in controls.items()}
    records.append(dict(value=center, rss=rss0, likelihood_ratio=0., status="Saved optimum", start_count=0))

    def evaluate(z, warm):
        nonlocal improved
        if len(records) >= max_points or time.perf_counter() >= deadline:
            return None
        value = float(np.clip(decode(z), rule["lower"], rule["upper"]))
        try:
            fit = refit(problem, forced={instance: value}, initial=warm, starts=starts,
                        runtime_s=deadline-time.perf_counter(), max_nfev=max_nfev, seed=seed+len(records))
            ratio = float(problem["n_observations"]*np.log(max(fit["rss"], np.finfo(float).tiny)/rss0))
            improved |= ratio < -1e-3
            status = "Converged" if fit["complete"] else "Incomplete search"
            records.append(dict(value=value, rss=fit["rss"], likelihood_ratio=ratio, status=status,
                                start_count=len(fit["history"]), boundaries=", ".join(fit["boundaries"])))
            return (ratio, fit["values"]) if fit["complete"] and not improved else None
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            records.append(dict(value=value, rss=np.nan, likelihood_ratio=np.nan, status=str(exc), start_count=0))
            return None

    limits, side_status = {}, {}
    for direction, side, bound in [(-1, "lower", lo), (1, "upper", hi)]:
        inner, warm, step = z0, values0, .25 if rule["positive"] else .02
        for _ in range(max_points):
            outer = max(bound, z0-step) if direction < 0 else min(bound, z0+step)
            point = evaluate(outer, warm)
            if point is None:
                limits[side], side_status[side] = None, "Incomplete: better optimum" if improved else "Incomplete: runtime, search or evaluation limit"
                break
            ratio, warm = point
            if ratio >= threshold:
                while abs(outer-inner) > tolerance:
                    midpoint = .5*(outer+inner)
                    point = evaluate(midpoint, warm)
                    if point is None:
                        break
                    ratio, warm = point
                    if ratio >= threshold:
                        outer = midpoint
                    else:
                        inner = midpoint
                if point is None:
                    limits[side], side_status[side] = None, "Incomplete crossing refinement"
                else:
                    limits[side], side_status[side] = float(decode(.5*(outer+inner))), "Crossing resolved"
                break
            if outer == bound:
                limits[side], side_status[side] = None, "Open at declared bound"
                break
            inner, step = outer, step*1.8
        else:
            limits[side], side_status[side] = None, "Incomplete: point limit"
    if improved:
        limits = dict(lower=None, upper=None)
    return dict(table=pd.DataFrame(records).sort_values("value"), metadata=dict(revision=REVISION,
        fingerprint=problem["fingerprint"], instance=instance, estimate=center, confidence=confidence,
        lower=limits["lower"], upper=limits["upper"], lower_status=side_status["lower"], upper_status=side_status["upper"],
        threshold=threshold, better_optimum_found=improved, requested_starts=starts, seed=seed,
        runtime_s=runtime_s, max_points=max_points, max_nfev=max_nfev, tolerance_encoded=tolerance,
        method="Adaptive nuisance-refitted Gaussian profile likelihood: N*log(RSS/RSS_min), chi-square(1) threshold",
        scope="Approximate conditional confidence interval for the connected region around the saved optimum. Fixed weights/OU time, concentrations, preprocessing and model; not a propagated input-budget or model-selection interval. Bounds and incomplete searches are not interval endpoints. Multiple disconnected regions are not excluded."))


def gaussian_noise(times, sd, tau, rng):
    noise = rng.normal(size=len(times))
    if tau > 0:
        for i, dt in enumerate(np.diff(times), 1):
            noise[i] = np.exp(-dt/tau)*noise[i-1]+np.sqrt(-np.expm1(-2*dt/tau))*noise[i]
    return noise*sd


def sampling_setup(problem, measurement_sd=None):
    supplied = measurement_sd is not None
    options = common_options(problem["curves"])
    sources, metadata = ({}, [])
    if options["propagate_measurement"]:
        sources, metadata = collect_sources(problem["curves"], options)
        if sum(len(s["time"]) for s in sources.values()) > 250000:
            raise ValueError("The raw-source simulation exceeds the bounded integration size.")
        if measurement_sd is not None:
            raise ValueError("Use either raw-source SDs or an objective-scale SD, not both.")
    elif measurement_sd is None:
        variance = problem["baseline_uncertainty"].get("residual_noise_variance")
        if variance is None:
            variance = problem["rss"]/(problem["n_observations"]-problem["n_parameters"])
        measurement_sd = np.sqrt(variance)
    if measurement_sd is not None and (not np.isfinite(measurement_sd) or measurement_sd <= 0):
        raise ValueError("A positive finite measurement SD is required for parametric refits.")
    return dict(options=options, sources=sources, source_metadata=metadata, objective_sd=measurement_sd,
                noise_scale_method="Raw-source SDs, supplied or baseline-estimated and held fixed" if sources else
                    "Supplied fixed objective SD" if supplied else
                    "Saved residual noise scale; held fixed in simulation")


def simulate_curves(problem, setup, rng):
    """Fresh experiments from the saved model; a reused control is drawn only once."""
    options = setup["options"]
    source_noise = {key: gaussian_noise(source["time"], source["sd"], options["raw_correlation_time_s"], rng)
                    for key, source in sorted(setup["sources"].items())}
    stock = float(np.exp(rng.normal(0., np.sqrt(np.log1p(options["stock_cv"]**2)))))
    levels = {c: float(np.exp(rng.normal(0., np.sqrt(np.log1p(options["level_cv"]**2)))))
              for c in sorted({c["concentration_M"] for c in problem["curves"]})}
    values = {k: r["value"] for k, r in problem["controls"].items()}
    simulated = []
    for c in problem["curves"]:
        t = np.asarray(c["time"])
        actual = {**c, "concentration_M": c["concentration_M"]*stock*levels[c["concentration_M"]]}
        mean = predict(problem, actual, values)
        if source_noise:
            error = np.zeros(len(t))
            for term in c["measurement_sources"]:
                source = setup["sources"][term["id"]]
                left, right, fraction = interpolation_grid(source["time"], t)
                z = source_noise[term["id"]]
                error += term["weight"]*((1-fraction)*z[left]+fraction*z[right])
            error *= c.get("response_sign", 1.)
        else:
            error = gaussian_noise(t, setup["objective_sd"]*c.get("relative_sd", 1.), problem["correlation_time"], rng)
        if c.get("baseline_estimated"):
            reference = np.asarray(c.get("baseline_reference_times", []))
            if not len(reference) or not np.isin(reference, t).all():
                raise ValueError("Nonlinear refits require all saved measured-baseline times in the trace grid.")
            selected = np.isin(t, reference)
            drift_key = c["_review_keys"].get("drift")
            trend = values.get(drift_key, 0.)*(t[selected]-reference.mean())
            error -= np.median(error[selected]+trend)-np.median(trend)
        # Fit the recorded nominal concentrations, as in the real analysis.
        simulated.append({**c, "response": mean+error})
    return simulated


def refit_sampling(problem, *, draws=400, starts=2, runtime_s=300., per_fit_s=30., max_nfev=1200,
                   seed=624091, measurement_sd=None, interval_method="auto"):
    """Parametric refits, not a linearized covariance or independent-repeat SD.

    Supplied stock/level CVs describe median-one lognormal calibration factors.
    The response is simulated at perturbed actual concentrations and refitted at
    nominal concentrations. This is not a posterior or selection-adjusted CI.
    """
    if not isinstance(draws, int) or not 1 <= draws <= 5000 or not isinstance(seed, int) or seed < 0:
        raise ValueError("Request 1-5000 draws and a nonnegative integer seed.")
    if not np.isfinite([runtime_s, per_fit_s]).all() or min(runtime_s, per_fit_s) <= 0:
        raise ValueError("Finite positive simulation budgets are required.")
    setup = sampling_setup(problem, measurement_sd)
    if interval_method not in {"auto", "percentile", "studentized"}:
        raise ValueError("Choose automatic, percentile or studentized intervals.")
    external = bool(setup["sources"] or setup["options"]["stock_cv"] or setup["options"]["level_cv"] or measurement_sd is not None)
    if interval_method == "studentized" and external:
        raise ValueError("Studentization currently supports estimated residual noise without an external raw-source/calibration budget.")
    studentized = interval_method == "studentized" or (interval_method == "auto" and not external)
    baseline = estimates(problem, {k: r["value"] for k, r in problem["controls"].items()}).set_index("estimate")
    deadline, rng = time.perf_counter()+runtime_s, np.random.default_rng(seed)
    base_scales = {}
    if studentized:
        fitted_base = refit(problem, starts=1, runtime_s=min(per_fit_s, runtime_s), max_nfev=max_nfev, compute_scale=True)
        if fitted_base["rss"] < problem["rss"]*(1-1e-5)-1e-10:
            raise ValueError("Studentization found a better base optimum. Refit the main analysis before reporting intervals.")
        base_scales = coordinate_scales(problem, fitted_base)
    runs, samples, searches = [], [], []
    for i in range(draws):
        row = dict(draw=i+1, status="Not run: runtime limit", boundaries="", search_complete=False,
                   jacobian_rank=np.nan, scaled_jacobian_condition=np.nan)
        remaining = deadline-time.perf_counter()
        if remaining > 0:
            try:
                curves = simulate_curves(problem, setup, rng)
                fit = refit(problem, curves=curves, starts=starts, runtime_s=min(per_fit_s, remaining),
                            max_nfev=max_nfev, seed=seed+i+1, compute_scale=studentized)
                row.update(status="Complete" if fit["complete"] else "Incomplete search", rss=fit["rss"],
                           search_complete=fit["complete"], boundaries=", ".join(fit["boundaries"]),
                           jacobian_rank=fit["jacobian_rank"], scaled_jacobian_condition=fit["scaled_jacobian_condition"])
                for item in fit["history"]:
                    searches.append(dict(draw=i+1, **item))
                table = estimates(problem, fit["values"])
                scales = coordinate_scales(problem, fit, table) if studentized else {}
                for r in table.itertuples():
                    scale = scales.get(r.estimate, {})
                    se, coordinate = scale.get("se", np.nan), scale.get("coordinate", "")
                    delta = r.value-baseline.at[r.estimate, "value"]
                    if coordinate == "log" and min(r.value, baseline.at[r.estimate, "value"]) > 0:
                        delta = np.log(r.value/baseline.at[r.estimate, "value"])
                    pivot = delta/se if np.isfinite(se) and se > 0 else np.nan
                    samples.append(dict(draw=i+1, estimate=r.estimate, value=r.value, status=row["status"],
                        any_parameter_at_bound=bool(fit["boundaries"]), coordinate_se=se, studentized_pivot=pivot))
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                row.update(status="Failed", reason=str(exc))
        runs.append(row)
    run_table, sample_table = pd.DataFrame(runs), pd.DataFrame(samples, columns=[
        "draw", "estimate", "value", "status", "any_parameter_at_bound", "coordinate_se", "studentized_pivot"])
    successful = int((run_table.status == "Complete").sum())
    available = draws >= MIN_DRAWS and successful >= MIN_DRAWS and successful/draws >= MIN_SUCCESS_FRACTION
    full_rank = (run_table.jacobian_rank >= problem["n_parameters"]) & (run_table.scaled_jacobian_condition <= 1e10)
    unresolved_fraction = float(((run_table.status == "Complete") & ~full_rank).sum()/max(successful, 1))
    summaries = []
    for name, original in baseline.iterrows():
        group = sample_table.loc[(sample_table.estimate == name) & (sample_table.status == "Complete")]
        x = group.value.to_numpy()
        boundary_fraction = float(group.any_parameter_at_bound.mean()) if len(group) else np.nan
        reason = ("Fixed, not estimated" if not original.estimated else
                  "Exchangeable component label: use ordered population affinities" if original.label_exchangeable else
                  "Insufficient complete refits or convergence fraction" if not available or len(x) != successful else
                  "At least 5% of complete refits reach bounds" if boundary_fraction >= .05 else
                  "At least 5% of complete refits have unresolved sensitivities" if unresolved_fraction >= .05 else "Available")
        low = high = np.nan
        percentile_low, percentile_high = np.quantile(x, [.025, .975]) if len(x) else (np.nan, np.nan)
        if reason == "Available":
            if studentized:
                pivots = group.loc[np.isfinite(group.studentized_pivot), "studentized_pivot"].to_numpy()
                base_scale = base_scales.get(name, {})
                if len(pivots) < MIN_DRAWS or len(pivots)/draws < MIN_SUCCESS_FRACTION or not base_scale.get("se", 0.) > 0:
                    reason = "Insufficient finite studentized refits"
                else:
                    a, b = np.quantile(pivots, [.025, .975])
                    center = np.log(original.value) if base_scale["coordinate"] == "log" else original.value
                    limits = np.array([center-b*base_scale["se"], center-a*base_scale["se"]])
                    with np.errstate(over="ignore"):
                        limits = np.exp(limits) if base_scale["coordinate"] == "log" else limits
                    rule = problem["controls"].get(name)
                    domain_ok = rule is None or (limits[0] >= rule["lower"] and limits[1] <= rule["upper"])
                    if np.isfinite(limits).all() and domain_ok:
                        low, high = limits
                    else:
                        reason = "Unresolved nonlinear limits or interval outside saved parameter domain"
            else:
                low, high = percentile_low, percentile_high
        summaries.append(dict(estimate=name, label=original.get("label", name), kind=original.kind,
                              point_estimate=original.value, interval95_low=low, interval95_high=high,
                              percentile95_low=percentile_low, percentile95_high=percentile_high,
                              simulation_median=float(np.median(x)) if len(x) else np.nan,
                              simulation_sd=float(np.std(x, ddof=1)) if len(x) > 1 else np.nan,
                              requested_draws=draws, complete_draws=len(x), boundary_fraction=boundary_fraction,
                              unresolved_fraction=unresolved_fraction, status=reason,
                              interval_method="Studentized parametric bootstrap" if studentized else "Parametric percentile"))
    metadata = dict(revision=REVISION, fingerprint=problem["fingerprint"], requested_draws=draws, complete_draws=successful,
        minimum_complete=MIN_DRAWS, minimum_success_fraction=MIN_SUCCESS_FRACTION, seed=seed, starts=starts,
        runtime_s=runtime_s, per_fit_s=per_fit_s, max_nfev=max_nfev,
        options=setup["options"], noise_scale=setup["objective_sd"], noise_scale_method=setup["noise_scale_method"],
        raw_sources=setup["source_metadata"], calibration_distribution="Median-one lognormal factors with supplied CVs; one stock factor across all repeats, one factor per unique concentration level",
        interval_method="Studentized parametric bootstrap 95% interval (log coordinates for positive estimands)" if studentized else "Nonlinear parametric-refit central 95% percentile interval",
        interval_method_requested=interval_method, base_coordinate_scales=base_scales,
        scope="Conditional on the saved model, windows, weights and supplied/plug-in noise and calibration distributions. Raw measurement propagation replaces, not duplicates, conditional measurement noise. Finite median baselines and reused controls are simulated. Fixed background/calibration parameters, source SD/OU-time estimation error, model selection, phase uncertainty and between-experiment random effects are not integrated. Simulation SD is not independent-repeat SD. No posterior probability is implied.")
    return dict(summary=pd.DataFrame(summaries), runs=run_table, samples=sample_table,
                searches=pd.DataFrame(searches), metadata=metadata)


def write_review_exports(archive, prefix, result):
    review = result.get("inference_review")
    if not review:
        return
    archive.writestr(f"{prefix}/README.txt", "Saved-fit robustness review. Profiles are conditional on preprocessing and noise settings. Sampling intervals use the explicit saved simulation budget and are not independent-repeat SD. Deletion diagnostics are not automatic exclusion rules. Every failed, incomplete or unrun case is retained. See the associated metadata JSON files and REFIT_REVIEW.md in the methods documentation.\n")
    for family, entries in review.items():
        if family == "sampling":
            entries = {"parametric": entries}
        for name, payload in entries.items():
            safe = hashlib.sha256(str(name).encode()).hexdigest()[:12]
            path = f"{prefix}/{family}/{safe}"
            for key, value in payload.items():
                if isinstance(value, pd.DataFrame):
                    archive.writestr(f"{path}/{key}.csv", value.to_csv(index=False))
                elif key == "metadata":
                    archive.writestr(f"{path}/metadata.json", json.dumps(json_safe(value), indent=2, allow_nan=False))
