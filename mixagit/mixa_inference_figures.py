"""Publication-style figures for refit evidence, distinct from repeat-SD panels."""

import io

import matplotlib.pyplot as plt
import numpy as np

from mixa_figures import figure_style


def sampling_figure(payload, model="langmuir"):
    table = payload["summary"].copy()
    table["family"] = table.estimate.str.split("::").str[0]
    table = table.loc[(table.kind == "Affinity (nM)") | table.family.isin(["kon", "koff", "kon2", "koff2", "k_forward", "k_reverse"])]
    families = list(dict.fromkeys(table.family))
    columns = min(max(len(families), 1), 3)
    rows = max(1, int(np.ceil(len(families)/columns)))
    with figure_style():
        fig, axes = plt.subplots(rows, columns, figsize=(2.65*columns, 3.35*rows), layout="constrained", squeeze=False)
        for ax, name in zip(axes.flat, families):
            subset = table.loc[table.family == name]
            x = np.arange(len(subset))
            ax.scatter(x, subset.point_estimate, color="#1c5d99", s=22, zorder=3)
            for i, row in enumerate(subset.itertuples()):
                if row.status == "Available":
                    ax.vlines(i, row.interval95_low, row.interval95_high, color="#d37522", lw=1.6)
                    ax.hlines([row.interval95_low, row.interval95_high], i-.09, i+.09, color="#d37522", lw=1.2)
                else:
                    ax.annotate("Fixed" if row.status == "Fixed, not estimated" else "Unresolved", (i, row.point_estimate), xytext=(0, 8), textcoords="offset points", ha="center", fontsize=6)
            labels = [str(r.label) if str(r.label) != "nan" else r.estimate for r in subset.itertuples()]
            labels = [label.split("::", 1)[-1].replace(" [", "\n[") for label in labels]
            ax.set(xticks=x, xticklabels=labels, title=name.replace("_nM", "").replace("_", " "), xlim=(-.4, max(len(x)-.6, .4)))
            unit = "nM" if name.startswith("KD_") else r"$\mathrm{M}^{-1}\,\mathrm{s}^{-1}$" if name in {"kon", "kon2"} else r"$\mathrm{s}^{-1}$"
            if model == "bivalent" and name == "kon2":
                unit = r"$\mathrm{response}^{-1}\,\mathrm{s}^{-1}$"
            ax.set_ylabel(unit)
            ax.ticklabel_format(axis="y", style="sci", scilimits=(-3, 4), useMathText=True)
            ax.tick_params(labelsize=7)
            ax.spines[["top", "right"]].set_visible(False)
        for ax in list(axes.flat)[len(families):]:
            ax.set_visible(False)
        fig.supxlabel("Point estimate and nonlinear parametric-refit 95% interval", fontsize=8)
    return fig


def profile_figure(payload):
    table, info = payload["table"], payload["metadata"]
    complete = table.status.isin(["Converged", "Saved optimum"])
    with figure_style():
        fig, ax = plt.subplots(figsize=(6.6, 3.5), layout="constrained")
        ax.plot(table.loc[complete, "value"], table.loc[complete, "likelihood_ratio"], "o", color="#1c5d99", ms=3)
        ax.axhline(info["threshold"], color="#d37522", ls="--", label="Approximate 95% threshold")
        if table.value.min() > 0:
            ax.set_xscale("log")
        ax.set(xlabel=info["instance"], ylabel="Profile likelihood ratio")
        ax.set_ylim(-.05*info["threshold"], 2*info["threshold"])
        ax.spines[["top", "right"]].set_visible(False)
        ax.legend(fontsize=8)
    return fig


def calibrated_figure(payload):
    table, info = payload["profile"], payload["metadata"]
    with figure_style():
        fig, ax = plt.subplots(figsize=(6.6, 3.5), layout="constrained")
        complete = table.status.isin(["Complete", "Saved optimum"])
        ax.plot(table.loc[complete, "value"], table.loc[complete, "statistic"], "o-", color="#1c5d99", ms=3, lw=.8)
        if info["critical_value"] is not None:
            ax.axhline(info["critical_value"], color="#d37522", ls="--", label="Calibrated 95% critical value")
            ax.set_ylim(-.05*info["critical_value"], 2*info["critical_value"])
            ax.legend(fontsize=8)
        if table.value.min() > 0:
            ax.set_xscale("log")
        ax.set(xlabel=info["target"], ylabel="Refitted RSS-ratio statistic")
        ax.spines[["top", "right"]].set_visible(False)
    return fig


