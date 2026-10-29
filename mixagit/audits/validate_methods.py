"""Independent known-truth benchmarks; preserve all failures and Monte Carlo error."""

import argparse
from collections import Counter
from dataclasses import asdict, replace
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import platform
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from scipy import stats

from mixa_automation import FitPolicy, baseline_evidence, run_assisted_fit
from mixa_mechanisms import binding_prediction, derived_affinities, fit_mechanism, parameter_defaults, prepare_curves
from mixa_science import CONDITIONAL_ERROR, json_safe
from validation.reference_simulator import simulate, stationary_noise


SEED = 8132026
PRODUCTION_FILES = ["mixa_mechanisms.py", "mixa_science.py", "mixa_automation.py", "mixa_selection.py", "mixa_uncertainty.py", "mixa_app.py",
                    "mixa_input_uncertainty.py", "mixa_data.py"]
IMPORTED_SOURCE_SHA256 = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in PRODUCTION_FILES}
TRUTH = {
    "langmuir": dict(kon=1.2e5, koff=.012, Rmax=85.),
    "two_state": dict(kon=1.2e5, koff=.02, Rmax=85., k_forward=.03, k_reverse=.009),
    "heterogeneous": dict(kon=1.8e5, koff=.006, Rmax=55., kon2=2.5e4, koff2=.07, Rmax2=35.),
    "bivalent": dict(kon=8e4, koff=.018, Rmax=85., kon2=.0015, koff2=.004),
    "sequential": dict(kon=1.2e5, koff=.012, Rmax=85., kon2=1.8e4, koff2=.03),
}


def probability_summary(successes, total):
    """Wilson interval for simulation frequency, not uncertainty of a binding rate."""
    if not total:
        return dict(n=0, count=0, fraction=None, mc95_low=None, mc95_high=None)
    p, z = successes / total, stats.norm.ppf(.975)
    denominator = 1 + z*z / total
    center = (p + z*z / (2*total)) / denominator
    half = z * np.sqrt(p*(1-p)/total + z*z / (4*total*total)) / denominator
    return dict(n=int(total), count=int(successes), fraction=float(p), mc95_low=float(max(0., center-half)), mc95_high=float(min(1., center+half)))


def make_curves(clean, t, on, off, rng, sd=.25, tau=0., mask=None):
    mask = t >= on if mask is None else mask
    return [dict(filename="reference.csv", repeat_id="R1", concentration_nM=c, concentration_M=c*1e-9,
                 time=t.copy(), response=y + stationary_noise(rng, t, sd, tau), fit_mask=mask.copy(),
                 on=on, off=off, relative_sd=1., noise_sd=sd)
            for c, y in clean.items()]


def interval_rows(fitted, truth, scenario, replicate, status="Completed"):
    values = []
    for metric in ["kon", "koff", "KD_nM"]:
        value = se = np.nan
        if fitted is not None:
            if metric == "KD_nM":
                row = derived_affinities(fitted).iloc[0]
            else:
                row = fitted["parameter_table"].loc[lambda frame: frame.parameter == metric].iloc[0]
            value, se = row.value, row.model_se
        actual = truth["koff"] / truth["kon"] * 1e9 if metric == "KD_nM" else truth[metric]
        available = bool(fitted is not None and np.isfinite(se) and se > 0 and not fitted["boundary_parameters"])
        half = stats.t.ppf(.975, fitted["degrees_of_freedom"]) * se if available else np.nan
        values.append(dict(scenario=scenario, replicate=replicate, parameter=metric, truth=actual,
                           estimate=value, model_se=se, interval_available=available,
                           ci95_low=value-half, ci95_high=value+half,
                           covered=bool(abs(value-actual) <= half) if available else False, status=status))
    return values


