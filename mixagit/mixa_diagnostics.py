"""Selected-observation diagnostics for the actual saved kinetic model."""

import io

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

from mixa_figures import figure_style
from mixa_plotting import show_figure


DIAGNOSTIC_NOTES = (
    "Residual = analysis response minus saved-model prediction. Statistics use only selected "
    "observations; no curves are excluded automatically. RMSE is sqrt(mean(residual squared)), "
    "not a residual standard error or a significance test. Objective residuals retain the saved "
    "weighting/whitening; they are not z-scores. Serial correlations use pairs within a curve, "
    "physical phase and contiguous selected sampling run, never across trimmed intervals. "
    "Sampling lags are observation counts, not seconds; inspect time gaps for irregular sampling. "
    "Histogram and Q-Q panels pool objective residuals descriptively, not as a calibrated normality test. "
    "Objective RSS share is not leave-one-curve-out parameter influence. Phase errors and correlation "
    "are descriptive screens, not evidence for a specific binding mechanism."
)
PHASES = ("Baseline", "Association", "Dissociation")


def saved_fit_curves(result, data_list=()):
    """Adapt both engines without refitting, averaging or replacing the saved model."""
    lookup = {d["filename"]: d for d in data_list}
    settings = result.get("fit_settings", {})
    curves = []
    for index, fit in enumerate(result.get("curves", result.get("individual_fits", []))):
        data = lookup.get(fit["filename"], {})
        concentration = float(fit.get("concentration_nM", fit.get("concentration", np.nan)))
        time = np.asarray(fit.get("time", data.get("time", [])), dtype=float)
        response = fit.get("response_plot", fit.get("response"))
        if response is None:
            response = data.get("responses", {}).get(concentration, [])
        response = np.asarray(response, dtype=float)
        fitted = np.asarray(fit.get("fitted_plot", fit.get("fitted", [])), dtype=float)
        mask = np.asarray(fit.get("fit_mask", np.ones(len(time), dtype=bool)), dtype=bool)
        if not (time.shape == response.shape == fitted.shape == mask.shape) or time.ndim != 1:
            raise ValueError(f"Saved diagnostic arrays do not align for {fit['filename']} ({concentration:g} nM).")
        if np.any(mask & ~(np.isfinite(time) & np.isfinite(response) & np.isfinite(fitted))):
            raise ValueError("Selected saved-fit observations must be finite for diagnostic reporting.")
        on = float(fit.get("on", settings.get("phase_assoc_start_s", np.nan)))
        off = float(fit.get("off", settings.get("phase_dissoc_start_s", np.nan)))
        phase = np.full(len(time), "Unspecified", dtype=object)
        if np.isfinite(on) and np.isfinite(off) and off > on:
            phase[:] = np.where(time < on, "Baseline", np.where(time < off, "Association", "Dissociation"))
        residual = response - fitted
        objective = np.full(len(time), np.nan)
        selected_objective = np.asarray(fit.get("whitened_residuals", residual[mask]), dtype=float)
        if selected_objective.shape != residual[mask].shape or not np.isfinite(selected_objective).all():
            raise ValueError("Saved objective residuals must align exactly with selected observations.")
        objective[mask] = selected_objective
        curves.append(dict(curve_id=f"C{index + 1:02d}", filename=fit["filename"],
                           repeat_id=fit.get("repeat_id", data.get("repeat_id", "Unspecified")),
                           concentration_nM=concentration, time=time, response=response, fitted=fitted,
                           fit_mask=mask, residuals=residual, objective=objective, phase=phase,
                           on=on, off=off))
    return curves


