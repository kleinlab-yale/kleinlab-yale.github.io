"""Explicitly rebuild bundled demonstration caches from the original CSVs."""
import argparse
import base64
from dataclasses import asdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import pickle
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mixa_data import (APP_VERSION, load_bundled_mcam_lm411_kinetics_datasets,
                       load_bundled_mcam_lama4g123_kinetics_datasets, prepare_experiment, smart_predict_design)
from mixa_mechanisms import contact_closure_transport_limit_rules, fit_mechanism, prepare_curves, refit_independent_repeats


def rebuild(write=False):
    reference = json.loads((ROOT/"validation/contact_transport/reference.json").read_text())
    outputs = []
    for label, loader, dataset, folder, stem in [
        ("lm411", load_bundled_mcam_lm411_kinetics_datasets, "LM411", "kinetics_MCAM_LM411", "mcam_lm411_two_site_fit"),
        ("g123", load_bundled_mcam_lama4g123_kinetics_datasets, "LamA4G123", "kinetics_MCAM_LamA4G123", "mcam_lama4g123_two_site_fit"),
    ]:
        rows = reference["selection"][label]
        for row in rows:
            assert hashlib.sha256((ROOT/row["path"]).read_bytes()).hexdigest()==row["sha256"]
        raw = loader()
        design = smart_predict_design(raw, experiment_name=dataset)
        prepared, _ = prepare_experiment(raw, design, dataset, align_phases=False)
        included = {Path(row["path"]).name: set(row["concentrations_nM"]) for row in rows}
        on, off = rows[0]["on"], rows[0]["off"]
        end = max(row["selected_end"] for row in rows)
        windows = dict(phase_assoc_start_s=on, phase_dissoc_start_s=off, fit_assoc_start_s=on,
                       fit_assoc_end_s=off, fit_dissoc_start_s=off, fit_dissoc_end_s=end)
        curves = prepare_curves(prepared, included, windows, normalize=False)
        rules = contact_closure_transport_limit_rules(dataset)
        result = fit_mechanism(curves, "contact_closure_transport_limit", rules, starts=5, max_nfev=500, seed=20261102)
        expected = reference["pooled"][label]
        assert np.isclose(result["rss"], expected["rss"], rtol=.01)
        assert result["n_parameters"]==15 and result["n_observations"]==expected["n_observations"]
        result.update(created_utc=datetime.now(timezone.utc).isoformat(),
                      recipe=dict(version=APP_VERSION, model="contact_closure_transport_limit", transport="None",
                                  windows=windows, normalize=False, parameters=[asdict(rule) for rule in rules],
                                  starts=5, max_nfev=500, seed=20261102, start_strategy="local",
                                  include_map={name: sorted(values) for name, values in included.items()}),
                      source_csv_sha256={row["path"]: row["sha256"] for row in rows},
                      fitting_engine_sha256=hashlib.sha256((ROOT/"mixa_mechanisms.py").read_bytes()).hexdigest())
        result["repeat_report"] = refit_independent_repeats(result["curves"], result, starts=5)
        path = ROOT/"data"/folder/(stem+".b64.txt")
        if write:
            payload = pickle.dumps(result, protocol=4)
            path.write_text(base64.b64encode(payload).decode())
            # Keep an already-tracked native copy in sync, without requiring
            # that redundant binary format in the deployable source package.
            native = path.with_name(stem+".pkl")
            if native.is_file():
                native.write_bytes(payload)
        outputs.append(dict(dataset=dataset, path=str(path.relative_to(ROOT)), rss=result["rss"],
                            n_parameters=result["n_parameters"], written=write))
        print(dataset, "RSS", result["rss"], "cache written" if write else "verified; cache unchanged", flush=True)
    return outputs


if __name__=="__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Replace the two bundled base64 caches after verification.")
    rebuild(parser.parse_args().write)
