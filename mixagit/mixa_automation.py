"""Bounded, simplest-first global fitting. Decisions are conservative diagnostics."""

from dataclasses import asdict, dataclass, replace
from hashlib import sha256
from itertools import combinations
import json
import time

import numpy as np
import pandas as pd

from mixa_mechanisms import (GLS_ERROR, MODEL_LABELS, fit_mechanism, parameter_defaults,
                             expand_parameter_controls, profile_parameter)
from mixa_science import CONDITIONAL_ERROR, json_safe, residual_dependence
from mixa_input_uncertainty import INPUT_ERROR


@dataclass(frozen=True)
class FitPolicy:
    runtime_s: float = 180.
    max_candidates: int = 10
    starts: int = 3
    max_nfev: int = 1000
    capacity_scope: str = "Per file"
    rate_scope: str = "Global"
    correlation_time: float = 0.
    noise_ratio_limit: float = 1.5
    relative_se_limit: float = 1.
    aicc_tolerance: float = 2.
    compare_all: bool = False

    def validate(self):
        if not isinstance(self.compare_all, bool):
            raise ValueError("The candidate-comparison switch must be Boolean.")
        numeric = [self.runtime_s, self.starts, self.max_candidates, self.max_nfev, self.correlation_time,
                   self.noise_ratio_limit, self.relative_se_limit, self.aicc_tolerance]
        if not np.isfinite(numeric).all() or self.runtime_s <= 0 or self.starts < 2 or self.max_nfev < 20 or not 1 <= self.max_candidates <= 16:
            raise ValueError("Use at least two starts and a positive bounded runtime/candidate budget.")
        if any(value != int(value) for value in [self.starts, self.max_candidates, self.max_nfev]):
            raise ValueError("Starts, candidate budget and evaluation limits must be integers.")
        if self.capacity_scope not in {"Per file", "Per curve", "Per surface"} or self.rate_scope not in {"Global", "Per repeat"} or self.correlation_time < 0 or min(self.noise_ratio_limit, self.relative_se_limit) <= 0 or self.aicc_tolerance < 0:
            raise ValueError("Invalid linkage, noise or qualification policy.")


@dataclass(frozen=True)
class Candidate:
    model: str = "langmuir"
    transport: str = "None"
    terms: tuple = ()

    @property
    def label(self):
        parts = [MODEL_LABELS[self.model]]
        if self.transport != "None":
            parts.append(self.transport)
        parts.extend({"drift": "linear drift", "linear_nonspecific": "linear nonspecific response", "offset": "offset", "bulk": "bulk step",
                      "nonspecific": "control-constrained background"}[term] for term in self.terms)
        return " + ".join(parts)


def baseline_evidence(data_list, include_map, on):
    """Estimate stationary baseline SD after detrending; do not infer binding mechanism."""
    records = []
    for data in data_list:
        t = np.asarray(data["time"], float)
        mask = t < on
        for concentration in data["concentrations"]:
            if concentration <= 0 or concentration not in include_map.get(data["filename"], set()):
                continue
            row = dict(filename=data["filename"], concentration_nM=concentration, n_baseline=int(mask.sum()),
                       noise_sd=np.nan, slope=np.nan, drift_supported=False)
            if mask.sum() >= 8 and np.ptp(t[mask]) > 0:
                x = t[mask] - t[mask].mean()
                y = np.asarray(data["responses"][concentration], float)[mask]
                slope = float(x @ (y - y.mean()) / (x @ x))
                r = y - y.mean() - slope * x
                sd = float(np.sqrt(r @ r / (len(r) - 2)))
                resolved = sd > max(np.ptp(y), 1.) * 1e-12
                row.update(noise_sd=sd if resolved else np.nan, slope=slope,
                           drift_supported=bool(resolved and abs(slope) * np.ptp(x) > 3 * sd))
            records.append(row)
    return pd.DataFrame(records)


