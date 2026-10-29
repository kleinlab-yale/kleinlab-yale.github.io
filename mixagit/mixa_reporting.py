"""Publication tables and figures with explicit independent-repeat inference."""

import io
import hashlib
import json
import platform
import zipfile
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
from mixa_plotting import show_figure
from scipy import stats

from mixa_data import APP_VERSION
from mixa_mechanisms import mechanistic_to_kinetic_summary, refit_independent_repeats
from mixa_methods import source_code_sha256
from mixa_science import scientific_metadata
from mixa_workspace import project_context, write_project_exports
from mixa_figures import (figure_legends, figure_style,
                          publication_figures as clean_publication_figures,
                          independent_summary, kinetic_repeat_points, _kinetic_panel, _point_panel)

PARAMETERS = {"kon": ("k_on", "M^-1 s^-1"), "koff": ("k_off", "s^-1"), "KD_nM": ("K_D", "nM")}


def summarize_repeats(estimates):
    """Log-t intervals across declared independent repeats, never across time points."""
    rows = []
    for method, table in estimates.groupby("method", sort=False):
        for parameter, (label, unit) in PARAMETERS.items():
            values = pd.to_numeric(table[parameter], errors="coerce").to_numpy(dtype=float)
            valid = values[np.isfinite(values) & (values > 0) & (table.status.to_numpy() == "Complete")]
            n = len(valid)
            if not n:
                if np.isfinite(values).any():
                    rows.append({"method": method, "parameter": label, "unit": unit, "n_independent": 0,
                                 **{key: np.nan for key in ["mean", "sd", "sem", "median", "geometric_mean", "ci95_low", "ci95_high", "geometric_sd_factor"]},
                                 "interval_method": "Not estimable (no eligible repeats)", "excluded_or_failed": len(table)})
                continue
            logs = np.log(valid)
            center = float(np.exp(np.mean(logs)))
            lo = hi = gsd = np.nan
            if n > 1:
                sd = float(np.std(logs, ddof=1))
                half = stats.t.ppf(0.975, n - 1) * sd / np.sqrt(n)
                lo, hi = np.exp(np.clip([np.mean(logs) - half, np.mean(logs) + half], -700, 700))
                gsd = float(np.exp(sd))
            rows.append({"method": method, "parameter": label, "unit": unit, "n_independent": n,
                         "mean": float(np.mean(valid)),
                         "sd": float(np.std(valid, ddof=1)) if n > 1 else np.nan,
                         "sem": float(np.std(valid, ddof=1) / np.sqrt(n)) if n > 1 else np.nan,
                         "median": float(np.median(valid)),
                         "geometric_mean": center, "ci95_low": lo, "ci95_high": hi,
                         "geometric_sd_factor": gsd,
                         "interval_method": "Student t on log estimates" if n > 1 else "Not estimable (one repeat)",
                         "excluded_or_failed": len(table) - n})
    return pd.DataFrame(rows)


def _format_parameter_value(mean, sd):
    """Use two significant SD digits and the same precision for the mean."""
    if not np.isfinite(mean):
        return "Not estimable", "Not estimable"
    exponent = int(np.floor(np.log10(abs(mean)))) if mean else 0
    exponent = exponent if exponent < -3 or exponent >= 4 else 0
    scale = 10. ** exponent
    center, spread = mean / scale, sd / scale
    decimals = (1 - int(np.floor(np.log10(spread)))
                if np.isfinite(spread) and spread > 0 else None)
    center_text = f"{round(center, decimals):.{max(0, decimals)}f}" if decimals is not None else f"{center:.3g}"
    if np.isfinite(spread):
        spread_text = f"{round(spread, decimals):.{max(0, decimals)}f}" if decimals is not None else "0"
        plain, math = f"{center_text} +/- {spread_text}", rf"{center_text} \pm {spread_text}"
    else:
        plain = math = center_text
    if exponent:
        plain = f"({plain}) x 10^{exponent}"
        math = rf"({math}) \times 10^{{{exponent}}}"
    return plain, f"${math}$"


def parameter_results_table(report, results_by_method=None):
    """Readable results backed by the unrounded independent-repeat statistics."""
    columns = ["method", "parameter", "unit", "mean", "sd", "n_independent",
               "result", "uncertainty", "interpretation", "excluded_or_failed"]
    rows = []
    for row in report["summary"].to_dict("records"):
        if results_by_method is not None and row["method"] not in results_by_method:
            continue
        value, _ = _format_parameter_value(row["mean"], row["sd"])
        n = int(row["n_independent"])
        uncertainty = "Mean +/- SD" if n > 1 else ("SD unavailable" if n == 1 else "Not estimable")
        fixed_time = (row["method"] == "Equilibrium" and results_by_method is not None and
                      not results_by_method["Equilibrium"].get("attainment", {}).get("equilibrium_reached"))
        hill = (row["method"] == "Equilibrium" and results_by_method is not None and
                results_by_method["Equilibrium"].get("model") == "hill")
        rows.append({**{key: row[key] for key in columns[:6]},
                     "result": value + (f" {row['unit']}" if n else ""),
                     "uncertainty": uncertainty,
                     "interpretation": ("Hill half-saturation concentration (apparent affinity)" if hill else
                                        "Fixed-time apparent K_D; equilibrium not established" if fixed_time else ""),
                     "excluded_or_failed": row["excluded_or_failed"]})
    return pd.DataFrame(rows, columns=columns)


def parameter_results_text(report, results_by_method=None):
    lines = ["Parameter results: arithmetic mean +/- sample SD across independent-repeat fits.",
             "n counts independent repeats, not time points, concentrations or technical files."]
    for row in parameter_results_table(report, results_by_method).itertuples():
        label = ("Hill C_1/2" if row.interpretation.startswith("Hill") else "Apparent K_D") if row.interpretation else row.parameter
        lines.append(f"{row.method}: {label} = {row.result} ({row.uncertainty}, n={row.n_independent})")
        if row.interpretation:
            lines.append(row.interpretation + ".")
        if row.excluded_or_failed:
            lines.append(f"Excluded or failed repeat fits: {row.excluded_or_failed}; inspect repeat_estimates.csv.")
    return "\n".join(lines) + "\n"


