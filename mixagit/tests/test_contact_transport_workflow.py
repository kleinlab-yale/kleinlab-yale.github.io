from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest
from mixa_diagnostics import saved_fit_quality


APP = Path(__file__).resolve().parents[1]/"app.py"
LABEL = "Two-contact binding with transport — rapid-capture limit"


def load_contact_example():
    app = AppTest.from_file(APP, default_timeout=180).run()
    app.button(key="load_mcam_lm411_kinetics_btn").click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert not app.exception
    assert any("Saved-fit agreement:" in m.value for m in app.markdown)
    return app


def test_mcam_preset_runs_the_visible_controls_and_keeps_shared_rmax():
    app = load_contact_example()
    assert app.selectbox(key="binding_model_select").value == LABEL
    assert app.selectbox(key="advanced_transport").disabled
    assert app.session_state["latest_mechanistic_results"]["preloaded_demo"]
    table = next(frame.value for frame in app.dataframe if "key" in frame.value.columns)
    assert len(table) == 5
    assert set(table.scope) == {"Per file"}
    app.number_input(key="advanced_starts").set_value(1).run()
    assert any("Controls have changed" in w.value for w in app.warning)
    app.number_input(key="advanced_nfev").set_value(50).run()
    app.number_input(key="advanced_seed").set_value(1234).run()
    app.button(key="advanced_run").click().run()
    assert not app.exception
    fit = app.session_state["latest_mechanistic_results"]
    assert fit["model"] == "contact_closure_transport_limit"
    assert fit["optimizer_settings"]["starts"] == fit["recipe"]["starts"] == 1
    assert fit["optimizer_settings"]["max_nfev"] == fit["recipe"]["max_nfev"] == 50
    assert fit["optimizer_settings"]["seed"] == fit["recipe"]["seed"] == 1234
    assert fit["n_parameters"] == 15
    assert fit["n_profiled_parameters"] == 3
    assert not fit.get("preloaded_demo")
    assert any("Saved-fit agreement:" in m.value for m in app.markdown)
    for filename in {c["filename"] for c in fit["curves"]}:
        assert len({c["parameters"]["Rmax"] for c in fit["curves"] if c["filename"]==filename}) == 1
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    assert app.session_state["advanced_export"]


def test_invalidated_mcam_fit_is_not_silently_reloaded_from_a_cache():
    app = load_contact_example()
    assert app.session_state["latest_mechanistic_results"]
    app.toggle(key="fit_trim_enabled").set_value(True).run()
    assert not app.exception
    assert app.session_state["latest_mechanistic_results"] is None
    # Repeated rendering must not reinstate the obsolete fit either.
    app.run()
    assert app.session_state["latest_mechanistic_results"] is None
    app.button(key="kin_quick_switch_lm411").click().run()
    assert not app.exception
    assert app.session_state["latest_mechanistic_results"]["preloaded_demo"]


def test_old_population_model_labels_migrate_without_resetting_the_choice():
    app = AppTest.from_file(APP, default_timeout=120)
    app.session_state["binding_model_select"] = "Two-site / two-component binding (2:1)"
    app.run()
    assert not app.exception
    assert app.session_state["binding_model_select"] == "Two independent surface populations"


def test_complete_study_and_experiment_switch_preserve_the_declared_phases():
    app = AppTest.from_file(APP, default_timeout=180).run()
    app.button(key="load_complete_mcam_study_btn").click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    assert not app.exception
    assert app.session_state["latest_mechanistic_results"]["preloaded_demo"]
    assert app.session_state["fit_windows"]["phase_assoc_start_s"] == 100.038
    assert app.session_state["fit_windows"]["phase_dissoc_start_s"] == 220.04102
    app.selectbox(key="selected_experiment").set_value("MCAM-Fc + LamA4G123 (α4 LG1–LG3)").run()
    assert not app.exception
    fit = app.session_state["latest_mechanistic_results"]
    assert fit and all("LamA4G123" in c["filename"] for c in fit["curves"])
    assert any("Saved-fit agreement:" in m.value for m in app.markdown)
    assert saved_fit_quality(fit)["overall_score"] > 95.
    assert saved_fit_quality(fit)["boundary_parameters"]
    assert app.session_state["fit_windows"]["phase_assoc_start_s"] == 100.028
    assert app.session_state["fit_windows"]["phase_dissoc_start_s"] == 220.04199


def test_lm421_is_preloaded_and_uses_the_matched_shared_capacity_preset():
    app = AppTest.from_file(APP, default_timeout=180).run()
    app.button(key="load_complete_mcam_study_btn").click().run()
    design = app.session_state["dataset_design"]
    assert len(app.session_state["raw_datasets"]) == 9
    assert set(design.Experiment) == {"MCAM-Fc + LM411 (tE411)", "MCAM-Fc + LM421 (tE421)", "MCAM-Fc + LamA4G123 (α4 LG1–LG3)"}
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.selectbox(key="selected_experiment").set_value("MCAM-Fc + LM421 (tE421)").run()
    assert not app.exception
    assert app.selectbox(key="binding_model_select").value == LABEL
    assert all(set(x)=={7.813,15.63,31.25,62.5,125.} for x in app.session_state["include_map"].values())
    assert app.session_state["fit_windows"]["phase_assoc_start_s"] == 100.038002
    assert app.session_state["fit_windows"]["phase_dissoc_start_s"] == 220.046997
    fit = app.session_state["latest_mechanistic_results"]
    assert fit and fit["preloaded_demo"]
    quality = saved_fit_quality(fit)
    assert any(f"Saved-fit agreement: {quality['overall_label']}" in m.value for m in app.markdown)
    assert fit["n_parameters"] == 15
    for filename in {c["filename"] for c in fit["curves"]}:
        assert "LM421" in filename
        assert len({c["parameters"]["Rmax"] for c in fit["curves"] if c["filename"]==filename}) == 1
    app.button(key="kin_quick_switch_lm411").click().run()
    app.button(key="kin_quick_switch_lm421").click().run()
    assert not app.exception
    assert app.session_state["latest_mechanistic_results"]["preloaded_demo"]
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    assert app.session_state["advanced_export"]
    import io, json, zipfile
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        exported = json.loads(archive.read("scientific_diagnostics.json"))["quality_screen"]
        assert exported["overall_score"] == quality["overall_score"]
        assert exported["method"] == "saved_fit_screen_v2"
        assert exported["flagged_serial_correlation"] > 0
    app.session_state["advanced_export_revision"] = 6
    app.run()
    assert not app.exception
    with pytest.raises(KeyError):
        app.session_state["advanced_export"]
