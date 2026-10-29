"""Validated imports and explicit experimental design for MIXA."""

import hashlib
import io
import json
import re
from copy import deepcopy
from pathlib import Path

import numpy as np
import pandas as pd

from mixa_input_uncertainty import source_id

APP_VERSION = "0.5.10-preview"

ROLES = ["Sample", "Negative control", "Exclude"]
BACKGROUND_MODES = ["None", "Matched concentrations", "Control 0 nM", "Same-file 0 nM"]
DESIGN_COLUMNS = ["File", "Role", "Experiment", "Repeat ID", "Background set", "Subtraction"]
COLUMN_ROLES = ["Sample", "Reference (0 nM)", "Exclude"]
UNIT_OPTIONS = ["fM", "pM", "nM", "uM", "mM", "M"]
SAMPLE_FILES = ("PreprocessedData-Group1.csv", "PreprocessedData-Group2a.csv")

UNIT_TO_NM = {
    "fm": 1e-6,
    "pm": 1e-3,
    "nm": 1.0,
    "um": 1e3,
    "µm": 1e3,
    "μm": 1e3,
    "mm": 1e6,
    "m": 1e9,
}

CANONICAL_UNIT = {
    "fm": "fM",
    "pm": "pM",
    "nm": "nM",
    "um": "uM",
    "µm": "uM",
    "μm": "uM",
    "mm": "mM",
    "m": "M",
}

_CONC_HEADER_RE = re.compile(
    r"(?<![\w.])([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(fM|pM|nM|uM|µM|μM|mM|M)\b",
    re.IGNORECASE,
)
_REFERENCE_HEADER_RE = re.compile(
    r"(?:^\s*(?:0(?:\.0+)?|blank|buffer|ref(?:erence)?|control|ctrl|nsb|zero|baseline)(?:[\s\(\[_#\-].*)?\s*$)"
    r"|(?:[\(\[\s_\-](?:blank|buffer|ref(?:erence)?|nsb|zero)\b)",
    re.IGNORECASE,
)
_BARE_NUMERIC_RE = re.compile(r"^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*$", re.IGNORECASE)
_TIME_COL_RE = re.compile(
    r"^\s*(?:time(?:[\s_]*\(?s(?:ec(?:ond)?s?)?\)?|[\s_]*\(?min(?:ute)?s?\)?)?|t_?s|seconds?)\s*$",
    re.IGNORECASE,
)
_PAIRED_TIME_COL_RE = re.compile(
    r"^\s*(?:time|t|x)[\s_#-]*\d+|.*[\(\[\s_](?:time|sec|seconds)\b",
    re.IGNORECASE,
)


def parse_concentration_nM(label):
    """Extract a concentration from a column header in fM, pM, nM, uM/µM, mM, or M and convert to nM."""
    match = _CONC_HEADER_RE.search(str(label))
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    scale = UNIT_TO_NM.get(unit)
    if scale is None:
        return None
    return float(f"{value * scale:.12g}")


def classify_column_header(label, default_unit="nM", allow_bare_numeric=True):
    """Classify a column header into role, numeric value, unit, and concentration_nM."""
    text = str(label).strip()
    norm_default = CANONICAL_UNIT.get(str(default_unit).strip().lower(), "nM")
    match = _CONC_HEADER_RE.search(text)
    if match:
        value = float(match.group(1))
        unit_key = match.group(2).lower()
        unit = CANONICAL_UNIT.get(unit_key, "nM")
        scale = UNIT_TO_NM[unit_key]
        conc_nM = float(f"{value * scale:.12g}")
        role = "Reference (0 nM)" if conc_nM == 0.0 else "Sample"
        return {
            "column": text,
            "role": role,
            "value": 0.0 if conc_nM == 0.0 else value,
            "unit": unit,
            "concentration_nM": conc_nM,
            "named_reference": False,
        }
    if _REFERENCE_HEADER_RE.search(text):
        is_bare_zero = bool(_BARE_NUMERIC_RE.match(text))
        return {
            "column": text,
            "role": "Reference (0 nM)",
            "value": 0.0,
            "unit": norm_default,
            "concentration_nM": 0.0,
            "named_reference": not is_bare_zero,
        }
    if allow_bare_numeric:
        bare = _BARE_NUMERIC_RE.match(text)
        if bare:
            value = float(bare.group(1))
            scale = UNIT_TO_NM.get(norm_default.lower(), 1.0)
            conc_nM = float(f"{value * scale:.12g}")
            role = "Reference (0 nM)" if conc_nM == 0.0 else "Sample"
            return {
                "column": text,
                "role": role,
                "value": 0.0 if conc_nM == 0.0 else value,
                "unit": norm_default,
                "concentration_nM": conc_nM,
                "named_reference": False,
            }
    return {
        "column": text,
        "role": "Exclude",
        "value": np.nan,
        "unit": norm_default,
        "concentration_nM": np.nan,
        "named_reference": False,
    }