def summarize_intervals(rows):
    table, summaries = pd.DataFrame(rows), []
    if table.empty:
        return summaries
    for (scenario, parameter), group in table.groupby(["scenario", "parameter"], sort=False):
        available = group.loc[group.interval_available]
        finite = group.loc[np.isfinite(group.estimate)]
        error = finite.estimate / finite.truth - 1
        summaries.append(dict(scenario=scenario, parameter=parameter, simulations=len(group),
            finite_estimates=len(finite), mean_relative_bias=float(error.mean()) if len(finite) else None,
            relative_rmse=float(np.sqrt(np.mean(error**2))) if len(finite) else None,
            interval_availability=probability_summary(len(available), len(group)),
            coverage_when_available=probability_summary(int(available.covered.sum()), len(available)),
            covered_and_available_fraction_all_runs=probability_summary(int(available.covered.sum()), len(group)),
            statuses=dict(Counter(group.status))))
    return summaries


def prediction_and_joint_recovery():
    t, on, off = np.r_[np.arange(0., 501., 5.), 21.3, 159.7, 163.1], 20., 160.
    t.sort()
    agreement, recovery = [], []
    cases = [(model, "None", False) for model in TRUTH]
    cases += [("langmuir", name, False) for name in ["Quasi-steady 1:1 transport", "Two-compartment transport"]]
    cases += [("two_state", "Two-compartment transport", True)]
    for index, (model, transport, nonspecific) in enumerate(cases):
        p = dict(TRUTH[model])
        if transport == "Quasi-steady 1:1 transport":
            p["k_transport"] = 3e6
        elif transport == "Two-compartment transport":
            p.update(k_exchange=.2, response_to_M=2e-9)
        if nonspecific:
            p.update(ns_kon=3e4, ns_koff=.04, ns_Rmax=8.)
        clean = {c: simulate(t, c*1e-9, on, off, p, model, transport, nonspecific) for c in [5., 20., 80., 320., 1000.]}
        maximum = max(float(np.max(np.abs(y-binding_prediction(t, c*1e-9, on, off, p, model, transport, nonspecific))))
                      for c, y in clean.items())
        agreement.append(dict(model=model, transport=transport, nonspecific=nonspecific,
                              max_absolute_response_difference=maximum, tolerance_response=2e-5,
                              passed=maximum < 2e-5, truth=p))
        # The coupled NS/transport case is an integration check, not a joint-recovery claim.
        if nonspecific:
            continue
        rules = parameter_defaults(model, 100., transport)
        rules = [replace(rule, initial=p[rule.key]) if rule.fixed else rule for rule in rules]
        curves = make_curves(clean, t, on, off, np.random.default_rng(SEED+index), sd=0.)
        started = time.perf_counter()
        try:
            fitted = fit_mechanism(curves, model, rules, transport, starts=3, runtime_s=90., seed=SEED+index)
            parameters = fitted["parameter_table"]
            errors = {row.parameter: float(row.value/p[row.parameter]-1) for row in parameters.itertuples() if not row.fixed}
            recovery.append(dict(model=model, transport=transport, truth=p, fixed_parameters={r.key: r.initial for r in rules if r.fixed},
                free_parameters=parameters.loc[~parameters.fixed, "parameter"].tolist(), relative_errors=errors,
                maximum_absolute_relative_error=max(abs(value) for value in errors.values()),
                passed=max(abs(value) for value in errors.values()) < .02 and not fitted["timed_out"] and not fitted["boundary_parameters"],
                timed_out=fitted["timed_out"], at_bounds=fitted["boundary_parameters"], covariance_status=fitted["covariance_status"],
                elapsed_s=time.perf_counter()-started, status="Completed"))
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            recovery.append(dict(model=model, transport=transport, truth=p, passed=False, status=str(exc), elapsed_s=time.perf_counter()-started))
        print(f"Joint recovery: {model}, {transport}: {recovery[-1]['passed']}", flush=True)
    return agreement, recovery


