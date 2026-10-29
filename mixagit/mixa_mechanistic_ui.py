"""Mechanistic controls and reporting within the Kinetic Analysis workspace."""

from dataclasses import asdict, replace
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import io
import json
from pathlib import Path
import platform
import zipfile

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
from mixa_plotting import show_figure

from mixa_data import APP_VERSION
from mixa_diagnostics import (overview_figure, render_saved_fit_diagnostics, saved_fit_curves,
                              write_diagnostic_tables)
from mixa_figures import figure_style, independent_summary, kinetic_repeat_points, _kinetic_panel
from mixa_mechanisms import (MODEL_LABELS, MODEL_NOTES, SCOPES, Parameter,
                            assay_guidance, derived_affinities, expand_parameter_controls, fit_mechanism,
                            fit_single_cycle_kinetics, parameter_defaults, prepare_curves, profile_parameter,
                            refit_independent_repeats, stoichiometry_from_capacity, validate_parameters)
from mixa_methods import source_code_sha256
from mixa_reporting import _format_parameter_value
from mixa_science import json_safe
from mixa_workspace import write_project_exports


DIAGNOSTICS_REVISION = 5


def _initial_value(key, default):
    return None if key in st.session_state else default


def _response_figure(result, data_list):
    adapter = {"individual_fits": [dict(filename=c["filename"], concentration=c["concentration_nM"],
                                       response_plot=c["response"], fitted=c["fitted"], fit_mask=c["fit_mask"])
                                    for c in result["curves"]]}
    points = kinetic_repeat_points(adapter, data_list)
    summary = independent_summary(points, ["concentration_nM", "time_s"], "response")
    with figure_style():
        fig, ax = plt.subplots(figsize=(7.2, 4.1), layout="constrained")
        if not summary.empty:
            _kinetic_panel(ax, points, summary, "Cividis", "Response (analysis input units)")
        else:
            ax.text(.5, .5, "No common measured coverage; inspect individual curves.", ha="center", transform=ax.transAxes)
    return fig, points


def _diagnostic_figure(result):
    return overview_figure(saved_fit_curves(result))


def render_assisted_publication(review, data_list):
    """Keep assisted figures accessible without replacing other method results."""
    index = review.get("display_index")
    if index is None:
        st.info("The assisted run has no completed curves to export.")
        return
    result = review["attempts"][index]["result"]
    qualified = review["recommended_index"] is not None
    st.caption(f"Saved assisted model: {MODEL_LABELS[result['model']]} | Run: {result['created_utc']}")
    if not qualified:
        st.warning("Diagnostic output only: the assisted run did not select a qualified model.")
    if st.button("Calculate assisted repeat statistics", key="assisted_publication_repeats", disabled=not qualified):
        with st.spinner("Refitting each declared independent experiment..."):
            result["repeat_report"] = refit_independent_repeats(result["curves"], result, starts=2,
                                                               runtime_s=review["config"]["policy"]["runtime_s"])
        st.session_state.pop("advanced_export", None)
    figure, _ = _response_figure(result, data_list)
    figures = {"kinetic_curves": figure}
    if result.get("repeat_report") is not None:
        report = result["repeat_report"]
        summary = report["summary"].copy()
        if not summary.empty:
            summary["result_mean_sd"] = [_format_parameter_value(row.mean, row.sd)[0] for row in summary.itertuples()]
        st.dataframe(summary, hide_index=True)
        figures["independent_repeat_parameters"] = _repeat_figure(report)
    for name, fig in figures.items():
        show_figure(fig)
        for column, fmt in zip(st.columns(3), ["pdf", "svg", "png"]):
            payload = io.BytesIO()
            fig.savefig(payload, format=fmt, dpi=600 if fmt == "png" else 300)
            column.download_button(f"Download {name.replace('_', ' ')} ({fmt.upper()})", payload.getvalue(),
                                   f"MIXA_assisted_{name}.{fmt}", {"pdf": "application/pdf", "svg": "image/svg+xml", "png": "image/png"}[fmt],
                                   key=f"assisted_publication_{name}_{fmt}", on_click="ignore")
        plt.close(fig)
    st.caption("Curve envelopes: independent-repeat SD, not model confidence bands. Parameter panels retain individual repeat estimates and mean +/- SD; no repeat SD is available at n=1. Advanced affinities retain their mechanism-specific definitions.")
    export_parts = [result["signature"], json.dumps(result.get("assisted_review", {}), sort_keys=True)]
    for table in result.get("repeat_report", {}).values():
        export_parts.append(table.to_csv(index=False))
    if result.get("profile") is not None:
        export_parts.append(result["profile"]["table"].to_csv(index=False))
    export_key = hashlib.sha256("\n".join(export_parts).encode()).hexdigest()
    if st.button("Prepare assisted publication package", key="assisted_publication_prepare"):
        with st.spinner("Rendering figures and packaging data, statistics and the model-review log..."):
            st.session_state.assisted_publication_export = (export_key, build_mechanistic_bundle(result, data_list))
    saved = st.session_state.get("assisted_publication_export")
    if saved and saved[0] == export_key:
        st.download_button("Download assisted publication package", saved[1], "MIXA_assisted_publication.zip", "application/zip", on_click="ignore")