def serial_correlations(curve, values, max_lag=20, mask=None):
    """Pairwise Pearson correlations; do not join different phases or selection runs."""
    values = np.asarray(values, dtype=float)
    selected = curve["fit_mask"].copy() if mask is None else np.asarray(mask, dtype=bool).copy()
    selected &= np.isfinite(values)
    time = curve["time"]
    breaks = np.ones(len(time), dtype=bool)
    if len(time) > 1:
        dt = np.diff(time)
        positive = dt[dt > 0]
        gap = 3 * np.median(positive) if len(positive) else 0.
        breaks[1:] = (~selected[1:] | ~selected[:-1] | (curve["phase"][1:] != curve["phase"][:-1]) |
                      (dt <= 0) | (dt > gap))
    run = np.cumsum(breaks)
    scale = max(float(np.ptp(curve["response"][selected])) if selected.any() else 0., np.finfo(float).tiny)
    numerical = not selected.any() or np.std(values[selected]) <= 100 * np.finfo(float).eps * scale
    rows = []
    for lag in range(1, min(max_lag + 1, len(values))):
        pairs = selected[:-lag] & selected[lag:] & (run[:-lag] == run[lag:])
        x, y = values[:-lag][pairs], values[lag:][pairs]
        rho = float(np.corrcoef(x, y)[0, 1]) if (not numerical and len(x) >= 3 and
                                               np.std(x) > 0 and np.std(y) > 0) else np.nan
        rows.append(dict(lag_observations=lag, pairs=int(pairs.sum()), correlation=rho,
                         median_elapsed_s=float(np.median((time[lag:] - time[:-lag])[pairs])) if pairs.any() else np.nan))
    return pd.DataFrame(rows, columns=["lag_observations", "pairs", "correlation", "median_elapsed_s"])


def diagnostic_tables(curves):
    """One curve-level row and phase rows, with exact selection counts and units."""
    summary, phases, correlation = [], [], []
    total_rss = sum(float(c["objective"][c["fit_mask"]] @ c["objective"][c["fit_mask"]]) for c in curves)
    for curve in curves:
        identity = {k: curve[k] for k in ["curve_id", "filename", "repeat_id", "concentration_nM"]}
        mask = curve["fit_mask"]
        raw, obj = curve["residuals"][mask], curve["objective"][mask]
        span = float(np.ptp(curve["response"][mask])) if mask.any() else 0.
        dependence = {}
        for kind, values in [("raw", curve["residuals"]), ("objective", curve["objective"])]:
            acf = serial_correlations(curve, values)
            dependence[kind] = acf.iloc[0].to_dict() if not acf.empty else {"correlation": np.nan, "pairs": 0}
            correlation.extend({**identity, "residual_type": kind, **row} for row in acf.to_dict("records"))
        rho, pairs = dependence["objective"]["correlation"], dependence["objective"]["pairs"]
        flag = bool(pairs >= 20 and np.isfinite(rho) and abs(rho) > max(.3, 2 / np.sqrt(pairs)))
        rmse = float(np.sqrt(np.mean(raw**2))) if len(raw) else np.nan
        phase_rmse = {}
        for phase in ["Association", "Dissociation"]:
            values = curve["residuals"][mask & (curve["phase"] == phase)]
            phase_rmse[phase] = float(np.sqrt(np.mean(values**2))) if len(values) else np.nan
        summary.append({**identity, "n_selected": int(mask.sum()), "n_excluded": int((~mask).sum()),
                        "n_association": int(np.sum(mask & (curve["phase"] == "Association"))),
                        "n_dissociation": int(np.sum(mask & (curve["phase"] == "Dissociation"))),
                        "rmse_response": rmse, "mean_residual_response": float(np.mean(raw)) if len(raw) else np.nan,
                        "association_rmse": phase_rmse["Association"], "dissociation_rmse": phase_rmse["Dissociation"],
                        "rmse_percent_selected_span": 100 * rmse / span if span > 0 else np.nan,
                        "objective_rss": float(obj @ obj),
                        "objective_rss_share_percent": float(100 * (obj @ obj) / total_rss) if total_rss > 0 else np.nan,
                        "raw_lag1": dependence["raw"]["correlation"], "objective_lag1": rho,
                        "lag1_pairs": int(pairs), "serial_structure_flag": flag})
        for phase in [*PHASES, "Unspecified"]:
            available = curve["phase"] == phase
            if not available.any():
                continue
            used = mask & available
            residual = curve["residuals"][used]
            phases.append({**identity, "phase": phase, "n_available": int(available.sum()), "n_selected": int(used.sum()),
                           "first_selected_s": float(curve["time"][used][0]) if used.any() else np.nan,
                           "last_selected_s": float(curve["time"][used][-1]) if used.any() else np.nan,
                           "mean_residual_response": float(np.mean(residual)) if used.any() else np.nan,
                           "rmse_response": float(np.sqrt(np.mean(residual**2))) if used.any() else np.nan})
    return dict(curves=pd.DataFrame(summary), phases=pd.DataFrame(phases), serial_correlation=pd.DataFrame(correlation))