def input_fingerprint(curves):
    digest = sha256()
    for curve in curves:
        metadata = {key: curve.get(key) for key in ["filename", "repeat_id", "surface_id", "concentration_M", "on", "off", "relative_sd", "noise_sd", "baseline_estimated", "input_uncertainty_options", "response_sign", "measurement_sources"]}
        digest.update(json.dumps(json_safe(metadata), sort_keys=True).encode())
        for key in ["time", "response", "fit_mask"]:
            values = np.asarray(curve[key], dtype=np.uint8 if key == "fit_mask" else "<f8")
            digest.update(str(values.shape).encode())
            digest.update(values.tobytes())
        if curve.get("baseline_estimated", False):
            digest.update(np.asarray(curve.get("baseline_mask", np.asarray(curve["time"]) < curve["on"]), dtype=np.uint8).tobytes())
            digest.update(np.asarray(curve.get("baseline_reference_times", np.asarray(curve["time"])[np.asarray(curve["time"]) < curve["on"]]), dtype="<f8").tobytes())
    return digest.hexdigest()


def analysis_signature(curves, policy, evidence, assay):
    payload = dict(data=input_fingerprint(curves), config=dict(policy=asdict(policy), evidence=evidence, assay=assay))
    return sha256(json.dumps(json_safe(payload), sort_keys=True).encode()).hexdigest()


def candidate_plan(evidence, assay, policy, curves=None):
    """Only user-permitted, evidence-supported additions enter the finite search."""
    policy.validate()
    terms, blocked = [], []
    for term in ["drift", "offset", "bulk"]:
        if evidence.get("allow_" + term):
            if evidence.get(term + "_supported") or (term == "drift" and evidence.get("explore_empirical_corrections")):
                terms.append(term)
            else:
                blocked.append(f"{term}: no baseline/control support was declared")
    if evidence.get("allow_linear_nonspecific"):
        terms.append("linear_nonspecific")
    background = evidence.get("background_parameters")
    if evidence.get("allow_nonspecific"):
        if background and all(np.isfinite(background.get(key, np.nan)) and background[key] > 0 for key in ["ns_kon", "ns_koff", "ns_Rmax"]):
            terms.append("nonspecific")
        else:
            blocked.append("Reversible background requires independently supplied positive fixed rates and capacity")
    combinations_ = [tuple(group) for size in range(min(len(terms), 2) + 1) for group in combinations(terms, size)]
    plan = [Candidate(terms=group) for group in combinations_]
    for model in evidence.get("allowed_models", []):
        if model not in MODEL_LABELS or model == "langmuir":
            raise ValueError("Unknown assisted-model alternative.")
        if not evidence.get("mechanism_supported") or not str(evidence.get("mechanism_reason", "")).strip():
            blocked.append(MODEL_LABELS[model] + ": independent assay justification is required")
            continue
        if model == "bivalent" and assay.get("analyte_valency") != "Bivalent":
            blocked.append("Bivalent model requires a bivalent soluble analyte, not just a bivalent immobilized antibody")
            continue
        plan.extend(Candidate(model=model, terms=group) for group in combinations_)
    if evidence.get("allow_transport"):
        if evidence.get("transport_supported"):
            plan.extend(Candidate(transport="Quasi-steady 1:1 transport", terms=group)
                        for group in combinations_ if "nonspecific" not in group)
        else:
            blocked.append("Transport requires independent density/flow/shaking evidence")
    # Test fewer free terms/mechanistic rates first, without an unbounded grid.
    def complexity(candidate):
        rules = candidate_rules(candidate, [], policy, evidence, response_scale=100.)
        if curves:
            return int((~expand_parameter_controls(curves, rules).fixed).sum())
        return sum(not rule.fixed for rule in rules)
    plan.sort(key=complexity)
    if len(plan) > policy.max_candidates:
        blocked.append(f"Candidate budget limits this search to {policy.max_candidates} of {len(plan)} permitted candidates")
    return plan[:policy.max_candidates], blocked


