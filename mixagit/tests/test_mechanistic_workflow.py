import io
import json
import zipfile

from streamlit.testing.v1 import AppTest


def test_new_session_defaults_to_simple_langmuir_without_resetting_deliberate_choices():
    app = AppTest.from_file("app.py", default_timeout=120).run()
    assert app.session_state["binding_model_select"] == "1:1 Langmuir"
    assert app.session_state["advanced_transport"] == "None"
    assert not app.session_state["advanced_ns"]
    assert not app.session_state["kinetic_custom_controls"]
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert [error.value for error in app.exception] == []
    assert app.selectbox(key="binding_model_select").value == "1:1 Langmuir"
    assert app.selectbox(key="advanced_transport").value == "None"
    assert not app.checkbox(key="advanced_ns").value
    assert not app.checkbox(key="kinetic_custom_controls").value
    assert app.checkbox(key="normalize_baseline").value
    assert not app.checkbox(key="correct_drift").value
    assert not app.checkbox(key="include_nonspecific").value
    assert any("Run Kinetic Analysis" in button.label for button in app.button)
    assert not any(button.key == "advanced_run" for button in app.button)
    app.selectbox(key="binding_model_select").set_value("Bivalent analyte / surface avidity").run()
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert app.selectbox(key="binding_model_select").value == "Bivalent analyte / surface avidity"
    assert [error.value for error in app.exception] == []


def test_integrated_kinetic_controls_preserve_workflow_and_exports():
    app = AppTest.from_file("app.py", default_timeout=180).run()

    def healthy():
        assert [e.value for e in app.exception] == []

    def click(label):
        next(button for button in app.button if button.label == label).click().run()
        healthy()

    click("Load synthetic demonstration")
    click("Apply dataset assignments")
    assert not any("Advanced Kinetics" in option for option in app.radio(key="workflow_nav").options)
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.checkbox(key="kinetic_custom_controls").set_value(True).run()
    healthy()
    assert not app.toggle(key="phase_adjust_enabled").value
    assert not app.toggle(key="fit_trim_enabled").value
    app.selectbox(key="advanced_technique").set_value("BLI").run()
    app.selectbox(key="advanced_immobilized").set_value("Receptor").run()
    app.selectbox(key="advanced_analyte").set_value("Antibody").run()
    app.selectbox(key="advanced_valency").set_value("Bivalent").run()
    app.selectbox(key="advanced_process").set_value("Antibody avidity").run()
    app.number_input(key="advanced_starts").set_value(1).run()
    click("Run advanced global fit")
    fit = app.session_state["latest_mechanistic_results"]
    assert fit["n_parameters"] == 17  # 15 local biosensor capacities + two shared rates.
    assert fit["recipe"]["assay"]["analyte_valency"] == "Bivalent"
    assert fit["values"]["kon::all"] > 0
    assert len(fit["curves"]) == 15
    assert app.selectbox(key="mechanistic_diagnostic_curve").options[0].startswith("C01 |")
    diagnostic_table = next(frame.value for frame in app.dataframe if "objective_rss_share_percent" in frame.value.columns)
    assert diagnostic_table.n_selected.sum() == fit["n_observations"]
    app.selectbox(key="mechanistic_diagnostic_curve").set_value(4).run()
    healthy()
    assert app.session_state["latest_mechanistic_results"]["created_utc"] == fit["created_utc"]
    click("Refit independent repeats")
    assert fit["recipe"]["model"] == "langmuir"
    report = app.session_state["latest_mechanistic_results"]["repeat_report"]
    assert report["summary"].n_independent.tolist() == [3, 3, 3]
    click("Prepare advanced analysis package")
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        assert "figures/kinetic_curves.svg" in archive.namelist()
        assert "figures/independent_repeat_parameters.pdf" in archive.namelist()
        assert "saved_fit_diagnostics/phases.csv" in archive.namelist()
        assert "saved_fit_diagnostics/serial_correlation.csv" in archive.namelist()
        recipe = json.loads(archive.read("fit_recipe.json"))
        assert recipe["assay"]["technique"] == "BLI"
        assert recipe["normalize"]
        assert "NaN" not in archive.read("scientific_diagnostics.json").decode()
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    healthy()
    assert any("Equilibrium" in button.label for button in app.button)
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    healthy()
    assert app.selectbox(key="advanced_technique").value == "BLI"
    assert app.selectbox(key="advanced_analyte").value == "Antibody"
    assert not any("Controls have changed" in warning.value for warning in app.warning)
    app.selectbox(key="binding_model_select").set_value("Bivalent analyte / surface avidity").run()
    healthy()
    assert any("Controls have changed" in warning.value for warning in app.warning)
    app.toggle(key="phase_adjust_enabled").set_value(True).run()
    app.slider(key="phase_assoc_input").set_value(25.).run()
    healthy()
    assert app.session_state["latest_mechanistic_results"] is None


