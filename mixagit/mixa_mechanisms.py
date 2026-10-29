"""Explicit binding mechanisms and a shared/local, constrained global fitting engine.

Concentration: mol/L. Time: seconds. R states: input response units.
No mechanism or stoichiometry is inferred from fit quality alone.
"""

from dataclasses import asdict, dataclass, replace
import time

import numpy as np
import pandas as pd
from mixa_input_uncertainty import INPUT_ERROR, common_options, curve_input, propagate_fit_inputs, requested
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares
from scipy import stats

from mixa_science import (CONDITIONAL_ERROR, _linear_state, boundary_flags, conditional_covariance,
                          gaussian_information, json_safe, residual_dependence, two_state_signal)
from mixa_selection import observation_masks
from mixa_uncertainty import BASELINE_ERROR, BASELINE_GLS_ERROR, baseline_reference, propagate_baseline


@dataclass(frozen=True)
class Parameter:
    key: str
    initial: float
    lower: float
    upper: float
    scope: str = "Global"
    fixed: bool = False
    positive: bool = True
    unit: str = "s^-1"


MODEL_LABELS = {
    "langmuir": "1:1 binding",
    "two_state": "Two-state conformational binding",
    "heterogeneous": "Two independent surface populations",
    "bivalent": "Bivalent analyte / surface avidity",
    "sequential": "Sequential binding of two analyte molecules",
}
MODEL_NOTES = {
    "langmuir": "A + L <-> AL. One intrinsic KD under this model.",
    "two_state": "A + L <-> AL <-> AL*. Overall KD differs from the first-step microscopic KD.",
    "heterogeneous": "Two independent populations, each with its own rates and capacity. This does not establish molecular stoichiometry or identify either population as nonspecific.",
    "bivalent": "A has two equivalent arms. First capture has factor 2; opening a doubly bound complex has factor 2. Second capture is surface-density dependent. Signal counts bound analyte, not occupied ligand sites. No single intrinsic avidity KD is reported.",
    "sequential": "A + L <-> AL; A + AL <-> A2L. The second analyte adds signal: response = AL + 2*A2L. Stepwise constants do not establish this mechanism or measured stoichiometry.",
}
TRANSPORT_LABELS = ["None", "Quasi-steady 1:1 transport", "Two-compartment transport"]
SCOPES = ["Global", "Per repeat", "Per file", "Per curve", "Per surface"]
GLS_ERROR = "Conditional fixed-OU GLS model SE (not independent-repeat SD)"
LOCAL_PRECISION_LIMIT = 1.


def local_precision(value, error, fixed=False):
    """A declared reporting screen, not a confidence level or identifiability test."""
    relative = abs(error/value) if np.isfinite(value) and value != 0 and np.isfinite(error) and error >= 0 else np.nan
    status = "Fixed" if fixed else ("Unavailable" if not np.isfinite(relative) else
             "Weak local precision" if relative > LOCAL_PRECISION_LIMIT else "Locally resolved")
    return dict(relative_model_se=relative, local_precision_status=status)


def parameter_defaults(model, response_scale=100., transport="None", nonspecific=False,
                       offset=False, drift=False, bulk=False, linear_nonspecific=False):
    if model not in MODEL_LABELS:
        raise ValueError("Unknown binding mechanism.")
    scale = max(abs(float(response_scale)), 1e-6)
    rate = lambda name, initial, scope="Global": Parameter(name, initial, 1e-8, 1e2, scope)
    on = lambda name: Parameter(name, 1e5, 1., 1e10, unit="M^-1 s^-1")
    capacity = lambda name, value: Parameter(name, value, scale * 1e-7, scale * 1e5, "Per file", unit="response")
    rules = [on("kon"), rate("koff", .01), capacity("Rmax", scale)]
    if model == "two_state":
        rules += [rate("k_forward", .02), rate("k_reverse", .005)]
    if model == "heterogeneous":
        rules[2] = capacity("Rmax", .6 * scale)
        rules += [replace(on("kon2"), initial=1e4), rate("koff2", .05), capacity("Rmax2", .4 * scale)]
    if model == "bivalent":
        rules += [Parameter("kon2", .001 / scale * 100, 1e-12, 1e4 / scale, unit="response^-1 s^-1"), rate("koff2", .005)]
    if model == "sequential":
        rules += [replace(on("kon2"), initial=1e4), rate("koff2", .03)]
    if transport not in TRANSPORT_LABELS:
        raise ValueError("Unknown transport model.")
    if transport == "Quasi-steady 1:1 transport":
        if model != "langmuir" or nonspecific:
            raise ValueError("Quasi-steady transport currently requires a single 1:1 binding population.")
        rules += [Parameter("k_transport", 1e5 * scale, 1., 1e15, unit="response M^-1 s^-1")]
    elif transport == "Two-compartment transport":
        rules += [rate("k_exchange", .5), Parameter("response_to_M", 1e-6 / scale, 1e-15, 1e-2,
                                                    fixed=True, unit="M / response")]
    if nonspecific:
        rules += [on("ns_kon"), rate("ns_koff", .05), capacity("ns_Rmax", .1 * scale)]
    if offset:
        rules += [Parameter("offset", 0., -scale * 10, scale * 10, "Per curve", positive=False, unit="response")]
    if drift:
        rules += [Parameter("drift", 0., -scale, scale, "Per curve", positive=False, unit="response s^-1")]
    if bulk:
        rules += [Parameter("bulk", 0., -scale * 1e10, scale * 1e10, "Per file", positive=False, unit="response M^-1")]
    if linear_nonspecific:
        rules += [Parameter("ns_linear", 0., -scale * 1e8, scale * 1e8, positive=False, unit="response M^-1 s^-1")]
    return rules


def validate_parameters(rules, expected):
    if len({r.key for r in rules}) != len(rules) or {r.key for r in rules} != {r.key for r in expected}:
        raise ValueError("Provide exactly one control row for each parameter in this model.")
    definitions = {r.key: r for r in expected}
    for rule in rules:
        if rule.positive != definitions[rule.key].positive or rule.unit != definitions[rule.key].unit:
            raise ValueError(f"{rule.key}: parameter sign convention and units cannot be redefined.")
        if rule.scope not in SCOPES or not np.isfinite([rule.initial, rule.lower, rule.upper]).all():
            raise ValueError(f"{rule.key}: scope and finite numerical controls are required.")
        if not rule.lower < rule.upper or not rule.lower <= rule.initial <= rule.upper:
            raise ValueError(f"{rule.key}: require lower < upper and an initial/fixed value within bounds.")
        if rule.positive and rule.lower <= 0:
            raise ValueError(f"{rule.key}: positive parameters need a positive lower bound for log-space fitting.")


def _one_to_one(t, kon, koff, capacity, concentration, on, off):
    duration = np.maximum(np.minimum(t, off) - on, 0.)
    rate = kon * concentration + koff
    y = capacity * kon * concentration / rate * (-np.expm1(-rate * duration))
    later = t > off
    y[later] *= np.exp(-koff * (t[later] - off))
    return y


def _binding_rhs(state, concentration, p, model):
    if model == "langmuir":
        return np.array([p["kon"] * concentration * (p["Rmax"] - state[0]) - p["koff"] * state[0]])
    first, second = state[:2]
    if model == "heterogeneous":
        return np.array([p["kon"] * concentration * (p["Rmax"] - first) - p["koff"] * first,
                         p["kon2"] * concentration * (p["Rmax2"] - second) - p["koff2"] * second])
    if model == "two_state":
        capture = p["kon"] * concentration * (p["Rmax"] - first - second) - p["koff"] * first
        conversion = p["k_forward"] * first - p["k_reverse"] * second
    elif model == "bivalent":
        free = p["Rmax"] - first - 2 * second
        capture = 2 * p["kon"] * concentration * free - p["koff"] * first
        conversion = p["kon2"] * first * free - 2 * p["koff2"] * second
    elif model == "sequential":
        capture = p["kon"] * concentration * (p["Rmax"] - first - second) - p["koff"] * first
        conversion = p["kon2"] * concentration * first - p["koff2"] * second
    else:
        raise ValueError("Unknown binding mechanism.")
    return np.array([capture - conversion, conversion])


def _binding_derivatives(state, concentration, p, model):
    """State and concentration derivatives of the same reaction equations."""
    a = p["kon"]*concentration
    if model == "langmuir":
        return np.array([[-a-p["koff"]]]), np.array([p["kon"]*(p["Rmax"]-state[0])])
    x, y = state[:2]
    if model == "heterogeneous":
        return np.diag([-a-p["koff"], -p["kon2"]*concentration-p["koff2"]]), np.array([
            p["kon"]*(p["Rmax"]-x), p["kon2"]*(p["Rmax2"]-y)])
    free = p["Rmax"]-x-(2*y if model == "bivalent" else y)
    if model == "bivalent":
        capture = np.array([-2*a-p["koff"], -4*a])
        conversion = np.array([p["kon2"]*(free-x), -2*p["kon2"]*x-2*p["koff2"]])
        dc = 2*p["kon"]*free
    else:
        capture = np.array([-a-p["koff"], -a])
        conversion = np.array([p["k_forward"], -p["k_reverse"]]) if model == "two_state" else np.array([
            p["kon2"]*concentration, -p["koff2"]])
        dc = p["kon"]*free
    dc_conversion = p["kon2"]*x if model == "sequential" else 0.
    return np.array([capture-conversion, conversion]), np.array([dc-dc_conversion, dc_conversion])


def _sequential_states(t, concentration, on, off, p):
    """Exact piecewise-constant two-analyte capture, including the physical switch."""
    a, b = p["kon"]*concentration, p["kon2"]*concentration
    matrix = np.array([[-a-p["koff"]-b, p["koff2"]-a], [b, -p["koff2"]]])
    equilibrium = np.linalg.solve(matrix, np.array([-a*p["Rmax"], 0.]))
    states = np.zeros((2, len(t)))
    active = (t >= on) & (t <= off)
    if active.any():
        states[:, active] = equilibrium[:, None]-_linear_state(matrix, equilibrium, t[active]-on)
    later = t > off
    if later.any():
        transition = equilibrium-_linear_state(matrix, equilibrium, [off-on])[:, 0]
        off_matrix = np.array([[-p["koff"], p["koff2"]], [0., -p["koff2"]]])
        states[:, later] = _linear_state(off_matrix, transition, t[later]-off)
    return states


