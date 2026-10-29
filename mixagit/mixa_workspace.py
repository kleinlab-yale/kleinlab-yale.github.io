"""Dataset preparation UI. Raw data and committed design live separately from fit inputs."""

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import json
import pandas as pd
import streamlit as st

from mixa_data import (
    BACKGROUND_MODES,
    COLUMN_ROLES,
    ROLES,
    SAMPLE_FILES,
    UNIT_OPTIONS,
    UNIT_TO_NM,
    analysis_fingerprint,
    apply_column_schema,
    default_design,
    example_project,
    load_sample_datasets,
    prepare_experiment,
    read_dataset,
    smart_predict_design,
    validate_design,
)
from mixa_selection import observation_table, selection_summary
from mixa_input_uncertainty import DEFAULT_OPTIONS, input_options
from mixa_documentation import render_methods_documentation
from mixa_plotting import show_figure
import numpy as np


RESULT_KEYS = ("latest_kinetic_results", "latest_kinetic_diag_plot_results",
               "latest_equilibrium_results", "latest_kobs_results", "model_compare", "publication_report",
               "latest_mechanistic_results", "assisted_review")


def invalidate_results():
    for key in RESULT_KEYS:
        st.session_state[key] = None
    st.session_state.analysis_history = []
    st.session_state.publication_bundle = None
    st.session_state.pop("publication_bundle_size", None)
    st.session_state.pop("report_key", None)
    st.session_state.pop("advanced_export", None)
    st.session_state.pop("advanced_export_signature", None)
    st.session_state.pop("assisted_publication_export", None)


def _set_project(datasets, design):
    st.session_state.raw_datasets = datasets
    st.session_state.dataset_design = design
    st.session_state.dataset_draft = design.copy()
    st.session_state.design_committed = False
    st.session_state.design_revision = st.session_state.get("design_revision", 0) + 1
    st.session_state.data_list = []
    st.session_state.include_map = {}
    st.session_state.prepared_signature = None
    invalidate_results()


def _append_datasets(incoming, design=None):
    existing = st.session_state.get("raw_datasets", [])
    names = [d["filename"] for d in existing + incoming]
    if len(names) != len(set(names)):
        raise ValueError("A filename is already present. Use a different name for each dataset.")
    previous = st.session_state.get("dataset_draft", st.session_state.get("dataset_design", pd.DataFrame()))
    incoming_design = default_design(incoming) if design is None else design
    _set_project(existing + incoming, pd.concat([previous, incoming_design], ignore_index=True))


def _load_samples():
    try:
        names = st.session_state.get("sample_files_to_load", list(SAMPLE_FILES))
        if not names:
            raise ValueError("Choose at least one sample dataset.")
        _append_datasets(load_sample_datasets(names))
        st.session_state.import_notice = f"Added {len(names)} original sample datasets."
    except ValueError as exc:
        st.session_state.import_error = str(exc)


def _load_demonstration():
    try:
        datasets, design = example_project()
        if st.session_state.get("raw_datasets"):
            design["Experiment"] = "Synthetic demonstration"
        _append_datasets(datasets, design)
        st.session_state.import_notice = "Added three synthetic sample repeats and three matched controls."
    except ValueError as exc:
        st.session_state.import_error = str(exc)


def _remove_datasets(filenames):
    selected = set(filenames)
    remaining = [d for d in st.session_state.raw_datasets if d["filename"] not in selected]
    draft = st.session_state.get("dataset_draft", st.session_state.dataset_design)
    design = draft.loc[~draft.File.isin(selected)].reset_index(drop=True)
    _set_project(remaining, design)
    st.session_state.pop("dataset_preview", None)
    st.session_state.import_notice = f"Removed {len(selected)} dataset(s). Remaining assignments must be applied before fitting."


def _smart_predict_draft():
    raw = st.session_state.get("raw_datasets", [])
    if not raw:
        return
    current_exp = "Experiment 1"
    draft = st.session_state.get("dataset_draft", pd.DataFrame())
    if not draft.empty and "Experiment" in draft.columns:
        exps = [str(x).strip() for x in draft["Experiment"].tolist() if str(x).strip()]
        if exps:
            current_exp = exps[0]
    predicted = smart_predict_design(raw, experiment_name=current_exp)
    st.session_state.dataset_draft = predicted
    st.session_state.design_revision = st.session_state.get("design_revision", 0) + 1
    st.session_state.design_committed = False
    st.session_state.data_list = []
    invalidate_results()