def overview_figure(curves, tables=None):
    tables = diagnostic_tables(curves) if tables is None else tables
    with figure_style():
        fig, axes = plt.subplots(2, 4, figsize=(12, 5.8), layout="constrained")
        if not curves:
            axes.flat[0].text(.5, .5, "No saved curves", ha="center", transform=axes.flat[0].transAxes)
            return fig
        concentrations = sorted({c["concentration_nM"] for c in curves})
        colors = dict(zip(concentrations, plt.get_cmap("cividis")(np.linspace(.1, .9, len(concentrations)))))
        raw_ax, rmse_ax, phase_ax, bias_ax, fitted_ax, lag_ax, hist_ax, qq_ax = axes.flat
        for curve in curves:
            mask, color = curve["fit_mask"], colors[curve["concentration_nM"]]
            raw_ax.plot(curve["time"][mask], curve["residuals"][mask], ".", ms=2, alpha=.45, color=color)
            fitted_ax.plot(curve["fitted"][mask], curve["objective"][mask], ".", ms=2, alpha=.4, color=color)
        for concentration, color in colors.items():
            raw_ax.plot([], [], ".", color=color, label=f"{concentration:g} nM")
        raw_ax.legend(ncol=2, fontsize=6, loc="best")
        raw_ax.set(title="Saved-fit residuals", xlabel="Time (s)", ylabel="Response residual")
        fitted_ax.set(title="Residual vs prediction", xlabel="Fitted response", ylabel="Objective residual")
        table = tables["curves"].sort_values("rmse_response", ascending=False).head(16)
        y = np.arange(len(table))
        rmse_ax.barh(y, table.rmse_response, color=[colors[c] for c in table.concentration_nM])
        rmse_ax.set(yticks=y, yticklabels=table.curve_id, title="Curve errors (largest 16)", xlabel="RMSE (response units)")
        rmse_ax.invert_yaxis()
        lag_ax.plot(table.raw_lag1, y, "o", ms=3, color="#1c5d99", label="Raw")
        lag_ax.plot(table.objective_lag1, y, "x", ms=4, color="#d37522", label="Objective")
        lag_ax.set(yticks=y, yticklabels=table.curve_id, xlim=(-1.05, 1.05), xlabel="Within-phase lag-1 correlation", title="Serial residual structure")
        lag_ax.invert_yaxis()
        lag_ax.axvline(0, color="#aaaaaa", lw=.6)
        lag_ax.legend(fontsize=6)
        phases = tables["phases"]
        for curve in curves:
            subset = phases[phases.curve_id == curve["curve_id"]].set_index("phase")
            color = colors[curve["concentration_nM"]]
            if {"Association", "Dissociation"} <= set(subset.index):
                phase_ax.plot(subset.loc["Association", "rmse_response"], subset.loc["Dissociation", "rmse_response"], "o", ms=4, color=color)
            for phase, marker in [("Association", "o"), ("Dissociation", "x")]:
                if phase in subset.index:
                    bias_ax.plot(curve["concentration_nM"], subset.loc[phase, "mean_residual_response"], marker, ms=4, color=color)
        finite = phases.rmse_response.dropna()
        upper = max(float(finite.max()) if len(finite) else 0., np.finfo(float).eps)
        phase_ax.plot([0, upper], [0, upper], "--", color="#aaaaaa", lw=.8)
        phase_ax.set(title="On-phase vs off-phase error", xlabel="Association RMSE", ylabel="Dissociation RMSE")
        for label, marker in [("Association", "o"), ("Dissociation", "x")]:
            bias_ax.plot([], [], marker, color="#555555", label=label, ms=4)
        bias_ax.set(title="Phase-specific bias", xlabel="Concentration (nM)", ylabel="Mean residual (response)")
        bias_ax.legend(fontsize=6)
        objective = np.concatenate([c["objective"][c["fit_mask"]] for c in curves])
        hist_ax.hist(objective, bins=min(40, max(5, int(np.sqrt(len(objective))))), color="#1c5d99", alpha=.8)
        hist_ax.set(title="Objective residual distribution", xlabel="Objective residual", ylabel="Count")
        if len(objective) > 3 and np.std(objective) > 0:
            (theoretical, ordered), (slope, intercept, _) = stats.probplot(objective)
            qq_ax.plot(theoretical, ordered, ".", ms=2, color="#1c5d99")
            qq_ax.plot(theoretical, intercept + slope * theoretical, color="#d37522", lw=1)
        qq_ax.set(title="Normal Q-Q (descriptive)", xlabel="Normal theoretical quantile", ylabel="Ordered objective residual")
        for ax in axes.flat:
            ax.spines[["top", "right"]].set_visible(False)
            ax.grid(False)
        for ax in [raw_ax, bias_ax, fitted_ax]:
            ax.axhline(0, color="#777777", lw=.6)
    return fig