def render_mechanistic_publication(result, data_list):
    """Render publication figures, independent-repeat refits, and archive export for a manual mechanistic fit."""
    if not result:
        return
    st.caption(f"Saved mechanistic model: {MODEL_LABELS.get(result['model'], result['model'])} | Surface transport: {result.get('transport', 'None')} | Run: {result.get('created_utc', '')}")
    unqualified = bool(result.get("boundary_parameters")) or result.get("loss", "linear") != "linear" or bool(result.get("timed_out"))
    if unqualified:
        st.warning("Diagnostic output: active parameter bounds, timeout, or non-Gaussian objective detected.")
    if not result.get("single_cycle"):
        if st.button("Calculate mechanistic repeat statistics", key="mechanistic_publication_repeats", disabled=unqualified):
            with st.spinner("Refitting each declared independent experiment with the saved mechanism..."):
                result["repeat_report"] = refit_independent_repeats(
                    result["curves"],
                    result,
                    starts=2,
                    runtime_s=float(result.get("optimizer_settings", {}).get("runtime_s", 120.0)),
                )
            st.session_state.pop("mechanistic_publication_export", None)
    figure, _ = _response_figure(result, data_list)
    figures = {"kinetic_curves": figure}
    if result.get("repeat_report") is not None:
        report = result["repeat_report"]
        summary = report["summary"].copy()
        if not summary.empty:
            summary["result_mean_sd"] = [_format_parameter_value(row.mean, row.sd)[0] for row in summary.itertuples()]
        st.dataframe(summary, hide_index=True)
        figures["independent_repeat_parameters"] = _repeat_figure(report)
    for name, fig in figures.items():
        show_figure(fig)
        for column, fmt in zip(st.columns(3), ["pdf", "svg", "png"]):
            payload = io.BytesIO()
            fig.savefig(payload, format=fmt, dpi=600 if fmt == "png" else 300)
            column.download_button(
                f"Download {name.replace('_', ' ')} ({fmt.upper()})",
                payload.getvalue(),
                f"MIXA_mechanistic_{name}.{fmt}",
                {"pdf": "application/pdf", "svg": "image/svg+xml", "png": "image/png"}[fmt],
                key=f"mechanistic_publication_{name}_{fmt}",
                on_click="ignore",
            )
        plt.close(fig)
    st.caption("Curve envelopes: independent-repeat SD, not model confidence bands. Parameter panels retain individual repeat estimates and mean +/- SD; no repeat SD is available at n=1. Advanced affinities retain their mechanism-specific definitions.")
    export_parts = [result.get("signature", "")]
    for table in (result.get("repeat_report") or {}).values():
        export_parts.append(table.to_csv(index=False))
    if result.get("profile") is not None:
        export_parts.append(result["profile"]["table"].to_csv(index=False))
    export_key = hashlib.sha256("\n".join(export_parts).encode()).hexdigest()
    if st.button("Prepare advanced publication package", key="mechanistic_publication_prepare"):
        with st.spinner("Rendering figures and packaging data, statistics and mechanistic provenance..."):
            st.session_state.mechanistic_publication_export = (export_key, build_mechanistic_bundle(result, data_list))
    saved = st.session_state.get("mechanistic_publication_export")
    if saved and saved[0] == export_key:
        st.download_button("Download advanced publication package", saved[1], "MIXA_mechanistic_publication.zip", "application/zip", on_click="ignore")


def _repeat_figure(report):
    table = report["summary"]
    count = max(len(table), 1)
    columns = min(count, 3)
    rows = int(np.ceil(count / columns))
    titles = {"kon": r"$k_\mathrm{on}$", "koff": r"$k_\mathrm{off}$", "KD_nM": r"$K_\mathrm{D}$",
              "KD_overall_nM": r"$K_\mathrm{D}$ (overall)", "KD_first_step_nM": r"$K_\mathrm{D}$ (first step)",
              "kon2": r"$k_\mathrm{on,2}$", "koff2": r"$k_\mathrm{off,2}$"}
    units = {"M^-1 s^-1": r"$\mathrm{M}^{-1}\,\mathrm{s}^{-1}$", "s^-1": r"$\mathrm{s}^{-1}$",
             "response^-1 s^-1": r"$\mathrm{response}^{-1}\,\mathrm{s}^{-1}$"}
    with figure_style():
        fig, axes = plt.subplots(rows, columns, figsize=(max(3.5, columns * 2.3), 3.5 * rows), layout="constrained", squeeze=False)
        for ax, row in zip(axes.flat, table.itertuples()):
            values = report["estimates"].loc[(report["estimates"].parameter == row.parameter) &
                                             (report["estimates"].status == "Complete"), "value"].to_numpy()
            ax.scatter(np.linspace(-.06, .06, len(values)), values, s=18, color="#1c5d99", zorder=3)
            if np.isfinite(row.mean):
                ax.hlines(row.mean, -.15, .15, color="#d37522")
            if np.isfinite(row.sd):
                ax.vlines(0, row.mean - row.sd, row.mean + row.sd, color="#d37522")
            ax.set(xticks=[0], xticklabels=[f"n={row.n_independent}"], ylabel=units.get(row.unit, row.unit),
                   title=titles.get(row.parameter, row.parameter.replace("_", " ")), xlim=(-.3, .3))
            value = _format_parameter_value(row.mean, row.sd)[1]
            spread = "Mean +/- SD" if row.n_independent > 1 else "SD unavailable"
            ax.text(.5, -.17, value + "\n" + spread, ha="center", va="top", transform=ax.transAxes, fontsize=7)
            ax.ticklabel_format(axis="y", style="sci", scilimits=(-3, 4), useMathText=True)
            ax.tick_params(labelsize=7)
            ax.spines[["top", "right"]].set_visible(False)
        if table.empty:
            axes.flat[0].text(.5, .5, "No eligible repeat parameters", ha="center", transform=axes.flat[0].transAxes)
        for ax in list(axes.flat)[count:]:
            ax.set_visible(False)
    return fig