def _batch_independent_repeats():
    draft = st.session_state.get("dataset_draft", st.session_state.get("dataset_design", pd.DataFrame())).copy()
    if draft.empty:
        return
    rep_idx = 1
    for i, row in draft.iterrows():
        if row["Role"] == "Sample":
            draft.loc[i, "Repeat ID"] = f"Repeat {rep_idx}"
            rep_idx += 1
    st.session_state.dataset_draft = draft
    st.session_state.design_revision = st.session_state.get("design_revision", 0) + 1
    st.session_state.design_committed = False
    st.session_state.data_list = []
    invalidate_results()


def _batch_same_file_zero():
    raw = st.session_state.get("raw_datasets", [])
    by_name = {d["filename"]: d for d in raw}
    draft = st.session_state.get("dataset_draft", st.session_state.get("dataset_design", pd.DataFrame())).copy()
    if draft.empty:
        return
    for i, row in draft.iterrows():
        if row["Role"] == "Sample":
            ds = by_name.get(row["File"], {})
            if 0.0 in ds.get("concentrations", []):
                draft.loc[i, "Subtraction"] = "Same-file 0 nM"
    st.session_state.dataset_draft = draft
    st.session_state.design_revision = st.session_state.get("design_revision", 0) + 1
    st.session_state.design_committed = False
    st.session_state.data_list = []
    invalidate_results()


def _batch_reset_default_design():
    raw = st.session_state.get("raw_datasets", [])
    if not raw:
        return
    st.session_state.dataset_draft = default_design(raw)
    st.session_state.design_revision = st.session_state.get("design_revision", 0) + 1
    st.session_state.design_committed = False
    st.session_state.data_list = []
    invalidate_results()


def _render_assignments(raw, compact=False):
    draft = st.session_state.get("dataset_draft", st.session_state.dataset_design).copy()
    revision = st.session_state.get("design_revision", 0)
    st.markdown("### 2. Datasets, repeats and background")
    st.caption(
        "Assign roles, repeats, and reference subtraction for all files in one table, or use the quick actions below to auto-populate from filenames and column headers."
    )
    tb1, tb2, tb3, tb4 = st.columns(4)
    tb1.button(
        "✨ Auto-predict roles & repeats",
        key="smart_predict_assignments",
        on_click=_smart_predict_draft,
        use_container_width=True,
        help="Automatically infer Sample vs. Negative control roles, Repeat IDs, and matched or in-file 0 nM subtraction from filenames and trace headers.",
    )
    tb2.button(
        "🔢 Independent repeats (1..N)",
        key="batch_independent_repeats",
        on_click=_batch_independent_repeats,
        use_container_width=True,
        help="Assign Repeat 1, Repeat 2, ... to each Sample dataset.",
    )
    tb3.button(
        "🔗 Subtract in-file 0 nM / blank",
        key="batch_same_file_zero",
        on_click=_batch_same_file_zero,
        use_container_width=True,
        help="Set Subtraction to 'Same-file 0 nM' for every sample dataset that contains a 0 nM / Blank / Buffer column.",
    )
    tb4.button(
        "🔄 Reset defaults",
        key="batch_reset_default_design",
        on_click=_batch_reset_default_design,
        use_container_width=True,
        help="Reset all files to Sample, Repeat 1, and Subtraction = None.",
    )
    display = draft.copy()
    display.insert(0, "Remove", False)
    edited = st.data_editor(
        display,
        hide_index=True,
        height=min(420, 39 + len(display) * 35),
        key=f"dataset_assignments_{revision}",
        disabled=["File"],
        width="stretch",
        column_config={
            "Remove": st.column_config.CheckboxColumn("Remove", width="small"),
            "File": st.column_config.TextColumn("Dataset", width="medium"),
            "Role": st.column_config.SelectboxColumn("Role", options=ROLES, required=True, width="medium"),
            "Experiment": st.column_config.TextColumn("Experiment", required=True),
            "Repeat ID": st.column_config.TextColumn("Repeat ID", required=True),
            "Background set": st.column_config.TextColumn(
                "Control group",
                help="Use the same group name on a sample and its negative controls within the same experiment.",
            ),
            "Subtraction": st.column_config.SelectboxColumn(
                "Subtract background", options=BACKGROUND_MODES, required=True
            ),
        },
    )
    draft = edited.drop(columns="Remove")
    selected = edited.loc[edited.Remove, "File"].tolist()
    st.session_state.dataset_draft = draft
    act_col1, act_col2 = st.columns([1, 2])
    act_col1.button(
        "Remove selected datasets",
        disabled=not selected,
        key="remove_selected_datasets",
        on_click=_remove_datasets,
        args=(selected,),
    )
    act_col2.checkbox(
        "Align per-file injection start times across datasets",
        key="align_dataset_phases",
        help="When enabled, shifts each file's time axis so detected or declared association injection starts align with the first sample file.",
    )
    st.caption(
        "Check Remove and click Remove selected datasets to delete files from this session. For control subtraction, give samples and their controls the same Control group. None means already referenced or no subtraction."
    )
    st.session_state.dataset_draft = draft
    committed = st.session_state.dataset_design
    if not draft.equals(committed):
        st.session_state.design_committed = False
        st.session_state.data_list = []
        invalidate_results()
    if st.button("Apply dataset assignments", type="primary", use_container_width=True):
        try:
            design = validate_design(raw, draft)
            experiments = sorted(design.loc[design.Role == "Sample", "Experiment"].unique())
            if not experiments:
                raise ValueError("Assign at least one sample.")
            align_flag = bool(st.session_state.get("align_dataset_phases", False))
            for experiment in experiments:
                prepare_experiment(raw, design, experiment, align_phases=align_flag)
            st.session_state.dataset_design = design
            st.session_state.dataset_draft = design.copy()
            st.session_state.design_committed = True
            st.session_state.prepared_signature = None
            invalidate_results()
            st.success("Dataset assignments and background subtraction applied.")
        except ValueError as exc:
            st.error(f"Assignments were not applied: {exc}")