def candidate_rules(candidate, curves, policy, evidence, response_scale=None):
    if response_scale is None:
        response_scale = max(float(np.ptp(np.concatenate([c["response"][c["fit_mask"]] for c in curves]))), 1e-3)
    rules = parameter_defaults(candidate.model, response_scale, candidate.transport,
                               "nonspecific" in candidate.terms, "offset" in candidate.terms,
                               "drift" in candidate.terms, "bulk" in candidate.terms,
                               linear_nonspecific="linear_nonspecific" in candidate.terms)
    if curves and "linear_nonspecific" in candidate.terms:
        scale = response_scale/max(max(c["concentration_M"] for c in curves)*max(c["off"]-c["on"] for c in curves), 1e-18)
        rules = [replace(rule, lower=-4*scale, upper=4*scale) if rule.key == "ns_linear" else rule for rule in rules]
    background = evidence.get("background_parameters", {})
    updated = []
    for rule in rules:
        if rule.key in {"Rmax", "Rmax2", "ns_Rmax"}:
            rule = replace(rule, scope=policy.capacity_scope)
        elif rule.key in {"kon", "koff", "kon2", "koff2", "k_forward", "k_reverse", "k_transport"}:
            rule = replace(rule, scope=policy.rate_scope)
        if rule.key in {"ns_kon", "ns_koff", "ns_Rmax"}:
            value = float(background[rule.key])
            rule = replace(rule, initial=value, lower=min(rule.lower, value / 10), upper=max(rule.upper, value * 10), fixed=True)
        updated.append(rule)
    return updated


