"""Print-sized binding figures and the independent-repeat data behind them."""

from contextlib import contextmanager

import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
import pandas as pd


@contextmanager
def figure_style():
    # Scope print settings so the established diagnostic dashboards are unchanged.
    with plt.rc_context({"font.family": "sans-serif", "font.sans-serif": ["DejaVu Sans"],
                         "font.size": 8, "axes.labelsize": 8, "axes.titlesize": 9,
                         "axes.linewidth": .7, "xtick.labelsize": 7, "ytick.labelsize": 7,
                         "xtick.major.width": .7, "ytick.major.width": .7,
                         "legend.fontsize": 7, "legend.frameon": False,
                         "pdf.fonttype": 42, "ps.fonttype": 42, "svg.fonttype": "none",
                         "savefig.facecolor": "white", "figure.facecolor": "white"}):
        yield


def _polish(ax, xlabel, ylabel):
    ax.set(xlabel=xlabel, ylabel=ylabel)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(False)
    ax.tick_params(direction="out", length=3)


def _palette(n, style):
    if style == "Blue-Orange":
        cmap = LinearSegmentedColormap.from_list("binding", ["#18527d", "#498eae", "#9b782d", "#c96b2c"])
    else:
        cmap = plt.get_cmap("Greys" if style == "Black & White" else "cividis")
    return cmap(np.linspace(.1, .85, max(n, 1)))


def independent_summary(table, group, value):
    """One value per Repeat ID before computing sample SD (ddof=1)."""
    columns = [*group, "mean", "sd", "sem", "n_independent"]
    if table.empty:
        return pd.DataFrame(columns=columns)
    unit = table.groupby(["repeat_id", *group], as_index=False, dropna=False)[value].mean()
    summary = unit.groupby(group, as_index=False, dropna=False).agg(
        mean=(value, "mean"), sd=(value, "std"), n_independent=(value, "count"))
    summary["sem"] = summary.sd / np.sqrt(summary.n_independent)
    return summary[columns]


def kinetic_repeat_points(result, data_list):
    """Align only within common coverage for display; never resample an optimizer."""
    lookup = {d["filename"]: d for d in data_list}
    fitted_traces = {(f["filename"], float(f["concentration"])): f for f in result["individual_fits"]}
    groups = {}
    observations = result.get("curve_observations")
    if observations is None:
        observations = [{"filename": fit["filename"], "concentration_nM": fit["concentration"]} for fit in result["individual_fits"]]
    for observation in observations:
        data = lookup[observation["filename"]]
        concentration = float(observation["concentration_nM"])
        fit = fitted_traces.get((observation["filename"], concentration))
        if fit is None:
            fit = {"response_plot": observation["response"], "fitted_plot": np.full(len(data["time"]), np.nan),
                   "fit_mask": observation["fit_mask"], "fit_available": False}
        groups.setdefault(concentration, []).append((data, fit))
    rows = []
    for concentration, traces in sorted(groups.items()):
        lo = max(float(d["time"][0]) for d, _ in traces)
        hi = min(float(d["time"][-1]) for d, _ in traces)
        if hi <= lo:
            continue
        grid = np.unique(np.concatenate([np.asarray(d["time"], dtype=float) for d, _ in traces]))
        grid = grid[(grid >= lo) & (grid <= hi)]
        files = []
        for data, fit in traces:
            time = np.asarray(data["time"], dtype=float)
            response = np.asarray(fit.get("response_plot", data["responses"][concentration]))
            fitted = np.asarray(fit.get("fitted_plot", fit.get("fitted")))
            mask = np.asarray(fit.get("fit_mask", np.ones(len(time), dtype=bool)), dtype=bool)
            # Interpolation is solely a display operation and is recorded in CSV.
            used = np.interp(grid, time, mask.astype(float)) >= 1.0 - 1e-12
            files.append(pd.DataFrame({"repeat_id": data["repeat_id"], "file": data["filename"],
                "concentration_nM": concentration, "time_s": grid,
                "response": np.interp(grid, time, response), "fitted": np.interp(grid, time, fitted),
                "used_for_fit": used, "fit_available": fit.get("fit_available", True)}))
        aligned = pd.concat(files, ignore_index=True)
        unit = aligned.groupby(["repeat_id", "concentration_nM", "time_s"], as_index=False).agg(
            response=("response", "mean"), fitted=("fitted", lambda values: values.mean() if values.notna().all() else np.nan),
            used_for_fit=("used_for_fit", "all"), fit_available=("fit_available", "all"), n_technical=("file", "nunique"))
        rows.append(unit)
    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()