def residual_summary(results_by_method):
    rows = []
    for method, result in results_by_method.items():
        fits = result.get("individual_fits", result.get("curve_fits", [result]))
        for fit in fits:
            residual = np.asarray(fit.get("residuals_fit", fit.get("residuals", fit.get("assoc_residuals", []))), dtype=float)
            if not len(residual) and "assoc_response_plot" in fit:
                residual = np.asarray(fit["assoc_response_plot"]) - np.asarray(fit["assoc_fitted_plot"])
            residual = residual[np.isfinite(residual)]
            if not len(residual):
                continue
            rss = float(np.sum(residual ** 2))
            lag1 = np.nan
            if len(residual) > 3 and np.std(residual[:-1]) > 0 and np.std(residual[1:]) > 0:
                lag1 = float(np.corrcoef(residual[:-1], residual[1:])[0, 1])
            lag1 = fit.get("residual_dependence", {}).get("lag1_correlation", lag1)
            index = np.flatnonzero(fit.get("fit_mask", np.ones(len(residual), dtype=bool)))
            adjacent = np.diff(index) == 1 if len(index) == len(residual) else np.ones(max(len(residual) - 1, 0), dtype=bool)
            rows.append({"method": method, "file": fit.get("filename", "Pooled isotherm"),
                         "concentration_nM": fit.get("concentration", fit.get("concentration_nM", np.nan)),
                         "n_observations": len(residual), "rmse": float(np.sqrt(np.mean(residual ** 2))),
                         "residual_mean": float(np.mean(residual)),
                         "lag1_correlation": lag1 if method != "Equilibrium" else np.nan,
                         "durbin_watson": float(np.sum(np.diff(residual)[adjacent] ** 2) / rss) if rss > 0 and method != "Equilibrium" else np.nan,
                         "serial_correlation_flag": fit.get("residual_dependence", {}).get("serial_correlation_flag", False),
                         "uncertainty_method": fit.get("uncertainty_method", result.get("uncertainty_method", "")),
                         "r_squared": fit.get("r_squared", fit.get("assoc_r2", np.nan))})
    return pd.DataFrame(rows)


def analyze_repeats(data_list, include_map, results_by_method, engines, progress=None):
    repeats = {}
    for data in data_list:
        if include_map.get(data["filename"], set()):
            repeats.setdefault(data["repeat_id"], []).append(data)
    rows = []
    total = len(repeats) * len(results_by_method)
    for method, parent in results_by_method.items():
        settings = parent["fit_settings"]
        for repeat, files in repeats.items():
            row = {"method": method, "repeat_id": repeat, "n_files": len(files),
                   "n_curves": sum(len(include_map[d["filename"]]) for d in files),
                   "kon": np.nan, "koff": np.nan, "KD_nM": np.nan, "status": "Failed", "detail": ""}
            try:
                if method == "Kinetic":
                    if parent.get("mechanistic_source") is not None:
                        mech_parent = parent["mechanistic_source"]
                        subset_curves = [c for c in mech_parent.get("curves", []) if c.get("repeat_id") == repeat]
                        if subset_curves and not mech_parent.get("single_cycle"):
                            rep_res = refit_independent_repeats(
                                subset_curves,
                                mech_parent,
                                starts=2,
                                runtime_s=float(mech_parent.get("optimizer_settings", {}).get("runtime_s", 60.0)),
                            )
                            est_df = rep_res["estimates"]
                            stat_df = rep_res["status"]
                            status_val = str(stat_df["status"].iloc[0]) if not stat_df.empty else "Failed"
                            detail_val = str(stat_df["detail"].iloc[0]) if not stat_df.empty else ""

                            def _pick(p_names):
                                sub = est_df.loc[est_df["parameter"].isin(p_names) & (est_df["status"] == "Complete")]
                                return float(sub["value"].iloc[0]) if not sub.empty else np.nan

                            row.update(
                                kon=_pick(["kon", "kon_higher_affinity"]),
                                koff=_pick(["koff", "koff_higher_affinity"]),
                                KD_nM=_pick(["KD_nM", "KD_overall_nM", "KD_higher_affinity_nM", "KD_step_1_nM", "KD_per_arm_first_step_nM"]),
                                status="Complete" if status_val == "Complete" else status_val,
                                detail=detail_val or mech_parent.get("model", "mechanistic"),
                            )
                        continue
                    is_shared = parent.get("fit_strategy") == "shared_kinetics"
                    kwargs = dict(model=settings["binding_model_code"],
                                  normalize=settings["normalize_baseline"],
                                  correct_drift=settings["drift_correction"],
                                  include_nonspecific=settings["include_nonspecific"])
                    kwargs.update({name: settings.get(key) for name, key in (
                        ("assoc_window_start", "fit_assoc_start_s"), ("assoc_window_end", "fit_assoc_end_s"),
                        ("dissoc_window_start", "fit_dissoc_start_s"), ("dissoc_window_end", "fit_dissoc_end_s"))})
                    if is_shared:
                        kwargs.update(rmax_group_mode=settings["rmax_group_mode"], do_bootstrap=False)
                    fit = engines["kinetic_shared" if is_shared else "kinetic_curvewise"](
                        files, settings["phase_assoc_start_s"], settings["phase_dissoc_start_s"], include_map, **kwargs)
                    if fit:
                        row.update(kon=fit["global_kon"], koff=fit["global_koff"], KD_nM=fit["global_KD"] * 1e9,
                                   status="Complete" if fit["n_fits"] == row["n_curves"] else "Incomplete",
                                   detail=fit.get("fit_strategy", ""))
                        if fit.get("boundary_parameters"):
                            row.update(status="Boundary estimate", detail="Parameters at solver bounds: " + ", ".join(fit["boundary_parameters"]))
                        elif fit.get("summary_eligible") is False:
                            row.update(status="Unresolved estimate", detail=fit.get("covariance_status", "Inspect scientific fit warnings"))
                        if not is_shared:
                            row.update(status="Diagnostic only", detail="Curve-wise concentration averages are not a global kinetic estimator; use shared kinetics for routine reporting.")
                elif method == "kobs":
                    fit = engines["kobs"](files, include_map, settings["phase_assoc_start_s"], settings["phase_dissoc_start_s"], normalize=settings.get("normalize_baseline", True),
                        assoc_window_start=settings.get("fit_assoc_start_s"), assoc_window_end=settings.get("fit_assoc_end_s"),
                        dissoc_window_start=settings.get("fit_dissoc_start_s"), dissoc_window_end=settings.get("fit_dissoc_end_s"))
                    if fit:
                        status = "Complete" if fit["n_curves"] == row["n_curves"] else "Incomplete"
                        if fit.get("intercept_at_boundary", False):
                            status = "Boundary estimate"
                        elif fit.get("summary_eligible") is False:
                            status = "Unresolved estimate"
                        row.update(kon=fit["kass"], koff=fit["kdiss"], KD_nM=fit["KD"] * 1e9,
                                   status=status, detail=f"{fit['n_unique_concentrations']} concentrations")
                else:
                    fit = engines["equilibrium"](
                        files, settings["equilibrium_sampling_time_s"], include_map,
                        model=settings["equilibrium_model_code"], aggregate_repeats=settings["aggregate_repeats"],
                        normalize_percent_bmax=settings["normalize_percent_bmax"],
                        t_assoc_start=settings["phase_assoc_start_s"])
                    if fit:
                        status = "Complete"
                        if fit.get("boundary_parameters"):
                            status = "Boundary estimate"
                        elif not fit.get("identifiable", True):
                            status = "Unresolved affinity"
                        elif not fit.get("saturation_coverage", True):
                            status = "Insufficient saturation"
                        row.update(KD_nM=fit["KD"], status=status,
                                   detail="; ".join(fit.get("scientific_warnings", [])) or settings["equilibrium_model_code"])
                if row["status"] == "Failed":
                    row["detail"] = "No converged fit or insufficient data"
            except (ValueError, RuntimeError, FloatingPointError, np.linalg.LinAlgError) as exc:
                row["detail"] = str(exc)
            rows.append(row)
            if progress:
                progress(len(rows) / max(total, 1), f"{method}: {repeat}")
    table = pd.DataFrame(rows, columns=["method", "repeat_id", "n_files", "n_curves", "kon", "koff", "KD_nM", "status", "detail"])
    return {"repeat_estimates": table, "summary": summarize_repeats(table),
            "residual_diagnostics": residual_summary(results_by_method),
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "context": project_context(), "settings": {m: r["fit_settings"] for m, r in results_by_method.items()}}


