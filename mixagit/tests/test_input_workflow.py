import io
import json
import zipfile

import numpy as np
from streamlit.testing.v1 import AppTest


def loaded():
    app = AppTest.from_file("app.py", default_timeout=180).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(b for b in app.button if b.label == label).click().run()
    assert not app.exception
    return app


def test_budget_changes_invalidate_results_without_changing_selected_windows_and_export_full_covariance():
    app = loaded()
    app.toggle(key="phase_adjust_enabled").set_value(True).run()
    app.slider(key="phase_assoc_input").set_value(20.)
    app.slider(key="phase_dissoc_input").set_value(100.).run()
    app.toggle(key="fit_trim_enabled").set_value(True).run()
    app.slider(key="fit_assoc_range").set_value((30., 90.))
    app.slider(key="fit_dissoc_range").set_value((110., 170.)).run()
    selection = dict(app.session_state["fit_windows"])
    app.radio(key="workflow_nav").set_value("kobs Linearization").run()
    next(b for b in app.button if b.label == "\U0001f4c8 Run kobs Linearization").click().run()
    assert not app.exception
    original = app.session_state["latest_kobs_results"]
    assert original["input_uncertainty"]["first_stage_propagated"]
    key = "input_uncertainty_Experiment 1_stock_cv"
    app.number_input(key=key).set_value(10.).run()
    assert not app.exception
    assert app.session_state["latest_kobs_results"] is None
    assert app.session_state["fit_windows"] == selection
    assert all(d["input_uncertainty"]["stock_cv"] == .1 for d in app.session_state["data_list"])
    next(b for b in app.button if b.label == "\U0001f4c8 Run kobs Linearization").click().run()
    current = app.session_state["latest_kobs_results"]
    assert not app.exception
    assert current["kass"] == original["kass"] and current["kdiss"] == original["kdiss"]
    assert current["KD_err"] > original["KD_err"]
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    assert app.number_input(key=key).value == 10.
    app.radio(key="workflow_nav").set_value("kobs Linearization").run()
    import mixa_app
    with zipfile.ZipFile(io.BytesIO(mixa_app.build_kobs_export_bundle(current))) as archive:
        assert "kobs/rate_covariance.csv" in archive.namelist()
        record = json.loads(archive.read("methods/equations_and_sources.json"))
        assert "input_propagation" in record["equations"]
        assert "jcgm102" in record["references"]
        assert record["run"]["kobs"]["input_uncertainty"]["settings"]["stock_cv"] == .1


def test_assisted_raw_source_budget_keeps_repeat_counts_and_exports_its_assumptions():
    app = loaded()
    app.checkbox(key="input_uncertainty_Experiment 1_propagate_measurement").set_value(True).run()
    budget = next(e for e in app.expander if e.label == "Measurement and concentration uncertainty")
    assert budget.proto.expanded
    app.number_input(key="input_uncertainty_Experiment 1_stock_cv").set_value(3.).run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.radio(key="assistant_mode").set_value("Guided").run()
    app.number_input(key="assistant_starts").set_value(2).run()
    app.button(key="assistant_run").click().run()
    assert not app.exception
    review = app.session_state["assisted_review"]
    assert review["recommended_index"] == 0
    fit = review["attempts"][0]["result"]
    assert fit["input_uncertainty"]["applied"]
    assert fit["input_uncertainty"]["settings"]["stock_cv"] == .03
    assert fit["input_uncertainty"]["parameter_order"] == fit["free_parameters"]
    app.button(key="advanced_repeat_run").click().run()
    assert not app.exception
    assert fit["repeat_report"]["summary"].n_independent.tolist() == [3, 3, 3]
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        metadata = json.loads(archive.read("scientific_diagnostics.json"))
        assert metadata["input_uncertainty"]["applied"]
        assert len(metadata["input_uncertainty"]["raw_sources"]) == 30
        covariance = np.asarray(metadata["input_uncertainty"]["calibration_covariance"])
        assert covariance.shape == (9, 9)
        assert "data/input_uncertainty_settings.json" in archive.namelist()
        assert "figures/independent_repeat_parameters.pdf" in archive.namelist()
        assert "mixa_input_uncertainty.py" in json.loads(archive.read("analysis_code_sha256.json"))
        assert "parameter_covariance.csv" in archive.namelist()
        assert "conditional_on_baseline_covariance.csv" in archive.namelist()
        assert "conditional_covariance.csv" not in archive.namelist()
        assert metadata["uncertainty_method"] in archive.read("FIGURE_LEGENDS.txt").decode()
        assert "combined input standard uncertainty" in archive.read("COVARIANCE_METHODS.txt").decode()


def test_smart_toolbar_and_unified_column_trace_editor():
    app = AppTest.from_file("app.py", default_timeout=180).run()
    next(b for b in app.button if b.label == "Load sample datasets").click().run()
    assert not app.exception
    # Default design starts with Repeat 1 for both sample files
    assert app.session_state["dataset_draft"]["Repeat ID"].tolist() == ["Repeat 1", "Repeat 1"]
    # Click 1-click Auto-predict roles & repeats button
    app.button(key="smart_predict_assignments").click().run()
    assert not app.exception
    assert app.session_state["dataset_draft"]["Repeat ID"].tolist() == ["Repeat 1", "Repeat 2"]
    assert app.session_state["dataset_draft"]["Subtraction"].tolist() == ["None", "None"]
    next(b for b in app.button if b.label == "Apply dataset assignments").click().run()
    assert not app.exception
    assert len(app.session_state["data_list"]) == 2
    # Verify unified column & trace editor live-syncs Include checkbox and supports batch actions
    fp = app.session_state["prepared_signature"][:8]
    rev = app.session_state["trace_editor_revision"]
    editor_key = f"unified_column_trace_editor_{fp}_{rev}"
    # Row 0 corresponds to the first column (500.0 nM) in PreprocessedData-Group1.csv
    app.session_state[editor_key] = {
        "edited_rows": {0: {"Include": False}},
        "added_rows": [],
        "deleted_rows": [],
    }
    app.run()
    assert not app.exception
    assert 500.0 not in app.session_state["include_map"]["PreprocessedData-Group1.csv"]
    # Click 'Include all > 0 nM' button to restore all positive traces
    app.button(key="trace_include_all_positive").click().run()
    assert not app.exception
    assert 500.0 in app.session_state["include_map"]["PreprocessedData-Group1.csv"]
