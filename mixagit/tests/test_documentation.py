import hashlib
import io
import json
import zipfile

from streamlit.testing.v1 import AppTest

from mixa_data import APP_VERSION
from mixa_documentation import build_documentation_bundle, user_guide
from mixa_methods import equation_record, write_methods_exports


def test_documentation_bundle_is_self_contained_hash_checked_and_has_no_user_data():
    assert APP_VERSION in user_guide()
    with zipfile.ZipFile(io.BytesIO(build_documentation_bundle())) as archive:
        assert archive.testzip() is None
        manifest = json.loads(archive.read("MANIFEST.json"))
        assert manifest["version"] == APP_VERSION
        assert set(archive.namelist()) == set(manifest["sha256"]) | {"MANIFEST.json"}
        assert all(hashlib.sha256(archive.read(name)).hexdigest() == digest for name, digest in manifest["sha256"].items())
        assert not any(name.startswith(("data/", "source/")) for name in archive.namelist())
        record = json.loads(archive.read("methods/equations_and_sources.json"))
        assert record == equation_record()
        assert all(ref["doi"] in archive.read("methods/REFERENCES.bib").decode() for ref in record["references"].values())


def test_general_guide_is_in_each_run_but_references_remain_specific_to_that_run():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        write_methods_exports(archive, {"kobs": {}})
    with zipfile.ZipFile(buffer) as archive:
        record = json.loads(archive.read("methods/equations_and_sources.json"))
        assert hashlib.sha256(archive.read("methods/USER_GUIDE.md")).hexdigest() == record["user_guide_sha256"]
        assert "nguyen2023" not in record["references"]
        assert "oshannessy1993" in record["references"]


def test_methods_can_be_opened_before_upload_without_changing_fit_settings():
    app = AppTest.from_file("app.py", default_timeout=120).run()
    before = {key: app.session_state[key] for key in ["binding_model_select", "normalize_baseline", "correct_drift"]}
    app.button(key="open_methods_documentation").click().run()
    assert not app.exception
    assert not app.session_state["data_list"]
    assert before == {key: app.session_state[key] for key in before}
    assert app.selectbox(key="methods_equation").value == "langmuir"
    assert any("# MIXA User Guide" in m.value for m in app.markdown)
