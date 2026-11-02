"""Known-truth raw-input propagation and noisy advanced-model benchmarks.

Independent DOP853 generation; no production predictor supplies synthetic truth.
All requested fits, timeouts and unavailable intervals remain in the evidence.
"""

import argparse
from dataclasses import replace
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from scipy import stats

import mixa_app as app
from mixa_data import APP_VERSION, default_design, prepare_experiment
from mixa_input_uncertainty import input_options
from mixa_mechanisms import binding_prediction, derived_affinities, fit_mechanism, local_precision, parameter_defaults, prepare_curves
from mixa_science import conditional_covariance, json_safe
from audits.validate_methods import TRUTH, summarize_intervals
from validation.reference_simulator import simulate, stationary_noise


SEED = 9202026
SOURCE_FILES = ["mixa_app.py", "mixa_data.py", "mixa_mechanisms.py", "mixa_input_uncertainty.py",
                "mixa_uncertainty.py", "mixa_science.py", "mixa_selection.py", "mixa_automation.py"]
IMPORTED_SOURCE_SHA256 = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCE_FILES}
VALIDATION_FILES = ["audits/validate_input_uncertainty.py", "audits/validate_methods.py", "validation/reference_simulator.py"]
IMPORTED_VALIDATION_SHA256 = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in VALIDATION_FILES}


def interval(scenario, replicate, parameter, truth, value=np.nan, se=np.nan, eligible=False,
             status="Unavailable", df=None, analysis="current"):
    available = bool(eligible and np.isfinite(value) and np.isfinite(se) and se > 0)
    q = stats.t.ppf(.975, df) if df is not None and df > 0 else stats.norm.ppf(.975)
    half = q*se if available else np.nan
    return dict(scenario=scenario, replicate=replicate, analysis=analysis, parameter=parameter, truth=truth,
                estimate=value, model_se=se, interval_available=available, ci95_low=value-half, ci95_high=value+half,
                covered=bool(abs(value-truth) <= half) if available else False, status=status)


def raw_project(clean, t, rng, sample_sd, control_sd, options, noise_tau=0.):
    baseline = 1.5+.003*t
    raw = []
    sample = dict(filename="sample.csv", time=t, concentrations=list(clean),
                  responses={c: y+baseline+stationary_noise(rng, t, sample_sd, noise_tau) for c, y in clean.items()},
                  sha256="generated", noise_sd_by_concentration={c: sample_sd for c in clean})
    raw.append(sample)
    if control_sd:
        raw.append(dict(filename="reference.csv", time=t, concentrations=[0.],
                        responses={0.: baseline+stationary_noise(rng, t, control_sd, noise_tau)},
                        sha256="generated", noise_sd_by_concentration={0.: control_sd}))
    design = default_design(raw)
    if control_sd:
        design.loc[0, ["Background set", "Subtraction"]] = ["Shared", "Control 0 nM"]
        design.loc[1, ["Role", "Background set"]] = ["Negative control", "Shared"]
    else:
        sample["responses"] = {c: y-baseline for c, y in sample["responses"].items()}
    prepared, _ = prepare_experiment(raw, design, "Experiment 1")
    prepared[0]["input_uncertainty"] = input_options(options)
    return prepared, {"sample.csv": set(clean)}


def kinetic_metrics(fit, truth, scenario, replicate, analysis):
    rows = []
    for key in ["kon", "koff", "KD_nM"]:
        actual = truth["koff"]/truth["kon"]*1e9 if key == "KD_nM" else truth[key]
        value = error = np.nan
        if fit is not None:
            row = derived_affinities(fit).iloc[0] if key == "KD_nM" else fit["parameter_table"].loc[lambda frame: frame.parameter == key].iloc[0]
            value, error = row.value, row.model_se
        eligible = fit is not None and not fit["boundary_parameters"] and not fit["timed_out"]
        rows.append(interval(scenario, replicate, key, actual, value, error, eligible,
                             fit["covariance_status"] if fit is not None else "Failed", analysis=analysis))
    return rows