def plot_repeat_estimates(report, width=7.0, statistic="Mean +/- SD", axes=None, method_labels=None,
                          parameters=None):
    summary, estimates = report["summary"], report["repeat_estimates"]
    parameters = list(PARAMETERS) if parameters is None else list(parameters)
    count = len(parameters)
    if not count or any(key not in PARAMETERS for key in parameters):
        raise ValueError("Select at least one recognized binding parameter.")
    shape = (count, 1) if width < 5 else (1, count)
    if axes is None:
        fig, axes = plt.subplots(*shape, figsize=(width, width * (2.0 * count / 3 if width < 5 else 0.46)),
                                 layout="constrained", squeeze=False)
        axes = axes.ravel()
    else:
        axes = np.asarray(axes).ravel()
        if len(axes) != count:
            raise ValueError("Parameter comparison requires one axis per selected parameter.")
        fig = axes[0].figure
    titles = {"kon": r"$k_{\mathrm{on}}$", "koff": r"$k_{\mathrm{off}}$", "KD_nM": r"$K_D$"}
    units = {"kon": r"M$^{-1}$ s$^{-1}$", "koff": r"s$^{-1}$", "KD_nM": "nM"}
    for ax, key in zip(axes, parameters):
        label, unit = PARAMETERS[key]
        subset = summary.loc[summary.parameter == label] if not summary.empty else summary
        for i, row in enumerate(subset.to_dict("records")):
            values = estimates.loc[(estimates.method == row["method"]) & (estimates.status == "Complete"), key].to_numpy(dtype=float)
            values = values[np.isfinite(values) & (values > 0)]
            jitter = np.linspace(-0.08, 0.08, len(values)) if len(values) else np.array([])
            ax.scatter(i + np.asarray(jitter), values, color="#1c5d99", s=22, zorder=3)
            center = row["mean"] if statistic == "Mean +/- SD" else row["geometric_mean"]
            ax.plot([i - 0.18, i + 0.18], [center] * 2, color="#d37522", linewidth=1.3)
            lo, hi = ((center - row["sd"], center + row["sd"]) if statistic == "Mean +/- SD"
                      else (row["ci95_low"], row["ci95_high"]))
            if np.isfinite(lo) and np.isfinite(hi):
                ax.vlines(i, lo, hi, color="#d37522", linewidth=1.3)
        labels = method_labels or {}
        ax.set_xticks(range(len(subset)), [f"{labels.get(r.method, 'Equil.' if r.method == 'Equilibrium' else r.method)}\nn={r.n_independent}" for r in subset.itertuples()] if not subset.empty else [])
        if not subset.empty and statistic != "Mean +/- SD":
            ax.set_yscale("log")
        ax.set_title(titles[key], fontsize=9)
        ax.set_ylabel(units[key], fontsize=8)
        ax.tick_params(labelsize=7)
        ax.spines[["top", "right"]].set_visible(False)
    return fig


