"""Swap the live Hugging Face Space (Ewaldssphere/MIXA_beta0.3) with the current verified MIXA build via the HF Hub Commit API."""

import argparse
import base64
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from mixa_documentation import build_documentation_bundle
from scripts.build_release import build_source_bundle, source_files
from mixa_data import APP_VERSION

SPACE_ID = "Ewaldssphere/MIXA_beta0.3"
API_BASE = f"https://huggingface.co/api/spaces/{SPACE_ID}"
LFS_BATCH_URL = f"https://huggingface.co/spaces/{SPACE_ID}.git/info/lfs/objects/batch"


def _load_hf_token(token_file=None):
    """Use existing service credentials without opening dialogs or saving secrets."""
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token:
        return token
    paths = ([Path(token_file)] if token_file else [])+[Path.home()/".env", ROOT/".env"]
    for path in paths:
        if path.is_file():
            for line in path.read_text(encoding="utf-8").splitlines():
                if "=" not in line or line.lstrip().startswith("#"):
                    continue
                key, value = line.split("=", 1)
                if key.strip() in {"HF_TOKEN", "HUGGING_FACE_HUB_TOKEN"}:
                    value = value.strip().strip('"').strip("'")
                    if value:
                        return value
    for path in [Path.home()/".cache/huggingface/token", Path.home()/".huggingface/token"]:
        if path.is_file() and path.read_text().strip():
            return path.read_text().strip()
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


def _remote_files(revision):
    url = f"{API_BASE}/tree/{revision}?recursive=true&limit=1000"
    files = {}
    while url:
        request = urllib.request.Request(url)
        with urllib.request.urlopen(request, timeout=60) as response:
            for row in json.load(response):
                if row.get("type")=="file":
                    files[row["path"]] = row
            link = response.headers.get("Link", "")
        match = re.search(r'<([^>]+)>;\s*rel="next"', link)
        url = match.group(1) if match else None
        if url and not url.startswith(API_BASE+"/"):
            raise RuntimeError("Unexpected pagination endpoint.")
    return files


def _same_blob(payload, remote):
    if not remote:
        return False
    if remote.get("lfs"):
        return hashlib.sha256(payload).hexdigest()==remote["lfs"]["oid"]
    digest = hashlib.sha1(f"blob {len(payload)}\0".encode()+payload).hexdigest()
    return digest==remote.get("oid")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Inspect the exact remote revision and write a plan without uploading.")
    parser.add_argument("--token-file", type=Path, help="Existing .env file containing the Hugging Face service token; never copied into the release.")
    parser.add_argument("--expected-parent", help="Refuse deployment if the Space has changed from this revision.")
    parser.add_argument("--include-archives", action="store_true", help="Also upload versioned ZIP archives; requires available Hub LFS capacity.")
    parser.add_argument("--plan", type=Path, default=ROOT/"release/hf_deployment_plan.json")
    args = parser.parse_args(argv)
    info = _http_json(API_BASE)
    parent = info["sha"]
    if args.expected_parent and args.expected_parent!=parent:
        raise RuntimeError("The Space changed since review. Inspect its new revision before retrying.")
    remote = _remote_files(parent)
    selected, _ = source_files()
    payloads = {name: (ROOT/name).read_bytes() for name in selected}
    if args.include_archives:
        version = APP_VERSION.removesuffix("-preview")
        payloads[f"MIXA_{version}_source.zip"] = build_source_bundle()
        payloads[f"MIXA_{version}_methods_documentation.zip"] = build_documentation_bundle()
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in payloads.items()}
    payloads["HF_RELEASE_SHA256.json"] = json.dumps(hashes, indent=2, sort_keys=True).encode()
    changed = [{"path": name, "bytes": data, "sha256": hashlib.sha256(data).hexdigest()}
               for name, data in sorted(payloads.items()) if not _same_blob(data, remote.get(name))]
    plan = dict(space=SPACE_ID, version=APP_VERSION, expected_parent=parent,
                changed_files=[dict(path=item["path"], bytes=len(item["bytes"]), sha256=item["sha256"]) for item in changed],
                deletions=[], archives_included=args.include_archives)
    args.plan.parent.mkdir(parents=True, exist_ok=True)
    args.plan.write_text(json.dumps(plan, indent=2))
    print(f"{len(changed)} changed files; parent {parent}; plan {args.plan}")
    if args.dry_run or not changed:
        return 0
    token = _load_hf_token(args.token_file)
    if not token:
        raise RuntimeError("No existing Hugging Face credential found. Set HF_TOKEN or supply --token-file.")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    preupload = {"files": [dict(path=item["path"], size=len(item["bytes"]),
        sample=base64.b64encode(item["bytes"][:512]).decode()) for item in changed]}
    response = _http_json(f"{API_BASE}/preupload/main", method="POST", headers=headers,
                          data_bytes=json.dumps(preupload).encode())
    modes = {row["path"]: row.get("uploadMode", "regular") for row in response.get("files", [])}
    if set(modes)!={item["path"] for item in changed}:
        raise RuntimeError("Preupload did not classify every reviewed file; no commit sent.")
    lfs = [item for item in changed if modes[item["path"]]=="lfs"]
    # A failed archive upload aborts: never claim a successful partial release or
    # delete unrelated cached resources as a workaround for an LFS quota failure.
    _upload_lfs_objects(lfs, token)
    lines = [dict(key="header", value=dict(
        summary=f"Repair MIXA {APP_VERSION}: reproducible MCAM contact/transport fits",
        description="Verified shared capacities, phase presets, solver controls, prediction folds and source package.",
        parentCommit=parent,
    ))]
    for item in changed:
        if modes[item["path"]]=="lfs":
            lines.append(dict(key="lfsFile", value=dict(path=item["path"], algo="sha256",
                         oid=item["sha256"], size=len(item["bytes"]))))
        else:
            lines.append(dict(key="file", value=dict(path=item["path"], encoding="base64",
                         content=base64.b64encode(item["bytes"]).decode())))
    result = _http_json(f"{API_BASE}/commit/main", method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/x-ndjson"},
        data_bytes=("\n".join(json.dumps(line) for line in lines)+"\n").encode())
    plan["commit"] = result.get("commitOid")
    plan["commit_url"] = result.get("commitUrl")
    args.plan.write_text(json.dumps(plan, indent=2))
    print("Deployed", plan["commit"], plan["commit_url"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
