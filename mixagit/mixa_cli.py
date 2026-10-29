"""Headless command-line and scriptable Python API runner for MIXA."""

import argparse
import json
import logging
from pathlib import Path
import sys

for _logger_name in ["streamlit", "streamlit.runtime.scriptrunner_utils.script_run_context"]:
    logging.getLogger(_logger_name).setLevel(logging.ERROR)

import numpy as np
import pandas as pd

from mixa_data import (
    APP_VERSION,
    example_project,
    prepare_experiment,
    read_dataset,
    smart_predict_design,
)
from mixa_mechanisms import (
    derived_affinities,
    fit_mechanism,
    mechanistic_to_kinetic_summary,
    parameter_defaults,
    prepare_curves,
)
from mixa_methods import source_code_sha256
from mixa_reporting import summarize_repeats
from mixa_science import json_safe
from mixa_selection import detect_binding_phases


def run_headless_analysis(
    datasets,
    design=None,
    *,
    experiment="Experiment 1",
    model="langmuir",
    transport="None",
    default_unit="nM",
    align_phases=False,
    assoc_start_s=None,
    dissoc_start_s=None,
    starts=4,
    runtime_s=20.0,
):
    """Run MIXA's end-to-end preprocessing, global mechanistic fit, and repeat summary headlessly."""
    if design is None:
        design = smart_predict_design(datasets, experiment_name=experiment)
    samples, provenance = prepare_experiment(
        datasets, design, experiment, align_phases=align_phases
    )
    include_map = {
        d["filename"]: {c for c in d["concentrations"] if c > 0} for d in samples
    }
    detected = detect_binding_phases(samples, include_map)
    t_on = float(assoc_start_s) if assoc_start_s is not None else float(detected["on"])
    t_off = float(dissoc_start_s) if dissoc_start_s is not None else float(detected["off"])
    t_max = float(max(np.max(d["time"]) for d in samples))
    windows = {
        "phase_assoc_start_s": t_on,
        "phase_dissoc_start_s": t_off,
        "fit_assoc_start_s": t_on,
        "fit_assoc_end_s": t_off,
        "fit_dissoc_start_s": t_off,
        "fit_dissoc_end_s": t_max,
    }
    controls = parameter_defaults(model, transport=transport)
    curves = prepare_curves(samples, include_map, windows, normalize=True)
    global_fit = fit_mechanism(
        curves,
        model,
        controls,
        transport=transport,
        starts=int(starts),
        runtime_s=float(runtime_s),
    )
    kinetic_summary = mechanistic_to_kinetic_summary(global_fit)

    # Independent repeat refits when multiple Repeat IDs are present
    repeat_rows = []
    by_repeat = {}
    for s in samples:
        by_repeat.setdefault(s["repeat_id"], []).append(s)
    for rep_id, rep_samples in sorted(by_repeat.items()):
        rep_inc = {d["filename"]: include_map[d["filename"]] for d in rep_samples}
        rep_curves = prepare_curves(rep_samples, rep_inc, windows, normalize=True)
        rep_fit = fit_mechanism(
            rep_curves,
            model,
            controls,
            transport=transport,
            starts=max(1, int(starts) // 2),
            runtime_s=max(5.0, float(runtime_s) / 2.0),
        )
        rep_bridged = mechanistic_to_kinetic_summary(rep_fit)
        ok = bool(rep_bridged and rep_bridged.get("summary_eligible", True))
        repeat_rows.append(
            {
                "repeat_id": rep_id,
                "method": "Kinetic",
                "kon": rep_bridged.get("global_kon", np.nan) if rep_bridged else np.nan,
                "koff": rep_bridged.get("global_koff", np.nan) if rep_bridged else np.nan,
                "KD_nM": (rep_bridged.get("global_KD", np.nan) * 1e9) if rep_bridged else np.nan,
                "status": "Complete" if ok else "Failed",
            }
        )
    repeat_df = pd.DataFrame(repeat_rows)
    repeat_summary = summarize_repeats(repeat_df) if not repeat_df.empty else pd.DataFrame()
    return {
        "version": APP_VERSION,
        "experiment": experiment,
        "model": model,
        "transport": transport,
        "windows": windows,
        "design": design.to_dict("records"),
        "preprocessing_provenance": provenance.to_dict("records"),
        "global_fit": {
            "converged": bool(kinetic_summary and kinetic_summary.get("summary_eligible", True)),
            "parameters": (
                global_fit["parameter_table"].to_dict("records")
                if "parameter_table" in global_fit
                else []
            ),
            "affinities": derived_affinities(global_fit).to_dict("records"),
            "information_criteria": global_fit.get("information_criteria", {}),
        },
        "kinetic_summary": {
            "global_kon": kinetic_summary.get("global_kon") if kinetic_summary else None,
            "global_koff": kinetic_summary.get("global_koff") if kinetic_summary else None,
            "global_KD_nM": (
                kinetic_summary["global_KD"] * 1e9
                if kinetic_summary and np.isfinite(kinetic_summary.get("global_KD", np.nan))
                else None
            ),
            "r_squared_mean": kinetic_summary.get("r_squared_mean") if kinetic_summary else None,
        },
        "repeat_estimates": repeat_df.to_dict("records"),
        "repeat_summary": repeat_summary.to_dict("records"),
        "analysis_code_sha256": source_code_sha256(),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Run MIXA kinetic & repeat analysis from the command line."
    )
    parser.add_argument(
        "inputs",
        nargs="*",
        help="Input SPR/BLI files (.csv, .tsv, .txt, .xlsx). Use --demo to run the synthetic 3-repeat benchmark.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run the built-in 3-repeat synthetic demonstration dataset with matched negative controls.",
    )
    parser.add_argument(
        "--model",
        default="langmuir",
        choices=["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"],
        help="Mechanistic binding model (default: langmuir).",
    )
    parser.add_argument(
        "--transport",
        default="None",
        choices=["None", "Quasi-steady 1:1 transport", "Two-compartment transport"],
        help="Physical mass-transport coupling (default: None).",
    )
    parser.add_argument(
        "--unit",
        default="nM",
        help="Default concentration unit for bare numeric headers (fM, pM, nM, uM, mM, M).",
    )
    parser.add_argument(
        "--align-phases",
        action="store_true",
        help="Align per-file injection start times across datasets.",
    )
    parser.add_argument("--assoc-start", type=float, default=None, help="Association start time (s).")
    parser.add_argument("--dissoc-start", type=float, default=None, help="Dissociation start time (s).")
    parser.add_argument("--starts", type=int, default=4, help="Multi-start optimization count.")
    parser.add_argument("--output", type=Path, default=None, help="Optional JSON output path.")
    args = parser.parse_args(argv)

    if args.demo:
        datasets, design = example_project()
    elif args.inputs:
        datasets = []
        for item in args.inputs:
            path = Path(item)
            datasets.append(read_dataset(path.read_bytes(), path.name, default_unit=args.unit))
        design = None
    else:
        parser.error("Provide one or more input files or pass --demo.")

    result = run_headless_analysis(
        datasets,
        design,
        model=args.model,
        transport=args.transport,
        default_unit=args.unit,
        align_phases=args.align_phases,
        assoc_start_s=args.assoc_start,
        dissoc_start_s=args.dissoc_start,
        starts=args.starts,
    )
    payload = json.dumps(json_safe(result), indent=2)
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
