"""Interactive pharmacodynamics teaching app for Hugging Face Spaces."""

import numpy as np
import plotly.graph_objects as go
import gradio as gr


EPS = 1e-15
PLOT_TEMPLATE = "simple_white"
CONC_MIN_NM = 0.1
CONC_MAX_NM = 5000.0
LINEAR_MAX_NM = 1000.0
NM_TO_M = 1e-9
BMAX_FIXED = 100.0
EMAX_FIXED = 100.0
QUANTAL_MIN_MGKG = 1.0
QUANTAL_MAX_MGKG = 200.0

APP_CSS = """
#bind_kd1, #eff_kd1, #ant_ec50, #pa_full_ec50, #q_ed50, #q_s_eff { --color-accent: royalblue; --slider-color: royalblue; --range-color: royalblue; }
#bind_kd2, #eff_kd2, #ant_ic50, #pa_partial_ec50, #q_td50, #q_s_tox { --color-accent: seagreen; --slider-color: seagreen; --range-color: seagreen; }
#bind_kd3, #eff_kd3 { --color-accent: darkorange; --slider-color: darkorange; --range-color: darkorange; }
#bind_kd1 input[type="range"], #eff_kd1 input[type="range"], #ant_ec50 input[type="range"], #pa_full_ec50 input[type="range"], #q_ed50 input[type="range"], #q_s_eff input[type="range"] { accent-color: royalblue !important; }
#bind_kd2 input[type="range"], #eff_kd2 input[type="range"], #ant_ic50 input[type="range"], #pa_partial_ec50 input[type="range"], #q_td50 input[type="range"], #q_s_tox input[type="range"] { accent-color: seagreen !important; }
#bind_kd3 input[type="range"], #eff_kd3 input[type="range"] { accent-color: darkorange !important; }
#bind_kd1 label, #eff_kd1 label, #ant_ec50 label, #pa_full_ec50 label, #q_ed50 label, #q_s_eff label { color: royalblue !important; }
#bind_kd2 label, #eff_kd2 label, #ant_ic50 label, #pa_partial_ec50 label, #q_td50 label, #q_s_tox label { color: seagreen !important; }
#bind_kd3 label, #eff_kd3 label { color: darkorange !important; }
"""


def fmt_nm(value_nm):
    if value_nm >= 100:
        return f"{value_nm:.0f}"
    if value_nm >= 10:
        return f"{value_nm:.1f}"
    return f"{value_nm:.2f}"


def nm_to_m(value_nm):
    return np.asarray(value_nm, dtype=float) * NM_TO_M


def hill_response(conc, emax, ec50, hill_n=1.0):
    ec50 = max(ec50, EPS)
    conc = np.asarray(conc, dtype=float)
    return emax * (conc**hill_n) / (ec50**hill_n + conc**hill_n)


def concentration_grids_nm(points=500):
    x_log_nm = np.logspace(np.log10(CONC_MIN_NM), np.log10(CONC_MAX_NM), points)
    x_linear_nm = np.linspace(0.0, LINEAR_MAX_NM, points)
    return x_log_nm, x_linear_nm


def style_figure(fig, title, x_title, y_title, is_log_x, y_range=None, x_range=None):
    fig.update_layout(
        title=title,
        xaxis_title=x_title,
        yaxis_title=y_title,
        template=PLOT_TEMPLATE,
        legend=dict(x=0.02, y=0.98),
        margin=dict(l=50, r=20, t=50, b=50),
    )
    if is_log_x:
        fig.update_xaxes(type="log")
    if x_range is not None:
        fig.update_xaxes(range=x_range)
    if y_range is not None:
        fig.update_yaxes(range=y_range)
    return fig


def error_plot(title, message, is_log_x):
    fig = go.Figure()
    style_figure(
        fig,
        title,
        "Concentration (nM, log scale)" if is_log_x else "Concentration (nM, linear scale)",
        "Response",
        is_log_x,
        [0, 100],
        [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))] if is_log_x else [0, LINEAR_MAX_NM],
    )
    fig.add_annotation(
        x=0.5,
        y=0.5,
        xref="paper",
        yref="paper",
        text=message,
        showarrow=False,
        font=dict(color="crimson"),
    )
    return fig


def add_reference_lines(
    fig,
    vlines=None,
    hlines=None,
):
    if vlines is not None:
        for x, label, color in vlines:
            fig.add_shape(
                type="line",
                x0=float(x),
                x1=float(x),
                y0=0,
                y1=1,
                xref="x",
                yref="paper",
                line=dict(color=color, dash="dot", width=2),
                layer="above",
            )
            fig.add_annotation(
                x=float(x),
                y=1.01,
                xref="x",
                yref="paper",
                text=label,
                showarrow=False,
                font=dict(color=color, size=11),
                bgcolor="rgba(255,255,255,0.85)",
            )
    if hlines is not None:
        for y, label, color in hlines:
            fig.add_shape(
                type="line",
                x0=0,
                x1=1,
                y0=float(y),
                y1=float(y),
                xref="paper",
                yref="y",
                line=dict(color=color, dash="dash", width=2),
                layer="above",
            )
            fig.add_annotation(
                x=1.0,
                y=float(y),
                xref="paper",
                yref="y",
                text=label,
                showarrow=False,
                xanchor="right",
                yanchor="bottom",
                font=dict(color=color, size=11),
                bgcolor="rgba(255,255,255,0.85)",
            )
    return fig


