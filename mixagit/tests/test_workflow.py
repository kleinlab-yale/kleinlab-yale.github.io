import io
from pathlib import Path
import unittest
from unittest.mock import patch
import zipfile

import numpy as np
import pandas as pd
from streamlit.testing.v1 import AppTest
from mixa_data import SAMPLE_FILES


class WorkflowTests(unittest.TestCase):
    def test_cached_prior_release_helpers_refresh_without_losing_data(self):
        import mixa_data
        import mixa_workspace
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "mixa_app.py", default_timeout=120).run()
        next(b for b in app.button if b.label == "Load synthetic demonstration").click().run()
        next(b for b in app.button if b.label == "Apply dataset assignments").click().run()
        files = [d["filename"] for d in app.session_state["data_list"]]
        mixa_data.APP_VERSION = "0.5.10-preview"
        def stale_intake(*args, **kwargs):
            raise RuntimeError("stale prior-release intake")
        mixa_workspace.render_dataset_workspace = stale_intake
        app.run()
        self.assertEqual([e.value for e in app.exception], [])
        self.assertEqual(mixa_data.APP_VERSION, "0.5.14-preview")
        self.assertIsNot(mixa_workspace.render_dataset_workspace, stale_intake)
        self.assertEqual([d["filename"] for d in app.session_state["data_list"]], files)
        self.assertTrue(any(b.label == "Load synthetic demonstration" for b in app.button))

    def test_cached_pre_upgrade_model_labels_reload_without_losing_data(self):
        import mixa_mechanisms
        import mixa_mechanistic_ui
        import mixa_assistant_ui
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "mixa_app.py", default_timeout=120).run()
        next(b for b in app.button if b.label == "Load synthetic demonstration").click().run()
        next(b for b in app.button if b.label == "Apply dataset assignments").click().run()
        files = [d["filename"] for d in app.session_state["data_list"]]
        mixa_mechanisms.MODEL_LABELS.pop("contact_closure_transport_limit")
        app.run()
        self.assertEqual([e.value for e in app.exception], [])
        self.assertEqual([d["filename"] for d in app.session_state["data_list"]], files)
        self.assertIn("contact_closure_transport_limit", mixa_mechanisms.MODEL_LABELS)
        self.assertIs(mixa_mechanistic_ui.MODEL_LABELS, mixa_mechanisms.MODEL_LABELS)
        self.assertIs(mixa_assistant_ui.MODEL_LABELS, mixa_mechanisms.MODEL_LABELS)

    def test_equilibrium_fixed_capacity_controls_run_and_persist(self):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=120).run()
        next(b for b in app.button if b.label == "Load synthetic demonstration").click().run()
        next(b for b in app.button if b.label == "Apply dataset assignments").click().run()
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        app.button(key="kin_quick_switch_g123").click().run()
        app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
        app.checkbox(key="equilibrium_fix_rmax").check().run()
        app.number_input(key="equilibrium_fixed_rmax_value").set_value(.8).run()
        self.assertTrue(app.checkbox(key="equilibrium_normalize_percent_bmax").disabled)
        next(b for b in app.button if b.label == "⚖️ Run Equilibrium Analysis").click().run()
        self.assertEqual([e.value for e in app.exception], [])
        fit = app.session_state["latest_equilibrium_results"]
        self.assertEqual(fit["Rmax"], .8)
        self.assertTrue(fit["Rmax_fixed"])
        self.assertEqual(fit["fit_settings"]["fixed_Rmax"], .8)
        self.assertEqual(fit["n_parameters"], 1)
        self.assertTrue(np.isfinite(fit["KD"]))
        app.number_input(key="equilibrium_fixed_rmax_value").set_value(.9).run()
        self.assertTrue(any("Settings have changed" in w.value for w in app.warning))
        self.assertEqual(app.session_state["latest_equilibrium_results"]["Rmax"], .8)
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
        self.assertTrue(app.checkbox(key="equilibrium_fix_rmax").value)
        self.assertEqual(app.number_input(key="equilibrium_fixed_rmax_value").value, .9)
        self.assertFalse(any("default value" in w.value and "Session State" in w.value for w in app.warning))

    def test_automatic_full_phases_with_optional_slider_adjustments(self):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=120).run()

        def healthy():
            self.assertEqual([e.value for e in app.exception], [])
            self.assertFalse(any("default value" in warning.value and "Session State" in warning.value for warning in app.warning))

        def click(label):
            next(b for b in app.button if b.label == label).click().run()
            healthy()

        click("Load synthetic demonstration")
        click("Apply dataset assignments")
        detected = (app.session_state["phase_detected_assoc"], app.session_state["phase_detected_dissoc"])
        self.assertFalse(app.toggle(key="phase_adjust_enabled").value)
        self.assertFalse(app.toggle(key="fit_trim_enabled").value)
        self.assertFalse(any(s.key in {"phase_assoc_input", "phase_dissoc_input", "fit_assoc_range", "fit_dissoc_range"} for s in app.slider))

        def full_phases(on, off):
            windows = app.session_state["fit_windows"]
            self.assertEqual(windows["phase_assoc_start_s"], on)
            self.assertEqual(windows["phase_dissoc_start_s"], off)
            self.assertEqual((windows["fit_assoc_start_s"], windows["fit_assoc_end_s"]), (on, off))
            self.assertEqual((windows["fit_dissoc_start_s"], windows["fit_dissoc_end_s"]), (off, 180.))

        full_phases(*detected)
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        click("\U0001f680 Run Kinetic Analysis")
        lookup = {d["filename"]: d for d in app.session_state["data_list"]}
        selection = app.session_state["latest_kinetic_results"]["fit_settings"]["project"]["phase_selection"]
        self.assertFalse(selection["manual_phase_adjustment"])
        self.assertFalse(selection["custom_fit_trimming"])
        for fit in app.session_state["latest_kinetic_results"]["individual_fits"]:
            time = lookup[fit["filename"]]["time"]
            np.testing.assert_array_equal(fit["fit_mask"], time >= detected[0])
            self.assertTrue(fit["fit_mask"][-1])

        app.toggle(key="phase_adjust_enabled").set_value(True).run()
        app.slider(key="phase_assoc_input").set_value(20.)
        app.slider(key="phase_dissoc_input").set_value(100.).run()
        healthy()
        full_phases(20., 100.)
        self.assertIsNone(app.session_state["latest_kinetic_results"])
        app.toggle(key="fit_trim_enabled").set_value(True).run()
        app.slider(key="fit_assoc_range").set_value((32., 90.))
        app.slider(key="fit_dissoc_range").set_value((110., 160.)).run()
        healthy()
        app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
        app.radio(key="workflow_nav").set_value("kobs Linearization").run()
        healthy()
        self.assertEqual(app.slider(key="phase_assoc_input").value, 20.)
        self.assertEqual(app.slider(key="fit_assoc_range").value, (32., 90.))
        app.toggle(key="fit_trim_enabled").set_value(False).run()
        full_phases(20., 100.)
        click("Reset to automatic / full phases")
        full_phases(*detected)
        self.assertFalse(app.toggle(key="phase_adjust_enabled").value)
        self.assertFalse(app.toggle(key="fit_trim_enabled").value)

    def test_reprocessing_same_files_refreshes_detection_and_resets_old_trimming(self):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=120).run()

        def click(label):
            next(b for b in app.button if b.label == label).click().run()
            self.assertEqual([e.value for e in app.exception], [])

        click("Load synthetic demonstration")
        click("Apply dataset assignments")
        fingerprint = app.session_state["prepared_signature"]
        detection_signature = app.session_state["phase_detection_signature"]
        app.toggle(key="phase_adjust_enabled").set_value(True).run()
        app.slider(key="phase_assoc_input").set_value(25.)
        app.slider(key="phase_dissoc_input").set_value(105.).run()
        app.toggle(key="fit_trim_enabled").set_value(True).run()
        app.slider(key="fit_assoc_range").set_value((35., 90.)).run()
        revision = app.session_state["design_revision"]
        app.session_state[f"dataset_assignments_{revision}"] = {"edited_rows": {0: {"Subtraction": "None"}}, "added_rows": [], "deleted_rows": []}
        app.run()
        click("Apply dataset assignments")
        from mixa_app import auto_detect_binding_phases
        on, off, _ = auto_detect_binding_phases(app.session_state["data_list"], app.session_state["include_map"])
        self.assertNotEqual(app.session_state["phase_detection_signature"], detection_signature)
        self.assertNotEqual(app.session_state["prepared_signature"], fingerprint)
        self.assertFalse(app.toggle(key="phase_adjust_enabled").value)
        self.assertFalse(app.toggle(key="fit_trim_enabled").value)
        windows = app.session_state["fit_windows"]
        self.assertEqual((windows["fit_assoc_start_s"], windows["fit_assoc_end_s"]), (on, off))
        self.assertEqual((windows["fit_dissoc_start_s"], windows["fit_dissoc_end_s"]), (off, 180.))

    def test_original_samples_and_visible_background_controls(self):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=120).run()

        def click(label):
            next(b for b in app.button if b.label == label).click().run()
            self.assertEqual([e.value for e in app.exception], [])

        click("Load sample datasets")
        revision = app.session_state["design_revision"]
        app.session_state[f"dataset_assignments_{revision}"] = {"edited_rows": {1: {"Repeat ID": "Repeat 2"}}, "added_rows": [], "deleted_rows": []}
        app.run()
        click("Apply dataset assignments")
        self.assertEqual({d["repeat_id"] for d in app.session_state["data_list"]}, {"Repeat 1", "Repeat 2"})
        click("Load synthetic demonstration")
        click("Apply dataset assignments")
        self.assertEqual(len(app.session_state["raw_datasets"]), 6+len(SAMPLE_FILES))
        next(s for s in app.selectbox if s.label == "Experiment to analyze").set_value("Synthetic demonstration").run()
        revision = app.session_state["design_revision"]
        key = f"dataset_assignments_{revision}"
        sample_row = len(SAMPLE_FILES)
        app.session_state[key] = {"edited_rows": {sample_row: {"Subtraction": "Control 0 nM"}}, "added_rows": [], "deleted_rows": []}
        app.run()
        self.assertFalse(app.session_state["design_committed"])
        click("Apply dataset assignments")
        data = app.session_state["data_list"][0]
        np.testing.assert_allclose(data["background_responses"][50], app.session_state["raw_datasets"][sample_row+1]["responses"][0])
        app.session_state[key] = {"edited_rows": {sample_row: {"Subtraction": "None"}}, "added_rows": [], "deleted_rows": []}
        app.run()
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        self.assertEqual(app.session_state["data_list"], [])
        app.radio(key="workflow_nav").set_value("Data Input").run()
        self.assertEqual(app.session_state["dataset_draft"].loc[sample_row, "Subtraction"], "None")
        click("Apply dataset assignments")
        data = app.session_state["data_list"][0]
        np.testing.assert_array_equal(data["responses"][50], data["raw_responses"][50])

    @patch("streamlit.elements.lib.policies._shown_default_value_warning", False)
    def test_complete_selected_window_workflow_and_exports(self):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=180).run()

        def healthy():
            self.assertEqual([e.value for e in app.exception], [])
            self.assertFalse(any("default value" in warning.value and "Session State" in warning.value for warning in app.warning))

        def click(label):
            next(b for b in app.button if b.label == label).click().run()
            healthy()

        click("Load synthetic demonstration")
        click("Apply dataset assignments")
        app.toggle(key="phase_adjust_enabled").set_value(True).run()
        app.slider(key="phase_assoc_input").set_value(20.0)
        app.slider(key="phase_dissoc_input").set_value(100.0).run()
        app.toggle(key="fit_trim_enabled").set_value(True).run()
        app.slider(key="fit_assoc_range").set_value((32., 90.))
        app.slider(key="fit_dissoc_range").set_value((110., 160.))
        app.run()
        healthy()
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        healthy()
        click("\U0001f680 Run Kinetic Analysis")
        kinetic = app.session_state["latest_kinetic_results"]
        self.assertEqual(kinetic["n_fits"], 15)
        self.assertTrue(all(fit["n_fit_points"] == 110 for fit in kinetic["individual_fits"]))
        self.assertAlmostEqual(kinetic["global_kon"] / 1.2e5, 1, delta=.15)
        self.assertAlmostEqual(kinetic["global_koff"] / .012, 1, delta=.15)
        self.assertTrue(np.isfinite(kinetic["kon_sem"]))
        app.radio(key="kinetic_results_view").set_value("Diagnostics").run()
        healthy()
        diagnostic_table = next(frame.value for frame in app.dataframe if "objective_rss_share_percent" in frame.value.columns)
        self.assertEqual(int(diagnostic_table.n_selected.sum()), 15 * 110)
        app.selectbox(key="kinetic_diagnostic_curve").set_value(4).run()
        healthy()
        self.assertIs(app.session_state["latest_kinetic_results"], kinetic)
        app.radio(key="kinetic_results_view").set_value("Individual fits").run()
        healthy()
        app.radio(key="workflow_nav").set_value("kobs Linearization").run()
        click("\U0001f4c8 Run kobs Linearization")
        app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
        click("\u2696\ufe0f Run Equilibrium Analysis")
        app.radio(key="equilibrium_results_view").set_value("Diagnostics").run()
        healthy()
        app.radio(key="workflow_nav").set_value("Model Comparison").run()
        healthy()
        app.radio(key="workflow_nav").set_value("Publication Report").run()
        healthy()
        self.assertTrue(any(b.label == "Download PDF" for b in app.get("download_button")))
        click("Generate repeat statistics")
        report = app.session_state["publication_report"]
        self.assertEqual(len(report["repeat_estimates"]), 9)
        self.assertTrue((report["repeat_estimates"].status == "Complete").all())
        self.assertTrue((report["summary"].n_independent == 3).all())
        self.assertTrue((report["summary"].sd.notna()).all())
        self.assertEqual(app.selectbox(key="report_gallery_figure").value, "curves_and_parameters")
        for name in ["kinetic_with_parameters", "equilibrium_with_parameters", "kobs_with_parameters"]:
            app.selectbox(key="report_gallery_figure").set_value(name).run()
            healthy()
        self.assertTrue(any(b.label == "Download parameter results (TXT)" for b in app.get("download_button")))
        app.radio(key="report_gallery_parameter_errors").set_value("Geometric mean + 95% CI").run()
        healthy()
        saved_sampling_time = app.session_state["latest_equilibrium_results"]["fit_settings"]["equilibrium_sampling_time_s"]
        app.session_state["eq_t_measure_input"] = 30.
        click("Prepare publication package")
        payload = app.session_state["publication_bundle"]
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            names = archive.namelist()
            for name in ["figures/kinetic_01.svg", "figures/kobs_linearization.pdf", "figures/equilibrium.png",
                         "figures/curves_and_parameters_mean_sd.pdf", "figures/curves_and_parameters_ci95.svg",
                         "figures/kinetic_with_parameters.pdf", "figures/equilibrium_with_parameters.svg",
                         "figures/equilibrium_with_parameters_log_concentration.png", "figures/kobs_with_parameters.pdf",
                         "PARAMETER_RESULTS.txt", "statistics/parameter_results.csv",
                         "statistics/summary.csv", "data/fit_selection.csv", "data/fit_selection_summary.csv",
                         "statistics/kinetic_saved_fit_diagnostics/curves.csv",
                         "statistics/kinetic_saved_fit_diagnostics/phases.csv"]:
                self.assertIn(name, names)
            results = pd.read_csv(archive.open("statistics/parameter_results.csv"))
            kinetic_kd = results.loc[(results.method == "Kinetic") & (results.parameter == "K_D")].iloc[0]
            self.assertEqual(kinetic_kd.n_independent, 3)
            self.assertIn("+/-", kinetic_kd.result)
            self.assertIn("nM", kinetic_kd.result)
            self.assertIn("Kinetic: K_D = ", archive.read("PARAMETER_RESULTS.txt").decode())
            manifest = pd.read_csv(archive.open("data/fit_selection.csv"))
            self.assertEqual(int(manifest.used_for_kinetic_fit.sum()), 15 * 110)
            self.assertFalse(manifest.loc[manifest.time_s < 20, "used_for_kinetic_fit"].any())
            eq_points = manifest.loc[manifest.used_for_equilibrium_fit]
            self.assertLessEqual(eq_points.time_s.max(), saved_sampling_time)
            self.assertGreaterEqual(eq_points.time_s.min(), saved_sampling_time - 5)
            plotted = pd.read_csv(archive.open("figure_data/kinetic_01.csv"))
            self.assertEqual(int(plotted.used_for_fit.sum()), 5 * 110)
        Path("/tmp/MIXA_test_publication.zip").write_bytes(payload)
        app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
        self.assertEqual(app.slider(key="fit_assoc_range").value, (32., 90.))
        app.slider(key="fit_assoc_range").set_value((33., 90.)).run()
        healthy()
        self.assertIsNone(app.session_state["latest_kinetic_results"])
        self.assertIsNone(app.session_state["latest_kobs_results"])
        self.assertIsNone(app.session_state["publication_report"])


if __name__ == "__main__":
    unittest.main()