def input_benchmarks(repeats):
    t, on, off = np.arange(181.), 20., 100.
    truth = TRUTH["langmuir"]
    windows = dict(phase_assoc_start_s=on, phase_dissoc_start_s=off, fit_assoc_start_s=on,
                   fit_assoc_end_s=off, fit_dissoc_start_s=off, fit_dissoc_end_s=180.)
    scenarios = [
        ("kinetic_shared_zero_reference", .12, .35, 0., 0.),
        ("kinetic_shared_reference_OU", .12, .35, 3., 0.),
        ("kinetic_common_stock_10pct", .12, 0., 0., .1),
        ("kobs_first_stage_IID", .2, 0., 0., 0.),
        ("kobs_shared_zero_reference", .12, .35, 0., 0.),
        ("kobs_common_stock_10pct", .2, 0., 0., .1),
    ]
    rows, failures = [], []
    for index, (name, sample_sd, control_sd, tau, stock_cv) in enumerate(scenarios):
        for replicate in range(repeats):
            rng = np.random.default_rng(np.random.SeedSequence([SEED, 10, index, replicate]))
            # External stock calibration error is shared by every concentration.
            stock_scale = np.exp(rng.normal(0., np.sqrt(np.log1p(stock_cv**2)))) if stock_cv else 1.
            clean = {c: simulate(t, c*stock_scale*1e-9, on, off, truth) for c in [5., 15., 50., 150., 500.]}
            options = dict(propagate_measurement=bool(control_sd), stock_cv=stock_cv, raw_correlation_time_s=tau, draws=1024)
            data, include = raw_project(clean, t, rng, sample_sd, control_sd, options, tau)
            if name.startswith("kinetic"):
                for analysis in ["budget_off", "current"]:
                    data[0]["input_uncertainty"] = input_options(options if analysis == "current" else {})
                    fit = None
                    try:
                        fit = fit_mechanism(prepare_curves(data, include, windows), "langmuir", parameter_defaults("langmuir"), starts=1, runtime_s=10.)
                    except (ValueError, RuntimeError, FloatingPointError) as exc:
                        failures.append(dict(scenario=name, replicate=replicate, analysis=analysis, error=str(exc)))
                    rows.extend(kinetic_metrics(fit, truth, name, replicate, analysis))
            else:
                fitted = None
                try:
                    fitted = app.fit_kobs_linearization(data, include, on, off)
                except (ValueError, RuntimeError, FloatingPointError) as exc:
                    failures.append(dict(scenario=name, replicate=replicate, error=str(exc)))
                old_cov = None
                if fitted is not None:
                    table = fitted["concentration_table"]
                    x = table.concentration_nM.to_numpy()
                    y = table.kobs_mean.to_numpy()
                    design = np.column_stack([x, np.ones(len(x))])
                    residual = y-(fitted["kass"]*x*1e-9+fitted["kdiss"])
                    old = conditional_covariance(design, residual)["covariance"]
                    if old is not None:
                        old_cov = old*np.outer([1e9, 1.], [1e9, 1.])
                for analysis in ["old_line_RSS", "current"]:
                    for key, parameter, actual in [("kass", "kon", truth["kon"]), ("kdiss", "koff", truth["koff"]), ("KD", "KD_nM", 100.)]:
                        value = fitted[key] if fitted else np.nan
                        scale = 1e9 if key == "KD" else 1.
                        error = fitted[key+"_err"] if fitted else np.nan
                        if analysis == "old_line_RSS":
                            if old_cov is None:
                                error = np.nan
                            elif key == "KD":
                                gradient = np.array([-fitted["kdiss"]/fitted["kass"]**2, 1/fitted["kass"]])
                                error = np.sqrt(max(0., gradient @ old_cov @ gradient))
                            else:
                                error = np.sqrt(old_cov[0 if key == "kass" else 1, 0 if key == "kass" else 1])
                        rows.append(interval(name, replicate, parameter, actual, value*scale, error*scale,
                            bool(fitted and fitted["summary_eligible"]), "Completed" if fitted else "Failed", analysis=analysis))
        print(f"Input coverage: {name}, {repeats} requested experiments", flush=True)
    return rows, failures