def plot_curves_and_parameters(results, data_list, report, width=183 / 25.4,
                               statistic="Mean +/- SD", color_style="Cividis",
                               response_label="Response (input units)"):
    """Binding curves over three parameter panels, with explicit error-bar meaning."""
    repeats = kinetic_repeat_points(results["Kinetic"], data_list)
    summary = independent_summary(repeats, ["concentration_nM", "time_s"], "response")
    if summary.empty:
        raise ValueError("No overlapping kinetic traces are available for a combined figure.")
    with figure_style():
        wide = width >= 6
        fig = plt.figure(figsize=(width, width * (.9 if wide else 1.85)), layout="constrained")
        grid = fig.add_gridspec(2, 3, height_ratios=[1.35, 1]) if wide else fig.add_gridspec(4, 1, height_ratios=[1.35, 1, 1, 1])
        top = fig.add_subplot(grid[0, :])
        _kinetic_panel(top, repeats, summary, color_style, response_label, legend=False)
        top.legend(loc="upper right", ncol=2, handlelength=1.5)
        bottom = [fig.add_subplot(grid[1, index] if wide else grid[index + 1, 0]) for index in range(3)]
        fixed_time = "Equilibrium" in results and not results["Equilibrium"].get("attainment", {}).get("equilibrium_reached")
        hill = results.get("Equilibrium", {}).get("model") == "hill"
        plot_repeat_estimates(report, width, statistic, axes=bottom,
                             method_labels={"Equilibrium": "Hill C1/2"} if hill else {"Equilibrium": "Fixed-time"} if fixed_time else None)
        for letter, ax in zip("abcd", [top, *bottom]):
            ax.text(-.11, 1.04, letter, transform=ax.transAxes, fontweight="bold", fontsize=10)
        error_label = ("arithmetic mean +/- sample SD" if statistic == "Mean +/- SD" else
                       "geometric mean and log-Student-t 95% CI")
        footer = "Dots: independent-repeat estimates. Orange: " + error_label + "."
        if fixed_time:
            footer += "\nFixed-time isotherm: the steady-state check did not pass."
        if hill:
            footer += "\nHill C1/2 is an apparent half-saturation concentration."
        fig.supxlabel(footer, fontsize=7)
    return fig


def plot_method_publication(method, result, data_list, report, width=183 / 25.4,
                            color_style="Cividis", response_label="Response (input units)",
                            log_concentration=False):
    """Keep repeat dot/error-bar panels, with numerical results added below."""
    table = parameter_results_table(report, {method: result})
    fixed_time = method == "Equilibrium" and not result.get("attainment", {}).get("equilibrium_reached")
    hill = method == "Equilibrium" and result.get("model") == "hill"
    parameters = ["KD_nM"] if method == "Equilibrium" else list(PARAMETERS)
    method_report = {
        "summary": report["summary"].loc[report["summary"].method == method] if not report["summary"].empty else report["summary"],
        "repeat_estimates": report["repeat_estimates"].loc[report["repeat_estimates"].method == method]}
    with figure_style():
        wide, count = width >= 6, len(parameters)
        height = (.6 if count == 1 else 1.03) if wide else (1.25 if count == 1 else 2.3)
        fig = plt.figure(figsize=(width, width * height), layout="constrained")
        if wide and count == 1:
            grid = fig.add_gridspec(2, 2, width_ratios=[3.2, 1], height_ratios=[4, 1])
            ax = fig.add_subplot(grid[:, 0])
            panels = [fig.add_subplot(grid[0, 1])]
            number_panels = [fig.add_subplot(grid[1, 1])]
        elif wide:
            grid = fig.add_gridspec(3, count, height_ratios=[1.35, 1, .28])
            ax = fig.add_subplot(grid[0, :])
            panels = [fig.add_subplot(grid[1, index]) for index in range(count)]
            number_panels = [fig.add_subplot(grid[2, index]) for index in range(count)]
        else:
            grid = fig.add_gridspec(1 + count * 2, 1, height_ratios=[1.35, *([1, .28] * count)])
            ax = fig.add_subplot(grid[0, 0])
            panels = [fig.add_subplot(grid[1 + index * 2, 0]) for index in range(count)]
            number_panels = [fig.add_subplot(grid[2 + index * 2, 0]) for index in range(count)]
        if method == "Kinetic":
            units = kinetic_repeat_points(result, data_list)
            summary = independent_summary(units, ["concentration_nM", "time_s"], "response")
            if summary.empty:
                plt.close(fig)
                raise ValueError("No overlapping kinetic traces are available for this figure.")
            _kinetic_panel(ax, units, summary, color_style, response_label, legend=False)
            ax.legend(loc="upper right", ncol=2, handlelength=1.5)
        else:
            is_kobs = method == "kobs"
            raw = result["curve_table" if is_kobs else "repeat_response_table"]
            xcol, ycol = ("concentration_nM", "kobs") if is_kobs else ("concentration", "response")
            units = raw.groupby(["repeat_id", xcol], as_index=False)[ycol].mean().rename(columns={xcol: "x", ycol: "response"})
            summary = independent_summary(units, ["x"], "response")
            ylabel = r"$k_{\mathrm{obs}}$ (s$^{-1}$)" if is_kobs else response_label
            if not is_kobs and result.get("normalize_percent_bmax"):
                ylabel = "Response (% observed maximum)"
            _point_panel(ax, units, summary, result["fit_x_nM" if is_kobs else "conc_fit"],
                         result["fit_y_kobs" if is_kobs else "response_fit"], "Concentration (nM)",
                         ylabel, log_concentration, color_style)
        plot_repeat_estimates(method_report, width, axes=panels, parameters=parameters,
                             method_labels={"Equilibrium": "Hill"} if hill else {"Equilibrium": "Fixed-time"} if fixed_time else None)
        for panel, number_panel, key in zip(panels, number_panels, parameters):
            panel.set_xlim(-.6, .6)
            if hill:
                panel.set_title(r"Apparent $C_{1/2}$", fontsize=9)
            elif fixed_time:
                panel.set_title(r"Apparent $K_D$", fontsize=9)
            number_panel.set_axis_off()
            values = table.loc[table.parameter == PARAMETERS[key][0]]
            if values.empty:
                value, uncertainty = "Not estimable", "No eligible repeats"
            else:
                row = next(values.itertuples())
                _, value = _format_parameter_value(row.mean, row.sd)
                uncertainty = r"Mean $\pm$ SD" if row.n_independent > 1 else row.uncertainty
                uncertainty += f"; n={row.n_independent}"
            number_panel.text(.5, .72, value, ha="center", va="center", transform=number_panel.transAxes, fontsize=9)
            number_panel.text(.5, .15, uncertainty, ha="center", va="center",
                              transform=number_panel.transAxes, fontsize=7)
        if table.empty:
            fig.supxlabel("Independent-repeat parameter estimates are not available.", fontsize=7)
        elif fixed_time:
            fig.supxlabel("Fixed-time isotherm:" + (" " if width >= 6 else "\n") +
                          "the steady-state check did not pass.", fontsize=7)
    return fig


