import io
import json
import zipfile

from streamlit.testing.v1 import AppTest


def start_app():
    app = AppTest.from_file("app.py", default_timeout=180).run()
    for label in ["Load synthetic demonstration", "Apply dataset assignments"]:
        next(button for button in app.button if button.label == label).click().run()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    app.radio(key="assistant_mode").set_value("Guided").run()
    assert not app.exception
    return app


def verify_phases(app):
    app.toggle(key="phase_adjust_enabled").set_value(True).run()
    app.slider(key="phase_assoc_input").set_value(20.)
    app.slider(key="phase_dissoc_input").set_value(100.).run()
    app.checkbox(key="assistant_phases_verified").set_value(True).run()


def test_guided_default_uses_existing_diagnostics_repeats_and_reproducible_exports():
    app = start_app()
    assert app.radio(key="assistant_mode").value == "Guided"
    assert app.selectbox(key="assistant_rate_scope").value == "Per repeat"
    assert app.session_state["binding_model_select"] == "1:1 Langmuir"
    assert app.session_state["fit_windows"]["phase_assoc_start_s"] == 20.
    assert app.session_state["fit_windows"]["phase_dissoc_start_s"] == 100.
    assert not app.toggle(key="phase_adjust_enabled").value
    app.number_input(key="assistant_starts").set_value(2).run()
    app.button(key="assistant_run").click().run()
    assert not app.exception
    review = app.session_state["assisted_review"]
    assert len(review["attempts"]) == 1
    assert review["recommended_index"] == 0
    result = review["attempts"][0]["result"]
    assert result["recipe"]["windows"]["phase_assoc_start_s"] == 20.
    assert result["recipe"]["assisted_policy"]["rate_scope"] == "Per repeat"
    assert len(result["curves"]) == 15
    assert any(box.key == "mechanistic_diagnostic_curve" for box in app.selectbox)
    app.button(key="advanced_repeat_run").click().run()
    assert not app.exception
    assert result["repeat_report"]["summary"].n_independent.tolist() == [3, 3, 3]
    app.button(key="advanced_prepare_export").click().run()
    assert not app.exception
    with zipfile.ZipFile(io.BytesIO(app.session_state["advanced_export"])) as archive:
        log = json.loads(archive.read("assisted_model_review.json"))
        assert log["data_sha256"] == review["data_sha256"]
        assert log["recommended_index"] == 0
        assert len(log["attempts"]) == 1
        assert "profiles" in log["attempts"][0]["assessment"]
        assert "saved_fit_diagnostics/phases.csv" in archive.namelist()
        assert "figures/independent_repeat_parameters.pdf" in archive.namelist()
        hashes = json.loads(archive.read("analysis_code_sha256.json"))
        assert "mixa_automation.py" in hashes and "mixa_assistant_ui.py" in hashes
    app.radio(key="workflow_nav").set_value("Publication Report").run()
    assert not app.exception
    assert any(button.key == "assisted_publication_prepare" for button in app.button)
    assert not any("Run at least one analysis" in info.value for info in app.info)
    app.button(key="assisted_publication_prepare").click().run()
    assert not app.exception
    with zipfile.ZipFile(io.BytesIO(app.session_state["assisted_publication_export"][1])) as archive:
        assert "assisted_model_review.json" in archive.namelist()
        assert "figures/kinetic_curves.pdf" in archive.namelist()
        assert "figures/independent_repeat_parameters.svg" in archive.namelist()
    app.radio(key="workflow_nav").set_value("Kinetic Analysis").run()
    saved_recipe = json.dumps(result["recipe"], sort_keys=True)
    app.selectbox(key="assistant_polarity").set_value("Invert negative binding response").run()
    assert not app.exception
    assert any("Inputs or policy changed" in warning.value for warning in app.warning)
    assert json.dumps(result["recipe"], sort_keys=True) == saved_recipe
    app.radio(key="assistant_mode").set_value("Manual controls").run()
    assert not app.exception
    assert app.selectbox(key="binding_model_select").value == "1:1 Langmuir"
    app.radio(key="workflow_nav").set_value("Equilibrium Analysis").run()
    assert not app.exception
    assert any("Equilibrium" in button.label for button in app.button)


def test_automatic_mode_and_missing_noise_do_not_force_a_recommendation():
    app = start_app()
    verify_phases(app)
    app.radio(key="assistant_mode").set_value("Automatic, conservative").run()
    app.selectbox(key="assistant_noise_source").set_value("Unavailable").run()
    app.button(key="assistant_run").click().run()
    assert not app.exception
    review = app.session_state["assisted_review"]
    assert review["recommended_index"] is None
    assert review["status"] == "Insufficient noise information"
    assert app.button(key="advanced_repeat_run").disabled
    assert any("diagnostic only" in info.value.lower() for info in app.info)