def coverage_benchmark(repeats):
    t, on, off, sd = np.arange(0., 341., 2.), 20., 140., .25
    mask = ((t >= 30.) & (t <= 130.)) | ((t >= 160.) & (t <= 320.))
    scenarios = [
        ("iid_standard", dict(TRUTH["langmuir"]), 0., 0.),
        ("iid_slow_dissociation", dict(kon=8e4, koff=.0008, Rmax=85.), 0., 0.),
        ("iid_fast_association", dict(kon=8e5, koff=.06, Rmax=85.), 0., 0.),
        ("ou_ignored", dict(TRUTH["langmuir"]), 8., 0.),
        ("ou_supplied_true_tau", dict(TRUTH["langmuir"]), 8., 8.),
    ]
    rows, predictions = [], []
    for index, (name, truth, generation_tau, fitting_tau) in enumerate(scenarios):
        clean = {c: simulate(t, c*1e-9, on, off, truth) for c in [5., 15., 150., 500.]}
        held_concentration = 50.
        held_clean = simulate(t, held_concentration*1e-9, on, off, truth)
        rules = parameter_defaults("langmuir")
        for replicate in range(repeats):
            # Pair the two OU analyses on exactly the same simulated observations.
            noise_index = 3 if index == 4 else index
            rng = np.random.default_rng(np.random.SeedSequence([SEED, 10, noise_index, replicate]))
            curves = make_curves(clean, t, on, off, rng, sd, generation_tau, mask)
            fitted, status = None, "Completed"
            try:
                fitted = fit_mechanism(curves, "langmuir", rules, starts=1, runtime_s=20., correlation_time=fitting_tau)
                status = fitted["covariance_status"]
                prediction = binding_prediction(t, held_concentration*1e-9, on, off, fitted["curves"][0]["parameters"])
                held_rng = np.random.default_rng(np.random.SeedSequence([SEED, 99, noise_index, replicate]))
                held_y = held_clean + stationary_noise(held_rng, t, sd, generation_tau)
                predictions.append(dict(scenario=name, replicate=replicate, held_concentration_nM=held_concentration,
                    rmse_vs_clean=float(np.sqrt(np.mean((prediction[mask]-held_clean[mask])**2))),
                    rmse_vs_independent_noisy_trace=float(np.sqrt(np.mean((prediction[mask]-held_y[mask])**2))), noise_sd=sd))
            except (ValueError, RuntimeError, FloatingPointError) as exc:
                status = str(exc)
                predictions.append(dict(scenario=name, replicate=replicate, status=status))
            rows.extend(interval_rows(fitted, truth, name, replicate, status))
        print(f"Coverage: {name}, {repeats} experiments", flush=True)
    return rows, predictions


