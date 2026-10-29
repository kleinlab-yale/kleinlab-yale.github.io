import io
import zipfile

from streamlit.testing.v1 import AppTest


def load_app():
    app = AppTest.from_file("app.py", default_timeout=180).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(b for b in app.button if b.label == label).click().run()
    assert not app.exception
    return app


def test_compact_dataset_table_removes_files_without_resetting_the_session():
    app = load_app()
    next(b for b in app.button if b.label == "Load sample datasets").click().run()
    assert len(app.session_state["raw_datasets"]) == 8
    revision = app.session_state["design_revision"]
    app.session_state[f"dataset_assignments_{revision}"] = dict(edited_rows={i: {"Remove": True} for i in range(6)}, added_rows=[], deleted_rows=[])
    app.run()
    assert not app.button(key="remove_selected_datasets").disabled
    app.button(key="remove_selected_datasets").click().run()
    assert not app.exception
    assert len(app.session_state["raw_datasets"]) == 2
    assert all("PreprocessedData" in d["filename"] for d in app.session_state["raw_datasets"])
    assert not app.session_state["data_list"]
    assert not app.session_state["design_committed"]
    next(b for b in app.button if b.label == "Apply dataset assignments").click().run()
    assert not app.exception
    assert len(app.session_state["data_list"]) == 2
    assert len(app.session_state["dataset_design"]) == 2


def test_continue_navigation_has_top_reset_and_vector_previews():
    app = load_app()
    images = app.get("imgs")
    assert images and all(image.proto.imgs[0].url.startswith("data:image/svg+xml") for image in images)
    next(b for b in app.button if b.label == "Continue to kinetic analysis").click().run()
    assert not app.exception
    assert app.session_state["active_section"] == "Kinetic Analysis"
    assert app.session_state["last_rendered_workflow_page"] == "Kinetic Analysis"
    assert any("resetMixaScroll" in element.proto.body for element in app.get("html"))


def test_automatic_exposes_normalization_and_the_complete_correction_sequence():
    app = load_app()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert app.radio(key="assistant_mode").value == "Manual controls"
    app.radio(key="assistant_mode").set_value("Automatic, conservative").run()
    assert app.checkbox(key="assistant_normalize").value
    assert not any(b.key == "normalize_baseline" for b in app.checkbox)
    assert app.checkbox(key="assistant_compare_all").value
    assert not app.checkbox(key="assistant_compare_all").disabled
    table = next(frame.value for frame in app.dataframe if "candidate" in frame.value.columns)
    assert len(table) == 4
    assert "linear nonspecific" in " ".join(table.candidate)
    app.checkbox(key="assistant_normalize").set_value(False).run()
    assert not app.checkbox(key="assistant_normalize").value
    assert not app.exception


def test_input_budgets_survive_navigation_without_duplicate_default_warnings(monkeypatch):
    import streamlit.elements.lib.policies as policies

    monkeypatch.setattr(policies, "_shown_default_value_warning", False)
    app = load_app()
    app.number_input(key="input_uncertainty_Experiment 1_stock_cv").set_value(3.2).run()
    app.number_input(key="input_uncertainty_Experiment 1_level_cv").set_value(1.5).run()
    app.checkbox(key="input_uncertainty_Experiment 1_propagate_measurement").set_value(True).run()
    for section in ["Kinetic Analysis", "Equilibrium Analysis", "Data Input"]:
        app.radio(key="workflow_nav").set_value(section).run()
        assert not app.exception
        assert app.number_input(key="input_uncertainty_Experiment 1_stock_cv").value == 3.2
        assert app.checkbox(key="input_uncertainty_Experiment 1_propagate_measurement").value
        assert app.session_state["input_uncertainty_by_experiment"]["Experiment 1"]["stock_cv"] == .032
        assert not any("created with a default value" in str(w.value) for w in app.warning)


def test_manual_two_state_selection_uses_global_engine_not_curvewise_fallback():
    app = load_app()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.selectbox(key="binding_model_select").set_value("2-State (Advanced)").run()
    assert not app.exception
    assert any(b.key == "advanced_run" for b in app.button)
    assert not any("Run Kinetic Analysis" in b.label for b in app.button)
    parameters = next(f.value for f in app.dataframe if "key" in f.value.columns)
    assert {"kon", "koff", "k_forward", "k_reverse"} <= set(parameters["key"])


def test_advanced_review_preserves_fit_and_includes_new_evidence_in_exports():
    app = load_app()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.radio(key="assistant_mode").set_value("Manual controls").run()
    app.checkbox(key="kinetic_custom_controls").set_value(True).run()
    app.number_input(key="advanced_starts").set_value(1).run()
    app.button(key="advanced_run").click().run()
    assert not app.exception
    result = app.session_state["latest_mechanistic_results"]
    original = dict(result["values"])
    app.button(key="mechanistic_review_omission_run").click().run()
    assert not app.exception
    payload = result["inference_review"]["omissions"]["Concentration"]
    assert len(payload["cases"]) == 5
    assert result["values"] == original
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        assert any(name.startswith("robustness_review/Kinetic/omissions/") and name.endswith("cases.csv") for name in archive.namelist())
        assert "methods/REFIT_REVIEW.md" in archive.namelist()


def test_calibrated_and_joint_review_are_explicit_preserved_and_traceable_in_exports():
    import json

    app = load_app()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.checkbox(key="kinetic_custom_controls").set_value(True).run()
    app.number_input(key="advanced_starts").set_value(1).run()
    app.button(key="advanced_run").click().run()
    assert not app.exception
    result = app.session_state["latest_mechanistic_results"]
    original = dict(result["values"])
    app.number_input(key="mechanistic_review_calibration_draws").set_value(200).run()
    app.button(key="mechanistic_review_calibration_run").click().run()
    assert not app.exception
    assert len(result["inference_review"]["calibration"]) == 1
    calibrated = next(iter(result["inference_review"]["calibration"].values()))
    assert len(calibrated["calibration_runs"]) == 200
    assert calibrated["metadata"]["complete_draws"] >= 190
    app.number_input(key="mechanistic_review_joint_warmup").set_value(100).run()
    app.number_input(key="mechanistic_review_joint_draws").set_value(100).run()
    app.button(key="mechanistic_review_joint_run").click().run()
    assert not app.exception
    first = next(iter(result["inference_review"]["joint"].values()))
    assert len(first["chains"]) == 4
    assert len(first["raw_samples"]) == 400
    app.number_input(key="mechanistic_review_joint_prior_between_log_sd_scale").set_value(2.).run()
    app.button(key="mechanistic_review_joint_run").click().run()
    assert not app.exception
    assert len(result["inference_review"]["joint"]) == 2
    assert result["values"] == original
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        assert "methods/JOINT_INFERENCE.md" in archive.namelist()
        equations = json.loads(archive.read("methods/equations_and_sources.json"))
        assert {"joint_hierarchy", "calibrated_profile"} <= set(equations["equations"])
        assert {"mixa_joint.py", "mixa_calibration.py"} <= set(equations["current_source_sha256"])
        assert len([n for n in archive.namelist() if "/joint/" in n and n.endswith("raw_samples.csv")]) == 2