def _read_tabular_bytes(payload, filename=""):
    """Parse CSV/TSV/semicolon/Excel bytes, skipping optional instrument metadata preamble lines."""
    fname_low = str(filename).lower()
    if payload[:4] == b"PK\x03\x04" or fname_low.endswith((".xlsx", ".xls")):
        try:
            return pd.read_excel(io.BytesIO(payload))
        except Exception as exc:
            if payload[:4] == b"PK\x03\x04" or fname_low.endswith((".xlsx", ".xls")):
                raise ValueError(f"Could not read Excel file {filename}: {exc}") from exc
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = payload.decode("latin-1")
    lines = text.splitlines()
    if not lines:
        return pd.DataFrame()
    start_idx = 0
    sep = ","
    long_known = {
        "time_s", "time", "time (s)", "time_min", "time (min)", "seconds",
        "response", "signal", "ru", "nm", "shift", "conc", "concentration", "concentration_nm",
    }
    for idx, raw_line in enumerate(lines[:100]):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        candidate_sep = "\t" if "\t" in stripped else (";" if stripped.count(";") > stripped.count(",") else ",")
        tokens = [tok.strip().strip('"').strip("'") for tok in stripped.split(candidate_sep)]
        if len(tokens) >= 2:
            first_low = tokens[0].lower()
            has_conc_token = any(
                parse_concentration_nM(tok) is not None
                or bool(_REFERENCE_HEADER_RE.search(tok))
                or bool(_BARE_NUMERIC_RE.match(tok))
                for tok in tokens[1:]
            )
            has_long_cols = len(long_known.intersection({t.lower() for t in tokens})) >= 2
            has_time_col = any(bool(_TIME_COL_RE.match(t)) or t.lower().startswith("time") for t in tokens)
            if has_long_cols or (has_time_col and has_conc_token) or first_low.startswith("time"):
                start_idx = idx
                sep = candidate_sep
                break
    trimmed = "\n".join(lines[start_idx:])
    return pd.read_csv(io.StringIO(trimmed), sep=sep)


def load_sample_datasets(filenames=None):
    """Load the original bundled examples using paths relative to the application."""
    root = Path(__file__).resolve().parent
    datasets = []
    for filename in SAMPLE_FILES if filenames is None else filenames:
        if filename not in SAMPLE_FILES:
            raise ValueError("Choose a bundled sample dataset.")
        path = next((p for p in (root / "data" / filename, root / filename) if p.is_file()), None)
        if path is None:
            raise ValueError(f"Sample file is missing: {filename}.")
        datasets.append(read_dataset(path.read_bytes(), filename))
    return datasets


