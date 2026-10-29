"""Shared observation selection for fitting, previews and exports."""

import numpy as np
import pandas as pd


def detect_binding_phases(data_list, include_map, fallback_assoc=20., fallback_dissoc=80.):
    """Polarity-invariant phase proposals; ambiguous/shared timing is never certified."""
    rows = []
    for data in data_list:
        time = np.asarray(data["time"], float)
        if len(time) < 8 or not np.isfinite(time).all() or np.any(np.diff(time) <= 0):
            rows.append(dict(filename=data["filename"], on=fallback_assoc, off=fallback_dissoc,
                             dt=1., issues=["Insufficient or invalid time coverage"]))
            continue
        dt = float(np.median(np.diff(time)))
        metadata = [data.get(key) for key in ["phase_assoc_start_s", "phase_dissoc_start_s"]]
        if all(value is not None and np.isfinite(value) for value in metadata) and time[0] <= metadata[0] < metadata[1] < time[-1]:
            rows.append(dict(filename=data["filename"], on=float(metadata[0]), off=float(metadata[1]), dt=dt,
                             polarity=None, source="Injection metadata", issues=[]))
            continue
        selected = [c for c in data["concentrations"] if c > 0 and c in include_map.get(data["filename"], set())]
        if not selected:
            continue
        y = np.median(np.vstack([data["responses"][c] for c in selected]), axis=0)
        win = min(max(5, int(round(2.5 / dt)) | 1), (len(time) // 2) * 2 - 1)
        smooth = np.convolve(np.pad(y, win // 2, mode="edge"), np.ones(win) / win, mode="valid")
        base = smooth[:max(3, min(10, len(time) // 20))]
        departure = smooth - np.median(base)
        polarity = 1. if departure[np.argmax(np.abs(departure))] >= 0 else -1.
        oriented = polarity * departure
        threshold = max(5 * np.std(base), .02 * np.max(np.abs(departure)), 1e-12)
        candidates = np.flatnonzero(oriented >= threshold)
        issues = []
        on = float(time[candidates[0]]) if len(candidates) else float(np.clip(fallback_assoc, time[0], time[-2]))
        if not len(candidates):
            issues.append("No resolved association onset; fallback used")
        start = int(np.searchsorted(time, on))
        peak = start + int(np.argmax(oriented[start:]))
        off = float(time[peak])
        gap = min(max(5 * dt, 1.), .25 * (time[-1] - time[0]))
        if off <= on + gap or off >= time[-1] - 2 * dt:
            issues.append("No resolved dissociation transition; review phase boundaries")
            if off <= on + gap:
                off = float(np.clip(max(fallback_dissoc, on + gap), time[0] + gap, time[-1]))
        on = float(np.clip(on, time[0], time[-1] - gap))
        off = float(np.clip(off, on + gap, time[-1]))
        rows.append(dict(filename=data["filename"], on=on, off=off, dt=dt, polarity=polarity,
                         source="Response transition proposal", issues=issues))
    if not rows:
        return dict(on=float(fallback_assoc), off=float(fallback_dissoc), files=[],
                    issues=["No included traces for phase detection"], note="Fallback phases; review required")
    on, off = (float(np.median([row[key] for row in rows])) for key in ["on", "off"])
    tolerance = max(2.5 * max(row["dt"] for row in rows), .1)
    issues = [f"{row['filename']}: {issue}" for row in rows for issue in row["issues"]]
    if any(abs(row["on"] - on) > tolerance or abs(row["off"] - off) > tolerance for row in rows):
        issues.append("Loaded files have inconsistent injection timing; align injections or analyze separately")
    return dict(on=on, off=off, files=rows, issues=issues,
                note="Phase review required" if issues else "Consistent phase proposals across included files")


def validate_windows(windows):
    keys = ("phase_assoc_start_s", "phase_dissoc_start_s", "fit_assoc_start_s", "fit_assoc_end_s",
            "fit_dissoc_start_s", "fit_dissoc_end_s")
    values = {key: float(windows[key]) for key in keys}
    if not np.isfinite(list(values.values())).all():
        raise ValueError("All phase and fit-window times must be finite numbers.")
    on, off, a0, a1, d0, d1 = (values[key] for key in keys)
    if not on < off:
        raise ValueError("Dissociation must begin after association.")
    if not on <= a0 < a1 <= off:
        raise ValueError("The association fit window must lie between the two phase starts.")
    if not off <= d0 < d1:
        raise ValueError("The dissociation fit window must begin at or after dissociation starts.")
    return values


def observation_masks(time, windows):
    w = validate_windows(windows)
    t = np.asarray(time, dtype=float)
    association = (t >= w["fit_assoc_start_s"]) & (t <= w["fit_assoc_end_s"]) & (t < w["phase_dissoc_start_s"])
    dissociation = (t >= w["fit_dissoc_start_s"]) & (t <= w["fit_dissoc_end_s"])
    return {"association": association, "dissociation": dissociation,
            "kinetic": association | dissociation, "baseline": t < w["phase_assoc_start_s"]}


def selection_summary(data_list, include_map, windows):
    rows = []
    for data in data_list:
        masks = observation_masks(data["time"], windows)
        for concentration in data["concentrations"]:
            if concentration == 0:
                continue
            included = concentration in include_map.get(data["filename"], set())
            rows.append({"file": data["filename"], "repeat_id": data.get("repeat_id", ""),
                         "concentration_nM": concentration, "included": included,
                         "association_points": int(masks["association"].sum()) if included else 0,
                         "dissociation_points": int(masks["dissociation"].sum()) if included else 0,
                         "kinetic_points": int(masks["kinetic"].sum()) if included else 0,
                         "baseline_reference_points": int(masks["baseline"].sum()) if included else 0})
    return pd.DataFrame(rows)


def observation_table(data_list, include_map, windows, equilibrium_time=None):
    frames = []
    for data in data_list:
        masks = observation_masks(data["time"], windows)
        t = np.asarray(data["time"], dtype=float)
        for concentration in data["concentrations"]:
            included = concentration > 0 and concentration in include_map.get(data["filename"], set())
            frame = pd.DataFrame({"file": data["filename"], "repeat_id": data.get("repeat_id", ""),
                                  "concentration_nM": concentration, "time_s": t,
                                  "response": data["responses"][concentration], "trace_included": included,
                                  "used_for_association_fit": masks["association"] & included,
                                  "used_for_dissociation_fit": masks["dissociation"] & included,
                                  "used_for_kinetic_fit": masks["kinetic"] & included,
                                  "baseline_reference_only": masks["baseline"] & included})
            if equilibrium_time is not None:
                frame["used_for_equilibrium_fit"] = (included & (t >= max(float(equilibrium_time) - 5, windows["phase_assoc_start_s"]))
                                                      & (t <= equilibrium_time))
            frames.append(frame)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