def test_all_mechanisms_and_transport_are_in_the_main_kinetic_model_menu():
    app = AppTest.from_file("app.py", default_timeout=120).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    expected = ["1:1 Langmuir", "1:1 + Delivery Lag", "2-State (Advanced)",
                "Two independent surface populations", "Bivalent analyte / surface avidity",
                "Sequential binding of two analyte molecules"]
    assert app.selectbox(key="binding_model_select").options == expected
    assert len([box for box in app.selectbox if box.label in {"Binding model", "Binding mechanism"}]) == 1
    for model in expected[3:]:
        app.selectbox(key="binding_model_select").set_value(model).run()
        assert [e.value for e in app.exception] == []
        assert any(button.key == "advanced_run" for button in app.button)
        assert "Binding mechanism" not in [box.label for box in app.selectbox]
    app.selectbox(key="binding_model_select").set_value("1:1 Langmuir").run()
    app.selectbox(key="advanced_transport").set_value("Two-compartment transport").run()
    assert any(button.key == "advanced_run" for button in app.button)
    app.selectbox(key="advanced_transport").set_value("None").run()
    app.checkbox(key="advanced_ns").set_value(True).run()
    assert any(button.key == "advanced_run" for button in app.button)
    app.selectbox(key="binding_model_select").set_value("1:1 + Delivery Lag").run()
    assert app.selectbox(key="advanced_transport").disabled
    assert not any(box.key == "advanced_ns" for box in app.checkbox)
    assert any("Run Kinetic Analysis" in button.label for button in app.button)
    assert [e.value for e in app.exception] == []


def test_previous_advanced_page_session_migrates_to_kinetic_analysis():
    app = AppTest.from_file("app.py", default_timeout=120)
    app.session_state["workflow_nav"] = "Advanced Kinetics"
    app.session_state["active_section"] = "Advanced Kinetics"
    app.session_state["advanced_model"] = "bivalent"
    app.run()
    assert [e.value for e in app.exception] == []
    assert app.session_state["active_section"] == "Kinetic Analysis"
    assert app.session_state["binding_model_select"] == "Bivalent analyte / surface avidity"
    assert app.session_state["kinetic_custom_controls"]