def _rebuild_dataset_from_schema(dataset):
    """Rebuild responses, concentrations, SNR, and sha256 from dataset['raw_columns'] and dataset['column_schema']."""
    raw_cols = dataset.get("raw_columns", {})
    schema = dataset.get("column_schema", [])
    responses = {}
    ref_traces = []
    ignored = []
    normalized_schema = []
    for entry in schema:
        col = str(entry["column"])
        if col not in raw_cols:
            continue
        role = str(entry.get("role", "Sample"))
        unit_raw = str(entry.get("unit", "nM")).strip()
        unit = CANONICAL_UNIT.get(unit_raw.lower(), "nM")
        scale = UNIT_TO_NM.get(unit.lower(), 1.0)
        val = entry.get("value", np.nan)
        try:
            val_f = float(val)
        except (TypeError, ValueError):
            val_f = np.nan
        y = raw_cols[col]
        if role == "Exclude" or (role == "Sample" and not np.isfinite(val_f)):
            ignored.append(col)
            normalized_schema.append({
                "column": col,
                "role": "Exclude",
                "value": np.nan,
                "unit": unit,
                "concentration_nM": np.nan,
                "named_reference": bool(entry.get("named_reference", False)),
            })
            continue
        if role == "Reference (0 nM)" or val_f == 0.0:
            if not np.isfinite(y).all():
                raise ValueError(f"{col} contains missing or nonnumeric responses. Clean these values before import.")
            if 0.0 in responses and not entry.get("named_reference", False) and not entry.get("user_edited", False):
                raise ValueError("Duplicate 0 nM columns. Put repeats in separate files.")
            ref_traces.append(y)
            responses[0.0] = np.mean(ref_traces, axis=0) if len(ref_traces) > 1 else y.copy()
            normalized_schema.append({
                "column": col,
                "role": "Reference (0 nM)",
                "value": 0.0,
                "unit": unit,
                "concentration_nM": 0.0,
                "named_reference": bool(entry.get("named_reference", False)),
            })
            continue
        conc = float(f"{val_f * scale:.12g}")
        if conc < 0 or not np.isfinite(conc):
            raise ValueError(f"Invalid concentration in {col}.")
        if conc in responses:
            raise ValueError(f"Duplicate {conc:g} nM columns. Put repeats in separate files.")
        if not np.isfinite(y).all():
            raise ValueError(f"{col} contains missing or nonnumeric responses. Clean these values before import.")
        responses[conc] = y.copy()
        normalized_schema.append({
            "column": col,
            "role": "Sample",
            "value": val_f,
            "unit": unit,
            "concentration_nM": conc,
            "named_reference": False,
        })
    if not responses:
        raise ValueError("No concentration columns found. Use headers such as '0 nM', '10 nM', '100 nM' (fM, pM, nM, uM, mM, or M).")
    snr = [np.ptp(y) / max(np.std(y[:10]), 1e-12) for y in responses.values()]
    base_sha = dataset.get("base_sha256") or hashlib.sha256(dataset.get("source_bytes", b"")).hexdigest()
    if any(e.get("user_edited", False) for e in schema):
        override_tag = json.dumps(
            [(e["column"], e["role"], e["concentration_nM"]) for e in normalized_schema],
            sort_keys=True,
        )
        effective_sha = hashlib.sha256(f"{base_sha}:{override_tag}".encode()).hexdigest()
    else:
        effective_sha = base_sha
    dataset["responses"] = responses
    dataset["concentrations"] = sorted(responses)
    dataset["snr_avg"] = float(np.mean(snr))
    dataset["ignored_columns"] = ignored
    dataset["column_schema"] = normalized_schema
    dataset["base_sha256"] = base_sha
    dataset["sha256"] = effective_sha
    return dataset


def apply_column_schema(dataset, schema_rows):
    """Apply user-edited column mappings (role, value, unit) to a dataset in place and return it."""
    updated = deepcopy(dataset)
    cleaned = []
    for row in schema_rows:
        item = dict(row)
        item["user_edited"] = True
        cleaned.append(item)
    updated["column_schema"] = cleaned
    return _rebuild_dataset_from_schema(updated)


