"""Guided/automatic analysis in the existing Kinetic Analysis workspace."""

from datetime import datetime, timezone
import hashlib
import json

import pandas as pd
import numpy as np
import streamlit as st

from mixa_automation import (FitPolicy, analysis_signature, attempt_table, baseline_evidence,
                             candidate_plan, review_metadata, run_assisted_fit)
from mixa_data import APP_VERSION
from mixa_mechanisms import MODEL_LABELS, prepare_curves
from mixa_mechanistic_ui import render_mechanistic_results
from mixa_science import json_safe


def render_fitting_assistant(data_list, include_map, windows):
    """Render only the selected mode; inactive manual controls are not displayed."""
    with st.container(border=True):
        st.markdown("#### Fitting Assistance")
        mode = st.radio("Analysis mode", ["Manual controls", "Guided", "Automatic, conservative"],
                        horizontal=True, key="assistant_mode")
        if mode == "Manual controls":
            return False
        st.caption("Start with 1:1, then compare permitted corrections and assay-supported models. Selection considers residual structure, parameter resolution and complexity, not just the highest fit score.")
        normalize = st.checkbox("Normalize baseline", value=True, key="assistant_normalize",
            help="Reference every candidate to the same measured pre-association baseline. This is a preprocessing choice, not an extra fitted term.")
        left, right = st.columns(2)
        with left:
            scope = st.selectbox("Surface capacity linkage", ["Per file", "Per curve"], key="assistant_capacity",
                                 help="Use Per curve for independent BLI biosensors; Per file only when those traces share a capacity.")
            repeats = {data.get("repeat_id", data["filename"]) for data in data_list}
            rate_scope = st.selectbox("Kinetic rate linkage", ["Global", "Per repeat"], index=1 if len(repeats) > 1 else 0,
                                      key="assistant_rate_scope", help="Per repeat shares rates across concentrations within each independent experiment, not across experiments that may vary.")
            noise_source = st.selectbox("Absolute noise SD", ["Estimate from pre-association baseline", "Independently measured SD", "Unavailable"], key="assistant_noise_source")
            noise_sd = st.number_input("Measured noise SD (response units)", min_value=1e-8, value=.2, format="%.6g", key="assistant_noise_sd") if noise_source == "Independently measured SD" else None
        with right:
            polarity = st.selectbox("Response polarity", ["Positive binding response", "Invert negative binding response"], key="assistant_polarity")
            permitted = st.multiselect("Permitted corrections", ["Linear drift", "Linear nonspecific background", "Residual offset", "Injection bulk step", "Control-constrained reversible background", "Quasi-steady transport"],
                                       default=["Linear drift", "Linear nonspecific background"], key="assistant_corrections")
            compare_all = st.checkbox("Compare all permitted candidates", value=True, disabled=mode == "Guided", key="assistant_compare_all")
        baseline = baseline_evidence(data_list, include_map, windows["phase_assoc_start_s"])
        baseline_drift = not baseline.empty and bool(baseline.drift_supported.any())
        evidence = dict(allow_drift="Linear drift" in permitted, drift_supported=baseline_drift,
                        allow_linear_nonspecific="Linear nonspecific background" in permitted,
                        explore_empirical_corrections=True)
        if "Linear drift" in permitted:
            external = st.checkbox("Independent controls support linear drift", key="assistant_drift_supported")
            evidence["drift_supported"] |= external
            if baseline_drift:
                st.caption("A resolved pre-association trend permits testing drift; it does not establish drift during binding.")
        if "Residual offset" in permitted:
            evidence.update(allow_offset=True, offset_supported=st.checkbox("Independent referencing supports a residual constant offset", key="assistant_offset_supported"))
        if "Injection bulk step" in permitted:
            evidence.update(allow_bulk=True, bulk_supported=st.checkbox("Reference/instrument data support a bulk response step", key="assistant_bulk_supported"))
        if "Control-constrained reversible background" in permitted:
            evidence["allow_nonspecific"] = True
            if st.checkbox("Background parameters measured independently in negative controls", key="assistant_ns_supported"):
                a, b, c = st.columns(3)
                evidence["background_parameters"] = dict(
                    ns_kon=a.number_input("Fixed background kon (M^-1 s^-1)", min_value=1e-8, value=1e5, format="%.6g", key="assistant_ns_kon"),
                    ns_koff=b.number_input("Fixed background koff (s^-1)", min_value=1e-8, value=.05, format="%.6g", key="assistant_ns_koff"),
                    ns_Rmax=c.number_input("Fixed background capacity (response units)", min_value=1e-8, value=10., format="%.6g", key="assistant_ns_rmax"))
                st.caption("The supplied capacity must apply to each linked surface. Use manual controls for surface-specific background constraints.")
        if "Quasi-steady transport" in permitted:
            evidence.update(allow_transport=True, transport_supported=st.checkbox("Density/flow/shaking experiments support transport limitation", key="assistant_transport_supported"))
        assay = {}
        with st.expander("Assay-supported advanced candidates"):
            a, b = st.columns(2)
            assay["immobilized"] = a.selectbox("Immobilized partner", ["Unspecified", "Receptor", "Ligand", "Antibody", "Other"], key="assistant_immobilized")
            assay["analyte"] = b.selectbox("Soluble analyte", ["Unspecified", "Ligand", "Receptor", "Antibody", "Other"], key="assistant_analyte")
            assay["analyte_valency"] = a.selectbox("Soluble analyte valency", ["Unknown", "Monovalent", "Bivalent", "Multivalent"], key="assistant_valency")
            choices = st.multiselect("Allowed alternative mechanisms", [key for key in MODEL_LABELS if key != "langmuir"],
                                     format_func=MODEL_LABELS.get, key="assistant_models")
            evidence["allowed_models"] = choices
            if choices:
                evidence["mechanism_supported"] = st.checkbox("Independent assay evidence supports testing these alternatives", key="assistant_mechanism_supported")
                evidence["mechanism_reason"] = st.text_input("Assay evidence / rationale", key="assistant_mechanism_reason")
            st.caption("Select alternatives that match the assay you want to test. Bivalent refers to the soluble analyte. Full two-compartment transport and custom constraints remain available in Manual controls.")
        with st.expander("Decision policy and runtime"):
            a, b = st.columns(2)
            runtime = a.number_input("Total assisted runtime limit (s)", min_value=10., max_value=1200., value=180., key="assistant_runtime")
            starts = b.number_input("Starts per candidate", min_value=2, max_value=10, value=3, key="assistant_starts")
            budget = a.number_input("Maximum candidates", min_value=1, max_value=16, value=10, key="assistant_budget")
            noise_limit = b.number_input("Maximum residual/noise ratio", min_value=1., max_value=3., value=1.5, key="assistant_noise_limit")
            noise_model = a.selectbox("Residual noise model", ["Independent errors", "Fixed OU correlation time"], key="assistant_noise_model")
            tau = b.number_input("Prespecified correlation time (s)", min_value=.001, value=10., key="assistant_tau") if noise_model != "Independent errors" else 0.
            st.caption("Thresholds are descriptive, not calibrated p-values. Noise scales and OU time are conditional inputs. Prespecify them; do not tune them solely to obtain acceptance. Rate profiles and multistart checks share the total budget.")
        with st.expander("Baseline noise evidence"):
            st.dataframe(baseline, hide_index=True)
            st.caption("SD is estimated after removing a linear baseline trend. Raw-source and calibration propagation is configured in Measurement and concentration uncertainty.")
        phase_issues = st.session_state.get("phase_detection_details", {}).get("issues", [])
        verified = True
        if phase_issues or st.session_state.get("phase_adjust_enabled"):
            for issue in phase_issues:
                st.warning(issue)
            verified = st.checkbox("I verified the phase boundaries and aligned injection times", key="assistant_phases_verified")
        try:
            curves = prepare_curves(data_list, include_map, windows, normalize=normalize)
            scales = {(row.filename, row.concentration_nM): row.noise_sd for row in baseline.itertuples()}
            for curve in curves:
                curve["surface_id"] = f"{curve['filename']}::{curve['concentration_nM']:g}"
                curve["relative_sd"] = 1.
                curve["noise_sd"] = scales.get((curve["filename"], curve["concentration_nM"]), np.nan) if noise_source.startswith("Estimate") else (noise_sd if noise_sd is not None else np.nan)
                if polarity.startswith("Invert"):
                    curve["response"] *= -1
                    curve["response_sign"] *= -1
            supplied = np.array([curve["noise_sd"] for curve in curves])
            if np.all(np.isfinite(supplied) & (supplied > 0)):
                for curve in curves:
                    curve["relative_sd"] = curve["noise_sd"] / float(np.median(supplied))
            policy = FitPolicy(runtime_s=float(runtime), starts=int(starts), max_candidates=int(budget),
                               capacity_scope=scope, rate_scope=rate_scope, correlation_time=float(tau), noise_ratio_limit=float(noise_limit),
                               compare_all=bool(compare_all) if mode != "Guided" else False)
            plan, blocked = candidate_plan(evidence, assay, policy, curves)
            signature = analysis_signature(curves, policy, evidence, assay)
        except (ValueError, TypeError) as exc:
            st.error(str(exc))
            return True
        for message in blocked:
            st.info(message)
        with st.expander("Candidate sequence", expanded=mode != "Guided"):
            st.dataframe(pd.DataFrame([dict(step=i+1, candidate=c.label) for i, c in enumerate(plan)]), hide_index=True)
            st.caption("Baseline normalization is held identical across candidates; selecting it by fit score would compare different preprocessed data. Drift and the linear background can be tested separately and together. More complex models are tested only when selected above.")
        previous = st.session_state.get("assisted_review")
        current = previous is not None and previous["signature"] == signature
        label = "Fit 1:1 and assess" if mode == "Guided" else "Run conservative automatic analysis"
        start = st.button(label, type="primary", key="assistant_run", disabled=not verified)
        next_step = False
        if current and mode == "Guided" and previous.get("next_candidate"):
            st.write("Next permitted test: " + previous["next_candidate"])
            next_step = st.button("Test next permitted candidate", key="assistant_next", disabled=not verified)
        if start or next_step:
            try:
                with st.spinner("Fitting and checking the exact selected observations..."):
                    review = run_assisted_fit(curves, policy, evidence, assay, mode="guided" if mode == "Guided" else "automatic",
                                              previous=previous if next_step else None, phases_verified=verified)
                for attempt in review["attempts"]:
                    if "result" not in attempt or "recipe" in attempt["result"]:
                        continue
                    result = attempt["result"]
                    result["recipe"] = dict(version=APP_VERSION, assay=assay, model=result["model"], transport=result["transport"],
                                            nonspecific=result["nonspecific"], background_terms=result["background_terms"],
                                            windows=dict(windows), include_map={key: sorted(values) for key, values in include_map.items()},
                                            normalize=normalize, parameters=result["parameter_controls"], instance_controls=result["instance_controls"],
                                            assisted_policy=review["config"]["policy"], evidence=evidence,
                                            invert=polarity.startswith("Invert"), data_sha256=review["data_sha256"], noise_source=noise_source,
                                            noise_scales=[{key: curve.get(key) for key in ["filename", "concentration_nM", "noise_sd", "relative_sd"]} for curve in curves],
                                            baseline_evidence=baseline.to_dict("records"))
                    result["created_utc"] = datetime.now(timezone.utc).isoformat()
                    result["signature"] = hashlib.sha256(json.dumps(json_safe(result["recipe"]), sort_keys=True).encode()).hexdigest()
                st.session_state.assisted_review = review
                st.session_state.latest_kinetic_results = None
                st.session_state.publication_report = None
                st.session_state.pop("advanced_export", None)
                st.rerun()
            except (ValueError, RuntimeError) as exc:
                st.error(str(exc))
        review = st.session_state.get("assisted_review")
        if not review:
            st.caption(f"{len(plan)} permitted candidate(s). Select Manual controls to use the manual fitting settings.")
            return True
        if review["signature"] != signature:
            st.warning("Inputs or policy changed. The saved assisted run is unchanged; start a new run to apply these settings.")
        if review["recommended_index"] is not None:
            st.success(review["status"])
        else:
            st.warning(review["status"])
        st.write(review["reason"])
        for suggestion in review.get("suggestions", []):
            st.write(suggestion)
        st.dataframe(attempt_table(review), hide_index=True)
        with st.expander("Complete candidate queue"):
            st.dataframe(pd.DataFrame(review.get("candidate_queue", [])), hide_index=True)
        st.download_button("Download complete model-review log", json.dumps(review_metadata(review), indent=2, allow_nan=False),
                           "MIXA_assisted_model_review.json", "application/json", on_click="ignore")
        index = review["display_index"]
        if index is None:
            return True
        record = review["attempts"][index]
        result = record["result"]
        if review["recommended_index"] is None:
            st.info("The curves below are diagnostic only. No publication-qualified model was selected.")
        saved = review["config"]
        result["assisted_review"] = review_metadata(review)
        st.dataframe(pd.DataFrame(record["assessment"]["traces"]), hide_index=True)
    render_mechanistic_results(result, data_list, signature=result["signature"],
                               runtime=saved["policy"]["runtime_s"], starts=saved["policy"]["starts"])
    return True
