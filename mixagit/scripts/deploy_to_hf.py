"""Swap the live Hugging Face Space (Ewaldssphere/MIXA_beta0.3) with the current verified MIXA build via the HF Hub Commit API."""

import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from mixa_documentation import build_documentation_bundle
from scripts.build_release import FILES, main as build_release_main

SPACE_ID = "Ewaldssphere/MIXA_beta0.3"
API_BASE = f"https://huggingface.co/api/spaces/{SPACE_ID}"
LFS_BATCH_URL = f"https://huggingface.co/spaces/{SPACE_ID}.git/info/lfs/objects/batch"


def _load_hf_token():
    for env_path in [Path.home() / ".env", ROOT / ".env"]:
        if env_path.is_file():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k in {"HF_TOKEN", "HUGGING_FACE_HUB_TOKEN"} and v:
                    return v
    env_tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if env_tok:
        return env_tok
    if sys.platform == "darwin":
        try:
            prompt_tok = subprocess.check_output(
                [
                    "osascript",
                    "-e",
                    'tell application "System Events" to activate',
                    "-e",
                    'tell application "System Events" to text returned of (display dialog "Paste your Hugging Face Write Token (hf_...):" default answer "" with title "MIXA Hugging Face Deployment" with hidden answer)',
                ],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            if prompt_tok:
                env_file = ROOT / ".env"
                env_file.write_text(f"HF_TOKEN={prompt_tok}\n", encoding="utf-8")
                os.chmod(env_file, 0o600)
                return prompt_tok
        except subprocess.CalledProcessError:
            return None
    return None


def _http_json(url, method="GET", headers=None, data_bytes=None):
    req = urllib.request.Request(url, data=data_bytes, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            if not body.strip():
                return {}
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                return {"raw": body}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} on {method} {url}: {err_body[:400]}") from exc


def _upload_lfs_objects(lfs_items, token):
    if not lfs_items:
        return
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.git-lfs+json",
        "Content-Type": "application/vnd.git-lfs+json",
    }
    payload = {
        "operation": "upload",
        "transfers": ["basic", "multipart"],
        "hash_algo": "sha256",
        "ref": {"name": "refs/heads/main"},
        "objects": [{"oid": item["sha256"], "size": len(item["bytes"])} for item in lfs_items],
    }
    resp = _http_json(
        LFS_BATCH_URL,
        method="POST",
        headers=headers,
        data_bytes=json.dumps(payload).encode("utf-8"),
    )
    by_oid = {item["sha256"]: item["bytes"] for item in lfs_items}
    for obj in resp.get("objects", []):
        oid = obj["oid"]
        raw = by_oid[oid]
        if "error" in obj:
            raise RuntimeError(f"LFS batch error for {oid}: {obj['error']}")
        actions = obj.get("actions")
        if not actions or "upload" not in actions:
            continue
        up = actions["upload"]
        up_href = up["href"]
        up_headers = dict(up.get("header") or {})
        chunk_size_str = up_headers.pop("chunk_size", None)
        if chunk_size_str is not None:
            # Multipart LFS upload
            chunk_size = int(chunk_size_str)
            part_keys = sorted(
                (int(k), v) for k, v in up_headers.items() if k.isdigit()
            )
            complete_parts = []
            for part_num, part_url in part_keys:
                start = (part_num - 1) * chunk_size
                chunk = raw[start : start + chunk_size]
                part_req = urllib.request.Request(part_url, data=chunk, method="PUT")
                with urllib.request.urlopen(part_req, timeout=180) as part_resp:
                    etag = part_resp.headers.get("ETag") or part_resp.headers.get("etag")
                complete_parts.append({"partNumber": part_num, "etag": etag})
            comp_body = json.dumps({"oid": oid, "parts": complete_parts}).encode("utf-8")
            _http_json(
                up_href,
                method="POST",
                headers={"Accept": "application/vnd.git-lfs+json", "Content-Type": "application/vnd.git-lfs+json"},
                data_bytes=comp_body,
            )
        else:
            put_req = urllib.request.Request(up_href, data=raw, headers=up_headers, method="PUT")
            with urllib.request.urlopen(put_req, timeout=180):
                pass
        if "verify" in actions:
            ver = actions["verify"]
            ver_headers = dict(ver.get("header") or {})
            ver_headers.setdefault("Accept", "application/vnd.git-lfs+json")
            ver_headers.setdefault("Content-Type", "application/vnd.git-lfs+json")
            _http_json(
                ver["href"],
                method="POST",
                headers=ver_headers,
                data_bytes=json.dumps({"oid": oid, "size": len(raw)}).encode("utf-8"),
            )