def read_dataset(payload, filename, *, default_unit="nM", allow_bare_numeric=True):
    """Read wide concentration columns (fM–M, bare numbers, Blank/Buffer) or long table data."""
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    df = _read_tabular_bytes(payload, filename=filename)
    df.columns = [str(c).strip().replace("\ufeff", "").replace("ï»¿", "") for c in df.columns]
    col_map_lower = {c.lower(): c for c in df.columns}
    # Normalize flexible long-table column aliases
    time_aliases = ("time_s", "time", "time (s)", "seconds", "t", "time_min", "time (min)", "time (minutes)")
    resp_aliases = ("response", "signal", "ru", "response (ru)", "nm", "shift", "shift (nm)", "binding", "value", "y")
    conc_aliases = ("concentration", "conc", "conc_nm", "conc (nm)", "analyte", "analyte_nm")
    found_time_col = next((col_map_lower[a] for a in time_aliases if a in col_map_lower), None)
    found_resp_col = next((col_map_lower[a] for a in resp_aliases if a in col_map_lower), None)
    found_conc_col = next((col_map_lower[a] for a in conc_aliases if a in col_map_lower), None)
    has_unit_conc_col = any(
        f"concentration_{u}" in col_map_lower for u in ("fm", "pm", "nm", "um", "µm", "mm", "m")
    )
    if found_time_col and found_resp_col and (found_conc_col or has_unit_conc_col):
        time_is_min = "min" in found_time_col.lower()
        rename_map = {}
        if found_time_col != "time_s":
            rename_map[found_time_col] = "time_s"
        if found_resp_col != "response":
            rename_map[found_resp_col] = "response"
        if rename_map:
            df = df.rename(columns=rename_map)
        if time_is_min:
            df["time_s"] = pd.to_numeric(df["time_s"], errors="coerce") * 60.0
        col_map_lower = {c.lower(): c for c in df.columns}
    for unit_suffix, mult in [("fm", 1e-6), ("pm", 1e-3), ("um", 1e3), ("µm", 1e3), ("mm", 1e6), ("m", 1e9)]:
        key = f"concentration_{unit_suffix}"
        if key in col_map_lower and "concentration_nM" not in df.columns:
            raw_col = col_map_lower[key]
            df["concentration_nM"] = pd.to_numeric(df[raw_col], errors="coerce") * mult
            break
    if (
        "time_s" in df.columns
        and "response" in df.columns
        and "concentration_nM" not in df.columns
        and found_conc_col is not None
    ):
        c_col = col_map_lower.get(found_conc_col.lower(), found_conc_col)
        u_col = col_map_lower.get("unit") or col_map_lower.get("units")
        c_vals = pd.to_numeric(df[c_col], errors="coerce")
        if u_col is not None:
            scales = df[u_col].astype(str).str.strip().str.lower().map(UNIT_TO_NM)
            if scales.isna().any():
                raise ValueError("Unrecognized concentration unit in unit column. Use fM, pM, nM, uM, mM, or M.")
            df["concentration_nM"] = c_vals * scales.to_numpy(dtype=float)
        else:
            scale = UNIT_TO_NM.get(str(default_unit).strip().lower(), 1.0)
            df["concentration_nM"] = c_vals * scale
    if {"time_s", "concentration_nM", "response"}.issubset(df.columns):
        numeric = df[["time_s", "concentration_nM", "response"]].apply(pd.to_numeric, errors="coerce")
        if not np.isfinite(numeric.to_numpy()).all():
            raise ValueError("Time, concentration and response must be finite numbers.")
        numeric["concentration_nM"] = numeric["concentration_nM"].map(lambda v: float(f"{float(v):.12g}"))
        if numeric.duplicated(["time_s", "concentration_nM"]).any():
            raise ValueError("Duplicate time/concentration rows. Put separate repeats in separate files.")
        df = numeric.pivot(index="time_s", columns="concentration_nM", values="response").reset_index()
        df.columns = ["time_s"] + [f"{c:g} nM" for c in df.columns[1:]]
    if len(df.columns) < 2:
        raise ValueError("Expected a time column followed by response columns such as '10 nM'.")
    # Identify the primary time column (supports non-first time column and minutes conversion)
    time_col_idx = 0
    for idx, col in enumerate(df.columns):
        if _TIME_COL_RE.match(str(col)):
            time_col_idx = idx
            break
    time_col_name = df.columns[time_col_idx]
    t = pd.to_numeric(df.iloc[:, time_col_idx], errors="coerce").to_numpy(dtype=float)
    if "min" in str(time_col_name).lower() and not str(time_col_name).lower().startswith("min"):
        t = t * 60.0
    if len(t) < 8 or not np.isfinite(t).all():
        raise ValueError("At least 8 rows with finite time values are required (seconds).")
    order = np.argsort(t, kind="stable")
    t = t[order]
    if np.any(np.diff(t) <= 0):
        raise ValueError("Time values must be unique. Duplicate timestamps are not averaged automatically.")
    raw_columns = {}
    column_schema = []
    for idx, col in enumerate(df.columns):
        if idx == time_col_idx:
            continue
        col_str = str(col)
        # Skip duplicate/interleaved time columns in multi-cycle Biacore/Octet exports
        if _PAIRED_TIME_COL_RE.match(col_str) and parse_concentration_nM(col_str) is None:
            cand_t = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=float)[order]
            if np.isfinite(cand_t).all() and np.allclose(cand_t, t, rtol=1e-3, atol=1e-2):
                continue
        info = classify_column_header(col_str, default_unit=default_unit, allow_bare_numeric=allow_bare_numeric)
        if info["role"] != "Exclude":
            conc_val = info["concentration_nM"]
            if conc_val < 0 or not np.isfinite(conc_val):
                raise ValueError(f"Invalid concentration in {col_str}.")
        y = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=float)[order]
        if info["role"] != "Exclude" and not np.isfinite(y).all():
            raise ValueError(f"{col_str} contains missing or nonnumeric responses. Clean these values before import.")
        raw_columns[col_str] = y
        column_schema.append(info)
    base_sha = hashlib.sha256(payload).hexdigest()
    dataset = {
        "filename": filename,
        "time": t,
        "n_points": len(t),
        "time_range": (float(t[0]), float(t[-1])),
        "base_sha256": base_sha,
        "sha256": base_sha,
        "source_bytes": payload,
        "raw_columns": raw_columns,
        "column_schema": column_schema,
    }
    return _rebuild_dataset_from_schema(dataset)


