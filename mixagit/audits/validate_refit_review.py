"""Known-truth refit intervals and blind-start advanced recovery; retain failures."""

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

from audits.validate_input_uncertainty import advanced_cases, true_affinities
from audits.validate_methods import probability_summary
from mixa_data import APP_VERSION
from mixa_inference import adaptive_profile, estimates, refit_sampling, review_problem
from mixa_mechanisms import binding_prediction, fit_mechanism, parameter_defaults
from mixa_science import json_safe
from validation.reference_simulator import simulate, stationary_noise


SEED = 10202026
SOURCES = ["mixa_inference.py", "mixa_mechanisms.py", "mixa_science.py", "mixa_uncertainty.py",
           "mixa_input_uncertainty.py", "mixa_automation.py", "mixa_data.py"]
SOURCE_HASHES = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCES}
VALIDATION_HASHES = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in [
    "audits/validate_refit_review.py", "validation/reference_simulator.py", "audits/validate_input_uncertainty.py",
    "audits/validate_methods.py"]}


def calibration_case(scenario, replicate):
    rng = np.random.default_rng(np.random.SeedSequence([SEED, 1, scenario, replicate]))
    t = np.arange(0., 181., 4.)
    truth = dict(kon=1.2e5, koff=.012, Rmax=90.)
    tau = 5. if scenario == 1 else 0.
    sd, control_sd, stock_cv = .2, .25 if scenario == 2 else 0., .1 if scenario == 2 else 0.
    stock = np.exp(rng.normal(0., np.sqrt(np.log1p(stock_cv**2))))
    reference = stationary_noise(rng, t, control_sd)
    curves = []
    for concentration in [15., 50., 150., 500.]:
        raw = simulate(t, concentration*1e-9*stock, 20., 100., truth)+stationary_noise(rng, t, sd, tau)
        corrected = raw-reference
        c = dict(filename="samples", repeat_id="R1", time=t, concentration_nM=concentration,
                 concentration_M=concentration*1e-9, on=20., off=100., relative_sd=1.,
                 response=corrected-np.median(corrected[t < 20.]), fit_mask=((t >= 28.) & (t <= 92.)) | ((t >= 112.) & (t <= 172.)),
                 baseline_estimated=True, baseline_reference_times=t[t < 20.], baseline_mask=t < 20.)
        if scenario == 2:
            c["input_uncertainty_options"] = dict(propagate_measurement=True, stock_cv=stock_cv)
            c["measurement_sources"] = [
                dict(id=f"sample_{concentration:g}", filename="samples", role="Sample", concentration_nM=concentration,
                     time=t, response=raw, weight=1., noise_sd=sd),
                dict(id="shared_zero_control", filename="control", role="Negative control", concentration_nM=0.,
                     time=t, response=reference, weight=-1., noise_sd=control_sd)]
        curves.append(c)
    rules = [replace(r, scope="Global") if r.key == "Rmax" else r for r in parameter_defaults("langmuir")]
    fit = fit_mechanism(curves, "langmuir", rules, starts=2, correlation_time=tau,
                        compute_input_uncertainty=False, runtime_s=30.)
    return fit, truth


def interval_benchmarks(repeats, draws):
    rows, runs = [], []
    for scenario, name in enumerate(["measured_baseline_IID", "measured_baseline_OU", "shared_control_and_stock"]):
        for replicate in range(repeats):
            fit, truth, payload, error = None, dict(kon=1.2e5, koff=.012, Rmax=90.), None, ""
            try:
                fit, truth = calibration_case(scenario, replicate)
                payload = refit_sampling(review_problem(fit), draws=draws, starts=1, runtime_s=90., per_fit_s=3.,
                                         seed=SEED+scenario*100000+replicate)
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                error = str(exc)
            runs.append(dict(scenario=name, replicate=replicate, error=error,
                             metadata=payload["metadata"] if payload else None,
                             draws=payload["runs"].to_dict("records") if payload else []))
            for parameter, actual in [("kon", truth["kon"]), ("koff", truth["koff"]), ("KD_nM", truth["koff"]/truth["kon"]*1e9)]:
                key = parameter+"::all" if parameter != "KD_nM" else "KD_nM::kon::all|koff::all"
                value = low = high = np.nan
                status = error or "Unavailable"
                if payload is not None:
                    record = payload["summary"].set_index("estimate").loc[key]
                    value, low, high, status = record.point_estimate, record.interval95_low, record.interval95_high, record.status
                available = bool(np.isfinite([low, high]).all())
                rows.append(dict(scenario=name, replicate=replicate, parameter=parameter, truth=actual, estimate=value,
                                 low=low, high=high, available=available, covered=bool(low <= actual <= high) if available else False,
                                 status=status))
            if (replicate+1) % 10 == 0:
                print(f"Nonlinear intervals: {name}, {replicate+1}/{repeats}", flush=True)
    return pd.DataFrame(rows), runs


