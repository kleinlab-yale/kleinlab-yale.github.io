"""Reproduce the MCAM transport benchmark from the six bundled source CSVs."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mixa_mechanisms import (
    binding_prediction, contact_closure_transport_limit_rules,
    cross_validate_omitted_concentration, derived_affinities, fit_mechanism,
)
from mixa_science import json_safe

REFERENCE = ROOT/"validation/contact_transport/reference.json"
MODEL = "contact_closure_transport_limit"


def load_curves(rows):
    curves = []
    for row in rows:
        path = ROOT/row["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest()==row["sha256"], f"Changed source CSV: {path}"
        with path.open() as stream:
            data = list(csv.reader(stream))
        headers, values = data[0], np.array(data[1:], dtype=float)
        times = values[:, 0]
        selected = (times>=row["selected_start"]) & (times<=row["selected_end"])
        assert selected.sum()==row["n_per_curve"]
        for concentration in row["concentrations_nM"]:
            column = next(j for j in range(1, len(headers)) if float(headers[j].split()[0])==concentration)
            curves.append(dict(
                filename=path.name, repeat_id=row["repeat_id"], time=times[selected].copy(),
                response=values[selected, column].copy(), fit_mask=np.ones(int(selected.sum()), dtype=bool),
                concentration_nM=concentration, concentration_M=concentration*1e-9,
                on=row["on"], off=row["off"],
            ))
    return curves


def run(skip_cv=False):
    reference = json.loads(REFERENCE.read_text())
    output = dict(model=MODEL, csv_hashes_verified=6,
                  engine_sha256=hashlib.sha256((ROOT/"mixa_mechanisms.py").read_bytes()).hexdigest(),
                  selection="Reviewed concentration ranges; 250 nM LM411 remains excluded and available for a separately labeled sensitivity run.",
                  constructs={})
    for label, rows in reference["selection"].items():
        curves = load_curves(rows)
        rules = contact_closure_transport_limit_rules("LM411" if label=="lm411" else "LamA4G123")
        fit = fit_mechanism(curves, MODEL, rules, starts=5, max_nfev=500, seed=20261102,
                            compute_input_uncertainty=False)
        expected = reference["pooled"][label]
        rmse = float(np.sqrt(fit["rss"]/fit["n_observations"]))
        assert fit["n_observations"]==expected["n_observations"]
        assert fit["n_parameters"]==expected["n_parameters"]==15
        assert fit["n_profiled_parameters"]==3
        assert np.isclose(rmse, expected["rmse"], rtol=.01)
        for filename in {c["filename"] for c in fit["curves"]}:
            assert len({c["parameters"]["Rmax"] for c in fit["curves"] if c["filename"]==filename})==1
        errors = []
        for curve in fit["curves"]:
            sampled = curve["time"][::20]
            lsoda = binding_prediction(sampled, curve["concentration_M"], curve["on"], curve["off"],
                                       curve["parameters"], MODEL, rtol=1e-9)
            radau = binding_prediction(sampled, curve["concentration_M"], curve["on"], curve["off"],
                                       curve["parameters"], MODEL, integration_method="Radau", rtol=1e-9)
            errors.append(float(np.max(np.abs(lsoda-radau))))
        assert max(errors)<1e-6
        record = dict(rss=fit["rss"], rmse_nm=rmse, n_observations=fit["n_observations"],
                      n_parameters=fit["n_parameters"], n_outer_free_parameters=fit["n_outer_free_parameters"],
                      n_profiled_parameters=fit["n_profiled_parameters"], values=fit["values"],
                      affinities=derived_affinities(fit).to_dict("records"),
                      boundary_parameters=fit["boundary_parameters"], optimizer_settings=fit["optimizer_settings"],
                      max_lsoda_radau_difference_nm=max(errors))
        if not skip_cv:
            cv = cross_validate_omitted_concentration(curves, rules, starts=5, max_nfev=500, seed=20261102)
            assert np.isclose(cv["pooled_cv_rmse_nm"], expected["cv_rmse"], rtol=.02)
            record["internal_omitted_concentration_prediction"] = cv
        output["constructs"][label] = record
        print(label, "RMSE", round(rmse, 8), "CV", record.get("internal_omitted_concentration_prediction", {}).get("pooled_cv_rmse_nm", "not run"), flush=True)
    return output


if __name__=="__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-cv", action="store_true", help="Run full-data and solver checks without omitted-dose refits.")
    parser.add_argument("--output", type=Path, default=ROOT/"validation/contact_transport/results.json")
    arguments = parser.parse_args()
    results = run(arguments.skip_cv)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(json_safe(results), indent=2, allow_nan=False))
    print("PASS: source hashes, shared capacities, parameter counts, residual reproduction and independent solver checks.")