def default_design(datasets):
    # Files are technical measurements of one repeat until the user declares independence.
    return pd.DataFrame([
        {"File": d["filename"], "Role": "Sample", "Experiment": "Experiment 1",
         "Repeat ID": "Repeat 1", "Background set": "", "Subtraction": "None"}
        for d in datasets
    ], columns=DESIGN_COLUMNS)


_CONTROL_FILE_RE = re.compile(
    r"(?:^|[\W_])(control|ctrl|blank|buffer|ref|reference|nsb|neg)(?:$|[\W_\d])",
    re.IGNORECASE,
)
_REPEAT_TOKEN_RE = re.compile(
    r"(?:rep(?:eat)?|run|cycle|group|day|plate|sensor|ch(?:annel)?)[\s_\-]*(\d+[a-z]?)"
    r"|(?:^|[\s_\-])r(\d+)(?:$|[\s_\-.])",
    re.IGNORECASE,
)


def _infer_repeat_token(filename):
    stem = Path(str(filename)).stem
    match = _REPEAT_TOKEN_RE.search(stem)
    if not match:
        return None
    token = match.group(1) or match.group(2)
    return str(token)


def smart_predict_design(datasets, experiment_name="Experiment 1"):
    """Predict Role, Repeat ID, Background set, and Subtraction from filenames and trace contents."""
    if not datasets:
        return pd.DataFrame(columns=DESIGN_COLUMNS)
    rows = []
    for d in datasets:
        fname = d["filename"]
        concs = d.get("concentrations", [])
        nonzero = [c for c in concs if c > 0]
        is_control = bool(_CONTROL_FILE_RE.search(Path(fname).stem)) or (bool(concs) and not nonzero)
        rep_token = _infer_repeat_token(fname)
        rows.append({
            "File": fname,
            "Role": "Negative control" if is_control else "Sample",
            "Experiment": experiment_name,
            "rep_token": rep_token,
            "concentrations": set(concs),
            "nonzero": set(nonzero),
            "has_zero": 0.0 in concs,
            "zero_nonzero_signal": bool(
                0.0 in d.get("responses", {}) and np.max(np.abs(d["responses"][0.0])) > 1e-9
            ),
        })
    # Assign Repeat IDs for samples and controls
    sample_rows = [r for r in rows if r["Role"] == "Sample"]
    unique_sample_tokens = []
    for r in sample_rows:
        if r["rep_token"] and r["rep_token"] not in unique_sample_tokens:
            unique_sample_tokens.append(r["rep_token"])
    token_to_repeat = {tok: f"Repeat {idx}" for idx, tok in enumerate(unique_sample_tokens, 1)}
    next_sample_idx = 1
    for r in rows:
        if r["Role"] == "Sample":
            if r["rep_token"] in token_to_repeat:
                r["Repeat ID"] = token_to_repeat[r["rep_token"]]
            else:
                r["Repeat ID"] = f"Repeat {next_sample_idx}"
                next_sample_idx += 1
    control_rows = [r for r in rows if r["Role"] == "Negative control"]
    next_ctrl_idx = 1
    for r in control_rows:
        if r["rep_token"] in token_to_repeat:
            r["Repeat ID"] = token_to_repeat[r["rep_token"]]
        elif r["rep_token"]:
            r["Repeat ID"] = f"Repeat {r['rep_token']}"
        else:
            r["Repeat ID"] = f"Repeat {next_ctrl_idx if len(control_rows) > 1 else 1}"
            next_ctrl_idx += 1
    # Pair controls and determine subtraction mode
    if control_rows:
        ctrl_by_repeat = {}
        for idx, r in enumerate(control_rows, 1):
            rep_num = re.search(r"(\d+[a-z]?)", r["Repeat ID"])
            group_name = f"Control {rep_num.group(1)}" if rep_num else f"Control {idx}"
            r["Background set"] = group_name
            r["Subtraction"] = "None"
            ctrl_by_repeat.setdefault(r["Repeat ID"], []).append(r)
        default_ctrl_group = control_rows[0]["Background set"]
        for r in sample_rows:
            matched_ctrls = ctrl_by_repeat.get(r["Repeat ID"], control_rows)
            r["Background set"] = matched_ctrls[0]["Background set"] if matched_ctrls else default_ctrl_group
            ctrl_concs = set.union(*(c["concentrations"] for c in matched_ctrls)) if matched_ctrls else set()
            if r["nonzero"] and r["nonzero"].issubset(ctrl_concs):
                r["Subtraction"] = "Matched concentrations"
            elif 0.0 in ctrl_concs:
                r["Subtraction"] = "Control 0 nM"
            else:
                r["Subtraction"] = "None"
    else:
        for r in sample_rows:
            r["Background set"] = ""
            if r["has_zero"] and r["zero_nonzero_signal"]:
                r["Subtraction"] = "Same-file 0 nM"
            else:
                r["Subtraction"] = "None"
    return pd.DataFrame(
        [{col: r[col] for col in DESIGN_COLUMNS} for r in rows],
        columns=DESIGN_COLUMNS,
    )


