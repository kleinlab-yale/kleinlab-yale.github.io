"""Readable, downloadable methods without access to user datasets or fit state."""

import hashlib
import io
import json
from pathlib import Path
import zipfile

import streamlit as st

from mixa_data import APP_VERSION
from mixa_methods import bibliography, equation_record, methods_markdown, validation_evidence
from mixa_science import json_safe


ROOT = Path(__file__).resolve().parent
REPORTS = ["METHODS_VALIDATION.md", "INPUT_UNCERTAINTY.md", "BASELINE_UNCERTAINTY.md", "REFIT_REVIEW.md", "JOINT_INFERENCE.md", "FRONTIER_VALIDATION.md",
           "validation/refit_review/RESULTS.md", "validation/assisted_comparison/RESULTS.md",
           "validation/refit_review_percentile_initial/RESULTS.md", "validation/assisted_comparison_initial/RESULTS.md",
           "validation/RESULTS.md", "validation/input_uncertainty/RESULTS.md",
           "validation/baseline_uncertainty/RESULTS.md"]


def user_guide():
    return (ROOT/"USER_GUIDE.md").read_text(encoding="utf-8")


def build_documentation_bundle():
    record = equation_record()
    files = {"README.md": user_guide().encode(),
             "methods/EQUATIONS_AND_SOURCES.md": methods_markdown(record).encode(),
             "methods/equations_and_sources.json": json.dumps(json_safe(record), indent=2, allow_nan=False).encode(),
             "methods/REFERENCES.bib": bibliography(record).encode(),
             "validation/validation_evidence.json": json.dumps(json_safe(validation_evidence()), indent=2, allow_nan=False).encode()}
    for name in REPORTS:
        if (ROOT/name).is_file():
            files[f"reports/{name}"] = (ROOT/name).read_bytes()
    for section in ["calibration", "performance", "joint", "joint_sbc", "joint_initial", "joint_mala_initial",
                    "joint_preconditioner_initial", "joint_sbc_preconditioner_initial"]:
        name = f"validation/frontier_{section}/RESULTS.md"
        if (ROOT/name).is_file():
            files[f"reports/{name}"] = (ROOT/name).read_bytes()
    hashes = {name: hashlib.sha256(payload).hexdigest() for name, payload in files.items()}
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, payload in files.items():
            archive.writestr(name, payload)
        archive.writestr("MANIFEST.json", json.dumps(dict(version=APP_VERSION, sha256=hashes,
            scope="General methods documentation and bundled benchmark evidence; no user datasets or saved analysis state."), indent=2))
    return buffer.getvalue()


@st.dialog("Methods & References", width="large")
def render_methods_documentation():
    render_methods_contents()


def render_methods_contents():
    guide = user_guide()
    record = equation_record()
    st.caption(f"MIXA {APP_VERSION}. Model equations, fitting workflow, uncertainty definitions and primary sources.")
    left, right = st.columns(2)
    left.download_button("Download user guide (Markdown)", guide, "MIXA_USER_GUIDE.md", "text/markdown",
                         key="methods_download_guide", on_click="ignore")
    right.download_button("Download references (BibTeX)", bibliography(record), "MIXA_REFERENCES.bib", "text/plain",
                          key="methods_download_references", on_click="ignore")
    st.download_button("Download complete methods documentation", build_documentation_bundle(),
                       "MIXA_METHODS_DOCUMENTATION.zip", "application/zip", key="methods_download_complete", on_click="ignore")
    guide_tab, equations_tab, validation_tab = st.tabs(["User guide", "Equations & Sources", "Validation & Scope"])
    with guide_tab:
        st.markdown(guide)
    with equations_tab:
        choice = st.selectbox("Equation or method", list(record["equations"]),
                              format_func=lambda key: record["equations"][key]["title"], key="methods_equation")
        st.markdown(methods_markdown(equation_record([choice])))
    with validation_tab:
        evidence = validation_evidence()
        st.markdown("#### Bundled evidence")
        st.write(evidence["status"])
        for key, label in [("nonlinear_refit_and_blind_starts", "Nonlinear intervals and blind starts"),
                           ("assisted_correction_comparison", "Assisted correction comparison"),
                           ("calibrated_interval_study", "Experiment-specific interval calibration"),
                           ("complex_performance_study", "Advanced-model multistart performance"),
                           ("joint_repeat_study", "Joint repeat inference"),
                           ("joint_prior_generated_study", "Prior-generated joint calibration screen")]:
            if key in evidence:
                st.markdown("#### "+label)
                st.write(evidence[key]["status"])
        st.write(evidence.get("scope", ""))
        st.markdown((ROOT/"METHODS_VALIDATION.md").read_text())