def blind_benchmarks(repeats, runtime):
    t = np.arange(0., 401., 6.)
    mask = ((t >= 28.) & (t <= 132.)) | ((t >= 156.) & (t <= 396.))
    rows, runs = [], []
    for index, (name, model, transport, truth, sd) in enumerate(advanced_cases()):
        clean = {c: simulate(t, c*1e-9, 20., 140., truth, model, transport) for c in [5., 20., 80., 320., 1250., 5000.]}
        held = simulate(t, 150e-9, 20., 140., truth, model, transport)
        for replicate in range(repeats):
            rng = np.random.default_rng(np.random.SeedSequence([SEED, 2, index, replicate]))
            curves = [dict(filename="blind", repeat_id="R1", time=t, on=20., off=140., concentration_nM=c,
                           concentration_M=c*1e-9, response=y+stationary_noise(rng, t, sd), fit_mask=mask,
                           relative_sd=1.) for c, y in clean.items()]
            scale = max(np.ptp(c["response"][mask]) for c in curves)
            # Free starting values are the same software defaults for every truth design.
            rules = parameter_defaults(model, scale, transport)
            rules = [replace(r, initial=truth["response_to_M"]) if r.key == "response_to_M" else r for r in rules]
            fit, error, started = None, "", time.perf_counter()
            try:
                fit = fit_mechanism(curves, model, rules, transport, starts=3, start_strategy="broad",
                                    max_nfev=600, runtime_s=runtime, seed=SEED+replicate,
                                    compute_input_uncertainty=False)
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                error = str(exc)
            record = dict(scenario=name, replicate=replicate, model=model, transport=transport, converged=fit is not None,
                initial_values={r.key: r.initial for r in rules}, fixed_parameters={r.key: r.initial for r in rules if r.fixed},
                search_strategy="Software-default first start, two broad log-space starts within +/-2 decades of defaults",
                runtime_s=runtime, elapsed_s=time.perf_counter()-started, error=error,
                timed_out=fit["timed_out"] if fit else None, boundaries=fit["boundary_parameters"] if fit else [],
                multistart=fit["multistart"].to_dict("records") if fit else [], parameter_estimates=fit["values"] if fit else {},
                held_out_clean_rmse=np.nan)
            if fit:
                pred = binding_prediction(t, 150e-9, 20., 140., fit["curves"][0]["parameters"], model, transport)
                record["held_out_clean_rmse"] = float(np.sqrt(np.mean((pred-held)**2)))
            runs.append(record)
            actuals = {**truth, **true_affinities(model, truth)}
            if model == "heterogeneous":
                affinities = sorted([truth["koff"]/truth["kon"]*1e9, truth["koff2"]/truth["kon2"]*1e9])
                actuals = dict(KD_lower_population_nM=affinities[0], KD_higher_population_nM=affinities[1])
            if fit:
                table = estimates(review_problem(fit), fit["values"])
                measured = {r.estimate.split("::")[0]: r.value for r in table.itertuples()}
            else:
                measured = {}
            for parameter, actual in actuals.items():
                if parameter == "response_to_M":
                    continue
                value = measured.get(parameter, np.nan)
                rows.append(dict(scenario=name, replicate=replicate, parameter=parameter, truth=actual, estimate=value,
                                 relative_error=value/actual-1, converged=fit is not None,
                                 complete_search=bool(fit and not fit["timed_out"]), held_out_clean_rmse=record["held_out_clean_rmse"]))
        print(f"Blind starts: {name}, {repeats} requested", flush=True)
    return pd.DataFrame(rows), runs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--coverage-repeats", type=int, default=60)
    parser.add_argument("--draws", type=int, default=240)
    parser.add_argument("--blind-repeats", type=int, default=3)
    parser.add_argument("--blind-runtime", type=float, default=15.)
    parser.add_argument("--output", type=Path, default=ROOT/"validation"/"refit_review")
    args = parser.parse_args()
    if args.coverage_repeats < 1 or args.draws < 200 or args.blind_repeats < 1:
        parser.error("Positive experiment counts and at least 200 simulation draws are required.")
    intervals, interval_runs = interval_benchmarks(args.coverage_repeats, args.draws)
    blind, blind_runs = blind_benchmarks(args.blind_repeats, args.blind_runtime)
    summaries = []
    for (scenario, parameter), group in intervals.groupby(["scenario", "parameter"], sort=False):
        selected = group.loc[group.available]
        summaries.append(dict(scenario=scenario, parameter=parameter,
            availability=probability_summary(int(group.available.sum()), len(group)),
            coverage_when_available=probability_summary(int(selected.covered.sum()), len(selected)),
            coverage_all_requested=probability_summary(int(group.covered.sum()), len(group)),
            mean_relative_bias=float((group.estimate/group.truth-1).mean())))
    args.output.mkdir(parents=True, exist_ok=True)
    intervals.to_csv(args.output/"intervals.csv", index=False)
    blind.to_csv(args.output/"blind_estimates.csv", index=False)
    for name, records in [("simulation_runs.json", interval_runs), ("blind_runs.json", blind_runs)]:
        (args.output/name).write_text(json.dumps(json_safe(records), indent=2, allow_nan=False)+"\n")
    record = dict(version=APP_VERSION, created_utc=datetime.now(timezone.utc).isoformat(), seed=SEED,
        protocol=dict(coverage_experiments_per_scenario=args.coverage_repeats, scenarios=3, inner_draws=args.draws,
                      blind_experiments_per_scenario=args.blind_repeats, blind_scenarios=10, blind_runtime=args.blind_runtime),
        production_code_sha256=SOURCE_HASHES, validation_code_sha256=VALIDATION_HASHES, summaries=summaries,
        blind_completed=sum(bool(r["converged"] and not r["timed_out"]) for r in blind_runs),
        blind_requested=len(blind_runs),
        scope="Prespecified known-truth Gaussian IID/OU and shared-zero-control/common-stock simulations. Noise SDs and phase times are supplied correctly. Source-level draws and finite median preprocessing are refitted. Blind starts use defaults, not truth-derived free starts; one fixed response-to-M calibration remains a known input. No threshold tuning, automatic model-selection coverage or experimental SPR/BLI validation is claimed.")
    names = ["intervals.csv", "blind_estimates.csv", "simulation_runs.json", "blind_runs.json"]
    record["raw_sha256"] = {name: hashlib.sha256((args.output/name).read_bytes()).hexdigest() for name in names}
    (args.output/"results.json").write_text(json.dumps(json_safe(record), indent=2, allow_nan=False)+"\n")
    lines = ["# Nonlinear Refit and Blind-Start Results", "", "Generated: "+record["created_utc"], "", record["scope"], "",
             "## Nonlinear Interval Coverage", "", "Counts retain all requested experiments. Brackets are Wilson 95% Monte Carlo intervals, not binding-parameter intervals.", "",
             "| Design | Parameter | Available | Coverage when available [MC 95%] |", "| --- | --- | --- | --- |"]
    for summary in summaries:
        a, c = summary["availability"], summary["coverage_when_available"]
        value = "Unavailable" if c["fraction"] is None else f"{100*c['fraction']:.1f}% [{100*c['mc95_low']:.1f}, {100*c['mc95_high']:.1f}]"
        lines.append(f"| {summary['scenario']} | {summary['parameter']} | {a['count']}/{a['n']} | {value} |")
    lines += ["", "## Blind Advanced Starts", "", f"Completed all three requested starts: {record['blind_completed']}/{record['blind_requested']}. Every failed/timed-out fit remains in raw records. Free starts are software defaults plus broad exploration, not generating values. Small per-regime counts screen optimization behavior; they do not calibrate advanced interval coverage.", "",
              "| Design | Requested | Converged | Complete search | Median held-out clean RMSE |", "| --- | --- | --- | --- | --- |"]
    for scenario in dict.fromkeys(r["scenario"] for r in blind_runs):
        selected = [r for r in blind_runs if r["scenario"] == scenario]
        finite = [r["held_out_clean_rmse"] for r in selected if np.isfinite(r["held_out_clean_rmse"])]
        value = f"{np.median(finite):.4g}" if finite else "Unavailable"
        lines.append(f"| {scenario} | {len(selected)} | {sum(r['converged'] for r in selected)} | {sum(r['converged'] and not r['timed_out'] for r in selected)} | {value} |")
    lines += ["", "See intervals.csv and blind_estimates.csv for all parameter estimates, biases, missing intervals and failures. Good response prediction does not imply resolved individual rates. No benchmark-derived thresholds or exclusions were applied.", ""]
    (args.output/"RESULTS.md").write_text("\n".join(lines))
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