def method_publication_figures(results, data_list, report, width=183 / 25.4,
                               color_style="Cividis", response_label="Response (input units)"):
    figures = {}
    for method, key in [("Kinetic", "kinetic_with_parameters"), ("kobs", "kobs_with_parameters"),
                        ("Equilibrium", "equilibrium_with_parameters")]:
        if method not in results:
            continue
        figures[key] = plot_method_publication(method, results[method], data_list, report, width,
                                               color_style, response_label)
        if method == "Equilibrium":
            figures[key + "_log_concentration"] = plot_method_publication(
                method, results[method], data_list, report, width, color_style, response_label, log_concentration=True)
    return figures


def publication_figures(results_by_method, data_list, width=7.0, response_label="Response (input units)", color_style="Blue-Orange"):
    return clean_publication_figures(results_by_method, data_list, width, response_label, color_style)


def render_figure_gallery(selected, data_list, key="publication", width=7.0, dpi=600,
                          response_label="Response (input units)", color_style="Blue-Orange", report=None):
    figures, points = publication_figures(selected, data_list, width, response_label, color_style)
    try:
        if report and set(report["settings"]) == set(selected):
            figures.update(method_publication_figures(selected, data_list, report, width, color_style, response_label))
            if "Kinetic" in selected:
                statistic = st.radio("Parameter error bars (combined figure)", ["Mean +/- SD", "Geometric mean + 95% CI"],
                                     key=f"{key}_parameter_errors", horizontal=True)
                figures["curves_and_parameters"] = plot_curves_and_parameters(selected, data_list, report, width,
                    statistic, color_style, response_label)
            points["parameter_repeat_estimates"] = report["repeat_estimates"]
            points["parameter_statistics"] = report["summary"]
            points["parameter_results"] = parameter_results_table(report, selected)
            stamp = tuple((name, result["fit_settings"].get("run_timestamp_utc")) for name, result in selected.items())
            if st.session_state.get(f"{key}_plate_stamp") != stamp:
                st.session_state[f"{key}_figure"] = next(name for name in
                    ["curves_and_parameters", "equilibrium_with_parameters", "kobs_with_parameters"] if name in figures)
                st.session_state[f"{key}_plate_stamp"] = stamp
        preferred = [name for name in ["curves_and_parameters", "kinetic_with_parameters", "equilibrium_with_parameters",
                     "equilibrium_with_parameters_log_concentration", "kobs_with_parameters", "binding_summary",
                     "kinetic_mean_sd", "equilibrium", "kobs_linearization"] if name in figures]
        names = preferred + [name for name in figures if name not in preferred]
        if not names:
            st.info("No fitted curves are available for these datasets.")
            return
        name = st.selectbox("Figure", names, key=f"{key}_figure", format_func=lambda s: s.replace("_", " ").title())
        figure = figures[name]
        show_figure(figure)
        for column, fmt in zip(st.columns(3), ["png", "pdf", "svg"]):
            buffer = io.BytesIO()
            figure.savefig(buffer, format=fmt, dpi=dpi)
            column.download_button(f"Download {fmt.upper()}", buffer.getvalue(), f"MIXA_{name}.{fmt}",
                {"png": "image/png", "pdf": "application/pdf", "svg": "image/svg+xml"}[fmt],
                key=f"{key}_{fmt}", on_click="ignore", width="stretch")
        source = io.BytesIO()
        with zipfile.ZipFile(source, "w", zipfile.ZIP_DEFLATED) as archive:
            for label, table in points.items():
                archive.writestr(f"{label}.csv", table.to_csv(index=False))
            if report and "parameter_results" in points:
                archive.writestr("PARAMETER_RESULTS.txt", parameter_results_text(report, selected))
            archive.writestr("FIGURE_LEGENDS.txt", figure_legends(selected, data_list))
            archive.writestr("FIGURE_SETTINGS.json", json.dumps({"figure": name, "width_inches": width,
                "parameter_error_bars": (st.session_state.get(f"{key}_parameter_errors") if name == "curves_and_parameters"
                                         else "Mean +/- SD" if "_with_parameters" in name else None)}, indent=2))
        st.download_button("Download figure source data & legends", source.getvalue(), "MIXA_figure_source.zip",
                           "application/zip", key=f"{key}_sources", on_click="ignore")
        with st.expander("Figure definitions and independent sample sizes"):
            st.text(figure_legends(selected, data_list))
            for label, table in points.items():
                if label.endswith("mean_sd"):
                    st.dataframe(table, hide_index=True)
    finally:
        for figure in figures.values():
            plt.close(figure)