def binding_prediction(time_s, concentration_M, on, off, parameters, model="langmuir", transport="None",
                       nonspecific=False, return_components=False, *, integration_method="LSODA"):
    """State history always starts at physical injection start, not a fit-window edge."""
    t = np.asarray(time_s, dtype=float)
    p = parameters
    if model not in MODEL_LABELS or transport not in TRANSPORT_LABELS or not on < off:
        raise ValueError("Choose a recognized mechanism/transport model and ordered phase starts.")
    if t.ndim != 1 or not np.isfinite(t).all() or concentration_M < 0:
        raise ValueError("Finite one-dimensional times and a nonnegative concentration are required.")
    if transport == "Quasi-steady 1:1 transport" and (model != "langmuir" or nonspecific):
        raise ValueError("Quasi-steady transport requires one 1:1 binding population.")
    if integration_method not in {"LSODA", "Radau"}:
        raise ValueError("Choose LSODA or Radau for numerical state integration.")
    component = {}
    analytic = transport == "None" and model in {"langmuir", "heterogeneous", "two_state", "sequential"}
    if analytic:
        if model == "sequential":
            states = _sequential_states(t, concentration_M, on, off, p)
            component["state_1_response"], component["state_2_response"] = states[0], 2*states[1]
            target = states[0]+2*states[1]
        elif model == "two_state":
            target = two_state_signal(t, p["kon"], p["koff"], p["Rmax"], p["k_forward"], p["k_reverse"], concentration_M, on, off)
            component["specific"] = target.copy()
        else:
            target = _one_to_one(t, p["kon"], p["koff"], p["Rmax"], concentration_M, on, off)
            component["population_1"] = target.copy()
            if model == "heterogeneous":
                second = _one_to_one(t, p["kon2"], p["koff2"], p["Rmax2"], concentration_M, on, off)
                component["population_2"] = second
                target += second
        if nonspecific:
            background = _one_to_one(t, p["ns_kon"], p["ns_koff"], p["ns_Rmax"], concentration_M, on, off)
            component["nonspecific"] = background
            target += background
    else:
        main_count = 1 if model == "langmuir" else 2
        binding_count = main_count + int(nonspecific)
        full_transport = transport == "Two-compartment transport"
        n_state = binding_count + int(full_transport)
        response_weights = np.ones(binding_count)
        if model == "sequential":
            response_weights[1] = 2.
        concentration_scale = max(concentration_M, 1e-9)

        def ode(_time, state, bulk_concentration):
            surface = state[-1] * concentration_scale if full_transport else bulk_concentration
            rates = _binding_rhs(state[:main_count], surface, p, model)
            if transport == "Quasi-steady 1:1 transport":
                rates /= 1 + p["kon"] * max(p["Rmax"] - state[0], 0.) / p["k_transport"]
            if nonspecific:
                ns = p["ns_kon"] * surface * (p["ns_Rmax"] - state[main_count]) - p["ns_koff"] * state[main_count]
                rates = np.r_[rates, ns]
            if full_transport:
                consumption = float(response_weights @ rates)
                transport_rate = p["k_exchange"] * (bulk_concentration / concentration_scale - state[-1])
                rates = np.r_[rates, transport_rate - p["response_to_M"] / concentration_scale * consumption]
            return rates

        def jacobian(_time, state, bulk_concentration):
            surface = state[-1]*concentration_scale if full_transport else bulk_concentration
            state_jac, dc = _binding_derivatives(state[:main_count], surface, p, model)
            if transport == "Quasi-steady 1:1 transport":
                free = max(p["Rmax"]-state[0], 0.)
                denominator = 1+p["kon"]*free/p["k_transport"]
                slope = -p["kon"]/p["k_transport"] if free > 0 else 0.
                state_jac = state_jac/denominator-_binding_rhs(state, surface, p, model)[:, None]*slope/denominator**2
                dc /= denominator
            matrix = np.zeros((n_state, n_state))
            matrix[:main_count, :main_count] = state_jac
            if nonspecific:
                matrix[main_count, main_count] = -p["ns_kon"]*surface-p["ns_koff"]
                dc = np.r_[dc, p["ns_kon"]*(p["ns_Rmax"]-state[main_count])]
            if full_transport:
                matrix[:binding_count, -1] = dc*concentration_scale
                matrix[-1, :binding_count] = -p["response_to_M"]/concentration_scale*(response_weights @ matrix[:binding_count, :binding_count])
                matrix[-1, -1] = -p["k_exchange"]-p["response_to_M"]*(response_weights @ dc)
            return matrix

        states = np.zeros((n_state, len(t)))
        if t.size and t.max() > on:
            capacity_scale = max(p["Rmax"], p.get("Rmax2", 0.), p.get("ns_Rmax", 0.), 1e-6)
            atol = np.r_[np.full(binding_count, capacity_scale * 1e-10), 1e-10] if full_transport else capacity_scale * 1e-10
            association = solve_ivp(lambda ti, s: ode(ti, s, concentration_M), (on, off), np.zeros(n_state),
                                    method=integration_method, jac=lambda ti, s: jacobian(ti, s, concentration_M),
                                    dense_output=True, rtol=2e-8, atol=atol)
            if not association.success:
                raise RuntimeError("Association integration did not converge.")
            active = (t >= on) & (t <= off)
            if active.any():
                states[:, active] = association.sol(t[active])
            later = t > off
            if later.any():
                dissociation = solve_ivp(lambda ti, s: ode(ti, s, 0.), (off, float(t.max())), association.sol(off),
                                         method=integration_method, jac=lambda ti, s: jacobian(ti, s, 0.),
                                         dense_output=True, rtol=2e-8, atol=atol)
                if not dissociation.success:
                    raise RuntimeError("Dissociation integration did not converge.")
                states[:, later] = dissociation.sol(t[later])
        component["state_1_response"] = states[0]
        if main_count == 2:
            component["state_2_response"] = states[1] * response_weights[1]
        if nonspecific:
            component["nonspecific"] = states[main_count]
        if full_transport:
            component["surface_concentration_M"] = states[-1] * concentration_scale
        target = response_weights @ states[:binding_count]
    observation_terms = {
        "offset": ("constant_offset", np.full_like(t, p.get("offset", 0.))),
        "drift": ("linear_drift", p.get("drift", 0.) * (t - on)),
        "bulk": ("injection_bulk_response", p.get("bulk", 0.) * concentration_M * ((t >= on) & (t < off))),
        "ns_linear": ("nonspecific_linear", p.get("ns_linear", 0.) * concentration_M * np.clip(t - on, 0., off - on)),
    }
    result = target.copy()
    for key, (name, values) in observation_terms.items():
        if key in p:
            component[name] = values
            result += values
    if not np.isfinite(result).all():
        raise FloatingPointError("Nonfinite model prediction.")
    return (result, component) if return_components else result


def prepare_curves(data_list, include_map, windows, normalize=True):
    curves = []
    for data in data_list:
        filename = data["filename"]
        t = np.asarray(data["time"], float)
        masks = observation_masks(t, windows)
        for c in data["concentrations"]:
            if c <= 0 or c not in include_map.get(filename, set()):
                continue
            y = np.asarray(data["responses"][c], float).copy()
            baseline = float(np.median(y[masks["baseline"]])) if normalize and masks["baseline"].any() else 0.
            if normalize and not masks["baseline"].any():
                raise ValueError(f"{filename}, {c:g} nM: baseline normalization needs pre-association observations.")
            if masks["kinetic"].sum() < 8:
                raise ValueError(f"{filename}, {c:g} nM: fewer than eight selected observations.")
            curves.append(dict(filename=filename, repeat_id=data.get("repeat_id", filename), concentration_nM=float(c),
                               concentration_M=float(c) * 1e-9, time=t, response=y - baseline, baseline_offset=baseline,
                               fit_mask=masks["kinetic"], on=windows["phase_assoc_start_s"], off=windows["phase_dissoc_start_s"],
                               **baseline_reference(t, windows["phase_assoc_start_s"], normalize), **curve_input(data, c)))
    if not curves:
        raise ValueError("No included sample traces.")
    return curves


def _group(rule, curve):
    if rule.scope == "Global":
        return "all"
    if rule.scope == "Per repeat":
        return str(curve["repeat_id"])
    if rule.scope == "Per file":
        return curve["filename"]
    if rule.scope == "Per surface":
        return str(curve.get("surface_id") or f"{curve['filename']}::{curve['concentration_nM']:.12g}")
    return f"{curve['filename']}::{curve['concentration_nM']:.12g}"


def _whiten(residuals, times, correlation_time):
    if correlation_time <= 0:
        return residuals, 0.
    alpha = np.exp(-np.diff(times) / correlation_time)
    variance = -np.expm1(-2 * np.diff(times) / correlation_time)
    return np.r_[residuals[0], (residuals[1:] - alpha * residuals[:-1]) / np.sqrt(variance)], float(np.log(variance).sum())


def expand_parameter_controls(curves, rules):
    instances = {}
    for curve in curves:
        for rule in rules:
            key = f"{rule.key}::{_group(rule, curve)}"
            instances[key] = dict(instance=key, **asdict(rule))
    return pd.DataFrame(instances.values())