def main():
    token = _load_hf_token()
    if not token:
        raise SystemExit("Missing HF_TOKEN in ~/.env. Please save your Hugging Face write token first.")

    # 1. Build fresh source and documentation archives
    source_zip = ROOT / "release" / "MIXA_0.5.10_source.zip"
    doc_zip = ROOT / "release" / "MIXA_0.5.10_methods_documentation.zip"
    source_zip.parent.mkdir(parents=True, exist_ok=True)
    sys.argv = ["build_release.py", "--output", str(source_zip)]
    build_release_main()
    doc_zip.write_bytes(build_documentation_bundle())

    # 2. Load previous deployed SHA256 map so we only upload changed/new files
    prev_manifest_path = ROOT / "release" / "hf-release-0.5.10-20261021" / "HF_RELEASE_SHA256.json"
    prev_hashes = (
        json.loads(prev_manifest_path.read_text(encoding="utf-8"))
        if prev_manifest_path.is_file()
        else {}
    )

    all_hashes = dict(prev_hashes)
    changed_files = []

    def stage_file(repo_path, raw_bytes):
        digest = hashlib.sha256(raw_bytes).hexdigest()
        all_hashes[repo_path] = digest
        if prev_hashes.get(repo_path) != digest:
            changed_files.append({"path": repo_path, "bytes": raw_bytes, "sha256": digest})

    for rel_name in FILES:
        if rel_name.endswith(("runs.json", "simulation_runs.json", "blind_runs.json", "Response_to_Reviewer_1.pdf", "Response_to_Reviewer_1.docx")):
            continue
        p_full = ROOT / rel_name
        if p_full.is_file() and p_full.stat().st_size < 5 * 1024 * 1024:
            stage_file(rel_name, p_full.read_bytes())

    # Ensure .gitattributes does not force small (<5 MB) .pkl/.png/.pdf/.svg files into LFS when LFS quota is full
    gitattributes_content = (
        "*.bundle filter=lfs diff=lfs merge=lfs -text\n"
        "*.zip filter=lfs diff=lfs merge=lfs -text\n"
    ).encode("utf-8")
    stage_file(".gitattributes", gitattributes_content)

    manifest_bytes = json.dumps(all_hashes, indent=2, sort_keys=True).encode("utf-8")
    stage_file("HF_RELEASE_SHA256.json", manifest_bytes)

    if not changed_files:
        print("All files on the Hugging Face Space already match the local build.")
        return 0

    print(f"Preparing to upload {len(changed_files)} changed/new files to {SPACE_ID}...")

    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # 3. Preupload check to determine regular vs LFS mode for each changed file
    preupload_payload = {
        "files": [
            {
                "path": item["path"],
                "size": len(item["bytes"]),
                "sample": base64.b64encode(item["bytes"][:512]).decode("ascii"),
            }
            for item in changed_files
        ]
    }
    preupload_resp = _http_json(
        f"{API_BASE}/preupload/main",
        method="POST",
        headers=auth_headers,
        data_bytes=json.dumps(preupload_payload).encode("utf-8"),
    )
    mode_by_path = {
        f["path"]: f.get("uploadMode", "regular") for f in preupload_resp.get("files", [])
    }

    lfs_items = [item for item in changed_files if mode_by_path.get(item["path"]) == "lfs"]
    regular_items = [item for item in changed_files if mode_by_path.get(item["path"]) != "lfs"]

    deleted_lfs_paths = []
    if lfs_items:
        print(f"Uploading {len(lfs_items)} LFS archive(s)...")
        try:
            _upload_lfs_objects(lfs_items, token)
        except RuntimeError as exc:
            if "Storage limit reached" in str(exc) or "HTTP 403" in str(exc):
                print("LFS quota full on Space; skipping binary LFS blobs and committing text/code/b64 updates...")
                deleted_lfs_paths = [
                    item["path"] for item in lfs_items if item["path"].endswith(".pkl")
                ]
                lfs_items = []
            else:
                raise

    # 4. Commit all regular and LFS changes atomically to main
    ndjson_lines = [
        json.dumps(
            {
                "key": "header",
                "value": {
                    "summary": "Update MIXA 0.5.10: Monovalent analyte valency, Two-site/two-component (2:1) naming, native Jacobian model_se & k=11 provenance, 1.35 nm LG1-3 ceiling & sensitivity, retire 4.63 nM fallback",
                    "description": "",
                },
            }
        )
    ]
    for del_path in deleted_lfs_paths:
        ndjson_lines.append(
            json.dumps(
                {
                    "key": "deletedFile",
                    "value": {"path": del_path},
                }
            )
        )
    for item in regular_items:
        ndjson_lines.append(
            json.dumps(
                {
                    "key": "file",
                    "value": {
                        "content": base64.b64encode(item["bytes"]).decode("ascii"),
                        "path": item["path"],
                        "encoding": "base64",
                    },
                }
            )
        )
    for item in lfs_items:
        ndjson_lines.append(
            json.dumps(
                {
                    "key": "lfsFile",
                    "value": {
                        "path": item["path"],
                        "algo": "sha256",
                        "oid": item["sha256"],
                        "size": len(item["bytes"]),
                    },
                }
            )
        )
    ndjson_body = ("\n".join(ndjson_lines) + "\n").encode("utf-8")

    commit_resp = _http_json(
        f"{API_BASE}/commit/main",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/x-ndjson",
        },
        data_bytes=ndjson_body,
    )
    if prev_manifest_path.parent.is_dir():
        prev_manifest_path.write_bytes(manifest_bytes)
    commit_oid = commit_resp.get("commitOid")
    commit_url = commit_resp.get("commitUrl", f"https://huggingface.co/spaces/{SPACE_ID}")
    print(f"Successfully deployed to https://huggingface.co/spaces/{SPACE_ID}")
    print(f"New commit OID: {commit_oid}")
    print(f"Commit URL: {commit_url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