def automation_benchmark(repeats):
    t, on, off, sd = np.arange(0., 181.), 20., 100., .2
    policy = FitPolicy()
    evidence = dict(allow_drift=True, drift_supported=True)
    scenarios = ["simple_drift_permitted", "true_linear_drift", "simple_estimated_baseline_noise", "two_state_only_simple_permitted"]
    records, interval_records = [], []
    for case, scenario in enumerate(scenarios):
        model = "two_state" if scenario.startswith("two_state") else "langmuir"
        p = dict(TRUTH[model])
        if scenario == "true_linear_drift":
            p["drift"] = .04
        clean = {c: simulate(t, c*1e-9, on, off, p, model) for c in [5., 15., 50., 150., 500.]}
        for replicate in range(repeats):
            rng = np.random.default_rng(np.random.SeedSequence([SEED, 20, case, replicate]))
            curves = make_curves(clean, t, on, off, rng, sd)
            supplied_evidence = dict(evidence)
            if scenario == "simple_estimated_baseline_noise":
                data = [dict(filename="reference.csv", repeat_id="R1", time=t, concentrations=list(clean),
                             responses={c["concentration_nM"]: c["response"] for c in curves})]
                include = {"reference.csv": set(clean)}
                windows = dict(phase_assoc_start_s=on, phase_dissoc_start_s=off, fit_assoc_start_s=on,
                               fit_assoc_end_s=off, fit_dissoc_start_s=off, fit_dissoc_end_s=t[-1])
                baseline = baseline_evidence(data, include, on)
                curves = prepare_curves(data, include, windows, normalize=True)
                noise = dict(zip(baseline.concentration_nM, baseline.noise_sd))
                median = np.median(list(noise.values()))
                for curve in curves:
                    curve.update(noise_sd=noise[curve["concentration_nM"]], relative_sd=noise[curve["concentration_nM"]]/median)
                supplied_evidence["drift_supported"] = bool(baseline.drift_supported.any())
            started = time.perf_counter()
            try:
                review = run_assisted_fit(curves, policy, supplied_evidence, mode="automatic")
                selected = review["recommended_index"]
                winner = review["attempts"][selected] if selected is not None else None
                fit = winner["result"] if winner else None
                failures = [issue for a in review["attempts"] for issue in a.get("assessment", {}).get("failures", [])]
                records.append(dict(scenario=scenario, replicate=replicate, qualified=winner is not None,
                    selected_terms=list(winner["candidate"]["terms"]) if winner else None,
                    selected_model=winner["candidate"]["model"] if winner else None,
                    unnecessary_addition=bool(winner and "drift" in winner["candidate"]["terms"] and scenario != "true_linear_drift"),
                    supported_drift_selected=bool(winner and "drift" in winner["candidate"]["terms"] and scenario == "true_linear_drift"),
                    attempts=len(review["attempts"]), status=review["status"], failure_reasons=sorted(set(failures)),
                    elapsed_s=time.perf_counter()-started))
                if model == "langmuir":
                    interval_records.extend(interval_rows(fit, p, scenario, replicate, review["status"]))
            except (ValueError, RuntimeError, FloatingPointError) as exc:
                records.append(dict(scenario=scenario, replicate=replicate, qualified=False, selected_terms=None,
                    unnecessary_addition=False, supported_drift_selected=False, attempts=0, status=str(exc), elapsed_s=time.perf_counter()-started))
                if model == "langmuir":
                    interval_records.extend(interval_rows(None, p, scenario, replicate, str(exc)))
        print(f"Automation: {scenario}, {repeats} experiments", flush=True)
    summaries = []
    for scenario in scenarios:
        group = [record for record in records if record["scenario"] == scenario]
        reasons = Counter(issue for record in group for issue in record.get("failure_reasons", []))
        summaries.append(dict(scenario=scenario, simulations=repeats,
            qualified=probability_summary(sum(r["qualified"] for r in group), repeats),
            unnecessary_addition=probability_summary(sum(r["unnecessary_addition"] for r in group), repeats),
            supported_drift_selected=probability_summary(sum(r["supported_drift_selected"] for r in group), repeats),
            statuses=dict(Counter(r["status"] for r in group)), failure_reasons=dict(reasons)))
    return records, interval_records, summaries, asdict(policy)