def _kinetic_panel(ax, repeats, summary, style, ylabel, legend=True):
    concentrations = sorted(summary.concentration_nM.unique())
    for color, concentration in zip(_palette(len(concentrations), style), concentrations):
        table = summary.loc[summary.concentration_nM == concentration].sort_values("time_s")
        x, y = table.time_s.to_numpy(), table["mean"].to_numpy()
        sd = table.sd.to_numpy()
        unit = repeats.loc[repeats.concentration_nM == concentration]
        model = unit.groupby("time_s").agg(fitted=("fitted", lambda values: values.mean() if values.notna().all() else np.nan),
                                          used=("used_for_fit", "all")).reindex(x)
        used = model.used.to_numpy(dtype=bool)
        ax.fill_between(x, y - sd, y + sd, where=np.isfinite(sd), color=color, alpha=.14, linewidth=0)
        # Every observation remains in source data; marker thinning only improves legibility.
        every = max(1, len(x) // 65)
        sampled = np.zeros(len(x), dtype=bool)
        sampled[::every] = True
        ax.plot(x, np.where(used, np.nan, y), color="#b5bcc3", linewidth=.65, alpha=.6)
        ax.plot(x[sampled & used], y[sampled & used], "o", color=color, markersize=2.1,
                markeredgewidth=0, label=f"{concentration:g} nM")
        ax.plot(x, np.where(used, model.fitted, np.nan), color=color, linewidth=1.15)
        ax.plot(x, np.where(used, np.nan, model.fitted), color=color, linewidth=.8, linestyle="--", alpha=.65)
    _polish(ax, "Time (s)", ylabel)
    if legend:
        ax.legend(handlelength=1, loc="upper left", bbox_to_anchor=(1.02, 1.0), borderaxespad=0)


def _point_panel(ax, units, summary, line_x, line_y, xlabel, ylabel, log_x=False, color_style="Blue-Orange"):
    data_color, fit_color = ("#222222", "#222222") if color_style == "Black & White" else ("#1f5c84", "#bc662e")
    if color_style == "Cividis":
        data_color, fit_color = _palette(2, color_style)
    for repeat, values in units.groupby("repeat_id", sort=True):
        ax.plot(values.x, values.response, "o", markersize=3, color="#8399aa", alpha=.55,
                markerfacecolor="none", markeredgewidth=.6)
    varying = summary.n_independent.to_numpy() > 1
    ax.plot(summary.x, summary["mean"], "o", markersize=3.5, color=data_color,
            label=r"Mean $\pm$ SD" if varying.any() else "Repeat mean (n=1)")
    if varying.any():
        ax.errorbar(summary.x[varying], summary["mean"][varying], yerr=summary.sd[varying], fmt="none",
                    ecolor=data_color, elinewidth=.8, capsize=2, markeredgewidth=.7)
    line_x, line_y = np.asarray(line_x), np.asarray(line_y)
    keep = line_x > 0 if log_x else np.ones(len(line_x), dtype=bool)
    ax.plot(line_x[keep], line_y[keep], color=fit_color, linewidth=1.3, label="Fitted model")
    if log_x:
        ax.set_xscale("log")
    else:
        ax.set_xlim(left=0)
    _polish(ax, xlabel, ylabel)
    ax.legend(handlelength=1.5)


def publication_figures(results_by_method, data_list, width=7.0,
                        response_label="Response (input units)", color_style="Blue-Orange"):
    """Unbranded figures, independent-repeat SD, and machine-readable figure data."""
    figures, points = {}, {}
    repeat_curves = kinetic_summary = None
    with figure_style():
        if "Kinetic" in results_by_method:
            result = results_by_method["Kinetic"]
            repeat_curves = kinetic_repeat_points(result, data_list)
            if not repeat_curves.empty:
                kinetic_summary = independent_summary(repeat_curves, ["concentration_nM", "time_s"], "response")
                fig, ax = plt.subplots(figsize=(width, width * .55), layout="constrained")
                _kinetic_panel(ax, repeat_curves, kinetic_summary, color_style, response_label)
                figures["kinetic_mean_sd"] = fig
                points["kinetic_independent_repeat_curves"] = repeat_curves
                points["kinetic_mean_sd"] = kinetic_summary
            for index, data in enumerate(data_list, 1):
                fits = [f for f in result["individual_fits"] if f["filename"] == data["filename"]]
                if not fits:
                    continue
                fig, ax = plt.subplots(figsize=(width, width * .55), layout="constrained")
                rows = []
                for color, fit in zip(_palette(len(fits), color_style), sorted(fits, key=lambda f: f["concentration"])):
                    c, t = fit["concentration"], np.asarray(data["time"])
                    y = np.asarray(fit.get("response_plot", data["responses"][c]))
                    model = np.asarray(fit.get("fitted_plot", fit["fitted"]))
                    used = np.asarray(fit.get("fit_mask", np.ones(len(t), dtype=bool)))
                    ax.plot(t[used], y[used], ".", color=color, markersize=2, alpha=.5)
                    ax.plot(t[~used], y[~used], ".", color="#c3c9ce", markersize=2, alpha=.5)
                    ax.plot(t, np.where(used, model, np.nan), color=color, linewidth=1.2, label=f"{c:g} nM")
                    ax.plot(t, np.where(used, np.nan, model), color=color, linestyle="--", linewidth=.7, alpha=.6)
                    rows.append(pd.DataFrame({"file": data["filename"], "repeat_id": data["repeat_id"],
                        "time_s": t, "concentration_nM": c, "response_display": y,
                        "fitted_display": model, "used_for_fit": used}))
                _polish(ax, "Time (s)", response_label)
                ax.legend(ncol=2)
                key = f"kinetic_{index:02d}"
                figures[key], points[key] = fig, pd.concat(rows, ignore_index=True)
        panels = []
        if kinetic_summary is not None:
            panels.append(("Binding kinetics", lambda ax: _kinetic_panel(ax, repeat_curves, kinetic_summary, color_style, response_label, legend=False)))
        for method, key, xcol, ycol, fitx, fity, xlabel, ylabel in [
            ("kobs", "kobs_linearization", "concentration_nM", "kobs", "fit_x_nM", "fit_y_kobs",
             "Concentration (nM)", r"$k_{\mathrm{obs}}$ (s$^{-1}$)"),
            ("Equilibrium", "equilibrium", "concentration", "response", "conc_fit", "response_fit",
             "Concentration (nM)", response_label)]:
            if method not in results_by_method:
                continue
            result = results_by_method[method]
            raw = result["curve_table" if method == "kobs" else "repeat_response_table"]
            unit = raw.groupby(["repeat_id", xcol], as_index=False)[ycol].mean().rename(columns={xcol: "x", ycol: "response"})
            summary = independent_summary(unit, ["x"], "response")
            if method == "Equilibrium" and result.get("normalize_percent_bmax"):
                ylabel = "Response (% observed maximum)"
            for log_x, suffix in [(False, ""), (True, "_log_concentration")]:
                fig, ax = plt.subplots(figsize=(width, width * .55), layout="constrained")
                _point_panel(ax, unit, summary, result[fitx], result[fity], xlabel, ylabel, log_x, color_style)
                figures[key + suffix] = fig
            points[key + "_repeat_points"] = unit.rename(columns={"x": "concentration_nM"})
            points[key + "_mean_sd"] = summary.rename(columns={"x": "concentration_nM"})
            points[key + "_fit"] = pd.DataFrame({"concentration_nM": result[fitx], "fitted_response": result[fity]})
            title = "Association rate" if method == "kobs" else (
                "Equilibrium binding" if result.get("attainment", {}).get("equilibrium_reached") else "Fixed-time binding")
            panels.append((title, lambda ax, u=unit, s=summary, r=result, fx=fitx, fy=fity, xl=xlabel, yl=ylabel:
                           _point_panel(ax, u, s, r[fx], r[fy], xl, yl, color_style=color_style)))
        if len(panels) > 1:
            columns = len(panels) if width >= 6 else 1
            rows = 1 if columns > 1 else len(panels)
            fig, axes = plt.subplots(rows, columns, figsize=(width, width * (.34 if columns > 1 else .6 * rows)),
                                     layout="constrained", squeeze=False)
            for index, ((title, draw), ax) in enumerate(zip(panels, axes.flat)):
                draw(ax)
                ax.set_title(title, loc="left", fontsize=8)
                ax.text(-.13, 1.05, chr(97 + index), transform=ax.transAxes, fontweight="bold", fontsize=10)
            if kinetic_summary is not None:
                handles, labels = axes.flat[0].get_legend_handles_labels()
                fig.legend(handles, labels, loc="outside lower center", ncol=min(len(labels), 7 if width >= 6 else 3),
                           handlelength=1, columnspacing=1, fontsize=7)
            figures["binding_summary"] = fig
    return figures, points


def figure_legends(results_by_method, data_list):
    legends = ["Points represent user-declared independent repeats after averaging technical files within Repeat ID. "
               "Error bars and shaded envelopes are sample standard deviations (ddof=1), not SEM or fit confidence bands. "
               "SD is unavailable for n=1 and is not plotted as zero. The number of independent repeats can vary by concentration; "
               "the exact n, mean, SD and SEM are in figure_data/*_mean_sd.csv.",
               "Kinetic figures use baseline/preprocessing transforms saved with the fit. Solid model segments span fitted observations; "
               "dashed segments are predictions outside the selected windows. Gray observations were not fitted. "
               "For across-repeat kinetic summaries only, traces are linearly interpolated within common measured time coverage, "
               "averaged within Repeat ID, then averaged equally across independent repeats. The displayed model is the mean of "
               "the saved trace predictions, not a new fit to the mean. Included observations remain in response means even if a fit fails; "
               "mean model lines are withheld where an included prediction is missing. Marker thinning affects display only; every point is exported."]
    legends.append("Combined curves-and-parameters figures place binding curves above k_on, k_off and K_D comparisons. "
                   "Blue parameter dots are individual eligible independent-repeat estimates; n is printed under each method. "
                   "The mean_sd version uses arithmetic mean +/- sample SD. The ci95 version uses geometric mean with "
                   "two-sided 95% Student-t intervals on log estimates. The figure footer identifies the selected definition. "
                   "Shaded response envelopes in the upper panel are sample SD, not parameter confidence intervals. "
                   "Kinetic, kobs and isotherm estimates from the same repeat are related measurements, not independent validation.")
    legends.append("Standalone kinetic and kobs figures retain k_on, k_off and K_D repeat dot/error-bar panels; "
                   "standalone isotherms retain the K_D repeat dot/error-bar panel. Numerical results are added below "
                   "these plots, not substituted for them. Standalone figures report numerical arithmetic means +/- "
                   "sample SD across eligible independent-repeat fits, with n for each parameter. K_D is summarized from "
                   "the individual repeat K_D estimates, not calculated as the ratio of mean rates. Means and SDs are "
                   "rounded together to two significant SD digits for display; unrounded statistics remain in CSV. "
                   "A single repeat reports its estimate with SD unavailable. Failed, boundary, unresolved and insufficient-saturation fits do not enter these "
                   "summaries. The numerical parameter summaries describe repeat refits, whereas displayed models are "
                   "the saved pooled isotherm/kobs fit or mean saved kinetic predictions. Isotherm K_D is labeled apparent "
                   "when the steady-state check has not passed. PARAMETER_RESULTS.txt records the numerical results and definitions.")
    for method, result in results_by_method.items():
        if method == "Kinetic":
            if result.get("boundary_parameters"):
                legends.append("Kinetic rates at solver bounds: " + ", ".join(result["boundary_parameters"]) +
                               ". These fitted curves are retained for inspection; boundary parameter estimates do not enter routine repeat-confidence summaries.")
            continue
        table = result["curve_table" if method == "kobs" else "repeat_response_table"]
        n = table.repeat_id.nunique()
        text = f"{method}: {n} declared independent repeats. Individual repeat values, mean +/- SD, and the saved fitted model are shown."
        if method == "Equilibrium":
            text += f" Response was sampled at {result['t_measure']:g} s."
            if result.get("model") == "hill":
                text += f" Hill coefficient: {result.get('n_hill', float('nan')):.3g}; affinity denotes apparent half-saturation C1/2, not a microscopic KD."
            if not result.get("attainment", {}).get("equilibrium_reached"):
                text += " The steady-state check did not pass; this is a fixed-time binding isotherm, not established equilibrium affinity."
            text += " " + " ".join(result.get("scientific_warnings", []))
        legends.append(text)
    return "\n\n".join(legends)
