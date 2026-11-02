"""Prespecified calibration, performance and joint-repeat validation evidence."""

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

from audits.validate_methods import probability_summary
from audits.validate_refit_review import blind_benchmarks, calibration_case
from audits.validate_input_uncertainty import advanced_cases
from mixa_calibration import calibrated_profile
from mixa_data import APP_VERSION
from mixa_inference import review_problem
from mixa_joint import JointPriors, fit_joint
from mixa_mechanisms import binding_prediction, fit_mechanism, parameter_defaults
from mixa_science import json_safe
from validation.reference_simulator import simulate, stationary_noise


SEED = 20362026


def hashes(names):
    return {n: hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in names}


def calibration(args):
    rows, runs = [], []
    names = ["measured_baseline_IID", "measured_baseline_OU", "shared_control_and_stock"]
    for scenario, name in enumerate(names):
        for replicate in range(args.repeats):
            payload, error = None, ""
            try:
                # Disjoint outer experiments from the previous 0.5.9 study.
                fit, truth = calibration_case(scenario, replicate+10000)
                payload = calibrated_profile(review_problem(fit), "KD_nM::kon::all|koff::all",
                    draws=args.draws, runtime_s=args.runtime, per_fit_s=3., seed=SEED+scenario*100000+replicate)
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                error = str(exc)
            meta = payload["metadata"] if payload else {}
            low, high = meta.get("lower"), meta.get("upper")
            available = low is not None and high is not None
            rows.append(dict(scenario=name, replicate=replicate, truth=100., estimate=meta.get("estimate"),
                low=low, high=high, available=available, covered=bool(low <= 100. <= high) if available else False,
                critical_value=meta.get("critical_value"), error=error))
            runs.append(dict(scenario=name, replicate=replicate, metadata=meta, error=error,
                calibration_runs=payload["calibration_runs"].to_dict("records") if payload else [],
                profile=payload["profile"].to_dict("records") if payload else [],
                searches=payload["searches"].to_dict("records") if payload else []))
            if (replicate+1) % 10 == 0:
                print(f"Calibrated KD: {name} {replicate+1}/{args.repeats}", flush=True)
    table = pd.DataFrame(rows)
    summaries = []
    for name, group in table.groupby("scenario", sort=False):
        available = group.loc[group.available]
        summaries.append(dict(scenario=name, availability=probability_summary(int(group.available.sum()), len(group)),
            coverage_when_available=probability_summary(int(available.covered.sum()), len(available)),
            coverage_all_requested=probability_summary(int(group.covered.sum()), len(group))))
    return dict(intervals=table), runs, dict(summaries=summaries,
        scope="Three prespecified independent known-truth designs; fresh outer seeds disjoint from 0.5.9. Target-specific critical values are calculated solely from each fitted dataset's simulated experiments. No benchmark-tuned thresholds, interval inflation or discarded failed experiments. Rates/other mechanisms are not coverage-calibrated by this KD-only study.")


def performance(args):
    rows, runs = blind_benchmarks(args.repeats, args.runtime)
    accuracy = []
    t = np.arange(0., 401., 6.)
    for name, model, transport, truth, sd in advanced_cases():
        for concentration in [5., 80., 1250., 5000.]:
            reference = simulate(t, concentration*1e-9, 20., 140., truth, model, transport)
            started = time.perf_counter()
            pred = binding_prediction(t, concentration*1e-9, 20., 140., truth, model, transport)
            elapsed = time.perf_counter()-started
            started = time.perf_counter()
            radau = binding_prediction(t, concentration*1e-9, 20., 140., truth, model, transport, integration_method="Radau")
            slow_elapsed = time.perf_counter()-started
            accuracy.append(dict(scenario=name, concentration_nM=concentration,
                maximum_reference_error=float(np.max(np.abs(pred-reference))),
                maximum_radau_difference=float(np.max(np.abs(pred-radau))),
                prediction_s=elapsed, radau_s=slow_elapsed,
                radau_ratio=slow_elapsed/max(elapsed, 1e-12)))
    return dict(blind_estimates=rows, prediction_accuracy=pd.DataFrame(accuracy)), runs, dict(
        converged=sum(r["converged"] for r in runs), complete_search=sum(r["converged"] and not r["timed_out"] for r in runs),
        requested=len(runs), scope="Same ten prespecified designs, independent reaction-network generator, software-default plus two broad free starts, same seeds and 30-second budget as 0.5.9 when --runtime 30 is used. One effective response-to-M transport calibration remains supplied. Prediction timings are single-call descriptive measurements, not a hardware-normalized speed guarantee. Radau and LSODA coincide on analytic paths. Prediction accuracy is separate from parameter resolution.")


