"""Tests for Solution Equilibrium Titration (SET) & Epitope Competition in MIXA."""

import io
import zipfile

import numpy as np
import pandas as pd
import pytest
from streamlit.testing.v1 import AppTest

from mixa_competition import (
    build_competition_export_bundle,
    classify_competition_mechanism,
    extract_competition_points_from_datasets,
    fit_competition_sensorgrams,
    fit_solution_competition,
    free_analyte_quadratic,
    generate_synthetic_competition_datasets,
    load_bundled_mcam_competition_datasets,
    set_equilibrium_response,
    simulate_competition_sensorgram,
)
from mixa_data import (
    classify_column_header,
    ingest_uploaded_files,
    load_bundled_mcam_lm411_kinetics_datasets,
    parse_molar_ratio,
    read_dataset,
)


def test_parse_molar_ratio_and_column_headers():
    assert parse_molar_ratio("0x") == 0.0
    assert parse_molar_ratio("0.25x") == 0.25
    assert parse_molar_ratio("2.5 x") == 2.5
    assert parse_molar_ratio("1.5 eq") == 1.5
    assert parse_molar_ratio("2 equiv") == 2.0
    assert parse_molar_ratio("1:4") == 0.25
    assert parse_molar_ratio("2:1") == 2.0
    assert parse_molar_ratio("Ratio 3.0") == 3.0
    assert parse_molar_ratio("50 nM") is None

    c_zero = classify_column_header("0x")
    assert c_zero["role"] == "Reference (0 nM)"
    assert c_zero["molar_ratio"] == 0.0

    c_half = classify_column_header("0.5x")
    assert c_half["role"] == "Sample"
    assert c_half["molar_ratio"] == 0.5

    rows = ["Time_s,0x,0.25x,0.5x,1x,2x,5x"]
    for idx in range(12):
        t_val = idx * 10
        rows.append(f"{t_val},0,{80 + idx},{62 + idx},{35 + idx},{14 + idx},{5 + idx}")
    csv_text = "\n".join(rows) + "\n"
    ds = read_dataset(csv_text.encode("utf-8"), "molar_ratio_test.csv")
    assert ds["concentrations"] == [0.0, 0.25, 0.5, 1.0, 2.0, 5.0]
    ratios_in_schema = [e["molar_ratio"] for e in ds["column_schema"]]
    assert ratios_in_schema == [0.0, 0.25, 0.5, 1.0, 2.0, 5.0]


def test_exact_quadratic_set_recovers_kd_sol_and_stoichiometry():
    analyte_tot = 60.0  # nM
    true_kd_sol = 4.0   # nM
    true_n = 2.0        # e.g. bivalent inhibitor neutralizing 2 analyte molecules per inhibitor
    true_r0 = 150.0
    true_rinf = 0.0

    molar_ratios = np.array([0.0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.5, 2.5, 5.0])
    comp_nM = molar_ratios * analyte_tot
    y_clean = set_equilibrium_response(
        comp_nM, true_r0, true_rinf, true_kd_sol, analyte_tot, stoichiometry=true_n
    )

    res = fit_solution_competition(
        comp_nM,
        y_clean,
        analyte_tot,
        stoichiometry=1.0,
        fit_stoichiometry=True,
        allow_residual_plateau=True,
    )

    assert np.isclose(res["kd_sol_nM"], true_kd_sol, rtol=0.05)
    assert np.isclose(res["stoichiometry_n"], true_n, rtol=0.05)
    assert res["r_squared_set"] > 0.999
    # Naive IC50 must be substantially larger than true K_D,sol due to tight-binding analyte depletion
    assert res["ic50_nM"] > 3.0 * res["kd_sol_nM"]
    assert res["classification"]["epitope_class"].startswith("Complete Competitive Blocking")