def curve_figure(curve):
    """Full trace plus selected-only raw and objective residuals; no hidden refit."""
    with figure_style():
        fig, axes = plt.subplots(3, 1, figsize=(8.2, 6.1), sharex=True,
                                 gridspec_kw={"height_ratios": [2.4, 1, 1]}, layout="constrained")
        time, mask = curve["time"], curve["fit_mask"]
        ax = axes[0]
        ax.plot(time[~mask], curve["response"][~mask], ".", color="#bbbbbb", ms=3, label="Excluded data")
        ax.plot(time, curve["fitted"], "--", color="#d37522", lw=1, label="Prediction outside selection")
        ax.plot(time, np.where(mask, curve["fitted"], np.nan), color="#1c5d99", lw=1.6, label="Saved fit in selection")
        ax.plot(time[mask], curve["response"][mask], ".", color="#1c5d99", alpha=.6, ms=3, label="Selected data")
        ax.set(ylabel="Response (analysis input units)", title=f"{curve['curve_id']} | {curve['filename']}\n{curve['concentration_nM']:g} nM | {curve['repeat_id']}")
        ax.legend(ncol=2, fontsize=7)
        for target, values, label in [(axes[1], curve["residuals"], "Raw residual"), (axes[2], curve["objective"], "Objective residual")]:
            target.plot(time[mask], values[mask], ".", color="#1c5d99", ms=3)
            target.axhline(0, color="#777777", lw=.7)
            target.set_ylabel(label)
        for target in axes:
            target.spines[["top", "right"]].set_visible(False)
            target.grid(False)
            for boundary in [curve["on"], curve["off"]]:
                if np.isfinite(boundary):
                    target.axvline(boundary, color="#999999", ls=":", lw=.8)
        axes[-1].set_xlabel("Time (s)")
    return fig


def correlation_figure(curve):
    with figure_style():
        fig, ax = plt.subplots(figsize=(6.4, 2.6), layout="constrained")
        for kind, values, color in [("Raw", curve["residuals"], "#1c5d99"), ("Objective", curve["objective"], "#d37522")]:
            table = serial_correlations(curve, values)
            ax.plot(table.lag_observations, table.correlation, "o-", ms=3, lw=1, color=color, label=kind)
        ax.axhline(0, color="#777777", lw=.6)
        ax.set(xlabel="Sampling lag (observations within phase / selected run)", ylabel="Pair correlation", ylim=(-1.05, 1.05),
               title="Trace residual serial structure")
        ax.spines[["top", "right"]].set_visible(False)
        ax.grid(False)
        ax.legend()
    return fig


def write_diagnostic_tables(archive, base_path, curves):
    for name, table in diagnostic_tables(curves).items():
        archive.writestr(f"{base_path}/{name}.csv", table.to_csv(index=False))
    archive.writestr(f"{base_path}/DIAGNOSTIC_METHODS.txt", DIAGNOSTIC_NOTES)