def methods_text(report):
    context = report["context"]
    statements = [
        f"MIXA {APP_VERSION} analysis record, generated {report['created_utc']}",
        f"Experiment: {context['experiment']}",
        "Concentration is expressed in nM at import; kinetics convert concentration to mol/L. Time is in seconds. Response retains input units.",
        "Negative controls are excluded from binding fits. The assignment table and background_subtraction.csv specify referencing for each trace. Technical control files are averaged within Repeat ID, then control repeats are averaged with equal weight. Control traces are linearly interpolated within their measured time range; no extrapolation or clipping of negative corrected responses is performed.",
        "The independent unit is the user-declared Repeat ID. Technical files share that ID. Each repeat is refitted using the saved model and settings. Tables give arithmetic mean, sample SD (ddof=1), SEM (SD/sqrt(n)), median and geometric mean. Geometric-mean 95% Student t intervals are calculated on log parameter estimates (df = n - 1). These intervals assume independent repeats and approximately normal log estimates. SD, SEM and across-repeat confidence intervals are unavailable for one repeat, not zero. With two repeats the interval is highly uncertain.",
        "Only complete, positive, finite repeat estimates enter parameter summaries. Failed, incomplete, boundary, unresolved and insufficient-saturation fits remain in repeat_estimates.csv and are counted in excluded_or_failed. Curve-wise kinetic concentration averages are diagnostic only, not global estimates. Exclusion can bias the summary and requires review.",
        "Mechanistic repeat summaries screen each parameter separately: missing covariance or local SE/value > 1 is unresolved. Those values, curves and errors remain in the diagnostics and repeat estimates, but do not contribute to the routine mean/SD for that parameter. Derived KD is assessed with its full covariance and may remain resolved despite broad component-rate errors. The declared precision screen is not a formal identifiability test; exclusion counts must be reviewed.",
        "Concentrations, time samples and technical files are not counted as independent repeats. For kobs and pooled equilibrium fitting, technical measurements are averaged within each Repeat ID and concentration before summarizing repeats.",
        "Association kobs is fitted with a free constant offset, amplitude and exponential rate: B + A(1 - exp(-kobs*t)), with time relative to association start. The concentration regression estimates k_on from the slope and k_off from the intercept. Equilibrium responses are averages of observations in the five seconds ending at the selected sampling time, restricted to the association phase; no subsequent observations are included.",
        "Kinetic least squares uses only observations flagged used_for_kinetic_fit in data/fit_selection.csv. Association and dissociation windows are selected independently. Pre-association observations may estimate baseline/drift but are excluded from the objective. Excluded points are absent from the residual vector and degrees of freedom. Repeat refits use the same saved windows. Kinetic figures show fitted observations in color and excluded observations in gray, with dashed predictions outside fitted intervals.",
        "The saved input_uncertainty record specifies whether raw sample/control measurement errors and supplied concentration calibration errors were propagated. When enabled, shared controls use one raw-source covariance and common-stock/concentration-level errors remain shared across files and repeats. Raw-source covariance replaces, rather than duplicates, the conditional measurement contribution. This is local fixed-estimator propagation, not a full nonlinear parameter-refit simulation; conditional likelihood/AIC and profile-RSS intervals are unchanged. Curve-wise diagnostic fits remain conditional and do not implement this budget. Shared sources can correlate repeat estimates; across-repeat SD/log-t intervals do not include their full uncertainty.",
        "Residual RMSE, mean, lag-1 correlation and Durbin-Watson are descriptive diagnostics. App quality scores are heuristic summaries, not p-values, confidence levels or proof of model validity. Correlated residuals can make ordinary fit covariance errors optimistic.",
        "Fit errors are local measurement standard uncertainties under the saved IID, fixed-OU or input-budget assumptions, not across-repeat SEMs or SDs. Unmodeled serial dependence can underestimate those errors. Cluster-bootstrap intervals are reported separately only with at least three independent repeat IDs, 200 eligible refits, at least 90% successful refits and at least 90% of requested draws attempted. Bootstrap intervals remain conditional on referencing/calibration, are not combined with input-budget errors, and are never silently relabeled as model covariance intervals.",
        "kobs rate errors propagate the first-stage association-rate covariance through the unchanged concentration-regression estimator. A line-RSS multiplier is not used to shrink that known input variance. Shared-source covariance and concentration calibration are included only as enabled in the saved budget; relative line weights are held fixed. These errors do not include model discrepancy or independently estimated between-experiment variability.",
        "For kinetic fits with an estimated pre-association reference, measurement error is propagated through the sample-median normalization and fitted-parameter sensitivities. The reference is a shared trace-level error, not an independent error added separately at every point or a freely fitted offset. Baseline-aware first-order covariance retains kon/koff covariance when deriving KD. The fixed-OU engine also includes baseline/kinetic cross-phase noise covariance. baseline_uncertainty metadata identifies whether this propagation was applied; older saved fits must be rerun to use it. Conditional likelihood/AIC and exploratory profiles are not redefined by this covariance repair.",
        "Equilibrium capacity is analytically profiled and affinity optimized in log concentration without an observed-response capacity cap. Approximate 95% profile-RSS F intervals use residual df = n - p, conditional on independent residuals and fixed relative weights; these are not across-repeat intervals. Open profile limits remain open. Routine equilibrium summaries require finite two-sided intervals and concentrations spanning the fitted half-saturation value through at least twice it. Hill affinity is an apparent half-saturation concentration, not automatically a microscopic thermodynamic KD.",
        "The two-state model propagates AB and AB* from physical phase boundaries. Overall KD = (koff/kon) * kd/(ka+kd), distinct from the first-step microscopic koff/kon. A single kobs or ln(2)/koff does not describe this model's overall response. The legacy 1:1+MT code denotes empirical exponential analyte-delivery lag, not a coupled surface mass-transport correction.",
        "Kinetic candidate criteria compare exactly the same selected observations. Each curve has its own estimated Gaussian residual variance, counted as a likelihood parameter; AICc and BIC are summed over those per-curve likelihoods. Incomplete candidates are ineligible. Akaike weights are relative candidate support, not mechanism probabilities. Automatic recommendations are withheld for detected serial correlation. Ordinary chi-square likelihood-ratio p-values are not used for these nonregular model alternatives.",
        "Figure captions: kinetic mean curves show equally weighted independent-repeat means +/- sample SD, after averaging technical files within repeat. Interpolation is for display only within common time coverage; fitting is performed on measured selected observations. kobs and isotherm panels show individual repeat points and mean +/- SD with the saved fitted line/curve. Repeat-statistics panels show individual estimates and arithmetic mean +/- SD. Geometric-mean confidence intervals are exported separately in tables. No confidence band is implied for fitted curves.",
        "For kinetics, nuisance terms and actual model/fit strategy are recorded in fit_settings.json. Equilibrium estimates require evidence of steady state; sampling a fixed association time does not establish equilibrium. kobs intercepts near zero or from sparse concentrations should not be treated as precise dissociation measurements.",
    ]
    for method, settings in report["settings"].items():
        statements.append(f"{method} saved windows (s): association {settings.get('fit_assoc_start_s')}-{settings.get('fit_assoc_end_s')}; dissociation {settings.get('fit_dissoc_start_s')}-{settings.get('fit_dissoc_end_s')}.")
    return "\n\n".join(statements) + "\n"