def report_markdown(evidence):
    lines = ["# MIXA Methods Validation Results", "", f"Generated: {evidence['created_utc']}", "",
        "Synthetic benchmark evidence with recorded source hashes. Neither vendor agreement nor visual fit quality is the answer key.", "",
        "## Findings Requiring Attention", "",
        "Measured-baseline uncertainty now propagates through the existing fit's sensitivities. Compare the estimated-baseline/noise case and the paired baseline study in baseline_uncertainty/RESULTS.md. This does not include shared-control/concentration/model-selection uncertainty. Thresholds were not loosened or tuned to obtain coverage.", "",
        "The phase-specific residual screens also withheld some correctly specified simple fits. Their empirical withholding frequency is reported, not treated as detection of a real defect in every rejected simulation.", "",
        "## Independent Numerical and Joint-Recovery Checks", "",
        "| Model | Transport | Independent prediction agrees | Joint recovery <2% |", "| --- | --- | --- | --- |"]
    for entry in evidence["prediction_agreement"]:
        recovered = next((r for r in evidence["joint_recovery"] if r["model"] == entry["model"] and r["transport"] == entry["transport"]), None)
        lines.append(f"| {entry['model']}{' + NS' if entry['nonspecific'] else ''} | {entry['transport']} | {entry['passed']} | {recovered['passed'] if recovered and not entry['nonspecific'] else 'not assessed'} |")
    lines += ["", "Joint recovery is one noiseless design per model with all kinetic/capacity parameters free; two-compartment calibration is fixed and recorded. It is not a complex-model uncertainty-coverage study.", "",
        "## Conditional Interval Calibration", "", "Nominal 95% local t/delta-method intervals. Percentages below condition on interval availability; availability and all-run fractions are in the JSON. Brackets are Wilson 95% Monte Carlo intervals.", "",
        "| Design | Parameter | Available | Coverage [MC 95%] | Relative bias |", "| --- | --- | --- | --- | --- |"]
    for entry in evidence["conditional_interval_calibration"]:
        c = entry["coverage_when_available"]
        percent = f"{100*c['fraction']:.1f}% [{100*c['mc95_low']:.1f}, {100*c['mc95_high']:.1f}]" if c["n"] else "unavailable"
        bias = f"{100*entry['mean_relative_bias']:.2f}%" if entry["mean_relative_bias"] is not None else "unavailable"
        lines.append(f"| {entry['scenario']} | {entry['parameter']} | {entry['interval_availability']['count']}/{entry['simulations']} | {percent} | {bias} |")
    lines += ["", "## Full Assisted Procedure", "",
        "Each experiment reruns the complete finite-candidate policy, multistarts, residual checks, profiles and stopping rules. No decisions are mocked. Known phase times and finite runtime are part of the design.", "",
        "| Design | Qualified | Unnecessary drift | Supported drift selected |", "| --- | --- | --- | --- |"]
    for entry in evidence["automated_selection"]:
        n = entry["simulations"]
        lines.append(f"| {entry['scenario']} | {entry['qualified']['count']}/{n} | {entry['unnecessary_addition']['count']}/{n} | {entry['supported_drift_selected']['count']}/{n} |")
    lines += ["", "### Parameter Intervals After the Full Procedure", "",
        "These remain conditional-model intervals evaluated after selection, not a newly selection-adjusted interval estimator. The baseline/noise case also reruns preprocessing. Missing recommendations remain in the all-run denominators in the JSON.", "",
        "| Design | Parameter | Available | Coverage when available [MC 95%] |", "| --- | --- | --- | --- |"]
    for entry in evidence["post_selection_interval_calibration"]:
        c = entry["coverage_when_available"]
        percent = f"{100*c['fraction']:.1f}% [{100*c['mc95_low']:.1f}, {100*c['mc95_high']:.1f}]" if c["n"] else "unavailable"
        lines.append(f"| {entry['scenario']} | {entry['parameter']} | {entry['interval_availability']['count']}/{entry['simulations']} | {percent} |")
    lines += ["",
        "## Scope", "", *["- " + item for item in evidence["scope"]], "",
        "Raw estimates, failed/unresolved results, withheld-concentration prediction errors and source hashes accompany this report. Thresholds were not tuned to these results.", ""]
    return "\n".join(lines)