def fit_mechanism(curves, model, rules, transport="None", nonspecific=False, starts=4,
                  max_nfev=1200, runtime_s=120., correlation_time=0., loss="linear", f_scale=1.,
                  seed=1729, forced_values=None, instance_controls=None, compute_input_uncertainty=True,
                  start_strategy="local"):
    """Same objective and exact measured masks for all scopes, starts and profiles."""
    if loss not in {"linear", "soft_l1"} or not np.isfinite([correlation_time, starts, runtime_s, f_scale]).all() or correlation_time < 0 or starts < 1 or runtime_s <= 0 or f_scale <= 0:
        raise ValueError("Invalid optimizer/noise controls.")
    if start_strategy not in {"local", "broad"}:
        raise ValueError("Choose local or broad bounded multistart exploration.")
    enabled = {r.key for r in rules}
    expected = parameter_defaults(model, transport=transport, nonspecific=nonspecific,
                                  offset="offset" in enabled, drift="drift" in enabled, bulk="bulk" in enabled,
                                  linear_nonspecific="ns_linear" in enabled)
    validate_parameters(rules, expected)
    if not curves:
        raise ValueError("No curves supplied.")
    instances, curve_keys = {}, []
    forced_values = forced_values or {}
    for curve in curves:
        if (len(curve["time"]) != len(curve["response"]) or len(curve["time"]) != len(curve["fit_mask"])
                or not np.asarray(curve["fit_mask"]).dtype == np.dtype(bool) or not np.any(curve["fit_mask"])):
            raise ValueError("Each curve needs matching time, response and nonempty Boolean observation masks.")
        if not np.isfinite([curve["concentration_M"], curve["on"], curve["off"]]).all() or curve["concentration_M"] <= 0 or curve["on"] >= curve["off"]:
            raise ValueError("Positive finite concentrations and ordered finite phase starts are required.")
        if np.any(np.diff(curve["time"]) <= 0) or not np.isfinite(curve["time"]).all() or not np.isfinite(curve["response"]).all():
            raise ValueError("Times must be strictly increasing.")
        if not np.isfinite(curve.get("relative_sd", 1.)) or curve.get("relative_sd", 1.) <= 0:
            raise ValueError("Relative trace noise scales must be finite and positive.")
        keys = {}
        for rule in rules:
            key = f"{rule.key}::{_group(rule, curve)}"
            keys[rule.key] = key
            instances[key] = rule
        curve_keys.append(keys)
    for key, controls in (instance_controls or {}).items():
        if key not in instances or set(controls) - {"initial", "lower", "upper", "fixed"}:
            raise ValueError("Unknown parameter instance or override field.")
        original = instances[key]
        changed = replace(original, **controls)
        validate_parameters([changed], [original])
        instances[key] = changed
    if set(forced_values) - set(instances):
        raise ValueError("A fixed/profile override names an unknown parameter instance.")
    free = [key for key, rule in instances.items() if not rule.fixed and key not in forced_values]
    n_observations = sum(int(np.count_nonzero(c["fit_mask"])) for c in curves)
    if n_observations <= len(free):
        raise ValueError("Not enough selected observations for the number of free parameters.")
    center, lower, upper, signed_scale = [], [], [], {}
    for key in free:
        rule = instances[key]
        scale = max(abs(rule.lower), abs(rule.upper), 1e-12) if not rule.positive else 1.
        signed_scale[key] = scale
        encode = np.log if rule.positive else lambda value: value / scale
        center.append(encode(rule.initial))
        lower.append(encode(rule.lower))
        upper.append(encode(rule.upper))
    center, lower, upper = np.array(center), np.array(lower), np.array(upper)
    for key, value in forced_values.items():
        rule = instances[key]
        if not rule.lower <= value <= rule.upper:
            raise ValueError("Fixed/profile override is outside its declared bounds.")

    def decode(z):
        values = {key: forced_values.get(key, rule.initial) for key, rule in instances.items()}
        values.update({key: float(np.exp(value)) if instances[key].positive else float(value * signed_scale[key])
                       for key, value in zip(free, z)})
        return values

    deadline = time.perf_counter() + runtime_s

    def residual_fn(z):
        if time.perf_counter() > deadline:
            raise TimeoutError("Fit runtime limit reached.")
        values, residuals = decode(z), []
        for curve, keys in zip(curves, curve_keys):
            mask = np.asarray(curve["fit_mask"], bool)
            p = {key: values[instance] for key, instance in keys.items()}
            pred = binding_prediction(curve["time"][mask], curve["concentration_M"], curve["on"], curve["off"], p,
                                      model, transport, nonspecific)
            residual, _ = _whiten(curve["response"][mask] - pred, curve["time"][mask], correlation_time)
            residuals.append(residual / curve.get("relative_sd", 1.))
        return np.concatenate(residuals)

    rng, candidates, history = np.random.default_rng(seed), [], []
    timed_out = False
    if not free:
        residual = residual_fn(np.array([]))
        best = None
        solution = np.array([])
        history.append(dict(start=1, converged=True, rss=float(residual @ residual), message="All parameters fixed"))
    else:
        for index in range(int(starts)):
            if index == 0:
                z0 = center.copy()
            elif start_strategy == "broad":
                span = np.array([np.log(100.) if instances[key].positive else .25*(hi-lo)
                                 for key, lo, hi in zip(free, lower, upper)])
                z0 = rng.uniform(np.maximum(lower, center-span), np.minimum(upper, center+span))
            else:
                z0 = np.clip(center + rng.normal(0., .8, len(free)), lower + 1e-9, upper - 1e-9)
            try:
                opt = least_squares(residual_fn, z0, bounds=(lower, upper), method="trf", jac="3-point",
                                    diff_step=1e-4, x_scale="jac", loss=loss, f_scale=f_scale, max_nfev=max_nfev)
                history.append(dict(start=index + 1, converged=bool(opt.success), rss=float(opt.fun @ opt.fun),
                                    objective=float(2 * opt.cost), message=opt.message))
                if opt.success and np.isfinite(opt.fun).all():
                    candidates.append(opt)
            except TimeoutError:
                timed_out = True
                break
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                history.append(dict(start=index + 1, converged=False, message=str(exc)))
        if not candidates:
            raise RuntimeError("No multistart fit converged within the declared runtime and evaluation limits.")
        best = min(candidates, key=lambda fit: fit.cost)
        solution, residual = best.x, best.fun
    values = decode(solution)
    bounds = boundary_flags(solution, lower, upper, free) if free else []
    if best is not None:
        bounds = sorted(set(bounds) | {key for key, active in zip(free, best.active_mask) if active})
    info = conditional_covariance(best.jac, residual) if best is not None else dict(
        covariance=None, degrees_of_freedom=n_observations, covariance_status="All parameters fixed",
        jacobian_rank=0, scaled_jacobian_condition=np.nan)
    covariance = info.pop("covariance")
    if bounds or loss != "linear":
        covariance = None
        info["covariance_status"] = "Unavailable: active bound or robust sensitivity objective"
    conditional_encoded_covariance = covariance
    baseline_uncertainty = dict(applied=False)
    if covariance is not None:
        reference_curves = [{**curve, "baseline_trend": values.get(keys.get("drift"), 0.)}
                            for curve, keys in zip(curves, curve_keys)]
        try:
            propagated, baseline_uncertainty = propagate_baseline(best.jac, residual, reference_curves, correlation_time)
            if propagated is not None:
                covariance = propagated
        except ValueError as exc:
            covariance = None
            baseline_uncertainty = dict(applied=False, error=str(exc))
            info["covariance_status"] = "Unavailable: baseline uncertainty propagation failed"
    physical_covariance = None
    conditional_physical_covariance = None
    if conditional_encoded_covariance is not None:
        transform = np.array([values[key] if instances[key].positive else signed_scale[key] for key in free])
        conditional_physical_covariance = conditional_encoded_covariance * np.outer(transform, transform)
        if covariance is not None:
            physical_covariance = covariance * np.outer(transform, transform)
    input_uncertainty = dict(applied=False)
    if compute_input_uncertainty and requested(common_options(curves)):
        try:
            if physical_covariance is None:
                raise ValueError("Input uncertainty cannot repair active bounds, robust fits or unresolved parameters.")
            concentration_derivatives = []
            for curve, keys in zip(curves, curve_keys):
                mask = curve["fit_mask"]
                p = {key: values[instance] for key, instance in keys.items()}
                plus = binding_prediction(curve["time"][mask], curve["concentration_M"]*np.exp(1e-5), curve["on"], curve["off"], p, model, transport, nonspecific)
                minus = binding_prediction(curve["time"][mask], curve["concentration_M"]*np.exp(-1e-5), curve["on"], curve["off"], p, model, transport, nonspecific)
                derivative, _ = _whiten(-(plus-minus)/(2e-5), curve["time"][mask], correlation_time)
                concentration_derivatives.append(derivative/curve.get("relative_sd", 1.))
            physical_covariance, input_uncertainty = propagate_fit_inputs(best.jac, reference_curves, physical_covariance,
                concentration_derivatives, correlation_time, transform)
            input_uncertainty["parameter_order"] = list(free)
            info["covariance_status"] = INPUT_ERROR
        except ValueError as exc:
            physical_covariance = None
            input_uncertainty = dict(applied=False, error=str(exc), settings=common_options(curves))
            info["covariance_status"] = "Unavailable: requested input-uncertainty propagation failed"
    positions = {key: i for i, key in enumerate(free)}
    table = []
    for key, rule in instances.items():
        idx = positions.get(key)
        se = float(np.sqrt(max(physical_covariance[idx, idx], 0.))) if physical_covariance is not None and idx is not None else np.nan
        conditional_se = float(np.sqrt(max(conditional_physical_covariance[idx, idx], 0.))) if conditional_physical_covariance is not None and idx is not None else np.nan
        table.append(dict(instance=key, parameter=rule.key, scope=rule.scope, group=key.split("::", 1)[1], value=values[key],
                          model_se=se, conditional_on_baseline_se=conditional_se,
                          fixed=rule.fixed or key in forced_values, unit=rule.unit, at_bound=key in bounds,
                          **local_precision(values[key], se, rule.fixed or key in forced_values)))
    fitted_curves, noise_logdet = [], 0.
    for curve, keys in zip(curves, curve_keys):
        p = {key: values[instance] for key, instance in keys.items()}
        prediction, components = binding_prediction(curve["time"], curve["concentration_M"], curve["on"], curve["off"], p,
                                                    model, transport, nonspecific, return_components=True)
        raw = curve["response"] - prediction
        mask = curve["fit_mask"]
        whitened, determinant = _whiten(raw[mask], curve["time"][mask], correlation_time)
        whitened /= curve.get("relative_sd", 1.)
        noise_logdet += determinant + 2 * len(whitened) * np.log(curve.get("relative_sd", 1.))
        fitted_curves.append({**curve, "fitted": prediction, "residuals": raw, "components": components,
                              "whitened_residuals": whitened, "parameters": p,
                              "residual_dependence": residual_dependence(raw, mask, np.ptp(curve["response"][mask]))})
    information = gaussian_information(residual, len(free))
    for key in ["aic", "aicc", "bic"]:
        information[key] += noise_logdet
    information["log_likelihood"] -= .5 * noise_logdet
    warnings = ["Errors remain local to the selected model, windows and fixed noise/calibration assumptions. Independent-repeat SD is reported separately."]
    if input_uncertainty.get("applied"):
        warnings.append("Input uncertainty follows only the enabled raw-source/calibration components of the saved budget. Enabled reused-control and common-stock errors are shared, not independent copies. Likelihood/AIC and profiles are unchanged.")
        if not input_uncertainty["settings"]["propagate_measurement"]:
            warnings.append("The calibration budget is enabled, but raw shared-control covariance is not propagated.")
    elif input_uncertainty.get("error"):
        warnings.append(input_uncertainty["error"])
    else:
        warnings.append("Shared-control and concentration uncertainty are not propagated unless an input budget is enabled.")
    if baseline_uncertainty.get("applied"):
        warnings.append("Measured-baseline uncertainty is propagated through all fitted parameters. Likelihood/AIC and exploratory profiles remain conditional on preprocessing; they are not baseline-marginalized likelihoods.")
    elif baseline_uncertainty.get("error"):
        warnings.append(baseline_uncertainty["error"])
    if model != "langmuir":
        warnings.append(MODEL_NOTES[model])
    if transport == "Two-compartment transport":
        warnings.append("response_to_M is an effective surface-volume/response calibration. Its fixed default is an assumption, not an instrument measurement; rates are conditional on it.")
    if transport != "None":
        warnings.append("Transport-limited data may not identify intrinsic rates; validate across concentrations, ligand densities and flow/shaking conditions.")
    if nonspecific:
        warnings.append("A second binding component cannot be identified as nonspecific from sample curves alone. Use negative controls or independently constrained background parameters.")
    if "ns_linear" in enabled:
        warnings.append("The linear nonspecific term is an empirical concentration-dependent association ramp held constant during dissociation. It is an additive signal term, not a mechanistic binding population or a transport sink.")
    if "ns_linear" in enabled and ("drift" in enabled or nonspecific):
        warnings.append("Multiple background terms can be strongly correlated with each other and binding parameters. Inspect parameter correlations, residuals and control data.")
    if bounds:
        warnings.append("At least one free parameter reached a declared bound. Two-sided model errors are withheld.")
    weak = [row["instance"] for row in table if not row["fixed"] and instances[row["instance"]].positive
            and row["local_precision_status"] != "Locally resolved"]
    if weak:
        warnings.append("Unresolved local precision for " + ", ".join(weak) + ". Missing covariance or SE/value > 1 prevents routine repeat summaries for those estimates. Inspect nuisance-refitted profiles; a well-fitted curve need not resolve every rate.")
    if correlation_time == 0 and any(c["residual_dependence"]["serial_correlation_flag"] for c in fitted_curves):
        budget = input_uncertainty.get("settings", {})
        if input_uncertainty.get("applied") and budget.get("propagate_measurement") and budget["raw_correlation_time_s"] > 0:
            warnings.append("Serial residual dependence detected. Input covariance uses the supplied raw-noise OU time; inspect binding/noise adequacy.")
        else:
            warnings.append("Serial residual correlation detected; IID model errors can underestimate uncertainty.")
    if correlation_time > 0:
        warnings.append("GLS uncertainty is conditional on the supplied fixed OU correlation time. Noise-model uncertainty is not propagated; reference/calibration treatment follows the saved input budget.")
    if loss != "linear":
        warnings.append("Soft-L1 is a sensitivity fit: conventional Gaussian covariance, information criteria and RSS profile intervals are withheld.")
        information = {key: np.nan for key in information}
    if info["covariance_status"] not in {CONDITIONAL_ERROR, INPUT_ERROR, "All parameters fixed"}:
        warnings.append(info["covariance_status"])
    if timed_out:
        warnings.append("Runtime limit reached; best completed start retained. Multistart search is incomplete.")
    if correlation_time > 0 and info["covariance_status"] == CONDITIONAL_ERROR:
        info["covariance_status"] = GLS_ERROR
    return dict(model=model, transport=transport, nonspecific=nonspecific, parameter_controls=[asdict(r) for r in rules],
                background_terms=dict(linear_drift="drift" in enabled, linear_nonspecific="ns_linear" in enabled,
                                      reversible_nonspecific=bool(nonspecific), constant_offset="offset" in enabled,
                                      injection_bulk_response="bulk" in enabled),
                instance_controls={key: {name: getattr(rule, name) for name in ["initial", "lower", "upper", "fixed"]}
                                   for key, rule in instances.items()},
                parameter_table=pd.DataFrame(table), curves=fitted_curves, values=values, free_parameters=free,
                covariance=physical_covariance, conditional_on_baseline_covariance=conditional_physical_covariance,
                baseline_uncertainty=baseline_uncertainty, input_uncertainty=input_uncertainty,
                precision_screen=dict(relative_se_limit=LOCAL_PRECISION_LIMIT, unresolved_instances=weak,
                    interpretation="Declared local precision screen, not a significance test or guarantee of identifiability. Derived affinities are screened separately using their full covariance."),
                n_observations=n_observations, n_parameters=len(free),
                rss=float(residual @ residual), information_criteria=information, boundary_parameters=bounds,
                multistart=pd.DataFrame(history), timed_out=timed_out, correlation_time=float(correlation_time), loss=loss,
                noise_model="Fixed-time OU GLS" if correlation_time > 0 else "IID least squares",
                optimizer_settings=dict(starts=int(starts), max_nfev=int(max_nfev), runtime_s=float(runtime_s), seed=int(seed),
                                        loss=loss, f_scale=float(f_scale), start_strategy=start_strategy),
                uncertainty_method=INPUT_ERROR if input_uncertainty.get("applied") else ((BASELINE_ERROR if correlation_time == 0 else BASELINE_GLS_ERROR) if baseline_uncertainty.get("applied") else (CONDITIONAL_ERROR if correlation_time == 0 else GLS_ERROR)),
                scientific_warnings=warnings, **info)


