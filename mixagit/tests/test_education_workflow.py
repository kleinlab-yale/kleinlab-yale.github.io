from streamlit.testing.v1 import AppTest


def test_education_is_available_without_data_and_all_topics_render_without_changing_fit_controls():
    app = AppTest.from_file("app.py", default_timeout=120).run()
    assert not app.exception
    before = {key: app.session_state[key] for key in ["binding_model_select", "normalize_baseline", "correct_drift", "include_nonspecific"]}
    app.button(key="open_fitting_education").click().run()
    assert not app.exception
    assert app.selectbox(key="education_topic").value == "1:1 kinetics"
    assert {key: app.session_state[key] for key in before} == before
    assert not app.session_state["data_list"]


def test_every_education_topic_renders_and_example_controls_are_interactive():
    # AppTest does not support dialog fragment reruns; exercise the same content
    # independently and keep the real app's dialog entry-point check above.
    app = AppTest.from_string("from mixa_education import render_fitting_education_contents\nrender_fitting_education_contents()", default_timeout=120).run()
    app.slider(key="education_logkon").set_value(5.5).run()
    assert not app.exception
    for topic in app.selectbox(key="education_topic").options[1:]:
        app.selectbox(key="education_topic").set_value(topic).run()
        assert not app.exception, topic
    assert app.selectbox(key="education_equation").value == "langmuir"
    app.selectbox(key="education_equation").set_value("bivalent").run()
    assert not app.exception
    assert any("2*kon" in code.value for code in app.code)