def build_publication_bundle(report, results_by_method, data_list, width=7.0, dpi=600,
                             response_label="Response (input units)", color_style="Blue-Orange"):
    from mixa_diagnostics import saved_fit_curves, write_diagnostic_tables
    from mixa_methods import write_methods_exports

    figures, points = publication_figures(results_by_method, data_list, width, response_label, color_style)
    figures.update(method_publication_figures(results_by_method, data_list, report, width, color_style, response_label))
    points["parameter_results"] = parameter_results_table(report, results_by_method)
    if not report["summary"].empty:
        with figure_style():
            figures["repeat_statistics"] = plot_repeat_estimates(report, width)
            figures["repeat_confidence_intervals"] = plot_repeat_estimates(report, width, "Geometric mean + 95% CI")
        if "Kinetic" in results_by_method:
            for name, statistic in [("mean_sd", "Mean +/- SD"), ("ci95", "Geometric mean + 95% CI")]:
                figures[f"curves_and_parameters_{name}"] = plot_curves_and_parameters(
                    results_by_method, data_list, report, width, statistic, color_style, response_label)
    buffer = io.BytesIO()
    try:
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            write_methods_exports(archive, results_by_method)
            write_project_exports(archive, data_list, selection_settings=report["settings"])
            if "Kinetic" in results_by_method:
                write_diagnostic_tables(archive, "statistics/kinetic_saved_fit_diagnostics",
                                        saved_fit_curves(results_by_method["Kinetic"], data_list))
            for key in ["repeat_estimates", "summary", "residual_diagnostics"]:
                archive.writestr(f"statistics/{key}.csv", report[key].to_csv(index=False))
            archive.writestr("statistics/parameter_results.csv", points["parameter_results"].to_csv(index=False))
            archive.writestr("PARAMETER_RESULTS.txt", parameter_results_text(report, results_by_method))
            archive.writestr("METHODS_AND_FIGURE_LEGENDS.txt", methods_text(report))
            archive.writestr("FIGURE_LEGENDS.txt", figure_legends(results_by_method, data_list))
            archive.writestr("fit_settings.json", json.dumps(report["settings"], indent=2, default=str))
            archive.writestr("statistics/scientific_fit_diagnostics.json", json.dumps(
                {method: scientific_metadata(result) for method, result in results_by_method.items()},
                indent=2, allow_nan=False))
            archive.writestr("project.json", json.dumps(report["context"], indent=2, default=str))
            archive.writestr("figure_settings.json", json.dumps({"width_inches": width, "raster_dpi": dpi,
                              "response_label": response_label, "concentration_palette": color_style,
                              "standalone_parameter_errors": "Mean +/- SD"}, indent=2))
            archive.writestr("software_versions.json", json.dumps({"mixa": APP_VERSION, "python": platform.python_version(), **{
                name: version(name) for name in ["streamlit", "numpy", "pandas", "scipy", "matplotlib"]}}, indent=2))
            archive.writestr("analysis_code_sha256.json", json.dumps(source_code_sha256(), indent=2))
            for key, table in points.items():
                archive.writestr(f"figure_data/{key}.csv", table.to_csv(index=False))
            for key, fig in figures.items():
                for fmt in ["png", "pdf", "svg"]:
                    image = io.BytesIO()
                    fig.savefig(image, format=fmt, dpi=dpi)
                    archive.writestr(f"figures/{key}.{fmt}", image.getvalue())
    finally:
        for fig in figures.values():
            plt.close(fig)
    return buffer.getvalue()