def derived_affinities(result):
    rows = []
    rules = [Parameter(**item) for item in result["parameter_controls"]]
    free_index = {key: i for i, key in enumerate(result["free_parameters"])}
    for curve in result["curves"]:
        p, model = curve["parameters"], result["model"]
        def metrics(params):
            first = params["koff"] / params["kon"] * 1e9
            if model == "langmuir":
                return {"KD_nM": first}
            if model == "two_state":
                return {"KD_overall_nM": first * params["k_reverse"] / (params["k_forward"] + params["k_reverse"]), "KD_first_step_nM": first}
            if model in {"heterogeneous", "sequential"}:
                return {"KD_population_1_nM" if model == "heterogeneous" else "KD_step_1_nM": first,
                        "KD_population_2_nM" if model == "heterogeneous" else "KD_step_2_nM": params["koff2"] / params["kon2"] * 1e9}
            return {"KD_per_arm_first_step_nM": first, "KD_macroscopic_capture_nM": first / 2}

        for name, value in metrics(p).items():
            gradient = np.zeros(len(free_index))
            for rule in rules:
                instance = f"{rule.key}::{_group(rule, curve)}"
                if instance not in free_index:
                    continue
                step = max(abs(p[rule.key]) * 1e-5, 1e-15)
                plus, minus = dict(p), dict(p)
                plus[rule.key] += step
                minus[rule.key] -= step
                gradient[free_index[instance]] = (metrics(plus)[name] - metrics(minus)[name]) / (2 * step)
            covariance = result["covariance"]
            error = float(np.sqrt(max(float(gradient @ covariance @ gradient), 0.))) if covariance is not None and np.any(gradient) else np.nan
            rows.append(dict(filename=curve["filename"], repeat_id=curve["repeat_id"], concentration_nM=curve["concentration_nM"],
                             metric=name, value=value, model_se=error, estimated=bool(np.any(gradient)),
                             unit="nM", interpretation=MODEL_NOTES[model],
                             **local_precision(value, error, not np.any(gradient))))
    return pd.DataFrame(rows)


def stoichiometry_from_capacity(rmax_analyte, ligand_loading, mw_ligand, mw_analyte,
                                response_ratio=None, active_fraction=None):
    """Response_ratio = response per mass of analyte / response per mass of ligand.

    BLI needs an independently justified calibration; no RU-to-nm assumption.
    Without active_fraction this returns apparent accessible capacity, not n.
    """
    if response_ratio is None:
        raise ValueError("A justified analyte/ligand response-per-mass ratio is required; BLI is not automatically mass calibrated.")
    values = [rmax_analyte, ligand_loading, mw_ligand, mw_analyte, response_ratio]
    if not np.all(np.isfinite(values)) or any(value <= 0 for value in values):
        raise ValueError("Capacity, loading, molecular weights and calibration must be finite and positive.")
    apparent = rmax_analyte / ligand_loading * mw_ligand / mw_analyte / response_ratio
    if active_fraction is not None and (not np.isfinite(active_fraction) or not 0 < active_fraction <= 1):
        raise ValueError("An independently established active fraction must lie in (0, 1].")
    return dict(apparent_capacity_ratio=float(apparent),
                stoichiometry=float(apparent / active_fraction) if active_fraction is not None else None,
                interpretation="Conditional on calibrated response, measured loading, molecular weights and independently known active fraction; no uncertainty propagated.",
                active_fraction_assumed=active_fraction)


def profile_parameter(result, curves, instance, points=9, decades=2., runtime_s=120.):
    if result["loss"] != "linear" or instance not in result["free_parameters"]:
        raise ValueError("RSS profiles require a free parameter and the least-squares objective.")
    rule = next(Parameter(**item) for item in result["parameter_controls"] if instance.startswith(item["key"] + "::"))
    rule = replace(rule, **result["instance_controls"][instance])
    if not rule.positive:
        raise ValueError("This profile view currently supports positive rate/capacity parameters.")
    center = result["values"][instance]
    grid = np.unique(np.r_[np.geomspace(max(rule.lower, center / 10**decades), min(rule.upper, center * 10**decades), points), center])
    dof = result["degrees_of_freedom"]
    if dof <= 0:
        raise ValueError("Profile interval needs positive residual degrees of freedom.")
    cutoff = result["rss"] * (1 + stats.f.ppf(.95, 1, dof) / dof)
    rows, deadline = [], time.perf_counter() + runtime_s
    rules = [Parameter(**item) for item in result["parameter_controls"]]
    warm_start = {key: {**control, "initial": result["values"][key]} for key, control in result["instance_controls"].items()}
    for value in grid:
        remaining = deadline - time.perf_counter()
        if remaining <= 0:
            break
        try:
            fitted = fit_mechanism(curves, result["model"], rules, transport=result["transport"], nonspecific=result["nonspecific"],
                                   starts=1, runtime_s=remaining, correlation_time=result["correlation_time"],
                                   max_nfev=result["optimizer_settings"]["max_nfev"],
                                   forced_values={instance: value}, instance_controls=warm_start, compute_input_uncertainty=False)
            rows.append(dict(value=value, rss=fitted["rss"], within_approximate_95_region=fitted["rss"] <= cutoff, status="Converged"))
        except (RuntimeError, ValueError) as exc:
            rows.append(dict(value=value, rss=np.nan, within_approximate_95_region=None, status=str(exc)))
    return dict(instance=instance, table=pd.DataFrame(rows, columns=["value", "rss", "within_approximate_95_region", "status"]),
                cutoff=float(cutoff), requested_points=len(grid),
                interpretation="Exploratory nuisance-refitted RSS profile grid; failed or missing points are unknown, not confidence exclusions. Grid endpoints are not interval limits.")