def test_background_controls_are_shared_across_models_and_saved_in_exports():
    app = AppTest.from_file("app.py", default_timeout=120).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    labels = {key: app.checkbox(key=key).label for key in ["normalize_baseline", "correct_drift", "include_nonspecific", "advanced_ns"]}
    app.checkbox(key="correct_drift").set_value(True).run()
    app.checkbox(key="include_nonspecific").set_value(True).run()
    for model in ["Two independent surface populations", "Bivalent analyte / surface avidity", "Sequential binding of two analyte molecules"]:
        app.selectbox(key="binding_model_select").set_value(model).run()
        assert [error.value for error in app.exception] == []
        assert {key: app.checkbox(key=key).label for key in labels} == labels
        assert app.checkbox(key="correct_drift").value
        assert app.checkbox(key="include_nonspecific").value
        assert len([box for box in app.checkbox if box.key == "normalize_baseline"]) == 1
        assert "Linear drift" not in app.multiselect(key="advanced_nuisance").options
        table = next(frame.value for frame in app.dataframe if "key" in frame.value.columns)
        assert {"drift", "ns_linear"} <= set(table["key"])
    app.selectbox(key="binding_model_select").set_value("1:1 Langmuir").run()
    app.checkbox(key="kinetic_custom_controls").set_value(True).run()
    app.number_input(key="advanced_starts").set_value(1).run()
    app.button(key="advanced_run").click().run()
    assert [error.value for error in app.exception] == []
    fit = app.session_state["latest_mechanistic_results"]
    assert fit["recipe"]["background_terms"]["linear_drift"]
    assert fit["recipe"]["background_terms"]["linear_nonspecific"]
    assert all("linear_drift" in curve["components"] and "nonspecific_linear" in curve["components"] for curve in fit["curves"])
    app.button(key="advanced_prepare_export").click().run()
    assert [error.value for error in app.exception] == []
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        metadata = json.loads(archive.read("scientific_diagnostics.json"))
        assert metadata["background_terms"]["linear_nonspecific"]
        header = archive.read("curve_points.csv").decode().splitlines()[0]
        assert "linear_drift" in header and "nonspecific_linear" in header
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert app.checkbox(key="correct_drift").value
    assert app.checkbox(key="include_nonspecific").value


def test_old_advanced_drift_choice_migrates_to_shared_background_controls():
    app = AppTest.from_file("app.py", default_timeout=120)
    app.session_state["binding_model_select"] = "Bivalent analyte / surface avidity"
    app.session_state["advanced_normalize"] = False
    app.session_state["advanced_nuisance"] = ["Linear drift", "Offset"]
    app.run()
    assert [error.value for error in app.exception] == []
    assert app.session_state["correct_drift"]
    assert app.session_state["advanced_nuisance"] == ["Offset"]
    assert not app.session_state["normalize_baseline"]


def test_cached_helper_upgrade_does_not_clear_loaded_datasets(monkeypatch):
    import mixa_mechanistic_ui

    app = AppTest.from_file("app.py", default_timeout=120).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    filenames = [data["filename"] for data in app.session_state["data_list"]]
    monkeypatch.setattr(mixa_mechanistic_ui, "render_mechanistic_workspace", lambda *args: None)
    app.selectbox(key="binding_model_select").set_value("Bivalent analyte / surface avidity").run()
    assert [error.value for error in app.exception] == []
    assert [data["filename"] for data in app.session_state["data_list"]] == filenames
    assert any(button.key == "advanced_run" for button in app.button)


def test_manual_mechanistic_fit_connects_to_model_comparison_and_publication_report():
    app = AppTest.from_file("app.py", default_timeout=180).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.checkbox(key="kinetic_custom_controls").set_value(True).run()
    app.number_input(key="advanced_starts").set_value(1).run()
    app.button(key="advanced_run").click().run()
    assert [e.value for e in app.exception] == []
    assert app.session_state["latest_mechanistic_results"] is not None

    # Navigate to Publication Report with only manual mechanistic fit
    app.radio(key="workflow_nav").set_value("Publication Report").run()
    assert [e.value for e in app.exception] == []
    assert any(button.key == "mechanistic_publication_prepare" for button in app.button)
    assert not any("Run at least one analysis" in info.value for info in app.info)

    # Also run Equilibrium Analysis and verify Model Comparison bridges the manual mechanistic fit
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    next(button for button in app.button if "Run Equilibrium Analysis" in button.label).click().run()
    assert [e.value for e in app.exception] == []
    app.radio(key="workflow_nav").set_value("Model Comparison").run()
    assert [e.value for e in app.exception] == []
    assert not any("Run both Kinetic Analysis and Equilibrium Analysis" in w.value for w in app.warning)
    assert any("Manual mechanistic fit" in c.value for c in app.caption)

