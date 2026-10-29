"""Reproducible synthetic noise coverage check, not an instrument benchmark."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from scipy import stats

from mixa_mechanisms import binding_prediction, derived_affinities, fit_mechanism, parameter_defaults
from mixa_science import json_safe


def run(repeats=200):
    rng = np.random.default_rng(47017)
    t = np.arange(0., 181., 2.)
    rules = parameter_defaults("langmuir")
    truth = {rule.key: rule.initial for rule in rules}
    true_values = {"kon": truth["kon"], "koff": truth["koff"], "KD_nM": truth["koff"] / truth["kon"] * 1e9}
    rho, noise_sd = .85, .2
    tau = -2 / np.log(rho)
    mask = ((t >= 32) & (t <= 90)) | ((t >= 110) & (t <= 160))
    clean = {c: binding_prediction(t, c * 1e-9, 20., 100., truth) for c in [5., 15., 50., 150., 500.]}
    rows = []
    for simulation in range(repeats):
        curves = []
        for concentration, signal in clean.items():
            innovations = rng.normal(0., noise_sd, len(t))
            noise = innovations.copy()
            for i in range(1, len(t)):
                noise[i] = rho * noise[i - 1] + np.sqrt(1 - rho**2) * innovations[i]
            curves.append(dict(filename="synthetic", repeat_id="one experiment", concentration_nM=concentration,
                               concentration_M=concentration * 1e-9, time=t, response=signal + noise,
                               fit_mask=mask, on=20., off=100.))
        for method, correlation_time in [("IID", 0.), ("Fixed true OU", tau)]:
            try:
                fit = fit_mechanism(curves, "langmuir", rules, starts=1, correlation_time=correlation_time)
                parameters = fit["parameter_table"].set_index("parameter")
                kd = derived_affinities(fit).iloc[0]
                threshold = stats.t.ppf(.975, fit["degrees_of_freedom"])
                for metric, value, se in [(key, parameters.loc[key, "value"], parameters.loc[key, "model_se"]) for key in ["kon", "koff"]] + [("KD_nM", kd.value, kd.model_se)]:
                    available = bool(np.isfinite(se) and se > 0 and not fit["boundary_parameters"])
                    rows.append(dict(simulation=simulation, method=method, parameter=metric, estimate=value,
                                     conditional_se=se, truth=true_values[metric], interval_available=available,
                                     covered=abs(value - true_values[metric]) <= threshold * se if available else False,
                                     status=fit["covariance_status"]))
            except (RuntimeError, ValueError) as exc:
                for metric in true_values:
                    rows.append(dict(simulation=simulation, method=method, parameter=metric, estimate=np.nan,
                                     conditional_se=np.nan, truth=true_values[metric], interval_available=False,
                                     covered=False, status=str(exc)))
    table = pd.DataFrame(rows)
    summary = []
    for (method, metric), group in table.groupby(["method", "parameter"], sort=False):
        eligible = group.loc[group.interval_available]
        summary.append(dict(method=method, parameter=metric, simulations=repeats, intervals_available=len(eligible),
                            coverage_conditional_on_available=float(eligible.covered.mean()) if len(eligible) else None,
                            mean_relative_estimation_error=float((eligible.estimate / eligible.truth - 1).mean()) if len(eligible) else None))
    directory = ROOT / "preview" / "mechanistic_validation"
    directory.mkdir(parents=True, exist_ok=True)
    table.to_csv(directory / "coverage_simulations.csv", index=False)
    evidence = dict(created_utc=datetime.now(timezone.utc).isoformat(), coverage=summary,
                    assumptions=dict(model="1:1", stationary_noise_rho=rho, marginal_noise_sd=noise_sd,
                                     sampling_interval_s=2., supplied_true_correlation_time_s=tau,
                                     selected_intervals_s=[[32, 90], [110, 160]],
                                     baseline="Known zero; no estimated normalization or control subtraction", concentrations_nM=list(clean)),
                    limitations="Synthetic, correctly specified 1:1 and OU noise only; supplying the true noise correlation is not estimating it. Not validation of complex-model identifiability, coverage, shared controls, or a real SPR/BLI instrument.",
                    code_sha256={name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                                 for name in ["mixa_mechanisms.py", "mixa_science.py", "audits/mechanistic_validation.py"]})
    (directory / "results.json").write_text(json.dumps(json_safe(evidence), indent=2, allow_nan=False) + "\n")
    print(json.dumps(evidence["coverage"], indent=2))
    print(directory)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeats", type=int, default=200)
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be positive")
    run(args.repeats)