def joint_figure(payload):
    table = payload["summary"].set_index("estimate") if not payload["summary"].empty else None
    with figure_style():
        fig, axes = plt.subplots(1, 3, figsize=(7.5, 3.5), layout="constrained")
        for ax, parameter, title, unit in zip(axes, ["kon", "koff", "KD_nM"],
                [r"$k_\mathrm{on}$", r"$k_\mathrm{off}$", r"$K_D$"], [r"M$^{-1}$ s$^{-1}$", r"s$^{-1}$", "nM"]):
            key = f"population_median_{parameter}"
            if table is not None and key in table.index:
                row = table.loc[key]
                ax.scatter([0], [row.posterior_median], color="#1c5d99", s=25, zorder=3)
                if row.status == "Available":
                    ax.vlines(0., row.interval95_low, row.interval95_high, color="#d37522", lw=1.8)
                    ax.hlines([row.interval95_low, row.interval95_high], -.09, .09, color="#d37522", lw=1.2)
                else:
                    ax.text(.5, .95, "MCMC unresolved", transform=ax.transAxes, ha="center", va="top", fontsize=8)
            ax.set(xlim=(-.5, .5), xticks=[0], xticklabels=["Population median"], title=title, ylabel=unit)
            ax.ticklabel_format(axis="y", style="sci", scilimits=(-3, 4), useMathText=True)
            ax.tick_params(labelsize=8)
            ax.spines[["top", "right"]].set_visible(False)
        fig.supxlabel("Joint posterior median and 95% credible interval; not independent-repeat SD", fontsize=8)
    return fig


def joint_curve_figure(payload, filename):
    points = payload["curves"]
    points = points.loc[(points.filename == filename) & points.kinetic_selected]
    with figure_style():
        fig, ax = plt.subplots(figsize=(7., 4.), layout="constrained")
        groups = list(points.groupby("concentration_nM", sort=True))
        colors = plt.get_cmap("cividis")(np.linspace(.1, .85, max(len(groups), 1)))
        for (concentration, data), color in zip(groups, colors):
            data = data.sort_values("time_s")
            t = data.time_s.to_numpy()
            y, low, high = data.posterior_curve_median.to_numpy(), data.curve95_low.to_numpy(), data.curve95_high.to_numpy()
            if len(t) > 2:
                gaps = np.flatnonzero(np.diff(t) > 1.5*np.median(np.diff(t)))+1
                for gap in gaps[::-1]:
                    t, y, low, high = [np.insert(a, gap, np.nan) for a in [t, y, low, high]]
            ax.plot(t, y, color=color, lw=1.25, label=f"{concentration:g} nM")
            ax.fill_between(t, low, high, color=color, alpha=.15, linewidth=0.)
            ax.scatter(data.time_s, data.observed_raw_corrected, color=color, s=5, alpha=.5)
        ax.set(xlabel="Time (s)", ylabel="Response (raw corrected input units)")
        ax.spines[["top", "right"]].set_visible(False)
        ax.legend(frameon=False, fontsize=8, ncol=2)
    return fig


def write_review_figures(archive, prefix, result):
    review = result.get("inference_review", {})
    figures = {}
    for i, (name, payload) in enumerate(review.get("profiles", {}).items()):
        figures[f"profile_{i+1}"] = profile_figure(payload)
    if review.get("sampling"):
        figures["nonlinear_parameter_intervals"] = sampling_figure(review["sampling"], result.get("model", "langmuir"))
    for i, payload in enumerate(review.get("calibration", {}).values()):
        figures[f"calibrated_interval_{i+1}"] = calibrated_figure(payload)
    for i, payload in enumerate(review.get("joint", {}).values()):
        figures[f"joint_population_intervals_{i+1}"] = joint_figure(payload)
        if payload.get("curves") is not None and not payload["curves"].empty:
            for j, filename in enumerate(dict.fromkeys(payload["curves"].filename)):
                figures[f"joint_{i+1}_curves_{j+1}"] = joint_curve_figure(payload, filename)
    try:
        for name, fig in figures.items():
            for fmt in ["pdf", "svg", "png"]:
                buffer = io.BytesIO()
                fig.savefig(buffer, format=fmt, dpi=600)
                archive.writestr(f"{prefix}/figures/{name}.{fmt}", buffer.getvalue())
    finally:
        for fig in figures.values():
            plt.close(fig)