def build_mechanistic_bundle(result, data_list, dpi=300):
    from mixa_methods import write_methods_exports

    buffer = io.BytesIO()
    fig, source = _response_figure(result, data_list)
    diagnostics = _diagnostic_figure(result)
    figures = {"kinetic_curves": fig, "residual_diagnostics": diagnostics}
    report = result.get("repeat_report")
    if report is not None:
        figures["independent_repeat_parameters"] = _repeat_figure(report)
    points = []
    for curve in result["curves"]:
        table = pd.DataFrame(dict(filename=curve["filename"], repeat_id=curve["repeat_id"], concentration_nM=curve["concentration_nM"],
                                  time_s=curve["time"], analysis_response=curve["response"], fitted=curve["fitted"],
                                  used_for_fit=curve["fit_mask"], residual=curve["residuals"], baseline_offset=curve.get("baseline_offset", 0.)))
        for component, values in curve["components"].items():
            table[component] = values
        table["objective_residual"] = np.nan
        table.loc[curve["fit_mask"], "objective_residual"] = curve["whitened_residuals"]
        table["relative_noise_sd"] = curve.get("relative_sd", 1.)
        table["surface_id"] = curve.get("surface_id", "")
        points.append(table)
    try:
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            write_methods_exports(archive, {"Kinetic": result})
            settings = dict(result["recipe"]["windows"], include_map=result["recipe"]["include_map"])
            write_project_exports(archive, data_list, selection_settings={"Advanced kinetics": settings})
            archive.writestr("fit_recipe.json", json.dumps(json_safe(result["recipe"]), indent=2, allow_nan=False))
            metadata = {key: result[key] for key in ["model", "transport", "nonspecific", "scientific_warnings", "n_observations",
                        "n_parameters", "degrees_of_freedom", "rss", "information_criteria", "boundary_parameters", "timed_out",
                        "noise_model", "correlation_time", "uncertainty_method", "covariance_status", "scaled_jacobian_condition"]}
            metadata["affinity_interpretation"] = MODEL_NOTES[result["model"]]
            metadata["created_utc"] = result["created_utc"]
            metadata["optimizer_settings"] = result["optimizer_settings"]
            metadata["background_terms"] = result.get("background_terms", result["recipe"].get("background_terms", {}))
            metadata["baseline_uncertainty"] = result.get("baseline_uncertainty", {})
            metadata["input_uncertainty"] = result.get("input_uncertainty", {})
            metadata["precision_screen"] = result.get("precision_screen", {})
            if "qualification" in result:
                metadata["qualification"] = result["qualification"]
            metadata["software"] = {"MIXA": APP_VERSION, "Python": platform.python_version(),
                                    **{name: version(name) for name in ["numpy", "scipy", "pandas", "matplotlib", "streamlit"]}}
            metadata["assay_guidance"] = assay_guidance(result["recipe"]["assay"], result["model"])
            archive.writestr("scientific_diagnostics.json", json.dumps(json_safe(metadata), indent=2, allow_nan=False))
            archive.writestr("parameters.csv", result["parameter_table"].to_csv(index=False))
            archive.writestr("derived_affinities.csv", derived_affinities(result).to_csv(index=False))
            archive.writestr("multistart.csv", result["multistart"].to_csv(index=False))
            if result.get("assisted_review"):
                archive.writestr("assisted_model_review.json", json.dumps(json_safe(result["assisted_review"]), indent=2, allow_nan=False))
                archive.writestr("assisted_attempts.csv", pd.DataFrame([
                    {key: record.get(key) for key in ["label", "status", "aicc", "n_parameters", "error"]}
                    for record in result["assisted_review"]["attempts"]]).to_csv(index=False))
            write_diagnostic_tables(archive, "saved_fit_diagnostics", saved_fit_curves(result))
            archive.writestr("curve_points.csv", pd.concat(points, ignore_index=True).to_csv(index=False))
            archive.writestr("figure_source.csv", source.to_csv(index=False))
            archive.writestr("FIGURE_LEGENDS.txt", "Kinetic envelopes: sample SD across declared independent Repeat IDs after averaging technical files. Not model confidence bands. SD unavailable at n=1. Solid model segments use selected observations; dashed segments are predictions. Parameter errors in parameters.csv: " + result["uncertainty_method"] + ". Enabled measurement/calibration components are recorded in scientific_diagnostics.json; they are separate from independent-repeat SD. Component responses and surface concentration have different units, as named in curve_points.csv.\n" + MODEL_NOTES[result["model"]])
            if result["covariance"] is not None:
                archive.writestr("parameter_covariance.csv", pd.DataFrame(result["covariance"], index=result["free_parameters"],
                                                                          columns=result["free_parameters"]).to_csv())
            if result.get("conditional_on_baseline_covariance") is not None:
                archive.writestr("conditional_on_baseline_covariance.csv", pd.DataFrame(result["conditional_on_baseline_covariance"],
                    index=result["free_parameters"], columns=result["free_parameters"]).to_csv())
            archive.writestr("COVARIANCE_METHODS.txt", "parameter_covariance.csv is the primary physical-parameter covariance, when available. Method: " + result["uncertainty_method"] + ".\nconditional_on_baseline_covariance.csv, when available, is the original conditional covariance before baseline and optional input-budget propagation; it is diagnostic, not the primary displayed error.\nRows/columns name each free parameter and unit conventions are in parameters.csv. Neither covariance is independent-repeat SD or a model-selection-adjusted interval. See scientific_diagnostics.json for enabled components and failures.\n")
            if report is not None:
                for name, table in report.items():
                    archive.writestr(f"repeat_statistics/{name}.csv", table.to_csv(index=False))
                lines = ["Independent-repeat parameter results", "Arithmetic mean +/- sample SD; fixed assumptions are not independent estimates.",
                         "CI columns in summary.csv refer to the geometric mean, not the arithmetic mean."]
                for row in report["summary"].itertuples():
                    lines.append(f"{row.parameter} = {_format_parameter_value(row.mean, row.sd)[0]} {row.unit}; n={row.n_independent}")
                archive.writestr("repeat_statistics/PARAMETER_RESULTS.txt", "\n".join(lines) + "\n")
            if result.get("profile") is not None:
                archive.writestr("profile.csv", result["profile"]["table"].to_csv(index=False))
                archive.writestr("profile_notes.json", json.dumps(json_safe({k: v for k, v in result["profile"].items() if k != "table"}), indent=2))
            archive.writestr("analysis_code_sha256.json", json.dumps(source_code_sha256(), indent=2))
            for name, figure in figures.items():
                for fmt in ["png", "pdf", "svg"]:
                    payload = io.BytesIO()
                    figure.savefig(payload, format=fmt, dpi=dpi)
                    archive.writestr(f"figures/{name}.{fmt}", payload.getvalue())
    finally:
        for figure in figures.values():
            plt.close(figure)
    return buffer.getvalue()


