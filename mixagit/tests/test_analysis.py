import io
import unittest
from copy import deepcopy
from unittest.mock import patch

import numpy as np
import pandas as pd

from mixa_data import default_design, example_project, load_sample_datasets, prepare_experiment, read_dataset
from mixa_reporting import summarize_repeats


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.raw, self.design = example_project()

    def test_controls_excluded_and_raw_preserved(self):
        before = deepcopy(self.raw)
        samples, provenance = prepare_experiment(self.raw, self.design, "Experiment 1")
        self.assertEqual(len(samples), 3)
        self.assertEqual(len(provenance), 18)
        for sample in samples:
            for c in sample["concentrations"]:
                np.testing.assert_allclose(sample["responses"][c] + sample["background_responses"][c], sample["raw_responses"][c])
        for a, b in zip(self.raw, before):
            for c in a["concentrations"]:
                np.testing.assert_array_equal(a["responses"][c], b["responses"][c])

    def test_missing_control_concentration_rejected(self):
        del self.raw[1]["responses"][15]
        with self.assertRaisesRegex(ValueError, "no 15 nM"):
            prepare_experiment(self.raw, self.design, "Experiment 1")

    def test_extrapolation_rejected(self):
        self.raw[1]["time"] = self.raw[1]["time"] + 1
        with self.assertRaisesRegex(ValueError, "does not cover"):
            prepare_experiment(self.raw, self.design, "Experiment 1")

    def test_control_interpolation(self):
        ref = self.raw[1]
        ref["time"] = ref["time"][::2]
        ref["responses"] = {c: y[::2] for c, y in ref["responses"].items()}
        samples, _ = prepare_experiment(self.raw, self.design, "Experiment 1")
        np.testing.assert_allclose(samples[0]["background_responses"][50], np.interp(samples[0]["time"], ref["time"], ref["responses"][50]))

    def test_single_file_zero_reference(self):
        design = default_design([self.raw[0]])
        design.loc[0, "Subtraction"] = "Same-file 0 nM"
        samples, _ = prepare_experiment([self.raw[0]], design, "Experiment 1")
        np.testing.assert_allclose(samples[0]["responses"][0], 0)
        np.testing.assert_allclose(samples[0]["responses"][50], self.raw[0]["responses"][50] - self.raw[0]["responses"][0])

    def test_experiment_isolation(self):
        self.design.loc[4:, "Experiment"] = "Other target"
        samples, _ = prepare_experiment(self.raw, self.design, "Experiment 1")
        self.assertEqual(len(samples), 2)

    def test_default_files_are_not_assumed_independent(self):
        self.assertEqual(default_design(self.raw)["Repeat ID"].nunique(), 1)

    def test_original_sample_files_are_loadable(self):
        samples = load_sample_datasets()
        self.assertEqual([d["filename"] for d in samples], ["PreprocessedData-Group1.csv", "PreprocessedData-Group2a.csv"])
        self.assertEqual([d["n_points"] for d in samples], [700, 700])
        self.assertEqual([len(d["concentrations"]) for d in samples], [7, 7])
        self.assertAlmostEqual(samples[1]["responses"][500][0], -0.3073651)

    def test_control_averaging_weights_independent_repeats_equally(self):
        raw = deepcopy(self.raw[:4])
        design = default_design(raw)
        design.loc[0, ["Subtraction", "Background set"]] = ["Matched concentrations", "Reference"]
        for index, (value, repeat) in enumerate([(1.0, "Control A"), (3.0, "Control A"), (10.0, "Control B")], 1):
            raw[index]["responses"] = {c: np.full_like(y, value) for c, y in raw[index]["responses"].items()}
            design.loc[index, ["Role", "Repeat ID", "Background set"]] = ["Negative control", repeat, "Reference"]
        samples, _ = prepare_experiment(raw, design, "Experiment 1")
        for c in samples[0]["concentrations"]:
            np.testing.assert_allclose(samples[0]["background_responses"][c], 6.0)

    def test_duplicate_concentrations_and_timestamps_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate 10"):
            read_dataset("time,10 nM,10 nM\n" + "\n".join(f"{t},1,2" for t in range(8)), "bad.csv")
        with self.assertRaisesRegex(ValueError, "unique"):
            read_dataset("time,10 nM\n" + "\n".join("0,1" for _ in range(8)), "bad.csv")

    def test_long_import_and_nonfinite_validation(self):
        payload = pd.DataFrame({"time_s": np.tile(np.arange(8), 2), "concentration_nM": np.repeat([1, 10], 8), "response": np.arange(16)}).to_csv(index=False)
        data = read_dataset(payload, "long.csv")
        self.assertEqual(data["concentrations"], [1, 10])
        with self.assertRaisesRegex(ValueError, "missing or nonnumeric"):
            read_dataset("time,10 nM\n" + "\n".join(f"{t},nan" for t in range(8)), "bad.csv")

    def test_multi_unit_concentrations_tsv_and_preamble_import(self):
        tsv_text = (
            "# Instrument: Biacore T200\n"
            "Assay: Fab binding\n"
            "Time (s)\t500 pM\t10 nM\t0.1 uM\t1 µM\n"
            + "\n".join(f"{t}\t0.1\t0.5\t2.0\t5.0" for t in range(10))
        )
        data = read_dataset(tsv_text, "multi_unit.tsv")
        self.assertEqual(data["concentrations"], [0.5, 10.0, 100.0, 1000.0])

        long_uM = pd.DataFrame({
            "time": np.tile(np.arange(8, dtype=float), 2),
            "concentration": np.repeat([0.05, 0.5], 8),
            "unit": ["uM"] * 16,
            "response": np.arange(16, dtype=float),
        }).to_csv(index=False)
        data_long = read_dataset(long_uM, "long_uM.csv")
        self.assertEqual(data_long["concentrations"], [50.0, 500.0])

    def test_align_phases_shifts_time_axes_and_preserves_subtraction(self):
        raw = deepcopy(self.raw[:2])
        # Shift second file and its control by +15 s
        raw_rep2 = deepcopy(self.raw[2:4])
        for d in raw_rep2:
            d["time"] = d["time"] + 15.0
            d["phase_assoc_start_s"] = 35.0
            d["phase_dissoc_start_s"] = 115.0
        combined = raw + raw_rep2
        design = self.design.iloc[:4].copy().reset_index(drop=True)
        samples, prov = prepare_experiment(combined, design, "Experiment 1", align_phases=True)
        self.assertEqual(len(samples), 2)
        np.testing.assert_allclose(samples[0]["time"], samples[1]["time"])
        self.assertIn("time_shift_s", prov.columns)
        self.assertAlmostEqual(samples[1]["time_shift_s"], -15.0)

    def test_bare_numeric_reference_blank_minutes_and_paired_time_columns(self):
        csv_text = (
            "Cycle,Time (min),Blank 1,Buffer 2,0.05,Time 2,0.5,Sensor_Notes\n"
            + "\n".join(f"1,{t},{1.0 + 0.1*t},{3.0 + 0.1*t},{5.0 + t},{t*60.0},{15.0 + 2*t},999" for t in range(10))
        )
        data = read_dataset(csv_text, "octet_run1.csv", default_unit="uM")
        np.testing.assert_allclose(data["time"], np.arange(10, dtype=float) * 60.0)
        self.assertEqual(data["concentrations"], [0.0, 50.0, 500.0])
        # Blank 1 (1.0 + 0.1*t) and Buffer 2 (3.0 + 0.1*t) are averaged into 0.0 nM reference
        np.testing.assert_allclose(data["responses"][0.0], 2.0 + 0.1 * np.arange(10, dtype=float))
        self.assertIn("Sensor_Notes", data["ignored_columns"])
        self.assertNotIn("Time 2", data["ignored_columns"])

    def test_apply_column_schema_reassigns_roles_and_units(self):
        from mixa_data import apply_column_schema
        csv_text = (
            "Time (s),Well_A1,Well_A2,Well_A3\n"
            + "\n".join(f"{t},{0.2 + 0.01*t},{2.0 + 0.5*t},{8.0 + 1.5*t}" for t in range(10))
        )
        # Initially, include at least one valid header or bare numeric so read_dataset succeeds, then remap
        csv_with_initial = (
            "Time (s),0 nM,Well_A2,Well_A3\n"
            + "\n".join(f"{t},{0.2 + 0.01*t},{2.0 + 0.5*t},{8.0 + 1.5*t}" for t in range(10))
        )
        ds = read_dataset(csv_with_initial, "plate.csv")
        self.assertEqual(ds["concentrations"], [0.0])
        updated = apply_column_schema(
            ds,
            [
                {"column": "0 nM", "role": "Reference (0 nM)", "value": 0.0, "unit": "nM"},
                {"column": "Well_A2", "role": "Sample", "value": 25.0, "unit": "nM"},
                {"column": "Well_A3", "role": "Sample", "value": 0.1, "unit": "uM"},
            ],
        )
        self.assertEqual(updated["concentrations"], [0.0, 25.0, 100.0])
        self.assertEqual(updated["ignored_columns"], [])
        self.assertNotEqual(updated["sha256"], ds["sha256"])

    def test_smart_predict_design_infers_roles_repeats_and_subtraction_modes(self):
        from mixa_data import smart_predict_design
        # 1. Synthetic demonstration datasets (3 sample repeats + 3 matched controls)
        predicted = smart_predict_design(self.raw)
        np.testing.assert_array_equal(predicted["Role"].to_numpy(), self.design["Role"].to_numpy())
        np.testing.assert_array_equal(predicted["Repeat ID"].to_numpy(), self.design["Repeat ID"].to_numpy())
        np.testing.assert_array_equal(predicted["Subtraction"].to_numpy(), self.design["Subtraction"].to_numpy())

        # 2. Sample datasets with in-file non-zero 0 nM reference and no separate control files
        samples_only = [self.raw[0], self.raw[2]]
        pred_in_file = smart_predict_design(samples_only)
        self.assertEqual(pred_in_file["Role"].tolist(), ["Sample", "Sample"])
        self.assertEqual(pred_in_file["Repeat ID"].tolist(), ["Repeat 1", "Repeat 2"])
        self.assertEqual(pred_in_file["Subtraction"].tolist(), ["Same-file 0 nM", "Same-file 0 nM"])