def run(output, coverage_repeats=200, automation_repeats=40):
    output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    agreement, recovery = prediction_and_joint_recovery()
    intervals, predictions = coverage_benchmark(coverage_repeats) if coverage_repeats else ([], [])
    automation, selected_intervals, selection_summary, policy = automation_benchmark(automation_repeats) if automation_repeats else ([], [], [], asdict(FitPolicy()))
    if any(hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != digest for name, digest in IMPORTED_SOURCE_SHA256.items()):
        raise RuntimeError("Production source changed during the benchmark; rerun the frozen source.")
    payloads = {"conditional_intervals.csv": pd.DataFrame(intervals), "held_out_predictions.csv": pd.DataFrame(predictions),
                "automated_runs.json": automation, "post_selection_intervals.csv": pd.DataFrame(selected_intervals)}
    for name, payload in payloads.items():
        if isinstance(payload, pd.DataFrame):
            payload.to_csv(output / name, index=False)
        else:
            (output / name).write_text(json.dumps(json_safe(payload), indent=2, allow_nan=False)+"\n")
    evidence = dict(schema_version=1, created_utc=datetime.now(timezone.utc).isoformat(), seed=SEED,
        counts=dict(coverage_experiments_per_scenario=coverage_repeats, automated_experiments_per_scenario=automation_repeats),
        production_code_sha256=IMPORTED_SOURCE_SHA256,
        validation_code_sha256={name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ["audits/validate_methods.py", "validation/reference_simulator.py"]},
        software=dict(Python=platform.python_version(), **{name: version(name) for name in ["numpy", "scipy", "pandas"]}),
        prediction_agreement=agreement, joint_recovery=recovery, conditional_interval_calibration=summarize_intervals(intervals),
        automated_selection=selection_summary, post_selection_interval_calibration=summarize_intervals(selected_intervals),
        automatic_policy=policy, elapsed_s=time.perf_counter()-started,
        raw_evidence_sha256={name: hashlib.sha256((output/name).read_bytes()).hexdigest() for name in payloads},
        protocol=dict(coverage=dict(on_s=20., off_s=140., time_s=[0., 340., 2.], fitted_windows_s=[[30., 130.], [160., 320.]],
                        concentrations_nM=[5., 15., 150., 500.], withheld_concentration_nM=50., noise_sd=.25,
                        baseline="known zero; no control subtraction", covariance="relative-scale Gaussian, residual scale estimated"),
                      automation=dict(on_s=20., off_s=100., time_s=[0., 180., 1.], concentrations_nM=[5., 15., 50., 150., 500.],
                        noise_sd=.2, true_drift=.04, baseline="known zero except estimated-baseline/noise scenario", policy=policy)),
        scope=["Independent simulator uses explicit free-surface species, stoichiometric fluxes and DOP853, not MIXA's analytic/Radau prediction functions.",
            "Coverage scenarios include IID standard/slow/fast designs and paired OU data analyzed with ignored versus true supplied correlation. No correlation time is estimated.",
            "Held-out concentration is never used for fitting or selecting a candidate; predictive RMSE is exported without a calibrated prediction-interval claim.",
            "Automation includes a known-zero baseline, a measured-baseline/noise scenario, permitted unnecessary drift, real drift and misspecified two-state data with only 1:1/drift allowed.",
            "This conditional study does not cover advanced-model noisy intervals, estimated phase boundaries, shared controls or concentration calibration. A separate input_uncertainty study records those selected source/calibration and complex-noise cases; broader grids and permitted mechanism searches remain outside both studies.",
            "No independent real SPR/BLI dataset is included in this benchmark. Such datasets assess applicability/prediction, not agreement with a vendor as ground truth."])
    (output / "benchmark_summary.json").write_text(json.dumps(json_safe(evidence), indent=2, allow_nan=False)+"\n")
    (output / "RESULTS.md").write_text(report_markdown(evidence))
    print(output / "RESULTS.md", flush=True)
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "validation")
    parser.add_argument("--coverage-repeats", type=int, default=200)
    parser.add_argument("--automation-repeats", type=int, default=40)
    args = parser.parse_args()
    if min(args.coverage_repeats, args.automation_repeats) < 0:
        parser.error("Repeat counts cannot be negative")
    run(args.output, args.coverage_repeats, args.automation_repeats)