def assay_guidance(assay, model):
    surface, analyte = assay.get("immobilized", "Unspecified"), assay.get("analyte", "Unspecified")
    valency = assay.get("analyte_valency", "Unknown")
    messages = []
    if surface == "Receptor" and analyte == "Ligand":
        messages.append("The signal mainly observes soluble ligand binding. Association between receptors already on the surface need not add mass. A two-state fit does not establish receptor dimerization or whether ligand contacts the dimer interface.")
    if surface == "Ligand" and analyte == "Receptor":
        messages.append("Sequential capture of a second soluble receptor can add a second receptor's mass. Compare the two-analyte model with independent-site and simpler models; a fit alone does not prove a receptor dimer interface.")
    if surface == "Antibody" and analyte == "Receptor":
        messages.append("A bivalent immobilized antibody does not make monomeric soluble receptor a bivalent analyte. Equivalent independent antibody arms can follow 1:1 kinetics with a larger capacity.")
    if model == "bivalent" and valency != "Bivalent":
        messages.append("The bivalent-analyte model assumes two equivalent binding arms on the soluble species. Confirm soluble-species valency before interpreting this model as avidity.")
    if assay.get("technique") == "BLI":
        messages.append("Separate biosensors may need separate capacities: use Per curve or explicitly assigned Per surface groups, not a shared Rmax solely because traces are in one CSV.")
    if assay.get("target_process") == "Receptor dimerization":
        messages.append("Receptor dimerization requires an explicit reaction/observation model and supporting experiments. Current candidates do not identify an arbitrary ligand-induced receptor-assembly network, a pre-existing dimer equilibrium, or the ligand's structural position.")
    return messages


def refit_independent_repeats(curves, parent, starts=2, runtime_s=120.):
    """One refit per declared independent repeat; never use shared-rate copies as n."""
    records, statuses = [], []
    rules = [Parameter(**item) for item in parent["parameter_controls"]]
    repeat_ids = sorted({c["repeat_id"] for c in curves})
    for repeat in repeat_ids:
        subset = [c for c in curves if c["repeat_id"] == repeat]
        needed = set(expand_parameter_controls(subset, rules).instance)
        overrides = {key: controls for key, controls in parent["instance_controls"].items() if key in needed}
        try:
            fit = fit_mechanism(subset, parent["model"], rules, transport=parent["transport"], nonspecific=parent["nonspecific"],
                                starts=starts, runtime_s=runtime_s, correlation_time=parent["correlation_time"],
                                max_nfev=parent["optimizer_settings"]["max_nfev"],
                                loss=parent["loss"], f_scale=parent["optimizer_settings"].get("f_scale", 1.), instance_controls=overrides,
                                start_strategy=parent["optimizer_settings"].get("start_strategy", "local"))
            eligible = not fit["boundary_parameters"] and fit["loss"] == "linear" and not fit["timed_out"]
            eligible &= fit["covariance_status"] in {CONDITIONAL_ERROR, GLS_ERROR, INPUT_ERROR, "All parameters fixed"}
            status = "Complete" if eligible else "Unresolved / boundary / sensitivity fit"
            statuses.append(dict(repeat_id=repeat, status=status, detail="; ".join(fit["scientific_warnings"])))

            def append_estimate(parameter, row, unit, interpretation, value=None):
                precision = local_precision(row.value, row.model_se)
                estimate_status = status
                if eligible and precision["local_precision_status"] != "Locally resolved":
                    estimate_status = "Unresolved local precision"
                    statuses[-1]["status"] = "Complete with unresolved parameters"
                records.append(dict(repeat_id=repeat, parameter=parameter,
                    value=row.value if value is None else value, model_se=row.model_se,
                    unit=unit, status=estimate_status, interpretation=interpretation, **precision))

            parameters = fit["parameter_table"]
            if parameters.fixed.all():
                statuses[-1].update(status="All parameters fixed", detail="No independently estimated parameters to summarize.")
                continue
            if parent["model"] == "heterogeneous":
                # Label switching is resolved only by an explicit affinity-order convention.
                shared_rates = {key: parameters.loc[parameters.parameter == key, "value"].unique() for key in ["kon", "koff", "kon2", "koff2"]}
                if any(len(values) != 1 for values in shared_rates.values()):
                    statuses[-1].update(status="Local populations not pooled", detail="Heterogeneous rates must have one value per repeat for affinity-ordered summaries.")
                    continue
                p = {key: values[0] for key, values in shared_rates.items()}
                order = sorted([(p["koff"] / p["kon"], p["kon"], p["koff"], "kon", "koff"),
                                (p["koff2"] / p["kon2"], p["kon2"], p["koff2"], "kon2", "koff2")])
                affinities = derived_affinities(fit).drop_duplicates("metric").set_index("metric")
                for label, (kd, kon, koff, on_key, off_key) in zip(["higher_affinity", "lower_affinity"], order):
                    for key, value, unit in [(f"kon_{label}", kon, "M^-1 s^-1"), (f"koff_{label}", koff, "s^-1"), (f"KD_{label}_nM", kd * 1e9, "nM")]:
                        dependencies = [on_key, off_key] if key.startswith("KD_") else [on_key if key.startswith("kon_") else off_key]
                        if parameters.loc[parameters.parameter.isin(dependencies), "fixed"].all():
                            continue
                        row = (affinities.loc["KD_population_1_nM" if on_key == "kon" else "KD_population_2_nM"]
                               if key.startswith("KD_") else parameters.loc[parameters.parameter == dependencies[0]].iloc[0])
                        append_estimate(key, row, unit, "Components ordered by fitted KD; not identified biological populations", value)
            else:
                for parameter, group in parameters.groupby("parameter", sort=False):
                    if len(group) == 1 and not group.fixed.all() and parameter not in {"Rmax", "offset", "drift", "bulk", "ns_linear", "ns_Rmax"}:
                        row = group.iloc[0]
                        append_estimate(parameter, row, row.unit, "Independent-repeat refit; conditional on saved fixed parameters and preprocessing")
                affinities = derived_affinities(fit)
                for metric, group in affinities.groupby("metric", sort=False):
                    if group.value.nunique() == 1 and group.estimated.all():
                        row = group.iloc[0]
                        append_estimate(metric, row, "nM", row.interpretation)
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            statuses.append(dict(repeat_id=repeat, status="Failed", detail=str(exc)))
    estimates = pd.DataFrame(records, columns=["repeat_id", "parameter", "value", "model_se", "unit", "status", "interpretation",
                                             "relative_model_se", "local_precision_status"])
    summaries = []
    for parameter, group in estimates.groupby("parameter", sort=False):
        valid = group.loc[(group.status == "Complete") & np.isfinite(group.value) & (group.value > 0), "value"].to_numpy()
        n = len(valid)
        mean = float(valid.mean()) if n else np.nan
        sd = float(np.std(valid, ddof=1)) if n > 1 else np.nan
        low = high = np.nan
        if n > 1:
            logs = np.log(valid)
            half = stats.t.ppf(.975, n - 1) * np.std(logs, ddof=1) / np.sqrt(n)
            low, high = np.exp(np.clip([logs.mean() - half, logs.mean() + half], -700, 700))
        summaries.append(dict(parameter=parameter, unit=group.unit.iloc[0], n_independent=n, mean=mean, sd=sd,
                              sem=sd / np.sqrt(n) if n > 1 else np.nan, ci95_low=low, ci95_high=high,
                              geometric_mean=float(np.exp(np.log(valid).mean())) if n else np.nan,
                              excluded_or_failed=len(repeat_ids) - n, interval_method="Log-Student-t CI for geometric mean across independent repeats"))
    for status in statuses:
        status.update(starts_requested=int(starts), runtime_limit_s=float(runtime_s),
                      max_nfev=parent["optimizer_settings"]["max_nfev"], seed=1729)
    return dict(estimates=estimates, summary=pd.DataFrame(summaries), status=pd.DataFrame(statuses))


def _step_schedule(steps, t_max):
    """Validate and normalize a single-cycle injection schedule into ordered (t_start, t_end, concentration_M) intervals."""
    if not steps:
        raise ValueError("Single-cycle kinetics requires at least one injection step.")
    normalized = []
    prev_off = -np.inf
    for idx, step in enumerate(steps):
        on = float(step["on"])
        off = float(step["off"])
        c_m = float(step["concentration_M"]) if "concentration_M" in step else float(step["concentration_nM"]) * 1e-9
        if not np.isfinite([on, off, c_m]).all() or c_m <= 0 or on >= off:
            raise ValueError(f"Step {idx + 1}: positive finite concentration and ordered on < off times are required.")
        if on < prev_off - 1e-12:
            raise ValueError(f"Step {idx + 1}: injection steps must be non-overlapping and ordered in time.")
        normalized.append(dict(step=idx + 1, on=on, off=off, concentration_M=c_m, concentration_nM=c_m * 1e9))
        prev_off = off
    intervals = []
    for idx, step in enumerate(normalized):
        intervals.append((step["on"], step["off"], step["concentration_M"], idx + 1))
        next_on = normalized[idx + 1]["on"] if idx + 1 < len(normalized) else max(float(t_max), step["off"])
        if next_on > step["off"]:
            intervals.append((step["off"], next_on, 0.0, 0))
    return normalized, intervals