def test_epitope_classification_partial_vs_non_competing():
    cls_partial = classify_competition_mechanism(
        r0=100.0, r_inf=45.0, kd_sol_nM=10.0, analyte_total_nM=50.0
    )
    assert cls_partial["epitope_class"] == "Partial / Steric / Allosteric Inhibition"
    assert np.isclose(cls_partial["max_inhibition_pct"], 55.0)

    cls_none = classify_competition_mechanism(
        r0=100.0, r_inf=92.0, kd_sol_nM=1000.0, analyte_total_nM=50.0
    )
    assert cls_none["epitope_class"] == "Non-Competing / Distinct Epitope"

    cls_invasion = classify_competition_mechanism(
        r0=100.0,
        r_inf=5.0,
        kd_sol_nM=8.0,
        analyte_total_nM=50.0,
        koff_slope_pvalue=0.002,
        koff_rel_change=0.65,
    )
    assert cls_invasion["epitope_class"] == "Active Surface Invasion / Allosteric Stripping"


def test_global_competition_sensorgrams_and_export_bundle():
    datasets = generate_synthetic_competition_datasets(
        analyte_total_nM=50.0,
        kd_sol_nM=5.0,
        stoichiometry=1.0,
        seed=7,
    )
    points_df, traces, t_on, t_off = extract_competition_points_from_datasets(
        datasets, analyte_total_nM=50.0
    )
    assert len(points_df) == 20
    comp_res = fit_solution_competition(
        points_df["Competitor [I] (nM)"].to_numpy(),
        points_df["Observed Response"].to_numpy(),
        analyte_total_nM=50.0,
        stoichiometry=1.0,
        fit_stoichiometry=False,
        repeat_ids=points_df["Repeat ID"].to_numpy(),
    )
    assert 3.5 <= comp_res["kd_sol_nM"] <= 7.5
    assert len(comp_res["repeat_rows"]) == 2

    kin_res = fit_competition_sensorgrams(
        traces, analyte_total_nM=50.0, t_assoc_start=t_on, t_dissoc_start=t_off
    )
    assert kin_res["available"] is True
    assert 3.5 <= kin_res["kd_sol_kin_nM"] <= 7.0
    assert kin_res["r_squared_global"] > 0.98

    bundle = build_competition_export_bundle(comp_res, kin_res)
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as zf:
        names = set(zf.namelist())
        assert "competition/competition_summary.csv" in names
        assert "competition/competition_observed_points.csv" in names
        assert "competition/competition_repeat_fits.csv" in names
        assert "figures/solution_competition_4panel.png" in names
        assert "methods/METHODS.md" in names


def test_solution_competition_workflow_ui():
    app = AppTest.from_file("mixa_app.py", default_timeout=30)
    app.run()
    assert any("Solution Competition" in opt for opt in app.radio(key="workflow_nav").options)
    app.radio(key="workflow_nav").set_value("Solution Competition").run()
    assert not app.exception

    # Click synthetic competition demo button
    app.button(key="comp_load_demo_btn").click().run()
    assert not app.exception
    comp_res = app.session_state["latest_competition_results"]
    assert comp_res is not None
    assert 3.0 <= comp_res["kd_sol_nM"] <= 8.0