def render_mechanistic_workspace(data_list, include_map, windows, *, model, transport, nonspecific,
                                 normalize, correct_drift, linear_nonspecific):
    if nonspecific and transport == "Quasi-steady 1:1 transport":
        st.error("Use two-compartment transport to combine transport with an independent nonspecific population.")
        return
    st.markdown("### Assay and Response")
    controls = st.columns(3)
    with controls[0]:
        technique = st.selectbox("Technique", ["Unspecified", "SPR", "BLI", "Other"], key="advanced_technique")
        immobilized = st.selectbox("Immobilized partner", ["Unspecified", "Receptor", "Ligand", "Antibody", "Other"], key="advanced_immobilized")
        analyte = st.selectbox("Soluble analyte", ["Unspecified", "Ligand", "Receptor", "Antibody", "Other"], key="advanced_analyte")
    with controls[1]:
        valency = st.selectbox("Soluble analyte valency", ["Unknown", "Monovalent", "Bivalent", "Multivalent"], key="advanced_valency")
        process = st.selectbox("Target process", ["Binding", "Antibody avidity", "Receptor dimerization"], key="advanced_process")
    with controls[2]:
        invert = st.checkbox("Invert response polarity", key="advanced_invert")
    assay = dict(technique=technique, immobilized=immobilized, analyte=analyte, analyte_valency=valency, target_process=process)
    st.caption(MODEL_NOTES[model])
    if transport == "Two-compartment transport":
        st.info("Supply or sensitivity-test response_to_M below. Its default is an assumed surface-volume/response conversion, not an instrument-specific calibration. Simultaneously freeing transport and binding parameters can leave intrinsic rates unresolved.")
    for message in assay_guidance(assay, model):
        st.info(message)
    nuisance = st.multiselect("Additional response terms", ["Offset", "Injection bulk response"], key="advanced_nuisance")
    try:
        curves = prepare_curves(data_list, include_map, windows, normalize)
    except ValueError as exc:
        st.error(str(exc))
        return
    if invert:
        for curve in curves:
            curve["response"] *= -1
            curve["response_sign"] *= -1
    response_scale = max(float(np.ptp(np.concatenate([c["response"][c["fit_mask"]] for c in curves]))), 1e-6)
    config_key = repr((model, transport, nonspecific, correct_drift, linear_nonspecific, tuple(nuisance), technique, st.session_state.get("prepared_signature")))
    store = st.session_state.setdefault("advanced_control_recipes", {})
    defaults = parameter_defaults(model, response_scale, transport, nonspecific, "Offset" in nuisance,
                                  correct_drift, "Injection bulk response" in nuisance, linear_nonspecific=linear_nonspecific)
    if linear_nonspecific:
        ns_scale = response_scale / max(max(c["concentration_M"] for c in curves) *
                                        max(c["off"] - c["on"] for c in curves), 1e-18)
        defaults = [replace(rule, lower=-4 * ns_scale, upper=4 * ns_scale) if rule.key == "ns_linear" else rule for rule in defaults]
    if technique == "BLI":
        defaults = [Parameter(**{**asdict(r), "scope": "Per curve"}) if r.key in {"Rmax", "Rmax2", "ns_Rmax"} else r for r in defaults]
    st.markdown("### Parameter Controls")
    st.caption("Linked parameters share one value. Fixed values are assumptions or independent measurements, not fitted estimates. Bounds and initial values use the units shown.")
    data = pd.DataFrame(store.get(config_key, [asdict(r) for r in defaults]))
    edited = st.data_editor(data, hide_index=True, key=f"advanced_parameters_{hashlib.sha256(config_key.encode()).hexdigest()[:12]}",
                            disabled=["key", "positive", "unit"],
                            column_config={"scope": st.column_config.SelectboxColumn("Linkage", options=SCOPES),
                                           "key": "Parameter", "initial": "Initial / fixed value", "lower": "Lower bound", "upper": "Upper bound"},
                            use_container_width=True)
    store[config_key] = edited.to_dict("records")
    try:
        rules = [Parameter(**row) for row in edited.to_dict("records")]
        validate_parameters(rules, defaults)
    except (TypeError, ValueError) as exc:
        st.error(str(exc))
        return
    with st.expander("Surface linkage and relative trace noise scales"):
        trace_defaults = [dict(filename=c["filename"], concentration_nM=c["concentration_nM"],
                              surface_id=f"{c['filename']}::{c['concentration_nM']:g}", relative_sd=1.) for c in curves]
        trace_key = hashlib.sha256(repr((st.session_state.get("prepared_signature"), trace_defaults)).encode()).hexdigest()[:12]
        trace_store = st.session_state.setdefault("advanced_trace_recipes", {})
        trace_table = pd.DataFrame(trace_store.get(trace_key, trace_defaults))
        trace_table = st.data_editor(trace_table, key=f"advanced_trace_controls_{trace_key}", hide_index=True, disabled=["filename", "concentration_nM"],
                                     column_config={"relative_sd": st.column_config.NumberColumn("Fixed relative noise SD", min_value=1e-8)})
        trace_store[trace_key] = trace_table.to_dict("records")
        st.caption("For Per surface linkage, assign the same Surface ID only to traces that share that surface. Relative SD=1 gives unweighted observations; these scales do not create independent measurements.")
    for curve, row in zip(curves, trace_table.to_dict("records")):
        curve.update(surface_id=row["surface_id"], relative_sd=float(row["relative_sd"]))
    overrides = {}
    with st.expander("Individual linked-group values and bounds"):
        if st.checkbox("Override individual parameter groups", key="advanced_override"):
            expanded = expand_parameter_controls(curves, rules)
            instance_key = hashlib.sha256(repr((config_key, expanded.to_dict("records"))).encode()).hexdigest()[:12]
            instance_store = st.session_state.setdefault("advanced_instance_recipes", {})
            expanded = pd.DataFrame(instance_store.get(instance_key, expanded.to_dict("records")))
            expanded = st.data_editor(expanded, hide_index=True, key=f"advanced_instance_controls_{instance_key}", disabled=["instance", "key", "scope", "positive", "unit"])
            instance_store[instance_key] = expanded.to_dict("records")
            overrides = {row["instance"]: {key: row[key] for key in ["initial", "lower", "upper", "fixed"]} for row in expanded.to_dict("records")}
    st.markdown("### Noise and Solver")
    left, middle, right = st.columns(3)
    with left:
        noise = st.selectbox("Residual model", ["Independent errors", "Fixed OU correlation time"], key="advanced_noise")
        tau = st.number_input("Correlation time (s)", min_value=.001, value=_initial_value("advanced_tau", 10.), key="advanced_tau") if noise != "Independent errors" else 0.
        if tau:
            st.caption("Supply a justified, prespecified noise correlation time. Errors remain conditional on it; it is not estimated here.")
    with middle:
        objective = st.selectbox("Objective", ["Least squares", "Soft-L1 sensitivity fit"], key="advanced_objective")
        f_scale = st.number_input("Soft-L1 scale (objective residual units)", min_value=1e-6, value=_initial_value("advanced_loss_scale", 1.), key="advanced_loss_scale") if objective != "Least squares" else 1.
        starts = st.number_input("Multistart attempts", min_value=1, max_value=30, value=_initial_value("advanced_starts", 3), key="advanced_starts")
        search = st.selectbox("Start search", ["Local + broad exploration", "Local refinement"], key="advanced_start_search")
    with right:
        runtime = st.number_input("Fit runtime limit (s)", min_value=10., max_value=1200., value=_initial_value("advanced_runtime", 120.), key="advanced_runtime")
        evaluations = st.number_input("Maximum evaluations per start", min_value=50, max_value=20000, value=_initial_value("advanced_nfev", 1200), key="advanced_nfev")
    if any(value is None for value in [tau, f_scale, starts, runtime, evaluations]):
        st.error("Enter all noise and solver control values before fitting.")
        return
    recipe = dict(version=APP_VERSION, assay=assay, model=model, transport=transport, nonspecific=nonspecific,
                  background_terms=dict(linear_drift=correct_drift, linear_nonspecific=linear_nonspecific,
                                        reversible_nonspecific=nonspecific, constant_offset="Offset" in nuisance,
                                        injection_bulk_response="Injection bulk response" in nuisance),
                  windows=windows, normalize=normalize, invert=invert, parameters=[asdict(r) for r in rules],
                  instance_controls=overrides, trace_controls=trace_table.to_dict("records"), correlation_time=tau,
                  loss="linear" if objective == "Least squares" else "soft_l1", f_scale=f_scale,
                  starts=int(starts), max_nfev=int(evaluations), runtime_s=runtime,
                  start_strategy="broad" if search == "Local + broad exploration" else "local",
                  input_uncertainty=curves[0].get("input_uncertainty_options", {}),
                  include_map={key: sorted(values) for key, values in include_map.items()})
    signature = hashlib.sha256(json.dumps(json_safe(recipe), sort_keys=True).encode()).hexdigest()
    if st.button("Run advanced global fit", type="primary", key="advanced_run"):
        try:
            with st.spinner("Fitting selected observations across linked parameter groups..."):
                result = fit_mechanism(curves, model, rules, transport, nonspecific, starts=int(starts), runtime_s=runtime,
                                       max_nfev=int(evaluations), correlation_time=tau, loss=recipe["loss"], f_scale=f_scale,
                                       instance_controls=overrides, start_strategy=recipe["start_strategy"])
            result.update(recipe=recipe, signature=signature, created_utc=datetime.now(timezone.utc).isoformat())
            st.session_state.latest_mechanistic_results = result
            st.session_state.latest_kinetic_results = None
            st.session_state.publication_report = None
            st.session_state.pop("advanced_export", None)
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            st.error(str(exc))
    with st.expander("Single-Cycle Kinetics (SCK) non-regenerated step schedule"):
        st.caption(
            "Fit sequential non-regenerated analyte injections on continuous sensorgrams (Karlsson et al., 2006). "
            "Surface state is propagated continuously across every step injection and intervening buffer period."
        )
        t_min_sck = float(min(c["time"][0] for c in curves))
        t_max_sck = float(max(c["time"][-1] for c in curves))
        span_sck = max(t_max_sck - t_min_sck, 10.0)
        default_concs = sorted({float(c["concentration_nM"]) for c in curves})[:5] or [1.0, 3.0, 10.0, 30.0, 100.0]
        n_steps_default = len(default_concs)
        step_block = span_sck / max(n_steps_default + 1, 2)
        sck_default_rows = [
            dict(
                step=i + 1,
                concentration_nM=float(c_val),
                on=round(t_min_sck + i * step_block, 2),
                off=round(t_min_sck + (i + 0.65) * step_block, 2),
            )
            for i, c_val in enumerate(default_concs)
        ]
        sck_df = st.data_editor(
            pd.DataFrame(st.session_state.get("advanced_sck_schedule", sck_default_rows)),
            num_rows="dynamic",
            hide_index=True,
            key="advanced_sck_editor",
            use_container_width=True,
        )
        st.session_state["advanced_sck_schedule"] = sck_df.to_dict("records")
        if st.button("Run single-cycle global fit", key="advanced_sck_run"):
            try:
                steps_list = [
                    dict(
                        concentration_nM=float(r["concentration_nM"]),
                        concentration_M=float(r["concentration_nM"]) * 1e-9,
                        on=float(r["on"]),
                        off=float(r["off"]),
                    )
                    for r in sck_df.to_dict("records")
                    if pd.notna(r.get("concentration_nM")) and pd.notna(r.get("on")) and pd.notna(r.get("off"))
                ]
                sck_traces = [
                    dict(
                        filename=c["filename"],
                        repeat_id=c["repeat_id"],
                        surface_id=c.get("surface_id", c["filename"]),
                        time=c["time"],
                        response=c["response"],
                        fit_mask=c["fit_mask"],
                        steps=steps_list,
                        relative_sd=c.get("relative_sd", 1.0),
                    )
                    for c in curves
                ]
                sck_recipe = {**recipe, "single_cycle": True, "single_cycle_steps": steps_list}
                sck_sig = hashlib.sha256(json.dumps(json_safe(sck_recipe), sort_keys=True).encode()).hexdigest()
                with st.spinner("Fitting single-cycle kinetics across sequential injections..."):
                    sck_res = fit_single_cycle_kinetics(
                        sck_traces, model=model, rules=rules, transport=transport, nonspecific=nonspecific,
                        starts=int(starts), max_nfev=int(evaluations), runtime_s=runtime,
                        correlation_time=tau, loss=recipe["loss"], f_scale=f_scale,
                        instance_controls=overrides, start_strategy=recipe["start_strategy"],
                    )
                sck_res.update(recipe=sck_recipe, signature=sck_sig, created_utc=datetime.now(timezone.utc).isoformat())
                st.session_state.latest_mechanistic_results = sck_res
                st.session_state.latest_kinetic_results = None
                st.session_state.publication_report = None
                st.session_state.pop("advanced_export", None)
            except (ValueError, RuntimeError, FloatingPointError) as exc:
                st.error(str(exc))
    result = st.session_state.get("latest_mechanistic_results")
    if not result:
        return
    render_mechanistic_results(result, data_list, signature=signature, runtime=runtime, starts=starts)