def validate_design(datasets, design):
    if not set(DESIGN_COLUMNS).issubset(design.columns):
        raise ValueError("The experiment table is missing required columns.")
    table = design[DESIGN_COLUMNS].fillna("").astype(str).apply(lambda col: col.str.strip())
    names = [d["filename"] for d in datasets]
    if len(names) != len(set(names)):
        raise ValueError("Files must have distinct names. Rename duplicate filenames before uploading.")
    if table["File"].duplicated().any() or set(table["File"]) != set(names):
        raise ValueError("The experiment table must contain every uploaded file exactly once.")
    for row in table.to_dict("records"):
        if row["Role"] not in ROLES or row["Subtraction"] not in BACKGROUND_MODES:
            raise ValueError(f"{row['File']}: choose a valid role and subtraction method.")
        if row["Role"] == "Exclude":
            continue
        if not row["Experiment"] or not row["Repeat ID"]:
            raise ValueError(f"{row['File']}: experiment and repeat ID are required.")
        if row["Role"] == "Negative control" and not row["Background set"]:
            raise ValueError(f"{row['File']}: give the control a background set name.")
        if row["Role"] == "Sample" and row["Subtraction"] in {"Matched concentrations", "Control 0 nM"} and not row["Background set"]:
            raise ValueError(f"{row['File']}: specify which background set to subtract.")
    return table