def test_bundled_mcam_lm411_itga6b1_competition_dataset():
    datasets = load_bundled_mcam_competition_datasets()
    assert len(datasets) == 3
    points_df, traces, t_on, t_off = extract_competition_points_from_datasets(
        datasets, analyte_total_nM=20.0, t_report_s=218.0
    )
    assert len(points_df) == 21
    assert np.isclose(t_on, 100.0, atol=5.0)
    assert np.isclose(t_off, 220.0, atol=5.0)

    comp_res = fit_solution_competition(
        points_df["Competitor [I] (nM)"].to_numpy(),
        points_df["Observed Response"].to_numpy(),
        analyte_total_nM=20.0,
        stoichiometry=1.0,
        fit_stoichiometry=False,
        allow_residual_plateau=True,
        repeat_ids=points_df["Repeat ID"].to_numpy(),
    )
    assert 0.4 <= comp_res["kd_sol_nM"] <= 0.9
    assert 10.5 <= comp_res["ic50_nM"] <= 13.5
    assert comp_res["classification"]["max_inhibition_pct"] > 95.0
    assert comp_res["classification"]["epitope_class"].startswith("Complete Competitive Blocking")

    # Verify Dual 2-Domain Bidentate (2 domains on Integrin & MCAM for 2 sites on LM411)
    # converges naturally to the literature KD_sol ~ 10 nM at ~1:1 molecular stoichiometry!
    comp_res_dual2d = fit_solution_competition(
        points_df["Competitor [I] (nM)"].to_numpy(),
        points_df["Observed Response"].to_numpy(),
        analyte_total_nM=20.0,
        stoichiometry=1.0,
        fit_stoichiometry=True,
        allow_residual_plateau=True,
        surface_kd_nM=8.5,
        surface_cooperativity=2.5,
        bidentate_two_site=True,
        repeat_ids=points_df["Repeat ID"].to_numpy(),
    )
    assert 6.5 <= comp_res_dual2d["kd_sol_nM"] <= 13.5
    assert 0.85 <= comp_res_dual2d["stoichiometry_n"] <= 1.35
    assert comp_res_dual2d["r_squared_set"] > 0.991


def test_gator_results_txt_and_zip_folder_ingest():
    bundled = load_bundled_mcam_lm411_kinetics_datasets()
    assert len(bundled) == 3
    for ds in bundled:
        assert ds.get("baseline_prealigned") is True
        assert np.isclose(ds["phase_assoc_start_s"], 100.038, atol=0.5)
        assert np.isclose(ds["phase_dissoc_start_s"], 220.041, atol=0.5)
        assert len(ds["concentrations"]) == 6

    # Build a synthetic Gator Results.txt folder ZIP with active sensors (t1B6, t1C6), empty reference stubs (t1B7, t1H6), and a duplicate Fit subfolder
    t_vals = np.r_[np.linspace(100.0, 219.8, 12), np.linspace(220.04, 339.8, 12)]
    b6_lines = ["SensorName: t1B6", "Conc.\t1.25E+02", "Start\t0", "Stop\t119.8", "Time1\tData1\tFit1"]
    c6_lines = ["SensorName: t1C6", "Conc.\t6.25E+01", "Start\t0", "Stop\t119.8", "Time1\tData1\tFit1"]
    for idx, tv in enumerate(t_vals):
        y_b6 = 0.05 * idx if idx < 12 else 0.55 - 0.02 * (idx - 12)
        y_c6 = 0.03 * idx if idx < 12 else 0.33 - 0.012 * (idx - 12)
        b6_lines.append(f"{tv:.4f}\t{y_b6:.6f}\t0")
        c6_lines.append(f"{tv:.4f}\t{y_c6:.6f}\t0")
    b7_empty = "SensorName: t1B7\nConc.\t\nStart\t\nStop\t\n"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("exp_a/t1B6Results.txt", "\n".join(b6_lines))
        zf.writestr("exp_a/t1C6Results.txt", "\n".join(c6_lines))
        zf.writestr("exp_a/t1B7Results.txt", b7_empty)
        zf.writestr("exp_a/exp_aFit/t1B6Results.txt", "\n".join(b6_lines))
        zf.writestr("exp_a/exp_aFit/t1C6Results.txt", "\n".join(c6_lines))
        zf.writestr("exp_a/2026_KineticTableExport.csv", "Include,Index\nx,1\n")

    ingested, skipped = ingest_uploaded_files([(buf.getvalue(), "mcam_folder.zip")])
    assert len(ingested) == 1
    assert skipped == ["t1B7"]
    assert ingested[0]["concentrations"] == [62.5, 125.0]
    assert ingested[0].get("baseline_prealigned") is True