def single_cycle_prediction(time_s, steps, parameters, model="langmuir", transport="None",
                            nonspecific=False, return_components=False, *, integration_method="LSODA"):
    """Predict response across sequential non-regenerated injections (Single-Cycle Kinetics)."""
    t = np.asarray(time_s, dtype=float)
    p = parameters
    if model not in MODEL_LABELS or transport not in TRANSPORT_LABELS:
        raise ValueError("Choose a recognized mechanism and transport model.")
    if t.ndim != 1 or not np.isfinite(t).all():
        raise ValueError("Finite one-dimensional times are required.")
    if transport == "Quasi-steady 1:1 transport" and (model != "langmuir" or nonspecific):
        raise ValueError("Quasi-steady transport requires one 1:1 binding population.")
    if integration_method not in {"LSODA", "Radau"}:
        raise ValueError("Choose LSODA or Radau for numerical state integration.")
    normalized_steps, intervals = _step_schedule(steps, float(t.max()) if t.size else 0.0)
    first_on = normalized_steps[0]["on"]
    component = {}
    analytic = transport == "None" and model in {"langmuir", "heterogeneous", "two_state", "sequential"}

    def _advance_1d(s0, dt, kon, koff, capacity, conc):
        rate = kon * conc + koff
        if rate <= 0:
            return np.full_like(dt, s0, dtype=float)
        eq = capacity * kon * conc / rate if conc > 0 else 0.0
        decay = np.exp(-rate * dt)
        return s0 * decay + eq * (-np.expm1(-rate * dt))

    if analytic:
        if model in {"langmuir", "heterogeneous"}:
            pop1 = np.zeros_like(t, dtype=float)
            s1 = 0.0
            pop2 = np.zeros_like(t, dtype=float)
            s2 = 0.0
            for idx, (t_start, t_end, conc, _) in enumerate(intervals):
                is_last = idx == len(intervals) - 1
                mask = (t >= t_start) & (t <= t_end if is_last else t < t_end)
                if mask.any():
                    pop1[mask] = _advance_1d(s1, t[mask] - t_start, p["kon"], p["koff"], p["Rmax"], conc)
                s1 = float(_advance_1d(s1, np.array([t_end - t_start]), p["kon"], p["koff"], p["Rmax"], conc)[0])
                if model == "heterogeneous":
                    if mask.any():
                        pop2[mask] = _advance_1d(s2, t[mask] - t_start, p["kon2"], p["koff2"], p["Rmax2"], conc)
                    s2 = float(_advance_1d(s2, np.array([t_end - t_start]), p["kon2"], p["koff2"], p["Rmax2"], conc)[0])
            component["population_1"] = pop1.copy()
            target = pop1.copy()
            if model == "heterogeneous":
                component["population_2"] = pop2.copy()
                target = target + pop2
        else:
            states = np.zeros((2, len(t)), dtype=float)
            s_vec = np.zeros(2, dtype=float)
            for idx, (t_start, t_end, conc, _) in enumerate(intervals):
                is_last = idx == len(intervals) - 1
                mask = (t >= t_start) & (t <= t_end if is_last else t < t_end)
                a = p["kon"] * conc
                if model == "two_state":
                    matrix = np.array([[-a - p["koff"] - p["k_forward"], -a + p["k_reverse"]],
                                       [p["k_forward"], -p["k_reverse"]]], dtype=float)
                else:
                    b = p["kon2"] * conc
                    matrix = np.array([[-a - p["koff"] - b, p["koff2"] - a],
                                       [b, -p["koff2"]]], dtype=float)
                if conc > 0:
                    eq = np.linalg.solve(matrix, np.array([-a * p["Rmax"], 0.0], dtype=float))
                    if mask.any():
                        states[:, mask] = eq[:, None] + _linear_state(matrix, s_vec - eq, t[mask] - t_start)
                    s_vec = eq + _linear_state(matrix, s_vec - eq, np.array([t_end - t_start]))[:, 0]
                else:
                    if mask.any():
                        states[:, mask] = _linear_state(matrix, s_vec, t[mask] - t_start)
                    s_vec = _linear_state(matrix, s_vec, np.array([t_end - t_start]))[:, 0]
            if model == "sequential":
                component["state_1_response"], component["state_2_response"] = states[0].copy(), (2.0 * states[1]).copy()
                target = states[0] + 2.0 * states[1]
            else:
                component["specific"] = (states[0] + states[1]).copy()
                target = states[0] + states[1]
        if nonspecific:
            ns_trace = np.zeros_like(t, dtype=float)
            s_ns = 0.0
            for idx, (t_start, t_end, conc, _) in enumerate(intervals):
                is_last = idx == len(intervals) - 1
                mask = (t >= t_start) & (t <= t_end if is_last else t < t_end)
                if mask.any():
                    ns_trace[mask] = _advance_1d(s_ns, t[mask] - t_start, p["ns_kon"], p["ns_koff"], p["ns_Rmax"], conc)
                s_ns = float(_advance_1d(s_ns, np.array([t_end - t_start]), p["ns_kon"], p["ns_koff"], p["ns_Rmax"], conc)[0])
            component["nonspecific"] = ns_trace
            target = target + ns_trace
    else:
        main_count = 1 if model == "langmuir" else 2
        binding_count = main_count + int(nonspecific)
        full_transport = transport == "Two-compartment transport"
        n_state = binding_count + int(full_transport)
        response_weights = np.ones(binding_count)
        if model == "sequential":
            response_weights[1] = 2.0
        concentration_scale = max(max(s["concentration_M"] for s in normalized_steps), 1e-9)

        def ode(_time, state, bulk_concentration):
            surface = state[-1] * concentration_scale if full_transport else bulk_concentration
            rates = _binding_rhs(state[:main_count], surface, p, model)
            if transport == "Quasi-steady 1:1 transport":
                rates /= 1 + p["kon"] * max(p["Rmax"] - state[0], 0.0) / p["k_transport"]
            if nonspecific:
                ns = p["ns_kon"] * surface * (p["ns_Rmax"] - state[main_count]) - p["ns_koff"] * state[main_count]
                rates = np.r_[rates, ns]
            if full_transport:
                consumption = float(response_weights @ rates)
                transport_rate = p["k_exchange"] * (bulk_concentration / concentration_scale - state[-1])
                rates = np.r_[rates, transport_rate - p["response_to_M"] / concentration_scale * consumption]
            return rates

        def jacobian(_time, state, bulk_concentration):
            surface = state[-1] * concentration_scale if full_transport else bulk_concentration
            state_jac, dc = _binding_derivatives(state[:main_count], surface, p, model)
            if transport == "Quasi-steady 1:1 transport":
                free = max(p["Rmax"] - state[0], 0.0)
                denominator = 1 + p["kon"] * free / p["k_transport"]
                slope = -p["kon"] / p["k_transport"] if free > 0 else 0.0
                state_jac = state_jac / denominator - _binding_rhs(state, surface, p, model)[:, None] * slope / denominator**2
                dc /= denominator
            matrix = np.zeros((n_state, n_state))
            matrix[:main_count, :main_count] = state_jac
            if nonspecific:
                matrix[main_count, main_count] = -p["ns_kon"] * surface - p["ns_koff"]
                dc = np.r_[dc, p["ns_kon"] * (p["ns_Rmax"] - state[main_count])]
            if full_transport:
                matrix[:binding_count, -1] = dc * concentration_scale
                matrix[-1, :binding_count] = -p["response_to_M"] / concentration_scale * (response_weights @ matrix[:binding_count, :binding_count])
                matrix[-1, -1] = -p["k_exchange"] - p["response_to_M"] * (response_weights @ dc)
            return matrix

        states = np.zeros((n_state, len(t)), dtype=float)
        if t.size and t.max() > first_on:
            capacity_scale = max(p["Rmax"], p.get("Rmax2", 0.0), p.get("ns_Rmax", 0.0), 1e-6)
            atol = np.r_[np.full(binding_count, capacity_scale * 1e-10), 1e-10] if full_transport else capacity_scale * 1e-10
            state_vec = np.zeros(n_state, dtype=float)
            for idx, (t_start, t_end, conc, _) in enumerate(intervals):
                if t_end <= t_start:
                    continue
                sol = solve_ivp(lambda ti, s, c=conc: ode(ti, s, c), (t_start, t_end), state_vec,
                                method=integration_method, jac=lambda ti, s, c=conc: jacobian(ti, s, c),
                                dense_output=True, rtol=2e-8, atol=atol)
                if not sol.success:
                    raise RuntimeError("Single-cycle state integration did not converge.")
                is_last = idx == len(intervals) - 1
                mask = (t >= t_start) & (t <= t_end if is_last else t < t_end)
                if mask.any():
                    states[:, mask] = sol.sol(t[mask])
                state_vec = sol.sol(t_end)
        component["state_1_response"] = states[0]
        if main_count == 2:
            component["state_2_response"] = states[1] * response_weights[1]
        if nonspecific:
            component["nonspecific"] = states[main_count]
        if full_transport:
            component["surface_concentration_M"] = states[-1] * concentration_scale
        target = response_weights @ states[:binding_count]

    bulk_profile = np.zeros_like(t, dtype=float)
    exposure_integral = np.zeros_like(t, dtype=float)
    running_exposure = 0.0
    for step in normalized_steps:
        active = (t >= step["on"]) & (t < step["off"])
        bulk_profile[active] = step["concentration_M"]
        step_exposure = step["concentration_M"] * np.clip(t - step["on"], 0.0, step["off"] - step["on"])
        exposure_integral += step_exposure
        running_exposure += step["concentration_M"] * (step["off"] - step["on"])
    observation_terms = {
        "offset": ("constant_offset", np.full_like(t, p.get("offset", 0.0))),
        "drift": ("linear_drift", p.get("drift", 0.0) * (t - first_on)),
        "bulk": ("injection_bulk_response", p.get("bulk", 0.0) * bulk_profile),
        "ns_linear": ("nonspecific_linear", p.get("ns_linear", 0.0) * exposure_integral),
    }
    result = target.copy()
    for key, (name, values) in observation_terms.items():
        if key in p:
            component[name] = values
            result = result + values
    if not np.isfinite(result).all():
        raise FloatingPointError("Nonfinite single-cycle model prediction.")
    return (result, component) if return_components else result