def _detect_file_on(dataset):
    if dataset.get("phase_assoc_start_s") is not None and np.isfinite(dataset.get("phase_assoc_start_s")):
        return float(dataset["phase_assoc_start_s"])
    from mixa_selection import detect_binding_phases
    nonzero = {c for c in dataset["concentrations"] if c > 0}
    if not nonzero:
        return float(dataset["time"][0])
    return float(detect_binding_phases([dataset], {dataset["filename"]: nonzero})["on"])


def prepare_experiment(datasets, design, experiment, *, align_phases=False, phase_offsets=None):
    """Subtract designated controls, never extrapolate, and preserve raw observations."""
    table = validate_design(datasets, design)
    source = {d["filename"]: d for d in datasets}
    records = table.to_dict("records")
    samples = [r for r in records if r["Experiment"] == experiment and r["Role"] == "Sample"]
    if not samples:
        raise ValueError("Select an experiment containing at least one sample.")
    shifts = {}
    if phase_offsets:
        shifts = {str(k): float(v) for k, v in phase_offsets.items()}
    elif align_phases:
        sample_ons = {r["File"]: _detect_file_on(source[r["File"]]) for r in samples}
        target_on = sample_ons[samples[0]["File"]]
        for r in records:
            if r["Experiment"] != experiment or r["Role"] == "Exclude":
                continue
            fn = r["File"]
            file_on = sample_ons.get(fn)
            if file_on is None:
                raw_ctrl = source[fn]
                if raw_ctrl.get("phase_assoc_start_s") is not None or any(c > 0 for c in raw_ctrl["concentrations"]):
                    file_on = _detect_file_on(raw_ctrl)
                else:
                    matched_sample = next(
                        (s for s in samples if s["Repeat ID"] == r["Repeat ID"] or s["Background set"] == r["Background set"]),
                        samples[0],
                    )
                    file_on = sample_ons[matched_sample["File"]]
            shifts[fn] = float(target_on - file_on)
    prepared, provenance = [], []
    for row in samples:
        raw = source[row["File"]]
        sample_shift = shifts.get(row["File"], 0.0)
        sample_time = raw["time"] + sample_shift
        mode = row["Subtraction"]
        controls = [r for r in records if r["Role"] == "Negative control"
                    and r["Experiment"] == experiment and r["Background set"] == row["Background set"]]
        if mode == "Same-file 0 nM":
            controls = [row]
        if mode != "None" and not controls:
            raise ValueError(f"{row['File']}: no negative controls in background set '{row['Background set']}'.")
        item = {k: deepcopy(v) for k, v in raw.items() if k != "source_bytes"}
        item["time"] = sample_time.copy()
        item["time_range"] = (float(sample_time[0]), float(sample_time[-1]))
        if sample_shift != 0.0:
            item["time_shift_s"] = float(sample_shift)
            if "phase_assoc_start_s" in item and item["phase_assoc_start_s"] is not None:
                item["phase_assoc_start_s"] = float(item["phase_assoc_start_s"]) + sample_shift
            if "phase_dissoc_start_s" in item and item["phase_dissoc_start_s"] is not None:
                item["phase_dissoc_start_s"] = float(item["phase_dissoc_start_s"]) + sample_shift
        item.update(experiment=experiment, repeat_id=row["Repeat ID"], repeat_group=experiment,
                    background_set=row["Background set"], subtraction=mode)
        item["raw_responses"] = {c: y.copy() for c, y in raw["responses"].items()}
        item["background_responses"] = {}
        item["measurement_sources"] = {}

        def noise_source(record, concentration, weight):
            original = source[record["File"]]
            rec_shift = shifts.get(record["File"], 0.0)
            return dict(id=source_id(record["File"], concentration), filename=record["File"],
                        concentration_nM=float(concentration), weight=float(weight), role=record["Role"],
                        time=original["time"] + rec_shift, response=original["responses"][concentration],
                        noise_sd=original.get("noise_sd_by_concentration", {}).get(concentration))

        for conc, y in raw["responses"].items():
            background = np.zeros_like(y)
            control_names = []
            n_control_repeats = 0
            terms = [noise_source(row, conc, 1.)]
            if mode != "None":
                by_repeat = {}
                for control in controls:
                    ref = source[control["File"]]
                    ctrl_shift = shifts.get(control["File"], 0.0)
                    ref_time = ref["time"] + ctrl_shift
                    ref_conc = conc if mode == "Matched concentrations" else 0.0
                    if ref_conc not in ref["responses"]:
                        raise ValueError(f"{row['File']}: {control['File']} has no {ref_conc:g} nM control trace.")
                    if sample_time[0] < ref_time[0] or sample_time[-1] > ref_time[-1]:
                        raise ValueError(f"{row['File']}: {control['File']} does not cover the sample time range. Align/trim times before import.")
                    aligned = np.interp(sample_time, ref_time, ref["responses"][ref_conc])
                    by_repeat.setdefault(control["Repeat ID"], []).append(aligned)
                    control_names.append(control["File"])
                # Equal weight to independent controls; average technical files within each first.
                background = np.mean([np.mean(values, axis=0) for values in by_repeat.values()], axis=0)
                n_control_repeats = len(by_repeat)
                for control in controls:
                    weight = -1./(n_control_repeats*len(by_repeat[control["Repeat ID"]]))
                    terms.append(noise_source(control, conc if mode == "Matched concentrations" else 0., weight))
            item["background_responses"][conc] = background
            item["responses"][conc] = y - background
            item["measurement_sources"][conc] = terms
            prov_row = {"file": row["File"], "experiment": experiment, "repeat_id": row["Repeat ID"],
                        "concentration_nM": conc, "subtraction": mode,
                        "background_set": row["Background set"], "controls": "; ".join(control_names),
                        "n_control_repeats": n_control_repeats, "source_sha256": raw["sha256"]}
            if align_phases or phase_offsets:
                prov_row["time_shift_s"] = float(sample_shift)
            provenance.append(prov_row)
        prepared.append(item)
    return prepared, pd.DataFrame(provenance)