def advanced_cases():
    return [
        ("two_state_resolved", "two_state", "None", dict(TRUTH["two_state"]), .2),
        ("two_state_weak_conversion", "two_state", "None", dict(TRUTH["two_state"], k_forward=.002, k_reverse=.08), .5),
        ("heterogeneous_separated", "heterogeneous", "None", dict(TRUTH["heterogeneous"]), .2),
        ("heterogeneous_overlapping", "heterogeneous", "None", dict(TRUTH["heterogeneous"], kon2=1.3e5, koff2=.008), .5),
        ("bivalent_standard_density", "bivalent", "None", dict(TRUTH["bivalent"]), .2),
        ("bivalent_low_density", "bivalent", "None", dict(TRUTH["bivalent"], Rmax=15.), .5),
        ("sequential_second_capture", "sequential", "None", dict(TRUTH["sequential"]), .2),
        ("sequential_weak_second_capture", "sequential", "None", dict(TRUTH["sequential"], kon2=1e3, koff2=.08), .5),
        ("quasi_steady_transport", "langmuir", "Quasi-steady 1:1 transport", dict(TRUTH["langmuir"], k_transport=3e6), .2),
        ("two_compartment_transport", "langmuir", "Two-compartment transport", dict(TRUTH["langmuir"], k_exchange=.2, response_to_M=2e-9), .2),
    ]


def true_affinities(model, p):
    kd = p["koff"]/p["kon"]*1e9
    if model == "two_state":
        return dict(KD_first_step_nM=kd, KD_overall_nM=kd*p["k_reverse"]/(p["k_forward"]+p["k_reverse"]))
    if model == "heterogeneous":
        return dict(KD_population_1_nM=kd, KD_population_2_nM=p["koff2"]/p["kon2"]*1e9)
    if model == "sequential":
        return dict(KD_step_1_nM=kd, KD_step_2_nM=p["koff2"]/p["kon2"]*1e9)
    if model == "bivalent":
        return dict(KD_per_arm_first_step_nM=kd, KD_macroscopic_capture_nM=kd/2)
    return dict(KD_nM=kd)