def fit_single_cycle_kinetics(traces, model="langmuir", rules=None, transport="None", nonspecific=False,
                              starts=4, max_nfev=800, runtime_s=90., correlation_time=0., loss="linear",
                              f_scale=1., seed=1729, forced_values=None, instance_controls=None,
                              start_strategy="local"):
    """Fit one or more Single-Cycle Kinetics (SCK) sensorgrams globally without inter-step regeneration."""
    if not traces:
        raise ValueError("Supply at least one single-cycle trace.")
    response_scale = max(
        (float(np.nanmax(np.abs(np.asarray(tr["response"], dtype=float)))) for tr in traces if len(tr.get("response", []))),
        default=100.0,
    )
    if rules is None:
        rules = parameter_defaults(model, response_scale=max(response_scale, 1.0), transport=transport, nonspecific=nonspecific)
    enabled = {r.key for r in rules}
    expected = parameter_defaults(
        model,
        response_scale=max(response_scale, 1.0),
        transport=transport,
        nonspecific=nonspecific,
        offset="offset" in enabled,
        drift="drift" in enabled,
        bulk="bulk" in enabled,
        linear_nonspecific="ns_linear" in enabled,
    )
    validate_parameters(rules, expected)
    prepared_curves = []
    for idx, tr in enumerate(traces):
        t = np.asarray(tr["time"], dtype=float)
        y = np.asarray(tr["response"], dtype=float)
        if t.ndim != 1 or y.ndim != 1 or len(t) != len(y) or len(t) < 8:
            raise ValueError("Each single-cycle trace needs matching 1D time and response arrays with at least 8 points.")
        if np.any(np.diff(t) <= 0) or not np.isfinite(t).all() or not np.isfinite(y).all():
            raise ValueError("Single-cycle times must be finite and strictly increasing.")
        steps_norm, _ = _step_schedule(tr["steps"], float(t.max()))
        mask = np.asarray(tr.get("fit_mask", t >= steps_norm[0]["on"]), dtype=bool)
        if len(mask) != len(t) or int(np.count_nonzero(mask)) < 8:
            raise ValueError("Each single-cycle trace needs at least 8 selected fit observations.")
        max_conc_M = max(s["concentration_M"] for s in steps_norm)
        filename = str(tr.get("filename", f"single_cycle_{idx + 1}.csv"))
        repeat_id = str(tr.get("repeat_id", filename))
        prepared_curves.append(
            dict(
                filename=filename,
                repeat_id=repeat_id,
                surface_id=str(tr.get("surface_id", filename)),
                concentration_nM=float(max_conc_M * 1e9),
                concentration_M=float(max_conc_M),
                time=t,
                response=y,
                fit_mask=mask,
                on=float(steps_norm[0]["on"]),
                off=float(steps_norm[-1]["off"]),
                steps=steps_norm,
                relative_sd=float(tr.get("relative_sd", 1.0)),
            )
        )
    instances, curve_keys = {}, []
    forced_values = forced_values or {}
    for curve in prepared_curves:
        keys = {}
        for rule in rules:
            key = f"{rule.key}::{_group(rule, curve)}"
            keys[rule.key] = key
            instances[key] = rule
        curve_keys.append(keys)
    for key, controls in (instance_controls or {}).items():
        if key not in instances or set(controls) - {"initial", "lower", "upper", "fixed"}:
            raise ValueError("Unknown parameter instance or override field.")
        original = instances[key]
        changed = replace(original, **controls)
        validate_parameters([changed], [original])
        instances[key] = changed
    free = [key for key, rule in instances.items() if not rule.fixed and key not in forced_values]
    n_observations = sum(int(np.count_nonzero(c["fit_mask"])) for c in prepared_curves)
    if n_observations <= len(free):
        raise ValueError("Not enough selected observations for the number of free parameters.")
    center, lower, upper, signed_scale = [], [], [], {}
    for key in free:
        rule = instances[key]
        scale = max(abs(rule.lower), abs(rule.upper), 1e-12) if not rule.positive else 1.0
        signed_scale[key] = scale
        encode = np.log if rule.positive else (lambda value, s=scale: value / s)
        center.append(encode(rule.initial))
        lower.append(encode(rule.lower))
        upper.append(encode(rule.upper))
    center, lower, upper = np.array(center, dtype=float), np.array(lower, dtype=float), np.array(upper, dtype=float)

    def decode(z):
        values = {key: forced_values.get(key, rule.initial) for key, rule in instances.items()}
        values.update({
            key: float(np.exp(value)) if instances[key].positive else float(value * signed_scale[key])
            for key, value in zip(free, z)
        })
        return values

    deadline = time.perf_counter() + runtime_s

    def residual_fn(z):
        if time.perf_counter() > deadline:
            raise TimeoutError("Single-cycle fit runtime limit reached.")
        values, residuals = decode(z), []
        for curve, keys in zip(prepared_curves, curve_keys):
            mask = curve["fit_mask"]
            p = {key: values[instance] for key, instance in keys.items()}
            pred = single_cycle_prediction(curve["time"][mask], curve["steps"], p, model=model, transport=transport, nonspecific=nonspecific)
            residual, _ = _whiten(curve["response"][mask] - pred, curve["time"][mask], correlation_time)
            residuals.append(residual / curve.get("relative_sd", 1.0))
        return np.concatenate(residuals)

    rng, candidates, history = np.random.default_rng(seed), [], []
    timed_out = False
    if not free:
        residual = residual_fn(np.array([]))
        best = None
        solution = np.array([])
        history.append(dict(start=1, converged=True, rss=float(residual @ residual), message="All parameters fixed"))
    else:
        for index in range(int(starts)):
            if index == 0:
                z0 = center.copy()
            elif start_strategy == "broad":
                span = np.array([np.log(100.0) if instances[key].positive else 0.25 * (hi - lo)
                                 for key, lo, hi in zip(free, lower, upper)])
                z0 = rng.uniform(np.maximum(lower, center - span), np.minimum(upper, center + span))
            else:
                z0 = np.clip(center + rng.normal(0.0, 0.8, len(free)), lower + 1e-9, upper - 1e-9)
            try:
                opt = least_squares(
                    residual_fn, z0, bounds=(lower, upper), method="trf", jac="3-point",
                    diff_step=1e-4, x_scale="jac", loss=loss, f_scale=f_scale, max_nfev=max_nfev,
                )
                history.append(dict(start=index + 1, converged=bool(opt.success), rss=float(opt.fun @ opt.fun),
                                    objective=float(2 * opt.cost), message=opt.message))
                if opt.success and np.isfinite(opt.fun).all():
                    candidates.append(opt)
            except TimeoutError:
                timed_out = True
                break
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                history.append(dict(start=index + 1, converged=False, message=str(exc)))
        if not candidates:
            raise RuntimeError("No single-cycle multistart fit converged within the declared limits.")
        best = min(candidates, key=lambda fit: fit.cost)
        solution, residual = best.x, best.fun
    values = decode(solution)
    bounds = boundary_flags(solution, lower, upper, free) if free else []
    if best is not None:
        bounds = sorted(set(bounds) | {key for key, active in zip(free, best.active_mask) if active})
    info = conditional_covariance(best.jac, residual) if best is not None else dict(
        covariance=None, degrees_of_freedom=n_observations, covariance_status="All parameters fixed",
        jacobian_rank=0, scaled_jacobian_condition=np.nan,
    )
    covariance = info.pop("covariance")
    if bounds or loss != "linear":
        covariance = None
        info["covariance_status"] = "Unavailable: active bound or robust sensitivity objective"
    physical_covariance = None
    if covariance is not None:
        transform = np.array([values[key] if instances[key].positive else signed_scale[key] for key in free])
        physical_covariance = covariance * np.outer(transform, transform)
    positions = {key: i for i, key in enumerate(free)}
    table = []
    for key, rule in instances.items():
        idx = positions.get(key)
        se = float(np.sqrt(max(physical_covariance[idx, idx], 0.0))) if physical_covariance is not None and idx is not None else np.nan
        table.append(dict(
            instance=key, parameter=rule.key, scope=rule.scope, group=key.split("::", 1)[1], value=values[key],
            model_se=se, conditional_on_baseline_se=se, fixed=rule.fixed or key in forced_values, unit=rule.unit,
            at_bound=key in bounds, **local_precision(values[key], se, rule.fixed or key in forced_values),
        ))
    fitted_curves, noise_logdet = [], 0.0
    for curve, keys in zip(prepared_curves, curve_keys):
        p = {key: values[instance] for key, instance in keys.items()}
        prediction, components = single_cycle_prediction(
            curve["time"], curve["steps"], p, model=model, transport=transport, nonspecific=nonspecific, return_components=True,
        )
        raw = curve["response"] - prediction
        mask = curve["fit_mask"]
        whitened, determinant = _whiten(raw[mask], curve["time"][mask], correlation_time)
        whitened /= curve.get("relative_sd", 1.0)
        noise_logdet += determinant + 2 * len(whitened) * np.log(curve.get("relative_sd", 1.0))
        fitted_curves.append({
            **curve, "fitted": prediction, "residuals": raw, "components": components,
            "whitened_residuals": whitened, "parameters": p,
            "residual_dependence": residual_dependence(raw, mask, np.ptp(curve["response"][mask])),
        })
    information = gaussian_information(residual, len(free))
    for key in ["aic", "aicc", "bic"]:
        information[key] += noise_logdet
    information["log_likelihood"] -= 0.5 * noise_logdet
    warnings = [
        "Single-Cycle Kinetics (SCK) carries surface occupancy continuously across sequential injections without regeneration (Karlsson et al., 2006).",
        "Errors remain local to the selected model, step schedule and fixed noise/calibration assumptions.",
    ]
    if model != "langmuir":
        warnings.append(MODEL_NOTES[model])
    if bounds:
        warnings.append("At least one free parameter reached a declared bound. Two-sided model errors are withheld.")
    weak = [row["instance"] for row in table if not row["fixed"] and instances[row["instance"]].positive
            and row["local_precision_status"] != "Locally resolved"]
    if weak:
        warnings.append("Unresolved local precision for " + ", ".join(weak) + ".")
    return dict(
        single_cycle=True,
        model=model,
        transport=transport,
        nonspecific=nonspecific,
        parameter_controls=[asdict(r) for r in rules],
        background_terms=dict(
            linear_drift="drift" in enabled, linear_nonspecific="ns_linear" in enabled,
            reversible_nonspecific=bool(nonspecific), constant_offset="offset" in enabled,
            injection_bulk_response="bulk" in enabled,
        ),
        instance_controls={key: {name: getattr(rule, name) for name in ["initial", "lower", "upper", "fixed"]}
                           for key, rule in instances.items()},
        parameter_table=pd.DataFrame(table),
        curves=fitted_curves,
        values=values,
        free_parameters=free,
        covariance=physical_covariance,
        conditional_on_baseline_covariance=physical_covariance,
        baseline_uncertainty=dict(applied=False),
        input_uncertainty=dict(applied=False),
        precision_screen=dict(
            relative_se_limit=LOCAL_PRECISION_LIMIT,
            unresolved_instances=weak,
            interpretation="Declared local precision screen for single-cycle kinetic parameters.",
        ),
        n_observations=n_observations,
        n_parameters=len(free),
        rss=float(residual @ residual),
        information_criteria=information,
        boundary_parameters=bounds,
        multistart=pd.DataFrame(history),
        timed_out=timed_out,
        correlation_time=float(correlation_time),
        loss=loss,
        noise_model="Fixed-time OU GLS" if correlation_time > 0 else "IID least squares",
        optimizer_settings=dict(
            starts=int(starts), max_nfev=int(max_nfev), runtime_s=float(runtime_s), seed=int(seed),
            loss=loss, f_scale=float(f_scale), start_strategy=start_strategy,
        ),
        uncertainty_method=CONDITIONAL_ERROR if correlation_time == 0 else GLS_ERROR,
        scientific_warnings=warnings,
        **info,
    )