def plot_binding_kd_bmax(kd1_nm, kd2_nm, kd3_nm):
    try:
        kd_values = [
            max(float(kd1_nm), CONC_MIN_NM),
            max(float(kd2_nm), CONC_MIN_NM),
            max(float(kd3_nm), CONC_MIN_NM),
        ]
        bmax = BMAX_FIXED
        x_log_nm, x_linear_nm = concentration_grids_nm()
        x_log_m = nm_to_m(x_log_nm)
        x_linear_m = nm_to_m(x_linear_nm)
        line_colors = ["royalblue", "seagreen", "darkorange"]

        fig_log = go.Figure()
        for idx, kd_variant_nm in enumerate(kd_values):
            kd_variant_m = float(nm_to_m(kd_variant_nm))
            y_log = hill_response(x_log_m, bmax, kd_variant_m, 1.0)
            fig_log.add_trace(
                go.Scatter(
                    x=x_log_nm,
                    y=y_log,
                    mode="lines",
                    name=f"Curve {idx + 1} KD={fmt_nm(kd_variant_nm)} nM",
                    line=dict(width=3, color=line_colors[idx % len(line_colors)]),
                )
            )
        add_reference_lines(
            fig_log,
            vlines=[(v, f"KD{(i + 1)} {fmt_nm(v)}", line_colors[i % len(line_colors)]) for i, v in enumerate(kd_values)],
            hlines=[(bmax, "Bmax", "gray"), (0.5 * bmax, "50% Bmax", "steelblue")],
        )
        style_figure(
            fig_log,
            "Binding Curve (Log X)",
            "Drug concentration [D] (nM, log scale)",
            "Bound receptor amount (B, a.u.)",
            True,
            [0, 110],
            [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
        )

        fig_linear = go.Figure()
        for idx, kd_variant_nm in enumerate(kd_values):
            kd_variant_m = float(nm_to_m(kd_variant_nm))
            y_linear = hill_response(x_linear_m, bmax, kd_variant_m, 1.0)
            fig_linear.add_trace(
                go.Scatter(
                    x=x_linear_nm,
                    y=y_linear,
                    mode="lines",
                    name=f"Curve {idx + 1} KD={fmt_nm(kd_variant_nm)} nM",
                    line=dict(width=3, color=line_colors[idx % len(line_colors)]),
                )
            )
        add_reference_lines(
            fig_linear,
            vlines=[(v, f"KD{(i + 1)} {fmt_nm(v)}", line_colors[i % len(line_colors)]) for i, v in enumerate(kd_values)],
            hlines=[(bmax, "Bmax", "gray"), (0.5 * bmax, "50% Bmax", "steelblue")],
        )
        style_figure(
            fig_linear,
            "Binding Curve (Linear X)",
            "Drug concentration [D] (nM, linear scale)",
            "Bound receptor amount (B, a.u.)",
            False,
            [0, 110],
            [0, LINEAR_MAX_NM],
        )

        note = (
            f"KD1={fmt_nm(kd_values[0])} nM, KD2={fmt_nm(kd_values[1])} nM, KD3={fmt_nm(kd_values[2])} nM. "
            f"At each KD, binding is 50% of Bmax. "
            f"Bmax is fixed at {bmax:.0f} binding units."
        )
        return fig_log, fig_linear, note
    except Exception as exc:
        msg = f"Section 1 plot error: {exc}"
        return error_plot("Binding (Log X)", msg, True), error_plot("Binding (Linear X)", msg, False), msg


def plot_efficacy_ec50_emax(kd1_nm, kd2_nm, kd3_nm):
    try:
        kd_values = [
            max(float(kd1_nm), CONC_MIN_NM),
            max(float(kd2_nm), CONC_MIN_NM),
            max(float(kd3_nm), CONC_MIN_NM),
        ]
        emax = EMAX_FIXED
        x_log_nm, x_linear_nm = concentration_grids_nm()
        x_log_m = nm_to_m(x_log_nm)
        x_linear_m = nm_to_m(x_linear_nm)
        line_colors = ["royalblue", "seagreen", "darkorange"]

        fig_log = go.Figure()
        for idx, ec50_nm in enumerate(kd_values):
            ec50_m = float(nm_to_m(ec50_nm))
            effect_log = hill_response(x_log_m, emax, ec50_m, 1.0)
            fig_log.add_trace(
                go.Scatter(
                    x=x_log_nm,
                    y=effect_log,
                    mode="lines",
                    name=f"Curve {idx + 1} KD=EC50={fmt_nm(ec50_nm)} nM",
                    line=dict(width=3, color=line_colors[idx % len(line_colors)]),
                )
            )
        add_reference_lines(
            fig_log,
            vlines=[(v, f"KD=EC50 {i + 1}: {fmt_nm(v)}", line_colors[i % len(line_colors)]) for i, v in enumerate(kd_values)],
            hlines=[(emax, "Emax=efficacy", "gray"), (0.5 * emax, "50% efficacy", "steelblue")],
        )
        style_figure(
            fig_log,
            "Efficacy Curve (Idealized: KD = EC50, Log X)",
            "Drug concentration [D] (nM, log scale)",
            "Effect (a.u.)",
            True,
            [0, 110],
            [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
        )

        fig_linear = go.Figure()
        for idx, ec50_nm in enumerate(kd_values):
            ec50_m = float(nm_to_m(ec50_nm))
            effect_linear = hill_response(x_linear_m, emax, ec50_m, 1.0)
            fig_linear.add_trace(
                go.Scatter(
                    x=x_linear_nm,
                    y=effect_linear,
                    mode="lines",
                    name=f"Curve {idx + 1} KD=EC50={fmt_nm(ec50_nm)} nM",
                    line=dict(width=3, color=line_colors[idx % len(line_colors)]),
                )
            )
        add_reference_lines(
            fig_linear,
            vlines=[(v, f"KD=EC50 {i + 1}: {fmt_nm(v)}", line_colors[i % len(line_colors)]) for i, v in enumerate(kd_values)],
            hlines=[(emax, "Emax=efficacy", "gray"), (0.5 * emax, "50% efficacy", "steelblue")],
        )
        style_figure(
            fig_linear,
            "Efficacy Curve (Idealized: KD = EC50, Linear X)",
            "Drug concentration [D] (nM, linear scale)",
            "Effect (a.u.)",
            False,
            [0, 110],
            [0, LINEAR_MAX_NM],
        )

        note = (
            f"KD=EC50 values: {fmt_nm(kd_values[0])}, {fmt_nm(kd_values[1])}, {fmt_nm(kd_values[2])} nM. "
            f"Emax=efficacy is fixed at {emax:.0f}."
        )
        return fig_log, fig_linear, note
    except Exception as exc:
        msg = f"Section 2 plot error: {exc}"
        return error_plot("Efficacy (Log X)", msg, True), error_plot("Efficacy (Linear X)", msg, False), msg


def plot_antagonists(model, base_emax, base_ec50_nm, hill_n, ant_conc_nm, ic50_nm):
    try:
        base_ec50_nm = max(float(base_ec50_nm), CONC_MIN_NM)
        ant_conc_nm = max(float(ant_conc_nm), CONC_MIN_NM)
        ic50_nm = max(float(ic50_nm), CONC_MIN_NM)
        base_ec50_m = float(nm_to_m(base_ec50_nm))
        ant_conc_m = float(nm_to_m(ant_conc_nm))
        ic50_m = float(nm_to_m(ic50_nm))

        dose_ratio = 1.0 + ant_conc_m / ic50_m
        if model == "Competitive":
            with_emax = base_emax
            with_ec50_m = base_ec50_m * dose_ratio
            model_line = "Competitive antagonist: rightward EC50 shift, unchanged Emax."
        else:
            with_emax = base_emax / dose_ratio
            with_ec50_m = base_ec50_m
            model_line = "Noncompetitive antagonist: reduced Emax, EC50 approximately unchanged."

        with_ec50_nm = with_ec50_m / NM_TO_M
        with_ec50_line_nm = min(max(with_ec50_nm, CONC_MIN_NM), CONC_MAX_NM)

        x_log_nm, x_linear_nm = concentration_grids_nm()
        x_log_m = nm_to_m(x_log_nm)
        x_linear_m = nm_to_m(x_linear_nm)
        base_log_curve = hill_response(x_log_m, base_emax, base_ec50_m, hill_n)
        with_log_curve = hill_response(x_log_m, with_emax, with_ec50_m, hill_n)
        base_linear_curve = hill_response(x_linear_m, base_emax, base_ec50_m, hill_n)
        with_linear_curve = hill_response(x_linear_m, with_emax, with_ec50_m, hill_n)

        fig_resp_log = go.Figure()
        fig_resp_log.add_trace(
            go.Scatter(
                x=x_log_nm,
                y=base_log_curve,
                mode="lines",
                name="Agonist alone",
                line=dict(width=3, color="royalblue"),
            )
        )
        fig_resp_log.add_trace(
            go.Scatter(
                x=x_log_nm,
                y=np.zeros_like(x_log_nm),
                mode="lines",
                name="Antagonist alone (no efficacy)",
                line=dict(width=3, color="red"),
            )
        )
        fig_resp_log.add_trace(
            go.Scatter(
                x=x_log_nm,
                y=with_log_curve,
                mode="lines",
                name=f"With {model.lower()} antagonist",
                line=dict(width=3, dash="dash", color="seagreen"),
            )
        )

        vline_items = [(base_ec50_nm, "Baseline EC50", "royalblue")]
        hline_items = [(base_emax, "Baseline Emax=efficacy", "royalblue")]
        if model == "Competitive":
            vline_items.append((with_ec50_line_nm, "Shifted EC50", "seagreen"))
        else:
            hline_items.append((with_emax, "Reduced Emax=efficacy", "seagreen"))
        add_reference_lines(fig_resp_log, vlines=vline_items, hlines=hline_items)
        style_figure(
            fig_resp_log,
            f"{model} Antagonism (Log X)",
            "Agonist concentration (nM, log scale)",
            "Effect (%)",
            True,
            [-5, 160],
            [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
        )

        fig_resp_linear = go.Figure()
        fig_resp_linear.add_trace(
            go.Scatter(
                x=x_linear_nm,
                y=base_linear_curve,
                mode="lines",
                name="Agonist alone",
                line=dict(width=3, color="royalblue"),
            )
        )
        fig_resp_linear.add_trace(
            go.Scatter(
                x=x_linear_nm,
                y=np.zeros_like(x_linear_nm),
                mode="lines",
                name="Antagonist alone (no efficacy)",
                line=dict(width=3, color="red"),
            )
        )
        fig_resp_linear.add_trace(
            go.Scatter(
                x=x_linear_nm,
                y=with_linear_curve,
                mode="lines",
                name=f"With {model.lower()} antagonist",
                line=dict(width=3, dash="dash", color="seagreen"),
            )
        )
        add_reference_lines(fig_resp_linear, vlines=vline_items, hlines=hline_items)
        style_figure(
            fig_resp_linear,
            f"{model} Antagonism (Linear X)",
            "Agonist concentration (nM, linear scale)",
            "Effect (%)",
            False,
            [-5, 160],
            [0, LINEAR_MAX_NM],
        )

        ant_log_grid_nm, ant_linear_grid_nm = concentration_grids_nm()
        inhib_log = 100.0 * ant_log_grid_nm / (ic50_nm + ant_log_grid_nm)
        inhib_linear = 100.0 * ant_linear_grid_nm / (ic50_nm + ant_linear_grid_nm)
        inhib_at_current = 100.0 * ant_conc_nm / (ic50_nm + ant_conc_nm)

        fig_inhib_log = go.Figure()
        fig_inhib_log.add_trace(
            go.Scatter(x=ant_log_grid_nm, y=inhib_log, mode="lines", name="Inhibition", line=dict(width=3, color="seagreen"))
        )
        add_reference_lines(
            fig_inhib_log,
            vlines=[(ic50_nm, "IC50", "seagreen"), (ant_conc_nm, "[I]", "gray")],
            hlines=[(50.0, "50% inhibition", "steelblue")],
        )
        style_figure(
            fig_inhib_log,
            "Antagonist Inhibition vs [I] (Log X)",
            "Antagonist concentration [I] (nM, log scale)",
            "Inhibition (%)",
            True,
            [0, 100],
            [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
        )

        fig_inhib_linear = go.Figure()
        fig_inhib_linear.add_trace(
            go.Scatter(x=ant_linear_grid_nm, y=inhib_linear, mode="lines", name="Inhibition", line=dict(width=3, color="seagreen"))
        )
        add_reference_lines(
            fig_inhib_linear,
            vlines=[(ic50_nm, "IC50", "seagreen"), (ant_conc_nm, "[I]", "gray")],
            hlines=[(50.0, "50% inhibition", "steelblue")],
        )
        style_figure(
            fig_inhib_linear,
            "Antagonist Inhibition vs [I] (Linear X)",
            "Antagonist concentration [I] (nM, linear scale)",
            "Inhibition (%)",
            False,
            [0, 100],
            [0, LINEAR_MAX_NM],
        )

        note = (
            f"{model_line} IC50 = {fmt_nm(ic50_nm)} nM, [I] = {fmt_nm(ant_conc_nm)} nM, "
            f"inhibition at [I] = {inhib_at_current:.1f}%. Baseline EC50 = {fmt_nm(base_ec50_nm)} nM; "
            f"with antagonist EC50 = {fmt_nm(with_ec50_nm)} nM."
        )
        return fig_resp_log, fig_resp_linear, fig_inhib_log, fig_inhib_linear, note
    except Exception as exc:
        msg = f"Section 3 plot error: {exc}"
        return (
            error_plot("Antagonism (Log X)", msg, True),
            error_plot("Antagonism (Linear X)", msg, False),
            error_plot("Inhibition (Log X)", msg, True),
            error_plot("Inhibition (Linear X)", msg, False),
            msg,
        )


def plot_partial_agonists(
    full_ec50_nm,
    full_hill,
    partial_intrinsic,
    partial_ec50_nm,
    partial_hill,
):
    try:
        full_emax = EMAX_FIXED
        full_ec50_nm = max(float(full_ec50_nm), CONC_MIN_NM)
        partial_ec50_nm = max(float(partial_ec50_nm), CONC_MIN_NM)
        full_ec50_m = float(nm_to_m(full_ec50_nm))
        partial_ec50_m = float(nm_to_m(partial_ec50_nm))
        partial_emax = full_emax * partial_intrinsic

        x_log_nm, x_linear_nm = concentration_grids_nm()
        x_log_m = nm_to_m(x_log_nm)
        x_linear_m = nm_to_m(x_linear_nm)
        full_log_curve = hill_response(x_log_m, full_emax, full_ec50_m, full_hill)
        partial_log_curve = hill_response(x_log_m, partial_emax, partial_ec50_m, partial_hill)
        full_linear_curve = hill_response(x_linear_m, full_emax, full_ec50_m, full_hill)
        partial_linear_curve = hill_response(x_linear_m, partial_emax, partial_ec50_m, partial_hill)

        fig_log = go.Figure()
        fig_log.add_trace(
            go.Scatter(
                x=x_log_nm,
                y=full_log_curve,
                mode="lines",
                name="Full agonist",
                line=dict(width=3, color="royalblue"),
            )
        )
        fig_log.add_trace(
            go.Scatter(
                x=x_log_nm,
                y=partial_log_curve,
                mode="lines",
                name="Partial agonist",
                line=dict(width=3, dash="dash", color="seagreen"),
            )
        )
        add_reference_lines(
            fig_log,
            vlines=[(full_ec50_nm, "Full EC50", "royalblue"), (partial_ec50_nm, "Partial EC50", "seagreen")],
            hlines=[(full_emax, "Full Emax=efficacy", "royalblue"), (partial_emax, "Partial Emax=efficacy", "seagreen")],
        )
        style_figure(
            fig_log,
            "Partial vs Full Agonist (Log X)",
            "Agonist concentration (nM, log scale)",
            "Effect (%)",
            True,
            [0, 160],
            [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
        )

        fig_linear = go.Figure()
        fig_linear.add_trace(
            go.Scatter(
                x=x_linear_nm,
                y=full_linear_curve,
                mode="lines",
                name="Full agonist",
                line=dict(width=3, color="royalblue"),
            )
        )
        fig_linear.add_trace(
            go.Scatter(
                x=x_linear_nm,
                y=partial_linear_curve,
                mode="lines",
                name="Partial agonist",
                line=dict(width=3, dash="dash", color="seagreen"),
            )
        )
        add_reference_lines(
            fig_linear,
            vlines=[(full_ec50_nm, "Full EC50", "royalblue"), (partial_ec50_nm, "Partial EC50", "seagreen")],
            hlines=[(full_emax, "Full Emax=efficacy", "royalblue"), (partial_emax, "Partial Emax=efficacy", "seagreen")],
        )
        style_figure(
            fig_linear,
            "Partial vs Full Agonist (Linear X)",
            "Agonist concentration (nM, linear scale)",
            "Effect (%)",
            False,
            [0, 160],
            [0, LINEAR_MAX_NM],
        )

        note = (
            f"Full EC50 = {fmt_nm(full_ec50_nm)} nM, Partial EC50 = {fmt_nm(partial_ec50_nm)} nM. "
            f"Full Emax=efficacy is fixed at {full_emax:.0f}; Partial Emax = {partial_emax:.1f}% ({partial_intrinsic:.2f} x full)."
        )
        return fig_log, fig_linear, note
    except Exception as exc:
        msg = f"Section 4 plot error: {exc}"
        return error_plot("Partial Agonists (Log X)", msg, True), error_plot("Partial Agonists (Linear X)", msg, False), msg


def plot_spare_receptors(kd_nm, tau):
    emax = EMAX_FIXED
    kd_nm = max(float(kd_nm), CONC_MIN_NM)
    kd_m = float(nm_to_m(kd_nm))
    tau = max(tau, 1e-6)
    ec50_effect_m = kd_m / (1.0 + tau)
    ec50_effect_nm = ec50_effect_m / NM_TO_M

    x_log_nm, x_linear_nm = concentration_grids_nm()
    x_log_m = nm_to_m(x_log_nm)
    x_linear_m = nm_to_m(x_linear_nm)

    occupancy_log = 100.0 * x_log_m / (kd_m + x_log_m)
    occupancy_linear = 100.0 * x_linear_m / (kd_m + x_linear_m)

    # Use apparent EC50 shift to illustrate receptor reserve while keeping Emax fixed at 100%.
    effect_log = hill_response(x_log_m, emax, ec50_effect_m, 1.0)
    effect_linear = hill_response(x_linear_m, emax, ec50_effect_m, 1.0)

    fig_log = go.Figure()
    fig_log.add_trace(
        go.Scatter(x=x_log_nm, y=occupancy_log, mode="lines", name="Occupancy (%)", line=dict(width=3))
    )
    fig_log.add_trace(
        go.Scatter(x=x_log_nm, y=effect_log, mode="lines", name="Effect (%)", line=dict(width=3, dash="dash"))
    )
    add_reference_lines(
        fig_log,
        vlines=[(kd_nm, "KD", "gray"), (ec50_effect_nm, "Apparent EC50", "black")],
        hlines=[(emax, "Emax=efficacy", "gray")],
    )
    style_figure(
        fig_log,
        "Spare Receptors: Occupancy vs Effect (Log X)",
        "Agonist concentration (nM, log scale)",
        "Percent",
        True,
        [0, 100],
        [float(np.log10(CONC_MIN_NM)), float(np.log10(CONC_MAX_NM))],
    )

    fig_linear = go.Figure()
    fig_linear.add_trace(
        go.Scatter(x=x_linear_nm, y=occupancy_linear, mode="lines", name="Occupancy (%)", line=dict(width=3))
    )
    fig_linear.add_trace(
        go.Scatter(x=x_linear_nm, y=effect_linear, mode="lines", name="Effect (%)", line=dict(width=3, dash="dash"))
    )
    add_reference_lines(
        fig_linear,
        vlines=[(kd_nm, "KD", "gray"), (ec50_effect_nm, "Apparent EC50", "black")],
        hlines=[(emax, "Emax=efficacy", "gray")],
    )
    style_figure(
        fig_linear,
        "Spare Receptors: Occupancy vs Effect (Linear X)",
        "Agonist concentration (nM, linear scale)",
        "Percent",
        False,
        [0, 100],
        [0, LINEAR_MAX_NM],
    )

    note = (
        f"KD = {fmt_nm(kd_nm)} nM, apparent effect EC50 = {fmt_nm(ec50_effect_nm)} nM. "
        f"When tau > 1, EC50 falls below KD (spare receptor behavior)."
    )
    return fig_log, fig_linear, note


def logistic_quantal(log_dose, mu, sigma):
    sigma = max(float(sigma), 0.01)
    return 1.0 / (1.0 + np.exp(-(log_dose - mu) / sigma))


def ti_color(ti_value):
    if ti_value < 2.0:
        return "red"
    if ti_value < 5.0:
        return "orange"
    if ti_value <= 10.0:
        return "yellow"
    return "green"


def plot_quantal(ed50, td50, s_eff, s_tox):
    try:
        ed50 = max(float(ed50), EPS)
        td50 = max(float(td50), EPS)
        s_eff = max(float(s_eff), 0.01)
        s_tox = max(float(s_tox), 0.01)
        ed50_log10 = np.log10(ed50)
        td50_log10 = np.log10(td50)
        ti = td50 / max(ed50, EPS)
        ti_text_color = ti_color(ti)

        # Work on log-dose axis x = log10(dose).
        x_min = np.log10(QUANTAL_MIN_MGKG)
        x_max = np.log10(QUANTAL_MAX_MGKG)
        x = np.linspace(x_min, x_max, 800)
        dose = 10**x

        # Logistic CDFs for cumulative quantal curves.
        p_eff = logistic_quantal(x, ed50_log10, s_eff)
        p_tox = logistic_quantal(x, td50_log10, s_tox)

        # Analytic derivatives wrt x = log10(dose): bell-shaped frequency curves.
        f_eff = (1.0 / s_eff) * p_eff * (1.0 - p_eff)
        f_tox = (1.0 / s_tox) * p_tox * (1.0 - p_tox)
        dx = float(x[1] - x[0])

        p_eff_pct = 100.0 * p_eff
        p_tox_pct = 100.0 * p_tox
        # Convert density on log-dose axis to percent in each log-dose interval.
        f_eff_pct = 100.0 * f_eff * dx
        f_tox_pct = 100.0 * f_tox * dx

        y2_max = max(float(np.max(f_eff_pct)), float(np.max(f_tox_pct)), 1e-3) * 1.15

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=dose,
                y=p_eff_pct,
                mode="lines",
                name="Efficacy cumulative",
                line=dict(width=3, color="royalblue"),
            )
        )
        fig.add_trace(
            go.Scatter(
                x=dose,
                y=p_tox_pct,
                mode="lines",
                name="Toxicity cumulative",
                line=dict(width=3, dash="dash", color="orange"),
            )
        )
        fig.add_trace(
            go.Scatter(
                x=dose,
                y=f_eff_pct,
                mode="lines",
                name="Efficacy frequency (% in dose interval)",
                line=dict(width=2, dash="dash", color="blue"),
                yaxis="y2",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=dose,
                y=f_tox_pct,
                mode="lines",
                name="Toxicity frequency (% in dose interval)",
                line=dict(width=2, dash="dash", color="orange"),
                yaxis="y2",
            )
        )
        add_reference_lines(
            fig,
            vlines=[(ed50, "ED50", "blue"), (td50, "TD50", "orange")],
            hlines=[(50.0, "50%", "steelblue")],
        )
        style_figure(
            fig,
            "Quantal Dose-Response (Log X, mg/kg)",
            "Dose (mg/kg)",
            "Cumulative population (%)",
            True,
            [0, 100],
            [x_min, x_max],
        )
        fig.update_layout(
            margin=dict(l=50, r=20, t=120, b=50),
            yaxis2=dict(
                title="Frequency (% in each log-dose interval)",
                overlaying="y",
                side="right",
                range=[0, y2_max],
                showgrid=False,
            )
        )
        fig.add_annotation(
            x=0.5,
            y=1.10,
            xref="paper",
            yref="paper",
            yanchor="bottom",
            text=f"<b>Therapeutic Index (TI) = {ti:.2f}</b>",
            showarrow=False,
            font=dict(size=24, color=ti_text_color),
            bgcolor="rgba(255,255,255,0.92)",
            bordercolor=ti_text_color,
            borderwidth=2,
            borderpad=8,
        )
        note = (
            f"ED50 = {ed50:.3g} mg/kg, TD50 = {td50:.3g} mg/kg, Therapeutic Index (TI = TD50/ED50) = {ti:.2f}. "
            f"s_eff = {s_eff:.2f}, s_tox = {s_tox:.2f}."
        )
        return fig, note
    except Exception as exc:
        msg = f"Section 6 plot error: {exc}"
        return error_plot("Quantal (Linear)", msg, False), msg


with gr.Blocks(title="Pharmacodynamics Lesson Explorer", css=APP_CSS) as demo:
    gr.Markdown(
        """
# Pharmacodynamics Lesson Explorer
Lesson flow:
1. KD and Bmax binding
2. Efficacy with idealized KD = EC50
3. Antagonists (with IC50)
4. Partial agonists
5. Spare receptors
6. Quantal dose-response

Most lessons show both log-scale and linear-scale x-axis views.
Quantal is shown on a log-dose axis (mg/kg).
Concentration controls are in nM (0.1 to 250 nM).
        """
    )

    with gr.Tab("1) Binding: KD and Bmax"):
        with gr.Row():
            bind_kd1_nm = gr.Slider(0.1, 250, value=1, step=0.1, label="Curve 1 KD (nM, blue)", elem_id="bind_kd1")
            bind_kd2_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="Curve 2 KD (nM, green)", elem_id="bind_kd2")
            bind_kd3_nm = gr.Slider(0.1, 250, value=100, step=0.1, label="Curve 3 KD (nM, orange)", elem_id="bind_kd3")
        bind_init = plot_binding_kd_bmax(1, 10, 100)

        with gr.Row():
            bind_plot_log = gr.Plot(value=bind_init[0], label="Log plot")
            bind_plot_linear = gr.Plot(value=bind_init[1], label="Linear plot")
        bind_text = gr.Textbox(value=bind_init[2], label="Interpretation", interactive=False)

        bind_inputs = [bind_kd1_nm, bind_kd2_nm, bind_kd3_nm]
        bind_outputs = [bind_plot_log, bind_plot_linear, bind_text]
        for c in bind_inputs:
            c.change(plot_binding_kd_bmax, bind_inputs, bind_outputs)

    with gr.Tab("2) Efficacy: KD equals EC50 (idealized)"):
        with gr.Row():
            eff_kd1_nm = gr.Slider(0.1, 250, value=1, step=0.1, label="Curve 1 KD=EC50 (nM, blue)", elem_id="eff_kd1")
            eff_kd2_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="Curve 2 KD=EC50 (nM, green)", elem_id="eff_kd2")
            eff_kd3_nm = gr.Slider(0.1, 250, value=100, step=0.1, label="Curve 3 KD=EC50 (nM, orange)", elem_id="eff_kd3")
        eff_init = plot_efficacy_ec50_emax(1, 10, 100)

        with gr.Row():
            eff_plot_log = gr.Plot(value=eff_init[0], label="Log plot")
            eff_plot_linear = gr.Plot(value=eff_init[1], label="Linear plot")
        eff_text = gr.Textbox(value=eff_init[2], label="Interpretation", interactive=False)

        eff_inputs = [eff_kd1_nm, eff_kd2_nm, eff_kd3_nm]
        eff_outputs = [eff_plot_log, eff_plot_linear, eff_text]
        for c in eff_inputs:
            c.change(plot_efficacy_ec50_emax, eff_inputs, eff_outputs)

    with gr.Tab("3) Antagonists"):
        with gr.Row():
            ant_model = gr.Radio(["Competitive", "Noncompetitive"], value="Competitive", label="Antagonist model")
            ant_emax = gr.Slider(40, 150, value=100, step=1, label="Baseline Emax (%)")
        with gr.Row():
            ant_ec50_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="Baseline agonist EC50 (nM, blue)", elem_id="ant_ec50")
            ant_hill = gr.Slider(0.5, 3.0, value=1.0, step=0.1, label="Hill coefficient")
        with gr.Row():
            ant_conc_nm = gr.Slider(0.1, 250, value=100, step=0.1, label="Current antagonist [I] (nM)")
            ant_ic50_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="IC50 (nM, green)", elem_id="ant_ic50")
        ant_init = plot_antagonists("Competitive", 100, 10, 1.0, 100, 10)

        with gr.Row():
            ant_resp_log = gr.Plot(value=ant_init[0], label="Agonist-response log plot")
            ant_resp_linear = gr.Plot(value=ant_init[1], label="Agonist-response linear plot")
        with gr.Row():
            ant_inhib_log = gr.Plot(value=ant_init[2], label="Inhibition log plot")
            ant_inhib_linear = gr.Plot(value=ant_init[3], label="Inhibition linear plot")
        ant_text = gr.Textbox(value=ant_init[4], label="Interpretation", interactive=False)

        ant_inputs = [ant_model, ant_emax, ant_ec50_nm, ant_hill, ant_conc_nm, ant_ic50_nm]
        ant_outputs = [ant_resp_log, ant_resp_linear, ant_inhib_log, ant_inhib_linear, ant_text]
        for c in ant_inputs:
            c.change(plot_antagonists, ant_inputs, ant_outputs)

    with gr.Tab("4) Partial Agonists"):
        with gr.Row():
            pa_full_ec50_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="Full agonist EC50 (nM, blue)", elem_id="pa_full_ec50")
            pa_full_hill = gr.Slider(0.5, 3.0, value=1.0, step=0.1, label="Full agonist Hill n")
        with gr.Row():
            pa_partial_intrinsic = gr.Slider(0.1, 1.0, value=0.6, step=0.05, label="Partial intrinsic efficacy (fraction)")
            pa_partial_ec50_nm = gr.Slider(0.1, 250, value=31.6, step=0.1, label="Partial agonist EC50 (nM, green dashed)", elem_id="pa_partial_ec50")
            pa_partial_hill = gr.Slider(0.5, 3.0, value=1.0, step=0.1, label="Partial agonist Hill n")
        pa_init = plot_partial_agonists(10, 1.0, 0.6, 31.6, 1.0)

        with gr.Row():
            pa_plot_log = gr.Plot(value=pa_init[0], label="Log plot")
            pa_plot_linear = gr.Plot(value=pa_init[1], label="Linear plot")
        pa_text = gr.Textbox(value=pa_init[2], label="Interpretation", interactive=False)

        pa_inputs = [
            pa_full_ec50_nm,
            pa_full_hill,
            pa_partial_intrinsic,
            pa_partial_ec50_nm,
            pa_partial_hill,
        ]
        pa_outputs = [pa_plot_log, pa_plot_linear, pa_text]
        for c in pa_inputs:
            c.change(plot_partial_agonists, pa_inputs, pa_outputs)

    with gr.Tab("5) Spare Receptors"):
        with gr.Row():
            spare_kd_nm = gr.Slider(0.1, 250, value=10, step=0.1, label="KD (nM)")
            spare_tau = gr.Slider(0.1, 20.0, value=5.0, step=0.1, label="Transduction factor tau")

        with gr.Row():
            spare_plot_log = gr.Plot(label="Log plot")
            spare_plot_linear = gr.Plot(label="Linear plot")
        spare_text = gr.Textbox(label="Interpretation", interactive=False)

        spare_inputs = [spare_kd_nm, spare_tau]
        spare_outputs = [spare_plot_log, spare_plot_linear, spare_text]
        for c in spare_inputs:
            c.change(plot_spare_receptors, spare_inputs, spare_outputs)
        demo.load(plot_spare_receptors, spare_inputs, spare_outputs)

    with gr.Tab("6) Quantal Dose-Response"):
        with gr.Row():
            q_ed50 = gr.Slider(
                QUANTAL_MIN_MGKG,
                QUANTAL_MAX_MGKG,
                value=20,
                step=1,
                label="ED50 (mg/kg)",
                elem_id="q_ed50",
            )
            q_td50 = gr.Slider(
                QUANTAL_MIN_MGKG,
                QUANTAL_MAX_MGKG,
                value=60,
                step=1,
                label="TD50 (mg/kg)",
                elem_id="q_td50",
            )
        with gr.Row():
            q_s_eff = gr.Slider(0.05, 0.20, value=0.05, step=0.01, label="s_eff (efficacy slope/variance)", elem_id="q_s_eff")
            q_s_tox = gr.Slider(0.05, 0.20, value=0.05, step=0.01, label="s_tox (toxicity slope/variance)", elem_id="q_s_tox")

        q_init = plot_quantal(20, 60, 0.05, 0.05)
        with gr.Row():
            q_plot = gr.Plot(value=q_init[0], label="Log-dose plot (mg/kg)")
        q_text = gr.Textbox(value=q_init[1], label="Interpretation", interactive=False)

        q_inputs = [q_ed50, q_td50, q_s_eff, q_s_tox]
        q_outputs = [q_plot, q_text]
        for c in q_inputs:
            c.change(plot_quantal, q_inputs, q_outputs)

    gr.Markdown(
        """
### Teaching Notes
- Tab 1 anchors the core binding concept: KD and Bmax.
- Tab 2 uses an idealized mapping where KD = EC50 to bridge binding to effect.
- Antagonist tab includes both effect curves and explicit IC50 inhibition curves.
- Concentration sliders are in nM (0.1 to 250 nM), not log units.
- X and Y axes are fixed so curve shifts can be compared directly while sliders move.
        """
    )


if __name__ == "__main__":
    demo.launch()