def render_publication_report(engines):
    available = {label: st.session_state.get(key) for label, key in [
        ("Kinetic", "latest_kinetic_results"), ("kobs", "latest_kobs_results"), ("Equilibrium", "latest_equilibrium_results")]}
    available = {k: v for k, v in available.items() if v and "fit_settings" in v}
    assisted = st.session_state.get("assisted_review")
    mechanistic = st.session_state.get("latest_mechanistic_results")
    if assisted:
        from mixa_mechanistic_ui import render_assisted_publication
        with st.expander("Assisted kinetic figures and parameter results", expanded=not bool(available)):
            render_assisted_publication(assisted, st.session_state.data_list)
    if mechanistic:
        from mixa_mechanistic_ui import render_mechanistic_publication
        with st.expander("Manual mechanistic kinetic figures and parameter results", expanded=not bool(available) and not bool(assisted)):
            render_mechanistic_publication(mechanistic, st.session_state.data_list)
    if available and "Kinetic" not in available:
        if mechanistic:
            bridged = mechanistic_to_kinetic_summary(mechanistic)
            if bridged:
                available["Kinetic"] = bridged
        elif assisted and assisted.get("recommended_index") is not None:
            rec_attempt = assisted["attempts"][assisted["recommended_index"]].get("result")
            bridged = mechanistic_to_kinetic_summary(rec_attempt)
            if bridged:
                available["Kinetic"] = bridged
    if not available:
        if not assisted and not mechanistic:
            st.info("Run at least one analysis method to prepare a publication report.")
        return
    st.markdown("### Report settings")
    chosen = st.multiselect("Methods to report", list(available), default=list(available), key="report_methods")
    selected = {k: available[k] for k in chosen}
    report_key = tuple((name, r["fit_settings"].get("run_timestamp_utc")) for name, r in selected.items())
    if st.session_state.get("report_key") != report_key:
        st.session_state.publication_report = None
        st.session_state.publication_bundle = None
        st.session_state.report_key = report_key
    with st.sidebar:
        st.markdown("### Publication figures")
        width = st.selectbox("Figure width", [89 / 25.4, 183 / 25.4], index=1,
                             format_func=lambda v: f"{v * 25.4:.0f} mm")
        dpi = st.selectbox("Raster resolution", [300, 600], index=1, format_func=lambda v: f"{v} dpi")
        response_label = st.text_input("Response axis label", value="Response (input units)")
        color_style = st.selectbox("Concentration palette", ["Cividis", "Blue-Orange", "Black & White"])
    st.markdown("### Figures & source data")
    if "Kinetic" in selected and selected["Kinetic"].get("boundary_parameters"):
        st.warning("The kinetic fit contains boundary estimates. Curves remain available for inspection, but routine repeat confidence summaries exclude boundary fits.")
    if selected:
        for method, result in selected.items():
            if result.get("summary_eligible") is False:
                st.warning(f"{method}: the saved fit does not qualify for routine parameter reporting. Curves remain available; inspect repeat-fit status and scientific diagnostics.")
        render_figure_gallery(selected, st.session_state.data_list, key="report_gallery", width=width, dpi=dpi,
                              response_label=response_label, color_style=color_style,
                              report=st.session_state.get("publication_report"))
    if "Equilibrium" in selected and not selected["Equilibrium"].get("attainment", {}).get("equilibrium_reached", False):
        st.warning("The equilibrium attainment check did not pass. A fixed-time isotherm may not estimate equilibrium affinity; inspect the equilibrium diagnostics before reporting K_D.")
    repeats = {d["repeat_id"] for d in st.session_state.data_list if st.session_state.include_map.get(d["filename"])}
    st.caption(f"{len(repeats)} independent repeats declared. Confidence intervals use repeat-level parameter estimates.")
    if len(repeats) < 3:
        st.warning("Fewer than three independent repeats: across-repeat uncertainty is limited. A single repeat has no across-repeat confidence interval.")
    provenance = st.session_state.get("preprocessing_table", pd.DataFrame())
    if not provenance.empty:
        referenced = provenance.loc[provenance.controls != ""]
        shared = referenced.groupby("controls").repeat_id.nunique()
        if (shared > 1).any():
            st.warning("Some repeats share negative controls. Their corrected responses can be correlated. Local input covariance follows the saved raw-source budget; repeat SD/log-t intervals remain separate and do not include a common reference/calibration component automatically.")
    if st.button("Generate repeat statistics", type="primary", disabled=not bool(selected)):
        progress = st.progress(0.0, text="Fitting independent repeats")
        with st.spinner("Calculating repeat estimates and intervals..."):
            st.session_state.publication_report = analyze_repeats(
                st.session_state.data_list, st.session_state.include_map, selected, engines,
                progress=lambda fraction, text: progress.progress(fraction, text=text))
        st.session_state.publication_bundle = None
        progress.empty()
        st.rerun()
    report = st.session_state.get("publication_report")
    if not report:
        return
    st.markdown("### Parameter results")
    if report["summary"].empty:
        st.warning("No complete positive repeat estimates are available. Inspect the fit status table.")
    else:
        table = parameter_results_table(report, selected)
        st.dataframe(table[["method", "parameter", "result", "uncertainty", "n_independent", "interpretation"]].rename(
            columns={"method": "Method", "parameter": "Parameter", "result": "Result", "uncertainty": "Error definition",
                     "n_independent": "Independent repeats", "interpretation": "Interpretation"}),
            hide_index=True, use_container_width=True)
        st.download_button("Download parameter results (TXT)", parameter_results_text(report, selected),
                           "MIXA_parameter_results.txt", "text/plain", on_click="ignore")
        with st.expander("Detailed parameter statistics"):
            st.dataframe(report["summary"], hide_index=True, use_container_width=True)
        st.download_button("Download parameter statistics (CSV)", report["summary"].to_csv(index=False),
                           "MIXA_parameter_statistics.csv", "text/csv", on_click="ignore")
        statistic = st.radio("Parameter variability", ["Mean +/- SD", "Geometric mean + 95% CI"], horizontal=True)
        with figure_style():
            fig = plot_repeat_estimates(report, width, statistic)
        show_figure(fig)
        plt.close(fig)
    with st.expander("Individual repeat estimates and fit status", expanded=True):
        st.dataframe(report["repeat_estimates"], hide_index=True, use_container_width=True)
    with st.expander("Residual diagnostics"):
        st.dataframe(report["residual_diagnostics"], hide_index=True, use_container_width=True)
    with st.expander("Methods and figure legends"):
        st.text(methods_text(report))
    if st.button("Prepare publication package"):
        with st.spinner("Rendering publication figures and packaging source data..."):
            st.session_state.publication_bundle = build_publication_bundle(report, selected, st.session_state.data_list, width, dpi, response_label, color_style)
            st.session_state.publication_bundle_size = (width, dpi, response_label, color_style)
    bundle = st.session_state.get("publication_bundle")
    if bundle and st.session_state.get("publication_bundle_size") == (width, dpi, response_label, color_style):
        st.download_button("Download publication package (ZIP)", bundle, "MIXA_publication.zip", "application/zip", on_click="ignore")