class StatisticsTests(unittest.TestCase):
    def test_log_t_interval_and_single_repeat(self):
        df = pd.DataFrame({"method": ["Kinetic"] * 3, "kon": [1e5, 2e5, 4e5],
                           "koff": [0.01, 0.02, 0.04], "KD_nM": [100, 100, 100], "status": ["Complete"] * 3})
        table = summarize_repeats(df)
        self.assertEqual(table.n_independent.tolist(), [3, 3, 3])
        row = table.iloc[0]
        self.assertAlmostEqual(row.geometric_mean, 2e5)
        half = 4.302652729911275 * np.log(2) / np.sqrt(3)
        np.testing.assert_allclose([row.ci95_low, row.ci95_high], 2e5 * np.exp([-half, half]), rtol=1e-9)
        single = summarize_repeats(df.iloc[:1])
        self.assertTrue(single.ci95_low.isna().all())

    def test_failed_repeat_is_accounted_for(self):
        table = summarize_repeats(pd.DataFrame({"method": ["Kinetic"] * 2, "kon": [1e5, 2e5],
            "koff": [0.01, 0.02], "KD_nM": [100, 100], "status": ["Complete", "Failed"]}))
        self.assertEqual(table.n_independent.tolist(), [1, 1, 1])
        self.assertEqual(table.excluded_or_failed.tolist(), [1, 1, 1])

    def test_kinetic_recovery_and_technical_repeat_counts(self):
        import mixa_app as app
        raw, design = example_project()
        data, _ = prepare_experiment(raw, design, "Experiment 1")
        included = {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data}
        kobs = app.fit_kobs_linearization(data, included, 20, 100)
        self.assertAlmostEqual(kobs["kass"] / 1.2e5, 1.0, delta=0.1)
        self.assertAlmostEqual(kobs["kdiss"] / 0.012, 1.0, delta=0.1)
        self.assertEqual(kobs["concentration_table"].kobs_n.tolist(), [3] * 5)
        for d in data:
            d["repeat_id"] = "Same preparation"
        kobs = app.fit_kobs_linearization(data, included, 20, 100)
        self.assertEqual(kobs["concentration_table"].kobs_n.tolist(), [1] * 5)
        eq = app.fit_equilibrium_advanced(data, 95, included, aggregate_repeats=True)
        self.assertEqual(len(eq["repeat_response_table"]), 5)

    def test_association_rate_invariant_to_constant_offset(self):
        import mixa_app as app
        t = np.arange(0.0, 160.0)
        y = 100 * (1 - np.exp(-0.04 * np.maximum(t - 20, 0)))
        a = app.fit_kobs_from_association(t, y, 20, 100)
        b = app.fit_kobs_from_association(t, y + 81, 20, 100, normalize=False)
        self.assertAlmostEqual(a["kobs"], 0.04, places=6)
        self.assertAlmostEqual(a["kobs"], b["kobs"], places=6)

    def test_individual_kd_error_includes_rate_covariance(self):
        import mixa_app as app
        t = np.arange(181.0)
        parameters = np.array([1.2e5, 0.012, 100.0])
        covariance = np.array([[1e8, 5.0, 0], [5.0, 1e-6, 0], [0, 0, 1.0]])
        y = app.model_1to1(t, *parameters, 1e-7, 20, 100) + 0.001 * np.sin(t)
        with patch.object(app, "multi_start_curve_fit", return_value=(parameters, covariance)):
            fit = app.fit_kinetics_advanced(t, y, 1e-7, 20, 100, show_warnings=False)
        gradient = np.array([-parameters[1] / parameters[0] ** 2, 1 / parameters[0]])
        self.assertAlmostEqual(fit["KD_err"], np.sqrt(gradient @ covariance[:2, :2] @ gradient), places=15)

    def test_equilibrium_never_uses_future_points(self):
        import mixa_app as app
        raw, design = example_project()
        data, _ = prepare_experiment(raw, design, "Experiment 1")
        included = {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data}
        fit = app.fit_equilibrium_advanced(data, 95, included, t_assoc_start=20)
        for d in data:
            for y in d["responses"].values():
                y[d["time"] > 95] = 1e9
        changed = app.fit_equilibrium_advanced(data, 95, included, t_assoc_start=20)
        np.testing.assert_allclose(fit["raw_responses"], changed["raw_responses"])
        self.assertIsNone(app.fit_equilibrium_advanced(data, 999, included))

    def test_phase_detection_does_not_include_binding_in_baseline(self):
        import mixa_app as app
        raw, design = example_project()
        data, _ = prepare_experiment(raw, design, "Experiment 1")
        included = {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data}
        on, off, _ = app.auto_detect_binding_phases(data, included)
        self.assertAlmostEqual(on, 20, delta=2)
        self.assertAlmostEqual(off, 100, delta=3)

    def test_equilibrium_percent_bmax_anchor_warning_and_precision_score(self):
        import mixa_app as app
        raw, design = example_project()
        data, _ = prepare_experiment(raw, design, "Experiment 1")
        included = {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data}
        eq = app.fit_equilibrium_advanced(
            data, 95, included, aggregate_repeats=True, normalize_percent_bmax=True, t_assoc_start=20
        )
        self.assertIsNotNone(eq)
        self.assertTrue(any("pins the peak concentration to 100%" in w for w in eq["scientific_warnings"]))
        att = app.evaluate_equilibrium_attainment(data, included, 95, t_assoc_start=20)
        score = app.score_equilibrium_fit(eq, att)
        self.assertTrue(np.isfinite(score["repeat_precision_score"]))

    def test_equilibrium_attainment_scales_with_long_association_duration(self):
        import mixa_app as app
        t_long = np.linspace(0.0, 620.0, 621)
        # Slow exponential climbing continuously at t=600 (tau = 500 s)
        y_slow = 100.0 * (1.0 - np.exp(-np.maximum(t_long - 20.0, 0.0) / 500.0))
        slow_data = [
            dict(
                filename="slow.csv",
                repeat_id="R1",
                repeat_group="Exp",
                time=t_long,
                concentrations=[50.0],
                responses={50.0: y_slow},
            )
        ]
        att = app.evaluate_equilibrium_attainment(slow_data, {"slow.csv": {50.0}}, 600.0, t_assoc_start=20.0)
        self.assertFalse(att["equilibrium_reached"])
        self.assertLess(att["overall_score"], 50.0)

    def test_global_mechanistic_candidates_and_compare_report_bridging(self):
        import mixa_app as app
        from mixa_mechanisms import fit_mechanism, mechanistic_to_kinetic_summary, parameter_defaults, prepare_curves
        raw, design = example_project()
        data, _ = prepare_experiment(raw, design, "Experiment 1")
        included = {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data}
        global_cmp = app.evaluate_global_mechanistic_candidates(
            data, 20.0, 100.0, include_map=included, starts=1, runtime_s=15.0
        )
        self.assertIsNotNone(global_cmp)
        self.assertFalse(global_cmp["curve_subset_applied"])
        self.assertTrue(any(r["Model"] == "1:1 Langmuir" and r["Comparable"] for r in global_cmp["table"]))

        windows = dict(
            phase_assoc_start_s=20.0, phase_dissoc_start_s=100.0,
            fit_assoc_start_s=20.0, fit_assoc_end_s=100.0,
            fit_dissoc_start_s=100.0, fit_dissoc_end_s=180.0,
        )
        curves = prepare_curves(data, included, windows, normalize=True)
        mech_fit = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1, runtime_s=15.0)
        bridged = mechanistic_to_kinetic_summary(mech_fit)
        eq = app.fit_equilibrium_advanced(data, 95.0, included, aggregate_repeats=True, t_assoc_start=20.0)
        eq["attainment"] = app.evaluate_equilibrium_attainment(data, included, 95.0, t_assoc_start=20.0)
        eq["quality_summary"] = app.score_equilibrium_fit(eq, eq["attainment"])
        report = app.build_compare_report(bridged, eq)
        self.assertTrue(np.isfinite(report["kinetic_kd_nM"]))
        self.assertGreater(report["kinetic_score"], 50.0)

    def test_headless_cli_runner_and_raw_benchmark_files(self):
        from pathlib import Path
        from mixa_cli import run_headless_analysis
        raw_dir = Path(__file__).resolve().parents[1] / "data" / "raw_benchmark"
        csv_files = sorted(raw_dir.glob("*.csv"))
        self.assertEqual(len(csv_files), 6)
        datasets = [read_dataset(p.read_bytes(), p.name) for p in csv_files]
        out = run_headless_analysis(datasets, starts=2, runtime_s=10.0)
        self.assertTrue(out["global_fit"]["converged"])
        self.assertAlmostEqual(out["kinetic_summary"]["global_KD_nM"] / 100.0, 1.0, delta=0.15)
        self.assertEqual(len(out["repeat_estimates"]), 3)
        self.assertIn("mixa_cli.py", out["analysis_code_sha256"])


if __name__ == "__main__":
    unittest.main()