def analysis_fingerprint(datasets, design, experiment, include_map=None, phases=None, align_phases=False):
    payload = {"sources": sorted((d["filename"], d["sha256"]) for d in datasets),
               "design": design.to_dict("records"), "experiment": experiment,
               "included": {k: sorted(v) for k, v in (include_map or {}).items()}, "phases": phases}
    if align_phases:
        payload["align_phases"] = True
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def example_project():
    """Deterministic synthetic repeats and matched negative controls for UI validation."""
    rng = np.random.default_rng(17)
    t = np.arange(0.0, 181.0)
    concentrations = [0, 5, 15, 50, 150, 500]
    datasets = []
    for repeat in range(1, 4):
        sample, control = {"Time (s)": t}, {"Time (s)": t}
        kon, koff = 1.2e5 * (1 + 0.06 * (repeat - 2)), 0.012 * (1 + 0.07 * (repeat - 2))
        for c in concentrations:
            bg = 1.5 + 0.004 * t + 0.004 * c * ((t >= 20) & (t < 100))
            rate = kon * c * 1e-9 + koff
            req = (85 + 5 * repeat) * kon * c * 1e-9 / rate
            y = req * (1 - np.exp(-rate * np.clip(t - 20, 0, 80))) * np.exp(-koff * np.maximum(t - 100, 0))
            sample[f"{c} nM"] = y + bg + rng.normal(0, 0.12, len(t))
            control[f"{c} nM"] = bg + rng.normal(0, 0.06, len(t))
        for role, values in [("sample", sample), ("control", control)]:
            name = f"demo_{role}_rep{repeat}.csv"
            data = read_dataset(pd.DataFrame(values).to_csv(index=False).encode(), name)
            data.update(phase_assoc_start_s=20., phase_dissoc_start_s=100.)
            datasets.append(data)
    design = default_design(datasets)
    for i, row in design.iterrows():
        repeat = re.search(r"rep(\d+)", row["File"]).group(1)
        design.loc[i, ["Role", "Repeat ID", "Background set", "Subtraction"]] = [
            "Negative control" if "control" in row["File"] else "Sample", f"Repeat {repeat}",
            f"Control {repeat}", "None" if "control" in row["File"] else "Matched concentrations"]
    return datasets, design