def _render_unified_column_and_trace_matrix(raw, samples, design, experiment, fingerprint):
    """Render a single unified table to inspect/edit column concentrations, reference roles, and trace inclusion."""
    st.markdown("### 3. Unified column & trace assignments")
    st.caption(
        "Manage all columns across every dataset in one place: toggle **Include** to select traces for fitting, or update **Column Role**, **Value**, and **Unit** to relabel bare numbers or designate any column as a **Reference (0 nM)** blank."
    )
    raw_by_name = {d["filename"]: d for d in raw}
    sample_by_name = {d["filename"]: d for d in samples}
    design_rows = design.loc[(design["Experiment"] == experiment) & (design["Role"] != "Exclude")].to_dict("records")
    if not design_rows:
        return

    b1, b2, _ = st.columns([1.2, 1.2, 2.6])
    if b1.button("Include all > 0 nM", key="trace_include_all_positive", use_container_width=True):
        for d in samples:
            st.session_state.include_map[d["filename"]] = {c for c in d["concentrations"] if c > 0}
        st.session_state.trace_editor_revision = st.session_state.get("trace_editor_revision", 0) + 1
        invalidate_results()
    if b2.button("Exclude low SNR (< 5)", key="trace_exclude_low_snr", use_container_width=True):
        for d in samples:
            keep = set()
            for c in d["concentrations"]:
                if c <= 0:
                    continue
                y = d["responses"][c]
                snr_c = float(np.ptp(y) / max(np.std(y[:10]), 1e-12))
                if snr_c >= 5.0:
                    keep.add(c)
            st.session_state.include_map[d["filename"]] = keep or {c for c in d["concentrations"] if c > 0}
        st.session_state.trace_editor_revision = st.session_state.get("trace_editor_revision", 0) + 1
        invalidate_results()

    matrix_rows = []
    for d_row in design_rows:
        fn = d_row["File"]
        ds_role = d_row["Role"]
        rep_id = d_row["Repeat ID"]
        raw_ds = raw_by_name.get(fn)
        if raw_ds is None:
            continue
        schema = raw_ds.get("column_schema") or [
            {
                "column": f"{c:g} nM",
                "role": "Reference (0 nM)" if c == 0 else "Sample",
                "value": float(c),
                "unit": "nM",
                "concentration_nM": float(c),
            }
            for c in raw_ds.get("concentrations", [])
        ]
        raw_cols = raw_ds.get("raw_columns", {})
        prep_ds = sample_by_name.get(fn)
        included_set = st.session_state.include_map.get(fn, set())
        for entry in schema:
            col_name = str(entry["column"])
            c_role = str(entry.get("role", "Sample"))
            val = entry.get("value", np.nan)
            unit = str(entry.get("unit", "nM"))
            eff_nM = entry.get("concentration_nM", np.nan)
            if prep_ds is not None and np.isfinite(eff_nM) and float(eff_nM) in prep_ds.get("responses", {}):
                y_trace = prep_ds["responses"][float(eff_nM)]
            elif col_name in raw_cols:
                y_trace = raw_cols[col_name]
            elif np.isfinite(eff_nM) and float(eff_nM) in raw_ds.get("responses", {}):
                y_trace = raw_ds["responses"][float(eff_nM)]
            else:
                y_trace = np.zeros(2, dtype=float)
            snr_val = (
                float(np.ptp(y_trace) / max(np.std(y_trace[:10]), 1e-12))
                if len(y_trace) >= 2 and np.isfinite(y_trace).all()
                else 0.0
            )
            is_inc = bool(
                ds_role == "Sample"
                and c_role == "Sample"
                and np.isfinite(eff_nM)
                and float(eff_nM) > 0
                and float(eff_nM) in included_set
            )
            matrix_rows.append({
                "Include": is_inc,
                "Dataset": fn,
                "Dataset Role": ds_role,
                "Repeat ID": rep_id,
                "Column": col_name,
                "Column Role": c_role if c_role in COLUMN_ROLES else "Sample",
                "Value": float(val) if np.isfinite(val) else 0.0,
                "Unit": unit if unit in UNIT_OPTIONS else "nM",
                "Effective (nM)": float(eff_nM) if np.isfinite(eff_nM) else np.nan,
                "SNR": round(snr_val, 1),
            })

    if not matrix_rows:
        return
    matrix_df = pd.DataFrame(matrix_rows)
    trace_rev = st.session_state.setdefault("trace_editor_revision", 0)
    editor_key = f"unified_column_trace_editor_{fingerprint[:8]}_{trace_rev}"
    edited_matrix = st.data_editor(
        matrix_df,
        hide_index=True,
        height=min(420, 42 + len(matrix_df) * 35),
        key=editor_key,
        disabled=["Dataset", "Dataset Role", "Repeat ID", "Column", "Effective (nM)", "SNR"],
        width="stretch",
        column_config={
            "Include": st.column_config.CheckboxColumn(
                "Include",
                width="small",
                help="Include this trace in kinetic and equilibrium fitting (positive sample concentrations only).",
            ),
            "Dataset": st.column_config.TextColumn("Dataset", width="medium"),
            "Dataset Role": st.column_config.TextColumn("File Role", width="small"),
            "Repeat ID": st.column_config.TextColumn("Repeat ID", width="small"),
            "Column": st.column_config.TextColumn("Source Column", width="small"),
            "Column Role": st.column_config.SelectboxColumn(
                "Column Role",
                options=COLUMN_ROLES,
                required=True,
                width="medium",
                help="Set to 'Reference (0 nM)' for in-file blank/buffer columns, 'Sample' for analyte concentrations, or 'Exclude' to ignore.",
            ),
            "Value": st.column_config.NumberColumn(
                "Concentration",
                min_value=0.0,
                format="%.4g",
                width="small",
                help="Numeric concentration in the selected Unit.",
            ),
            "Unit": st.column_config.SelectboxColumn("Unit", options=UNIT_OPTIONS, required=True, width="small"),
            "Effective (nM)": st.column_config.NumberColumn("Effective (nM)", format="%.4g", width="small"),
            "SNR": st.column_config.NumberColumn("SNR", format="%.1f", width="small"),
        },
    )

    # Check if column roles, values, or units were modified vs. only Include checkboxes
    schema_changed = False
    for orig_r, edit_r in zip(matrix_df.to_dict("records"), edited_matrix.to_dict("records")):
        if (
            orig_r["Column Role"] != edit_r["Column Role"]
            or orig_r["Unit"] != edit_r["Unit"]
            or not np.isclose(float(orig_r["Value"]), float(edit_r["Value"]), rtol=1e-9, atol=1e-12)
        ):
            schema_changed = True
            break

    if not schema_changed:
        # Live-sync Include toggles immediately without requiring a button click
        new_include_map = {d["filename"]: set() for d in samples}
        for edit_r in edited_matrix.to_dict("records"):
            if (
                edit_r["Dataset Role"] == "Sample"
                and edit_r["Column Role"] == "Sample"
                and edit_r["Include"]
                and np.isfinite(edit_r["Effective (nM)"])
                and float(edit_r["Effective (nM)"]) > 0
                and edit_r["Dataset"] in new_include_map
            ):
                new_include_map[edit_r["Dataset"]].add(float(edit_r["Effective (nM)"]))
        if new_include_map != st.session_state.include_map:
            st.session_state.include_map = new_include_map
            invalidate_results()
    else:
        if st.button(
            "Apply column & concentration updates",
            key="apply_column_schema_updates",
            type="primary",
            use_container_width=True,
        ):
            try:
                grouped_rows = {}
                desired_includes = {}
                for edit_r in edited_matrix.to_dict("records"):
                    fn = edit_r["Dataset"]
                    c_role = edit_r["Column Role"]
                    val_f = 0.0 if c_role == "Reference (0 nM)" else float(edit_r["Value"])
                    unit_s = edit_r["Unit"]
                    scale = UNIT_TO_NM.get(unit_s.lower(), 1.0)
                    conc_nM = 0.0 if c_role == "Reference (0 nM)" else (np.nan if c_role == "Exclude" else float(f"{val_f * scale:.12g}"))
                    grouped_rows.setdefault(fn, []).append({
                        "column": edit_r["Column"],
                        "role": c_role,
                        "value": val_f,
                        "unit": unit_s,
                        "concentration_nM": conc_nM,
                    })
                    if edit_r["Dataset Role"] == "Sample" and c_role == "Sample" and edit_r["Include"] and np.isfinite(conc_nM) and conc_nM > 0:
                        desired_includes.setdefault(fn, set()).add(conc_nM)
                updated_raw = []
                for d in st.session_state.raw_datasets:
                    if d["filename"] in grouped_rows:
                        updated_raw.append(apply_column_schema(d, grouped_rows[d["filename"]]))
                    else:
                        updated_raw.append(d)
                align_flag = bool(st.session_state.get("align_dataset_phases", False))
                prepared, provenance = prepare_experiment(
                    updated_raw, st.session_state.dataset_design, experiment, align_phases=align_flag
                )
                st.session_state.raw_datasets = updated_raw
                st.session_state.data_list = prepared
                st.session_state.preprocessing_table = provenance
                st.session_state.include_map = {
                    d["filename"]: desired_includes.get(
                        d["filename"], {c for c in d["concentrations"] if c > 0}
                    )
                    for d in prepared
                }
                st.session_state.prepared_signature = analysis_fingerprint(
                    updated_raw, st.session_state.dataset_design, experiment, align_phases=align_flag
                )
                st.session_state.trace_editor_revision = st.session_state.get("trace_editor_revision", 0) + 1
                invalidate_results()
                st.success("Updated column assignments, concentrations, and active traces.")
            except ValueError as exc:
                st.error(f"Could not apply column updates: {exc}")


