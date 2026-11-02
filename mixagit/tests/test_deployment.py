import json

import pytest

from scripts import deploy_to_hf


def setup_local(monkeypatch, tmp_path):
    (tmp_path/"app.py").write_text("print('test application')\n")
    monkeypatch.setattr(deploy_to_hf, "ROOT", tmp_path)
    monkeypatch.setattr(deploy_to_hf, "source_files", lambda: (["app.py"], []))
    monkeypatch.setattr(deploy_to_hf, "_remote_files", lambda revision: {})


def test_deployment_dry_run_requires_no_credential_and_makes_no_remote_writes(monkeypatch, tmp_path):
    setup_local(monkeypatch, tmp_path)
    calls = []

    def request(url, method="GET", **kwargs):
        calls.append(method)
        assert method=="GET"
        return {"sha": "a"*40}

    monkeypatch.setattr(deploy_to_hf, "_http_json", request)
    monkeypatch.setattr(deploy_to_hf, "_load_hf_token", lambda *args: pytest.fail("Dry run must not load credentials"))
    plan = tmp_path/"plan.json"
    assert deploy_to_hf.main(["--dry-run", "--plan", str(plan)])==0
    assert calls==["GET"]
    record = json.loads(plan.read_text())
    assert record["expected_parent"]=="a"*40
    assert record["deletions"]==[]
    assert {row["path"] for row in record["changed_files"]}=={"app.py", "HF_RELEASE_SHA256.json"}


def test_deployment_commit_carries_the_reviewed_parent_and_exact_files(monkeypatch, tmp_path):
    setup_local(monkeypatch, tmp_path)
    monkeypatch.setattr(deploy_to_hf, "_load_hf_token", lambda *args: "test-token")
    commits = []

    def request(url, method="GET", data_bytes=None, **kwargs):
        if method=="GET":
            return {"sha": "a"*40}
        if "preupload" in url:
            rows = json.loads(data_bytes)["files"]
            return {"files": [{"path": row["path"], "uploadMode": "regular"} for row in rows]}
        assert url.endswith("/commit/main")
        commits.extend(json.loads(line) for line in data_bytes.decode().splitlines())
        return {"commitOid": "b"*40, "commitUrl": "https://example.invalid/commit"}

    monkeypatch.setattr(deploy_to_hf, "_http_json", request)
    assert deploy_to_hf.main(["--expected-parent", "a"*40, "--plan", str(tmp_path/"plan.json")])==0
    assert commits[0]["value"]["parentCommit"]=="a"*40
    assert {row["value"]["path"] for row in commits[1:]}=={"app.py", "HF_RELEASE_SHA256.json"}
    assert all(row["key"]=="file" for row in commits[1:])


def test_deployment_refuses_a_changed_remote_before_uploading(monkeypatch, tmp_path):
    setup_local(monkeypatch, tmp_path)
    monkeypatch.setattr(deploy_to_hf, "_http_json", lambda *args, **kwargs: {"sha": "b"*40})
    with pytest.raises(RuntimeError, match="changed since review"):
        deploy_to_hf.main(["--expected-parent", "a"*40])