def joint_case(repeats, replicate, shared=True):
    rng = np.random.default_rng(np.random.SeedSequence([SEED, 99, repeats, replicate]))
    t = np.arange(0., 185., 8.)
    population = np.log([1.2e5, .012])
    covariance = np.array([[.15**2, .4*.15*.12], [.4*.15*.12, .12**2]])
    rates = rng.multivariate_normal(population, covariance, repeats)
    stock_cv, level_cv = (.1, .03) if shared else (0., 0.)
    stock = np.exp(rng.normal(0., np.sqrt(np.log1p(stock_cv**2))))
    levels = {c: np.exp(rng.normal(0., np.sqrt(np.log1p(level_cv**2)))) for c in [15., 50., 150., 500.]}
    control_sd, sample_sd = .1 if shared else 0., .3
    control = stationary_noise(rng, t, control_sd)
    curves = []
    for repeat in range(repeats):
        for concentration, level in levels.items():
            truth = dict(kon=np.exp(rates[repeat, 0]), koff=np.exp(rates[repeat, 1]), Rmax=80.+5*repeat)
            raw = simulate(t, concentration*1e-9*stock*level, 20., 100., truth)+stationary_noise(rng, t, sample_sd)
            corrected = raw-control
            offset = float(np.median(corrected[t < 20.]))
            curve = dict(filename=f"sample_{repeat}", repeat_id=f"R{repeat+1}", time=t, on=20., off=100.,
                concentration_nM=concentration, concentration_M=concentration*1e-9, response=corrected-offset,
                baseline_offset=offset, baseline_estimated=True, baseline_reference_times=t[t < 20.],
                fit_mask=((t >= 28.) & (t <= 92.)) | ((t >= 112.) & (t <= 176.)))
            if shared:
                curve["input_uncertainty_options"] = dict(propagate_measurement=True, stock_cv=stock_cv, level_cv=level_cv)
                curve["measurement_sources"] = [
                    dict(id=f"s{repeat}_{concentration}", filename=f"sample_{repeat}", concentration_nM=concentration,
                         role="Sample", time=t, response=raw, weight=1., noise_sd=sample_sd),
                    dict(id="shared_control", filename="control", concentration_nM=0., role="Negative control",
                         time=t, response=control, weight=-1., noise_sd=control_sd)]
            curves.append(curve)
    rules = parameter_defaults("langmuir")
    fit = fit_mechanism(curves, "langmuir", rules, starts=2, runtime_s=30., compute_input_uncertainty=False)
    return fit, dict(population_median_kon=1.2e5, population_median_koff=.012, population_median_KD_nM=100.,
                     between_log_sd_kon=.15, between_log_sd_koff=.12, between_rate_correlation=.4)