def _clear_project():
    for key in list(st.session_state):
        del st.session_state[key]
    _set_project([], pd.DataFrame())


def _uncertainty_settings(experiment):
    saved = st.session_state.setdefault("input_uncertainty_by_experiment", {}).get(experiment, DEFAULT_OPTIONS)
    prefix = f"input_uncertainty_{experiment}"
    # Preserve these controls when navigating between method-specific pages.
    for name in DEFAULT_OPTIONS:
        key = f"{prefix}_{name}"
        if key in st.session_state:
            st.session_state[key] = st.session_state[key]
    def numeric_default(name, percent=False):
        return "min" if f"{prefix}_{name}" in st.session_state else saved[name]*(100 if percent else 1)
    budget_enabled = any(st.session_state.get(f"{prefix}_{name}", saved[name])
                         for name in ["propagate_measurement", "stock_cv", "level_cv"])
    with st.expander("Measurement and concentration uncertainty", expanded=bool(budget_enabled)):
        measurement = st.checkbox("Propagate raw sample and control measurement uncertainty", value=False if f"{prefix}_propagate_measurement" in st.session_state else saved["propagate_measurement"],
            key=f"{prefix}_propagate_measurement", help="Retains covariance from shared raw controls, interpolation and baseline normalization. Noise SDs are supplied or estimated from each raw pre-association baseline.")
        a, b = st.columns(2)
        stock = a.number_input("Common stock concentration uncertainty (CV %)", min_value=0., max_value=50., value=numeric_default("stock_cv", True), key=f"{prefix}_stock_cv")
        level = b.number_input("Concentration-level uncertainty (CV %)", min_value=0., max_value=50., value=numeric_default("level_cv", True), key=f"{prefix}_level_cv")
        st.caption("Enter relative standard uncertainties, not 95% limits. The stock scale is common to every fitted trace. Each concentration-level error is also shared across files/repeats; neither is divided by the repeat count.")
        values = dict(saved, propagate_measurement=measurement, stock_cv=stock/100, level_cv=level/100)
        if measurement:
            a, b, c = st.columns(3)
            values["sample_noise_sd"] = a.number_input("Raw sample noise SD (0 = estimate)", min_value=0., value=numeric_default("sample_noise_sd"), format="%.5g", key=f"{prefix}_sample_noise_sd")
            values["control_noise_sd"] = b.number_input("Raw control noise SD (0 = estimate)", min_value=0., value=numeric_default("control_noise_sd"), format="%.5g", key=f"{prefix}_control_noise_sd")
            values["raw_correlation_time_s"] = c.number_input("Raw-noise OU time (s; 0 = IID)", min_value=0., value=numeric_default("raw_correlation_time_s"), format="%.5g", key=f"{prefix}_raw_correlation_time_s")
            st.caption("Gaussian raw-source model; SDs and correlation time are held fixed during propagation. Baseline estimation removes a linear trend. Use independently supported noise/calibration inputs.")
        st.caption("For the saved standard/advanced/kobs fits, these budgets change propagated uncertainty, not fitted values, selected observations or independent-repeat SD. Calibrated intervals simulate the enabled budget. The separate Joint repeats analysis includes it in its response likelihood and concentration model. Equilibrium input budgets remain separate from conditional profiles.")
    options = input_options(values)
    previous = st.session_state.get("active_input_uncertainty")
    marker = json.dumps([experiment, options], sort_keys=True)
    if previous is not None and marker != previous:
        invalidate_results()
    st.session_state.active_input_uncertainty = marker
    st.session_state.input_uncertainty_by_experiment[experiment] = options
    return options