def mechanistic_to_kinetic_summary(result):
    """Bridge a manual mechanistic or assisted fit result into a standard kinetic summary dictionary."""
    if result is None or "parameter_table" not in result or "curves" not in result:
        return None
    ptab = result["parameter_table"]
    model = result.get("model", "langmuir")
    transport = result.get("transport", "None")
    affinities = derived_affinities(result)

    def _param_summary(param_name):
        rows = ptab.loc[ptab["parameter"] == param_name]
        if rows.empty:
            return np.nan, np.nan
        val = float(rows["value"].mean())
        if len(rows) == 1:
            se = float(rows["model_se"].iloc[0]) if np.isfinite(rows["model_se"].iloc[0]) else np.nan
        else:
            vals = rows["value"].to_numpy(dtype=float)
            se = float(np.std(vals, ddof=1) / np.sqrt(len(vals))) if len(vals) > 1 else np.nan
        return val, se

    kon, kon_se = _param_summary("kon")
    koff, koff_se = _param_summary("koff")
    primary_metric = {
        "langmuir": "KD_nM",
        "two_state": "KD_overall_nM",
        "heterogeneous": "KD_population_1_nM",
        "sequential": "KD_step_1_nM",
        "bivalent": "KD_per_arm_first_step_nM",
    }.get(model, "KD_nM")
    kd_M, kd_se_M = np.nan, np.nan
    affinity_interp = MODEL_NOTES.get(model, "")
    if not affinities.empty and primary_metric in set(affinities["metric"]):
        sub = affinities.loc[affinities["metric"] == primary_metric]
        kd_nM = float(sub["value"].mean())
        kd_se_nM = float(sub["model_se"].iloc[0]) if len(sub["model_se"].dropna()) else np.nan
        kd_M = kd_nM * 1e-9
        kd_se_M = kd_se_nM * 1e-9 if np.isfinite(kd_se_nM) else np.nan
        affinity_interp = str(sub["interpretation"].iloc[0])
    elif np.isfinite(kon) and kon > 0 and np.isfinite(koff) and koff >= 0:
        kd_M = koff / kon

    individual_fits = []
    curve_observations = {}
    r2_values, rmse_values, autocorr_values = [], [], []
    flagged_serial = 0
    for idx, c in enumerate(result["curves"]):
        mask = np.asarray(c["fit_mask"], dtype=bool)
        obs = np.asarray(c["response"], dtype=float)
        pred = np.asarray(c["fitted"], dtype=float)
        res = np.asarray(c["residuals"], dtype=float)
        obs_m = obs[mask]
        res_m = res[mask]
        ss_res = float(np.sum(res_m ** 2))
        ss_tot = float(np.sum((obs_m - np.mean(obs_m)) ** 2))
        r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else np.nan
        rmse = float(np.sqrt(np.mean(res_m ** 2))) if len(res_m) else np.nan
        dep = c.get("residual_dependence", {})
        ac1 = float(dep.get("lag1_autocorrelation", np.nan))
        serial_flag = bool(dep.get("serial_correlation_flag", False))
        if np.isfinite(r2):
            r2_values.append(r2)
        if np.isfinite(rmse):
            rmse_values.append(rmse)
        if np.isfinite(ac1):
            autocorr_values.append(ac1)
        if serial_flag:
            flagged_serial += 1
        p = c.get("parameters", {})
        c_kon = float(p.get("kon", kon))
        c_koff = float(p.get("koff", koff))
        c_kd = c_koff / c_kon if c_kon > 0 else np.nan
        c_rmax = float(p.get("Rmax", np.nan))
        conc_nM = float(c.get("concentration_nM", 0.0))
        fname = str(c.get("filename", f"curve_{idx + 1}"))
        rep_id = str(c.get("repeat_id", fname))
        ic = result.get("information_criteria", {})
        individual_fits.append(dict(
            concentration=conc_nM,
            filename=fname,
            repeat_id=rep_id,
            repeat_group=rep_id,
            model=model,
            kon=c_kon,
            koff=c_koff,
            KD=c_kd,
            Rmax=c_rmax,
            r_squared=r2,
            rmse=rmse,
            aic=float(ic.get("aic", np.nan)),
            aicc=float(ic.get("aicc", np.nan)),
            bic=float(ic.get("bic", np.nan)),
            residual_autocorr=ac1,
            serial_correlation_flag=serial_flag,
            boundary_parameters=list(result.get("boundary_parameters", [])),
            fitted=pred,
            fitted_fitspace=pred,
            residuals=res,
            residuals_fit=res[mask],
            response_plot=obs,
            fit_mask=mask,
        ))
        obs_key = f"{fname}::{conc_nM:.6g}::{idx}" if result.get("single_cycle") else f"{fname}::{conc_nM:.6g}"
        curve_observations[obs_key] = dict(
            concentration=conc_nM,
            filename=fname,
            repeat_id=rep_id,
            time=np.asarray(c["time"], dtype=float),
            observed=obs,
            fitted=pred,
            residuals=res,
            fit_mask=mask,
        )

    unresolved = result.get("precision_screen", {}).get("unresolved_instances", [])
    bounds = list(result.get("boundary_parameters", []))
    identifiable = bool(result.get("covariance") is not None and not bounds and not unresolved)
    summary_eligible = bool(identifiable and result.get("loss", "linear") == "linear" and not result.get("timed_out", False))
    first_curve = result["curves"][0] if result["curves"] else {}
    t_arr = np.asarray(first_curve.get("time", [0.0, 1.0]), dtype=float)
    on_t = float(first_curve.get("on", t_arr[0]))
    off_t = float(first_curve.get("off", t_arr[-1]))
    recipe_windows = result.get("recipe", {}).get("windows", {})
    shared_label = f"{MODEL_LABELS.get(model, model)}" + (f" + {transport}" if transport != "None" else "")
    if result.get("single_cycle"):
        shared_label += " (Single-Cycle Kinetics)"
    return dict(
        global_kon=kon,
        kon_sem=kon_se,
        global_koff=koff,
        koff_sem=koff_se,
        global_KD=kd_M,
        KD_sem=kd_se_M,
        n_fits=len(result["curves"]),
        fit_strategy="shared_kinetics",
        shared_model=shared_label,
        model=model,
        transport=transport,
        nonspecific=bool(result.get("nonspecific", False)),
        single_cycle=bool(result.get("single_cycle", False)),
        affinity_metric=primary_metric,
        affinity_interpretation=affinity_interp,
        uncertainty_method=result.get("uncertainty_method", CONDITIONAL_ERROR),
        scientific_warnings=list(result.get("scientific_warnings", [])),
        boundary_parameters=bounds,
        identifiable=identifiable,
        summary_eligible=summary_eligible,
        individual_fits=individual_fits,
        curve_observations=curve_observations,
        curves=result["curves"],
        parameter_table=result["parameter_table"],
        information_criteria=result.get("information_criteria", {}),
        diagnostic_summary=dict(
            mean_r2=float(np.mean(r2_values)) if r2_values else np.nan,
            mean_rmse=float(np.mean(rmse_values)) if rmse_values else np.nan,
            mean_autocorr=float(np.mean(autocorr_values)) if autocorr_values else np.nan,
            flagged_serial_correlation=int(flagged_serial),
        ),
        fit_settings=dict(
            assoc_start=on_t,
            assoc_end=off_t,
            dissoc_start=off_t,
            dissoc_end=float(t_arr[-1]),
            phase_assoc_start_s=float(recipe_windows.get("phase_assoc_start_s", on_t)),
            phase_assoc_end_s=float(recipe_windows.get("phase_assoc_end_s", off_t)),
            phase_dissoc_start_s=float(recipe_windows.get("phase_dissoc_start_s", off_t)),
            phase_dissoc_end_s=float(recipe_windows.get("phase_dissoc_end_s", float(t_arr[-1]))),
            fit_assoc_start_s=float(recipe_windows.get("fit_assoc_start_s", on_t)),
            fit_assoc_end_s=float(recipe_windows.get("fit_assoc_end_s", off_t)),
            fit_dissoc_start_s=float(recipe_windows.get("fit_dissoc_start_s", off_t)),
            fit_dissoc_end_s=float(recipe_windows.get("fit_dissoc_end_s", float(t_arr[-1]))),
            normalize_baseline=bool(result.get("recipe", {}).get("normalize", True)),
            run_timestamp_utc=str(result.get("created_utc", "")),
            include_map=result.get("recipe", {}).get("include_map", {}),
        ),
        recipe=result.get("recipe", {}),
        repeat_report=result.get("repeat_report"),
        mechanistic_source=result,
    )