def joint(args):
    rows, runs, tables = [], [], []
    for independent in [3, 6]:
        for replicate in range(args.repeats):
            payload, error = None, ""
            try:
                fit, truth = joint_case(independent, replicate)
                payload = fit_joint(fit, priors=replace(JointPriors(), between_log_sd_scale=.5, baseline_sd=20.),
                    warmup=args.warmup, draws=args.draws, runtime_s=args.runtime, seed=SEED+independent*100+replicate)
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                error = str(exc)
            runs.append(dict(independent_repeats=independent, replicate=replicate, error=error,
                metadata=payload["metadata"] if payload else {}, chains=payload["chains"].to_dict("records") if payload else [],
                diagnostics=payload["diagnostics"].to_dict("records") if payload else []))
            if payload is not None and not payload["summary"].empty:
                table = payload["summary"].copy()
                table.insert(0, "replicate", replicate)
                table.insert(0, "independent_repeats", independent)
                tables.append(table)
            for key, actual in [("population_median_kon", 1.2e5), ("population_median_koff", .012), ("population_median_KD_nM", 100.)]:
                record = {} if payload is None or payload["summary"].empty else payload["summary"].set_index("estimate").loc[key].to_dict()
                available = record.get("status") == "Available"
                rows.append(dict(independent_repeats=independent, replicate=replicate, parameter=key, truth=actual,
                    **record, available=available,
                    covered=bool(record["interval95_low"] <= actual <= record["interval95_high"]) if available else False))
            print(f"Joint repeats={independent}, dataset {replicate+1}/{args.repeats}: {error or 'recorded'}", flush=True)
    return dict(intervals=pd.DataFrame(rows), all_parameters=pd.concat(tables, ignore_index=True) if tables else pd.DataFrame()), runs, dict(
        scope="Prespecified nonlinear response-level 1:1 hierarchical studies with 3/6 independent repeats, reused zero control, 10% common stock and 3% shared concentration-level uncertainty. Population parameters are fixed truth; random repeat rates are generated independently. Small outer counts assess recovery, computational diagnostics and interval availability; they are not nominal-coverage certification. Fixed source SD ratios and OU times, priors, seeds and every incomplete chain are retained. No fitted-rate averages are used as likelihood observations.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("section", choices=["calibration", "performance", "joint"])
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--draws", type=int, default=400)
    parser.add_argument("--warmup", type=int, default=2000)
    parser.add_argument("--runtime", type=float, default=30.)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.repeats < 1 or args.runtime <= 0:
        parser.error("Positive dataset counts and runtimes are required.")
    paths = ["mixa_mechanisms.py", "mixa_science.py", "mixa_uncertainty.py", "mixa_input_uncertainty.py"]
    if args.section == "calibration":
        paths += ["mixa_calibration.py", "mixa_inference.py"]
    if args.section == "joint":
        paths += ["mixa_joint.py", "mixa_inference.py"]
    source_hashes = hashes(paths)
    tables, runs, summary = globals()[args.section](args)
    destination = args.output or ROOT/"validation"/f"frontier_{args.section}"
    destination.mkdir(parents=True, exist_ok=True)
    for name, table in tables.items():
        table.to_csv(destination/f"{name}.csv", index=False)
    (destination/"runs.json").write_text(json.dumps(json_safe(runs), indent=2, allow_nan=False)+"\n")
    record = dict(version=APP_VERSION, section=args.section, created_utc=datetime.now(timezone.utc).isoformat(),
        seed=SEED, protocol={k: v for k, v in vars(args).items() if k != "output"},
        production_code_sha256=source_hashes, validation_code_sha256=hashes([
            "audits/validate_frontier.py", "audits/validate_refit_review.py", "audits/validate_input_uncertainty.py", "validation/reference_simulator.py"]),
        **summary, raw_sha256=hashes([]))
    record["raw_sha256"] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.iterdir() if p.suffix == ".csv" or p.name == "runs.json"}
    (destination/"results.json").write_text(json.dumps(json_safe(record), indent=2, allow_nan=False)+"\n")
    (destination/"RESULTS.md").write_text("# MIXA "+args.section.title()+" Validation\n\n"+record["scope"]+"\n\n```json\n"+
        json.dumps(json_safe({k: v for k, v in summary.items() if k != "scope"}), indent=2, allow_nan=False)+"\n```\n")
    print(destination, flush=True)


if __name__ == "__main__":
    main()