def render_dataset_workspace(active_section, show_preview=True, show_summary=True, compact=False):
    if st.button("Methods & References", key="open_methods_documentation"):
        render_methods_documentation()
    if "selected_experiment" in st.session_state:
        st.session_state.selected_experiment = st.session_state.selected_experiment
    if "raw_datasets" not in st.session_state:
        st.session_state.raw_datasets = []
        st.session_state.dataset_design = pd.DataFrame()
        st.session_state.dataset_draft = pd.DataFrame()
        st.session_state.design_committed = False
    if active_section == "Data Input":
        st.markdown("### 1. Add datasets")
        upload_tab, samples_tab, demo_tab = st.tabs(
            ["Upload SPR / BLI files", "Original sample datasets", "Synthetic demonstration"]
        )
        with upload_tab:
            with st.form("dataset_import", clear_on_submit=True):
                uploads = st.file_uploader(
                    "SPR / BLI datasets (CSV, TSV, TXT, XLSX)",
                    type=["csv", "tsv", "txt", "xlsx", "xls"],
                    accept_multiple_files=True,
                    help="Wide sensorgram tables (columns labeled with fM–M units, bare concentrations, or Blank/Buffer/Ref) or long tables (time, concentration, response).",
                )
                opt_col1, opt_col2 = st.columns([1, 2])
                default_unit = opt_col1.selectbox(
                    "Default unit for bare numeric headers",
                    UNIT_OPTIONS,
                    index=UNIT_OPTIONS.index("nM"),
                    key="upload_default_unit",
                )
                auto_predict_upload = opt_col2.checkbox(
                    "Auto-predict roles, repeats & reference subtraction from filenames/columns",
                    value=True,
                    key="upload_auto_predict",
                )
                import_clicked = st.form_submit_button("Add datasets", type="primary")
            st.caption(
                "Supports Biacore (SPR) and Octet/Gator (BLI) wide or long exports, metadata preambles, time in seconds or minutes, and automatic Blank/Buffer/0 nM detection."
            )
        with samples_tab:
            st.multiselect("Sample datasets", list(SAMPLE_FILES), default=list(SAMPLE_FILES), key="sample_files_to_load")
            st.button("Load sample datasets", on_click=_load_samples, type="primary")
            st.caption("The original Group 1 and Group 2a files. Declare whether they are independent or technical repeats before analysis.")
        with demo_tab:
            st.caption("Three synthetic sample repeats and three matched negative controls. Association starts at 20 s and dissociation at 100 s.")
            st.button("Load synthetic demonstration", on_click=_load_demonstration)
        if "import_notice" in st.session_state:
            st.success(st.session_state.pop("import_notice"))
        if "import_error" in st.session_state:
            st.error(st.session_state.pop("import_error"))
        if import_clicked:
            if not uploads:
                st.warning("Choose at least one dataset file.")
            else:
                try:
                    incoming = [
                        read_dataset(f.getvalue(), f.name, default_unit=default_unit)
                        for f in uploads
                    ]
                    incoming_design = smart_predict_design(incoming) if auto_predict_upload else None
                    _append_datasets(incoming, design=incoming_design)
                    st.success(f"Added {len(incoming)} dataset(s). Review or apply their assignments below.")
                except (ValueError, UnicodeError, pd.errors.ParserError) as exc:
                    st.error(str(exc))
        if st.session_state.raw_datasets:
            with st.expander("Supported formats & project reset"):
                st.code(
                    "Time (s),Blank,5 nM,15 nM,50 nM,150 nM\n0,0.01,0.02,0.02,0.03,0.03\n1,0.01,0.12,0.31,0.85,1.92",
                    language="csv",
                )
                st.caption(
                    "Accepted headers: explicit units (fM, pM, nM, uM/µM, mM, M), bare numbers (interpreted with the default unit above), and Blank/Buffer/Ref/0 nM reference columns."
                )
                confirmed = st.checkbox("Clear the current session's datasets and results", key="confirm_clear_project")
                st.button("Start new project", disabled=not confirmed, on_click=_clear_project)
    raw = st.session_state.raw_datasets
    if not raw:
        return
    if active_section == "Data Input":
        _render_assignments(raw, compact=compact)
        ignored = [(d["filename"], d.get("ignored_columns")) for d in raw if d.get("ignored_columns")]
        if ignored:
            summary_str = "; ".join(f"{name} ({', '.join(cols)})" for name, cols in ignored)
            st.info(
                f"Unassigned columns excluded by default: {summary_str}. You can assign concentrations or reference roles to any column in **3. Unified column & trace assignments** below."
            )
    if not st.session_state.design_committed:
        if active_section != "Data Input":
            st.info("Apply dataset assignments in Data Input before analysis.")
        return
    design = st.session_state.dataset_design
    experiments = sorted(design.loc[design.Role == "Sample", "Experiment"].unique())
    if st.session_state.get("selected_experiment") not in experiments:
        st.session_state.selected_experiment = experiments[0]
    experiment = st.selectbox("Experiment to analyze", experiments, key="selected_experiment")
    align_flag = bool(st.session_state.get("align_dataset_phases", False))
    fingerprint = analysis_fingerprint(raw, design, experiment, align_phases=align_flag)
    if st.session_state.get("prepared_signature") != fingerprint:
        prepared, provenance = prepare_experiment(raw, design, experiment, align_phases=align_flag)
        previous = st.session_state.include_map
        st.session_state.data_list = prepared
        st.session_state.preprocessing_table = provenance
        st.session_state.include_map = {
            d["filename"]: set(previous.get(d["filename"], [c for c in d["concentrations"] if c > 0]))
            for d in prepared
        }
        st.session_state.prepared_signature = fingerprint
        invalidate_results()
    samples = st.session_state.data_list
    options = _uncertainty_settings(experiment)
    for sample in samples:
        sample["input_uncertainty"] = dict(options)
    repeats = len({d["repeat_id"] for d in samples})
    if show_summary:
        cols = st.columns(3)
        cols[0].metric("Sample files", len(samples))
        cols[1].metric("Independent repeats", repeats)
        cols[2].metric("Control files", int(((design.Role == "Negative control") & (design.Experiment == experiment)).sum()))
    if active_section != "Data Input" or not show_preview:
        return
    _render_unified_column_and_trace_matrix(raw, samples, design, experiment, fingerprint)
    st.markdown("### 4. Inspect corrected data & reference subtraction")
    ctrl_col1, ctrl_col2 = st.columns([1.4, 1.0])
    name = ctrl_col1.selectbox(
        "Preview dataset",
        [d["filename"] for d in samples],
        key="dataset_preview",
    )
    sample = next((d for d in samples if d["filename"] == name), samples[0])
    inc_concs = sorted(st.session_state.include_map.get(sample["filename"], set()))
    avail_concs = sample["concentrations"]
    default_c_idx = (
        avail_concs.index(inc_concs[-1])
        if inc_concs and inc_concs[-1] in avail_concs
        else len(avail_concs) - 1
    )
    concentration = ctrl_col2.selectbox(
        "Highlight concentration for subtraction check (nM)",
        avail_concs,
        index=max(0, default_c_idx),
        key=f"preview_conc_{name}",
    )
    fig, (ax_series, ax_sub) = plt.subplots(1, 2, figsize=(11.2, 3.2))
    plot_concs = inc_concs if inc_concs else [c for c in avail_concs if c > 0] or avail_concs
    cmap = plt.cm.Blues(np.linspace(0.42, 0.92, max(len(plot_concs), 1)))
    for idx_c, c_val in enumerate(plot_concs):
        if c_val in sample["responses"]:
            lw = 2.1 if c_val == concentration else 1.25
            alpha = 0.98 if c_val == concentration else 0.72
            ax_series.plot(
                sample["time"],
                sample["responses"][c_val],
                color=cmap[idx_c],
                linewidth=lw,
                alpha=alpha,
                label=f"{c_val:g} nM",
            )
    ax_series.set(
        title=f"{sample['filename']} — Referenced concentration series",
        xlabel="Time (s)",
        ylabel="Response (input units)",
    )
    if len(plot_concs) <= 8:
        ax_series.legend(frameon=False, ncol=2, fontsize=8)
    ax_sub.plot(
        sample["time"],
        sample["raw_responses"][concentration],
        color="#98a5b3",
        label="Raw sample",
        linewidth=1.3,
    )
    ax_sub.plot(
        sample["time"],
        sample["background_responses"][concentration],
        color="#d37522",
        label="Subtracted background",
        linewidth=1.3,
    )
    ax_sub.plot(
        sample["time"],
        sample["responses"][concentration],
        color="#1c5d99",
        label="Analysis input",
        linewidth=1.8,
    )
    ax_sub.set(
        title=f"{concentration:g} nM — Raw vs. background subtraction",
        xlabel="Time (s)",
        ylabel="Response (input units)",
    )
    ax_sub.legend(frameon=False, ncol=3, fontsize=8)
    fig.tight_layout()
    show_figure(fig)
    plt.close(fig)
    with st.expander("Subtraction record & control alignment"):
        st.caption(
            "Controls are averaged within Repeat ID, then across independent control repeats. Times are interpolated within control coverage only."
        )
        st.dataframe(st.session_state.preprocessing_table, hide_index=True, use_container_width=True)


