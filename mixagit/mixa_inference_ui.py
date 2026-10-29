"""On-demand robustness review, available for standard and advanced kinetic fits."""

import io
import json
import hashlib
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

from mixa_figures import figure_style
from mixa_science import json_safe
from mixa_plotting import show_figure
from mixa_inference_figures import calibrated_figure, joint_curve_figure, joint_figure, sampling_figure, write_review_figures
from mixa_inference import (OMISSION_UNITS, adaptive_profile, estimates, omission_review, refit_sampling,
                            review_problem, write_review_exports)


def _download_figure(fig, name, key):
    show_figure(fig)
    for column, fmt in zip(st.columns(3), ["pdf", "svg", "png"]):
        payload = io.BytesIO()
        fig.savefig(payload, format=fmt, dpi=600)
        column.download_button(f"Download {fmt.upper()}", payload.getvalue(), f"MIXA_{name}.{fmt}",
                               {"pdf": "application/pdf", "svg": "image/svg+xml", "png": "image/png"}[fmt],
                               key=f"{key}_{fmt}", on_click="ignore")
    plt.close(fig)


def _changed():
    for key in ["advanced_export", "assisted_publication_export", "publication_report"]:
        st.session_state.pop(key, None)


def render_refit_review(result, key):
    st.markdown("### Robustness & Intervals")
    try:
        problem = review_problem(result)
    except ValueError as exc:
        st.info(str(exc))
        return
    review = result.setdefault("inference_review", {})
    st.caption("Review uses the saved model, bounds, corrections and selected observations. It does not change the main fit or exclude data.")
    profiles_tab, calibrated_tab, omission_tab, sampling_tab, joint_tab, residual_tab = st.tabs([
        "Adaptive intervals", "Calibrated intervals", "Data influence", "Nonlinear uncertainty", "Joint repeats", "Joint residual check"])
    with profiles_tab:
        choices = [name for name, rule in problem["controls"].items() if not rule["fixed"]]
        widget = f"{key}_profile_target"
        if st.session_state.get(widget) not in choices:
            st.session_state.pop(widget, None)
        target = st.selectbox("Profile parameter", choices, key=widget)
        profile_time = st.number_input("Profile runtime limit (s)", 10., 1800., 120., 10., key=f"{key}_profile_time")
        if st.button("Calculate adaptive interval", key=f"{key}_profile_run"):
            try:
                with st.spinner("Searching for profile crossings and refitting nuisance parameters..."):
                    payload = adaptive_profile(problem, target, runtime_s=profile_time)
                review.setdefault("profiles", {})[target] = payload
                _changed()
            except (ValueError, RuntimeError) as exc:
                st.error(str(exc))
        payload = review.get("profiles", {}).get(target)
        if payload:
            info = payload["metadata"]
            if info["better_optimum_found"]:
                st.warning("A lower objective was found. Refit the main analysis with a broader start search; this interval is withheld.")
            left, right = st.columns(2)
            for col, side in [(left, "lower"), (right, "upper")]:
                value = info[side]
                col.metric(f"95% {side} limit", f"{value:.5g}" if value is not None else "Unresolved")
                col.caption(info[side+"_status"])
            with figure_style():
                fig, ax = plt.subplots(figsize=(6.6, 3.5), layout="constrained")
                table = payload["table"]
                complete = table.status.isin(["Converged", "Saved optimum"])
                ax.plot(table.loc[complete, "value"], table.loc[complete, "likelihood_ratio"], "o", color="#1c5d99", ms=3)
                ax.axhline(info["threshold"], color="#d37522", ls="--", label="Approximate 95% threshold")
                ax.set(xlabel=target, ylabel="Profile likelihood ratio")
                ax.set_ylim(-.05*info["threshold"], 2*info["threshold"])
                if problem["controls"][target]["positive"]:
                    ax.set_xscale("log")
                ax.spines[["top", "right"]].set_visible(False)
                ax.legend(fontsize=8)
                _download_figure(fig, "adaptive_profile", f"{key}_profile_figure")
            st.caption("Conditional on saved preprocessing, concentrations and noise model; the raw-input/calibration budget is not included in these profiles. Use Nonlinear uncertainty for enabled input budgets. Open bounds and incomplete searches are not finite interval limits.")
            with st.expander("Profile evaluations and method"):
                st.dataframe(payload["table"], hide_index=True)
                st.write(info)
    with calibrated_tab:
        from mixa_calibration import calibrated_profile

        table = estimates(problem, {k: r["value"] for k, r in problem["controls"].items()})
        table = table.loc[table.estimated & ~table.label_exchangeable]
        table = table.loc[~table.estimate.str.startswith(("KD_lower_population", "KD_higher_population"))]
        choices = table.estimate.tolist()
        if choices:
            kd_choices = [c for c in choices if c.startswith("KD_")]
            target = st.selectbox("Calibrate parameter or affinity", choices, index=choices.index(kd_choices[0]) if kd_choices else 0,
                                  key=f"{key}_calibration_target")
            left, right = st.columns(2)
            draws = left.number_input("Calibration experiments", 200, 5000, 1000, 100, key=f"{key}_calibration_draws")
            runtime = right.number_input("Calibration runtime limit (s)", 30., 7200., 600., 30., key=f"{key}_calibration_time")
            st.caption("Target-specific simulated critical values include the saved measured-baseline and enabled input budgets. Derived KD is constrained exactly while nuisance parameters are refitted. Intervals require at least 200 complete experiments and 95% completion.")
            if st.button("Calculate calibrated interval", key=f"{key}_calibration_run"):
                try:
                    with st.spinner("Calibrating the fit statistic with independent simulated refits..."):
                        payload = calibrated_profile(problem, target, draws=int(draws), runtime_s=runtime)
                    review.setdefault("calibration", {})[target] = payload
                    _changed()
                except (ValueError, RuntimeError) as exc:
                    st.error(str(exc))
            payload = review.get("calibration", {}).get(target)
            if payload:
                info = payload["metadata"]
                st.metric("Complete calibration experiments", f"{info['complete_draws']} / {info['requested_draws']}")
                left, right = st.columns(2)
                for col, side in [(left, "lower"), (right, "upper")]:
                    col.metric(f"95% {side} limit", f"{info[side]:.5g}" if info[side] is not None else "Unresolved")
                    col.caption(info[side+"_status"])
                _download_figure(calibrated_figure(payload), "calibrated_profile", f"{key}_calibration_figure")
                with st.expander("Calibration assumptions, critical-value precision and all refits"):
                    st.write(info)
                    st.dataframe(payload["calibration_runs"], hide_index=True)
                    st.dataframe(payload["profile"], hide_index=True)
        else:
            st.info("No nonfixed, label-resolved target is available for calibration.")
    with omission_tab:
        unit = st.selectbox("Omit one", OMISSION_UNITS, key=f"{key}_omission_unit")
        omission_time = st.number_input("Omission review runtime limit (s)", 10., 1800., 120., 10., key=f"{key}_omission_time")
        if st.button("Run omission refits", key=f"{key}_omission_run"):
            with st.spinner("Refitting the remaining data and testing held-out predictions..."):
                payload = omission_review(problem, unit, runtime_s=omission_time)
            review.setdefault("omissions", {})[unit] = payload
            _changed()
        payload = review.get("omissions", {}).get(unit)
        if payload:
            columns = ["omitted", "status", "training_observations", "held_out_observations", "scored_observations",
                       "held_out_rmse", "held_out_bias", "prediction_status", "boundaries"]
            st.dataframe(payload["cases"].reindex(columns=columns), hide_index=True)
            table = payload["shifts"]
            if not table.empty:
                options = list(dict.fromkeys(table.estimate))
                selected = st.selectbox("Inspect parameter stability", options, key=f"{key}_influence_parameter")
                subset = table.loc[table.estimate == selected]
                if subset.label_exchangeable.any():
                    st.info("Component labels are exchangeable. Use the ordered population affinities for label-invariant comparisons.")
                else:
                    with figure_style():
                        fig, ax = plt.subplots(figsize=(6.6, max(2.5, len(subset)*.35)), layout="constrained")
                        ax.scatter(subset.change_percent, range(len(subset)), color="#1c5d99", s=20)
                        ax.axvline(0., color="#d37522", lw=1)
                        ax.set(yticks=range(len(subset)), yticklabels=subset.omitted, xlabel="Change from full-data estimate (%)")
                        ax.spines[["top", "right"]].set_visible(False)
                        _download_figure(fig, "omission_stability", f"{key}_influence_figure")
                st.dataframe(subset.drop(columns=["label_exchangeable", "label"], errors="ignore"), hide_index=True)
            points = payload["held_out_points"]
            if not points.empty:
                case = st.selectbox("Inspect held-out prediction", list(dict.fromkeys(points.omitted)), key=f"{key}_held_out_case")
                with figure_style():
                    fig, ax = plt.subplots(figsize=(6.6, 3.5), layout="constrained")
                    for (filename, concentration), group in points.loc[points.omitted == case].groupby(["filename", "concentration_nM"], sort=False):
                        line, = ax.plot(group.time_s, group.predicted, lw=1.1, label=f"{filename} | {concentration:g} nM")
                        ax.scatter(group.time_s, group.observed, s=4, color=line.get_color(), alpha=.5)
                    ax.set(xlabel="Time (s)", ylabel="Response (analysis input units)")
                    ax.spines[["top", "right"]].set_visible(False)
                    ax.legend(fontsize=6)
                    _download_figure(fig, "held_out_prediction", f"{key}_held_out_figure")
            st.caption("Prediction is withheld when a free local capacity or response term has no training data. Parameter shifts are sensitivity diagnostics, not automatic exclusion rules or independent validation of shared controls.")
    with sampling_tab:
        left, right = st.columns(2)
        draws = left.number_input("Requested simulation refits", 20, 5000, 400, 20, key=f"{key}_draws")
        runtime = right.number_input("Simulation runtime limit (s)", 10., 7200., 300., 10., key=f"{key}_sampling_time")
        seed = left.number_input("Simulation seed", 0, 2147483647, 624091, key=f"{key}_sampling_seed")
        starts = right.number_input("Starts per simulation refit", 1, 10, 2, key=f"{key}_sampling_starts")
        st.caption("At least 200 complete refits and 95% completion are required for intervals. Saved raw-control and concentration budgets are included when enabled. Simulation spread is not independent-repeat SD.")
        if st.button("Run nonlinear uncertainty", key=f"{key}_sampling_run"):
            try:
                with st.spinner("Simulating measurements and refitting every parameter and derived affinity..."):
                    payload = refit_sampling(problem, draws=int(draws), starts=int(starts), runtime_s=runtime, seed=int(seed))
                review["sampling"] = payload
                _changed()
            except (ValueError, RuntimeError) as exc:
                st.error(str(exc))
        payload = review.get("sampling")
        if payload:
            info = payload["metadata"]
            st.metric("Complete simulation refits", f"{info['complete_draws']} / {info['requested_draws']}")
            table = payload["summary"]
            st.dataframe(table[["estimate", "point_estimate", "interval95_low", "interval95_high", "simulation_sd", "status"]], hide_index=True)
            _download_figure(sampling_figure(payload, result.get("model", "langmuir")), "nonlinear_parameter_intervals", f"{key}_sampling_figure")
            st.caption("Blue: saved estimate. Orange: nonlinear-refit 95% interval, not independent-repeat SD. Unresolved intervals are not drawn as zero-width errors.")
            with st.expander("Simulation assumptions, failures and all draws"):
                st.write(info)
                st.dataframe(payload["runs"], hide_index=True)
                st.dataframe(payload["samples"], hide_index=True)
    with joint_tab:
        from dataclasses import asdict
        from mixa_joint import JointPriors, fit_joint

        repeats = len({str(c["repeat_id"]) for c in problem["curves"]})
        eligible = problem["model"] == "langmuir" and problem["transport"] == "None" and not problem["nonspecific"] and repeats >= 3
        st.markdown("#### Bayesian Joint 1:1 Analysis")
        st.caption("Fits the responses jointly with correlated lognormal repeat rates and the enabled raw-source/concentration budgets. Population credible intervals, between-repeat spread and new-repeat prediction are separate outputs. Original fits and independent-repeat SD are unchanged.")
        if not eligible:
            st.info("Requires at least three independent Repeat IDs and a saved 1:1 fit without transport or a second binding population.")
        with st.expander("Joint-model priors and response units"):
            defaults, selected_priors = asdict(JointPriors()), {}
            labels = dict(kon_median="Prior population kon median (M^-1 s^-1)", koff_median="Prior population koff median (s^-1)",
                population_log_sd="Prior population mean log-scale SD", between_log_sd_scale="Half-normal between-repeat log-SD scale",
                correlation_lkj_shape="LKJ correlation prior shape", capacity_median="Prior Rmax median (input response units)",
                capacity_log_sd="Prior Rmax log-scale SD", baseline_sd="Baseline prior SD (input response units)",
                drift_sd="Drift prior SD (response/s)", linear_background_sd="Linear background prior SD (response/M/s)",
                bulk_sd="Bulk response prior SD (response/M)", noise_scale="Half-t(4) measurement-noise prior scale")
            for name, default in defaults.items():
                selected_priors[name] = st.number_input(labels[name], min_value=1e-12, value=float(default), format="%.6g", key=f"{key}_joint_prior_{name}")
            st.caption("Priors are explicit assumptions in this separate Bayesian model. Gaussian baseline/correction priors replace median fixing and correction bounds. Rmax linkage and saved rate/capacity bounds are retained. Check prior sensitivity for small repeat counts.")
        left, right = st.columns(2)
        warmup = left.number_input("Warmup per chain", 100, 10000, 2000, 500, key=f"{key}_joint_warmup")
        draws = right.number_input("Retained draws per chain", 100, 20000, 8000, 500, key=f"{key}_joint_draws")
        runtime = left.number_input("Joint runtime limit (s)", 30., 7200., 600., 30., key=f"{key}_joint_time")
        baseline = right.checkbox("Include measured pre-association baseline", value=True, key=f"{key}_joint_baseline")
        if st.button("Run joint repeat inference", disabled=not eligible, key=f"{key}_joint_run"):
            try:
                with st.spinner("Sampling four independent joint chains with explicit priors..."):
                    payload = fit_joint(result, priors=JointPriors(**selected_priors), warmup=int(warmup),
                                        draws=int(draws), runtime_s=runtime, include_baseline=baseline)
                run_id = hashlib.sha256(json.dumps(payload["metadata"]["priors"], sort_keys=True).encode()+
                    json.dumps(payload["metadata"]["settings"], sort_keys=True).encode()).hexdigest()[:12]
                review.setdefault("joint", {})[run_id] = payload
                st.session_state[f"{key}_joint_selected_run"] = run_id
                _changed()
            except (ValueError, RuntimeError, np.linalg.LinAlgError) as exc:
                st.error(str(exc))
        saved_joint = review.get("joint", {})
        selected_run = None
        if saved_joint:
            choices = list(saved_joint)
            selected_run = st.selectbox("Saved joint analysis", choices, key=f"{key}_joint_selected_run",
                index=None if f"{key}_joint_selected_run" in st.session_state else 0,
                format_func=lambda run: f"Run {choices.index(run)+1} | between-repeat prior scale {saved_joint[run]['metadata']['priors']['between_log_sd_scale']:g} | {saved_joint[run]['metadata']['settings']['draws']} draws/chain")
        payload = saved_joint.get(selected_run)
        if payload:
            complete_chains = int((payload["chains"].status == "Complete").sum())
            st.caption(f"{len(payload['metadata']['repeat_ids'])} independent repeats | {complete_chains}/{len(payload['chains'])} chains complete")
            if not payload["metadata"].get("joint_nuisance_resolution"):
                st.warning("Joint MCMC resolution is insufficient. Routine credible intervals are withheld; inspect all chains and diagnostics or increase the sampling budget.")
            table = payload["summary"]
            if not table.empty:
                population = table.loc[table.estimate.isin(["population_median_kon", "population_median_koff", "population_median_KD_nM"])]
                population = population.set_index("estimate")
                for col, parameter, label, unit in zip(st.columns(3), ["kon", "koff", "KD_nM"],
                        ["Population k_on", "Population k_off", "Population K_D"], ["M^-1 s^-1", "s^-1", "nM"]):
                    row = population.loc[f"population_median_{parameter}"]
                    col.metric(f"{label} ({unit})", f"{row.posterior_median:.4g}" if row.status == "Available" else "Unresolved")
                    if row.status == "Available":
                        col.caption(f"95% credible interval: {row.interval95_low:.4g} to {row.interval95_high:.4g}")
                _download_figure(joint_figure(payload), "joint_population_intervals", f"{key}_joint_figure")
                if not payload["curves"].empty:
                    filename = st.selectbox("Joint curve dataset", list(dict.fromkeys(payload["curves"].filename)), key=f"{key}_joint_curve_file")
                    _download_figure(joint_curve_figure(payload, filename), "joint_curves", f"{key}_joint_curve_figure")
                    st.caption("Points: selected corrected measurements. Line and shaded band: joint posterior median and pointwise 95% mean-curve credible interval, including uncertain baseline/corrections. This band is not across-repeat SD. Trimmed gaps are not joined.")
                    check = payload["metadata"]["posterior_predictive"]
                    st.caption(f"Posterior predictive discrepancy tail fraction: {check['posterior_predictive_tail_fraction']:.3f} ({check['draws']} draws). Descriptive check, not a selection p-value.")
                with st.expander("Repeat estimates, between-repeat spread and new-repeat prediction"):
                    st.dataframe(table, hide_index=True)
            st.caption("Orange intervals are 95% posterior credible intervals, not independent-repeat mean +/- SD. New-repeat intervals additionally include between-repeat variation. Source SD ratios and OU times remain declared inputs.")
            with st.expander("Joint likelihood, convergence diagnostics and posterior draws"):
                st.write(payload["metadata"])
                st.dataframe(payload["chains"], hide_index=True)
                st.dataframe(payload["observations"], hide_index=True)
                st.dataframe(payload["diagnostics"], hide_index=True)
                st.dataframe(payload["samples"], hide_index=True)
            if len(saved_joint) > 1:
                comparisons = []
                for run_id, run in saved_joint.items():
                    frame = run["summary"]
                    if not frame.empty:
                        subset = frame.loc[frame.estimate.str.startswith("population_median_")].copy()
                        subset.insert(0, "joint_run", run_id)
                        comparisons.append(subset)
                if comparisons:
                    with st.expander("Compare saved priors and sampling runs"):
                        st.dataframe(pd.concat(comparisons, ignore_index=True)[["joint_run", "estimate", "posterior_median", "interval95_low", "interval95_high", "status"]], hide_index=True)
    with residual_tab:
        st.caption("A conditional simulated maximum-correlation screen across the saved curves and phases, with a local fitted-parameter projection. This accounts for multiple serial-correlation looks; it is not an exact omnibus model test.")
        if st.button("Run joint serial check", key=f"{key}_serial_run"):
            from mixa_residual_tests import serial_null_check

            try:
                with st.spinner("Simulating phase-wise residual correlations under the saved noise model..."):
                    check = serial_null_check(result)
                review.setdefault("residual_checks", {})["maximum_serial"] = dict(metadata={k: v for k, v in check.items() if k != "traces"},
                    table=pd.DataFrame(check.get("traces", [])))
                _changed()
            except (ValueError, RuntimeError) as exc:
                st.error(str(exc))
        check = review.get("residual_checks", {}).get("maximum_serial")
        cached = result.get("qualification", {}).get("serial_check", {})
        if not check and cached.get("available"):
            check = dict(metadata={k: v for k, v in cached.items() if k != "traces"}, table=pd.DataFrame(cached.get("traces", [])))
        if check:
            meta = check["metadata"]
            value = meta.get("p_mc")
            st.metric("Conditional Monte Carlo tail fraction", f"{value:.4g}" if value is not None else "Unavailable")
            st.write("Serial structure flagged" if meta["flag"] else "Serial structure not flagged by this check")
            st.dataframe(check["table"], hide_index=True)
            with st.expander("Residual simulation method"):
                st.write(meta)
    if review:
        import zipfile

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in ["REFIT_REVIEW.md", "JOINT_INFERENCE.md", "FRONTIER_VALIDATION.md"]:
                archive.writestr(name, (Path(__file__).parent/name).read_bytes())
            archive.writestr("saved_run.json", json.dumps(json_safe(dict(recipe=result.get("recipe"),
                refit_spec=result.get("refit_spec"), parameter_controls=result.get("parameter_controls"),
                instance_controls=result.get("instance_controls"), fingerprint=problem["fingerprint"])), indent=2, allow_nan=False))
            write_review_exports(archive, "robustness_review", result)
            write_review_figures(archive, "robustness_review", result)
        st.download_button("Download robustness review", buffer.getvalue(), "MIXA_robustness_review.zip", "application/zip",
                           key=f"{key}_download", on_click="ignore")