def advanced_benchmarks(repeats, runtime):
    t, on, off = np.arange(0., 401., 4.), 20., 140.
    mask = ((t >= 28.) & (t <= 132.)) | ((t >= 156.) & (t <= 396.))
    rows, attempts = [], []
    for case_index, (name, model, transport, truth, sd) in enumerate(advanced_cases()):
        clean = {c: simulate(t, c*1e-9, on, off, truth, model, transport) for c in [5., 20., 80., 320., 1250., 5000.]}
        rules = [replace(r, initial=truth[r.key] if r.fixed else float(np.clip(truth[r.key]*(.8 if i % 2 else 1.2), r.lower*1.001, r.upper*.999)))
                 for i, r in enumerate(parameter_defaults(model, 100., transport))]
        metrics = {key: value for key, value in truth.items() if key != "response_to_M"}
        metrics.update(true_affinities(model, truth))
        held_clean = simulate(t, 150e-9, on, off, truth, model, transport)
        for replicate in range(repeats):
            rng = np.random.default_rng(np.random.SeedSequence([SEED, 20, case_index, replicate]))
            curves = [dict(filename="independent_simulation", repeat_id="R1", concentration_nM=c, concentration_M=c*1e-9,
                           on=on, off=off, time=t, response=y+stationary_noise(rng, t, sd), fit_mask=mask, relative_sd=1.) for c, y in clean.items()]
            fitted, error = None, ""
            started = time.perf_counter()
            try:
                fitted = fit_mechanism(curves, model, rules, transport, starts=1, max_nfev=400, runtime_s=runtime, seed=SEED+replicate)
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                error = str(exc)
            eligible = fitted is not None and not fitted["timed_out"] and not fitted["boundary_parameters"] and fitted["covariance"] is not None
            status = "Available" if eligible else (fitted["covariance_status"] if fitted else error)
            record = dict(scenario=name, replicate=replicate, model=model, transport=transport, noise_sd=sd, elapsed_s=time.perf_counter()-started,
                          converged=fitted is not None, interval_eligible=bool(eligible), status=status,
                          timed_out=fitted["timed_out"] if fitted else None, boundary_parameters=fitted["boundary_parameters"] if fitted else [],
                          precision_screen=fitted.get("precision_screen") if fitted else None,
                          initial_values={r.key: r.initial for r in rules}, fixed_parameters={r.key: r.initial for r in rules if r.fixed})
            aliases = {}
            affinities = None
            if fitted is not None:
                parameters = fitted["parameter_table"].set_index("parameter")
                affinities = derived_affinities(fitted).drop_duplicates("metric").set_index("metric")
                if model == "heterogeneous" and parameters.loc["koff", "value"]/parameters.loc["kon", "value"] > parameters.loc["koff2", "value"]/parameters.loc["kon2", "value"]:
                    aliases = dict(kon="kon2", koff="koff2", Rmax="Rmax2", kon2="kon", koff2="koff", Rmax2="Rmax",
                                   KD_population_1_nM="KD_population_2_nM", KD_population_2_nM="KD_population_1_nM")
                prediction = binding_prediction(t, 150e-9, on, off, fitted["curves"][0]["parameters"], model, transport)
                record["held_out_concentration_nM"] = 150.
                record["held_out_clean_rmse"] = float(np.sqrt(np.mean((prediction[mask]-held_clean[mask])**2)))
            for key, actual in metrics.items():
                value = se = np.nan
                if fitted is not None:
                    mapped = aliases.get(key, key)
                    if mapped in parameters.index:
                        row = parameters.loc[mapped]
                        value, se = row.value, row.model_se
                    elif mapped in affinities.index:
                        row = affinities.loc[mapped]
                        value, se = row.value, row.model_se
                rows.append({**interval(name, replicate, key, actual, value, se, eligible, status,
                                     fitted["degrees_of_freedom"] if fitted else None), **local_precision(value, se)})
            attempts.append(record)
        print(f"Advanced noise: {name}, {repeats} requested experiments", flush=True)
    return rows, attempts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-repeats", type=int, default=200)
    parser.add_argument("--advanced-repeats", type=int, default=20)
    parser.add_argument("--advanced-runtime", type=float, default=30.)
    parser.add_argument("--output", type=Path, default=ROOT/"validation"/"input_uncertainty")
    args = parser.parse_args()
    if min(args.input_repeats, args.advanced_repeats) < 0 or not 1 <= args.advanced_runtime <= 120:
        parser.error("Use nonnegative experiment counts and a 1-120 s per-fit advanced runtime.")
    args.output.mkdir(parents=True, exist_ok=True)
    rows, failures = input_benchmarks(args.input_repeats) if args.input_repeats else ([], [])
    advanced_rows, advanced_runs = advanced_benchmarks(args.advanced_repeats, args.advanced_runtime) if args.advanced_repeats else ([], [])
    if any(hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != digest for name, digest in IMPORTED_SOURCE_SHA256.items()):
        raise RuntimeError("Production source changed during the benchmark; rerun the frozen source rather than relabel mixed-version evidence.")
    if any(hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != digest for name, digest in IMPORTED_VALIDATION_SHA256.items()):
        raise RuntimeError("Validation source changed during the benchmark; rerun the frozen audit.")
    summaries = []
    for analysis in sorted({r["analysis"] for r in rows}):
        for summary in summarize_intervals([r for r in rows if r["analysis"] == analysis]):
            summary["analysis"] = analysis
            summaries.append(summary)
    advanced_summary = summarize_intervals(advanced_rows)
    for name, records in [("input_intervals.csv", rows), ("advanced_intervals.csv", advanced_rows)]:
        pd.DataFrame(records).to_csv(args.output/name, index=False)
    (args.output/"advanced_runs.json").write_text(json.dumps(json_safe(advanced_runs), indent=2)+"\n")
    record = dict(version=APP_VERSION, created_utc=datetime.now(timezone.utc).isoformat(), seed=SEED,
        counts=dict(input_experiments_per_scenario=args.input_repeats, advanced_experiments_per_scenario=args.advanced_repeats, advanced_scenarios=len(advanced_cases())),
        production_code_sha256=IMPORTED_SOURCE_SHA256,
        validation_code_sha256=IMPORTED_VALIDATION_SHA256,
        input_summary=summaries, advanced_summary=advanced_summary, input_failures=failures,
        advanced_optimizer=dict(starts=1, initial_values="Predeclared alternating 1.2/0.8 times generating values; intentionally local-recovery designs, not uninformed initialization or a multistart qualification", max_nfev=400, runtime_s=args.advanced_runtime),
        scope="Known-truth Gaussian designs with known phase times and source SDs; common-stock errors are zero-median lognormal. Input covariance remains local. Advanced noisy tests include weak regimes, all kinetic/capacity parameters free except stated transport calibration, affinity-order label matching, held-out concentration and all failures. Not model-selection or uncertain-phase coverage.")
    record["raw_sha256"] = {name: hashlib.sha256((args.output/name).read_bytes()).hexdigest() for name in ["input_intervals.csv", "advanced_intervals.csv", "advanced_runs.json"]}
    (args.output/"results.json").write_text(json.dumps(json_safe(record), indent=2)+"\n")
    lines = ["# Correlated Input and Advanced-Model Noise Results", "", "Generated: "+record["created_utc"], "", record["scope"], "",
             "## Input Propagation", "", "Nominal 95% local intervals; failures stay in all-run denominators in JSON. Brackets are Wilson 95% Monte Carlo intervals.", "",
             "| Design | Analysis | Parameter | Available | Coverage [MC 95%] |", "| --- | --- | --- | --- | --- |"]
    for s in summaries:
        coverage = s["coverage_when_available"]
        value = "Unavailable" if coverage["fraction"] is None else f"{100*coverage['fraction']:.1f}% [{100*coverage['mc95_low']:.1f}, {100*coverage['mc95_high']:.1f}]"
        lines.append(f"| {s['scenario']} | {s['analysis']} | {s['parameter']} | {s['interval_availability']['count']}/{s['simulations']} | {value} |")
    lines += ["", "## Advanced Noisy Fits", "", "Both identifiable and weak regimes are included. Starts are explicitly near the generating values: this isolates local recovery/uncertainty behavior, not blind global-search performance. Component labels are matched by affinity order for heterogeneous fits. No failed, timed-out or unresolved interval is removed from the requested-fit counts.", "",
              "| Design | Parameter | Available | Coverage when available | Relative bias |", "| --- | --- | --- | --- | --- |"]
    for s in advanced_summary:
        if s["parameter"] == "Rmax" or s["parameter"] == "Rmax2":
            continue
        fraction = s["coverage_when_available"]["fraction"]
        value = "Unavailable" if fraction is None else f"{100*fraction:.1f}%"
        bias = "Unavailable" if s["mean_relative_bias"] is None else f"{100*s['mean_relative_bias']:.2f}%"
        lines.append(f"| {s['scenario']} | {s['parameter']} | {s['interval_availability']['count']}/{s['simulations']} | {value} | {bias} |")
    lines += ["", f"Monte Carlo intervals, raw estimates, failed/unresolved fits, local precision flags, biases, errors and held-out prediction errors are retained in the machine-readable evidence. {args.advanced_repeats} runs per advanced regime are an initial diagnostic screen, not precise coverage calibration. Available local diagnostic intervals can still have weak precision; their availability does not imply eligibility for routine repeat summaries. No thresholds or parameter bounds were tuned to the outcomes.", ""]
    (args.output/"RESULTS.md").write_text("\n".join(lines))
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