def project_context():
    return {
        "experiment": st.session_state.get("selected_experiment", ""),
        "dataset_design": st.session_state.dataset_design.to_dict("records"),
        "preprocessing": st.session_state.get("preprocessing_table", pd.DataFrame()).to_dict("records"),
        "source_hashes": {d["filename"]: d["sha256"] for d in st.session_state.get("raw_datasets", [])},
        "input_fingerprint": st.session_state.get("prepared_signature"),
        "fit_windows": st.session_state.get("fit_windows", {}),
        "phase_selection": {
            "manual_phase_adjustment": st.session_state.get("phase_adjust_enabled"),
            "custom_fit_trimming": st.session_state.get("fit_trim_enabled"),
            "detected_association_start_s": st.session_state.get("phase_detected_assoc"),
            "detected_dissociation_start_s": st.session_state.get("phase_detected_dissoc"),
        },
        "included_traces": {name: sorted(values) for name, values in st.session_state.get("include_map", {}).items()},
        "input_uncertainty": st.session_state.get("input_uncertainty_by_experiment", {}).get(st.session_state.get("selected_experiment"), input_options()),
    }


def write_project_exports(archive, data_list, selection_settings=None):
    design = st.session_state.get("dataset_design", pd.DataFrame())
    archive.writestr("data/dataset_assignments.csv", design.to_csv(index=False))
    archive.writestr("data/background_subtraction.csv", st.session_state.get("preprocessing_table", pd.DataFrame()).to_csv(index=False))
    archive.writestr("data/input_uncertainty_settings.json", json.dumps({d["filename"]: d.get("input_uncertainty", input_options()) for d in data_list}, indent=2))
    for index, d in enumerate(st.session_state.get("raw_datasets", []), 1):
        # Indexed paths cannot escape the archive, even when filenames contain slashes.
        archive.writestr(f"data/original/{index:03d}.csv", d["source_bytes"])
    archive.writestr("data/original_files.csv", pd.DataFrame([
        {"archive_file": f"data/original/{i:03d}.csv", "filename": d["filename"], "sha256": d["sha256"]}
        for i, d in enumerate(st.session_state.get("raw_datasets", []), 1)
    ]).to_csv(index=False))
    frames = []
    for d in data_list:
        for c in d["concentrations"]:
            frames.append(pd.DataFrame({"file": d["filename"], "repeat_id": d.get("repeat_id", ""),
                                        "concentration_nM": c, "time_s": d["time"],
                                        "raw_response": d.get("raw_responses", d["responses"])[c],
                                        "subtracted_background": d.get("background_responses", {}).get(c, 0),
                                        "analysis_response": d["responses"][c],
                                        "included": c in st.session_state.include_map.get(d["filename"], set())}))
    archive.writestr("data/analysis_input.csv", pd.concat(frames, ignore_index=True).to_csv(index=False) if frames else "")
    windows = st.session_state.get("fit_windows")
    sampling_time = st.session_state.get("eq_t_measure_input")
    if selection_settings:
        saved = next(iter(selection_settings.values()))
        windows = {key: saved[key] for key in ["phase_assoc_start_s", "phase_dissoc_start_s",
            "fit_assoc_start_s", "fit_assoc_end_s", "fit_dissoc_start_s", "fit_dissoc_end_s"]}
        sampling_time = selection_settings.get("Equilibrium", {}).get("equilibrium_sampling_time_s")
    if windows:
        included = st.session_state.include_map
        archive.writestr("data/fit_selection.csv", observation_table(data_list, included, windows, sampling_time).to_csv(index=False))
        archive.writestr("data/fit_selection_summary.csv", selection_summary(data_list, included, windows).to_csv(index=False))