def render_mechanistic_results(result, data_list, *, signature, runtime=120., starts=3):
    """Use the same saved-fit panels for manual and assisted global analyses."""
    if st.session_state.get("advanced_export_signature") != result["signature"]:
        st.session_state.pop("advanced_export", None)
    if result["signature"] != signature:
        st.warning("Controls have changed. Results and exports below still use the saved completed run.")
    st.markdown("### Fit Results")
    st.caption(f"Saved model: {MODEL_LABELS[result['model']]} | Surface transport: {result['transport']} | Run: {result['created_utc']}")
    for column, label, value in zip(st.columns(4), ["Selected observations", "Free parameters", "Residual degrees of freedom", "Objective RSS"],
                                    [result["n_observations"], result["n_parameters"], result["degrees_of_freedom"], f"{result['rss']:.4g}"]):
        column.metric(label, value)
    for message in result["scientific_warnings"]:
        st.warning(message)
    tabs = st.tabs(["Curves", "Parameters", "Components", "Diagnostics", "Identifiability", "Robustness & intervals", "Independent repeats", "Export"])
    with tabs[0]:
        fig, _ = _response_figure(result, data_list)
        show_figure(fig)
        plt.close(fig)
        st.caption("Points/envelopes: independent-repeat mean and sample SD where available. Solid: fitted intervals; dashed: predictions outside them. The saved model is not a refit to the mean.")
    with tabs[1]:
        st.caption(result["uncertainty_method"] + ". Fixed parameters have no estimated error; this is not independent-repeat SD.")
        st.dataframe(result["parameter_table"].drop(columns=["conditional_on_baseline_se"], errors="ignore"), hide_index=True)
        st.dataframe(derived_affinities(result), hide_index=True)
    with tabs[2]:
        curve_index = st.selectbox("Inspect curve", range(len(result["curves"])), format_func=lambda i: f"{result['curves'][i]['filename']} | {result['curves'][i]['concentration_nM']:g} nM")
        curve = result["curves"][curve_index]
        with figure_style():
            fig, ax = plt.subplots(figsize=(7.2, 3.6), layout="constrained")
            for name, values in curve["components"].items():
                if name != "surface_concentration_M":
                    ax.plot(curve["time"], values, label=name)
            ax.plot(curve["time"], curve["fitted"], "k--", linewidth=1, label="Total prediction")
            ax.set(xlabel="Time (s)", ylabel="Response (analysis input units)")
            ax.spines[["top", "right"]].set_visible(False)
            ax.legend(fontsize=7)
            show_figure(fig)
            plt.close(fig)
        if "surface_concentration_M" in curve["components"]:
            st.line_chart(pd.DataFrame({"time_s": curve["time"], "surface_concentration_M": curve["components"]["surface_concentration_M"]}).set_index("time_s"))
    with tabs[3]:
        render_saved_fit_diagnostics(result, key="mechanistic")
        st.markdown("#### Optimization and Model Adequacy")
        st.write("Covariance status: " + result["covariance_status"])
        st.caption(f"Free parameters at bounds: {', '.join(result['boundary_parameters']) or 'None'} | Scaled-Jacobian condition: {result['scaled_jacobian_condition']:.3g}")
        st.dataframe(result["multistart"], hide_index=True)
        st.dataframe(pd.DataFrame([result["information_criteria"]]), hide_index=True)
        st.caption("Information criteria require the same observations and a comparable likelihood. Agreement between optimizer starts is not evidence of model validity or parameter identifiability.")
    with tabs[4]:
        st.write("Covariance status: " + result["covariance_status"])
        st.write(f"Scaled-Jacobian condition: {result['scaled_jacobian_condition']:.3g}")
        if result["covariance"] is not None:
            covariance = result["covariance"]
            scale = np.sqrt(np.maximum(np.diag(covariance), 0.))
            correlation = np.divide(covariance, np.outer(scale, scale), out=np.full_like(covariance, np.nan), where=np.outer(scale, scale) > 0)
            st.dataframe(pd.DataFrame(correlation, index=result["free_parameters"], columns=result["free_parameters"]))
        positive = {row["key"] for row in result["parameter_controls"] if row["positive"]}
        profile_options = [key for key in result["free_parameters"] if key.split("::", 1)[0] in positive]
        if profile_options and result["loss"] == "linear":
            if st.session_state.get("advanced_profile_parameter") not in profile_options:
                st.session_state.pop("advanced_profile_parameter", None)
            chosen = st.selectbox("Parameter profile", profile_options, key="advanced_profile_parameter")
            if st.button("Calculate exploratory profile", key="advanced_profile_run"):
                try:
                    with st.spinner("Refitting nuisance parameters on a bounded profile grid..."):
                        result["profile"] = profile_parameter(result, result["curves"], chosen, runtime_s=runtime)
                    st.session_state.pop("advanced_export", None)
                except (ValueError, RuntimeError) as exc:
                    st.error(str(exc))
        if result.get("profile") is not None:
            profile = result["profile"]
            st.caption(profile["interpretation"])
            with figure_style():
                fig, ax = plt.subplots(figsize=(6.5, 3.4), layout="constrained")
                ax.semilogx(profile["table"].value, profile["table"].rss, "o-")
                ax.axhline(profile["cutoff"], color="#d37522", linestyle="--", label="Approximate 95% RSS threshold")
                ax.set(xlabel=profile["instance"], ylabel="Objective RSS")
                ax.legend()
                show_figure(fig)
                plt.close(fig)
            st.dataframe(profile["table"], hide_index=True)
    with tabs[5]:
        from mixa_inference_ui import render_refit_review

        render_refit_review(result, "mechanistic_review")
    with tabs[6]:
        st.caption("Refit each declared independent Repeat ID. Technical files and concentrations do not increase n. Heterogeneous populations are ordered by fitted affinity, not assigned a biological identity.")
        unqualified = ("qualification" in result and not result["qualification"]["eligible"]) or (
            "assisted_review" in result and result["assisted_review"]["recommended_index"] is None)
        if unqualified:
            st.warning("This assisted fit is diagnostic only. Resolve its qualification failures before routine repeat summaries.")
        if st.button("Refit independent repeats", key="advanced_repeat_run", disabled=unqualified):
            with st.spinner("Refitting independent experiments with the saved mechanism and controls..."):
                result["repeat_report"] = refit_independent_repeats(result["curves"], result, starts=min(int(starts), 3), runtime_s=runtime)
            st.session_state.pop("advanced_export", None)
        if result.get("repeat_report") is not None:
            report = result["repeat_report"]
            st.dataframe(report["status"], hide_index=True)
            summary = report["summary"].copy()
            if not summary.empty:
                summary["result_mean_sd"] = [_format_parameter_value(row.mean, row.sd)[0] for row in summary.itertuples()]
                st.dataframe(summary, hide_index=True)
                fig = _repeat_figure(report)
                show_figure(fig)
                plt.close(fig)
    with tabs[7]:
        st.download_button("Download saved fit recipe", json.dumps(json_safe(result["recipe"]), indent=2), "MIXA_mechanistic_recipe.json", "application/json", on_click="ignore")
        if st.button("Prepare advanced analysis package", key="advanced_prepare_export"):
            with st.spinner("Rendering figures and packaging measured data, parameters and diagnostics..."):
                st.session_state.advanced_export = build_mechanistic_bundle(result, data_list)
                st.session_state.advanced_export_signature = result["signature"]
        if st.session_state.get("advanced_export"):
            st.download_button("Download advanced analysis package", st.session_state.advanced_export, "MIXA_mechanistic_analysis.zip", "application/zip", on_click="ignore")
        with st.expander("Conditional capacity / stoichiometry calculation"):
            st.caption("Requires measured ligand loading, molecular weights and a justified response-per-mass calibration. Without an independently known active fraction, only apparent capacity is calculated. This is not a measured receptor dimer stoichiometry.")
            a, b = st.columns(2)
            rmax = a.number_input("Analyte saturation response", min_value=1e-9, value=100., key="advanced_stoich_rmax")
            loading = a.number_input("Immobilized ligand loading response", min_value=1e-9, value=1000., key="advanced_stoich_loading")
            mw_ligand = a.number_input("Immobilized partner MW (Da)", min_value=1., value=50000., key="advanced_stoich_mwl")
            mw_analyte = b.number_input("Soluble analyte MW (Da)", min_value=1., value=150000., key="advanced_stoich_mwa")
            ratio = b.number_input("Analyte/ligand response-per-mass ratio", min_value=1e-9, value=1., key="advanced_stoich_ratio")
            confirmed = b.checkbox("Calibration ratio is independently justified", key="advanced_stoich_confirmed")
            active = b.number_input("Independently known active fraction (0 = unknown)", min_value=0., max_value=1., value=0., key="advanced_stoich_active")
            if confirmed:
                st.json(stoichiometry_from_capacity(rmax, loading, mw_ligand, mw_analyte, ratio, active or None))