def render_saved_fit_diagnostics(result, data_list=(), key="kinetic"):
    import streamlit as st

    curves = saved_fit_curves(result, data_list)
    if not curves:
        st.info("No saved kinetic curves are available for diagnostics.")
        return
    tables = diagnostic_tables(curves)
    st.markdown("#### Saved-Fit Diagnostic Overview")
    st.caption("These panels evaluate the actual saved model, not independent refits. Curve IDs link plots to the table below.")
    fig = overview_figure(curves, tables)
    show_figure(fig, width=1100)
    overview_pdf = io.BytesIO()
    fig.savefig(overview_pdf, format="pdf")
    plt.close(fig)
    st.markdown("#### Curve-Level Review")
    st.dataframe(tables["curves"], hide_index=True, use_container_width=True,
                 column_order=["curve_id", "filename", "concentration_nM", "n_selected", "rmse_response", "association_rmse",
                               "dissociation_rmse", "mean_residual_response", "objective_lag1", "serial_structure_flag"],
                 column_config={"curve_id": "Curve", "filename": "File", "concentration_nM": "Concentration (nM)",
                                "n_selected": "Selected points", "objective_lag1": "Objective lag-1",
                                "serial_structure_flag": "Serial structure",
                                "association_rmse": st.column_config.NumberColumn("On-phase RMSE", format="%.4g"),
                                "dissociation_rmse": st.column_config.NumberColumn("Off-phase RMSE", format="%.4g"),
                                "rmse_response": st.column_config.NumberColumn("RMSE (response)", format="%.4g"),
                                "mean_residual_response": st.column_config.NumberColumn("Mean residual (response)", format="%.4g"),
                                "objective_rss_share_percent": st.column_config.NumberColumn("Objective RSS share (%)", format="%.2f")})
    st.caption("Serial-structure flags are descriptive screens, not exclusion recommendations. Low RMSE does not establish that parameters are identifiable.")
    options = list(range(len(curves)))
    selector = f"{key}_diagnostic_curve"
    if st.session_state.get(selector) not in options:
        st.session_state.pop(selector, None)
    index = st.selectbox("Inspect saved-fit trace", options, key=selector,
                         index=int(tables["curves"].rmse_response.fillna(-np.inf).to_numpy().argmax()),
                         format_func=lambda i: f"{curves[i]['curve_id']} | {curves[i]['filename']} | {curves[i]['concentration_nM']:g} nM | {curves[i]['repeat_id']}")
    fig = curve_figure(curves[index])
    show_figure(fig, width=820)
    plt.close(fig)
    st.dataframe(tables["phases"].loc[tables["phases"].curve_id == curves[index]["curve_id"]], hide_index=True,
                 column_order=["phase", "n_available", "n_selected", "first_selected_s", "last_selected_s",
                               "mean_residual_response", "rmse_response"],
                 column_config={"phase": "Phase", "n_available": "Available points", "n_selected": "Selected points",
                                "first_selected_s": "First selected (s)", "last_selected_s": "Last selected (s)",
                                "mean_residual_response": st.column_config.NumberColumn("Mean residual", format="%.4g"),
                                "rmse_response": st.column_config.NumberColumn("RMSE (response)", format="%.4g")})
    with st.expander("Trace serial correlations and diagnostic definitions"):
        fig = correlation_figure(curves[index])
        show_figure(fig, width=640)
        plt.close(fig)
        st.caption(DIAGNOSTIC_NOTES)
    with st.expander("All phase statistics and diagnostic data"):
        st.dataframe(tables["curves"], hide_index=True)
        st.dataframe(tables["phases"], hide_index=True)
        for name, table in tables.items():
            st.download_button(f"Download {name.replace('_', ' ')} CSV", table.to_csv(index=False),
                               f"MIXA_{key}_{name}.csv", "text/csv", key=f"{key}_diagnostics_{name}", on_click="ignore")
        st.download_button("Download diagnostic overview PDF", overview_pdf.getvalue(), f"MIXA_{key}_diagnostics.pdf", "application/pdf",
                           key=f"{key}_diagnostics_pdf", on_click="ignore")