def assess_fit(result, policy):
    """Transparent descriptive thresholds, not calibrated model probabilities."""
    failures, traces = [], []
    if result["boundary_parameters"]:
        failures.append("Parameters reached fitting bounds")
    if result["timed_out"]:
        failures.append("Multistart search did not finish within its budget")
    if result["covariance_status"] not in {CONDITIONAL_ERROR, GLS_ERROR, INPUT_ERROR}:
        failures.append("Unresolved parameter sensitivities")
    free = result["parameter_table"].loc[~result["parameter_table"].fixed]
    if free.empty or not np.isfinite(free.model_se).all() or np.any(free.model_se / free.value.abs().clip(lower=1e-300) > policy.relative_se_limit):
        # Near-zero signed nuisance terms may be unsupported, not unidentifiable rates.
        positive = free.loc[free.parameter.isin(["kon", "koff", "Rmax", "Rmax2", "kon2", "koff2", "k_forward", "k_reverse", "k_transport"])]
        if positive.empty or not np.isfinite(positive.model_se).all() or np.any(positive.model_se / positive.value > policy.relative_se_limit):
            failures.append("Rate/capacity uncertainty is unresolved or too broad")
    starts = result["multistart"]
    stable = starts.loc[starts.converged & np.isfinite(starts.rss)]
    if len(stable) < 2 or np.count_nonzero(stable.rss <= result["rss"] * (1 + 1e-5) + 1e-12) < 2:
        failures.append("Fewer than two starts reached the best objective")
    for curve in result["curves"]:
        mask = curve["fit_mask"]
        sigma = curve.get("noise_sd", np.nan)
        innovation = curve["whitened_residuals"] * curve.get("relative_sd", 1.)
        ratio = float(np.sqrt(np.mean(innovation**2)) / sigma) if np.isfinite(sigma) and sigma > 0 else np.nan
        full_innovation = np.full(len(mask), np.nan)
        full_innovation[mask] = innovation
        correlated, max_bias = False, 0.
        for phase in [curve["time"] < curve["off"], curve["time"] >= curve["off"]]:
            phase_mask = mask & phase
            if phase_mask.sum() >= 8:
                dep = residual_dependence(full_innovation, phase_mask, np.ptp(curve["response"][mask]))
                correlated |= dep["serial_correlation_flag"]
                if np.isfinite(sigma) and sigma > 0:
                    for block in np.array_split(np.flatnonzero(phase_mask), min(4, int(phase_mask.sum()) // 8)):
                        max_bias = max(max_bias, float(abs(np.mean(full_innovation[block])) / sigma))
        notes = []
        if not np.isfinite(ratio):
            notes.append("No independently supplied or usable pre-association noise scale")
        elif ratio > policy.noise_ratio_limit:
            notes.append("Residuals exceed the declared noise tolerance")
        if max_bias > policy.noise_ratio_limit:
            notes.append("Phase-local residual bias exceeds the declared tolerance")
        failures.extend(notes)
        traces.append(dict(filename=curve["filename"], concentration_nM=curve["concentration_nM"],
                           residual_to_noise=ratio, max_block_bias_to_noise=max_bias,
                           serial_correlation=correlated, issues="; ".join(notes)))
    serial_check = dict(available=False, reason="Other parameter or residual prerequisites failed")
    if not failures:
        from mixa_residual_tests import serial_null_check

        try:
            serial_check = serial_null_check(result)
            if serial_check["flag"]:
                failures.append("Structured/correlated objective residuals (joint Monte Carlo screen)")
        except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
            serial_check = dict(available=False, reason=str(exc))
            failures.append("Joint residual calibration unavailable")
    # One-concentration association cannot separate capacity, kon and koff.
    if len({c["concentration_M"] for c in result["curves"]}) == 1 and not any(np.any(c["fit_mask"] & (c["time"] > c["off"])) for c in result["curves"]):
        failures.append("Single-concentration association-only design does not identify intrinsic rates and unknown capacity")
    return dict(eligible=not failures, failures=sorted(set(failures)), traces=traces, serial_check=serial_check,
                interpretation="Prespecified descriptive adequacy gates, not a calibrated goodness-of-fit p-value.")


def profile_qualification(result, deadline):
    """Require nuisance-refitted exclusions on both sides of each free global rate."""
    checks = []
    rates = [key for key in result["free_parameters"] if key.split("::")[0] not in {"Rmax", "Rmax2", "offset", "drift", "bulk", "ns_Rmax", "ns_linear"}]
    for instance in rates:
        remaining = deadline - time.perf_counter()
        if remaining <= 0:
            checks.append(dict(instance=instance, resolved=False, reason="Profile budget exhausted"))
            break
        try:
            profile = profile_parameter(result, result["curves"], instance, points=5, decades=1., runtime_s=remaining)
            table = profile["table"]
            center = result["values"][instance]
            control = result["instance_controls"][instance]
            interior = (table.value > control["lower"] * (1 + 1e-5)) & (table.value < control["upper"] * (1 - 1e-5))
            complete = len(table) == profile["requested_points"] and table.rss.notna().all()
            outside = table.rss > profile["cutoff"]
            lower = bool((outside & interior & (table.value < center)).any())
            upper = bool((outside & interior & (table.value > center)).any())
            better = bool((table.rss < result["rss"] * (1 - 1e-5) - 1e-10).any())
            resolved = complete and lower and upper and not better
            checks.append(dict(instance=instance, resolved=bool(resolved), complete=bool(complete),
                               lower_excluded=lower, upper_excluded=upper, better_minimum_found=better,
                               table=table.to_dict("records"), cutoff=profile["cutoff"]))
        except (ValueError, RuntimeError) as exc:
            checks.append(dict(instance=instance, resolved=False, reason=str(exc)))
    return dict(eligible=bool(checks) and len(checks) == len(rates) and all(c["resolved"] for c in checks), checks=checks,
                interpretation="Finite exploratory profiles, not certified confidence limits or proof that all minima were found.")


def choose_candidate(attempts, policy):
    eligible = [(index, a) for index, a in enumerate(attempts) if a.get("assessment", {}).get("eligible") and np.isfinite(a.get("aicc", np.nan))]
    complete = [a for a in attempts if np.isfinite(a.get("aicc", np.nan)) and a.get("n_parameters") is not None]
    eligible = [(index, a) for index, a in eligible if not any(
        other["n_parameters"] < a["n_parameters"] and other["aicc"] - a["aicc"] <= policy.aicc_tolerance
        for other in complete)]
    if not eligible:
        return None
    if policy.compare_all:
        # Comparing more candidates must not override the simplest-adequate stopping rule.
        return min(eligible, key=lambda item: (item[1]["n_parameters"], item[1]["aicc"]))[0]
    best = min(a["aicc"] for _, a in eligible)
    supported = [(index, a) for index, a in eligible if a["aicc"] <= best + policy.aicc_tolerance]
    return min(supported, key=lambda item: (item[1]["n_parameters"], item[1]["aicc"]))[0]


def run_assisted_fit(curves, policy, evidence=None, assay=None, *, mode="guided", previous=None, phases_verified=True):
    policy.validate()
    if mode not in {"guided", "automatic"} or not curves:
        raise ValueError("Supply selected curves and a recognized assistance mode.")
    evidence, assay = evidence or {}, assay or {}
    plan, blocked = candidate_plan(evidence, assay, policy, curves)
    fingerprint = input_fingerprint(curves)
    config = dict(policy=asdict(policy), evidence=evidence, assay=assay)
    signature = analysis_signature(curves, policy, evidence, assay)
    if previous and previous["signature"] != signature:
        raise ValueError("Inputs or policy changed. Start a new assisted analysis; old attempts cannot be compared.")
    review = dict(signature=signature, data_sha256=fingerprint, config=config, candidates=[asdict(c) for c in plan],
                  blocked_candidates=blocked, attempts=list(previous["attempts"]) if previous else [],
                  recommended_index=None, display_index=None, status="Needs review", next_candidate=None)
    if not phases_verified:
        review.update(status="Phase review required", reason="Resolve ambiguous or inconsistent phase boundaries before assisted fitting.")
        return review
    deadline = time.perf_counter() + policy.runtime_s
    start_index = len(review["attempts"])
    count = 1 if mode == "guided" else len(plan) - start_index
    for candidate in plan[start_index:start_index + count]:
        remaining = deadline - time.perf_counter()
        if remaining < .05:
            break
        record = dict(candidate=asdict(candidate), label=candidate.label, status="Failed", aicc=np.nan, n_parameters=None)
        try:
            rules = candidate_rules(candidate, curves, policy, evidence)
            fitted = fit_mechanism(curves, candidate.model, rules, candidate.transport, "nonspecific" in candidate.terms,
                                   starts=policy.starts, max_nfev=policy.max_nfev,
                                   runtime_s=min(remaining * .55, 60.), correlation_time=policy.correlation_time)
            if input_fingerprint(fitted["curves"]) != fingerprint:
                raise ValueError("A candidate changed its input observations or noise scales.")
            assessment = assess_fit(fitted, policy)
            if assessment["eligible"]:
                remaining_candidates = max(len(plan)-len(review["attempts"]), 1) if policy.compare_all else 1
                profile_deadline = min(deadline, time.perf_counter()+max(.05, (deadline-time.perf_counter())/remaining_candidates))
                profiles = profile_qualification(fitted, profile_deadline)
                assessment["profiles"] = profiles
                if not profiles["eligible"]:
                    assessment["eligible"] = False
                    assessment["failures"].append("Rate profiles are unresolved or incomplete")
            fitted["qualification"] = assessment
            fitted["summary_eligible"] = assessment["eligible"]
            record.update(result=fitted, assessment=assessment, aicc=fitted["information_criteria"]["aicc"],
                          n_parameters=fitted["n_parameters"], status="Adequate under declared policy" if assessment["eligible"] else "Diagnostic only")
        except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
            record["error"] = str(exc)
        review["attempts"].append(record)
        if review["attempts"][0].get("result") is None or not np.isfinite(review["attempts"][0]["aicc"]):
            break
        if any(not np.isfinite(c.get("noise_sd", np.nan)) or c["noise_sd"] <= 0 for c in curves):
            break
        # Satisfying the declared policy is a stopping rule, not a search for maximal fit.
        if not policy.compare_all and choose_candidate(review["attempts"], policy) is not None:
            break
    recommended = choose_candidate(review["attempts"], policy)
    displayable = [(i, a) for i, a in enumerate(review["attempts"]) if a.get("result") is not None]
    review["recommended_index"] = recommended
    review["display_index"] = recommended if recommended is not None else (min(displayable, key=lambda pair: pair[1]["aicc"] if np.isfinite(pair[1]["aicc"]) else np.inf)[0] if displayable else None)
    completed = len(review["attempts"])
    if recommended is not None:
        review.update(status="Qualified under declared policy", reason="Simplest adequately supported candidate among completed attempts, conditional on the saved model and analysis assumptions.")
    elif completed < len(plan):
        review.update(status="More investigation needed", reason="No attempted candidate met all qualification gates.", next_candidate=plan[completed].label)
        if time.perf_counter() >= deadline:
            review.update(status="Budget exhausted", reason="Search/profile budget expired; no automatic recommendation is available.")
    else:
        review.update(status="No adequate model", reason="No permitted candidate passed all gates. Review data, controls and experimental design; do not add arbitrary corrections.")
    if recommended is None:
        if review["attempts"] and (review["attempts"][0].get("result") is None or not np.isfinite(review["attempts"][0]["aicc"])):
            review.update(status="Base fit unresolved", next_candidate=None,
                          reason="A converged base fit with a finite comparable likelihood is required before adding terms.")
        elif any(not np.isfinite(c.get("noise_sd", np.nan)) or c["noise_sd"] <= 0 for c in curves):
            review.update(status="Insufficient noise information", next_candidate=None,
                          reason="The base fit is retained for inspection. Supply a usable baseline or independently measured noise SD before evaluating additional terms.")
        elif time.perf_counter() >= deadline:
            review.update(status="Budget exhausted", next_candidate=None,
                          reason="Search/profile budget expired; no automatic recommendation is available.")
        elif any(a.get("assessment", {}).get("eligible") for a in review["attempts"]):
            review.update(status="No justified addition", reason="An alternative meets residual tolerances but lacks sufficient complexity-adjusted support over a simpler attempted model.")
    review["search_complete"] = completed == len(plan)
    review["candidate_queue"] = [dict(order=i+1, model=c.label,
        status=review["attempts"][i]["status"] if i < completed else
            "Not run: stopped after an adequate simpler fit" if recommended is not None and not policy.compare_all else
            "Not run: runtime or qualification prerequisite") for i, c in enumerate(plan)]
    review["suggestions"] = [] if recommended is not None else [
        "Verify physical injection times and referencing before adding terms; response-derived phases are proposals, not instrument metadata.",
        "Inspect phase-specific residuals and rate profiles. Unresolved rates may require more concentration coverage, a longer dissociation phase or independent constraints."]
    review["limitations"] = ["Uncertainty follows the saved input budget; model choice, phase times and fixed noise/calibration assumptions remain conditional. Across-repeat SD and conditional profiles are separate.",
                              "Noise and residual thresholds are descriptive policies, not calibrated inferential tests.",
                              "A finite candidate/profile search does not prove a unique mechanism or globally optimal fit."]
    return review


def attempt_table(review):
    return pd.DataFrame([dict(attempt=index + 1, model=record["label"], status=record["status"],
                              free_parameters=record["n_parameters"], aicc=record["aicc"],
                              issues="; ".join(record.get("assessment", {}).get("failures", [])) or record.get("error", ""))
                         for index, record in enumerate(review["attempts"])])


def review_metadata(review):
    """Export decisions and profiles, without duplicating all fitted arrays."""
    payload = {key: value for key, value in review.items() if key != "attempts"}
    payload["attempts"] = [{key: value for key, value in record.items() if key != "result"} for record in review["attempts"]]
    return json_safe(payload)
