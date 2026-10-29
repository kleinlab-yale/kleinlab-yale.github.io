import io
import inspect
import json
import os
import re
import time as pytime
import zipfile
from datetime import datetime
from html import escape
from importlib import reload

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mixa_plotting import show_figure
import numpy as np
import pandas as pd
import streamlit as st
from scipy import stats
from scipy.optimize import curve_fit, least_squares, lsq_linear

from mixa_data import APP_VERSION, parse_concentration_nM
from mixa_selection import detect_binding_phases, observation_masks, selection_summary, validate_windows
from mixa_science import (CONDITIONAL_ERROR, boundary_flags, conditional_covariance,
                          delivery_lag_signal, drift_comparison, fit_profile_isotherm, gaussian_information, prediction_covariance,
                          json_safe, residual_dependence, scientific_metadata, two_state_affinity, two_state_signal)
from mixa_workspace import (invalidate_results, project_context, render_dataset_workspace,
                            write_project_exports)
from mixa_reporting import render_figure_gallery, render_publication_report
from mixa_methods import write_methods_exports
from mixa_education import render_fitting_education
from mixa_uncertainty import BASELINE_ERROR, baseline_reference, propagate_baseline
from mixa_input_uncertainty import (INPUT_ERROR, common_options, curve_input, estimator_sensitivity,
                                    isotherm_propagation, kobs_propagation, propagate_fit_inputs, requested)
import mixa_mechanisms
import mixa_mechanistic_ui
import mixa_diagnostics

# Upgrade cached helper APIs on rerun without discarding the loaded session.
if "linear_nonspecific" not in inspect.signature(mixa_mechanisms.parameter_defaults).parameters:
    reload(mixa_mechanisms)
if ("linear_nonspecific" not in inspect.signature(mixa_mechanistic_ui.render_mechanistic_workspace).parameters
        or getattr(mixa_mechanistic_ui, "DIAGNOSTICS_REVISION", 0) < 5):
    reload(mixa_diagnostics)
    reload(mixa_mechanistic_ui)
from mixa_diagnostics import render_saved_fit_diagnostics, saved_fit_curves, write_diagnostic_tables
from mixa_mechanistic_ui import render_mechanistic_workspace
from mixa_mechanisms import (MODEL_LABELS, TRANSPORT_LABELS, fit_mechanism,
                             mechanistic_to_kinetic_summary, parameter_defaults, prepare_curves)
from mixa_assistant_ui import render_fitting_assistant

# -----------------------------------------------------------------------------
# Page configuration
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title=f"MIXA {APP_VERSION} - Klein Lab @ Yale",
    page_icon="🎛️",
    layout="wide",
    initial_sidebar_state="auto",
)

# -----------------------------------------------------------------------------
# Modern color palette
# -----------------------------------------------------------------------------
COLORS = {
    "primary": "#1C5D99",
    "secondary": "#6BA7D6",
    "accent": "#D7A330",
    "success": "#1F8A62",
    "warning": "#B29200",
    "error": "#C55335",
    "teal": "#0E3D56",
    "purple": "#B7552D",
    "pink": "#D37522",
}


# -----------------------------------------------------------------------------
# Publication polish: matplotlib defaults
# -----------------------------------------------------------------------------
def set_pub_rcparams():
    plt.rcParams.update(
        {
            "figure.dpi": 120,
            "savefig.dpi": 600,
            "font.family": "serif",
            "font.serif": ["Tinos", "Liberation Serif", "Nimbus Roman No9 L", "Times New Roman", "Times", "DejaVu Serif"],
            "font.size": 12,
            "axes.titlesize": 14,
            "axes.labelsize": 13,
            "axes.linewidth": 1.2,
            "xtick.labelsize": 11,
            "ytick.labelsize": 11,
            "xtick.major.width": 1.1,
            "ytick.major.width": 1.1,
            "legend.fontsize": 9,
            "legend.frameon": False,
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
            "svg.fonttype": "none",
            "grid.alpha": 0.25,
            "grid.linestyle": "--",
        }
    )


set_pub_rcparams()


# -----------------------------------------------------------------------------
# Enhanced CSS with modern design
# -----------------------------------------------------------------------------
LEGACY_STYLES = (
    """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Tinos:wght@400;700&display=swap');

    :root {
        --paper: #f8f4eb;
        --paper-deep: #efe7d6;
        --panel: rgba(255, 252, 245, 0.88);
        --ink: #15253d;
        --muted: #5f6470;
        --line: rgba(21, 37, 61, 0.12);
        --signal: #1c5d99;
        --orange: #d37522;
        --green: #1f8a62;
        --red: #c55335;
        --warning: #b29200;
        --teal: #0e3d56;
        --shadow: 0 18px 48px rgba(21, 37, 61, 0.10);
    }

    * {
        box-sizing: border-box;
    }

    .stApp, .stMarkdown, input, textarea, button {
        font-family: 'Manrope', 'Avenir Next', 'Segoe UI', sans-serif;
    }

    .stApp {
        color: var(--ink);
        background:
            radial-gradient(circle at top left, rgba(107, 167, 214, 0.28), transparent 28%),
            radial-gradient(circle at 88% 12%, rgba(230, 126, 75, 0.24), transparent 22%),
            linear-gradient(180deg, #f8f4eb 0%, var(--paper-deep) 100%);
    }

    [data-testid="stMain"] {
        scrollbar-gutter: stable;
        overflow-anchor: none;
    }

    .block-container {
        width: 100% !important;
        max-width: 1500px !important;
        padding-top: 1.25rem !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        padding-bottom: 3rem !important;
    }

    h1, h2, h3, h4, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3, .stMarkdown h4, .metric-value, .hero-mark-name {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.02em;
        color: var(--ink);
        word-break: normal !important;
        overflow-wrap: normal !important;
        hyphens: none !important;
    }

    .app-hero {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) auto;
        gap: 1.5rem;
        align-items: start;
        margin-bottom: 1.5rem;
        padding: clamp(1rem, 2vw, 1.5rem);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: var(--shadow);
        background:
            linear-gradient(120deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.92)),
            linear-gradient(135deg, rgba(107, 167, 214, 0.08), rgba(211, 117, 34, 0.08));
    }

    .eyebrow {
        margin: 0 0 0.6rem;
        color: var(--orange) !important;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }

    .app-hero h1 {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif !important;
        font-weight: 700 !important;
        margin: 0;
        max-width: 100%;
        font-size: clamp(2rem, 3.3vw, 3.1rem);
        line-height: 1.08;
        letter-spacing: -0.03em;
        word-break: normal !important;
        overflow-wrap: normal !important;
        hyphens: none !important;
    }

    .hero-subtitle {
        margin: 0.95rem 0 0;
        max-width: 72ch;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.65;
    }

    .hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        margin-top: 1rem;
    }

    .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
    }

    .app-link-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0.72rem 1.1rem;
        border-radius: 999px;
        border: 1px solid rgba(21, 37, 61, 0.55);
        background: linear-gradient(135deg, var(--ink), #274166);
        color: #ffffff !important;
        text-decoration: none !important;
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        box-shadow: 0 12px 26px rgba(21, 37, 61, 0.16);
    }

    .app-link-button:hover {
        filter: brightness(1.02);
    }

    .app-link-button.is-secondary {
        min-height: 40px;
        padding: 0.62rem 0.95rem;
        border-color: rgba(211, 117, 34, 0.22);
        background: rgba(211, 117, 34, 0.10);
        color: var(--orange) !important;
        box-shadow: none;
    }

    .hero-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.46rem 0.82rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(15, 51, 69, 0.08);
        color: var(--teal);
        font-size: 0.82rem;
        font-weight: 700;
    }

    .hero-mark {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        justify-self: end;
        gap: 0.25rem;
        min-width: 11.5rem;
        padding: 0.9rem 1rem;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid rgba(15, 51, 69, 0.08);
        box-shadow: 0 10px 24px rgba(21, 37, 61, 0.08);
        text-align: center;
    }

    .hero-mark-name {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif !important;
        font-weight: 700 !important;
        font-size: clamp(2.2rem, 3.8vw, 3.4rem);
        line-height: 0.9;
    }

    .hero-mark-expansion {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--orange);
    }

    .sidebar-brand {
        margin-bottom: 0.7rem;
        padding: 1rem 1rem 0.95rem;
        border-radius: 22px;
        background:
            linear-gradient(120deg, rgba(255,255,255,0.86), rgba(255,255,255,0.94)),
            linear-gradient(135deg, rgba(107,167,214,0.08), rgba(211,117,34,0.08));
        border: 1px solid var(--line);
        box-shadow: 0 12px 28px rgba(21, 37, 61, 0.08);
    }

    .sidebar-brand .eyebrow {
        margin-bottom: 0.4rem;
        font-size: 0.7rem;
    }

    .sidebar-brand-name {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif;
        font-size: 2rem;
        line-height: 0.95;
        color: var(--ink);
    }

    .sidebar-brand-copy {
        margin-top: 0.35rem;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.45;
    }

    .sidebar-brand-link {
        margin-top: 0.75rem;
    }

    .sidebar-note {
        margin: 0.25rem 0 1rem;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.5;
    }

    .metric-card {
        height: 100%;
        padding: 1.2rem 1rem;
        border-radius: 20px;
        text-align: center;
        margin: 0.55rem 0;
        border: 1px solid var(--line);
        background: var(--panel);
        box-shadow: 0 10px 24px rgba(21, 37, 61, 0.08);
    }

    .metric-value {
        margin: 0.45rem 0 0.15rem;
        font-size: 2rem;
        line-height: 1;
    }

    .metric-label {
        color: var(--muted);
        font-size: 0.77rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .metric-ci {
        color: var(--orange);
        font-size: 0.8rem;
        font-weight: 700;
    }

    .quality-badge {
        display: inline-block;
        padding: 0.32rem 0.78rem;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border: 1px solid transparent;
    }

    .diag-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 0.5rem;
        align-items: flex-start;
        margin: 0.2rem 0 0.5rem;
    }

    .diag-chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.38rem;
        padding: 0.3rem 0.58rem;
        border-radius: 999px;
        background: #eef2ff;
        color: #1f2a44;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: help;
        border: 1px solid rgba(31, 42, 68, 0.08);
    }

    .diag-chip:focus-visible {
        outline: 2px solid rgba(28, 93, 153, 0.35);
        outline-offset: 2px;
    }

    .diag-chip-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        border-radius: 999px;
        background: rgba(31, 42, 68, 0.10);
        color: #1f2a44;
        font-size: 0.7rem;
        font-weight: 800;
        line-height: 1;
    }

    .diag-chip-tooltip {
        position: absolute;
        left: 0;
        top: calc(100% + 0.45rem);
        min-width: 13rem;
        max-width: min(24rem, 72vw);
        padding: 0.7rem 0.8rem;
        border-radius: 14px;
        border: 1px solid rgba(21, 37, 61, 0.12);
        background: rgba(255, 252, 245, 0.98);
        color: var(--ink);
        box-shadow: 0 16px 34px rgba(21, 37, 61, 0.14);
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1.4;
        opacity: 0;
        visibility: hidden;
        transform: translateY(4px);
        transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease;
        pointer-events: none;
        z-index: 50;
    }

    .diag-chip:hover .diag-chip-tooltip,
    .diag-chip:focus .diag-chip-tooltip,
    .diag-chip:focus-visible .diag-chip-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .badge-excellent { background: rgba(31, 138, 98, 0.14); color: var(--green); border-color: rgba(31, 138, 98, 0.18); }
    .badge-good      { background: rgba(28, 93, 153, 0.14); color: var(--signal); border-color: rgba(28, 93, 153, 0.18); }
    .badge-fair      { background: rgba(178, 146, 0, 0.14); color: var(--warning); border-color: rgba(178, 146, 0, 0.18); }
    .badge-poor      { background: rgba(197, 83, 53, 0.14); color: var(--red); border-color: rgba(197, 83, 53, 0.18); }

    .stButton > button,
    .stDownloadButton > button {
        min-height: 44px;
        padding: 0.72rem 1.2rem;
        border-radius: 999px;
        border: 1px solid rgba(21, 37, 61, 0.55);
        background: linear-gradient(135deg, var(--ink), #274166);
        color: white;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        box-shadow: 0 12px 26px rgba(21, 37, 61, 0.16);
    }

    .stButton > button:hover,
    .stDownloadButton > button:hover {
        filter: brightness(1.02);
    }

    .stTabs [data-baseweb="tab-list"] {
        gap: 0.75rem;
        padding: 0.2rem 0 0.3rem;
        background: transparent;
    }

    .stTabs [data-baseweb="tab"] {
        min-height: 50px;
        padding: 0.9rem 1.15rem;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.92);
        color: var(--ink);
        font-weight: 800;
        box-shadow: 0 8px 20px rgba(21, 37, 61, 0.08);
    }

    .stTabs [data-baseweb="tab"]:hover {
        border-color: rgba(28, 93, 153, 0.32);
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, var(--ink), #274166);
        color: white;
        border-color: rgba(21, 37, 61, 0.55);
        box-shadow: 0 14px 30px rgba(21, 37, 61, 0.22);
    }

    div[data-testid="stMetric"] {
        padding: 1rem 1rem 0.9rem;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: var(--panel);
        box-shadow: 0 10px 24px rgba(21, 37, 61, 0.08);
    }

    div[data-testid="stMetricLabel"] p {
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    div[data-testid="stMetricValue"] {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif;
        color: var(--ink);
    }

    .stAlert,
    .stExpander,
    div[data-testid="stDataFrame"] {
        border-radius: 20px !important;
    }

    .stAlert {
        border: 1px solid var(--line) !important;
        background: rgba(255, 252, 245, 0.84) !important;
    }

    .stExpander {
        border: 1px solid var(--line) !important;
        background: rgba(255, 252, 245, 0.72) !important;
        box-shadow: 0 10px 24px rgba(21, 37, 61, 0.06);
    }

    .stExpander details summary p,
    .stMarkdown p,
    .stCaption,
    label,
    .stRadio div[role="radiogroup"] label,
    .stCheckbox label {
        color: var(--ink);
    }

    .stTextInput > div > div > input,
    .stNumberInput input,
    .stTextArea textarea {
        border-radius: 16px !important;
        border: 1px solid var(--line) !important;
        background: rgba(255, 255, 255, 0.82) !important;
        color: var(--ink) !important;
        box-shadow: none !important;
    }

    section[data-testid="stSidebar"] {
        background: rgba(248, 244, 235, 0.92) !important;
    }

    section[data-testid="stSidebar"] > div {
        background:
            linear-gradient(180deg, rgba(248, 244, 235, 0.96), rgba(244, 239, 227, 0.92)) !important;
        border-right: 1px solid var(--line) !important;
    }

    section[data-testid="stSidebar"] div[data-testid="stSidebarUserContent"] {
        padding: 1rem 1rem 2rem;
    }

    .app-footer {
        margin-top: 1.25rem;
        padding: 1.4rem 1.25rem;
        border-radius: 24px;
        border: 1px solid var(--line);
        background: rgba(255, 252, 245, 0.84);
        box-shadow: 0 12px 30px rgba(21, 37, 61, 0.08);
        text-align: center;
    }

    .app-footer-title {
        font-family: 'Tinos', 'Liberation Serif', 'Nimbus Roman No9 L', 'Times New Roman', Times, serif;
        font-size: 1.45rem;
        color: var(--ink);
    }

    .app-footer-copy {
        margin-top: 0.45rem;
        color: var(--muted);
        font-size: 0.95rem;
    }

    .app-footer-note {
        margin-top: 0.7rem;
        color: var(--orange);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    @media (max-width: 768px) {
        .block-container {
            width: calc(100% - 1rem) !important;
            padding-top: 0.85rem !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-bottom: 1.4rem !important;
        }

        .app-hero {
            grid-template-columns: 1fr;
            padding: 1.2rem;
            border-radius: 18px;
            margin-bottom: 1rem;
        }

        .app-hero h1 {
            font-size: 1.9rem;
            line-height: 1.08;
        }

        .hero-subtitle {
            font-size: 0.92rem;
        }

        .hero-mark {
            justify-self: start;
            min-width: 0;
            width: 100%;
        }

        .metric-card {
            padding: 1rem 0.9rem;
            border-radius: 16px;
            margin: 0.4rem 0;
        }

        .metric-value {
            font-size: 1.6rem;
        }

        .stTabs [data-baseweb="tab"] {
            min-height: 44px;
            padding: 0.8rem 0.95rem;
            font-size: 0.84rem;
        }

        [data-testid="stHorizontalBlock"] {
            gap: 0.35rem !important;
        }

        [data-testid="column"] {
            min-width: 100% !important;
            flex: 1 1 100% !important;
        }
    }

</style>
""",
)


# ============================================================================
# SCORING HELPERS
# ============================================================================

SECTION_INTROS = {
    "Data Input": (
        "Binding Dataset Intake",
        "Upload, group, and curate kinetic or equilibrium traces before fitting.",
    ),
    "Kinetic Analysis": (
        "Global Kinetic Fitting",
        "Estimate shared or curve-wise binding kinetics, inspect residual structure, and export publication-grade overlays from the same workspace.",
    ),
    "kobs Linearization": (
        "kobs Linearization",
        "Fit association rates and evaluate their concentration dependence.",
    ),
    "Equilibrium Analysis": (
        "Equilibrium Binding",
        "Fit binding isotherms and assess whether the sampled responses have reached steady state.",
    ),
    "Model Comparison": (
        "Cross-Method Comparison",
        "Line up kinetic, equilibrium, and kobs-derived affinity estimates so disagreements are visible.",
    ),
    "Kinetic Model Selector": (
        "Model Selection",
        "Compare kinetic models and inspect parameter estimates and residuals.",
    ),
    "Publication Report": (
        "Publication Report",
        "Review independent repeats, confidence intervals, figures, and analysis records.",
    ),
}

WORKFLOW_STEPS = [
    {
        "id": "Data Input",
        "label": "01 / Data Input",
        "caption": "Files, repeats, controls, phases",
    },
    {
        "id": "Kinetic Analysis",
        "label": "02 / Kinetic Analysis",
        "caption": "Association and dissociation",
    },
    {
        "id": "kobs Linearization",
        "label": "03 / kobs Linearization",
        "caption": "Concentration-dependent rates",
    },
    {
        "id": "Equilibrium Analysis",
        "label": "04 / Equilibrium Analysis",
        "caption": "Steady-state isotherm",
    },
    {
        "id": "Model Comparison",
        "label": "05 / Model Comparison",
        "caption": "Agreement and diagnostics",
    },
    {
        "id": "Publication Report",
        "label": "06 / Publication Report",
        "caption": "Repeat statistics and figures",
    },
    {
        "id": "Kinetic Model Selector",
        "label": "Optional: Model Selector",
        "caption": "Alternative kinetic models",
    },
]

KINETIC_BINDING_MODELS = {
    "1:1 Langmuir": "langmuir",
    "1:1 + Delivery Lag": None,
    "2-State (Advanced)": "two_state",
    **{MODEL_LABELS[key]: key for key in ["heterogeneous", "bivalent", "sequential"]},
}

KINETIC_STARTING_SETTINGS = {
    "binding_model_select": "1:1 Langmuir",
    "advanced_transport": "None",
    "advanced_ns": False,
    "kinetic_custom_controls": False,
    "normalize_baseline": True,
    "correct_drift": False,
    "include_nonspecific": False,
}


def render_app_hero(active_section, dataset_count):
    title, subtitle = SECTION_INTROS.get(
        active_section,
        ("MIXA Workspace", "Kinetic and equilibrium binding analysis for the Klein Lab at Yale."),
    )
    dataset_text = "No datasets loaded yet" if dataset_count == 0 else f"{dataset_count} dataset{'s' if dataset_count != 1 else ''} loaded"
    st.markdown(
        f"""
        <section class="app-hero">
            <div>
                <p class="eyebrow">Yale School of Medicine • Klein Lab</p>
                <h1>{escape(title)}</h1>
                <p class="hero-subtitle">{escape(subtitle)}</p>
                <div class="hero-pills">
                    <span class="hero-pill">{escape(active_section)}</span>
                    <span class="hero-pill">{escape(dataset_text)}</span>
                    <span class="hero-pill">Version {APP_VERSION}</span>
                </div>
            </div>
            <aside class="hero-mark" aria-label="Program title">
                <span class="hero-mark-name">MIXA</span>
                <span class="hero-mark-expansion">Molecular InteraXion Analysis</span>
            </aside>
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_app_footer():
    st.markdown(
        """
        <section class="app-footer">
            <div class="app-footer-title">MIXA</div>
            <div class="app-footer-copy">Kinetic and equilibrium biomolecular interaction analysis for the Klein Lab at Yale.</div>
            <div class="app-footer-note">Designed by EwaldsSphere • Research use only</div>
        </section>
        """,
        unsafe_allow_html=True,
    )


def clamp(value, low=0.0, high=100.0):
    return float(np.clip(value, low, high))


def score_color(score):
    if score >= 85:
        return COLORS["success"]
    if score >= 70:
        return COLORS["warning"]
    return COLORS["error"]


def score_label(score):
    if score >= 85:
        return "Good"
    if score >= 70:
        return "Caution"
    return "Poor"


def cv_to_score(values, max_good_cv=0.3):
    values = np.array(values, dtype=float)
    if len(values) < 2:
        return 50.0
    mean_abs = np.abs(values.mean())
    if mean_abs < 1e-30:
        return 50.0
    cv = float(values.std(ddof=0) / mean_abs)
    return clamp(100.0 * (1.0 - min(cv / max_good_cv, 1.0)))


def fit_result_total_rss(result):
    if (result is None) or ("individual_fits" not in result):
        return np.inf
    rss_total = 0.0
    for fit in result.get("individual_fits", []):
        residuals = np.asarray(fit.get("residuals_fit", fit.get("residuals", [])), dtype=float)
        if residuals.size > 0:
            rss_total += float(np.sum(residuals**2))
    return float(rss_total)


def kinetic_boundary_parameters(kon, koff):
    """Identify rates numerically pinned to the bounds used by kinetic solvers."""
    return [name for name, value, lo, hi in [("k_on", kon, 1e2, 1e9), ("k_off", koff, 1e-8, 10.)]
            if value <= lo * (1 + 1e-5) or value >= hi * (1 - 1e-5)]


DIAGNOSTIC_EXPLANATIONS = {
    "residual_time": "Checks whether fit errors stay centered around zero across time, without drift trends.",
    "fit_quality": "Summarizes per-curve fit quality from R², residual normality, and residual randomness.",
    "residual_hist": "Checks whether residual errors are approximately bell-shaped rather than skewed.",
    "qq_plot": "Checks whether residual quantiles follow a normal line, indicating non-systematic errors.",
    "kobs": "Tests concentration dependence of apparent rate; linear k_obs is expected for simple 1:1, model-based score otherwise.",
    "kon_dist": "Describes curve-wise k_on estimates across files and concentrations; these are not independent-repeat statistics.",
    "koff_dist": "Describes curve-wise k_off estimates across files and concentrations; these are not independent-repeat statistics.",
    "kd_dist": "Describes curve-wise K_D estimates across files and concentrations; use repeat refits for publication uncertainty.",
    "kobs_linearity": "Checks whether concentration-averaged kobs values follow a linear kobs = kass*[A] + kdiss relationship.",
    "kobs_assoc_fit": "Checks quality of the per-curve association exponential fits used to estimate kobs.",
    "kobs_repeat_consistency": "Checks repeat-to-repeat spread in kobs at matched concentrations.",
    "kobs_coverage": "Checks concentration-series strength (number of concentrations and dynamic span) for robust linearization.",
    "eq_isotherm_fit": "Checks how well the equilibrium isotherm model explains response vs concentration (R²).",
    "eq_residual_error": "Checks residual error size relative to response spread; lower normalized RMSE is better.",
    "eq_flatness": "Checks whether pre-sampling windows are flat enough to support true equilibrium sampling.",
    "eq_repeat_precision": "Checks repeat variability at each concentration; tighter repeat spread increases confidence.",
}


MODEL_SELECTOR_TO_BINDING_OPTION = {
    "1:1 Langmuir": "1:1 Langmuir",
    "1:1 + Delivery Lag": "1:1 + Delivery Lag",
    "1:1 + Mass Transport": "1:1 + Delivery Lag",
    "2-State": "2-State (Advanced)",
}


def infer_repeat_group(filename):
    stem = os.path.splitext(os.path.basename(filename))[0]
    m = re.match(r"^(.*?)[_-]?rep(?:licate)?[_-]?\d+$", stem, flags=re.IGNORECASE)
    if m and m.group(1):
        group = m.group(1).strip("_- ")
        return group if group else stem
    return stem


def assign_repeat_groups(data_list, mode):
    for data in data_list:
        if "experiment" in data:
            data["repeat_group"] = data["experiment"]
            continue
        fn = data.get("filename", "unknown")
        if mode == "Filename prefix before _rep":
            data["repeat_group"] = infer_repeat_group(fn)
        else:
            data["repeat_group"] = fn


def render_diagnostic_legend(diag_summary):
    panels = diag_summary.get("panels", {})
    if not panels:
        return

    chips = []
    for key, panel in panels.items():
        desc = escape(DIAGNOSTIC_EXPLANATIONS.get(key, "Diagnostic panel metric."), quote=True)
        name = escape(panel.get("name", key), quote=True)
        chips.append(
            f'<span class="diag-chip" tabindex="0">'
            f'<span class="diag-chip-label">{name}</span>'
            f'<span class="diag-chip-icon" aria-hidden="true">i</span>'
            f'<span class="diag-chip-tooltip">{desc}</span>'
            f"</span>"
        )
    st.markdown(f'<div class="diag-chip-row">{"".join(chips)}</div>', unsafe_allow_html=True)


def apply_suggested_binding_model(model_label):
    mapped = MODEL_SELECTOR_TO_BINDING_OPTION.get(model_label)
    if not mapped:
        st.session_state.model_apply_notice = f"Could not map suggested model '{model_label}' to kinetic fitting."
        return
    st.session_state.binding_model_select = mapped
    st.session_state.advanced_transport = "None"
    st.session_state.advanced_ns = False
    st.session_state.kinetic_custom_controls = False
    st.session_state.model_apply_notice = f"Applied suggested model: {mapped}"


# ============================================================================
# ADVANCED STATISTICS
# ============================================================================


def calculate_aic_bic(residuals, n_params):
    criteria = gaussian_information(residuals, n_params)
    return criteria["aic"], criteria["bic"]


def calculate_quality_score(r_squared, residuals):
    r2_score = clamp(r_squared * 70.0)

    if len(residuals) > 8:
        sample = residuals[:5000] if len(residuals) > 5000 else residuals
        if np.ptp(sample) > 0:
            _, p_value = stats.shapiro(sample)
            normality_score = 15.0 * min(1.0, p_value / 0.02)
        else:
            normality_score = 7.5
    else:
        normality_score = 7.5

    runs = 0
    for i in range(1, len(residuals)):
        if (residuals[i] > 0) != (residuals[i - 1] > 0):
            runs += 1
    expected_runs = (len(residuals) - 1) / 2
    randomness_score = 15.0 * min(runs / expected_runs, 1.0) if expected_runs > 0 else 0.0

    return clamp(r2_score + normality_score + randomness_score)


def detect_mass_transport(concs_M, k_obs_values):
    if len(concs_M) < 3:
        return False, "Insufficient data", 1.0

    slope, intercept, r_value, p_value, std_err = stats.linregress(concs_M, k_obs_values)
    r_squared = r_value**2
    if r_squared < 0.85:
        return True, f"Non-linear k_obs vs [C] (R² = {r_squared:.3f})", float(r_squared)

    return False, f"Linear k_obs vs [C] (R² = {r_squared:.3f})", float(r_squared)


def estimate_pre_association_drift(time, response, t_start):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    baseline_mask = time < float(t_start)
    if np.sum(baseline_mask) < 6:
        return 0.0

    t_pre = time[baseline_mask]
    y_pre = response[baseline_mask]

    try:
        slope, _intercept, _lo, _hi = stats.theilslopes(y_pre, t_pre, alpha=0.90)
        if np.isfinite(slope):
            return float(slope)
    except Exception:
        pass

    try:
        slope = np.polyfit(t_pre, y_pre, 1)[0]
        if np.isfinite(slope):
            return float(slope)
    except Exception:
        pass

    return 0.0


def prepare_response_for_fit(time, response, t_start, normalize=True, correct_drift=False, fit_mask=None):
    time = np.asarray(time, dtype=float)
    raw_response = np.asarray(response, dtype=float).copy()
    baseline_mask = time < float(t_start)

    if np.any(baseline_mask):
        baseline_level = float(np.median(raw_response[baseline_mask]))
    else:
        baseline_level = 0.0

    if normalize:
        response_fit = raw_response - baseline_level
        model_baseline = 0.0
        display_offset = baseline_level
    else:
        response_fit = raw_response
        model_baseline = baseline_level
        display_offset = 0.0

    drift_prior = estimate_pre_association_drift(time, response_fit, t_start) if correct_drift else 0.0
    total_time = max(float(time[-1] - time[0]), 1e-9) if len(time) > 1 else 1.0
    selected_response = response_fit[np.asarray(fit_mask, dtype=bool)] if fit_mask is not None else response_fit
    response_span = max(float(np.percentile(selected_response, 95) - np.percentile(selected_response, 5)), 1e-8) if len(selected_response) else 1.0
    drift_scale = max(abs(drift_prior) * 4.0, 0.25 * response_span / total_time, 1e-6)

    return response_fit, {
        "drift_slope": 0.0,
        "drift_trend": np.zeros_like(time, dtype=float),
        "drift_applied": False,
        "drift_confidence": 0.0,
        "drift_prior": float(drift_prior),
        "drift_scale": float(drift_scale),
        "baseline_level": float(baseline_level),
        "display_offset": float(display_offset),
        "model_baseline": float(model_baseline),
        **baseline_reference(time, t_start),
    }


def build_phase_region_mask(
    time,
    setup_assoc_start,
    setup_dissoc_start,
    assoc_fit_start=None,
    assoc_fit_end=None,
    dissoc_fit_start=None,
    dissoc_fit_end=None,
):
    time = np.asarray(time, dtype=float)
    if len(time) == 0:
        return np.array([], dtype=bool)

    t_max = float(np.max(time))

    if assoc_fit_start is None:
        assoc_fit_start = setup_assoc_start
    if assoc_fit_end is None:
        assoc_fit_end = setup_dissoc_start
    if dissoc_fit_start is None:
        dissoc_fit_start = setup_dissoc_start
    if dissoc_fit_end is None:
        dissoc_fit_end = t_max

    return observation_masks(time, {
        "phase_assoc_start_s": setup_assoc_start, "phase_dissoc_start_s": setup_dissoc_start,
        "fit_assoc_start_s": assoc_fit_start, "fit_assoc_end_s": assoc_fit_end,
        "fit_dissoc_start_s": dissoc_fit_start, "fit_dissoc_end_s": dissoc_fit_end,
    })["kinetic"]


def estimate_kinetic_start_points(time, response, conc_M, t_start, t_end):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)

    assoc_mask = (time >= t_start) & (time <= t_end)
    dissoc_mask = time > t_end

    rmax_guess = max(float(np.max(response) - np.min(response)), 1e-6)
    koff_guess = 1e-3
    kon_guess = 1e5
    kmt_guess = 0.5

    if np.any(assoc_mask):
        y_assoc = response[assoc_mask]
        assoc_span = float(np.percentile(y_assoc, 95) - np.percentile(y_assoc, 5))
        rmax_guess = max(rmax_guess, assoc_span, float(np.max(y_assoc)) if len(y_assoc) else rmax_guess)

    if np.any(dissoc_mask):
        td = time[dissoc_mask] - float(t_end)
        yd = response[dissoc_mask]
        mask = yd > max(1e-12, np.percentile(yd, 25))
        if np.sum(mask) >= 4:
            try:
                slope, _ = np.polyfit(td[mask], np.log(np.maximum(yd[mask], 1e-12)), 1)
                koff_guess = float(np.clip(-slope, 1e-6, 1.0))
            except Exception:
                pass

    if np.any(assoc_mask):
        ta = time[assoc_mask] - float(t_start)
        ya = response[assoc_mask]
        y_top = max(float(np.percentile(ya, 95)), 1e-9)
        frac = np.clip(ya / y_top, 1e-6, 0.98)
        mask = (frac > 0.05) & (frac < 0.95)
        if np.sum(mask) >= 4:
            try:
                slope, _ = np.polyfit(ta[mask], np.log(1.0 - frac[mask]), 1)
                kobs = float(np.clip(-slope, 1e-5, 10.0))
                kon_guess = float(np.clip((kobs - koff_guess) / max(conc_M, 1e-15), 1e2, 1e9))
            except Exception:
                pass

    return kon_guess, koff_guess, rmax_guess, kmt_guess


def downsample_trace(time, response, max_points=None):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    if (max_points is None) or (max_points <= 0) or (len(time) <= int(max_points)):
        return time, response
    idx = np.linspace(0, len(time) - 1, int(max_points), dtype=int)
    idx = np.unique(idx)
    return time[idx], response[idx]


def downsample_curve_object(curve, max_points=None):
    if (max_points is None) or (max_points <= 0):
        return curve
    t = np.asarray(curve["time"], dtype=float)
    y = np.asarray(curve["response"], dtype=float)
    if len(t) <= int(max_points):
        return curve
    idx = np.linspace(0, len(t) - 1, int(max_points), dtype=int)
    idx = np.unique(idx)
    new_curve = dict(curve)
    new_curve["time"] = t[idx]
    new_curve["response"] = y[idx]
    if "baseline_mask" in curve:
        new_curve["baseline_mask"] = np.asarray(curve["baseline_mask"], bool)[idx]
    fit_mask = curve.get("fit_mask")
    if fit_mask is not None:
        m = np.asarray(fit_mask)
        if len(m) == len(t):
            new_curve["fit_mask"] = m[idx]
    drift_trend = curve.get("drift_trend")
    if drift_trend is not None:
        d = np.asarray(drift_trend)
        if len(d) == len(t):
            new_curve["drift_trend"] = d[idx]
    return new_curve


def multi_start_curve_fit(fit_func, time, response, p0, bounds, scales, maxfev, max_starts=None, max_runtime_s=None):
    lb = np.asarray(bounds[0], dtype=float)
    ub = np.asarray(bounds[1], dtype=float)
    p0 = np.asarray(p0, dtype=float)
    fit_func.parameter_bounds = (lb, ub)
    best = None
    t0 = pytime.perf_counter()

    scale_candidates = list(scales)
    if max_starts is not None and int(max_starts) > 0:
        scale_candidates = scale_candidates[: int(max_starts)]

    for scale_vec in scale_candidates:
        if (max_runtime_s is not None) and ((pytime.perf_counter() - t0) > float(max_runtime_s)):
            break
        trial = np.clip(p0 * np.asarray(scale_vec, dtype=float), lb, ub)
        try:
            popt, pcov = curve_fit(
                fit_func,
                time,
                response,
                p0=trial,
                bounds=bounds,
                x_scale="jac",
                maxfev=maxfev,
            )
            residuals = response - fit_func(time, *popt)
            rss = float(np.sum(residuals**2))
            if best is None or rss < best["rss"]:
                best = {"popt": popt, "pcov": pcov, "rss": rss}
        except Exception:
            continue

    if best is None:
        raise RuntimeError("No fit converged from candidate initial guesses.")
    info = prediction_covariance(fit_func, time, response, best["popt"], bounds)
    covariance = info.pop("covariance")
    fit_func.covariance_diagnostics = info
    return best["popt"], covariance if covariance is not None else np.full_like(best["pcov"], np.nan)


# ============================================================================
# ENHANCED BINDING MODELS
# ============================================================================


def non_specific_linear_component(t, C, ns_coeff, t_start, t_end):
    t = np.asarray(t, dtype=float)
    comp = np.zeros_like(t, dtype=float)
    if abs(ns_coeff) < 1e-30:
        return comp

    assoc_mask = (t >= t_start) & (t <= t_end)
    if np.any(assoc_mask):
        comp[assoc_mask] = ns_coeff * C * (t[assoc_mask] - t_start)

    diss_mask = t > t_end
    if np.any(diss_mask):
        ns_end = ns_coeff * C * max(t_end - t_start, 0.0)
        comp[diss_mask] = ns_end
    return comp


def model_1to1(t, kon, koff, Rmax, C, t_start, t_end, baseline=0, drift=0, ns_coeff=0):
    response = np.zeros_like(t, dtype=float)

    baseline_mask = t < t_start
    response[baseline_mask] = baseline + drift * (t[baseline_mask] - t_start)

    assoc_mask = (t >= t_start) & (t <= t_end)
    if np.any(assoc_mask):
        t_assoc = t[assoc_mask] - t_start
        k_obs = kon * C + koff
        req = Rmax * (kon * C) / max(k_obs, 1e-30)
        response[assoc_mask] = req * (1 - np.exp(-k_obs * t_assoc)) + baseline + drift * (t[assoc_mask] - t_start)

    dissoc_mask = t > t_end
    if np.any(dissoc_mask):
        t_at_end = t_end - t_start
        k_obs = kon * C + koff
        req = Rmax * (kon * C) / max(k_obs, 1e-30)
        R0 = req * (1 - np.exp(-k_obs * t_at_end))
        t_dissoc = t[dissoc_mask] - t_end
        response[dissoc_mask] = R0 * np.exp(-koff * t_dissoc) + baseline + drift * (t[dissoc_mask] - t_start)

    response = response + non_specific_linear_component(t, C, ns_coeff, t_start, t_end)
    return response


def model_2_state(t, kon, koff, Rmax, ka, kd, C, t_start, t_end, baseline=0, drift=0, ns_coeff=0):
    t = np.asarray(t, dtype=float)
    return (two_state_signal(t, kon, koff, Rmax, ka, kd, C, t_start, t_end)
            + baseline + drift * (t - t_start)
            + non_specific_linear_component(t, C, ns_coeff, t_start, t_end))


def model_1to1_mass_transport(t, kon, koff, Rmax, kmt, C, t_start, t_end, baseline=0, drift=0, ns_coeff=0):
    # Keep the legacy function/code alias for saved projects; this is a delivery lag.
    t = np.asarray(t, dtype=float)
    return (delivery_lag_signal(t, kon, koff, Rmax, kmt, C, t_start, t_end)
            + baseline + drift * (t - t_start)
            + non_specific_linear_component(t, C, ns_coeff, t_start, t_end))


def equilibrium_binding(C, Rmax, KD):
    return Rmax * C / (KD + C)


def hill_equation(C, Rmax, KD, n):
    return Rmax * (C**n) / (KD**n + C**n)


# ============================================================================
# FITTING ENGINE
# ============================================================================


def fit_kinetics_advanced(
    time,
    response,
    conc_M,
    t_start,
    t_end,
    normalize=True,
    correct_drift=False,
    include_nonspecific=False,
    model="1:1",
    show_warnings=True,
    enforce_drift_guardrail=True,
    fit_mask=None,
):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    time_full = time
    response_full = response

    if correct_drift and enforce_drift_guardrail:
        drift_candidate = fit_kinetics_advanced(
            time,
            response,
            conc_M,
            t_start,
            t_end,
            normalize=normalize,
            correct_drift=True,
            include_nonspecific=include_nonspecific,
            model=model,
            show_warnings=False,
            enforce_drift_guardrail=False,
            fit_mask=fit_mask,
        )
        nodrift_candidate = fit_kinetics_advanced(
            time,
            response,
            conc_M,
            t_start,
            t_end,
            normalize=normalize,
            correct_drift=False,
            include_nonspecific=include_nonspecific,
            model=model,
            show_warnings=False,
            enforce_drift_guardrail=False,
            fit_mask=fit_mask,
        )

        if drift_candidate is None and nodrift_candidate is None:
            if show_warnings:
                st.warning("Fit failed with and without drift correction.")
            return None
        if drift_candidate is None:
            nodrift_candidate["drift_guardrail"] = "fallback_no_drift_fit_failed_with_drift"
            nodrift_candidate["drift_guardrail_message"] = "Drift-enabled fit failed; using no-drift fit."
            nodrift_candidate["drift_delta_rss_pct"] = np.nan
            return nodrift_candidate
        if nodrift_candidate is None:
            drift_candidate["drift_guardrail"] = "accept_drift_no_nodrift_solution"
            drift_candidate["drift_guardrail_message"] = "No-drift fit failed; keeping drift-enabled fit."
            drift_candidate["drift_delta_rss_pct"] = np.nan
            return drift_candidate

        rss_drift = float(drift_candidate.get("rss_fit", np.sum(np.asarray(drift_candidate.get("residuals", []), dtype=float) ** 2)))
        rss_nodrift = float(
            nodrift_candidate.get("rss_fit", np.sum(np.asarray(nodrift_candidate.get("residuals", []), dtype=float) ** 2))
        )
        delta_pct = 100.0 * (rss_nodrift - rss_drift) / max(rss_nodrift, 1e-30)
        comparison = drift_comparison(nodrift_candidate, drift_candidate)

        if comparison["accepted"]:
            drift_candidate["drift_guardrail"] = "accept_drift_aicc_support"
            drift_candidate["drift_guardrail_message"] = comparison["reason"]
            drift_candidate["drift_comparison"] = comparison
            drift_candidate["drift_delta_rss_pct"] = float(delta_pct)
            return drift_candidate

        nodrift_candidate["drift_guardrail"] = "reject_drift_non_improving"
        nodrift_candidate["drift_guardrail_message"] = comparison["reason"]
        nodrift_candidate["drift_comparison"] = comparison
        nodrift_candidate["drift_delta_rss_pct"] = float(delta_pct)
        nodrift_candidate["drift_applied"] = False
        nodrift_candidate["drift_slope"] = 0.0
        nodrift_candidate["drift_confidence"] = 0.0
        return nodrift_candidate

    if fit_mask is None:
        fit_mask_arr = time_full >= t_start
    else:
        fit_mask_arr = np.asarray(fit_mask, dtype=bool)
        if len(fit_mask_arr) != len(time_full):
            raise ValueError("The fit mask must contain one entry per observation.")
    if int(np.sum(fit_mask_arr)) < 10:
        if show_warnings:
            st.warning("Selected phase boundaries leave too few points for fitting.")
        return None

    response_fit_full, prep = prepare_response_for_fit(
        time_full, response_full, t_start=t_start, normalize=normalize,
        correct_drift=correct_drift, fit_mask=fit_mask_arr,
    )

    time = time_full[fit_mask_arr]
    response_fit = response_fit_full[fit_mask_arr]

    model_baseline = prep["model_baseline"]
    drift_prior = float(prep.get("drift_prior", 0.0))
    drift_scale = float(max(prep.get("drift_scale", 1e-6), 1e-6))
    drift_lower = drift_prior - drift_scale
    drift_upper = drift_prior + drift_scale
    assoc_span = max(float(t_end - t_start), 1e-9)
    response_span = max(float(np.percentile(response_fit, 95) - np.percentile(response_fit, 5)), 1e-9) if len(response_fit) else 1.0
    ns_scale = max(response_span / max(conc_M * assoc_span, 1e-18), 1e-6)
    ns_lower = -4.0 * ns_scale
    ns_upper = 4.0 * ns_scale

    kon_guess, koff_guess, Rmax_guess, kmt_guess = estimate_kinetic_start_points(
        time, response_fit, conc_M, t_start, t_end
    )

    try:
        drift_fit = 0.0
        ns_fit = 0.0
        if model == "1:1":
            if correct_drift and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, drift, ns):
                    return model_1to1(
                        t, kon, koff, Rmax, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, drift_prior, 0.0],
                    bounds=(
                        [1e2, 1e-8, 0.0, drift_lower, ns_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), drift_upper, ns_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.25, 1.5, 1.0, 0.5, 0.5],
                        [4.0, 0.5, 1.2, 2.0, 2.0],
                        [1.0, 0.25, 0.7, 0.25, 0.25],
                        [1.0, 4.0, 1.4, 1.5, 1.5],
                    ],
                    maxfev=28000,
                )
                kon, koff, Rmax, drift_fit, ns_fit = popt
            elif correct_drift and not include_nonspecific:

                def fit_func(t, kon, koff, Rmax, drift):
                    return model_1to1(t, kon, koff, Rmax, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=0.0)

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, drift_prior],
                    bounds=([1e2, 1e-8, 0.0, drift_lower], [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), drift_upper]),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0],
                        [0.25, 1.5, 1.0, 0.5],
                        [4.0, 0.5, 1.2, 2.0],
                        [1.0, 0.25, 0.7, 0.25],
                        [1.0, 4.0, 1.4, 1.5],
                    ],
                    maxfev=25000,
                )
                kon, koff, Rmax, drift_fit = popt
            elif (not correct_drift) and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, ns):
                    return model_1to1(
                        t, kon, koff, Rmax, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, 0.0],
                    bounds=([1e2, 1e-8, 0.0, ns_lower], [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), ns_upper]),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0],
                        [0.25, 1.5, 1.0, 0.5],
                        [4.0, 0.5, 1.2, 2.0],
                        [1.0, 0.25, 0.7, 0.25],
                        [1.0, 4.0, 1.4, 1.5],
                    ],
                    maxfev=24000,
                )
                kon, koff, Rmax, ns_fit = popt
            else:

                def fit_func(t, kon, koff, Rmax):
                    return model_1to1(t, kon, koff, Rmax, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=0.0)

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess],
                    bounds=([1e2, 1e-8, 0.0], [1e9, 10.0, max(Rmax_guess * 20.0, 1.0)]),
                    scales=[
                        [1.0, 1.0, 1.0],
                        [0.25, 1.5, 1.0],
                        [4.0, 0.5, 1.2],
                        [1.0, 0.25, 0.7],
                        [1.0, 4.0, 1.4],
                    ],
                    maxfev=20000,
                )
                kon, koff, Rmax = popt

        elif model == "2-state":
            if correct_drift and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, ka, kd, drift, ns):
                    return model_2_state(
                        t, kon, koff, Rmax, ka, kd, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, 5e-3, 5e-3, drift_prior, 0.0],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-6, 1e-6, drift_lower, ns_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 10.0, 10.0, drift_upper, ns_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.5, 2.0, 1.2, 0.5, 2.0, 0.5, 0.5],
                        [2.0, 0.5, 0.9, 2.0, 0.5, 2.0, 2.0],
                    ],
                    maxfev=43000,
                )
                kon, koff, Rmax, ka, kd, drift_fit, ns_fit = popt
            elif correct_drift and not include_nonspecific:

                def fit_func(t, kon, koff, Rmax, ka, kd, drift):
                    return model_2_state(
                        t, kon, koff, Rmax, ka, kd, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=0.0
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, 5e-3, 5e-3, drift_prior],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-6, 1e-6, drift_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 10.0, 10.0, drift_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.5, 2.0, 1.2, 0.5, 2.0, 0.5],
                        [2.0, 0.5, 0.9, 2.0, 0.5, 2.0],
                    ],
                    maxfev=40000,
                )
                kon, koff, Rmax, ka, kd, drift_fit = popt
            elif (not correct_drift) and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, ka, kd, ns):
                    return model_2_state(
                        t, kon, koff, Rmax, ka, kd, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, 5e-3, 5e-3, 0.0],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-6, 1e-6, ns_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 10.0, 10.0, ns_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.5, 2.0, 1.2, 0.5, 2.0, 0.5],
                        [2.0, 0.5, 0.9, 2.0, 0.5, 2.0],
                    ],
                    maxfev=34000,
                )
                kon, koff, Rmax, ka, kd, ns_fit = popt
            else:

                def fit_func(t, kon, koff, Rmax, ka, kd):
                    return model_2_state(
                        t, kon, koff, Rmax, ka, kd, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=0.0
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, 5e-3, 5e-3],
                    bounds=([1e2, 1e-8, 0.0, 1e-6, 1e-6], [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 10.0, 10.0]),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.5, 2.0, 1.2, 0.5, 2.0],
                        [2.0, 0.5, 0.9, 2.0, 0.5],
                    ],
                    maxfev=30000,
                )
                kon, koff, Rmax, ka, kd = popt

        elif model == "1:1+MT":
            if correct_drift and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, kmt, drift, ns):
                    return model_1to1_mass_transport(
                        t, kon, koff, Rmax, kmt, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, kmt_guess, drift_prior, 0.0],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-3, drift_lower, ns_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 100.0, drift_upper, ns_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.4, 2.0, 1.0, 0.5, 0.5, 0.5],
                        [2.5, 0.4, 1.2, 2.0, 2.0, 2.0],
                        [1.0, 1.0, 0.8, 0.2, 0.25, 0.25],
                    ],
                    maxfev=33000,
                )
                kon, koff, Rmax, kmt, drift_fit, ns_fit = popt
            elif correct_drift and not include_nonspecific:

                def fit_func(t, kon, koff, Rmax, kmt, drift):
                    return model_1to1_mass_transport(
                        t, kon, koff, Rmax, kmt, conc_M, t_start, t_end, baseline=model_baseline, drift=drift, ns_coeff=0.0
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, kmt_guess, drift_prior],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-3, drift_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 100.0, drift_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.4, 2.0, 1.0, 0.5, 0.5],
                        [2.5, 0.4, 1.2, 2.0, 2.0],
                        [1.0, 1.0, 0.8, 0.2, 0.25],
                    ],
                    maxfev=30000,
                )
                kon, koff, Rmax, kmt, drift_fit = popt
            elif (not correct_drift) and include_nonspecific:

                def fit_func(t, kon, koff, Rmax, kmt, ns):
                    return model_1to1_mass_transport(
                        t, kon, koff, Rmax, kmt, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=ns
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, kmt_guess, 0.0],
                    bounds=(
                        [1e2, 1e-8, 0.0, 1e-3, ns_lower],
                        [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 100.0, ns_upper],
                    ),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0, 1.0],
                        [0.4, 2.0, 1.0, 0.5, 0.5],
                        [2.5, 0.4, 1.2, 2.0, 2.0],
                        [1.0, 1.0, 0.8, 0.2, 0.25],
                    ],
                    maxfev=28000,
                )
                kon, koff, Rmax, kmt, ns_fit = popt
            else:

                def fit_func(t, kon, koff, Rmax, kmt):
                    return model_1to1_mass_transport(
                        t, kon, koff, Rmax, kmt, conc_M, t_start, t_end, baseline=model_baseline, drift=0.0, ns_coeff=0.0
                    )

                popt, pcov = multi_start_curve_fit(
                    fit_func,
                    time,
                    response_fit,
                    p0=[kon_guess, koff_guess, Rmax_guess, kmt_guess],
                    bounds=([1e2, 1e-8, 0.0, 1e-3], [1e9, 10.0, max(Rmax_guess * 20.0, 1.0), 100.0]),
                    scales=[
                        [1.0, 1.0, 1.0, 1.0],
                        [0.4, 2.0, 1.0, 0.5],
                        [2.5, 0.4, 1.2, 2.0],
                        [1.0, 1.0, 0.8, 0.2],
                    ],
                    maxfev=25000,
                )
                kon, koff, Rmax, kmt = popt
        else:
            raise ValueError("Unknown model")

        baseline_uncertainty = dict(applied=False)
        if prep["baseline_estimated"] and np.isfinite(pcov).all() and hasattr(fit_func, "parameter_bounds"):
            reference_curve = dict(time=time_full, fit_mask=fit_mask_arr, on=t_start,
                                   baseline_trend=drift_fit, baseline_estimated=True,
                                   baseline_mask=prep["baseline_mask"], baseline_reference_times=prep["baseline_reference_times"])
            covariance_info = prediction_covariance(fit_func, time, response_fit, popt, fit_func.parameter_bounds,
                                                    reference_curves=[reference_curve])
            propagated = covariance_info.pop("covariance")
            covariance_info.pop("conditional_on_baseline_covariance", None)
            baseline_uncertainty = covariance_info.get("baseline_uncertainty", {})
            fit_func.covariance_diagnostics = covariance_info
            pcov = propagated if propagated is not None else np.full_like(pcov, np.nan)
        perr = np.sqrt(np.diag(pcov))
        if model == "1:1":
            if correct_drift and include_nonspecific:
                kon_err, koff_err, Rmax_err, drift_err, ns_err = perr
                extra_err = {"drift_err": float(drift_err), "nonspecific_err": float(ns_err)}
                n_params = 5
            elif correct_drift and not include_nonspecific:
                kon_err, koff_err, Rmax_err, drift_err = perr
                extra_err = {"drift_err": float(drift_err)}
                n_params = 4
            elif (not correct_drift) and include_nonspecific:
                kon_err, koff_err, Rmax_err, ns_err = perr
                extra_err = {"nonspecific_err": float(ns_err)}
                n_params = 4
            else:
                kon_err, koff_err, Rmax_err = perr
                extra_err = None
                n_params = 3
        elif model == "2-state":
            if correct_drift and include_nonspecific:
                kon_err, koff_err, Rmax_err, ka_err, kd_err, drift_err, ns_err = perr
                extra_err = {
                    "ka_err": float(ka_err),
                    "kd_err": float(kd_err),
                    "drift_err": float(drift_err),
                    "nonspecific_err": float(ns_err),
                }
                n_params = 7
            elif correct_drift and not include_nonspecific:
                kon_err, koff_err, Rmax_err, ka_err, kd_err, drift_err = perr
                extra_err = {"ka_err": float(ka_err), "kd_err": float(kd_err), "drift_err": float(drift_err)}
                n_params = 6
            elif (not correct_drift) and include_nonspecific:
                kon_err, koff_err, Rmax_err, ka_err, kd_err, ns_err = perr
                extra_err = {"ka_err": float(ka_err), "kd_err": float(kd_err), "nonspecific_err": float(ns_err)}
                n_params = 6
            else:
                kon_err, koff_err, Rmax_err, ka_err, kd_err = perr
                extra_err = {"ka_err": float(ka_err), "kd_err": float(kd_err)}
                n_params = 5
        else:
            if correct_drift and include_nonspecific:
                kon_err, koff_err, Rmax_err, kmt_err, drift_err, ns_err = perr
                extra_err = {"kmt_err": float(kmt_err), "drift_err": float(drift_err), "nonspecific_err": float(ns_err)}
                n_params = 6
            elif correct_drift and not include_nonspecific:
                kon_err, koff_err, Rmax_err, kmt_err, drift_err = perr
                extra_err = {"kmt_err": float(kmt_err), "drift_err": float(drift_err)}
                n_params = 5
            elif (not correct_drift) and include_nonspecific:
                kon_err, koff_err, Rmax_err, kmt_err, ns_err = perr
                extra_err = {"kmt_err": float(kmt_err), "nonspecific_err": float(ns_err)}
                n_params = 5
            else:
                kon_err, koff_err, Rmax_err, kmt_err = perr
                extra_err = {"kmt_err": float(kmt_err)}
                n_params = 4

        fitted_fitspace_fit = fit_func(time, *popt)
        residuals_fit = response_fit - fitted_fitspace_fit

        fitted_fitspace = fit_func(time_full, *popt)
        residuals = response_fit_full - fitted_fitspace
        fitted = fitted_fitspace + prep["display_offset"]

        ss_res = np.sum(residuals_fit**2)
        ss_tot = np.sum((response_fit - response_fit.mean()) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0

        k_obs = kon * conc_M + koff if model != "2-state" else np.nan
        aic, bic = calculate_aic_bic(residuals_fit, n_params)
        quality_score = calculate_quality_score(r_squared, residuals_fit)

        KD = koff / kon
        kd_gradient = np.array([-koff / kon**2, 1.0 / kon])
        KD_err = float(np.sqrt(max(float(kd_gradient @ pcov[:2, :2] @ kd_gradient), 0.0)))
        if model == "2-state":
            KD, KD_err = two_state_affinity(popt, pcov)
        names = ["kon", "koff", "Rmax"] + (["ka", "kd"] if model == "2-state" else ["delivery_lag_rate"] if model == "1:1+MT" else [])
        names += (["drift"] if correct_drift else []) + (["nonspecific"] if include_nonspecific else [])
        boundaries = kinetic_boundary_parameters(kon, koff)
        if hasattr(fit_func, "parameter_bounds"):
            boundaries = boundary_flags(popt, *fit_func.parameter_bounds, names)
        dependence = residual_dependence(residuals, fit_mask_arr, signal_scale=np.ptp(response_fit))
        scientific_warnings = []
        if dependence["serial_correlation_flag"]:
            scientific_warnings.append("Serially correlated residuals: conditional IID model errors can underestimate uncertainty. Use independent-repeat SD for repeatability reporting.")
        covariance_available = bool(np.isfinite(pcov).all())
        design_unresolved = model == "1:1" and not np.any(time > t_end)
        if design_unresolved:
            covariance_available = False
            scientific_warnings.append("One concentration with unknown capacity and no observed dissociation identifies amplitude and kobs, not separate kon, koff and KD.")
        if not covariance_available:
            scientific_warnings.append("Conditional model covariance is unavailable; parameters may be unidentifiable from the selected observations.")
        if boundaries:
            scientific_warnings.append("Parameters at fitting bounds: conditional model errors are not valid two-sided uncertainty estimates.")
        if boundaries or not covariance_available:
            kon_err = koff_err = Rmax_err = KD_err = np.nan
            if extra_err:
                extra_err = {key: np.nan for key in extra_err}
        out = {
            "kon": float(kon),
            "koff": float(koff),
            "Rmax": float(Rmax),
            "KD": float(KD),
            "kon_err": float(kon_err),
            "koff_err": float(koff_err),
            "Rmax_err": float(Rmax_err),
            "KD_err": float(KD_err),
            "fitted": fitted,
            "fitted_fitspace": fitted_fitspace,
            "residuals": residuals,
            "residuals_fit": residuals_fit,
            "fit_mask": fit_mask_arr,
            "r_squared": float(r_squared),
            "k_obs": float(k_obs),
            "aic": float(aic),
            "bic": float(bic),
            "quality_score": float(quality_score),
            "rss_fit": float(ss_res),
            "n_fit_points": int(len(response_fit)),
            "model": model,
            "n_params": int(n_params),
            "drift_slope": float(drift_fit),
            "drift_applied": bool(correct_drift and abs(drift_fit) > 1e-12),
            "drift_confidence": float(min(abs(drift_fit) / max(drift_scale, 1e-12), 1.0)) if correct_drift else 0.0,
            "nonspecific_coeff": float(ns_fit),
            "response_plot": response_fit_full,
            "fitted_plot": fitted_fitspace,
            "normalize_baseline": bool(normalize),
            "boundary_parameters": boundaries,
            "residual_dependence": dependence,
            "uncertainty_method": BASELINE_ERROR if baseline_uncertainty.get("applied") else CONDITIONAL_ERROR,
            "baseline_uncertainty": baseline_uncertainty,
            "scientific_warnings": scientific_warnings,
            "summary_eligible": not boundaries and covariance_available,
            "covariance_status": CONDITIONAL_ERROR if not boundaries and covariance_available else "Unavailable: boundary or unresolved covariance",
            "sensitivity_diagnostics": getattr(fit_func, "covariance_diagnostics", {}),
            "affinity_interpretation": "Overall two-state equilibrium KD" if model == "2-state" else "1:1 KD = koff/kon",
        }
        if model == "2-state":
            out["ka"] = float(ka)
            out["kd"] = float(kd)
            out["microscopic_KD_first_step"] = float(koff / kon)
        if model == "1:1+MT":
            out["kmt"] = float(kmt)
        if extra_err:
            out.update(extra_err)
        return out

    except Exception as e:
        if show_warnings:
            st.warning(f"Fit failed: {str(e)}")
        return None


def _collect_kinetic_curves(
    data_list,
    include_map,
    t_start,
    t_end,
    normalize=True,
    correct_drift=False,
    rmax_group_mode="Per file (repeat-specific)",
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    curves = []

    for data in data_list:
        fn = data.get("filename", "unknown")
        experiment_group = data.get("repeat_group", fn)
        allowed = include_map.get(fn, set([c for c in data["concentrations"] if c != 0]))
        time = np.asarray(data["time"], dtype=float)

        for conc in data["concentrations"]:
            if conc == 0 or conc not in allowed:
                continue

            if rmax_group_mode == "Per experiment group":
                rmax_group = experiment_group
            elif rmax_group_mode == "Per curve (concentration-specific)":
                rmax_group = f"{fn}::{float(conc):.12g}"
            else:
                rmax_group = fn

            raw_response = np.asarray(data["responses"][conc], dtype=float).copy()
            fit_mask = build_phase_region_mask(
                time,
                setup_assoc_start=float(t_start),
                setup_dissoc_start=float(t_end),
                assoc_fit_start=assoc_window_start,
                assoc_fit_end=assoc_window_end,
                dissoc_fit_start=dissoc_window_start,
                dissoc_fit_end=dissoc_window_end,
            )
            response, prep = prepare_response_for_fit(
                time,
                raw_response,
                t_start=t_start,
                normalize=normalize,
                correct_drift=correct_drift,
                fit_mask=fit_mask,
            )

            curves.append(
                {
                    "filename": fn,
                    "repeat_group": experiment_group,
                    "repeat_id": data.get("repeat_id", fn),
                    "rmax_group": rmax_group,
                    "concentration_nM": float(conc),
                    "concentration_M": float(conc) * 1e-9,
                    "on": float(t_start),
                    "off": float(t_end),
                    "time": time,
                    "response": response,
                    "drift_trend": prep["drift_trend"],
                    "display_offset": prep["display_offset"],
                    "model_baseline": prep["model_baseline"],
                    "drift_slope": prep.get("drift_prior", 0.0),
                    "drift_applied": False,
                    "drift_confidence": 0.0,
                    "drift_prior": prep.get("drift_prior", 0.0),
                    "drift_scale": prep.get("drift_scale", 1e-6),
                    "fit_mask": fit_mask,
                    "baseline_estimated": prep["baseline_estimated"],
                    "baseline_mask": prep["baseline_mask"],
                    "baseline_reference_times": prep["baseline_reference_times"],
                    **curve_input(data, conc),
                }
            )

    return curves


def _shared_kinetics_fit(
    curves,
    t_start,
    t_end,
    model="1:1",
    include_drift=False,
    include_nonspecific=False,
    allow_curve_offsets=True,
    seed_from_individual=True,
    fast_mode=False,
    max_nfev=18000,
    max_runtime_s=None,
):
    if len(curves) < 2:
        return None
    if model not in {"1:1", "1:1+MT"}:
        return None
    fit_start_time = pytime.perf_counter()

    groups = sorted(list({c["rmax_group"] for c in curves}))
    group_to_idx = {g: i for i, g in enumerate(groups)}
    n_groups = len(groups)
    n_curves = len(curves)

    # Seed shared params from individual fits when possible.
    kon_seed, koff_seed = 1e5, 1e-3
    kmt_seed = 0.5
    per_group_rmax = {g: [] for g in groups}
    seed_kons = []
    seed_koffs = []
    seed_kmts = []
    if seed_from_individual:
        for c in curves:
            if (max_runtime_s is not None) and ((pytime.perf_counter() - fit_start_time) > float(max_runtime_s)):
                break
            try:
                seed_curve = downsample_curve_object(c, 320 if fast_mode else None)
                seed_fit = fit_kinetics_advanced(
                    seed_curve["time"],
                    seed_curve["response"].copy(),
                    seed_curve["concentration_M"],
                    t_start,
                    t_end,
                    normalize=False,
                    correct_drift=False,
                    include_nonspecific=include_nonspecific,
                    model=model,
                    show_warnings=False,
                    fit_mask=seed_curve.get("fit_mask"),
                )
            except Exception:
                seed_fit = None
            if seed_fit:
                if np.isfinite(seed_fit["Rmax"]):
                    per_group_rmax[c["rmax_group"]].append(seed_fit["Rmax"])
                if np.isfinite(seed_fit["kon"]):
                    seed_kons.append(seed_fit["kon"])
                if np.isfinite(seed_fit["koff"]):
                    seed_koffs.append(seed_fit["koff"])
                if model == "1:1+MT" and np.isfinite(seed_fit.get("kmt", np.nan)):
                    seed_kmts.append(seed_fit["kmt"])

    if seed_kons:
        kon_seed = float(np.median(seed_kons))
    if seed_koffs:
        koff_seed = float(np.median(seed_koffs))
    if seed_kmts:
        kmt_seed = float(np.median(seed_kmts))

    rmax_guess = []
    rmax_ub = []
    for g in groups:
        ys = [c["response"][c["fit_mask"]] for c in curves if c["rmax_group"] == g]
        if per_group_rmax[g]:
            rg = float(np.median(per_group_rmax[g]))
        else:
            group_range = max(float(np.max(y) - np.min(y)) for y in ys) if ys else 1.0
            rg = max(group_range, 1e-6)
        max_abs = max(float(np.max(np.abs(y))) for y in ys) if ys else 1.0
        rmax_guess.append(max(rg, 1e-9))
        rmax_ub.append(max(max_abs * 20.0, rg * 20.0, 1.0))

    offset_guess = []
    offset_ub = []
    if allow_curve_offsets:
        for c in curves:
            t = c["time"]
            y = c["response"]
            pre = t < t_start
            if np.any(pre):
                og = float(np.median(y[pre]))
                spread = float(np.std(y[pre]) + 1e-9)
            else:
                og = float(np.median(y))
                spread = float(np.std(y) + 1e-9)
            selected_y = y[c["fit_mask"]]
            data_span = float(np.max(selected_y) - np.min(selected_y) + 1e-9)
            bound = max(5.0 * spread, data_span, 1e-3)
            offset_guess.append(og)
            offset_ub.append(bound)

    slope_guess = []
    slope_lb = []
    slope_ub = []
    if include_drift:
        for c in curves:
            prior = float(c.get("drift_prior", 0.0))
            scale = max(float(c.get("drift_scale", 1e-6)), 1e-6)
            slope_guess.append(prior)
            slope_lb.append(prior - scale)
            slope_ub.append(prior + scale)

    max_c = max([float(c["concentration_M"]) for c in curves]) if curves else 1e-9
    assoc_span = max(float(t_end - t_start), 1e-9)
    selected_y = np.concatenate([c["response"][c["fit_mask"]] for c in curves])
    all_y_span = max(float(np.percentile(selected_y, 95) - np.percentile(selected_y, 5)), 1e-9)
    ns_scale = max(all_y_span / max(max_c * assoc_span, 1e-18), 1e-6)
    ns_lb = -4.0 * ns_scale
    ns_ub = 4.0 * ns_scale

    if model == "1:1":
        global_p0 = [kon_seed, koff_seed]
        global_lb = [1e2, 1e-8]
        global_ub = [1e9, 10.0]
    else:
        global_p0 = [kon_seed, koff_seed, kmt_seed]
        global_lb = [1e2, 1e-8, 1e-4]
        global_ub = [1e9, 10.0, 1e3]
    if include_nonspecific:
        global_p0.append(0.0)
        global_lb.append(ns_lb)
        global_ub.append(ns_ub)

    p0 = np.array(global_p0 + rmax_guess + offset_guess + slope_guess, dtype=float)
    lb = np.array(global_lb + [0.0] * n_groups + [-b for b in offset_ub] + slope_lb, dtype=float)
    ub = np.array(global_ub + rmax_ub + offset_ub + slope_ub, dtype=float)

    def residuals_fn(params, concentration_factors=None):
        kon = params[0]
        koff = params[1]
        if model == "1:1":
            if include_nonspecific:
                ns_coeff = params[2]
                rmax_offset = 3
            else:
                ns_coeff = 0.0
                rmax_offset = 2
            kmt = None
        else:
            if include_nonspecific:
                kmt = params[2]
                ns_coeff = params[3]
                rmax_offset = 4
            else:
                kmt = params[2]
                ns_coeff = 0.0
                rmax_offset = 3
        offset_start = rmax_offset + n_groups
        rmax_vec = params[rmax_offset:offset_start]
        if allow_curve_offsets:
            offs_vec = params[offset_start : offset_start + n_curves]
            slope_start = offset_start + n_curves
        else:
            offs_vec = np.zeros(n_curves, dtype=float)
            slope_start = offset_start
        if include_drift:
            slope_vec = params[slope_start : slope_start + n_curves]
        else:
            slope_vec = np.zeros(n_curves, dtype=float)
        all_res = []
        for i, curve in enumerate(curves):
            ridx = group_to_idx[curve["rmax_group"]]
            curve_drift = float(slope_vec[i])
            concentration = curve["concentration_M"]*(concentration_factors[i] if concentration_factors is not None else 1.)
            if model == "1:1":
                pred = model_1to1(
                    curve["time"],
                    kon,
                    koff,
                    rmax_vec[ridx],
                    concentration,
                    t_start,
                    t_end,
                    baseline=curve.get("model_baseline", 0.0),
                    drift=curve_drift,
                    ns_coeff=ns_coeff,
                )
            else:
                pred = model_1to1_mass_transport(
                    curve["time"],
                    kon,
                    koff,
                    rmax_vec[ridx],
                    kmt,
                    concentration,
                    t_start,
                    t_end,
                    baseline=curve.get("model_baseline", 0.0),
                    drift=curve_drift,
                    ns_coeff=ns_coeff,
                )
            pred = pred + offs_vec[i]
            resid = curve["response"] - pred
            curve_fit_mask = curve.get("fit_mask")
            if curve_fit_mask is not None:
                m = np.asarray(curve_fit_mask, dtype=float)
                if len(m) == len(resid):
                    resid = resid[m.astype(bool)]
            all_res.append(resid)
        return np.concatenate(all_res)

    all_y = selected_y
    f_scale = max(float(np.std(all_y)), 1e-3)

    candidates = []
    if fast_mode:
        kon_scales = [1.0, 0.8, 1.2]
        koff_scales = [1.0, 1.2, 0.8]
        kmt_scales = [1.0] if model == "1:1" else [1.0, 0.8]
        ns_scales = [1.0] if not include_nonspecific else [1.0, 0.75]
        max_nfev_local = int(max(2500, max_nfev))
    else:
        kon_scales = [0.5, 1.0, 2.0]
        koff_scales = [0.5, 1.0, 2.0]
        kmt_scales = [1.0] if model == "1:1" else [0.5, 1.0, 2.0]
        ns_scales = [0.5, 1.0, 2.0] if include_nonspecific else [1.0]
        max_nfev_local = int(max(3000, max_nfev))

    for s_kon in kon_scales:
        for s_koff in koff_scales:
            for s_kmt in kmt_scales:
                for s_ns in ns_scales:
                    if (max_runtime_s is not None) and ((pytime.perf_counter() - fit_start_time) > float(max_runtime_s)):
                        break
                    p_try = p0.copy()
                    p_try[0] = np.clip(p0[0] * s_kon, lb[0], ub[0])
                    p_try[1] = np.clip(p0[1] * s_koff, lb[1], ub[1])
                    if model == "1:1+MT":
                        p_try[2] = np.clip(p0[2] * s_kmt, lb[2], ub[2])
                    if include_nonspecific:
                        ns_idx = 2 if model == "1:1" else 3
                        p_try[ns_idx] = np.clip(p0[ns_idx] * s_ns, lb[ns_idx], ub[ns_idx])
                    try:
                        opt = least_squares(
                            residuals_fn,
                            p_try,
                            bounds=(lb, ub),
                            method="trf",
                            loss="linear",
                            f_scale=f_scale,
                            x_scale="jac",
                            max_nfev=max_nfev_local,
                        )
                    except Exception:
                        continue
                    if opt.success and np.all(np.isfinite(opt.x)) and np.isfinite(opt.cost):
                        candidates.append(opt)

    if not candidates:
        return None

    opt = min(candidates, key=lambda o: o.cost)

    kon = float(opt.x[0])
    koff = float(opt.x[1])
    if model == "1:1":
        if include_nonspecific:
            ns_coeff = float(opt.x[2])
            rmax_offset = 3
        else:
            ns_coeff = 0.0
            rmax_offset = 2
        kmt = None
    else:
        if include_nonspecific:
            kmt = float(opt.x[2])
            ns_coeff = float(opt.x[3])
            rmax_offset = 4
        else:
            kmt = float(opt.x[2])
            ns_coeff = 0.0
            rmax_offset = 3
    rmax_by_group = {g: float(opt.x[rmax_offset + idx]) for g, idx in group_to_idx.items()}
    if allow_curve_offsets:
        curve_offsets = opt.x[rmax_offset + n_groups : rmax_offset + n_groups + n_curves].astype(float)
        slope_start = rmax_offset + n_groups + n_curves
    else:
        curve_offsets = np.zeros(n_curves, dtype=float)
        slope_start = rmax_offset + n_groups
    if include_drift:
        curve_slopes = opt.x[slope_start : slope_start + n_curves].astype(float)
    else:
        curve_slopes = np.zeros(n_curves, dtype=float)

    resid = residuals_fn(opt.x)
    covariance_info = conditional_covariance(opt.jac, resid)
    cov = covariance_info.pop("covariance")
    baseline_uncertainty = dict(applied=False)
    if cov is not None:
        reference_curves = [{**curve, "baseline_trend": float(slope)} for curve, slope in zip(curves, curve_slopes)]
        try:
            propagated, baseline_uncertainty = propagate_baseline(opt.jac, resid, reference_curves)
            if propagated is not None:
                cov = propagated
        except ValueError as exc:
            cov = None
            baseline_uncertainty = dict(applied=False, error=str(exc))
            covariance_info["covariance_status"] = "Unavailable: baseline uncertainty propagation failed"
    parameter_names = ["kon", "koff"] + (["delivery_lag_rate"] if model == "1:1+MT" else [])
    parameter_names += (["nonspecific"] if include_nonspecific else [])
    parameter_names += [f"Rmax::{group}" for group in groups]
    parameter_names += [f"offset::{i}" for i in range(n_curves)] if allow_curve_offsets else []
    parameter_names += [f"drift::{i}" for i in range(n_curves)] if include_drift else []
    boundaries = boundary_flags(opt.x, lb, ub, parameter_names)
    boundaries = sorted(set(boundaries) | {name for name, active in zip(parameter_names, opt.active_mask) if active})
    if boundaries:
        cov = None
        covariance_info["covariance_status"] = "Unavailable: parameter at fitting bound"
    input_uncertainty = dict(applied=False)
    if requested(common_options(curves)):
        try:
            if cov is None:
                raise ValueError("Input uncertainty cannot repair active bounds or unresolved parameter sensitivities.")
            derivatives, position = [], 0
            for i, curve in enumerate(curves):
                plus, minus = np.ones(n_curves), np.ones(n_curves)
                plus[i], minus[i] = np.exp(1e-5), np.exp(-1e-5)
                count = int(np.count_nonzero(curve["fit_mask"]))
                derivative = (residuals_fn(opt.x, plus)-residuals_fn(opt.x, minus))/(2e-5)
                derivatives.append(derivative[position:position+count])
                position += count
            cov, input_uncertainty = propagate_fit_inputs(opt.jac, reference_curves, cov, derivatives)
            input_uncertainty["parameter_order"] = parameter_names
            covariance_info["covariance_status"] = INPUT_ERROR
        except ValueError as exc:
            cov = None
            input_uncertainty = dict(applied=False, error=str(exc), settings=common_options(curves))
            covariance_info["covariance_status"] = "Unavailable: requested input-uncertainty propagation failed"
    errs = np.sqrt(np.maximum(np.diag(cov), 0.)) if cov is not None else np.full(len(opt.x), np.nan)
    kon_sem, koff_sem = float(errs[0]), float(errs[1])
    kmt_sem = float(errs[2]) if model == "1:1+MT" else np.nan
    rmax_se = {group: float(errs[rmax_offset + idx]) for group, idx in group_to_idx.items()}

    out = {
        "kon": kon,
        "koff": koff,
        "rmax_by_group": rmax_by_group,
        "rmax_se_by_group": rmax_se,
        "curve_offsets": curve_offsets.tolist(),
        "curve_slopes": curve_slopes.tolist(),
        "curve_offsets_enabled": bool(allow_curve_offsets),
        "nonspecific_coeff": float(ns_coeff),
        "kon_sem": float(kon_sem),
        "koff_sem": float(koff_sem),
        "covariance_rates": cov[:2, :2] if cov is not None else None,
        "boundary_parameters": boundaries,
        "n_fit_observations": int(len(resid)),
        "n_parameters": int(len(opt.x)),
        "information_criteria": gaussian_information(resid, len(opt.x)),
        "baseline_uncertainty": baseline_uncertainty,
        "input_uncertainty": input_uncertainty,
        "uncertainty_method": INPUT_ERROR if input_uncertainty.get("applied") else (BASELINE_ERROR if baseline_uncertainty.get("applied") else CONDITIONAL_ERROR),
        **covariance_info,
        "model": model,
    }
    links = []
    for i, curve in enumerate(curves):
        keys = dict(kon="kon", koff="koff", Rmax=f"Rmax::{curve['rmax_group']}")
        if model == "1:1+MT":
            keys["delivery_lag_rate"] = "delivery_lag_rate"
        if include_nonspecific:
            keys["ns_linear"] = "nonspecific"
        if allow_curve_offsets:
            keys["offset"] = f"offset::{i}"
        if include_drift:
            keys["drift"] = f"drift::{i}"
        links.append(keys)
    out["refit_spec"] = dict(
        model="langmuir" if model == "1:1" else "delivery_lag", transport="None", nonspecific=False,
        controls={name: dict(value=float(value), lower=float(lo), upper=float(hi), fixed=False,
                             positive=bool(lo > 0)) for name, value, lo, hi in zip(parameter_names, opt.x, lb, ub)},
        links=links, correlation_time=0., loss="linear", rss=float(resid @ resid))
    if model == "1:1+MT":
        out["kmt"] = float(kmt)
        out["kmt_sem"] = float(kmt_sem)
    return out


def bootstrap_shared_kinetics(
    curves,
    t_start,
    t_end,
    model="1:1",
    include_drift=False,
    include_nonspecific=False,
    allow_curve_offsets=True,
    n_boot=240,
    seed=1,
    max_runtime_s=90.0,
    downsample_points=320,
):
    repeat_ids = sorted({c.get("repeat_id", c["filename"]) for c in curves})
    if len(repeat_ids) < 3:
        return {"status": "Unavailable", "reason": "At least three independent repeat IDs are required.",
                "bootstrap_requested": int(n_boot), "bootstrap_attempted": 0, "bootstrap_converged": 0}

    rng = np.random.default_rng(seed)
    params = []
    attempted = 0
    t0 = pytime.perf_counter()
    fit_curves = [downsample_curve_object(c, downsample_points) for c in curves]
    shared_groups = {g for g in {c["rmax_group"] for c in curves}
                     if len({c.get("repeat_id", c["filename"]) for c in curves if c["rmax_group"] == g}) > 1}

    for _ in range(int(n_boot)):
        if (pytime.perf_counter() - t0) > float(max_runtime_s):
            break
        attempted += 1
        idx = rng.integers(0, len(repeat_ids), len(repeat_ids))
        sampled = []
        for draw, i in enumerate(idx):
            for curve in fit_curves:
                if curve.get("repeat_id", curve["filename"]) == repeat_ids[i]:
                    copy = dict(curve)
                    copy["filename"] = f"draw{draw}::{curve['filename']}"
                    copy["rmax_group"] = curve["rmax_group"] if curve["rmax_group"] in shared_groups else f"draw{draw}::{curve['rmax_group']}"
                    sampled.append(copy)
        fit = _shared_kinetics_fit(
            sampled,
            t_start,
            t_end,
            model=model,
            include_drift=include_drift,
            include_nonspecific=include_nonspecific,
            allow_curve_offsets=allow_curve_offsets,
            seed_from_individual=False,
            fast_mode=True,
            max_nfev=3500,
            max_runtime_s=8.0,
        )
        if fit and not fit.get("boundary_parameters"):
            kon = fit["kon"]
            koff = fit["koff"]
            kd = koff / max(kon, 1e-30)
            params.append((kon, koff, kd))

    out = {"status": "Unavailable"}
    out["bootstrap_requested"] = int(n_boot)
    out["resampling_unit"] = "independent_repeat_id"
    out["n_independent_repeats"] = len(repeat_ids)
    out["bootstrap_attempted"] = int(attempted)
    out["bootstrap_converged"] = int(len(params))
    out["bootstrap_runtime_s"] = float(pytime.perf_counter() - t0)
    out["bootstrap_terminated_early"] = bool(attempted < int(n_boot))
    if len(params) < 200 or len(params) / max(attempted, 1) < .9 or attempted < .9 * int(n_boot):
        out["reason"] = "Percentile interval withheld: require at least 200 eligible refits, 90% fit success and 90% of requested resamples attempted."
        return out
    arr = np.array(params, dtype=float)
    for i, name in enumerate(["kon", "koff", "KD"]):
        q2p5, q50, q97p5 = np.percentile(arr[:, i], [2.5, 50.0, 97.5])
        out[f"{name}_ci95"] = (float(q2p5), float(q97p5))
        out[f"{name}_median"] = float(q50)
        out[f"{name}_std"] = float(np.std(arr[:, i], ddof=1))
    out["status"] = "Available"
    return out


def fit_kinetics_shared_params(
    data_list,
    t_start,
    t_end,
    include_map,
    model="1:1",
    rmax_group_mode="Per file (repeat-specific)",
    normalize=True,
    correct_drift=False,
    include_nonspecific=False,
    do_bootstrap=False,
    bootstrap_n=240,
    enforce_drift_guardrail=True,
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    if model not in {"1:1", "1:1+MT"}:
        return None
    allow_curve_offsets = not bool(normalize)

    if correct_drift and enforce_drift_guardrail:
        drift_candidate = fit_kinetics_shared_params(
            data_list,
            t_start,
            t_end,
            include_map,
            model=model,
            rmax_group_mode=rmax_group_mode,
            normalize=normalize,
            correct_drift=True,
            include_nonspecific=include_nonspecific,
            do_bootstrap=False,
            bootstrap_n=bootstrap_n,
            enforce_drift_guardrail=False,
            assoc_window_start=assoc_window_start,
            assoc_window_end=assoc_window_end,
            dissoc_window_start=dissoc_window_start,
            dissoc_window_end=dissoc_window_end,
        )
        nodrift_candidate = fit_kinetics_shared_params(
            data_list,
            t_start,
            t_end,
            include_map,
            model=model,
            rmax_group_mode=rmax_group_mode,
            normalize=normalize,
            correct_drift=False,
            include_nonspecific=include_nonspecific,
            do_bootstrap=False,
            bootstrap_n=bootstrap_n,
            enforce_drift_guardrail=False,
            assoc_window_start=assoc_window_start,
            assoc_window_end=assoc_window_end,
            dissoc_window_start=dissoc_window_start,
            dissoc_window_end=dissoc_window_end,
        )

        if drift_candidate is None and nodrift_candidate is None:
            return None
        if drift_candidate is None:
            chosen = nodrift_candidate
            chosen_drift = False
            chosen["drift_guardrail_message"] = "Shared drift fit failed; using no-drift shared fit."
            chosen["drift_guardrail"] = "fallback_no_drift_fit_failed_with_drift"
            chosen["drift_delta_rss_pct"] = np.nan
        elif nodrift_candidate is None:
            chosen = drift_candidate
            chosen_drift = True
            chosen["drift_guardrail_message"] = "No-drift shared fit failed; keeping drift-enabled shared fit."
            chosen["drift_guardrail"] = "accept_drift_no_nodrift_solution"
            chosen["drift_delta_rss_pct"] = np.nan
        else:
            rss_drift = fit_result_total_rss(drift_candidate)
            rss_nodrift = fit_result_total_rss(nodrift_candidate)
            delta_pct = 100.0 * (rss_nodrift - rss_drift) / max(rss_nodrift, 1e-30)
            comparison = drift_comparison(nodrift_candidate, drift_candidate, shared=True)
            if comparison["accepted"]:
                chosen = drift_candidate
                chosen_drift = True
                chosen["drift_guardrail_message"] = comparison["reason"]
                chosen["drift_guardrail"] = "accept_drift_aicc_support"
                chosen["drift_delta_rss_pct"] = float(delta_pct)
            else:
                chosen = nodrift_candidate
                chosen_drift = False
                chosen["drift_guardrail_message"] = comparison["reason"]
                chosen["drift_guardrail"] = "reject_drift_non_improving"
                chosen["drift_delta_rss_pct"] = float(delta_pct)
            chosen["drift_comparison"] = comparison

        if do_bootstrap and chosen is not None:
            curves_boot = _collect_kinetic_curves(
                data_list,
                include_map,
                t_start=t_start,
                t_end=t_end,
                normalize=normalize,
                correct_drift=chosen_drift,
                rmax_group_mode=rmax_group_mode,
                assoc_window_start=assoc_window_start,
                assoc_window_end=assoc_window_end,
                dissoc_window_start=dissoc_window_start,
                dissoc_window_end=dissoc_window_end,
            )
            boot = bootstrap_shared_kinetics(
                curves_boot,
                t_start,
                t_end,
                model=model,
                include_drift=chosen_drift,
                include_nonspecific=include_nonspecific,
                allow_curve_offsets=allow_curve_offsets,
                n_boot=bootstrap_n,
                max_runtime_s=90.0,
                downsample_points=320,
            )
            chosen["bootstrap_diagnostics"] = boot
            if boot and boot.get("status") == "Available":
                chosen["bootstrap"] = boot
                chosen["uncertainty_method"] = "Independent-repeat cluster bootstrap percentile 95% CI"
            else:
                chosen.setdefault("scientific_warnings", []).append("Requested bootstrap interval is unavailable. " + (boot or {}).get("reason", "No eligible bootstrap result."))
        return chosen

    curves = _collect_kinetic_curves(
        data_list,
        include_map,
        t_start=t_start,
        t_end=t_end,
        normalize=normalize,
        correct_drift=correct_drift,
        rmax_group_mode=rmax_group_mode,
        assoc_window_start=assoc_window_start,
        assoc_window_end=assoc_window_end,
        dissoc_window_start=dissoc_window_start,
        dissoc_window_end=dissoc_window_end,
    )
    if not curves:
        return None

    shared = _shared_kinetics_fit(
        curves,
        t_start,
        t_end,
        model=model,
        include_drift=correct_drift,
        include_nonspecific=include_nonspecific,
        allow_curve_offsets=allow_curve_offsets,
    )
    if not shared:
        return None

    kon = shared["kon"]
    koff = shared["koff"]
    kd = koff / max(kon, 1e-30)
    kon_sem = shared["kon_sem"]
    koff_sem = shared["koff_sem"]
    rate_covariance = shared.get("covariance_rates")
    if rate_covariance is not None:
        kd_gradient = np.array([-koff / kon**2, 1.0 / kon])
        kd_sem = float(np.sqrt(max(float(kd_gradient @ rate_covariance @ kd_gradient), 0.0)))
    else:
        kd_sem = np.nan
    kmt = shared.get("kmt")
    kmt_sem = shared.get("kmt_sem", 0.0)
    ns_coeff = float(shared.get("nonspecific_coeff", 0.0))
    curve_offsets = shared.get("curve_offsets", [0.0] * len(curves))
    curve_slopes = shared.get("curve_slopes", [0.0] * len(curves))

    all_results = []
    kobs_vals = []
    conc_vals = []

    for i, curve in enumerate(curves):
        rmax = shared["rmax_by_group"][curve["rmax_group"]]
        curve_offset = float(curve_offsets[i]) if i < len(curve_offsets) else 0.0
        curve_slope = float(curve_slopes[i]) if i < len(curve_slopes) else 0.0
        if model == "1:1":
            fitted_fitspace = model_1to1(
                curve["time"],
                kon,
                koff,
                rmax,
                curve["concentration_M"],
                t_start,
                t_end,
                baseline=curve.get("model_baseline", 0.0),
                drift=curve_slope,
                ns_coeff=ns_coeff,
            )
            n_params = 4 if correct_drift else 3
            if include_nonspecific:
                n_params += 1
        else:
            fitted_fitspace = model_1to1_mass_transport(
                curve["time"],
                kon,
                koff,
                rmax,
                kmt,
                curve["concentration_M"],
                t_start,
                t_end,
                baseline=curve.get("model_baseline", 0.0),
                drift=curve_slope,
                ns_coeff=ns_coeff,
            )
            n_params = 5 if correct_drift else 4
            if include_nonspecific:
                n_params += 1
        fitted_fitspace = fitted_fitspace + curve_offset
        residuals = curve["response"] - fitted_fitspace
        fitted = fitted_fitspace + float(curve.get("display_offset", 0.0))
        curve_fit_mask = curve.get("fit_mask")
        if curve_fit_mask is not None:
            m = np.asarray(curve_fit_mask, dtype=bool)
            if len(m) == len(residuals) and np.any(m):
                residuals_eval = residuals[m]
                response_eval = curve["response"][m]
            else:
                residuals_eval = residuals
                response_eval = curve["response"]
        else:
            residuals_eval = residuals
            response_eval = curve["response"]
        ss_res = np.sum(residuals_eval**2)
        ss_tot = np.sum((response_eval - response_eval.mean()) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0
        k_obs = kon * curve["concentration_M"] + koff
        aic, bic = calculate_aic_bic(residuals_eval, n_params)
        quality_score = calculate_quality_score(r_squared, residuals_eval)

        row = {
            "kon": float(kon),
            "koff": float(koff),
            "Rmax": float(rmax),
            "KD": float(kd),
            "kon_err": float(kon_sem),
            "koff_err": float(koff_sem),
            "Rmax_err": shared["rmax_se_by_group"][curve["rmax_group"]],
            "KD_err": float(kd_sem),
            "fitted": fitted,
            "fitted_fitspace": fitted_fitspace,
            "residuals": residuals,
            "residuals_fit": residuals_eval,
            "fit_mask": np.asarray(curve.get("fit_mask", np.ones(len(residuals), dtype=bool)), dtype=bool),
            "r_squared": float(r_squared),
            "k_obs": float(k_obs),
            "aic": np.nan,
            "bic": np.nan,
            "information_criteria_scope": "Shared-fit criteria apply to the joint residual vector, not individual curves",
            "quality_score": float(quality_score),
            "rss_fit": float(ss_res),
            "n_fit_points": int(len(residuals_eval)),
            "model": f"{model}_shared",
            "n_params": int(n_params),
            "concentration": curve["concentration_nM"],
            "filename": curve["filename"],
            "repeat_group": curve["repeat_group"],
            "rmax_group": curve["rmax_group"],
            "day": "All",
            "drift_slope": float(curve_slope),
            "drift_applied": bool(correct_drift and abs(curve_slope) > 1e-12),
            "drift_confidence": float(
                min(abs(curve_slope) / max(float(curve.get("drift_scale", 1e-12)), 1e-12), 1.0)
            )
            if correct_drift
            else 0.0,
            "nonspecific_coeff": float(ns_coeff),
            "offset_fitspace": float(curve_offset),
            "response_plot": np.asarray(curve["response"], dtype=float),
            "fitted_plot": np.asarray(fitted_fitspace, dtype=float),
            "normalize_baseline": bool(normalize),
            "boundary_parameters": shared.get("boundary_parameters", []),
            "residual_dependence": residual_dependence(residuals, curve.get("fit_mask"), signal_scale=np.ptp(response_eval)),
            "uncertainty_method": shared["uncertainty_method"],
            "baseline_uncertainty": shared.get("baseline_uncertainty", {}),
            "input_uncertainty": shared.get("input_uncertainty", {}),
        }
        if model == "1:1+MT":
            row["kmt"] = float(kmt)
            row["kmt_err"] = float(kmt_sem)
        all_results.append(row)
        kobs_vals.append(k_obs)
        conc_vals.append(curve["concentration_M"])

    has_mt, mt_r2 = False, np.nan
    mt_message = "Shared-model kobs values are linear by construction; use independent association fits to evaluate concentration dependence."
    if model == "1:1+MT":
        mt_message = "Empirical delivery lag fitted; this does not establish or correct physical surface mass transport."
    scientific_warnings = []
    if shared.get("input_uncertainty", {}).get("applied"):
        scientific_warnings.append("Local input uncertainty includes the saved raw-source/calibration budget. Shared controls and common stock errors are correlated; repeat SD remains separate. Likelihood/AIC and profiles are unchanged.")
    elif shared.get("input_uncertainty", {}).get("error"):
        scientific_warnings.append(shared["input_uncertainty"]["error"])
    if any(f["residual_dependence"]["serial_correlation_flag"] for f in all_results):
        budget = shared.get("input_uncertainty", {})
        if budget.get("applied") and budget.get("settings", {}).get("propagate_measurement") and budget["settings"]["raw_correlation_time_s"] > 0:
            scientific_warnings.append("Serial residual dependence detected. Input covariance uses the supplied raw-noise OU time; inspect whether that noise model and the binding model are adequate.")
        else:
            scientific_warnings.append("Serially correlated residuals: conditional IID model errors can underestimate uncertainty. Independent-repeat SD is reported separately.")
    if shared.get("boundary_parameters"):
        scientific_warnings.append("Parameters at fitting bounds: two-sided conditional model errors are unavailable.")
    if shared["covariance_status"] not in {CONDITIONAL_ERROR, INPUT_ERROR}:
        scientific_warnings.append(shared["covariance_status"])
    if model == "1:1+MT":
        scientific_warnings.append(mt_message)

    result = {
        "individual_fits": all_results,
        "curve_observations": curves,
        "boundary_parameters": shared.get("boundary_parameters", []),
        "summary_eligible": not shared.get("boundary_parameters") and shared["covariance_status"] in {CONDITIONAL_ERROR, INPUT_ERROR},
        "scientific_warnings": scientific_warnings,
        "uncertainty_method": shared["uncertainty_method"],
        "baseline_uncertainty": shared.get("baseline_uncertainty", {}),
        "input_uncertainty": shared.get("input_uncertainty", {}),
        "covariance_rates": shared.get("covariance_rates"),
        "covariance_status": shared["covariance_status"],
        "global_kon": float(kon),
        "global_koff": float(koff),
        "global_KD": float(kd),
        "kon_std": np.nan,
        "koff_std": np.nan,
        "KD_std": np.nan,
        "kon_sem": float(kon_sem),
        "koff_sem": float(koff_sem),
        "KD_sem": float(kd_sem),
        "n_fits": int(len(all_results)),
        "avg_quality": float(np.mean([r["quality_score"] for r in all_results])),
        "avg_r_squared": float(np.mean([r["r_squared"] for r in all_results])),
        "has_mass_transport": bool(has_mt),
        "mass_transport_message": mt_message,
        "mass_transport_r2": float(mt_r2) if np.isfinite(mt_r2) else np.nan,
        "fit_strategy": "shared_kinetics",
        "shared_model": model,
        "rmax_group_mode": rmax_group_mode,
        "repeat_groups": int(len(shared["rmax_by_group"])),
        "rmax_by_group": shared["rmax_by_group"],
        "rmax_se_by_group": shared["rmax_se_by_group"],
        "global_nonspecific_coeff": float(ns_coeff),
        "curve_offsets_enabled": bool(shared.get("curve_offsets_enabled", True)),
        "n_fit_observations": shared["n_fit_observations"],
        "n_parameters": shared["n_parameters"],
        "degrees_of_freedom": shared["degrees_of_freedom"],
        "information_criteria": shared["information_criteria"],
        "jacobian_rank": shared["jacobian_rank"],
        "scaled_jacobian_condition": shared["scaled_jacobian_condition"],
        "refit_spec": shared["refit_spec"],
    }
    if model == "1:1+MT":
        result["global_kmt"] = float(kmt)
        result["kmt_sem"] = float(kmt_sem)

    if do_bootstrap:
        boot = bootstrap_shared_kinetics(
            curves,
            t_start,
            t_end,
            model=model,
            include_drift=correct_drift,
            include_nonspecific=include_nonspecific,
            allow_curve_offsets=allow_curve_offsets,
            n_boot=bootstrap_n,
            max_runtime_s=90.0,
            downsample_points=320,
        )
        result["bootstrap_diagnostics"] = boot
        if boot and boot.get("status") == "Available":
            result["bootstrap"] = boot
            result["uncertainty_method"] = "Independent-repeat cluster bootstrap percentile 95% CI"
            if result["input_uncertainty"].get("applied"):
                result["scientific_warnings"].append("Repeat-bootstrap intervals remain conditional on referencing and concentrations. The separate input covariance is not combined with those bootstrap intervals.")
        else:
            result["scientific_warnings"].append("Requested bootstrap interval is unavailable. " + (boot or {}).get("reason", "No eligible bootstrap result."))

    return result


def fit_kinetics_global(
    data_list,
    t_start,
    t_end,
    include_map,
    normalize=True,
    group_by_day=False,
    correct_drift=False,
    include_nonspecific=False,
    model="1:1",
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    all_results = []
    all_kon, all_koff, all_KD, all_k_obs, all_ns = [], [], [], [], []
    concs_for_mt = []

    if group_by_day:
        days = {}
        for data in data_list:
            day = data.get("day", "Day1")
            days.setdefault(day, []).append(data)
    else:
        days = {"All": data_list}

    for day_name, day_data in days.items():
        for data in day_data:
            fn = data.get("filename", "unknown")
            allowed = include_map.get(fn, set([c for c in data["concentrations"] if c != 0]))

            for conc in data["concentrations"]:
                if conc == 0:
                    continue
                if conc not in allowed:
                    continue

                time = data["time"]
                response = data["responses"][conc].copy()
                fit_mask = build_phase_region_mask(
                    time,
                    setup_assoc_start=float(t_start),
                    setup_dissoc_start=float(t_end),
                    assoc_fit_start=assoc_window_start,
                    assoc_fit_end=assoc_window_end,
                    dissoc_fit_start=dissoc_window_start,
                    dissoc_fit_end=dissoc_window_end,
                )

                result = fit_kinetics_advanced(
                    time,
                    response,
                    conc * 1e-9,
                    t_start,
                    t_end,
                    normalize=normalize,
                    correct_drift=correct_drift,
                    include_nonspecific=include_nonspecific,
                    model=model,
                    fit_mask=fit_mask,
                )

                if result:
                    result["concentration"] = float(conc)
                    result["filename"] = fn
                    result["day"] = day_name
                    all_results.append(result)

                    all_kon.append(result["kon"])
                    all_koff.append(result["koff"])
                    all_KD.append(result["KD"])
                    all_k_obs.append(result["k_obs"])
                    if "nonspecific_coeff" in result:
                        all_ns.append(float(result["nonspecific_coeff"]))
                    concs_for_mt.append(conc * 1e-9)

    if not all_results:
        return None

    if model == "1:1":
        has_mt, mt_message, mt_r2 = detect_mass_transport(np.array(concs_for_mt, dtype=float), np.array(all_k_obs, dtype=float))
    elif model == "1:1+MT":
        has_mt, mt_message, mt_r2 = False, "Empirical delivery lag fitted; not a coupled surface mass-transport correction.", np.nan
    else:
        has_mt, mt_message, mt_r2 = False, "k_obs linearity check is not directly applicable for 2-state model.", np.nan

    return {
        "individual_fits": all_results,
        "curve_observations": _collect_kinetic_curves(
            data_list, include_map, t_start, t_end, normalize=normalize, correct_drift=correct_drift,
            assoc_window_start=assoc_window_start, assoc_window_end=assoc_window_end,
            dissoc_window_start=dissoc_window_start, dissoc_window_end=dissoc_window_end),
        "summary_eligible": False,
        "uncertainty_method": "Descriptive curve-wise spread; not independent-repeat uncertainty",
        "scientific_warnings": sorted({message for fit in all_results for message in fit.get("scientific_warnings", [])}
                                      | {"Curve-wise concentration averages are diagnostic only; use shared kinetics and independent-repeat refits for routine parameter reporting."}),
        "boundary_parameters": sorted({p for f in all_results for p in f.get("boundary_parameters", [])}),
        "global_kon": float(np.mean(all_kon)),
        "global_koff": float(np.mean(all_koff)),
        "global_KD": float(np.mean(all_KD)),
        "kon_std": float(np.std(all_kon, ddof=1)) if len(all_kon) > 1 else np.nan,
        "koff_std": float(np.std(all_koff, ddof=1)) if len(all_koff) > 1 else np.nan,
        "KD_std": float(np.std(all_KD, ddof=1)) if len(all_KD) > 1 else np.nan,
        "kon_sem": np.nan,
        "koff_sem": np.nan,
        "KD_sem": np.nan,
        "n_fits": int(len(all_results)),
        "avg_quality": float(np.mean([r["quality_score"] for r in all_results])),
        "avg_r_squared": float(np.mean([r["r_squared"] for r in all_results])),
        "has_mass_transport": bool(has_mt),
        "mass_transport_message": mt_message,
        "mass_transport_r2": float(mt_r2) if np.isfinite(mt_r2) else np.nan,
        "fit_strategy": "curvewise_average",
        "shared_model": model,
        "global_nonspecific_coeff": float(np.mean(all_ns)) if all_ns else 0.0,
    }


def fit_kobs_from_association(
    time,
    response,
    t_start,
    t_end,
    normalize=True,
    assoc_window_start=None,
    assoc_window_end=None,
):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    assoc_start_fit = float(t_start)
    if assoc_window_start is not None:
        assoc_start_fit = float(np.clip(float(assoc_window_start), float(t_start), float(t_end)))
    assoc_stop = float(t_end)
    if assoc_window_end is not None:
        assoc_stop = min(float(t_end), float(assoc_window_end))
    if assoc_stop <= (assoc_start_fit + 1e-9):
        return None
    assoc_mask = (time >= assoc_start_fit) & (time <= assoc_stop) & (time < float(t_end))
    if int(np.sum(assoc_mask)) < 8:
        return None

    if normalize:
        base_mask = time < float(t_start)
        baseline = float(np.median(response[base_mask])) if np.any(base_mask) else float(np.median(response))
        y = response - baseline
    else:
        baseline = 0.0
        y = response.copy()

    time_assoc_abs = time[assoc_mask]
    ta = time_assoc_abs - assoc_start_fit
    ya = y[assoc_mask]
    finite = np.isfinite(ta) & np.isfinite(ya)
    time_assoc_abs = time_assoc_abs[finite]
    ta = ta[finite]
    ya = ya[finite]
    if len(ta) < 8:
        return None

    n0 = min(5, max(2, len(ya) // 6))
    y0 = float(np.median(ya[:n0]))
    ya_shifted = ya - y0

    tail_n = min(max(3, len(ya_shifted) // 4), len(ya_shifted))
    signal_sign = 1.0
    if float(np.mean(ya_shifted[-tail_n:])) < 0:
        signal_sign = -1.0
    ya_fit = ya_shifted * signal_sign

    y_max = float(np.max(ya_fit))
    if (not np.isfinite(y_max)) or (y_max <= 1e-9):
        return None

    def assoc_func(t, gamma_eq, kobs, offset):
        return offset + gamma_eq * (1.0 - np.exp(-kobs * t))

    target = 0.632 * y_max
    idx = np.where(ya_fit >= target)[0]
    if len(idx) > 0 and ta[idx[0]] > 0:
        kobs0 = float(1.0 / max(ta[idx[0]], 1e-6))
    else:
        kobs0 = float(1.0 / max((float(assoc_stop) - assoc_start_fit) * 0.5, 1e-3))
    p0 = [max(y_max, 1e-6), np.clip(kobs0, 1e-6, 100.0), float(ya_fit[0])]

    try:
        popt, pcov = curve_fit(
            assoc_func,
            ta,
            ya_fit,
            p0=p0,
            bounds=([0.0, 1e-8, -np.inf], [np.inf, 100.0, np.inf]),
            x_scale="jac",
            maxfev=20000,
        )
    except Exception:
        return None

    gamma_eq, kobs, assoc_offset = [float(v) for v in popt]
    if kobs <= 0:
        return None

    model_jacobian = np.column_stack([1-np.exp(-kobs*ta), gamma_eq*ta*np.exp(-kobs*ta), np.ones(len(ta))])
    covariance_info = conditional_covariance(model_jacobian, ya_fit-assoc_func(ta, *popt))
    pcov = covariance_info["covariance"]
    bounds = boundary_flags(popt, [0., 1e-8, -np.inf], [np.inf, 100., np.inf],
                            ["association amplitude", "kobs", "association offset"])
    if bounds:
        pcov = None
    perr = np.sqrt(np.maximum(np.diag(pcov), 0.)) if pcov is not None else np.full(3, np.nan)
    gamma_eq_err = float(perr[0]) if len(perr) > 0 and np.isfinite(perr[0]) else np.nan
    kobs_err = float(perr[1]) if len(perr) > 1 and np.isfinite(perr[1]) else np.nan

    yhat = assoc_func(ta, *popt)
    residuals = ya_fit - yhat
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((ya_fit - np.mean(ya_fit)) ** 2))
    r_squared = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "kobs": float(kobs),
        "kobs_err": float(kobs_err),
        "gamma_eq": float(gamma_eq),
        "gamma_eq_err": float(gamma_eq_err),
        "assoc_offset": float(assoc_offset),
        "assoc_r2": float(r_squared),
        "assoc_n_points": int(len(ta)),
        "assoc_residuals": residuals,
        "assoc_time_abs_s": time_assoc_abs.tolist(),
        "assoc_time_rel_s": ta.tolist(),
        "assoc_response_plot": ya_shifted.tolist(),
        "assoc_response_fitspace": ya_fit.tolist(),
        "assoc_fitted_plot": (yhat * signal_sign).tolist(),
        "assoc_fit_start_s": float(assoc_start_fit),
        "assoc_fit_end_s": float(assoc_stop),
        "baseline_offset": float(baseline),
        "signal_sign": float(signal_sign),
        "rate_sensitivity": (-estimator_sensitivity(model_jacobian)[1]*signal_sign) if pcov is not None else None,
        "rate_covariance_status": covariance_info["covariance_status"] if pcov is not None else "Unavailable: unresolved/bound-limited association model",
        "boundary_parameters": bounds,
        "residual_dependence": residual_dependence(residuals, signal_scale=np.ptp(ya_fit)),
    }


def fit_kobs_direct_dissociation(
    time,
    response,
    t_assoc_start,
    t_dissoc_start,
    normalize=True,
    baseline_offset=0.0,
    signal_sign=1.0,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    signal_sign = float(signal_sign)

    if len(time) == 0 or len(response) == 0 or len(time) != len(response):
        return None

    dissoc_mask = (time >= max(float(t_dissoc_start), float(dissoc_window_start) if dissoc_window_start is not None else float(t_dissoc_start)))
    if dissoc_window_end is not None:
        dissoc_mask &= time <= float(dissoc_window_end)
    if int(np.sum(dissoc_mask)) < 8:
        return None

    if normalize:
        baseline = float(baseline_offset)
        full_display = (response - baseline) * signal_sign
    else:
        base_mask = time < float(t_assoc_start)
        if np.any(base_mask):
            baseline = float(np.median(response[base_mask]))
        else:
            baseline = float(np.median(response))
        full_display = response * signal_sign

    time_dissoc_abs = time[dissoc_mask]
    td = time_dissoc_abs - float(t_dissoc_start)
    yd = full_display[dissoc_mask]
    finite = np.isfinite(td) & np.isfinite(yd)
    time_dissoc_abs = time_dissoc_abs[finite]
    td = td[finite]
    yd = yd[finite]
    if len(td) < 8:
        return None

    head_n = min(max(3, len(yd) // 6), len(yd))
    tail_n = min(max(3, len(yd) // 5), len(yd))
    baseline0 = float(np.median(yd[-tail_n:]))
    amplitude0 = float(max(np.median(yd[:head_n]) - baseline0, 1e-9))
    y_signal = yd - baseline0
    positive_mask = y_signal > max(1e-9, np.percentile(np.maximum(y_signal, 0.0), 25))
    koff0 = 1e-3
    if np.sum(positive_mask) >= 4:
        try:
            slope, _ = np.polyfit(td[positive_mask], np.log(np.maximum(y_signal[positive_mask], 1e-12)), 1)
            if np.isfinite(slope):
                koff0 = float(np.clip(-slope, 1e-6, 10.0))
        except Exception:
            pass

    y_span = max(float(np.max(yd) - np.min(yd)), 1e-6)

    def dissoc_func(t_rel, amplitude, koff, baseline_fit):
        return baseline_fit + amplitude * np.exp(-koff * t_rel)

    try:
        popt, pcov = curve_fit(
            dissoc_func,
            td,
            yd,
            p0=[amplitude0, koff0, baseline0],
            bounds=(
                [0.0, 1e-8, -np.inf],
                [np.inf, 10.0, np.inf],
            ),
            x_scale="jac",
            maxfev=20000,
        )
    except Exception:
        return None

    amplitude_fit, koff_fit, baseline_fit = [float(v) for v in popt]
    if koff_fit <= 0:
        return None

    perr = np.sqrt(np.diag(pcov))
    amplitude_err = float(perr[0]) if len(perr) > 0 and np.isfinite(perr[0]) else np.nan
    koff_err = float(perr[1]) if len(perr) > 1 and np.isfinite(perr[1]) else np.nan
    baseline_err = float(perr[2]) if len(perr) > 2 and np.isfinite(perr[2]) else np.nan

    yhat = dissoc_func(td, *popt)
    residuals = yd - yhat
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((yd - np.mean(yd)) ** 2))
    r_squared = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "dissoc_time_abs_s": time_dissoc_abs.tolist(),
        "dissoc_time_rel_s": td.tolist(),
        "dissoc_response_plot": yd.tolist(),
        "dissoc_direct_fitted_plot": yhat.tolist(),
        "dissoc_norm_response_plot": ((yd - baseline_fit) / max(amplitude_fit, 1e-12)).tolist(),
        "dissoc_norm_direct_fit": np.exp(-koff_fit * td).tolist(),
        "dissoc_direct_koff": float(koff_fit),
        "dissoc_direct_koff_err": float(koff_err) if np.isfinite(koff_err) else np.nan,
        "dissoc_direct_r2": float(r_squared),
        "dissoc_direct_n_points": int(len(td)),
        "dissoc_direct_amplitude": float(amplitude_fit),
        "dissoc_direct_amplitude_err": float(amplitude_err) if np.isfinite(amplitude_err) else np.nan,
        "dissoc_direct_baseline": float(baseline_fit),
        "dissoc_direct_baseline_err": float(baseline_err) if np.isfinite(baseline_err) else np.nan,
        "dissoc_direct_boundary_parameters": boundary_flags(popt, [0., 1e-8, -np.inf], [np.inf, 10., np.inf],
                                                               ["dissociation amplitude", "direct koff", "dissociation baseline"]),
    }


def build_kobs_dissociation_overlay(
    time,
    response,
    t_assoc_start,
    t_dissoc_start,
    kdiss,
    normalize=True,
    baseline_offset=0.0,
    signal_sign=1.0,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    time = np.asarray(time, dtype=float)
    response = np.asarray(response, dtype=float)
    kdiss = float(kdiss)
    signal_sign = float(signal_sign)

    if len(time) == 0 or len(response) == 0 or len(time) != len(response):
        return None
    if (not np.isfinite(kdiss)) or kdiss <= 0:
        return None

    dissoc_mask = time >= max(float(t_dissoc_start), float(dissoc_window_start) if dissoc_window_start is not None else float(t_dissoc_start))
    if dissoc_window_end is not None:
        dissoc_mask &= time <= float(dissoc_window_end)
    if int(np.sum(dissoc_mask)) < 8:
        return None

    if normalize:
        baseline = float(baseline_offset)
        full_display = (response - baseline) * signal_sign
        baseline_display = 0.0
    else:
        base_mask = time < float(t_assoc_start)
        if np.any(base_mask):
            baseline = float(np.median(response[base_mask]))
        else:
            baseline = float(np.median(response))
        full_display = response * signal_sign
        baseline_display = baseline * signal_sign

    time_dissoc_abs = time[dissoc_mask]
    td = time_dissoc_abs - float(t_dissoc_start)
    yd = full_display[dissoc_mask]
    finite = np.isfinite(td) & np.isfinite(yd)
    time_dissoc_abs = time_dissoc_abs[finite]
    td = td[finite]
    yd = yd[finite]
    if len(td) < 8:
        return None

    exp_term = np.exp(-kdiss * td)
    signal_component = yd - baseline_display
    denom = float(np.dot(exp_term, exp_term))
    if denom <= 1e-30:
        return None

    amplitude = float(np.dot(signal_component, exp_term) / denom)
    if not np.isfinite(amplitude):
        return None
    amplitude = max(amplitude, 0.0)

    yhat = baseline_display + amplitude * exp_term
    residuals = yd - yhat
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((yd - np.mean(yd)) ** 2))
    r_squared = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "dissoc_time_abs_s": time_dissoc_abs.tolist(),
        "dissoc_time_rel_s": td.tolist(),
        "dissoc_response_plot": yd.tolist(),
        "dissoc_overlay_fitted_plot": yhat.tolist(),
        "dissoc_fit_start_s": float(time_dissoc_abs[0]),
        "dissoc_fit_end_s": float(time_dissoc_abs[-1]),
        "dissoc_overlay_r2": float(r_squared),
        "dissoc_n_points": int(len(td)),
        "dissoc_overlay_amplitude": float(amplitude),
        "dissoc_baseline_display": float(baseline_display),
    }


def fit_kobs_linearization(
    data_list,
    include_map,
    t_start,
    t_end,
    normalize=True,
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    rows = []
    curve_fits = []
    for data in data_list:
        fn = data.get("filename", "unknown")
        rep_group = data.get("repeat_group", fn)
        allowed = include_map.get(fn, set([c for c in data["concentrations"] if c != 0]))
        for conc in data["concentrations"]:
            if conc == 0 or conc not in allowed:
                continue
            fit = fit_kobs_from_association(
                data["time"],
                data["responses"][conc].copy(),
                t_start=t_start,
                t_end=t_end,
                normalize=normalize,
                assoc_window_start=assoc_window_start,
                assoc_window_end=assoc_window_end,
            )
            if fit is None:
                continue
            rows.append(
                {
                    "filename": fn,
                    "repeat_group": rep_group,
                    "concentration_nM": float(conc),
                    "concentration_M": float(conc) * 1e-9,
                    "kobs": float(fit["kobs"]),
                    "kobs_err": float(fit["kobs_err"]),
                    "gamma_eq": float(fit["gamma_eq"]),
                    "gamma_eq_err": float(fit["gamma_eq_err"]),
                    "assoc_r2": float(fit["assoc_r2"]),
                    "assoc_n_points": int(fit["assoc_n_points"]),
                }
            )
            curve_fits.append(
                {
                    "filename": fn,
                    "repeat_group": rep_group,
                    "concentration_nM": float(conc),
                    "kobs": float(fit["kobs"]),
                    "kobs_err": float(fit["kobs_err"]),
                    "gamma_eq": float(fit["gamma_eq"]),
                    "assoc_r2": float(fit["assoc_r2"]),
                    "assoc_n_points": int(fit["assoc_n_points"]),
                    "assoc_time_abs_s": fit["assoc_time_abs_s"],
                    "assoc_time_rel_s": fit["assoc_time_rel_s"],
                    "assoc_response_plot": fit["assoc_response_plot"],
                    "assoc_response_fitspace": fit["assoc_response_fitspace"],
                    "assoc_fitted_plot": fit["assoc_fitted_plot"],
                    "assoc_fit_start_s": float(fit["assoc_fit_start_s"]),
                    "assoc_fit_end_s": float(fit["assoc_fit_end_s"]),
                    "baseline_offset": float(fit["baseline_offset"]),
                    "signal_sign": float(fit["signal_sign"]),
                    "boundary_parameters": fit.get("boundary_parameters", []),
                    "residual_dependence": fit.get("residual_dependence", {}),
                    "assoc_residuals": fit["assoc_residuals"],
                    "rate_sensitivity": fit["rate_sensitivity"],
                    "rate_covariance_status": fit["rate_covariance_status"],
                    "on": float(t_start),
                    **curve_input(data, conc),
                }
            )

    if not rows:
        return None

    curve_df = pd.DataFrame(rows).sort_values(["concentration_nM", "filename"]).reset_index(drop=True)
    if curve_df["concentration_nM"].nunique() < 2:
        return None

    repeat_lookup = {d["filename"]: d.get("repeat_id", d["filename"]) for d in data_list}
    curve_df["repeat_id"] = curve_df["filename"].map(repeat_lookup)
    for fit in curve_fits:
        fit["repeat_id"] = repeat_lookup[fit["filename"]]
    repeat_kobs = curve_df.groupby(["repeat_id", "concentration_nM"], as_index=False).agg(
        kobs=("kobs", "mean"), assoc_r2=("assoc_r2", "mean"))
    agg = (
        repeat_kobs.groupby("concentration_nM", as_index=False)
        .agg(
            kobs_mean=("kobs", "mean"),
            kobs_sd=("kobs", "std"),
            kobs_n=("kobs", "size"),
            assoc_r2_mean=("assoc_r2", "mean"),
        )
        .sort_values("concentration_nM")
        .reset_index(drop=True)
    )
    agg["kobs_sem"] = agg["kobs_sd"] / np.sqrt(np.maximum(agg["kobs_n"], 1.0))
    agg["concentration_M"] = agg["concentration_nM"] * 1e-9

    x = agg["concentration_M"].to_numpy(dtype=float)
    y = agg["kobs_mean"].to_numpy(dtype=float)
    if len(x) < 2:
        return None

    def linear_model(c, kass, kdiss):
        return kass * c + kdiss

    lr = stats.linregress(x, y)

    sem = agg["kobs_sem"].to_numpy(dtype=float)
    valid_sem = np.isfinite(sem) & (sem > 0)
    use_weighted = bool(np.all(valid_sem))
    sigma = sem.copy() if use_weighted else None

    kass_err = np.nan
    kdiss_err = np.nan
    try:
        design = np.column_stack([x * 1e9, np.ones(len(x))])
        weights = 1 / sigma if use_weighted else np.ones(len(x))
        weights /= np.median(weights)
        opt = lsq_linear(design * weights[:, None], y * weights, bounds=(0., np.inf), method="bvls", tol=1e-12)
        if not opt.success or opt.x[0] <= 0:
            return None
        kass, kdiss = float(opt.x[0] * 1e9), float(opt.x[1])
        input_uncertainty = dict(applied=False, first_stage_propagated=False)
        pcov = None
        if not np.any(opt.active_mask) and not any(f.get("boundary_parameters") for f in curve_fits):
            try:
                pcov, input_uncertainty = kobs_propagation(curve_fits, agg["concentration_nM"].to_numpy(), y, weights, opt.x)
            except (ValueError, np.linalg.LinAlgError) as exc:
                input_uncertainty.update(error=str(exc), settings=common_options(curve_fits))
        if pcov is not None:
            perr = np.sqrt(np.diag(pcov))
            kass_err, kdiss_err = float(perr[0]), float(perr[1])
    except Exception:
        return None

    yhat = linear_model(x, kass, kdiss)
    residuals = y - yhat
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    linear_r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    KD = float(kdiss / max(kass, 1e-30))
    if pcov is not None and np.isfinite(kass_err) and np.isfinite(kdiss_err):
        gradient = np.array([-kdiss / kass**2, 1.0 / kass])
        KD_err = float(np.sqrt(max(float(gradient @ pcov @ gradient), 0.0)))
    else:
        KD_err = np.nan

    assoc_fit_quality = float(np.mean(curve_df["assoc_r2"])) if len(curve_df) else 0.0
    consistency_score = cv_to_score(curve_df["kobs"].to_numpy(dtype=float), max_good_cv=0.6)
    overall_score = clamp(0.5 * (linear_r2 * 100.0) + 0.3 * (assoc_fit_quality * 100.0) + 0.2 * consistency_score)

    xline = np.linspace(0.0, float(np.max(agg["concentration_nM"])) * 1.05, 180)
    yline = linear_model(xline * 1e-9, kass, kdiss)

    data_map = {d.get("filename", "unknown"): d for d in data_list}
    dissoc_direct_r2_map = {}
    dissoc_overlay_r2_map = {}
    dissoc_direct_koff_map = {}
    dissoc_direct_koff_err_map = {}
    dissoc_n_map = {}
    for fit in curve_fits:
        data_entry = data_map.get(str(fit.get("filename", "")))
        if data_entry is None:
            fit["dissoc_direct_r2"] = np.nan
            fit["dissoc_overlay_r2"] = np.nan
            fit["dissoc_direct_koff"] = np.nan
            fit["dissoc_direct_koff_err"] = np.nan
            fit["dissoc_n_points"] = 0
            continue
        response_trace = _lookup_response_trace(data_entry, float(fit.get("concentration_nM", np.nan)))
        if response_trace is None:
            fit["dissoc_direct_r2"] = np.nan
            fit["dissoc_overlay_r2"] = np.nan
            fit["dissoc_direct_koff"] = np.nan
            fit["dissoc_direct_koff_err"] = np.nan
            fit["dissoc_n_points"] = 0
            continue

        direct_dissoc_fit = fit_kobs_direct_dissociation(
            data_entry["time"],
            response_trace,
            t_assoc_start=t_start,
            t_dissoc_start=t_end,
            normalize=normalize,
            baseline_offset=float(fit.get("baseline_offset", 0.0)),
            signal_sign=float(fit.get("signal_sign", 1.0)),
            dissoc_window_start=dissoc_window_start,
            dissoc_window_end=dissoc_window_end,
        )
        if direct_dissoc_fit is None:
            fit["dissoc_direct_r2"] = np.nan
            fit["dissoc_overlay_r2"] = np.nan
            fit["dissoc_direct_koff"] = np.nan
            fit["dissoc_direct_koff_err"] = np.nan
            fit["dissoc_n_points"] = 0
            continue
        fit.update(direct_dissoc_fit)

        dissoc_overlay = build_kobs_dissociation_overlay(
            data_entry["time"],
            response_trace,
            t_assoc_start=t_start,
            t_dissoc_start=t_end,
            kdiss=kdiss,
            normalize=normalize,
            baseline_offset=float(fit.get("baseline_offset", 0.0)),
            signal_sign=float(fit.get("signal_sign", 1.0)),
            dissoc_window_start=dissoc_window_start,
            dissoc_window_end=dissoc_window_end,
        )
        if dissoc_overlay is None:
            fit["dissoc_overlay_r2"] = np.nan
        else:
            fit.update(dissoc_overlay)
            fit["dissoc_overlay_r2"] = float(dissoc_overlay["dissoc_overlay_r2"])
            fit["dissoc_n_points"] = int(dissoc_overlay["dissoc_n_points"])
            td_overlay = np.asarray(fit.get("dissoc_time_rel_s", []), dtype=float)
            if len(td_overlay):
                fit["dissoc_norm_kdiss_overlay"] = np.exp(-kdiss * td_overlay).tolist()

        key = (str(fit.get("filename", "")), float(fit.get("concentration_nM", np.nan)))
        dissoc_direct_r2_map[key] = float(fit.get("dissoc_direct_r2", np.nan))
        dissoc_overlay_r2_map[key] = float(fit.get("dissoc_overlay_r2", np.nan))
        dissoc_direct_koff_map[key] = float(fit.get("dissoc_direct_koff", np.nan))
        dissoc_direct_koff_err_map[key] = float(fit.get("dissoc_direct_koff_err", np.nan))
        dissoc_n_map[key] = int(fit.get("dissoc_direct_n_points", fit.get("dissoc_n_points", 0)))

    curve_df["dissoc_direct_r2"] = curve_df.apply(
        lambda row: dissoc_direct_r2_map.get((str(row["filename"]), float(row["concentration_nM"])), np.nan),
        axis=1,
    )
    curve_df["dissoc_overlay_r2"] = curve_df.apply(
        lambda row: dissoc_overlay_r2_map.get((str(row["filename"]), float(row["concentration_nM"])), np.nan),
        axis=1,
    )
    curve_df["dissoc_direct_koff"] = curve_df.apply(
        lambda row: dissoc_direct_koff_map.get((str(row["filename"]), float(row["concentration_nM"])), np.nan),
        axis=1,
    )
    curve_df["dissoc_direct_koff_err"] = curve_df.apply(
        lambda row: dissoc_direct_koff_err_map.get((str(row["filename"]), float(row["concentration_nM"])), np.nan),
        axis=1,
    )
    curve_df["dissoc_n_points"] = curve_df.apply(
        lambda row: dissoc_n_map.get((str(row["filename"]), float(row["concentration_nM"])), 0),
        axis=1,
    )
    curve_df["dissoc_vs_kdiss_fold"] = curve_df["dissoc_direct_koff"].apply(
        lambda val: float(max(val, kdiss) / max(min(val, kdiss), 1e-30)) if np.isfinite(val) and val > 0 and kdiss > 0 else np.nan
    )

    return {
        "method": "kobs_linearization",
        "weighting": "Independent-repeat SEM (relative weights)" if use_weighted else "Unweighted (at least one repeat SEM unavailable or zero)",
        "uncertainty_method": "Local first-stage-propagated kobs standard uncertainty; not independent-repeat SD" if pcov is not None else "Unavailable: first-stage or boundary-limited kobs uncertainty",
        "input_uncertainty": input_uncertainty,
        "covariance_rates": pcov,
        "summary_eligible": pcov is not None and kdiss > 1e-8 and not np.any(opt.active_mask) and not any(f.get("boundary_parameters") for f in curve_fits),
        "scientific_warnings": (["Association-rate fit at a parameter bound; routine summary withheld."] if any(f.get("boundary_parameters") for f in curve_fits) else [])
                               + (["Serially correlated association residuals: first-stage IID covariance can underestimate uncertainty; use a supported raw-noise budget."] if any(f.get("residual_dependence", {}).get("serial_correlation_flag") for f in curve_fits) and not (input_uncertainty.get("applied") and input_uncertainty.get("settings", {}).get("propagate_measurement") and input_uncertainty["settings"]["raw_correlation_time_s"] > 0) else [])
                               + (["Two concentrations determine a line without a lack-of-fit check; propagated first-stage errors are not second-stage residual error estimates."] if len(x) <= 2 else [])
                               + ([input_uncertainty["error"]] if input_uncertainty.get("error") else [])
                               + ["Rate errors propagate first-stage measurement uncertainty, not between-repeat kinetic heterogeneity. Independent-repeat SD is reported separately."],
        "intercept_at_boundary": bool(kdiss <= 1e-8),
        "unconstrained_intercept": float(lr.intercept) if "lr" in locals() else np.nan,
        "n_independent_repeats": int(curve_df["repeat_id"].nunique()),
        "kass": float(kass),
        "kdiss": float(kdiss),
        "KD": float(KD),
        "kass_err": float(kass_err) if np.isfinite(kass_err) else np.nan,
        "kdiss_err": float(kdiss_err) if np.isfinite(kdiss_err) else np.nan,
        "KD_err": float(KD_err) if np.isfinite(KD_err) else np.nan,
        "linearity_r2": float(linear_r2),
        "assoc_curve_mean_r2": float(assoc_fit_quality),
        "overall_score": float(overall_score),
        "n_curves": int(len(curve_df)),
        "n_unique_concentrations": int(curve_df["concentration_nM"].nunique()),
        "fit_x_nM": xline,
        "fit_y_kobs": yline,
        "curve_table": curve_df,
        "curve_fits": curve_fits,
        "concentration_table": agg,
    }


def select_curve_subset_for_model_selector(curves, max_curves=18):
    if len(curves) <= int(max_curves):
        return curves, False
    ordered = sorted(curves, key=lambda c: (c.get("filename", ""), float(c.get("concentration_nM", 0.0))))
    idx = np.linspace(0, len(ordered) - 1, int(max_curves), dtype=int)
    idx = np.unique(idx)
    subset = [ordered[i] for i in idx]
    return subset, True


def _model_support_label(delta_aicc):
    if not np.isfinite(delta_aicc):
        return "No support"
    if delta_aicc <= 2.0:
        return "Substantial support"
    if delta_aicc <= 6.0:
        return "Moderate support"
    if delta_aicc <= 10.0:
        return "Weak support"
    return "Essentially unsupported"


def _safe_aicc(aic, n_points, n_params):
    if n_points <= (n_params + 1):
        return np.inf
    return float(aic + (2.0 * n_params * (n_params + 1.0)) / (n_points - n_params - 1.0))


def evaluate_kinetic_model_candidates(
    data_list,
    t_start,
    t_end,
    include_map,
    normalize=True,
    correct_drift=False,
    include_nonspecific=False,
    max_curves=18,
    max_points_per_curve=360,
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
):
    curves_all = _collect_kinetic_curves(
        data_list,
        include_map,
        t_start=t_start,
        t_end=t_end,
        normalize=normalize,
        correct_drift=correct_drift,
        rmax_group_mode="Per file (repeat-specific)",
        assoc_window_start=assoc_window_start,
        assoc_window_end=assoc_window_end,
        dissoc_window_start=dissoc_window_start,
        dissoc_window_end=dissoc_window_end,
    )
    if not curves_all:
        return None
    curves_subset, subset_applied = select_curve_subset_for_model_selector(curves_all, max_curves=max_curves)
    curves = [downsample_curve_object(c, max_points=max_points_per_curve) for c in curves_subset]

    model_defs = [
        {"label": "1:1 Langmuir", "code": "1:1", "n_params": 3},
        {"label": "1:1 + Delivery Lag", "code": "1:1+MT", "n_params": 4},
        {"label": "2-State", "code": "2-state", "n_params": 5},
    ]

    rows = []
    model_curve_info = {}
    for md in model_defs:
        fits = []
        per_curve = {}
        for curve in curves:
            fit = fit_kinetics_advanced(
                curve["time"],
                curve["response"].copy(),
                curve["concentration_M"],
                t_start,
                t_end,
                normalize=False,
                correct_drift=correct_drift,
                include_nonspecific=include_nonspecific,
                model=md["code"],
                show_warnings=False,
                fit_mask=curve.get("fit_mask"),
            )
            if fit:
                expected_mask = np.asarray(curve["fit_mask"], dtype=bool)
                actual_mask = np.asarray(fit.get("fit_mask", expected_mask), dtype=bool)
                residuals = np.asarray(fit.get("residuals_fit", []), dtype=float)
                if not np.array_equal(expected_mask, actual_mask) or len(residuals) != int(expected_mask.sum()) or not np.isfinite(residuals).all():
                    continue
                fits.append(fit)
                curve_key = f"{curve['filename']}::{curve['concentration_nM']:.12g}"
                rss = float(np.sum(residuals**2))
                n_points = int(len(residuals))
                n_params = int(fit.get("n_params", md["n_params"]))
                per_curve[curve_key] = {
                    "rss": max(rss, 1e-300),
                    "n_points": n_points,
                    "n_params": n_params,
                    **gaussian_information(residuals, n_params),
                }

        n_total = len(curves)
        n_ok = len(fits)
        success_rate = n_ok / max(n_total, 1)
        eligible = n_ok == n_total and n_total > 0
        if eligible:
            total_aic = float(sum(v["aic"] for v in per_curve.values()))
            total_bic = float(sum(v["bic"] for v in per_curve.values()))
            total_aicc = float(sum(v["aicc"] for v in per_curve.values()))
            mean_r2 = float(np.mean([f["r_squared"] for f in fits]))
            mean_quality = float(np.mean([f["quality_score"] for f in fits]))
            total_rss = float(sum(v["rss"] for v in per_curve.values()))
            total_points = int(sum(v["n_points"] for v in per_curve.values()))
            total_params = int(sum(v["k"] for v in per_curve.values()))
            log_likelihood = float(sum(v["log_likelihood"] for v in per_curve.values()))
        else:
            total_aic = np.inf
            total_aicc = np.inf
            total_bic = np.inf
            mean_r2 = 0.0
            mean_quality = 0.0
            total_rss = np.inf
            total_points = 0
            total_params = 0
            log_likelihood = -np.inf

        rows.append(
            {
                "Model": md["label"],
                "code": md["code"],
                "n_params": md["n_params"],
                "Fits": n_ok,
                "Fit Success %": 100.0 * success_rate,
                "Comparable": eligible,
                "Status": "Complete observation set" if eligible else "Excluded: failed or mismatched observation set",
                "Serial correlation": any(f.get("residual_dependence", {}).get("serial_correlation_flag") for f in fits),
                "Boundary fits": sum(bool(f.get("boundary_parameters")) for f in fits),
                "Total AIC": total_aic,
                "Total AICc": total_aicc,
                "Total BIC": total_bic,
                "LogLik": log_likelihood,
                "Total RSS": total_rss,
                "N Points": total_points,
                "N Params": total_params,
                "Mean R²": mean_r2,
                "Mean Quality": mean_quality,
            }
        )
        model_curve_info[md["code"]] = per_curve

    finite = [r for r in rows if r["Comparable"] and np.isfinite(r["Total AICc"])]
    if not finite:
        return {"table": rows, "recommended": None, "nested_tests": [], "reason": "No candidate has a complete identical observation set and enough residual degrees of freedom for AICc."}

    best_aic = min(r["Total AIC"] for r in finite)
    best_aicc = min(r["Total AICc"] for r in finite)
    best_bic = min(r["Total BIC"] for r in finite)
    for r in rows:
        r["ΔAIC"] = float(r["Total AIC"] - best_aic) if np.isfinite(r["Total AIC"]) else np.inf
        r["ΔAICc"] = float(r["Total AICc"] - best_aicc) if np.isfinite(r["Total AICc"]) else np.inf
        r["ΔBIC"] = float(r["Total BIC"] - best_bic) if np.isfinite(r["Total BIC"]) else np.inf

    weight_den = float(np.sum([np.exp(-0.5 * r["ΔAICc"]) for r in finite]))
    for r in rows:
        if np.isfinite(r["ΔAICc"]) and weight_den > 0:
            r["Akaike Weight"] = float(np.exp(-0.5 * r["ΔAICc"]) / weight_den)
        else:
            r["Akaike Weight"] = 0.0
        r["Support"] = _model_support_label(r["ΔAICc"])

    ordered = sorted(finite, key=lambda x: (x["Total AICc"], x["n_params"], -x["Fit Success %"]))
    recommended = ordered[0]
    if len(ordered) > 1:
        runner_up = ordered[1]
        if (
            runner_up["ΔAICc"] <= 2.0
            and runner_up["n_params"] < recommended["n_params"]
            and runner_up["Fit Success %"] >= max(60.0, recommended["Fit Success %"] - 20.0)
        ):
            recommended = runner_up

    confidence = "Relative AICc support only"
    reason = "Compared on identical selected observations using separate per-curve Gaussian residual variances. Akaike weights are relative support within this candidate set, not mechanism probabilities."
    if len(finite) < 2:
        recommended = None
        reason = "Fewer than two candidates fitted the full identical observation set. No model recommendation is available."
    elif recommended["Boundary fits"]:
        recommended = None
        reason = "The preferred conditional candidate contains boundary estimates. Inspect those fits; automatic model recommendation withheld."
    elif any(row["Serial correlation"] for row in finite):
        recommended = None
        reason = "Serially correlated residuals violate the IID likelihood assumption. Criteria are diagnostic only; automatic recommendation withheld."

    best_weight = max([r.get("Akaike Weight", 0.0) for r in rows]) if rows else 0.0
    for r in rows:
        if r.get("Akaike Weight", 0.0) > 0 and best_weight > 0:
            r["Evidence Ratio"] = float(best_weight / r["Akaike Weight"])
        else:
            r["Evidence Ratio"] = np.inf

    return {
        "table": rows,
        "recommended": recommended,
        "reason": reason,
        "confidence": confidence,
        "nested_tests": [],
        "ranking_metric": "AICc",
        "notes": "AICc is summed over per-curve likelihoods, counting each fitted residual variance. Ordinary chi-square likelihood-ratio p-values are not reported: these alternatives have nonregular or boundary limits. Delivery lag is empirical, not a coupled mass-transport mechanism.",
        "observation_sets": {code: {key: info["n_points"] for key, info in values.items()} for code, values in model_curve_info.items()},
        "curve_subset_applied": bool(subset_applied),
        "curves_available": int(len(curves_all)),
        "curves_used": int(len(curves)),
        "max_points_per_curve": int(max_points_per_curve),
    }


def evaluate_global_mechanistic_candidates(
    data_list,
    t_start,
    t_end,
    include_map=None,
    normalize=True,
    correct_drift=False,
    include_nonspecific=False,
    assoc_window_start=None,
    assoc_window_end=None,
    dissoc_window_start=None,
    dissoc_window_end=None,
    starts=2,
    runtime_s=30.0,
):
    """Compare global shared-rate mechanistic models on the exact full selected observation set."""
    if not data_list:
        return None
    eff_include = include_map or {d["filename"]: {c for c in d["concentrations"] if c > 0} for d in data_list}
    all_times = np.concatenate([np.asarray(d["time"], dtype=float) for d in data_list if len(d.get("time", []))])
    t_max = float(np.max(all_times)) if len(all_times) else float(t_end) + 60.0
    windows = dict(
        phase_assoc_start_s=float(t_start),
        phase_dissoc_start_s=float(t_end),
        fit_assoc_start_s=float(assoc_window_start if assoc_window_start is not None else t_start),
        fit_assoc_end_s=float(assoc_window_end if assoc_window_end is not None else t_end),
        fit_dissoc_start_s=float(dissoc_window_start if dissoc_window_start is not None else t_end),
        fit_dissoc_end_s=float(dissoc_window_end if dissoc_window_end is not None else t_max),
    )
    try:
        curves = prepare_curves(data_list, eff_include, windows, normalize=normalize)
    except ValueError:
        return None
    response_scale = max(float(np.ptp(np.concatenate([c["response"][c["fit_mask"]] for c in curves]))), 1e-6)
    candidate_defs = [
        {"label": "1:1 Langmuir", "code": "langmuir", "model": "langmuir", "transport": "None"},
        {"label": "1:1 + Quasi-Steady Transport", "code": "langmuir_transport", "model": "langmuir", "transport": "Quasi-steady 1:1 transport"},
        {"label": "2-State", "code": "two_state", "model": "two_state", "transport": "None"},
        {"label": "Heterogeneous 2-Site", "code": "heterogeneous", "model": "heterogeneous", "transport": "None"},
    ]
    rows = []
    for cd in candidate_defs:
        try:
            rules = parameter_defaults(
                cd["model"],
                response_scale=response_scale,
                transport=cd["transport"],
                nonspecific=False,
                drift=correct_drift,
                linear_nonspecific=include_nonspecific,
            )
            res = fit_mechanism(
                curves,
                cd["model"],
                rules,
                transport=cd["transport"],
                nonspecific=False,
                starts=int(starts),
                runtime_s=float(runtime_s),
                max_nfev=600,
                compute_input_uncertainty=False,
            )
            summary_kin = mechanistic_to_kinetic_summary(res)
            ic = res["information_criteria"]
            n_ok = len(res["curves"])
            eligible = True
            total_aic = float(ic["aic"])
            total_aicc = float(ic["aicc"])
            total_bic = float(ic["bic"])
            log_lik = float(ic["log_likelihood"])
            total_rss = float(res["rss"])
            total_points = int(res["n_observations"])
            total_params = int(res["n_parameters"])
            mean_r2 = float(summary_kin["diagnostic_summary"]["mean_r2"])
            mean_quality = float(np.clip(mean_r2 * 100.0, 0.0, 100.0)) if np.isfinite(mean_r2) else 0.0
            serial_flag = any(c.get("residual_dependence", {}).get("serial_correlation_flag", False) for c in res["curves"])
            bound_count = len(res.get("boundary_parameters", []))
        except (ValueError, RuntimeError, FloatingPointError):
            n_ok = 0
            eligible = False
            total_aic = total_aicc = total_bic = total_rss = np.inf
            log_lik = -np.inf
            total_points = total_params = 0
            mean_r2 = mean_quality = 0.0
            serial_flag = False
            bound_count = 0
        rows.append(
            {
                "Model": cd["label"],
                "code": cd["code"],
                "n_params": total_params if eligible else 0,
                "Fits": n_ok,
                "Fit Success %": 100.0 if eligible else 0.0,
                "Comparable": eligible,
                "Status": "Complete global observation set" if eligible else "Failed global convergence",
                "Serial correlation": serial_flag,
                "Boundary fits": bound_count,
                "Total AIC": total_aic,
                "Total AICc": total_aicc,
                "Total BIC": total_bic,
                "LogLik": log_lik,
                "Total RSS": total_rss,
                "N Points": total_points,
                "N Params": total_params,
                "Mean R²": mean_r2,
                "Mean Quality": mean_quality,
            }
        )
    finite = [r for r in rows if r["Comparable"] and np.isfinite(r["Total AICc"])]
    if not finite:
        return {
            "table": rows,
            "recommended": None,
            "nested_tests": [],
            "reason": "No global mechanistic candidate converged on the full selected observation set.",
        }
    best_aic = min(r["Total AIC"] for r in finite)
    best_aicc = min(r["Total AICc"] for r in finite)
    best_bic = min(r["Total BIC"] for r in finite)
    for r in rows:
        r["ΔAIC"] = float(r["Total AIC"] - best_aic) if np.isfinite(r["Total AIC"]) else np.inf
        r["ΔAICc"] = float(r["Total AICc"] - best_aicc) if np.isfinite(r["Total AICc"]) else np.inf
        r["ΔBIC"] = float(r["Total BIC"] - best_bic) if np.isfinite(r["Total BIC"]) else np.inf
    weight_den = float(np.sum([np.exp(-0.5 * r["ΔAICc"]) for r in finite]))
    for r in rows:
        r["Akaike Weight"] = float(np.exp(-0.5 * r["ΔAICc"]) / weight_den) if np.isfinite(r["ΔAICc"]) and weight_den > 0 else 0.0
        r["Support"] = _model_support_label(r["ΔAICc"])
    ordered = sorted(finite, key=lambda x: (x["Total AICc"], x["n_params"]))
    recommended = ordered[0]
    if len(ordered) > 1 and ordered[1]["ΔAICc"] <= 2.0 and ordered[1]["n_params"] < recommended["n_params"]:
        recommended = ordered[1]
    reason = "Global mechanistic models compared on identical full selected observations with shared kinetic rate constants."
    if recommended["Boundary fits"]:
        recommended = None
        reason = "The lowest-AICc global candidate hit a parameter bound; automatic recommendation withheld."
    elif any(r["Serial correlation"] for r in finite):
        recommended = None
        reason = "Serially correlated residuals detected; IID Gaussian AICc is diagnostic only and automatic recommendation is withheld."
    best_weight = max((r.get("Akaike Weight", 0.0) for r in rows), default=0.0)
    for r in rows:
        r["Evidence Ratio"] = float(best_weight / r["Akaike Weight"]) if r.get("Akaike Weight", 0.0) > 0 and best_weight > 0 else np.inf
    return {
        "table": rows,
        "recommended": recommended,
        "reason": reason,
        "confidence": "Global shared-rate AICc support",
        "nested_tests": [],
        "ranking_metric": "AICc",
        "notes": "Evaluated globally across all included curves without curve subsampling or point downsampling.",
        "curve_subset_applied": False,
        "curves_available": len(curves),
        "curves_used": len(curves),
        "max_points_per_curve": max(int(np.count_nonzero(c["fit_mask"])) for c in curves),
    }


def fit_equilibrium_advanced(
    data_list,
    t_measure,
    include_map,
    model="simple",
    aggregate_repeats=False,
    normalize_percent_bmax=False,
    t_assoc_start=None,
):
    records = []
    dataset_norm_info = []
    input_curves, raw_file_means = [], []

    for data in data_list:
        fn = data.get("filename", "unknown")
        rep_group = data.get("repeat_group", fn)
        allowed = include_map.get(fn, set([c for c in data["concentrations"] if c != 0]))
        if not any(c > 0 and c in allowed for c in data["concentrations"]):
            continue
        t = np.asarray(data["time"], dtype=float)

        # A trailing five-second window cannot leak dissociation or future data.
        if t_measure < t[0] or t_measure > t[-1]:
            return None
        sample_mask = (t >= t_measure - 5.0) & (t <= t_measure)
        if t_assoc_start is not None:
            sample_mask &= t >= t_assoc_start
        if np.count_nonzero(sample_mask) < 2:
            return None

        file_points = []
        for conc in data["concentrations"]:
            if conc == 0 or conc not in allowed:
                continue

            y = np.asarray(data["responses"][conc], dtype=float)
            avg_response = float(np.mean(y[sample_mask]))
            file_points.append((float(conc), avg_response))
            raw_file_means.append(avg_response)
            input_curves.append(dict(filename=fn, concentration_nM=float(conc), repeat_id=data.get("repeat_id", fn),
                sample_times=t[sample_mask], on=float(t_assoc_start) if t_assoc_start is not None else float(t[0]), **curve_input(data, conc)))

        if not file_points:
            continue

        if normalize_percent_bmax:
            file_responses = np.array([p[1] for p in file_points], dtype=float)
            bmax_scale = float(np.max(file_responses))
            if (not np.isfinite(bmax_scale)) or abs(bmax_scale) < 1e-12:
                bmax_scale = float(np.max(np.abs(file_responses))) if len(file_responses) else 1.0
            bmax_scale = max(bmax_scale, 1e-12)
            dataset_norm_info.append(
                {"filename": fn, "repeat_group": rep_group, "bmax_scale_raw": bmax_scale, "n_points": len(file_points)}
            )
            for conc, resp in file_points:
                records.append(
                    {
                        "filename": fn,
                        "repeat_group": rep_group,
                        "concentration": conc,
                        "response": 100.0 * resp / bmax_scale,
                    }
                )
        else:
            dataset_norm_info.append(
                {"filename": fn, "repeat_group": rep_group, "bmax_scale_raw": np.nan, "n_points": len(file_points)}
            )
            for conc, resp in file_points:
                records.append(
                    {
                        "filename": fn,
                        "repeat_group": rep_group,
                        "concentration": conc,
                        "response": resp,
                    }
                )

    if not records:
        return None

    df_raw = pd.DataFrame(records)
    if df_raw.concentration.nunique() < (4 if model == "hill" else 3):
        return None
    repeat_lookup = {d["filename"]: d.get("repeat_id", d["filename"]) for d in data_list}
    df_raw["repeat_id"] = df_raw["filename"].map(repeat_lookup)
    repeat_responses = df_raw.groupby(["repeat_id", "concentration"], as_index=False).agg(response=("response", "mean"))
    raw_concentrations = df_raw["concentration"].to_numpy(dtype=float)
    raw_responses = df_raw["response"].to_numpy(dtype=float)
    raw_repeat_groups = df_raw["repeat_group"].to_numpy(dtype=str)

    if aggregate_repeats:
        agg = (
            repeat_responses.groupby("concentration", as_index=False)
            .agg(response_mean=("response", "mean"), response_sd=("response", "std"), n=("response", "size"))
            .sort_values("concentration")
        )
        concentrations = agg["concentration"].to_numpy(dtype=float)
        responses = agg["response_mean"].to_numpy(dtype=float)
        response_sd = agg["response_sd"].to_numpy(dtype=float)
        response_sem = response_sd / np.sqrt(np.maximum(agg["n"].to_numpy(dtype=float), 1.0))
        # Unknown or zero repeat variability is not a known positive fitting error.
        sigma = response_sem.copy() if np.all(np.isfinite(response_sem) & (response_sem > 0)) else None
    else:
        concentrations = repeat_responses["concentration"].to_numpy(dtype=float)
        responses = repeat_responses["response"].to_numpy(dtype=float)
        response_sd = np.full_like(concentrations, np.nan)
        response_sem = np.full_like(concentrations, np.nan)
        sigma = None

    try:
        inference = fit_profile_isotherm(concentrations, responses, sigma=sigma, model=model)
        Rmax, KD, n_hill = inference["Rmax"], inference["KD"], inference["n_hill"]
        if normalize_percent_bmax:
            inference["scientific_warnings"].append("Observed-maximum normalization is not measured Bmax. Conditional model uncertainty does not propagate the estimated normalization factor.")
            if (
                aggregate_repeats
                and sigma is None
                and np.any(np.isfinite(response_sem) & (response_sem == 0))
                and np.any(np.isfinite(response_sem) & (response_sem > 0))
            ):
                inference["scientific_warnings"].append(
                    "Observed-maximum normalization pins the peak concentration to 100%, creating zero repeat SEM at the anchor concentration; fit used unweighted least squares across aggregated means."
                )
                inference["weighting"] = (
                    "Unweighted least squares: observed-maximum normalization pins the peak concentration to 100%, creating zero repeat SEM at the anchor concentration"
                )

        x_max = float(np.max(concentrations))
        conc_fit = np.linspace(0.0, x_max * 1.05, 240)

        if model == "simple":
            response_fit = equilibrium_binding(conc_fit, Rmax, KD)
            fitted_responses = equilibrium_binding(concentrations, Rmax, KD)
        else:
            response_fit = hill_equation(conc_fit, Rmax, KD, n_hill)
            fitted_responses = hill_equation(concentrations, Rmax, KD, n_hill)

        residuals = responses - fitted_responses
        ss_res = np.sum(residuals**2)
        ss_tot = np.sum((responses - responses.mean()) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0
        information = gaussian_information(residuals, 3 if model == "hill" else 2, sigma=sigma)
        aic, bic = information["aic"], information["bic"]
        input_uncertainty = dict(applied=False)
        if requested(common_options(input_curves)):
            try:
                if inference["boundary_parameters"] or not inference["identifiable"]:
                    raise ValueError("Input uncertainty cannot repair an unresolved/bound-limited isotherm.")
                aggregation = np.zeros((len(concentrations), len(input_curves)))
                targets = [(None, concentration) for concentration in concentrations] if aggregate_repeats else list(zip(repeat_responses.repeat_id, repeat_responses.concentration))
                for j, (repeat, concentration) in enumerate(targets):
                    matching = [i for i, curve in enumerate(input_curves) if curve["concentration_nM"] == concentration and (repeat is None or curve["repeat_id"] == repeat)]
                    repeats = {input_curves[i]["repeat_id"] for i in matching}
                    for i in matching:
                        technical = sum(input_curves[k]["repeat_id"] == input_curves[i]["repeat_id"] for k in matching)
                        aggregation[j, i] = 1/(len(repeats)*technical)
                weights = np.ones(len(responses)) if sigma is None else 1/sigma
                weights /= np.median(weights)
                occupancy = 1/(1+np.exp(np.clip(n_hill*(np.log(KD)-np.log(concentrations)), -700, 700)))
                jac = np.column_stack([occupancy, -Rmax*occupancy*(1-occupancy)*n_hill/KD])
                if model == "hill":
                    jac = np.column_stack([jac, Rmax*occupancy*(1-occupancy)*(np.log(concentrations)-np.log(KD))])
                conditional = conditional_covariance(jac*weights[:, None], residuals*weights)["covariance"]
                parameters = [Rmax, KD] + ([n_hill] if model == "hill" else [])
                covariance, input_uncertainty = isotherm_propagation(input_curves, raw_file_means, aggregation,
                    concentrations, weights, parameters, conditional, normalize_percent_bmax)
                inference["conditional_parameter_se"] = {key: inference[key] for key in ["Rmax_err", "KD_err", "n_hill_err"]}
                errors = np.sqrt(np.maximum(np.diag(covariance), 0.))
                inference.update(Rmax_err=float(errors[0]), KD_err=float(errors[1]),
                                 n_hill_err=float(errors[2]) if model == "hill" else np.nan, uncertainty_method=INPUT_ERROR)
                inference["scientific_warnings"].append("Displayed standard uncertainties include the saved raw-input/calibration budget. The separate profile interval remains conditional on concentrations and referencing.")
            except (ValueError, np.linalg.LinAlgError) as exc:
                input_uncertainty = dict(applied=False, error=str(exc), settings=common_options(input_curves))
                inference.update(Rmax_err=np.nan, KD_err=np.nan, n_hill_err=np.nan,
                                 uncertainty_method="Unavailable: requested input-uncertainty propagation failed")
                inference["scientific_warnings"].append(str(exc))

        return {
            **inference,
            "input_uncertainty": input_uncertainty,
            "concentrations": concentrations,
            "responses": responses,
            "conc_fit": conc_fit,
            "response_fit": response_fit,
            "r_squared": float(r_squared),
            "residuals": residuals,
            "aic": float(aic),
            "bic": float(bic),
            "information_criteria": information,
            "model": model,
            "aggregate_repeats": bool(aggregate_repeats),
            "normalize_percent_bmax": bool(normalize_percent_bmax),
            "response_sd": response_sd,
            "response_sem": response_sem,
            "weighting": "Repeat SEM (relative weights)" if sigma is not None else "Unweighted (repeat SEM unavailable or zero)",
            "raw_concentrations": raw_concentrations,
            "raw_responses": raw_responses,
            "raw_repeat_groups": raw_repeat_groups,
            "dataset_bmax_table": pd.DataFrame(dataset_norm_info),
            "repeat_response_table": repeat_responses,
            "t_measure": float(t_measure),
        }
    except Exception as e:
        st.error(f"Equilibrium fit failed: {str(e)}")
        return None


# ============================================================================
# NEW: DIAGNOSTIC EVALUATORS
# ============================================================================


def evaluate_kinetic_diagnostics(results, data_list):
    fits = results.get("individual_fits", [])
    if not fits:
        return {"overall_score": 0.0, "panels": {}}

    all_residuals = np.concatenate([fit.get("residuals_fit", fit["residuals"]) for fit in fits])

    mean_res = float(np.mean(all_residuals))
    std_res = float(np.std(all_residuals) + 1e-12)
    bias_ratio = abs(mean_res) / std_res
    residual_bias_score = clamp(100.0 * np.exp(-2.8 * bias_ratio))

    fit_quality_score = clamp(np.mean([f["quality_score"] for f in fits]))

    if len(all_residuals) > 8:
        sample = all_residuals[:5000] if len(all_residuals) > 5000 else all_residuals
        _, p_norm = stats.shapiro(sample)
        # Keep normality informative but not overly punitive for otherwise strong datasets.
        residual_normality_score = clamp(72.0 + 28.0 * min(1.0, p_norm / 0.02))
    else:
        residual_normality_score = 72.0

    qq = stats.probplot(all_residuals, dist="norm")
    theo = qq[0][0]
    ordered = qq[0][1]
    if len(theo) > 2:
        qq_r = np.corrcoef(theo, ordered)[0, 1] ** 2
        qq_score = clamp(60.0 + 40.0 * qq_r)
    else:
        qq_score = 60.0

    kobs_r2 = results.get("mass_transport_r2", np.nan)
    if np.isfinite(kobs_r2):
        if kobs_r2 >= 0.98:
            kobs_linearity_score = 100.0
        elif kobs_r2 >= 0.95:
            kobs_linearity_score = 95.0
        elif kobs_r2 >= 0.90:
            kobs_linearity_score = 88.0
        elif kobs_r2 >= 0.85:
            kobs_linearity_score = 78.0
        else:
            kobs_linearity_score = clamp(kobs_r2 * 80.0)
        kobs_detail = f"R²={kobs_r2:.3f}"
    else:
        kobs_linearity_score = 88.0
        kobs_detail = "model-based (not linear k_obs)"

    kon_consistency = cv_to_score([f["kon"] for f in fits], max_good_cv=0.65)
    koff_consistency = cv_to_score([f["koff"] for f in fits], max_good_cv=0.65)
    kd_consistency = cv_to_score([f["KD"] for f in fits], max_good_cv=0.80)

    panels = {
        "residual_time": {
            "name": "Residuals vs Time",
            "score": residual_bias_score,
            "detail": f"mean/std={bias_ratio:.3f}",
        },
        "fit_quality": {
            "name": "Fit Quality by Curve",
            "score": fit_quality_score,
            "detail": f"avg quality={fit_quality_score:.1f}",
        },
        "residual_hist": {
            "name": "Residual Distribution",
            "score": residual_normality_score,
            "detail": "normality",
        },
        "qq_plot": {
            "name": "Q-Q Normality",
            "score": qq_score,
            "detail": f"R²={qq_score/100:.3f}",
        },
        "kobs": {
            "name": "k_obs Linearity",
            "score": kobs_linearity_score,
            "detail": kobs_detail,
        },
        "kon_dist": {
            "name": "k_on Consistency",
            "score": kon_consistency,
            "detail": "distribution tightness",
        },
        "koff_dist": {
            "name": "k_off Consistency",
            "score": koff_consistency,
            "detail": "distribution tightness",
        },
        "kd_dist": {
            "name": "K_D Consistency",
            "score": kd_consistency,
            "detail": "distribution tightness",
        },
    }

    weights = {
        "residual_time": 1.2,
        "fit_quality": 3.0,
        "residual_hist": 0.25,
        "qq_plot": 0.25,
        "kobs": 3.2,
        "kon_dist": 0.5,
        "koff_dist": 0.5,
        "kd_dist": 0.6,
    }

    total_w = sum(weights.values())
    overall = sum(panels[k]["score"] * weights[k] for k in panels) / total_w

    return {
        "overall_score": float(overall),
        "overall_label": score_label(overall),
        "panels": panels,
    }


def evaluate_kobs_linearization_diagnostics(kobs_results):
    if not kobs_results:
        return {"overall_score": 0.0, "overall_label": score_label(0.0), "panels": {}}

    linearity_r2 = float(kobs_results.get("linearity_r2", np.nan))
    assoc_r2 = float(kobs_results.get("assoc_curve_mean_r2", np.nan))
    curve_df = kobs_results.get("curve_table")
    conc_df = kobs_results.get("concentration_table")

    if np.isfinite(linearity_r2):
        linearity_score = clamp(linearity_r2 * 100.0)
        linearity_detail = f"R²={linearity_r2:.3f}"
    else:
        linearity_score = 0.0
        linearity_detail = "R² unavailable"

    if np.isfinite(assoc_r2):
        assoc_score = clamp(assoc_r2 * 100.0)
        assoc_detail = f"mean R²={assoc_r2:.3f}"
    else:
        assoc_score = 0.0
        assoc_detail = "association fits unavailable"

    repeat_score = 75.0
    repeat_detail = "no repeat concentrations"
    if isinstance(curve_df, pd.DataFrame) and (not curve_df.empty):
        cv_values = []
        for _, group in curve_df.groupby("concentration_nM"):
            vals = group["kobs"].to_numpy(dtype=float)
            if len(vals) < 2:
                continue
            mean_abs = abs(float(np.mean(vals)))
            if mean_abs <= 1e-30:
                continue
            cv_values.append(float(np.std(vals, ddof=0) / mean_abs))
        if cv_values:
            mean_cv = float(np.mean(cv_values))
            repeat_score = clamp(100.0 * (1.0 - min(mean_cv / 0.60, 1.0)))
            repeat_detail = f"mean CV={mean_cv:.2f}"

    n_conc = int(kobs_results.get("n_unique_concentrations", 0))
    if n_conc >= 6:
        count_score = 100.0
    elif n_conc == 5:
        count_score = 92.0
    elif n_conc == 4:
        count_score = 82.0
    elif n_conc == 3:
        count_score = 68.0
    elif n_conc == 2:
        count_score = 52.0
    else:
        count_score = 20.0

    span_fold = np.nan
    span_score = 30.0
    if isinstance(conc_df, pd.DataFrame) and (not conc_df.empty):
        conc_vals = conc_df["concentration_nM"].to_numpy(dtype=float)
        conc_vals = conc_vals[np.isfinite(conc_vals) & (conc_vals > 0)]
        if len(conc_vals) >= 2:
            min_conc = float(np.min(conc_vals))
            max_conc = float(np.max(conc_vals))
            span_fold = max_conc / max(min_conc, 1e-30)
            span_score = clamp(100.0 * min(np.log10(max(span_fold, 1.0)) / 2.0, 1.0))
    coverage_score = clamp(0.70 * count_score + 0.30 * span_score)
    if np.isfinite(span_fold):
        coverage_detail = f"{n_conc} conc, span={span_fold:.1f}x"
    else:
        coverage_detail = f"{n_conc} conc"

    panels = {
        "kobs_linearity": {
            "name": "kobs Linearity",
            "score": linearity_score,
            "detail": linearity_detail,
        },
        "kobs_assoc_fit": {
            "name": "Association Fit Quality",
            "score": assoc_score,
            "detail": assoc_detail,
        },
        "kobs_repeat_consistency": {
            "name": "Repeat Consistency",
            "score": repeat_score,
            "detail": repeat_detail,
        },
        "kobs_coverage": {
            "name": "Concentration Coverage",
            "score": coverage_score,
            "detail": coverage_detail,
        },
    }
    weights = {
        "kobs_linearity": 4.0,
        "kobs_assoc_fit": 2.5,
        "kobs_repeat_consistency": 2.0,
        "kobs_coverage": 1.5,
    }
    total_weight = float(sum(weights.values()))
    overall = float(sum(panels[key]["score"] * weights[key] for key in panels) / max(total_weight, 1e-30))

    return {
        "overall_score": overall,
        "overall_label": score_label(overall),
        "panels": panels,
    }


def evaluate_equilibrium_attainment(data_list, include_map, t_measure, window_seconds=10.0, t_assoc_start=None):
    per_curve = []
    slope_threshold = 0.0075

    for data in data_list:
        fn = data.get("filename", "unknown")
        allowed = include_map.get(fn, set([c for c in data["concentrations"] if c != 0]))
        t = data["time"]

        for conc in data["concentrations"]:
            if conc == 0 or conc not in allowed:
                continue

            y = data["responses"][conc]
            past = t <= t_measure
            if t_assoc_start is not None:
                past &= t >= t_assoc_start
            mask = (t >= (t_measure - window_seconds)) & past
            if mask.sum() < 6:
                earlier = np.flatnonzero(past)[-11:]
                tw = t[earlier]
                yw = y[earlier]
            else:
                tw = t[mask]
                yw = y[mask]

            if len(tw) < 3:
                continue

            slope, intercept, r_value, p_value, std_err = stats.linregress(tw, yw)
            before_on = t < t_assoc_start if t_assoc_start is not None else np.zeros(len(t), dtype=bool)
            baseline = float(np.median(y[before_on])) if before_on.any() else float(np.min(y[past]))
            dynamic_range = max(float(np.ptp(y[past])), abs(float(np.mean(yw)) - baseline), 1e-9)
            normalized_slope = abs(float(slope)) / dynamic_range
            assoc_start_eff = float(t_assoc_start) if t_assoc_start is not None else float(t[0])
            assoc_duration = max(float(t_measure) - assoc_start_eff, 1.0)
            duration_scale = max(assoc_duration / 80.0, 1.0)
            effective_norm_slope = normalized_slope * duration_scale
            score = clamp(100.0 * (1.0 - min(effective_norm_slope / slope_threshold, 1.0)))
            baseline_noise = (1.4826 * float(np.median(np.abs(y[before_on] - baseline)))) if before_on.any() else 0.
            signal_resolved = bool(abs(float(np.mean(yw)) - baseline) > max(3 * baseline_noise, 1e-9))
            if dynamic_range <= 1e-9 or not signal_resolved:
                score = 0.0

            per_curve.append(
                {
                    "filename": fn,
                    "concentration": float(conc),
                    "slope": float(slope),
                    "slope_std_err": float(std_err) if np.isfinite(std_err) else np.nan,
                    "norm_slope": float(normalized_slope),
                    "effective_norm_slope": float(effective_norm_slope),
                    "score": float(score),
                    "signal_resolved": signal_resolved,
                    "baseline_noise_mad": float(baseline_noise),
                }
            )

    if not per_curve:
        return {
            "per_curve": [],
            "overall_score": 0.0,
            "reached_fraction": 0.0,
            "equilibrium_reached": False,
        }

    scores = np.array([c["score"] for c in per_curve], dtype=float)
    reached_flags = scores >= 70.0

    overall = float(scores.mean())
    reached_fraction = float(reached_flags.mean())
    reached = bool(reached_fraction >= 0.65 and overall >= 70.0)

    return {
        "per_curve": per_curve,
        "overall_score": overall,
        "reached_fraction": reached_fraction,
        "equilibrium_reached": reached,
        "interpretation": "Heuristic pre-sampling flatness check, not proof of thermodynamic equilibrium",
    }


def score_equilibrium_fit(eq_results, eq_attainment):
    fit_r2_score = clamp(eq_results.get("r_squared", 0.0) * 100.0)
    fit_r2_val = float(eq_results.get("r_squared", np.nan))

    residuals = eq_results.get("residuals", np.array([0.0]))
    rmse_rel = np.nan
    if len(residuals) > 4:
        std = float(np.std(eq_results["responses"]) + 1e-12)
        rmse = float(np.sqrt(np.mean(residuals**2)))
        rmse_rel = rmse / std if std > 0 else 1.0
        residual_score = clamp(100.0 * (1.0 - min(rmse_rel / 1.25, 1.0)))
    else:
        residual_score = 50.0

    eq_flat_score = clamp(eq_attainment.get("overall_score", 0.0))
    reached_fraction = float(eq_attainment.get("reached_fraction", 0.0))

    repeat_precision_score = 75.0
    repeat_precision_detail = "single/pooled points"
    response_sd = eq_results.get("response_sd")
    responses = np.asarray(eq_results.get("responses", []), dtype=float)
    if eq_results.get("aggregate_repeats", False) and (response_sd is not None):
        sd = np.asarray(response_sd, dtype=float)
        if len(sd) == len(responses) and len(sd) > 0:
            valid_mask = np.isfinite(sd) & np.isfinite(responses)
            if eq_results.get("normalize_percent_bmax", False):
                valid_mask &= (sd > 1e-12) | ~np.isclose(responses, 100.0)
            rel_sd = sd[valid_mask] / np.maximum(np.abs(responses[valid_mask]), 1e-12)
            rel_sd = rel_sd[np.isfinite(rel_sd)]
            if len(rel_sd):
                mean_rel_sd = float(np.mean(rel_sd))
                repeat_precision_score = clamp(100.0 * (1.0 - min(mean_rel_sd / 0.35, 1.0)))
                repeat_precision_detail = f"mean SD/|resp|={mean_rel_sd:.2f}"

    panels = {
        "eq_isotherm_fit": {
            "name": "Isotherm Fit",
            "score": fit_r2_score,
            "detail": f"R²={fit_r2_val:.3f}" if np.isfinite(fit_r2_val) else "R² unavailable",
        },
        "eq_residual_error": {
            "name": "Residual Error",
            "score": residual_score,
            "detail": f"RMSE/SD={rmse_rel:.2f}" if np.isfinite(rmse_rel) else "limited points",
        },
        "eq_flatness": {
            "name": "Pre-Point Flatness",
            "score": eq_flat_score,
            "detail": f"flat curves={reached_fraction*100:.0f}%",
        },
        "eq_repeat_precision": {
            "name": "Repeat Precision",
            "score": repeat_precision_score,
            "detail": repeat_precision_detail,
        },
    }
    weights = {
        "eq_isotherm_fit": 4.0,
        "eq_residual_error": 1.8,
        "eq_flatness": 3.2,
        "eq_repeat_precision": 1.0,
    }
    total_w = float(sum(weights.values()))
    total = float(sum(panels[k]["score"] * weights[k] for k in panels) / max(total_w, 1e-30))

    return {
        "overall_score": float(total),
        "fit_r2_score": float(fit_r2_score),
        "residual_score": float(residual_score),
        "eq_flat_score": float(eq_flat_score),
        "repeat_precision_score": float(repeat_precision_score),
        "label": score_label(total),
        "panels": panels,
    }


# ============================================================================
# DATA LOADING
# ============================================================================


def load_csv_data(uploaded_file, filename):
    try:
        df = pd.read_csv(uploaded_file)
        df.columns = df.columns.str.replace("\ufeff", "").str.replace("ï»¿", "")

        time = pd.to_numeric(df.iloc[:, 0], errors="coerce").values
        valid_idx = ~np.isnan(time)
        time = time[valid_idx]

        concentrations, responses = [], {}
        for col in df.columns[1:]:
            conc = parse_concentration_nM(col)
            if conc is not None and conc >= 0:
                concentrations.append(conc)
                resp = pd.to_numeric(df[col], errors="coerce").values[valid_idx]
                responses[conc] = resp

        concentrations.sort()

        snr_values = []
        for conc in concentrations:
            signal = responses[conc].max() - responses[conc].min()
            noise = responses[conc][:10].std() if len(responses[conc]) > 10 else 0.01
            snr = signal / noise if noise > 0 else 0
            snr_values.append(snr)

        return {
            "filename": filename,
            "time": time,
            "concentrations": concentrations,
            "responses": responses,
            "snr_avg": float(np.mean(snr_values)) if snr_values else 0.0,
            "n_points": int(len(time)),
            "time_range": (float(time.min()), float(time.max())),
        }
    except Exception as e:
        st.error(f"Error loading {filename}: {str(e)}")
        return None


# ============================================================================
# VISUALIZATIONS
# ============================================================================


def create_quality_ring(score, label="Quality", size=160, radius=52):
    color = score_color(score)
    center = size // 2
    inner = max(radius - 13, 8)

    return f"""<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">
<circle cx="{center}" cy="{center}" r="{radius}" fill="{color}" stroke="white" stroke-width="3"/>
<circle cx="{center}" cy="{center}" r="{inner}" fill="rgba(255,255,255,0.16)"/>
<text x="{center}" y="{center+6}" text-anchor="middle" font-size="32" font-weight="bold" fill="white">{int(round(score))}</text>
<text x="{center}" y="{center+25}" text-anchor="middle" font-size="11" font-weight="600" fill="white">{label}</text>
</svg>"""


def _ax_pub_polish(ax, labelpad=8):
    ax.grid(True, alpha=0.25, linestyle="--")
    ax.tick_params(axis="both", which="major", pad=2)
    ax.xaxis.labelpad = labelpad
    ax.yaxis.labelpad = labelpad
    for s in ax.spines.values():
        s.set_linewidth(1.1)


def _add_panel_eval(ax, panel_score, detail=""):
    color = score_color(panel_score)
    tag = score_label(panel_score)
    text = f"Eval {panel_score:.0f} ({tag})"
    if detail:
        text = f"{text}\n{detail}"
    ax.text(
        0.02,
        0.98,
        text,
        transform=ax.transAxes,
        va="top",
        ha="left",
        fontsize=8.5,
        color="white",
        bbox={"boxstyle": "round,pad=0.3", "facecolor": color, "edgecolor": "none", "alpha": 0.92},
    )


def resolve_publication_title(title_mode, custom_title, default_title):
    mode = str(title_mode or "Default").strip().lower()
    if mode == "none":
        return ""
    if mode == "custom":
        custom = str(custom_title or "").strip()
        return custom if custom else default_title
    return default_title


def normalize_publication_style(style_name):
    style = str(style_name or "Rainbow").strip().lower()
    if style in {"blue-orange", "blue orange", "blue-purple", "blue purple", "purple"}:
        return "Blue-Orange"
    if style in {"black & white", "black and white", "bw", "b/w"}:
        return "Black & White"
    return "Rainbow"


def publication_overlay_palette(style_name, n_colors):
    n = max(int(n_colors), 1)
    style = normalize_publication_style(style_name)
    if style == "Blue-Orange":
        start = np.array([28 / 255, 93 / 255, 153 / 255, 1.0])
        end = np.array([211 / 255, 117 / 255, 34 / 255, 1.0])
        if n == 1:
            return [tuple(start)]
        return [tuple(start + (end - start) * v) for v in np.linspace(0.0, 1.0, n)]
    if style == "Black & White":
        grays = np.linspace(0.15, 0.75, n)
        return [(g, g, g, 1.0) for g in grays]
    cmap = plt.cm.viridis
    return [cmap(v) for v in np.linspace(0.0, 1.0, n)]


def plot_diagnostic_dashboard(results, data_list, diag_summary):
    fits = results.get("individual_fits", [])
    fig = plt.figure(figsize=(19, 10.5), constrained_layout=True)
    fig.get_layout_engine().set(w_pad=0.10, h_pad=0.12, wspace=0.06, hspace=0.08)

    if not fits:
        ax = fig.add_subplot(111)
        ax.text(0.5, 0.5, "No diagnostic data available.", ha="center", va="center")
        ax.axis("off")
        return fig

    panels = diag_summary.get("panels", {})
    time_map = {d["filename"]: d["time"] for d in data_list}
    gs = fig.add_gridspec(2, 4)

    # 1) Residuals vs time
    ax1 = fig.add_subplot(gs[0, 0])
    for fit in fits:
        t = time_map.get(fit["filename"])
        if t is None:
            continue
        mask = np.asarray(fit.get("fit_mask", np.ones(len(t), dtype=bool)))
        ax1.plot(np.asarray(t)[mask], np.asarray(fit["residuals"])[mask], "o", markersize=2, alpha=0.28)
    ax1.axhline(0, color="black", linestyle="--", linewidth=1.8)
    ax1.set_title("Residuals vs Time", fontweight="bold")
    ax1.set_xlabel("Time (s)", fontweight="bold")
    ax1.set_ylabel("Residual", fontweight="bold")
    _ax_pub_polish(ax1, labelpad=10)
    p = panels.get("residual_time", {})
    _add_panel_eval(ax1, p.get("score", 0.0), p.get("detail", ""))

    # 2) Quality by concentration
    ax2 = fig.add_subplot(gs[0, 1])
    quality_scores = [fit["quality_score"] for fit in fits]
    labels = [f'{fit["concentration"]:.1f} nM' for fit in fits]
    bar_colors = [score_color(q) for q in quality_scores]
    ax2.barh(range(len(quality_scores)), quality_scores, color=bar_colors)
    ax2.set_yticks(range(len(quality_scores)))
    ax2.set_yticklabels(labels, fontsize=9)
    ax2.set_xlim(0, 100)
    ax2.axvline(85, color="black", linestyle="--", alpha=0.25)
    ax2.axvline(70, color="black", linestyle="--", alpha=0.25)
    ax2.set_title("Fit Quality by Concentration", fontweight="bold")
    ax2.set_xlabel("Quality Score", fontweight="bold")
    _ax_pub_polish(ax2, labelpad=10)
    p = panels.get("fit_quality", {})
    _add_panel_eval(ax2, p.get("score", 0.0), p.get("detail", ""))

    # 3) Residual histogram
    ax3 = fig.add_subplot(gs[0, 2])
    all_residuals = np.concatenate([fit.get("residuals_fit", fit["residuals"]) for fit in fits])
    ax3.hist(all_residuals, bins=60, alpha=0.75, edgecolor="black")
    mu, sigma = float(np.mean(all_residuals)), float(np.std(all_residuals))
    x = np.linspace(all_residuals.min(), all_residuals.max(), 160)
    if sigma > 0:
        dx = x[1] - x[0]
        y = stats.norm.pdf(x, mu, sigma) * len(all_residuals) * dx
        ax3.plot(x, y, "k-", linewidth=2, label="Normal")
    ax3.set_title("Residual Distribution", fontweight="bold")
    ax3.set_xlabel("Residual", fontweight="bold")
    ax3.set_ylabel("Count", fontweight="bold")
    ax3.legend(loc="best", frameon=False)
    _ax_pub_polish(ax3, labelpad=10)
    p = panels.get("residual_hist", {})
    _add_panel_eval(ax3, p.get("score", 0.0), p.get("detail", ""))

    # 4) Q-Q plot
    ax4 = fig.add_subplot(gs[0, 3])
    stats.probplot(all_residuals, dist="norm", plot=ax4)
    ax4.set_title("Normal Q-Q Plot", fontweight="bold")
    ax4.set_xlabel("Theoretical Quantiles", fontweight="bold")
    ax4.set_ylabel("Ordered Residuals", fontweight="bold")
    _ax_pub_polish(ax4, labelpad=10)
    p = panels.get("qq_plot", {})
    _add_panel_eval(ax4, p.get("score", 0.0), p.get("detail", ""))

    # 5) k_obs vs concentration
    ax5 = fig.add_subplot(gs[1, 0])
    concs_M = np.array([fit["concentration"] * 1e-9 for fit in fits], dtype=float)
    k_obs_values = np.array([fit["k_obs"] for fit in fits], dtype=float)
    ax5.plot(concs_M * 1e9, k_obs_values, "o", markersize=8)

    kobs_r2 = results.get("mass_transport_r2", np.nan)
    if len(concs_M) >= 2:
        z = np.polyfit(concs_M, k_obs_values, 1)
        pfit = np.poly1d(z)
        xx = np.linspace(concs_M.min(), concs_M.max(), 200)
        ax5.plot(xx * 1e9, pfit(xx), "-", linewidth=2.5)

    if np.isfinite(kobs_r2):
        ax5.set_title(f"k_obs Linearity (R²={kobs_r2:.3f})", fontweight="bold", fontsize=11)
    else:
        ax5.set_title("k_obs Linearity (Model-based)", fontweight="bold", fontsize=11)
    ax5.set_xlabel("Concentration (nM)", fontweight="bold")
    ax5.set_ylabel(r"$k_{obs}$ (s$^{-1}$)", fontweight="bold")
    _ax_pub_polish(ax5, labelpad=10)
    p = panels.get("kobs", {})
    _add_panel_eval(ax5, p.get("score", 0.0), p.get("detail", ""))

    # 6) k_on distribution
    ax6 = fig.add_subplot(gs[1, 1])
    kon_vals = np.array([fit["kon"] for fit in fits], dtype=float)
    ax6.hist(kon_vals, bins=30, alpha=0.75, edgecolor="black")
    ax6.axvline(results["global_kon"], color="black", linestyle="--", linewidth=2, label="Mean")
    ax6.set_title("k_on Distribution", fontweight="bold")
    ax6.set_xlabel(r"$k_{on}$ (M$^{-1}$s$^{-1}$)", fontweight="bold")
    ax6.set_ylabel("Count", fontweight="bold")
    ax6.legend(loc="best", frameon=False)
    _ax_pub_polish(ax6, labelpad=10)
    p = panels.get("kon_dist", {})
    _add_panel_eval(ax6, p.get("score", 0.0), p.get("detail", ""))

    # 7) k_off distribution
    ax7 = fig.add_subplot(gs[1, 2])
    koff_vals = np.array([fit["koff"] for fit in fits], dtype=float)
    ax7.hist(koff_vals, bins=30, alpha=0.75, edgecolor="black")
    ax7.axvline(results["global_koff"], color="black", linestyle="--", linewidth=2, label="Mean")
    ax7.set_title("k_off Distribution", fontweight="bold")
    ax7.set_xlabel(r"$k_{off}$ (s$^{-1}$)", fontweight="bold")
    ax7.set_ylabel("Count", fontweight="bold")
    ax7.legend(loc="best", frameon=False)
    _ax_pub_polish(ax7, labelpad=10)
    p = panels.get("koff_dist", {})
    _add_panel_eval(ax7, p.get("score", 0.0), p.get("detail", ""))

    # 8) KD distribution
    ax8 = fig.add_subplot(gs[1, 3])
    kd_vals = np.array([fit["KD"] * 1e9 for fit in fits], dtype=float)
    ax8.hist(kd_vals, bins=30, alpha=0.75, edgecolor="black")
    ax8.axvline(results["global_KD"] * 1e9, color="black", linestyle="--", linewidth=2, label="Mean")
    ax8.set_title("K_D Distribution", fontweight="bold")
    ax8.set_xlabel("K_D (nM)", fontweight="bold")
    ax8.set_ylabel("Count", fontweight="bold")
    ax8.legend(loc="best", frameon=False)
    _ax_pub_polish(ax8, labelpad=10)
    p = panels.get("kd_dist", {})
    _add_panel_eval(ax8, p.get("score", 0.0), p.get("detail", ""))

    return fig


def plot_publication_overlay(
    data,
    fits_for_file,
    t_assoc_start,
    t_dissoc_start,
    title_prefix="MIXA Kinetics",
    color_style="Blue-Orange",
    title_text=None,
):
    fits_sorted = sorted(fits_for_file, key=lambda x: x["concentration"], reverse=True)
    fig, ax = plt.subplots(figsize=(12, 7))

    style = normalize_publication_style(color_style)
    colors = publication_overlay_palette(style, max(len(fits_sorted), 2))
    time = data["time"]
    bw_mode = style == "Black & White"
    simplified_mode = style in {"Blue-Orange", "Black & White"}
    if style == "Blue-Orange":
        data_color = COLORS["primary"]
        fit_color = COLORS["purple"]
    elif style == "Black & White":
        data_color = "#111111"
        fit_color = "#555555"
    else:
        data_color = None
        fit_color = None

    for i, fit in enumerate(fits_sorted):
        conc = fit["concentration"]
        resp = np.asarray(fit.get("response_plot", data["responses"][conc]), dtype=float)
        fitted = np.asarray(fit.get("fitted_plot", fit["fitted"]), dtype=float)
        curve_color = colors[i]
        ax.plot(
            time,
            resp,
            "o",
            markersize=2.5,
            alpha=0.45,
            color=(data_color if simplified_mode else curve_color),
        )
        ax.plot(
            time,
            fitted,
            "--" if bw_mode else "-",
            linewidth=2.6,
            alpha=0.95,
            color=(fit_color if simplified_mode else curve_color),
            label=(None if simplified_mode else f"{conc:.1f} nM (R²={fit['r_squared']:.3f})"),
        )

    if not simplified_mode:
        ax.axvline(t_assoc_start, linestyle="--", linewidth=2, color=COLORS["success"])
        ax.axvline(t_dissoc_start, linestyle="--", linewidth=2, color=COLORS["error"])

    time_arr = np.asarray(time, dtype=float)
    t_end = float(np.max(time_arr)) if len(time_arr) else 0.0
    if np.isfinite(t_end) and t_end > 0:
        ax.set_xlim(0.0, t_end)
    else:
        ax.set_xlim(left=0.0)
    ax.margins(x=0.0)

    ax.set_xlabel("Time (s)", fontweight="bold")
    ax.set_ylabel("Response", fontweight="bold")
    if title_text is None:
        title_text = f"{title_prefix} • {data['filename']}"
    if str(title_text).strip():
        ax.set_title(str(title_text), fontweight="bold")
    _ax_pub_polish(ax, labelpad=10)
    ax.grid(False)
    if not simplified_mode:
        ax.legend(loc="upper left", ncol=1, fontsize=8)
    plt.tight_layout()
    return fig


def plot_kobs_diagnostic_dashboard(kobs_results, diag_summary):
    curve_df = kobs_results.get("curve_table")
    conc_df = kobs_results.get("concentration_table")

    fig = plt.figure(figsize=(15, 9), constrained_layout=True)
    fig.get_layout_engine().set(w_pad=0.08, h_pad=0.10, wspace=0.06, hspace=0.08)

    if not isinstance(curve_df, pd.DataFrame) or curve_df.empty or not isinstance(conc_df, pd.DataFrame) or conc_df.empty:
        ax = fig.add_subplot(111)
        ax.text(0.5, 0.5, "No kobs linearization diagnostics available.", ha="center", va="center")
        ax.axis("off")
        return fig

    panels = diag_summary.get("panels", {})
    gs = fig.add_gridspec(2, 2)

    # 1) kobs means and linear fit
    ax1 = fig.add_subplot(gs[0, 0])
    x_nM = conc_df["concentration_nM"].to_numpy(dtype=float)
    y_kobs = conc_df["kobs_mean"].to_numpy(dtype=float)
    y_sem = conc_df["kobs_sem"].to_numpy(dtype=float)
    ax1.errorbar(
        x_nM,
        y_kobs,
        yerr=y_sem,
        fmt="o",
        color=COLORS["primary"],
        ecolor=COLORS["secondary"],
        capsize=3,
        label="Mean kobs ± SEM",
    )
    fit_x = np.asarray(kobs_results.get("fit_x_nM", []), dtype=float)
    fit_y = np.asarray(kobs_results.get("fit_y_kobs", []), dtype=float)
    if len(fit_x) and len(fit_y):
        ax1.plot(fit_x, fit_y, "-", linewidth=2.4, color=COLORS["teal"], label="Linear fit")
    ax1.set_xlabel("Concentration (nM)", fontweight="bold")
    ax1.set_ylabel(r"$k_{obs}$ (s$^{-1}$)", fontweight="bold")
    ax1.set_title("kobs Linearization", fontweight="bold")
    ax1.legend(loc="best", frameon=False)
    _ax_pub_polish(ax1, labelpad=8)
    p = panels.get("kobs_linearity", {})
    _add_panel_eval(ax1, p.get("score", 0.0), p.get("detail", ""))

    # 2) association fit quality by concentration
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.scatter(
        curve_df["concentration_nM"].to_numpy(dtype=float),
        curve_df["assoc_r2"].to_numpy(dtype=float),
        s=30,
        alpha=0.70,
        color=COLORS["primary"],
    )
    ax2.axhline(0.98, linestyle="--", linewidth=1.3, color=COLORS["success"], alpha=0.55)
    ax2.axhline(0.95, linestyle="--", linewidth=1.3, color=COLORS["warning"], alpha=0.55)
    ax2.set_ylim(0.0, 1.02)
    ax2.set_xlabel("Concentration (nM)", fontweight="bold")
    ax2.set_ylabel("Association fit R²", fontweight="bold")
    ax2.set_title("Per-Curve Association Exponential Fits", fontweight="bold")
    _ax_pub_polish(ax2, labelpad=8)
    p = panels.get("kobs_assoc_fit", {})
    _add_panel_eval(ax2, p.get("score", 0.0), p.get("detail", ""))

    # 3) repeat consistency (CV per concentration)
    ax3 = fig.add_subplot(gs[1, 0])
    cv_rows = []
    for conc, group in curve_df.groupby("concentration_nM"):
        vals = group["kobs"].to_numpy(dtype=float)
        if len(vals) < 2:
            continue
        mean_abs = abs(float(np.mean(vals)))
        if mean_abs <= 1e-30:
            continue
        cv_rows.append({"concentration_nM": float(conc), "cv": float(np.std(vals, ddof=0) / mean_abs)})
    if cv_rows:
        cv_df = pd.DataFrame(cv_rows).sort_values("concentration_nM")
        ax3.bar(cv_df["concentration_nM"], cv_df["cv"], color=COLORS["secondary"], alpha=0.85)
        ax3.axhline(0.60, linestyle="--", linewidth=1.3, color=COLORS["warning"], alpha=0.6)
        ax3.set_ylabel("CV of kobs", fontweight="bold")
        ax3.set_xlabel("Concentration (nM)", fontweight="bold")
        ax3.set_title("Repeat Consistency Across Matched Concentrations", fontweight="bold")
    else:
        ax3.text(0.5, 0.5, "No repeated concentrations available", ha="center", va="center")
        ax3.set_xticks([])
        ax3.set_yticks([])
        ax3.set_title("Repeat Consistency Across Matched Concentrations", fontweight="bold")
    _ax_pub_polish(ax3, labelpad=8)
    p = panels.get("kobs_repeat_consistency", {})
    _add_panel_eval(ax3, p.get("score", 0.0), p.get("detail", ""))

    # 4) concentration coverage
    ax4 = fig.add_subplot(gs[1, 1])
    conc_plot = conc_df.sort_values("concentration_nM")
    ax4.bar(
        conc_plot["concentration_nM"].to_numpy(dtype=float),
        conc_plot["kobs_n"].to_numpy(dtype=float),
        color=COLORS["purple"],
        alpha=0.85,
    )
    ax4.set_xlabel("Concentration (nM)", fontweight="bold")
    ax4.set_ylabel("N curves", fontweight="bold")
    ax4.set_title("Concentration Coverage", fontweight="bold")
    if len(conc_plot) >= 2:
        span_fold = float(np.max(conc_plot["concentration_nM"]) / max(np.min(conc_plot["concentration_nM"]), 1e-30))
        ax4.text(
            0.02,
            0.92,
            f"Span: {span_fold:.1f}x",
            transform=ax4.transAxes,
            fontsize=10,
            fontweight="bold",
            color="#26344e",
        )
    _ax_pub_polish(ax4, labelpad=8)
    p = panels.get("kobs_coverage", {})
    _add_panel_eval(ax4, p.get("score", 0.0), p.get("detail", ""))

    return fig


def plot_equilibrium_diagnostic_dashboard(eq_results, attainment, quality_summary):
    fig = plt.figure(figsize=(15, 9), constrained_layout=True)
    fig.get_layout_engine().set(w_pad=0.08, h_pad=0.10, wspace=0.06, hspace=0.08)
    gs = fig.add_gridspec(2, 2)
    panels = quality_summary.get("panels", {})

    concentrations = np.asarray(eq_results.get("concentrations", []), dtype=float)
    residuals = np.asarray(eq_results.get("residuals", []), dtype=float)

    # 1) Residuals vs concentration
    ax1 = fig.add_subplot(gs[0, 0])
    if len(concentrations) and len(residuals) == len(concentrations):
        ax1.plot(concentrations, residuals, "o", color=COLORS["primary"], markersize=8, alpha=0.85)
        ax1.axhline(0, color="black", linestyle="--", linewidth=1.5, alpha=0.8)
    else:
        ax1.text(0.5, 0.5, "Residual series unavailable", ha="center", va="center")
        ax1.set_xticks([])
        ax1.set_yticks([])
    ax1.set_xlabel("Concentration (nM)", fontweight="bold")
    ax1.set_ylabel("Residual", fontweight="bold")
    ax1.set_title("Isotherm Residuals vs Concentration", fontweight="bold")
    _ax_pub_polish(ax1, labelpad=8)
    p = panels.get("eq_residual_error", {})
    _add_panel_eval(ax1, p.get("score", 0.0), p.get("detail", ""))

    # 2) Residual distribution
    ax2 = fig.add_subplot(gs[0, 1])
    if len(residuals) >= 3:
        bins = min(20, max(6, len(residuals)))
        ax2.hist(residuals, bins=bins, color=COLORS["secondary"], alpha=0.8, edgecolor="black")
    else:
        ax2.text(0.5, 0.5, "Residual distribution unavailable", ha="center", va="center")
        ax2.set_xticks([])
        ax2.set_yticks([])
    ax2.set_xlabel("Residual", fontweight="bold")
    ax2.set_ylabel("Count", fontweight="bold")
    ax2.set_title("Residual Distribution", fontweight="bold")
    _ax_pub_polish(ax2, labelpad=8)
    p = panels.get("eq_isotherm_fit", {})
    _add_panel_eval(ax2, p.get("score", 0.0), p.get("detail", ""))

    # 3) Pre-point flatness per curve
    ax3 = fig.add_subplot(gs[1, 0])
    att_df = pd.DataFrame(attainment.get("per_curve", []))
    if not att_df.empty:
        att_df = att_df.sort_values(["concentration", "filename"]).reset_index(drop=True)
        x = np.arange(len(att_df))
        scores = att_df["score"].to_numpy(dtype=float)
        colors = [score_color(float(v)) for v in scores]
        labels = [f"{row['concentration']:.1f}" for _, row in att_df.iterrows()]
        ax3.bar(x, scores, color=colors, alpha=0.88)
        ax3.set_xticks(x)
        ax3.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)
        ax3.set_ylim(0, 100)
    else:
        ax3.text(0.5, 0.5, "Flatness metrics unavailable", ha="center", va="center")
        ax3.set_xticks([])
        ax3.set_yticks([])
    ax3.set_xlabel("Curve concentration (nM)", fontweight="bold")
    ax3.set_ylabel("Flatness score", fontweight="bold")
    ax3.set_title("Pre-Sampling Flatness by Curve", fontweight="bold")
    _ax_pub_polish(ax3, labelpad=8)
    p = panels.get("eq_flatness", {})
    _add_panel_eval(ax3, p.get("score", 0.0), p.get("detail", ""))

    # 4) Repeat precision by concentration
    ax4 = fig.add_subplot(gs[1, 1])
    response_sd = eq_results.get("response_sd")
    responses = np.asarray(eq_results.get("responses", []), dtype=float)
    if (
        eq_results.get("aggregate_repeats", False)
        and response_sd is not None
        and len(concentrations)
        and len(response_sd) == len(concentrations)
    ):
        sd = np.asarray(response_sd, dtype=float)
        rel_sd = sd / np.maximum(np.abs(responses), 1e-12) if len(responses) == len(sd) else np.full_like(sd, np.nan)
        ax4.bar(concentrations, sd, color=COLORS["purple"], alpha=0.85, label="SD")
        finite_rel = np.isfinite(rel_sd)
        if np.any(finite_rel):
            mean_rel_sd = float(np.mean(rel_sd[finite_rel]))
            ax4.text(
                0.02,
                0.92,
                f"Mean SD/|resp|: {mean_rel_sd:.2f}",
                transform=ax4.transAxes,
                fontsize=10,
                fontweight="bold",
                color="#26344e",
            )
        ax4.set_ylabel("Response SD", fontweight="bold")
        ax4.legend(loc="best", frameon=False)
    else:
        ax4.text(0.5, 0.5, "Repeat SD not available (aggregation off or single-point data)", ha="center", va="center")
        ax4.set_xticks([])
        ax4.set_yticks([])
        ax4.set_ylabel("Response SD", fontweight="bold")
    ax4.set_xlabel("Concentration (nM)", fontweight="bold")
    ax4.set_title("Repeat Precision", fontweight="bold")
    _ax_pub_polish(ax4, labelpad=8)
    p = panels.get("eq_repeat_precision", {})
    _add_panel_eval(ax4, p.get("score", 0.0), p.get("detail", ""))

    return fig


# ============================================================================
# INCLUDE/EXCLUDE HELPERS
# ============================================================================


def initialize_include_map():
    include_map = {}
    for d in st.session_state.data_list:
        fn = d["filename"]
        nonzero = [c for c in d["concentrations"] if c != 0]
        include_map[fn] = set(nonzero)
    st.session_state.include_map = include_map
    sync_include_widgets_from_map()


def sync_include_widgets_from_map():
    for d in st.session_state.data_list:
        fn = d["filename"]
        nonzero = [c for c in d["concentrations"] if c != 0]
        selected = st.session_state.include_map.get(fn, set(nonzero))
        st.session_state[f"incl_{fn}"] = sorted([c for c in selected if c in nonzero])


def auto_detect_binding_phases(data_list, include_map, fallback_assoc=20.0, fallback_dissoc=80.0):
    detected = detect_binding_phases(data_list, include_map, fallback_assoc, fallback_dissoc)
    return detected["on"], detected["off"], detected["note"]


# ============================================================================
# REPORT GENERATION
# ============================================================================


def _fold_score(fold):
    if fold <= 1.5:
        return 100.0
    if fold <= 2.0:
        return 85.0
    if fold <= 3.0:
        return 65.0
    if fold <= 5.0:
        return 45.0
    return 20.0


def build_compare_report(kin_results, eq_results, kobs_results=None):
    kin_kd = kin_results["global_KD"] * 1e9
    eq_kd = eq_results["KD"]
    kobs_kd = np.nan
    if kobs_results and np.isfinite(kobs_results.get("KD", np.nan)):
        kobs_kd = float(kobs_results["KD"] * 1e9)

    pairwise_folds = {}
    fold_ke = max(kin_kd, eq_kd) / max(min(kin_kd, eq_kd), 1e-12)
    pairwise_folds["kinetic_vs_equilibrium"] = float(fold_ke)
    if np.isfinite(kobs_kd):
        fold_kk = max(kin_kd, kobs_kd) / max(min(kin_kd, kobs_kd), 1e-12)
        fold_ek = max(eq_kd, kobs_kd) / max(min(eq_kd, kobs_kd), 1e-12)
        pairwise_folds["kinetic_vs_kobs"] = float(fold_kk)
        pairwise_folds["equilibrium_vs_kobs"] = float(fold_ek)

    fold_scores = [_fold_score(v) for v in pairwise_folds.values()]
    agreement_score = float(np.mean(fold_scores)) if fold_scores else 0.0
    max_fold = float(np.max(list(pairwise_folds.values()))) if pairwise_folds else np.nan

    diag_summary = kin_results.get("diagnostic_summary", {})
    if "overall_score" in diag_summary and np.isfinite(diag_summary["overall_score"]):
        kin_score = float(diag_summary["overall_score"])
    else:
        mean_r2 = float(diag_summary.get("mean_r2", np.nan))
        r2_part = clamp(mean_r2 * 100.0) if np.isfinite(mean_r2) else 75.0
        serial_penalty = 15.0 if diag_summary.get("flagged_serial_correlation", 0) else 0.0
        bound_penalty = 25.0 if kin_results.get("boundary_parameters") else 0.0
        kin_score = clamp(r2_part - serial_penalty - bound_penalty)
    eq_score = eq_results.get("quality_summary", {}).get("overall_score", 0.0)
    eq_reached = eq_results.get("attainment", {}).get("equilibrium_reached", False)
    kobs_score = float(kobs_results.get("overall_score", 0.0)) if kobs_results else np.nan

    if np.isfinite(kobs_score):
        combined = 0.30 * kin_score + 0.30 * eq_score + 0.25 * agreement_score + 0.15 * kobs_score
    else:
        combined = 0.4 * kin_score + 0.4 * eq_score + 0.2 * agreement_score

    risks = []
    if kin_results.get("has_mass_transport", False):
        risks.append("k_obs linearity suggests possible mass-transport limitation.")
    if not eq_reached:
        risks.append("Equilibrium-flatness check indicates many curves were not flat at sampling time.")
    if np.isfinite(kobs_kd):
        if pairwise_folds.get("kinetic_vs_kobs", 1.0) > 3.0:
            risks.append("Kinetic global and kobs-linearization KD disagree strongly (>3x).")
        if pairwise_folds.get("equilibrium_vs_kobs", 1.0) > 3.0:
            risks.append("Equilibrium and kobs-linearization KD disagree strongly (>3x).")
    if pairwise_folds.get("kinetic_vs_equilibrium", 1.0) > 3.0:
        risks.append("Kinetic and equilibrium KD disagree strongly (>3x).")
    if not np.isfinite(kobs_kd):
        risks.append("kobs-linearization method unavailable (insufficient association-fit coverage).")

    qualification_failures = []
    for name, result in [("Kinetic", kin_results), ("Equilibrium", eq_results), ("kobs", kobs_results)]:
        if result is not None and (not result.get("summary_eligible", False) or result.get("boundary_parameters") or result.get("identifiable") is False):
            qualification_failures.append(name + " result is ineligible, unresolved or bound-limited.")
    if not eq_reached:
        qualification_failures.append("Equilibrium was not supported at the sampling time.")
    if "hill" in str(eq_results.get("model", "")).lower() or "half-saturation" in str(eq_results.get("affinity_interpretation", "")).lower():
        qualification_failures.append("Hill half-saturation and intrinsic kinetic KD are not interchangeable affinity quantities.")
    if str(kin_results.get("model", "")).lower() in {"bivalent", "heterogeneous", "sequential"}:
        qualification_failures.append(
            "Multi-site or avidity kinetic constants and simple 1:1 equilibrium KD are not directly interchangeable thermodynamic quantities."
        )
    risks.extend(qualification_failures)
    if not risks:
        risks.append("No major cross-method inconsistency detected.")
    recommendation = (
        "Proceed with reporting using both methods and include diagnostics."
        if not qualification_failures and combined >= 80 and max_fold <= 3
        else "Re-check phase boundaries, excluded curves, and possible transport/heterogeneity before publication."
    )

    report = {
        "kinetic_kd_nM": kin_kd,
        "equilibrium_kd_nM": eq_kd,
        "kobs_kd_nM": kobs_kd,
        "fold_difference": pairwise_folds.get("kinetic_vs_equilibrium", np.nan),
        "max_pairwise_fold": max_fold,
        "pairwise_folds": pairwise_folds,
        "kinetic_score": kin_score,
        "equilibrium_score": eq_score,
        "kobs_score": float(kobs_score) if np.isfinite(kobs_score) else np.nan,
        "agreement_score": agreement_score,
        "combined_score": combined,
        "risks": risks,
        "recommendation": recommendation,
        "qualification_failures": qualification_failures,
    }
    return report


def report_to_text(report):
    lines = [
        "MIXA Cross-Method Report",
        "",
        f"Kinetic KD (nM): {report['kinetic_kd_nM']:.4g}",
        f"Equilibrium KD (nM): {report['equilibrium_kd_nM']:.4g}",
        (
            f"kobs-linearization KD (nM): {report['kobs_kd_nM']:.4g}"
            if np.isfinite(report.get("kobs_kd_nM", np.nan))
            else "kobs-linearization KD (nM): NA"
        ),
        f"Kinetic vs equilibrium fold: {report['fold_difference']:.2f}x",
        f"Max pairwise fold: {report.get('max_pairwise_fold', np.nan):.2f}x",
        f"Kinetic diagnostic score: {report['kinetic_score']:.1f}",
        f"Equilibrium diagnostic score: {report['equilibrium_score']:.1f}",
        (
            f"kobs-linearization score: {report['kobs_score']:.1f}"
            if np.isfinite(report.get("kobs_score", np.nan))
            else "kobs-linearization score: NA"
        ),
        f"Method agreement score: {report['agreement_score']:.1f}",
        f"Combined confidence score: {report['combined_score']:.1f}",
        "",
        "Risks / Notes:",
    ]
    for item in report["risks"]:
        lines.append(f"- {item}")
    lines.extend(["", f"Recommendation: {report['recommendation']}"])
    return "\n".join(lines)


def compare_score_html(label, score):
    if not np.isfinite(score):
        color = "#64748b"
        text = "NA"
    else:
        color = score_color(score)
        text = f"{score:.1f}"
    return (
        f'<div style="padding:0.45rem 0.7rem;margin:0.22rem 0;border-radius:10px;'
        f'background:#f8fafc;border:1px solid #e2e8f0;">'
        f'<span style="font-weight:700;color:#0f172a;">{escape(label)}</span>: '
        f'<span style="font-weight:800;color:{color};">{text}</span></div>'
    )


def recommendation_level(report):
    max_fold = report.get("max_pairwise_fold", np.inf)
    score = report.get("combined_score", 0.0)
    if (not np.isfinite(max_fold)) or score < 60 or max_fold > 5:
        return "high"
    if score < 80 or max_fold > 3:
        return "medium"
    return "low"


def risk_level(risk_text):
    text = str(risk_text).lower()
    high_terms = ["strongly", ">3x", "not reached", "not flat", "disagree", "failed"]
    med_terms = ["possible", "unavailable", "re-check", "limitation", "weak"]
    if any(t in text for t in high_terms):
        return "high"
    if any(t in text for t in med_terms):
        return "medium"
    return "low"


def _json_default(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if np.isfinite(value):
            return float(value)
        return None
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, set):
        return sorted(list(value))
    return str(value)


def _write_json_to_zip(zipf, path, obj):
    zipf.writestr(path, json.dumps(json_safe(obj), indent=2, default=_json_default, allow_nan=False))


def _write_csv_to_zip(zipf, path, dataframe):
    if dataframe is None:
        dataframe = pd.DataFrame()
    zipf.writestr(path, dataframe.to_csv(index=False))


def _snapshot_include_map(include_map):
    snap = {}
    for filename, concs in include_map.items():
        snap[filename] = sorted([float(c) for c in concs])
    return snap


def _include_map_to_df(include_map):
    rows = []
    for filename, concs in include_map.items():
        for conc in sorted([float(c) for c in concs]):
            rows.append({"filename": filename, "concentration_nM": conc})
    return pd.DataFrame(rows)


def _lookup_response_trace(data_entry, concentration_nM):
    conc_value = float(concentration_nM)
    responses = data_entry.get("responses", {})
    if conc_value in responses:
        return np.asarray(responses[conc_value], dtype=float)
    for key, value in responses.items():
        if abs(float(key) - conc_value) <= 1e-9:
            return np.asarray(value, dtype=float)
    return None


def _write_kinetic_exports(zipf, base_path, results, data_list):
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    diag = results.get("diagnostic_summary", {})
    settings = results.get("fit_settings", {})
    fits = results.get("individual_fits", [])

    summary_row = {
        "generated_utc": timestamp,
        "fit_strategy": results.get("fit_strategy", ""),
        "shared_model": results.get("shared_model", ""),
        "n_fits": results.get("n_fits", len(fits)),
        "global_kon_M-1_s-1": results.get("global_kon", np.nan),
        "global_kon_conditional_model_se": results.get("kon_sem", np.nan),
        "global_koff_s-1": results.get("global_koff", np.nan),
        "global_koff_conditional_model_se": results.get("koff_sem", np.nan),
        "global_KD_M": results.get("global_KD", np.nan),
        "global_KD_nM": results.get("global_KD", np.nan) * 1e9 if np.isfinite(results.get("global_KD", np.nan)) else np.nan,
        "global_KD_conditional_model_se_M": results.get("KD_sem", np.nan),
        "global_KD_conditional_model_se_nM": results.get("KD_sem", np.nan) * 1e9 if np.isfinite(results.get("KD_sem", np.nan)) else np.nan,
        "uncertainty_method": results.get("uncertainty_method", ""),
        "avg_r_squared": results.get("avg_r_squared", np.nan),
        "avg_quality_score": results.get("avg_quality", np.nan),
        "mass_transport_flag": results.get("has_mass_transport", False),
        "mass_transport_r2": results.get("mass_transport_r2", np.nan),
        "mass_transport_message": results.get("mass_transport_message", ""),
        "global_nonspecific_coeff_RU_per_M_s": results.get("global_nonspecific_coeff", np.nan),
        "diagnostic_overall_score": diag.get("overall_score", np.nan),
        "diagnostic_overall_label": diag.get("overall_label", ""),
    }
    if "global_kmt" in results:
        summary_row["global_kmt_s-1"] = results.get("global_kmt", np.nan)
        summary_row["global_kmt_sem"] = results.get("kmt_sem", np.nan)

    _write_csv_to_zip(zipf, f"{base_path}/global_summary.csv", pd.DataFrame([summary_row]))
    _write_json_to_zip(zipf, f"{base_path}/fit_settings.json", settings)
    _write_json_to_zip(zipf, f"{base_path}/scientific_diagnostics.json", scientific_metadata(results))
    write_diagnostic_tables(zipf, f"{base_path}/saved_fit_diagnostics", saved_fit_curves(results, data_list))

    include_map = settings.get("include_map", {})
    _write_csv_to_zip(zipf, f"{base_path}/selected_curves.csv", _include_map_to_df(include_map))

    panel_rows = []
    for panel_key, panel in diag.get("panels", {}).items():
        panel_rows.append(
            {
                "panel_key": panel_key,
                "panel_name": panel.get("name", panel_key),
                "score": panel.get("score", np.nan),
                "status": score_label(panel.get("score", 0.0)),
                "detail": panel.get("detail", ""),
                "explanation": DIAGNOSTIC_EXPLANATIONS.get(panel_key, ""),
            }
        )
    _write_csv_to_zip(zipf, f"{base_path}/diagnostic_panel_scores.csv", pd.DataFrame(panel_rows))

    if "bootstrap" in results:
        boot_row = {}
        for key, value in results["bootstrap"].items():
            if isinstance(value, (list, tuple)) and len(value) == 2:
                boot_row[f"{key}_low"] = value[0]
                boot_row[f"{key}_high"] = value[1]
            else:
                boot_row[key] = value
        _write_csv_to_zip(zipf, f"{base_path}/bootstrap_summary.csv", pd.DataFrame([boot_row]))

    if results.get("rmax_by_group"):
        rmax_rows = [{"rmax_group": group, "Rmax": value, "Rmax_conditional_model_se": results.get("rmax_se_by_group", {}).get(group, np.nan)}
                     for group, value in results["rmax_by_group"].items()]
        _write_csv_to_zip(zipf, f"{base_path}/rmax_by_group.csv", pd.DataFrame(rmax_rows))

    per_curve_rows = []
    curve_point_rows = []
    data_map = {d["filename"]: d for d in data_list}

    for fit in fits:
        filename = fit.get("filename", "")
        concentration_nM = float(fit.get("concentration", np.nan))
        per_curve_rows.append(
            {
                "filename": filename,
                "repeat_group": fit.get("repeat_group", ""),
                "rmax_group": fit.get("rmax_group", ""),
                "day": fit.get("day", ""),
                "concentration_nM": concentration_nM,
                "model": fit.get("model", ""),
                "uncertainty_method": fit.get("uncertainty_method", CONDITIONAL_ERROR),
                "affinity_interpretation": fit.get("affinity_interpretation", "1:1 KD = koff/kon"),
                "microscopic_KD_first_step_M": fit.get("microscopic_KD_first_step", np.nan),
                "ka_s-1": fit.get("ka", np.nan),
                "kd_s-1": fit.get("kd", np.nan),
                "kon_M-1_s-1": fit.get("kon", np.nan),
                "kon_err": fit.get("kon_err", np.nan),
                "koff_s-1": fit.get("koff", np.nan),
                "koff_err": fit.get("koff_err", np.nan),
                "KD_M": fit.get("KD", np.nan),
                "KD_nM": fit.get("KD", np.nan) * 1e9 if np.isfinite(fit.get("KD", np.nan)) else np.nan,
                "KD_err_M": fit.get("KD_err", np.nan),
                "KD_err_nM": fit.get("KD_err", np.nan) * 1e9 if np.isfinite(fit.get("KD_err", np.nan)) else np.nan,
                "Rmax": fit.get("Rmax", np.nan),
                "Rmax_err": fit.get("Rmax_err", np.nan),
                "kmt_s-1": fit.get("kmt", np.nan),
                "kmt_err": fit.get("kmt_err", np.nan),
                "aic": fit.get("aic", np.nan),
                "bic": fit.get("bic", np.nan),
                "r_squared": fit.get("r_squared", np.nan),
                "quality_score": fit.get("quality_score", np.nan),
                "k_obs_s-1": fit.get("k_obs", np.nan),
                "drift_slope": fit.get("drift_slope", np.nan),
                "drift_applied": fit.get("drift_applied", False),
                "drift_confidence": fit.get("drift_confidence", np.nan),
                "nonspecific_coeff_RU_per_M_s": fit.get("nonspecific_coeff", np.nan),
                "offset_fitspace": fit.get("offset_fitspace", np.nan),
                "n_params": fit.get("n_params", np.nan),
            }
        )

        data_entry = data_map.get(filename)
        if data_entry is None:
            continue

        time_vec = np.asarray(data_entry.get("time", []), dtype=float)
        raw_vec = _lookup_response_trace(data_entry, concentration_nM)
        fit_vec = np.asarray(fit.get("fitted", []), dtype=float)
        fitspace_vec = np.asarray(fit.get("fitted_fitspace", []), dtype=float)
        residual_fitspace_vec = np.asarray(fit.get("residuals", []), dtype=float)
        if raw_vec is None:
            raw_vec = np.array([], dtype=float)

        n_points = min(len(time_vec), len(raw_vec), len(fit_vec)) if len(fit_vec) > 0 else min(len(time_vec), len(raw_vec))
        if n_points <= 0:
            continue
        for idx in range(n_points):
            residual_fitspace = residual_fitspace_vec[idx] if idx < len(residual_fitspace_vec) else np.nan
            residual_raw = raw_vec[idx] - fit_vec[idx] if idx < len(fit_vec) else np.nan
            fitted_fitspace = fitspace_vec[idx] if idx < len(fitspace_vec) else np.nan
            curve_point_rows.append(
                {
                    "filename": filename,
                    "concentration_nM": concentration_nM,
                    "point_index": idx,
                    "time_s": time_vec[idx],
                    "response_raw": raw_vec[idx],
                    "response_fitted": fit_vec[idx] if idx < len(fit_vec) else np.nan,
                    "response_fitted_fitspace": fitted_fitspace,
                    "residual_raw": residual_raw,
                    "residual_fitspace": residual_fitspace,
                    "used_for_kinetic_fit": bool(fit.get("fit_mask", np.ones(n_points, dtype=bool))[idx]),
                }
            )

    _write_csv_to_zip(zipf, f"{base_path}/per_curve_parameters.csv", pd.DataFrame(per_curve_rows))
    _write_csv_to_zip(zipf, f"{base_path}/curve_fit_points_long.csv", pd.DataFrame(curve_point_rows))

    kobs_eval = results.get("kobs_linearization")
    if kobs_eval:
        kobs_summary = {
            "method": kobs_eval.get("method", "kobs_linearization"),
            "kass_M-1_s-1": kobs_eval.get("kass", np.nan),
            "kass_err": kobs_eval.get("kass_err", np.nan),
            "kdiss_s-1": kobs_eval.get("kdiss", np.nan),
            "kdiss_err": kobs_eval.get("kdiss_err", np.nan),
            "KD_M": kobs_eval.get("KD", np.nan),
            "KD_nM": kobs_eval.get("KD", np.nan) * 1e9 if np.isfinite(kobs_eval.get("KD", np.nan)) else np.nan,
            "KD_err_M": kobs_eval.get("KD_err", np.nan),
            "KD_err_nM": kobs_eval.get("KD_err", np.nan) * 1e9 if np.isfinite(kobs_eval.get("KD_err", np.nan)) else np.nan,
            "linearity_r2": kobs_eval.get("linearity_r2", np.nan),
            "assoc_curve_mean_r2": kobs_eval.get("assoc_curve_mean_r2", np.nan),
            "overall_score": kobs_eval.get("overall_score", np.nan),
            "n_curves": kobs_eval.get("n_curves", np.nan),
            "n_unique_concentrations": kobs_eval.get("n_unique_concentrations", np.nan),
        }
        _write_csv_to_zip(zipf, f"{base_path}/kobs_linearization_summary.csv", pd.DataFrame([kobs_summary]))

        curve_table = kobs_eval.get("curve_table")
        if isinstance(curve_table, pd.DataFrame):
            _write_csv_to_zip(zipf, f"{base_path}/kobs_linearization_per_curve.csv", curve_table)
        conc_table = kobs_eval.get("concentration_table")
        if isinstance(conc_table, pd.DataFrame):
            _write_csv_to_zip(zipf, f"{base_path}/kobs_linearization_per_concentration.csv", conc_table)


def _write_kobs_exports(zipf, base_path, kobs_results):
    diag = kobs_results.get("diagnostic_summary", {})
    settings = kobs_results.get("fit_settings", {})
    summary_row = {
        "method": kobs_results.get("method", "kobs_linearization"),
        "kass_M-1_s-1": kobs_results.get("kass", np.nan),
        "kass_err": kobs_results.get("kass_err", np.nan),
        "kdiss_s-1": kobs_results.get("kdiss", np.nan),
        "kdiss_err": kobs_results.get("kdiss_err", np.nan),
        "KD_M": kobs_results.get("KD", np.nan),
        "KD_nM": kobs_results.get("KD", np.nan) * 1e9 if np.isfinite(kobs_results.get("KD", np.nan)) else np.nan,
        "KD_err_M": kobs_results.get("KD_err", np.nan),
        "KD_err_nM": kobs_results.get("KD_err", np.nan) * 1e9 if np.isfinite(kobs_results.get("KD_err", np.nan)) else np.nan,
        "linearity_r2": kobs_results.get("linearity_r2", np.nan),
        "assoc_curve_mean_r2": kobs_results.get("assoc_curve_mean_r2", np.nan),
        "overall_score": diag.get("overall_score", kobs_results.get("overall_score", np.nan)),
        "overall_label": diag.get("overall_label", score_label(kobs_results.get("overall_score", 0.0))),
        "n_curves": kobs_results.get("n_curves", np.nan),
        "n_unique_concentrations": kobs_results.get("n_unique_concentrations", np.nan),
    }
    _write_csv_to_zip(zipf, f"{base_path}/kobs_summary.csv", pd.DataFrame([summary_row]))
    _write_json_to_zip(zipf, f"{base_path}/fit_settings.json", settings)
    _write_json_to_zip(zipf, f"{base_path}/scientific_diagnostics.json", scientific_metadata(kobs_results))
    if kobs_results.get("covariance_rates") is not None:
        covariance = pd.DataFrame(kobs_results["covariance_rates"], index=["kon", "koff"], columns=["kon", "koff"])
        zipf.writestr(f"{base_path}/rate_covariance.csv", covariance.to_csv())

    panel_rows = []
    for panel_key, panel in diag.get("panels", {}).items():
        panel_rows.append(
            {
                "panel_key": panel_key,
                "panel_name": panel.get("name", panel_key),
                "score": panel.get("score", np.nan),
                "status": score_label(panel.get("score", 0.0)),
                "detail": panel.get("detail", ""),
                "explanation": DIAGNOSTIC_EXPLANATIONS.get(panel_key, ""),
            }
        )
    _write_csv_to_zip(zipf, f"{base_path}/kobs_diagnostic_panel_scores.csv", pd.DataFrame(panel_rows))

    curve_table = kobs_results.get("curve_table")
    if isinstance(curve_table, pd.DataFrame):
        _write_csv_to_zip(zipf, f"{base_path}/kobs_per_curve.csv", curve_table)
    conc_table = kobs_results.get("concentration_table")
    if isinstance(conc_table, pd.DataFrame):
        _write_csv_to_zip(zipf, f"{base_path}/kobs_per_concentration.csv", conc_table)

    fit_x = np.asarray(kobs_results.get("fit_x_nM", []), dtype=float)
    fit_y = np.asarray(kobs_results.get("fit_y_kobs", []), dtype=float)
    if len(fit_x) and len(fit_y):
        _write_csv_to_zip(
            zipf,
            f"{base_path}/kobs_linear_fit_line.csv",
            pd.DataFrame({"concentration_nM": fit_x, "kobs_fit_s-1": fit_y}),
        )


def _write_equilibrium_exports(zipf, base_path, eq_results):
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    settings = eq_results.get("fit_settings", {})
    quality = eq_results.get("quality_summary", {})
    attainment = eq_results.get("attainment", {})

    summary_row = {
        "generated_utc": timestamp,
        "model": eq_results.get("model", ""),
        "aggregate_repeats": eq_results.get("aggregate_repeats", False),
        "normalize_percent_bmax": eq_results.get("normalize_percent_bmax", False),
        "t_measure_s": eq_results.get("t_measure", np.nan),
        "KD_nM": eq_results.get("KD", np.nan),
        "KD_err_nM": eq_results.get("KD_err", np.nan),
        "Rmax": eq_results.get("Rmax", np.nan),
        "Rmax_err": eq_results.get("Rmax_err", np.nan),
        "hill_n": eq_results.get("n_hill", np.nan),
        "r_squared": eq_results.get("r_squared", np.nan),
        "aic": eq_results.get("aic", np.nan),
        "bic": eq_results.get("bic", np.nan),
        "quality_overall_score": quality.get("overall_score", np.nan),
        "quality_label": quality.get("label", ""),
        "fit_r2_score": quality.get("fit_r2_score", np.nan),
        "residual_score": quality.get("residual_score", np.nan),
        "equilibrium_flatness_score": quality.get("eq_flat_score", np.nan),
        "repeat_precision_score": quality.get("repeat_precision_score", np.nan),
        "equilibrium_reached": attainment.get("equilibrium_reached", False),
        "equilibrium_reached_fraction": attainment.get("reached_fraction", np.nan),
    }

    _write_csv_to_zip(zipf, f"{base_path}/equilibrium_summary.csv", pd.DataFrame([summary_row]))
    _write_json_to_zip(zipf, f"{base_path}/fit_settings.json", settings)
    _write_json_to_zip(zipf, f"{base_path}/scientific_diagnostics.json", scientific_metadata(eq_results))
    _write_csv_to_zip(zipf, f"{base_path}/selected_curves.csv", _include_map_to_df(settings.get("include_map", {})))

    concentrations = np.asarray(eq_results.get("concentrations", []), dtype=float)
    responses = np.asarray(eq_results.get("responses", []), dtype=float)
    response_sd = np.asarray(eq_results.get("response_sd", np.zeros_like(concentrations)), dtype=float)
    response_sem = np.asarray(eq_results.get("response_sem", np.zeros_like(concentrations)), dtype=float)
    if eq_results.get("model") == "simple":
        fitted_obs = equilibrium_binding(concentrations, eq_results["Rmax"], eq_results["KD"])
    else:
        fitted_obs = hill_equation(concentrations, eq_results["Rmax"], eq_results["KD"], eq_results.get("n_hill", 1.0))
    obs_rows = pd.DataFrame(
        {
            "concentration_nM": concentrations,
            "response_observed": responses,
            "response_fit_at_observed": fitted_obs,
            "residual": responses - fitted_obs,
            "response_sd": response_sd if len(response_sd) == len(concentrations) else np.zeros(len(concentrations)),
            "response_sem": response_sem if len(response_sem) == len(concentrations) else np.zeros(len(concentrations)),
        }
    )
    _write_csv_to_zip(zipf, f"{base_path}/isotherm_observed_points.csv", obs_rows)

    curve_rows = pd.DataFrame(
        {
            "concentration_nM": np.asarray(eq_results.get("conc_fit", []), dtype=float),
            "response_fit": np.asarray(eq_results.get("response_fit", []), dtype=float),
        }
    )
    _write_csv_to_zip(zipf, f"{base_path}/isotherm_fit_curve.csv", curve_rows)

    panel_rows = []
    for panel_key, panel in quality.get("panels", {}).items():
        panel_rows.append(
            {
                "panel_key": panel_key,
                "panel_name": panel.get("name", panel_key),
                "score": panel.get("score", np.nan),
                "status": score_label(panel.get("score", 0.0)),
                "detail": panel.get("detail", ""),
                "explanation": DIAGNOSTIC_EXPLANATIONS.get(panel_key, ""),
            }
        )
    _write_csv_to_zip(zipf, f"{base_path}/equilibrium_diagnostic_panel_scores.csv", pd.DataFrame(panel_rows))

    raw_rows = pd.DataFrame(
        {
            "concentration_nM": np.asarray(eq_results.get("raw_concentrations", []), dtype=float),
            "response": np.asarray(eq_results.get("raw_responses", []), dtype=float),
            "repeat_group": np.asarray(eq_results.get("raw_repeat_groups", []), dtype=str),
        }
    )
    _write_csv_to_zip(zipf, f"{base_path}/raw_repeat_points.csv", raw_rows)

    att_rows = pd.DataFrame(attainment.get("per_curve", []))
    _write_csv_to_zip(zipf, f"{base_path}/equilibrium_attainment_per_curve.csv", att_rows)

    norm_df = eq_results.get("dataset_bmax_table")
    if isinstance(norm_df, pd.DataFrame):
        _write_csv_to_zip(zipf, f"{base_path}/dataset_bmax_normalization.csv", norm_df)


def build_kinetic_export_bundle(results, data_list):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        readme = (
            "MIXA Kinetic Export Package\n"
            "Contains fit settings, global and per-curve parameter summaries,\n"
            "diagnostic scores, and point-level raw/fitted data for downstream analysis.\n"
        )
        zipf.writestr("README.txt", readme)
        write_methods_exports(zipf, {"Kinetic": results})
        _write_kinetic_exports(zipf, "kinetic", results, data_list)
    buffer.seek(0)
    return buffer.getvalue()


def build_kobs_export_bundle(kobs_results):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        readme = (
            "MIXA kobs Linearization Export Package\n"
            "Association-only exponential kobs estimation and kobs-vs-concentration linearization outputs.\n"
        )
        zipf.writestr("README.txt", readme)
        write_methods_exports(zipf, {"kobs": kobs_results})
        _write_kobs_exports(zipf, "kobs", kobs_results)
    buffer.seek(0)
    return buffer.getvalue()


def build_equilibrium_export_bundle(eq_results):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        readme = (
            "MIXA Equilibrium Export Package\n"
            "Contains fit settings, equilibrium summaries, isotherm data,\n"
            "and pre-sampling equilibrium-attainment metrics.\n"
        )
        zipf.writestr("README.txt", readme)
        write_methods_exports(zipf, {"Equilibrium": eq_results})
        _write_equilibrium_exports(zipf, "equilibrium", eq_results)
    buffer.seek(0)
    return buffer.getvalue()


def build_full_analysis_export_bundle(kin_results, eq_results, data_list, compare_report=None, kobs_results=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        readme = (
            "MIXA Full Analysis Export Package\n"
            "Includes kinetic + kobs (if available) + equilibrium exports and compare-method report.\n"
        )
        zipf.writestr("README.txt", readme)
        methods = {"Kinetic": kin_results, "Equilibrium": eq_results}
        if kobs_results:
            methods["kobs"] = kobs_results
        write_methods_exports(zipf, methods)
        _write_kinetic_exports(zipf, "kinetic", kin_results, data_list)
        if kobs_results:
            _write_kobs_exports(zipf, "kobs", kobs_results)
        _write_equilibrium_exports(zipf, "equilibrium", eq_results)
        if compare_report:
            zipf.writestr("compare/compare_methods_report.txt", report_to_text(compare_report))
            _write_csv_to_zip(zipf, "compare/compare_summary.csv", pd.DataFrame([compare_report]))
    buffer.seek(0)
    return buffer.getvalue()


# ============================================================================
# MAIN APP
# ============================================================================


def legacy_main():
    if "data_list" not in st.session_state:
        st.session_state.data_list = []
    if "analysis_history" not in st.session_state:
        st.session_state.analysis_history = []
    if "include_map" not in st.session_state:
        st.session_state.include_map = {}
    if "model_compare" not in st.session_state:
        st.session_state.model_compare = None
    for key, default in KINETIC_STARTING_SETTINGS.items():
        if key not in st.session_state:
            st.session_state[key] = default
    if not st.session_state.get("kinetic_background_controls_v1"):
        previous_terms = st.session_state.get("advanced_nuisance", [])
        if "Linear drift" in previous_terms:
            st.session_state.correct_drift = True
            st.session_state.advanced_nuisance = [term for term in previous_terms if term != "Linear drift"]
        mechanistic = (KINETIC_BINDING_MODELS.get(st.session_state.binding_model_select) not in {None, "langmuir", "two_state"}
                       or st.session_state.kinetic_custom_controls or st.session_state.advanced_ns
                       or st.session_state.advanced_transport != "None")
        if mechanistic and "advanced_normalize" in st.session_state:
            st.session_state.normalize_baseline = bool(st.session_state.advanced_normalize)
        st.session_state.kinetic_background_controls_v1 = True
    if "model_apply_notice" not in st.session_state:
        st.session_state.model_apply_notice = ""
    if "upload_signature" not in st.session_state:
        st.session_state.upload_signature = None
    if "latest_kinetic_results" not in st.session_state:
        st.session_state.latest_kinetic_results = None
    if "latest_kinetic_diag_plot_results" not in st.session_state:
        st.session_state.latest_kinetic_diag_plot_results = None
    if "latest_equilibrium_results" not in st.session_state:
        st.session_state.latest_equilibrium_results = None
    if "latest_kobs_results" not in st.session_state:
        st.session_state.latest_kobs_results = None

    # Keep settings when Streamlit removes widgets from an inactive workflow page.
    persistent_settings = (
        "binding_model_select", "equilibrium_model_select", "equilibrium_aggregate_repeats",
        "equilibrium_normalize_percent_bmax", "kinetic_workflow", "rmax_group_mode",
        "normalize_baseline", "correct_drift", "include_nonspecific", "ci_method", "bootstrap_n",
        "export_format", "export_dpi", "multi_day", "kinetic_pub_style", "kinetic_pub_title_mode",
        "kinetic_pub_title_text", "equilibrium_pub_style", "equilibrium_pub_title_mode",
        "equilibrium_pub_title_text", "eq_t_measure_input",
        "phase_assoc_input", "phase_dissoc_input", "phase_adjust_enabled", "fit_trim_enabled",
        "fit_assoc_start_input", "fit_assoc_end_input", "fit_dissoc_start_input", "fit_dissoc_end_input",
        "advanced_model", "advanced_transport", "advanced_ns", "advanced_technique", "advanced_immobilized",
        "advanced_analyte", "advanced_valency", "advanced_process", "advanced_normalize", "advanced_invert",
        "advanced_nuisance", "advanced_override", "advanced_noise", "advanced_tau", "advanced_objective",
        "advanced_loss_scale", "advanced_starts", "advanced_runtime", "advanced_nfev",
        "advanced_start_search",
        "kinetic_custom_controls",
    )
    for key in persistent_settings:
        if key in st.session_state:
            st.session_state[key] = st.session_state[key]
    for key in list(st.session_state):
        if key.startswith("assistant_") and key not in {"assistant_run", "assistant_next"}:
            st.session_state[key] = st.session_state[key]

    with st.sidebar:
        st.markdown(
            """
            <div class="sidebar-brand">
                <p class="eyebrow">Klein Lab @ Yale</p>
                <div class="sidebar-brand-name">MIXA</div>
                <div class="sidebar-brand-link">
                    <a class="app-link-button is-secondary" href="https://kleinlab-yale.github.io" target="_blank" rel="noopener noreferrer">Open Klein Lab (KLAY)</a>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        view_options = [step["id"] for step in WORKFLOW_STEPS]
        if not st.session_state.get("kinetic_navigation_integrated_v1"):
            if st.session_state.get("workflow_nav") == "Advanced Kinetics" or st.session_state.get("active_section") == "Advanced Kinetics":
                st.session_state.workflow_nav = "Kinetic Analysis"
                st.session_state.active_section = "Kinetic Analysis"
                previous = st.session_state.get("advanced_model", "langmuir")
                st.session_state.binding_model_select = next((label for label, key in KINETIC_BINDING_MODELS.items() if key == previous), "1:1 Langmuir")
                st.session_state.kinetic_custom_controls = True
            st.session_state.kinetic_navigation_integrated_v1 = True
        if ("active_section" not in st.session_state) or (st.session_state.active_section not in view_options):
            st.session_state.active_section = "Data Input"
        step_labels = {step["id"]: step["label"] for step in WORKFLOW_STEPS}
        step_index_lookup = {step["id"]: idx for idx, step in enumerate(WORKFLOW_STEPS)}
        st.markdown("## Workflow")
        active_section = st.radio(
            "Workflow",
            view_options,
            index=step_index_lookup.get(st.session_state.active_section, 0),
            key="workflow_nav",
            format_func=lambda option: step_labels.get(option, option),
            captions=[step["caption"] for step in WORKFLOW_STEPS],
            label_visibility="collapsed",
        )
        st.session_state.active_section = active_section
        open_education = st.button("Education: How Fitting Works", key="open_fitting_education", use_container_width=True)

        if "repeat_group_mode" not in st.session_state:
            st.session_state.repeat_group_mode = "Filename prefix before _rep"
        if "equilibrium_model_select" not in st.session_state:
            st.session_state.equilibrium_model_select = "Simple"
        if "equilibrium_aggregate_repeats" not in st.session_state:
            st.session_state.equilibrium_aggregate_repeats = True
        if "equilibrium_normalize_percent_bmax" not in st.session_state:
            st.session_state.equilibrium_normalize_percent_bmax = False
        if "kinetic_workflow" not in st.session_state:
            st.session_state.kinetic_workflow = "Global shared kinetics (recommended for reporting)"
        if "rmax_group_mode" not in st.session_state:
            st.session_state.rmax_group_mode = "Per file (repeat-specific)"
        if "normalize_baseline" not in st.session_state:
            st.session_state.normalize_baseline = True
        if "correct_drift" not in st.session_state:
            st.session_state.correct_drift = False
        if "include_nonspecific" not in st.session_state:
            st.session_state.include_nonspecific = False
        if "ci_method" not in st.session_state:
            st.session_state.ci_method = "Model-based (fast)"
        if "bootstrap_n" not in st.session_state:
            st.session_state.bootstrap_n = 240
        if "export_format" not in st.session_state:
            st.session_state.export_format = "PNG"
        if "export_dpi" not in st.session_state:
            st.session_state.export_dpi = 600
        if "multi_day" not in st.session_state:
            st.session_state.multi_day = False
        if "kinetic_pub_style" not in st.session_state:
            st.session_state.kinetic_pub_style = "Blue-Orange"
        if "kinetic_pub_style_default_migrated_v1" not in st.session_state:
            # One-time migration so older sessions default to Blue-Orange instead of Rainbow.
            if str(st.session_state.get("kinetic_pub_style", "")).strip() in {"", "Rainbow", "Blue-Purple"}:
                st.session_state.kinetic_pub_style = "Blue-Orange"
            st.session_state.kinetic_pub_style_default_migrated_v1 = True
        if "kinetic_pub_style_default_migrated_v2" not in st.session_state:
            # Follow-up migration to flip any lingering Rainbow state to Blue-Orange.
            if str(st.session_state.get("kinetic_pub_style", "")).strip() in {"Rainbow", "Blue-Purple"}:
                st.session_state.kinetic_pub_style = "Blue-Orange"
            st.session_state.kinetic_pub_style_default_migrated_v2 = True
        if "kinetic_pub_title_mode" not in st.session_state:
            st.session_state.kinetic_pub_title_mode = "Default"
        if "kinetic_pub_title_text" not in st.session_state:
            st.session_state.kinetic_pub_title_text = ""
        if "equilibrium_pub_style" not in st.session_state:
            st.session_state.equilibrium_pub_style = "Blue-Orange"
        if "equilibrium_pub_title_mode" not in st.session_state:
            st.session_state.equilibrium_pub_title_mode = "Default"
        if "equilibrium_pub_title_text" not in st.session_state:
            st.session_state.equilibrium_pub_title_text = ""

        if active_section != "Data Input":
            if st.session_state.data_list:
                st.caption(f"{len(st.session_state.data_list)} dataset(s) loaded. Edit uploads/curves in `Data Input`.")
            else:
                st.caption("No datasets loaded. Go to `Data Input` to upload.")

        if active_section == "Kinetic Analysis":
            st.markdown("---")
            st.markdown("### Figure Export")
            st.selectbox("Export format:", ["PNG", "PDF", "SVG"], key="export_format")
            st.selectbox("Export DPI (PNG only):", [300, 600, 900], key="export_dpi")
            st.markdown("### Publication Plot")
            st.selectbox(
                "Overlay color style:",
                ["Blue-Orange", "Rainbow", "Black & White"],
                key="kinetic_pub_style",
            )
            st.selectbox(
                "Overlay title:",
                ["Default", "Custom", "None"],
                key="kinetic_pub_title_mode",
            )
            if st.session_state.kinetic_pub_title_mode == "Custom":
                st.text_input("Overlay custom title", key="kinetic_pub_title_text")
        elif active_section == "kobs Linearization":
            st.markdown("---")
            st.markdown("### Figure Export")
            st.selectbox("Export format:", ["PNG", "PDF", "SVG"], key="export_format")
            st.selectbox("Export DPI (PNG only):", [300, 600, 900], key="export_dpi")
        elif active_section == "Equilibrium Analysis":
            st.markdown("---")
            st.markdown("### Figure Export")
            st.selectbox("Export DPI (PNG):", [300, 600, 900], key="export_dpi")
            st.markdown("### Publication Plot")
            st.selectbox(
                "Equilibrium style:",
                ["Rainbow", "Blue-Orange", "Black & White"],
                key="equilibrium_pub_style",
            )
            st.selectbox(
                "Equilibrium title:",
                ["Default", "Custom", "None"],
                key="equilibrium_pub_title_mode",
            )
            if st.session_state.equilibrium_pub_title_mode == "Custom":
                st.text_input("Equilibrium custom title", key="equilibrium_pub_title_text")
        elif active_section == "Kinetic Model Selector":
            st.markdown("---")
            st.markdown("### Figure Export")
            st.selectbox("Export format:", ["PNG", "PDF", "SVG"], key="export_format")
            st.selectbox("Export DPI (PNG only):", [300, 600, 900], key="export_dpi")
        elif active_section == "Model Comparison":
            st.markdown("---")
            st.caption("No export settings for this step.")

    render_app_hero(active_section, len(st.session_state.get("raw_datasets", [])))
    if open_education:
        render_fitting_education()

    repeat_group_mode = st.session_state.get("repeat_group_mode", "Filename prefix before _rep")
    binding_model = st.session_state.get("binding_model_select", "1:1 Langmuir")
    equilibrium_model = st.session_state.get("equilibrium_model_select", "Simple")
    equilibrium_aggregate_repeats = bool(st.session_state.get("equilibrium_aggregate_repeats", True))
    equilibrium_normalize_percent_bmax = bool(st.session_state.get("equilibrium_normalize_percent_bmax", False))
    kinetic_workflow = st.session_state.get(
        "kinetic_workflow", "Global shared kinetics (recommended for reporting)"
    )
    rmax_group_mode = st.session_state.get("rmax_group_mode", "Per file (repeat-specific)")
    normalize = bool(st.session_state.get("normalize_baseline", True))
    correct_drift = bool(st.session_state.get("correct_drift", False))
    include_nonspecific = bool(st.session_state.get("include_nonspecific", False))
    ci_method = st.session_state.get("ci_method", "Model-based (fast)")
    bootstrap_n = int(st.session_state.get("bootstrap_n", 240))
    export_format = st.session_state.get("export_format", "PNG")
    export_dpi = int(st.session_state.get("export_dpi", 600))
    multi_day = bool(st.session_state.get("multi_day", False))
    kinetic_pub_style = st.session_state.get("kinetic_pub_style", "Blue-Orange")
    kinetic_pub_title_mode = st.session_state.get("kinetic_pub_title_mode", "Default")
    kinetic_pub_title_text = st.session_state.get("kinetic_pub_title_text", "")
    equilibrium_pub_style = st.session_state.get("equilibrium_pub_style", "Blue-Orange")
    equilibrium_pub_title_mode = st.session_state.get("equilibrium_pub_title_mode", "Default")
    equilibrium_pub_title_text = st.session_state.get("equilibrium_pub_title_text", "")
    use_global_kinetics = kinetic_workflow == "Global shared kinetics (recommended for reporting)"
    frontier_bootstrap = bool(use_global_kinetics and ci_method == "Repeat-cluster bootstrap 95% (slower)")
    show_diagnostics = True

    page_changed = st.session_state.get("last_rendered_workflow_page") != active_section
    st.session_state.last_rendered_workflow_page = active_section
    st.html("""<script>
    (() => {
      const resetMixaScroll = () => {
        const main = document.querySelector('[data-testid="stMain"]');
        if (main) main.scrollTo({top:0,left:0,behavior:'instant'});
        window.scrollTo({top:0,left:0,behavior:'instant'});
      };
      requestAnimationFrame(() => {resetMixaScroll(); requestAnimationFrame(resetMixaScroll);});
      setTimeout(resetMixaScroll, 150);
      setTimeout(resetMixaScroll, 450);
    })();
    </script>""" if page_changed else "<span hidden></span>", unsafe_allow_javascript=True)
    render_dataset_workspace(active_section)

    if st.session_state.data_list:
        current_input = (
            st.session_state.get("prepared_signature"),
            tuple((k, tuple(sorted(v))) for k, v in sorted(st.session_state.include_map.items())),
        )
        if st.session_state.get("analysis_input_signature") != current_input:
            invalidate_results()
            st.session_state.analysis_input_signature = current_input

    if multi_day and st.session_state.data_list:
        for data in st.session_state.data_list:
            match = re.search(r"day(\d+)", data["filename"], re.IGNORECASE)
            data["day"] = f"Day{match.group(1)}" if match else "Day1"

    if not st.session_state.data_list:
        if st.session_state.get("raw_datasets"):
            st.info("Apply the dataset assignments in Data Input to continue.")
        elif active_section == "Data Input":
            st.info("Upload data or load example files to continue.")
        else:
            st.info("Go to `1. Data Input` to upload data or load example files.")
        return

    assign_repeat_groups(st.session_state.data_list, repeat_group_mode)

    sorted_data = sorted(st.session_state.data_list, key=lambda d: str(d.get("filename", "")))
    sample_data = sorted_data[0]
    valid_time_arrays = [np.asarray(d.get("time", []), dtype=float) for d in sorted_data if len(d.get("time", [])) > 1]
    if not valid_time_arrays:
        st.error("Loaded data does not contain usable time axes.")
        return
    time_min = float(min(np.min(arr) for arr in valid_time_arrays))
    time_max = float(max(np.max(arr) for arr in valid_time_arrays))

    phase_sig_entries = [
        (
            str(d.get("filename", "")),
            int(len(d.get("time", []))),
            round(float(np.asarray(d.get("time", []), dtype=float)[0]), 9),
            round(float(np.asarray(d.get("time", []), dtype=float)[-1]), 9),
            d.get("phase_assoc_start_s"), d.get("phase_dissoc_start_s"),
        )
        for d in sorted_data
        if len(d.get("time", [])) > 1
    ]
    phase_sig = (st.session_state.get("prepared_signature"), tuple(sorted(phase_sig_entries, key=lambda x: x[0])))
    time_span = max(time_max - time_min, 1e-9)
    min_gap = max(time_span * 0.002, 0.1)
    if min_gap >= time_span:
        min_gap = max(time_span * 0.25, 1e-6)

    new_phase_data = st.session_state.get("phase_signature") != phase_sig
    detection_sig = (phase_sig, tuple((k, tuple(sorted(v))) for k, v in sorted(st.session_state.include_map.items())))
    if st.session_state.get("phase_detection_signature") != detection_sig:
        phase_detection = detect_binding_phases(
            sorted_data,
            st.session_state.include_map,
            fallback_assoc=20.0,
            fallback_dissoc=80.0,
        )
        auto_assoc, auto_dissoc, auto_note = phase_detection["on"], phase_detection["off"], phase_detection["note"]
        st.session_state.phase_detection_details = phase_detection
        auto_assoc = float(np.clip(auto_assoc, time_min, time_max - min_gap))
        auto_dissoc = float(np.clip(auto_dissoc, auto_assoc + min_gap, time_max))
        st.session_state.phase_detection_signature = detection_sig
        st.session_state.phase_detected_assoc = auto_assoc
        st.session_state.phase_detected_dissoc = auto_dissoc
        st.session_state.phase_auto_note = auto_note
    if new_phase_data:
        st.session_state.phase_signature = phase_sig
        st.session_state.phase_adjust_enabled = False
        st.session_state.fit_trim_enabled = False
        for key in ["fit_assoc_range", "fit_dissoc_range"]:
            st.session_state.pop(key, None)

    if not st.session_state.get("phase_adjust_enabled", False):
        st.session_state.phase_assoc_input = st.session_state.phase_detected_assoc
        st.session_state.phase_dissoc_input = st.session_state.phase_detected_dissoc

    st.session_state.phase_assoc_input = float(np.clip(st.session_state.phase_assoc_input, time_min, time_max - min_gap))
    st.session_state.phase_dissoc_input = float(
        np.clip(st.session_state.phase_dissoc_input, st.session_state.phase_assoc_input + min_gap, time_max)
    )

    def reset_phase_selection():
        st.session_state.phase_adjust_enabled = False
        st.session_state.fit_trim_enabled = False
        st.session_state.phase_assoc_input = st.session_state.phase_detected_assoc
        st.session_state.phase_dissoc_input = st.session_state.phase_detected_dissoc
        st.session_state.pop("fit_assoc_range", None)
        st.session_state.pop("fit_dissoc_range", None)

    phase_controls_visible = active_section in {"Data Input", "Kinetic Analysis", "kobs Linearization"}
    slider_step = float(10 ** (np.floor(np.log10(min_gap)) - 1))
    phase_controls = st.container(border=True) if phase_controls_visible else None
    if phase_controls_visible:
        with phase_controls:
            st.markdown("### 5. Binding phases" if active_section == "Data Input" else "#### Binding phases")
            st.toggle("Adjust phase starts", key="phase_adjust_enabled")
            if st.session_state.phase_adjust_enabled:
                for column, label, key in zip(st.columns(2), ["k_on start (s)", "k_off start (s)"],
                                              ["phase_assoc_input", "phase_dissoc_input"]):
                    column.slider(label, min_value=time_min, max_value=time_max, step=slider_step,
                                  format="%.3f", key=key)
            else:
                for column, label, key in zip(st.columns(2), ["Detected k_on start", "Detected k_off start"],
                                              ["phase_assoc_input", "phase_dissoc_input"]):
                    column.metric(label, f"{st.session_state[key]:.3f} s")
                if st.session_state.get("phase_detection_details", {}).get("issues"):
                    st.warning("Phase detection is uncertain. Check the phase starts before fitting.")

    t_assoc_start = float(st.session_state.phase_assoc_input)
    t_dissoc_start = float(st.session_state.phase_dissoc_input)
    if not st.session_state.get("fit_trim_enabled", False):
        st.session_state.fit_assoc_start_input = t_assoc_start
        st.session_state.fit_assoc_end_input = t_dissoc_start
        st.session_state.fit_dissoc_start_input = t_dissoc_start
        st.session_state.fit_dissoc_end_input = time_max

    if phase_controls_visible:
        with phase_controls:
            with st.expander("Optional fit trimming"):
                st.toggle("Trim fitting intervals", key="fit_trim_enabled")
                if st.session_state.fit_trim_enabled and t_assoc_start < t_dissoc_start < time_max:
                    for label, key, start_key, end_key, lo, hi in [
                        ("Association fit interval (s)", "fit_assoc_range", "fit_assoc_start_input", "fit_assoc_end_input", t_assoc_start, t_dissoc_start),
                        ("Dissociation fit interval (s)", "fit_dissoc_range", "fit_dissoc_start_input", "fit_dissoc_end_input", t_dissoc_start, time_max)]:
                        start = float(np.clip(st.session_state[start_key], lo, hi))
                        end = float(np.clip(st.session_state[end_key], lo, hi))
                        if start >= end:
                            start, end = lo, hi
                        start, end = st.slider(label, min_value=lo, max_value=hi, value=(start, end),
                                               step=slider_step, format="%.3f", key=key)
                        st.session_state[start_key], st.session_state[end_key] = start, end
            if st.session_state.phase_adjust_enabled or st.session_state.fit_trim_enabled:
                st.button("Reset to automatic / full phases", on_click=reset_phase_selection)
    t_fit_assoc_start = float(st.session_state.fit_assoc_start_input)
    t_fit_assoc_end = float(st.session_state.fit_assoc_end_input)
    t_fit_dissoc_start = float(st.session_state.fit_dissoc_start_input)
    t_fit_dissoc_end = float(st.session_state.fit_dissoc_end_input)
    t_assoc_end, t_dissoc_end = t_fit_assoc_end, t_fit_dissoc_end
    st.session_state.fit_windows = {"phase_assoc_start_s": t_assoc_start, "phase_dissoc_start_s": t_dissoc_start,
        "fit_assoc_start_s": t_fit_assoc_start, "fit_assoc_end_s": t_fit_assoc_end,
        "fit_dissoc_start_s": t_fit_dissoc_start, "fit_dissoc_end_s": t_fit_dissoc_end}
    try:
        validate_windows(st.session_state.fit_windows)
    except ValueError as exc:
        st.error(str(exc))
        return
    interval_signature = (tuple(st.session_state.fit_windows.values()),
                          bool(st.session_state.get("phase_adjust_enabled")), bool(st.session_state.get("fit_trim_enabled")))
    if st.session_state.get("fitted_interval_signature") != interval_signature:
        invalidate_results()
        st.session_state.fitted_interval_signature = interval_signature
    observation_counts = selection_summary(st.session_state.data_list, st.session_state.include_map, st.session_state.fit_windows)
    if active_section in {"Data Input", "Kinetic Analysis", "kobs Linearization"}:
        with st.expander("Included traces and observation counts"):
            st.dataframe(observation_counts, hide_index=True)

    if active_section == "Data Input":
        st.markdown("#### Phase preview")

        first_fn = sample_data["filename"]
        allowed_first = st.session_state.include_map.get(first_fn, set([c for c in sample_data["concentrations"] if c != 0]))
        preview_concs = sorted([c for c in sample_data["concentrations"] if c in allowed_first], reverse=True)[:7]
        if not preview_concs:
            preview_concs = sorted([c for c in sample_data["concentrations"] if c != 0], reverse=True)[:7]
        time_values = np.asarray(sample_data["time"], dtype=float)
        max_points_per_curve = 2400
        stride = max(1, int(np.ceil(len(time_values) / max_points_per_curve))) if len(time_values) else 1
        curve_frames = []
        for conc in preview_concs:
            response_vals = np.asarray(sample_data["responses"][conc], dtype=float)
            n = min(len(time_values), len(response_vals))
            if n == 0:
                continue
            curve_frames.append(
                pd.DataFrame(
                    {
                        "time": time_values[:n:stride],
                        "response": response_vals[:n:stride],
                        "curve": f"{conc:.1f} nM",
                    }
                )
            )

        if curve_frames:
            preview_df = pd.concat(curve_frames, ignore_index=True)
        else:
            preview_df = pd.DataFrame({"time": [time_min, time_max], "response": [0.0, 0.0], "curve": ["No data", "No data"]})

        preview_cols = st.columns([5, 1])
        with preview_cols[0]:
            fig_preview, ax_preview = plt.subplots(figsize=(9, 3.8))
            palette = publication_overlay_palette("Blue-Orange", max(len(preview_concs), 1))
            for idx, conc in enumerate(preview_concs):
                response_vals = np.asarray(sample_data["responses"][conc], dtype=float)
                n = min(len(time_values), len(response_vals))
                if n == 0:
                    continue
                ax_preview.plot(
                    time_values[:n:stride],
                    response_vals[:n:stride],
                    linewidth=1.9,
                    alpha=0.9,
                    color=palette[idx],
                    label=f"{conc:.1f} nM",
                )
            ax_preview.axvspan(t_fit_assoc_start, t_fit_assoc_end, color=COLORS["success"], alpha=0.10)
            ax_preview.axvspan(t_fit_dissoc_start, t_fit_dissoc_end, color=COLORS["error"], alpha=0.08)
            ax_preview.axvline(t_assoc_start, color=COLORS["success"], linestyle="--", linewidth=2, label="k_on start")
            ax_preview.axvline(t_dissoc_start, color=COLORS["error"], linestyle="--", linewidth=2, label="k_off start")
            ax_preview.set_title(f"Preview Curves from {sample_data['filename']}", fontweight="bold")
            ax_preview.set_xlabel("Time (s)", fontweight="bold")
            ax_preview.set_ylabel("Response", fontweight="bold")
            ax_preview.legend(loc="best", frameon=False, fontsize=8)
            _ax_pub_polish(ax_preview, labelpad=10)
            show_figure(fig_preview)
            plt.close(fig_preview)
        with preview_cols[1]:
            st.markdown("**Phase Info**")
            st.metric("k_on start", f"{t_assoc_start:.1f}s")
            st.metric("k_off start", f"{t_dissoc_start:.1f}s")
            st.metric("Assoc fit", f"{t_fit_assoc_start:.1f}-{t_fit_assoc_end:.1f}s")
            st.metric("Dissoc fit", f"{t_fit_dissoc_start:.1f}-{t_fit_dissoc_end:.1f}s")

        st.button("Continue to kinetic analysis", type="primary", on_click=lambda: st.session_state.update(workflow_nav="Kinetic Analysis"))


    if active_section == "Kinetic Analysis":
        st.markdown("### Kinetic Fitting Analysis")
        if st.button("How fitting works", key="kinetic_fitting_education"):
            render_fitting_education()
        st.caption(
            f"Fit intervals: association {t_fit_assoc_start:.1f}-{t_fit_assoc_end:.1f} s; dissociation {t_fit_dissoc_start:.1f}-{t_fit_dissoc_end:.1f} s."
        )
        if render_fitting_assistant(st.session_state.data_list, st.session_state.include_map, st.session_state.fit_windows):
            return
        st.markdown("#### Manual Model and Fitting Controls")
        model_column, transport_column = st.columns(2)
        with model_column:
            binding_model = st.selectbox("Binding model", list(KINETIC_BINDING_MODELS), key="binding_model_select")
        mechanism = KINETIC_BINDING_MODELS[binding_model]
        transport_options = TRANSPORT_LABELS if mechanism == "langmuir" else (
            ["None", "Two-compartment transport"] if mechanism else ["None"])
        if st.session_state.get("advanced_transport") not in transport_options:
            st.session_state.advanced_transport = "None"
        with transport_column:
            surface_transport = st.selectbox("Surface transport", transport_options, key="advanced_transport", disabled=mechanism is None)
        st.markdown("#### Background Corrections")
        background_left, background_right = st.columns(2)
        with background_left:
            normalize = st.checkbox("Normalize baseline", key="normalize_baseline",
                                     help="Reference each trace to its pre-association baseline.")
            correct_drift = st.checkbox("Drift correction (linear)", key="correct_drift",
                                         help="Co-fit a linear signal trend across association and dissociation.")
        with background_right:
            linear_nonspecific = st.checkbox("Nonspecific background (linear)", key="include_nonspecific",
                                              help="Empirical concentration-dependent ramp during association, held constant during dissociation; not proof of nonspecific binding.")
            if mechanism:
                nonspecific = st.checkbox("Nonspecific binding (reversible)", key="advanced_ns",
                                            help="Separate binding population with its own association rate, dissociation rate and capacity. Interpretation requires control data or independent constraints.")
            else:
                st.checkbox("Nonspecific binding (reversible)", disabled=True, key="kinetic_reversible_unavailable",
                            help="The empirical delivery-lag model does not support a second reversible binding population.")
                nonspecific = False
        if mechanism in {"langmuir", "two_state"}:
            custom_controls = st.checkbox("Set parameter bounds, fixed values and custom linkage", key="kinetic_custom_controls")
        else:
            custom_controls = False
        if mechanism and (mechanism != "langmuir" or surface_transport != "None" or nonspecific or custom_controls):
            render_mechanistic_workspace(st.session_state.data_list, st.session_state.include_map, st.session_state.fit_windows,
                                         model=mechanism, transport=surface_transport, nonspecific=nonspecific,
                                         normalize=normalize, correct_drift=correct_drift, linear_nonspecific=linear_nonspecific)
            return
        settings_col1, settings_col2 = st.columns(2)
        with settings_col1:
            kinetic_workflow = st.selectbox(
                "Kinetic fitting workflow",
                [
                    "Global shared kinetics (recommended for reporting)",
                    "Independent curve-wise fits (diagnostic only)",
                ],
                key="kinetic_workflow",
            )
            use_global_kinetics = kinetic_workflow == "Global shared kinetics (recommended for reporting)"
            if use_global_kinetics:
                rmax_group_mode = st.selectbox(
                    "Rmax scope in global fit",
                    [
                        "Per file (repeat-specific)",
                        "Per experiment group",
                        "Per curve (concentration-specific)",
                    ],
                    key="rmax_group_mode",
                )
            else:
                st.session_state.rmax_group_mode = "Per file (repeat-specific)"
                rmax_group_mode = st.session_state.rmax_group_mode
            st.checkbox("Group by day", key="multi_day")
        with settings_col2:
            ci_method = st.selectbox(
                "Kinetic uncertainty method",
                ["Model-based (fast)", "Repeat-cluster bootstrap 95% (slower)"],
                key="ci_method",
                disabled=not use_global_kinetics,
            )
            if use_global_kinetics and ci_method == "Repeat-cluster bootstrap 95% (slower)":
                st.slider("Bootstrap iterations", min_value=200, max_value=1000, step=20, key="bootstrap_n")
                st.caption("Intervals require 200 eligible refits and high convergence. A 90-second runtime limit may leave the interval unavailable.")
        if st.session_state.model_apply_notice:
            st.success(st.session_state.model_apply_notice)
            st.session_state.model_apply_notice = ""
        normalize = bool(st.session_state.get("normalize_baseline", True))
        correct_drift = bool(st.session_state.get("correct_drift", False))
        include_nonspecific = bool(st.session_state.get("include_nonspecific", False))
        ci_method = st.session_state.get("ci_method", "Model-based (fast)")
        bootstrap_n = int(st.session_state.get("bootstrap_n", 240))
        multi_day = bool(st.session_state.get("multi_day", False))
        frontier_bootstrap = bool(use_global_kinetics and ci_method == "Repeat-cluster bootstrap 95% (slower)")

        run_kinetic_clicked = st.button("🚀 Run Kinetic Analysis", use_container_width=True, type="primary")
        cached_kinetic_results = st.session_state.get("latest_kinetic_results")
        cached_diag_plot_results = st.session_state.get("latest_kinetic_diag_plot_results")
        if cached_kinetic_results and not run_kinetic_clicked:
            requested = {"binding_model_ui": binding_model, "kinetic_workflow": kinetic_workflow,
                         "normalize_baseline": normalize, "drift_correction": correct_drift,
                         "include_nonspecific": include_nonspecific, "group_by_day": multi_day,
                         "rmax_group_mode": rmax_group_mode}
            saved = cached_kinetic_results.get("fit_settings", {})
            if any(saved.get(key) != value for key, value in requested.items()):
                st.warning("Settings have changed. Displayed results and exports still use the last completed run. Run Kinetic Analysis to apply the new settings.")

        if run_kinetic_clicked or (cached_kinetic_results is not None):
            model_map = {"1:1 Langmuir": "1:1", "1:1 + Delivery Lag": "1:1+MT", "2-State (Advanced)": "2-state"}
            results = None
            diag_plot_results = None
            if run_kinetic_clicked:
                if t_dissoc_start <= t_assoc_start:
                    st.error("Dissociation start must be greater than association start.")
                    return

                total_included = sum(len(v) for v in st.session_state.include_map.values())
                if total_included == 0:
                    st.error("No curves selected. Please include at least one concentration to run analysis.")
                else:
                    with st.spinner("🔬 Running kinetic analysis..."):
                        use_shared_strategy = use_global_kinetics
                        if use_shared_strategy and model_map[binding_model] in {"1:1", "1:1+MT"}:
                            results = fit_kinetics_shared_params(
                                st.session_state.data_list,
                                t_assoc_start,
                                t_dissoc_start,
                                include_map=st.session_state.include_map,
                                model=model_map[binding_model],
                                rmax_group_mode=rmax_group_mode,
                                normalize=normalize,
                                correct_drift=correct_drift,
                                include_nonspecific=include_nonspecific,
                                do_bootstrap=frontier_bootstrap,
                                bootstrap_n=bootstrap_n,
                                assoc_window_start=t_fit_assoc_start,
                                assoc_window_end=t_assoc_end,
                                dissoc_window_start=t_fit_dissoc_start,
                                dissoc_window_end=t_dissoc_end,
                            )
                            if not results:
                                st.error("The shared kinetic fit did not converge. Inspect the selected data and diagnostic fits before choosing a different fitting strategy.")
                        else:
                            if use_shared_strategy and model_map[binding_model] not in {"1:1", "1:1+MT"}:
                                st.warning(
                                    "Shared kinetics supports 1:1 and delivery lag. Two-state fits are curve-wise diagnostics, not global parameter estimates."
                                )
                            results = fit_kinetics_global(
                                st.session_state.data_list,
                                t_assoc_start,
                                t_dissoc_start,
                                include_map=st.session_state.include_map,
                                normalize=normalize,
                                group_by_day=multi_day,
                                correct_drift=correct_drift,
                                include_nonspecific=include_nonspecific,
                                model=model_map[binding_model],
                                assoc_window_start=t_fit_assoc_start,
                                assoc_window_end=t_assoc_end,
                                dissoc_window_start=t_fit_dissoc_start,
                                dissoc_window_end=t_dissoc_end,
                            )
            else:
                results = cached_kinetic_results
                diag_plot_results = cached_diag_plot_results if cached_diag_plot_results is not None else cached_kinetic_results

            if not results:
                if run_kinetic_clicked:
                    st.error("Kinetic analysis returned no fits (all excluded or fits failed).")
            else:
                    if results.get("boundary_parameters"):
                        st.warning("Kinetic estimate at a fitting bound: " + ", ".join(results["boundary_parameters"]) +
                                   ". These are boundary estimates, not well-resolved rates. Inspect the data, fit windows and diagnostics.")
                    if diag_plot_results is None:
                        diag_plot_results = results
                    if results.get("fit_strategy") == "shared_kinetics":
                        if run_kinetic_clicked:
                            diag_reference = fit_kinetics_global(
                                st.session_state.data_list,
                                t_assoc_start,
                                t_dissoc_start,
                                include_map=st.session_state.include_map,
                                normalize=normalize,
                                group_by_day=multi_day,
                                correct_drift=correct_drift,
                                include_nonspecific=include_nonspecific,
                                model=model_map[binding_model],
                                assoc_window_start=t_fit_assoc_start,
                                assoc_window_end=t_assoc_end,
                                dissoc_window_start=t_fit_dissoc_start,
                                dissoc_window_end=t_dissoc_end,
                            )
                            if diag_reference:
                                diag_plot_results = diag_reference
                                results["diagnostic_basis"] = "independent_curvewise"
                            else:
                                results["diagnostic_basis"] = "shared_fallback"
                        else:
                            results.setdefault("diagnostic_basis", "independent_curvewise")
                    else:
                        results["diagnostic_basis"] = "independent_curvewise"

                    diag_summary = evaluate_kinetic_diagnostics(diag_plot_results, st.session_state.data_list)
                    results["diagnostic_summary"] = diag_summary
                    if run_kinetic_clicked:
                        results["fit_settings"] = {
                            "analysis_type": "kinetic",
                            "run_timestamp_utc": datetime.utcnow().isoformat() + "Z",
                            "binding_model_ui": binding_model,
                            "binding_model_code": model_map[binding_model],
                            "kinetic_workflow": kinetic_workflow,
                            "fit_strategy": results.get("fit_strategy", "curvewise_average"),
                            "rmax_group_mode": rmax_group_mode if use_global_kinetics else "Per file (repeat-specific)",
                            "repeat_group_mode": repeat_group_mode,
                            "normalize_baseline": bool(normalize),
                            "drift_correction": bool(correct_drift),
                            "include_nonspecific": bool(include_nonspecific),
                            "uncertainty_method_requested": ci_method,
                            "uncertainty_method": results.get("uncertainty_method", CONDITIONAL_ERROR),
                            "bootstrap_status": results.get("bootstrap_diagnostics", {}).get("status", "Not requested"),
                            "bootstrap_enabled": bool(frontier_bootstrap),
                            "bootstrap_iterations": int(bootstrap_n) if frontier_bootstrap else 0,
                            "group_by_day": bool(multi_day),
                            "phase_assoc_start_s": float(t_assoc_start),
                            "phase_assoc_end_s": float(t_dissoc_start),
                            "phase_dissoc_start_s": float(t_dissoc_start),
                            "phase_dissoc_end_s": float(time_max),
                            "fit_assoc_start_s": float(t_fit_assoc_start),
                            "fit_assoc_end_s": float(t_fit_assoc_end),
                            "fit_dissoc_start_s": float(t_fit_dissoc_start),
                            "fit_dissoc_end_s": float(t_fit_dissoc_end),
                            "include_map": _snapshot_include_map(st.session_state.include_map),
                        }

                        results["fit_settings"]["project"] = project_context()
                        st.session_state.publication_report = None
                        st.session_state.analysis_history.append(
                            {"timestamp": datetime.now(), "type": "kinetic", "results": results}
                        )
                        st.session_state.latest_kinetic_results = results
                        st.session_state.latest_kinetic_diag_plot_results = diag_plot_results
                        st.session_state.latest_mechanistic_results = None
                        st.session_state.assisted_review = None

                    st.markdown("## 📈 Kinetic Results")
                    st.caption(results.get("uncertainty_method", CONDITIONAL_ERROR) + ". Repeat SD and log-t confidence intervals are in Publication Report.")
                    for message in results.get("scientific_warnings", []):
                        st.warning(message)
                    kinetic_view = st.radio("Results view", ["Publication figure", "Individual fits", "Diagnostics", "Robustness & intervals"], horizontal=True, key="kinetic_results_view")
                    if results.get("fit_strategy") == "shared_kinetics":
                        st.caption(
                            f"Workflow: global shared {results.get('shared_model','1:1')} kinetics across all included curves "
                            f"with Rmax scope '{results.get('rmax_group_mode','Per file (repeat-specific)')}' "
                            f"({results.get('repeat_groups', 0)} Rmax groups)."
                        )
                        if results.get("rmax_group_mode") == "Per curve (concentration-specific)":
                            st.caption(
                                "Using per-curve Rmax fallback for numerical stability while keeping shared k_on/k_off."
                            )
                    else:
                        st.caption("Workflow: independent curve-wise fits with aggregated summary statistics (diagnostic mode).")

                    if correct_drift:
                        drift_flags = [bool(f.get("drift_applied", False)) for f in results.get("individual_fits", [])]
                        n_applied = int(np.sum(drift_flags))
                        n_total = int(len(drift_flags))
                        st.caption(
                            f"Per-trace baseline drift was co-fitted as a nuisance term on {n_applied}/{n_total} included curves."
                        )
                        if results.get("drift_guardrail_message"):
                            st.caption(results["drift_guardrail_message"])

                    colA, colB = st.columns([3, 1.25])
                    with colA:
                        cols = st.columns(4)
                        with cols[0]:
                            st.markdown(
                                f"""
                                <div class="metric-card">
                                    <div class="metric-label">k<sub>on</sub></div>
                                    <div class="metric-value">{results['global_kon']:.2e}</div>
                                    <div class="metric-ci">{f"± {results['kon_sem']:.2e} M⁻¹s⁻¹" if np.isfinite(results['kon_sem']) else 'Model SE unavailable'}</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                        with cols[1]:
                            st.markdown(
                                f"""
                                <div class="metric-card">
                                    <div class="metric-label">k<sub>off</sub></div>
                                    <div class="metric-value">{results['global_koff']:.2e}</div>
                                    <div class="metric-ci">{f"± {results['koff_sem']:.2e} s⁻¹" if np.isfinite(results['koff_sem']) else 'Model SE unavailable'}</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                        with cols[2]:
                            KD_nM = results["global_KD"] * 1e9
                            KD_sem_nM = results["KD_sem"] * 1e9
                            st.markdown(
                                f"""
                                <div class="metric-card">
                                    <div class="metric-label">K<sub>D</sub></div>
                                    <div class="metric-value">{KD_nM:.2f}</div>
                                    <div class="metric-ci">{f'± {KD_sem_nM:.2f} nM' if np.isfinite(KD_sem_nM) else 'Model SE unavailable'}</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                        with cols[3]:
                            t_half = np.log(2) / max(results["global_koff"], 1e-30)
                            half_text = f"{t_half:.1f}" if results.get("shared_model") != "2-state" else "Not single-exponential"
                            st.markdown(
                                f"""
                                <div class="metric-card">
                                    <div class="metric-label">t<sub>½</sub></div>
                                    <div class="metric-value">{half_text}</div>
                                    <div class="metric-ci">s (dissoc)</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )

                    with colB:
                        st.markdown(
                            create_quality_ring(diag_summary["overall_score"], label="Curve-Wise Screen", size=190, radius=62),
                            unsafe_allow_html=True,
                        )
                        if results.get("diagnostic_basis") == "independent_curvewise" and results.get("fit_strategy") == "shared_kinetics":
                            st.caption(
                                f"Heuristic curve-wise score ({diag_summary['overall_label']}); not an evaluation of the saved global fit. Inspect the Diagnostics view."
                            )
                        else:
                            st.caption(
                                f"Heuristic diagnostic screen: {diag_summary['overall_label']}. Not statistical confidence or proof of model validity."
                            )
                        if "bootstrap" in results:
                            b = results["bootstrap"]
                            st.caption(
                                f"Bootstrap 95% CI K_D: {b['KD_ci95'][0]*1e9:.2f} to {b['KD_ci95'][1]*1e9:.2f} nM"
                            )
                            st.caption(
                                f"Bootstrap runs: {b.get('bootstrap_converged', 0)}/{b.get('bootstrap_attempted', 0)} "
                                f"(requested {b.get('bootstrap_requested', 0)}; {b.get('bootstrap_runtime_s', 0.0):.1f}s)."
                            )
                        if "global_kmt" in results:
                            st.caption(f"Estimated mass-transport rate k_mt: {results['global_kmt']:.3g} s⁻¹")
                        if include_nonspecific:
                            st.caption(
                                f"Estimated non-specific linear coefficient: {results.get('global_nonspecific_coeff', 0.0):.3g} RU/(M·s)"
                            )

                    if kinetic_view == "Robustness & intervals":
                        from mixa_inference_ui import render_refit_review

                        render_refit_review(results, "kinetic_review")

                    if kinetic_view == "Diagnostics":
                        render_saved_fit_diagnostics(results, st.session_state.data_list, key="kinetic")
                        if results.get("diagnostic_basis") == "shared_fallback":
                            st.info("Supplementary curve-wise diagnostics are unavailable because the independent refits failed. The saved-fit diagnostics above remain available.")
                        else:
                            with st.expander("Original diagnostic dashboard: curve-wise fits and rate distributions"):
                                st.caption("Supplementary independent curve-wise fits, not residuals of the saved shared model. Scores are heuristic; rate distributions across concentrations are not independent-repeat SD.")
                                render_diagnostic_legend(diag_summary)
                                panel_df = pd.DataFrame(
                                    [{"Panel": v["name"], "Score": round(v["score"], 1),
                                      "Status": score_label(v["score"]),
                                      "What It Means": DIAGNOSTIC_EXPLANATIONS.get(k, ""), "Detail": v["detail"]}
                                     for k, v in diag_summary["panels"].items()])
                                st.dataframe(panel_df, use_container_width=True, hide_index=True)
                                if show_diagnostics:
                                    fig_diag = plot_diagnostic_dashboard(diag_plot_results, st.session_state.data_list, diag_summary)
                                    show_figure(fig_diag)
                                    plt.close(fig_diag)

                    if kinetic_view == "Individual fits":
                        st.markdown("### 📊 Individual Sensorgram Fits (Included Curves)")
                        fits = results["individual_fits"]
                        n_fits = len(fits)
                        n_cols = min(3, n_fits) if n_fits > 0 else 1
                        n_rows = int(np.ceil(n_fits / n_cols)) if n_fits > 0 else 1

                        fig_grid, axes = plt.subplots(n_rows, n_cols, figsize=(16, 5 * n_rows))
                        if n_rows == 1 and n_cols == 1:
                            axes = np.array([[axes]])
                        elif n_rows == 1:
                            axes = axes.reshape(1, -1)
                        elif n_cols == 1:
                            axes = axes.reshape(-1, 1)

                        data_map = {d["filename"]: d for d in st.session_state.data_list}

                        for idx, fit in enumerate(fits):
                            r, c = idx // n_cols, idx % n_cols
                            ax = axes[r, c]

                            d = data_map.get(fit["filename"])
                            if d is None:
                                ax.axis("off")
                                continue

                            time = d["time"]
                            response = np.asarray(fit.get("response_plot", []), dtype=float)
                            fitted = np.asarray(fit.get("fitted_plot", fit["fitted"]), dtype=float)
                            if len(response) == 0:
                                conc = fit["concentration"]
                                response = d["responses"][conc]
                            else:
                                conc = fit["concentration"]

                            ax.plot(time, response, "o", markersize=3, alpha=0.55, color=COLORS["primary"], label="Data")
                            ax.plot(time, fitted, "-", linewidth=2.8, color=COLORS["teal"], label="Fit")
                            ax.axvline(t_assoc_start, color=COLORS["success"], linestyle="--", linewidth=2, alpha=0.45)
                            ax.axvline(t_dissoc_start, color=COLORS["error"], linestyle="--", linewidth=2, alpha=0.45)

                            q = fit["quality_score"]
                            q_color = score_color(q)
                            ax.text(
                                0.02,
                                0.98,
                                f"Q: {q:.0f}",
                                transform=ax.transAxes,
                                bbox=dict(boxstyle="round", facecolor=q_color, alpha=0.85, edgecolor="none"),
                                color="white",
                                fontweight="bold",
                                fontsize=9,
                                va="top",
                            )

                            ax.set_xlabel("Time (s)", fontweight="bold", fontsize=10)
                            ax.set_ylabel("Response", fontweight="bold", fontsize=10)
                            ax.set_title(f"{fit['filename']}\n{conc:.1f} nM (R²={fit['r_squared']:.4f})", fontweight="bold", fontsize=10)
                            ax.legend(fontsize=8, loc="lower right", frameon=False)
                            ax.grid(True, alpha=0.25, linestyle="--")

                        for idx in range(n_fits, n_rows * n_cols):
                            axes[idx // n_cols, idx % n_cols].axis("off")

                        plt.tight_layout()
                        show_figure(fig_grid)

                        buf_grid = io.BytesIO()
                        if export_format == "PNG":
                            fig_grid.savefig(buf_grid, format="png", dpi=int(export_dpi), bbox_inches="tight")
                            mime_grid, ext_grid = "image/png", "png"
                        elif export_format == "PDF":
                            fig_grid.savefig(buf_grid, format="pdf", bbox_inches="tight")
                            mime_grid, ext_grid = "application/pdf", "pdf"
                        else:
                            fig_grid.savefig(buf_grid, format="svg", bbox_inches="tight")
                            mime_grid, ext_grid = "image/svg+xml", "svg"
                        buf_grid.seek(0)
                        st.download_button(
                            f"📥 Download Individual Fits Grid ({export_format})",
                            buf_grid,
                            file_name=f"MIXA_individual_fits.{ext_grid}",
                            mime=mime_grid,
                            use_container_width=True,
                        )
                        plt.close(fig_grid)

                    if kinetic_view == "Publication figure":
                        render_figure_gallery({"Kinetic": results}, st.session_state.data_list, key="kinetic_clean",
                                             dpi=export_dpi, color_style=kinetic_pub_style)
                    kinetic_bundle = build_kinetic_export_bundle(results, st.session_state.data_list)
                    st.download_button(
                        "📦 Download Kinetic Analysis Package (ZIP)",
                        kinetic_bundle,
                        file_name=f"MIXA_kinetic_package_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
                        mime="application/zip",
                        use_container_width=True,
                        help="Includes fit settings, parameter tables, diagnostics, and point-level raw/fitted curve data.",
                    )

    if active_section == "kobs Linearization":
        st.markdown("### kobs Linearization (Association-Only Method)")
        st.caption(
            f"Association fit interval: {t_fit_assoc_start:.1f}-{t_fit_assoc_end:.1f} s."
        )
        normalize = True
        st.info(
            "Each association trace is fitted to B + A(1 - exp(-kobs*t)), with a constant offset B. The fitted kobs values are then regressed against concentration."
        )
        st.caption(
            "Compare association-derived k_on, k_off and K_D with the full kinetic fit. These estimates use the same data and are not independent validation."
        )

        run_kobs_clicked = st.button("📈 Run kobs Linearization", use_container_width=True, type="primary")
        cached_kobs_results = st.session_state.get("latest_kobs_results")
        kobs_results = None

        if run_kobs_clicked:
            if t_dissoc_start <= t_assoc_start:
                st.error("Dissociation start must be greater than association start.")
                return

            total_included = sum(len(v) for v in st.session_state.include_map.values())
            if total_included == 0:
                st.error("No curves selected. Please include at least one concentration to run kobs linearization.")
            else:
                with st.spinner("Computing association kobs fits and linearization..."):
                    kobs_results = fit_kobs_linearization(
                        st.session_state.data_list,
                        st.session_state.include_map,
                        t_start=t_assoc_start,
                        t_end=t_dissoc_start,
                        normalize=normalize,
                        assoc_window_start=t_fit_assoc_start,
                        assoc_window_end=t_assoc_end,
                        dissoc_window_start=t_fit_dissoc_start,
                        dissoc_window_end=t_fit_dissoc_end,
                    )

                if not kobs_results:
                    st.error("kobs linearization failed (insufficient valid association fits or concentration coverage).")
                else:
                    diag_summary = evaluate_kobs_linearization_diagnostics(kobs_results)
                    kobs_results["diagnostic_summary"] = diag_summary
                    kobs_results["fit_settings"] = {
                        "analysis_type": "kobs_linearization",
                        "run_timestamp_utc": datetime.utcnow().isoformat() + "Z",
                        "method": "association_exponential_then_linear_regression",
                        "normalize_baseline": True,
                        "phase_assoc_start_s": float(t_assoc_start),
                        "phase_assoc_end_s": float(t_dissoc_start),
                        "phase_dissoc_start_s": float(t_dissoc_start),
                        "phase_dissoc_end_s": float(time_max),
                        "fit_assoc_start_s": float(t_fit_assoc_start),
                        "fit_assoc_end_s": float(t_fit_assoc_end),
                        "fit_dissoc_start_s": float(t_fit_dissoc_start),
                        "fit_dissoc_end_s": float(t_fit_dissoc_end),
                        "include_map": _snapshot_include_map(st.session_state.include_map),
                    }
                    kobs_results["fit_settings"]["project"] = project_context()
                    st.session_state.publication_report = None
                    st.session_state.analysis_history.append(
                        {"timestamp": datetime.now(), "type": "kobs", "results": kobs_results}
                    )
                    st.session_state.latest_kobs_results = kobs_results
        else:
            kobs_results = cached_kobs_results

        if kobs_results:
            kobs_view = st.radio("Results view", ["Association fits", "Dissociation comparison", "Diagnostics"], horizontal=True, key="kobs_results_view")
            st.caption(kobs_results.get("uncertainty_method", CONDITIONAL_ERROR))
            for message in kobs_results.get("scientific_warnings", []):
                st.warning(message)
            if kobs_results.get("intercept_at_boundary") or not kobs_results.get("input_uncertainty", {}).get("first_stage_propagated"):
                st.warning("The dissociation intercept is at its lower bound or has fewer than three concentrations. Its uncertainty is not reliably determined.")
            diag_summary = kobs_results.get("diagnostic_summary")
            if not diag_summary:
                diag_summary = evaluate_kobs_linearization_diagnostics(kobs_results)
                kobs_results["diagnostic_summary"] = diag_summary

            kass_err = kobs_results.get("kass_err", np.nan)
            kdiss_err = kobs_results.get("kdiss_err", np.nan)
            kd_err = kobs_results.get("KD_err", np.nan)
            kcols_left, kcols_right = st.columns([3, 1.25])
            with kcols_left:
                cards = st.columns(4)
                with cards[0]:
                    st.markdown(
                        f"""
                        <div class="metric-card">
                            <div class="metric-label">k<sub>on</sub> (kass)</div>
                            <div class="metric-value">{kobs_results['kass']:.2e}</div>
                            <div class="metric-ci">{f'± {kass_err:.2e} M⁻¹s⁻¹' if np.isfinite(kass_err) else 'SE unavailable'}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                with cards[1]:
                    st.markdown(
                        f"""
                        <div class="metric-card">
                            <div class="metric-label">k<sub>off</sub> (kdiss)</div>
                            <div class="metric-value">{kobs_results['kdiss']:.2e}</div>
                            <div class="metric-ci">{f'± {kdiss_err:.2e} s⁻¹' if np.isfinite(kdiss_err) else 'SE unavailable'}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                with cards[2]:
                    kd_nM = kobs_results["KD"] * 1e9
                    kd_nM_err = kd_err * 1e9 if np.isfinite(kd_err) else np.nan
                    st.markdown(
                        f"""
                        <div class="metric-card">
                            <div class="metric-label">K<sub>D</sub> from kobs</div>
                            <div class="metric-value">{kd_nM:.2f}</div>
                            <div class="metric-ci">{f'± {kd_nM_err:.2f} nM' if np.isfinite(kd_nM_err) else 'SE unavailable'}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                with cards[3]:
                    st.markdown(
                        f"""
                        <div class="metric-card">
                            <div class="metric-label">Linearity R²</div>
                            <div class="metric-value">{kobs_results['linearity_r2']:.4f}</div>
                            <div class="metric-ci">{kobs_results.get('n_unique_concentrations', 0)} concentrations</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
            with kcols_right:
                st.markdown(
                    create_quality_ring(diag_summary["overall_score"], label="kobs Overall", size=190, radius=62),
                    unsafe_allow_html=True,
                )
                st.caption(f"Unified kobs diagnostic score: {diag_summary['overall_label']}")

            if kobs_view == "Diagnostics":
                st.markdown("#### Panel-by-Panel Diagnostic Scores")
                st.caption("Hover ⓘ chips for one-line interpretation of each kobs diagnostic metric.")
                render_diagnostic_legend(diag_summary)
                panel_df = pd.DataFrame(
                    [
                        {
                            "Panel": panel["name"],
                            "Score": round(panel["score"], 1),
                            "Status": score_label(panel["score"]),
                            "What It Means": DIAGNOSTIC_EXPLANATIONS.get(panel_key, ""),
                            "Detail": panel["detail"],
                        }
                        for panel_key, panel in diag_summary.get("panels", {}).items()
                    ]
                )
                st.dataframe(panel_df, use_container_width=True, hide_index=True)

                st.markdown("### 🔍 kobs Diagnostic Dashboard")
                fig_kobs_diag = plot_kobs_diagnostic_dashboard(kobs_results, diag_summary)
                show_figure(fig_kobs_diag)
                plt.close(fig_kobs_diag)

            curve_fit_records = kobs_results.get("curve_fits", [])
            if curve_fit_records:
                ordered_curve_fits = sorted(
                    curve_fit_records,
                    key=lambda row: (float(row.get("concentration_nM", 0.0)), str(row.get("filename", ""))),
                )
                if kobs_view == "Association fits":
                    st.markdown("### Association Fit Curves")
                    n_fit_cards = len(ordered_curve_fits)
                    n_cols = min(3, n_fit_cards) if n_fit_cards > 0 else 1
                    n_rows = int(np.ceil(n_fit_cards / n_cols)) if n_fit_cards > 0 else 1
                    fig_assoc, axes = plt.subplots(n_rows, n_cols, figsize=(16, 4.8 * n_rows))
                    if n_rows == 1 and n_cols == 1:
                        axes = np.array([[axes]])
                    elif n_rows == 1:
                        axes = axes.reshape(1, -1)
                    elif n_cols == 1:
                        axes = axes.reshape(-1, 1)

                    for idx, fit in enumerate(ordered_curve_fits):
                        ax = axes[idx // n_cols, idx % n_cols]
                        t_abs = np.asarray(fit.get("assoc_time_abs_s", []), dtype=float)
                        y_obs = np.asarray(fit.get("assoc_response_plot", []), dtype=float)
                        y_fit = np.asarray(fit.get("assoc_fitted_plot", []), dtype=float)
                        if len(t_abs) == 0 or len(y_obs) == 0 or len(y_fit) == 0:
                            ax.axis("off")
                            continue

                        ax.plot(t_abs, y_obs, "o", markersize=3.2, alpha=0.7, color=COLORS["primary"], label="Association data")
                        ax.plot(t_abs, y_fit, "-", linewidth=2.4, color=COLORS["purple"], label="Exp fit")
                        ax.axvline(float(fit.get("assoc_fit_start_s", t_abs.min())), color=COLORS["success"], linestyle="--", linewidth=1.8, alpha=0.45)
                        ax.axvline(float(fit.get("assoc_fit_end_s", t_abs.max())), color=COLORS["error"], linestyle="--", linewidth=1.8, alpha=0.45)
                        ax.set_title(
                            f"{fit['filename']}\n{fit['concentration_nM']:.1f} nM | kobs={fit['kobs']:.2e} s$^{{-1}}$ | R²={fit['assoc_r2']:.3f}",
                            fontweight="bold",
                            fontsize=10,
                        )
                        curve_score = clamp(float(fit.get("assoc_r2", 0.0)) * 100.0)
                        _add_panel_eval(ax, curve_score, f"{int(fit.get('assoc_n_points', 0))} pts")
                        ax.set_xlabel("Time (s)", fontweight="bold", fontsize=10)
                        ax.set_ylabel("Shifted response", fontweight="bold", fontsize=10)
                        ax.grid(True, alpha=0.25, linestyle="--")
                        ax.legend(loc="lower right", fontsize=8, frameon=False)

                    for idx in range(n_fit_cards, n_rows * n_cols):
                        axes[idx // n_cols, idx % n_cols].axis("off")

                    plt.tight_layout()
                    show_figure(fig_assoc)
                    plt.close(fig_assoc)

                dissoc_curve_fits = [
                    fit
                    for fit in ordered_curve_fits
                    if len(np.asarray(fit.get("dissoc_time_abs_s", []), dtype=float)) > 0
                    and len(np.asarray(fit.get("dissoc_norm_response_plot", []), dtype=float)) > 0
                ]
                if dissoc_curve_fits and kobs_view == "Dissociation comparison":
                    st.markdown("### Normalized Dissociation Overlays")
                    fig_dnorm, ax_dnorm = plt.subplots(figsize=(11.5, 6.8))
                    colors = publication_overlay_palette("Blue-Orange", max(len(dissoc_curve_fits), 2))
                    max_t_rel = 0.0
                    for idx, fit in enumerate(dissoc_curve_fits):
                        t_rel = np.asarray(fit.get("dissoc_time_rel_s", []), dtype=float)
                        y_norm = np.asarray(fit.get("dissoc_norm_response_plot", []), dtype=float)
                        if len(t_rel) == 0 or len(y_norm) == 0:
                            continue
                        max_t_rel = max(max_t_rel, float(np.max(t_rel)))
                        ax_dnorm.plot(
                            t_rel,
                            y_norm,
                            "-",
                            linewidth=1.6,
                            alpha=0.40,
                            color=colors[idx],
                        )
                    if max_t_rel <= 0:
                        max_t_rel = 1.0
                    t_ref = np.linspace(0.0, max_t_rel, 320)
                    ax_dnorm.plot(
                        t_ref,
                        np.exp(-float(kobs_results["kdiss"]) * t_ref),
                        "-",
                        linewidth=3.0,
                        color=COLORS["error"],
                        label=f"kdiss from kobs = {float(kobs_results['kdiss']):.2e} s$^{{-1}}$",
                    )
                    overlay_scores = [
                        float(fit.get("dissoc_overlay_r2", np.nan))
                        for fit in dissoc_curve_fits
                        if np.isfinite(float(fit.get("dissoc_overlay_r2", np.nan)))
                    ]
                    overlay_score = clamp(100.0 * float(np.mean(overlay_scores))) if overlay_scores else 0.0
                    overlay_detail = f"{len(dissoc_curve_fits)} curves"
                    if overlay_scores:
                        overlay_detail += f" | mean overlay R²={float(np.mean(overlay_scores)):.3f}"
                    _add_panel_eval(ax_dnorm, overlay_score, overlay_detail)
                    ax_dnorm.set_title("Off-Phase Data Normalized to Dissociation Start", fontweight="bold")
                    ax_dnorm.set_xlabel("Time Since k_off Start (s)", fontweight="bold")
                    ax_dnorm.set_ylabel("Fraction Remaining", fontweight="bold")
                    ax_dnorm.set_xlim(left=0.0, right=max_t_rel)
                    ax_dnorm.set_ylim(-0.15, 1.15)
                    ax_dnorm.grid(True, alpha=0.25, linestyle="--")
                    ax_dnorm.legend(loc="upper right", fontsize=9, frameon=False)
                    plt.tight_layout()
                    show_figure(fig_dnorm)
                    plt.close(fig_dnorm)

                    st.markdown("### Direct k_off vs k_diss from kobs")
                    curve_df_compare = kobs_results.get("curve_table")
                    valid_compare = None
                    if isinstance(curve_df_compare, pd.DataFrame):
                        valid_compare = curve_df_compare[
                            np.isfinite(curve_df_compare.get("dissoc_direct_koff", np.nan).to_numpy(dtype=float))
                            & (curve_df_compare.get("dissoc_direct_koff", pd.Series(dtype=float)).to_numpy(dtype=float) > 0)
                        ].copy()
                    if isinstance(valid_compare, pd.DataFrame) and not valid_compare.empty:
                        fig_cmp, ax_cmp = plt.subplots(figsize=(11.0, 6.2))
                        x_cmp = valid_compare["concentration_nM"].to_numpy(dtype=float)
                        y_cmp = valid_compare["dissoc_direct_koff"].to_numpy(dtype=float)
                        yerr_cmp = valid_compare["dissoc_direct_koff_err"].to_numpy(dtype=float)
                        valid_err = np.isfinite(yerr_cmp) & (yerr_cmp > 0)
                        ax_cmp.scatter(
                            x_cmp,
                            y_cmp,
                            s=46,
                            alpha=0.72,
                            color=COLORS["primary"],
                            label="Per-curve direct koff",
                        )
                        if np.any(valid_err):
                            ax_cmp.errorbar(
                                x_cmp[valid_err],
                                y_cmp[valid_err],
                                yerr=yerr_cmp[valid_err],
                                fmt="none",
                                ecolor=COLORS["secondary"],
                                alpha=0.35,
                                capsize=2,
                            )
                        mean_cmp = (
                            valid_compare.groupby("concentration_nM", as_index=False)
                            .agg(
                                direct_koff_mean=("dissoc_direct_koff", "mean"),
                                direct_koff_n=("dissoc_direct_koff", "size"),
                            )
                            .sort_values("concentration_nM")
                        )
                        ax_cmp.plot(
                            mean_cmp["concentration_nM"].to_numpy(dtype=float),
                            mean_cmp["direct_koff_mean"].to_numpy(dtype=float),
                            "s-",
                            linewidth=2.0,
                            markersize=6,
                            color=COLORS["teal"],
                            label="Mean direct koff",
                        )
                        kdiss_value = float(kobs_results["kdiss"])
                        ax_cmp.axhline(
                            kdiss_value,
                            linestyle="--",
                            linewidth=2.2,
                            color=COLORS["error"],
                            label=f"kdiss from kobs = {kdiss_value:.2e} s$^{{-1}}$",
                        )
                        kdiss_err = float(kobs_results.get("kdiss_err", np.nan))
                        if np.isfinite(kdiss_err) and kdiss_err > 0:
                            low = max(kdiss_value - kdiss_err, 1e-12)
                            high = kdiss_value + kdiss_err
                            ax_cmp.axhspan(low, high, color=COLORS["error"], alpha=0.10)
                        fold_vals = valid_compare["dissoc_vs_kdiss_fold"].to_numpy(dtype=float)
                        finite_fold = fold_vals[np.isfinite(fold_vals)]
                        compare_score = 0.0
                        compare_detail = f"{len(valid_compare)} curves"
                        if len(finite_fold) > 0:
                            median_fold = float(np.median(finite_fold))
                            compare_score = clamp(100.0 * np.exp(-1.25 * max(median_fold - 1.0, 0.0)))
                            compare_detail += f" | median fold vs kdiss={median_fold:.2f}x"
                        _add_panel_eval(ax_cmp, compare_score, compare_detail)
                        ax_cmp.set_title("Direct Off-Phase koff Estimates vs Global kdiss", fontweight="bold")
                        ax_cmp.set_xlabel("Concentration (nM)", fontweight="bold")
                        ax_cmp.set_ylabel(r"Rate Constant (s$^{-1}$)", fontweight="bold")
                        if np.all(y_cmp > 0) and kdiss_value > 0:
                            ax_cmp.set_yscale("log")
                        ax_cmp.grid(True, alpha=0.25, linestyle="--")
                        ax_cmp.legend(loc="best", fontsize=8.5, frameon=False)
                        plt.tight_layout()
                        show_figure(fig_cmp)
                        plt.close(fig_cmp)

            conc_df = kobs_results.get("concentration_table")
            if isinstance(conc_df, pd.DataFrame) and not conc_df.empty:
                with st.expander("kobs per-concentration table", expanded=False):
                    show_conc = conc_df.copy()
                    show_conc["kobs_mean"] = show_conc["kobs_mean"].map(lambda x: f"{x:.3e}")
                    show_conc["kobs_sem"] = show_conc["kobs_sem"].map(lambda x: f"{x:.2e}")
                    show_conc["assoc_r2_mean"] = show_conc["assoc_r2_mean"].map(lambda x: f"{x:.4f}")
                    st.dataframe(show_conc, use_container_width=True, hide_index=True)

            curve_df = kobs_results.get("curve_table")
            if isinstance(curve_df, pd.DataFrame) and not curve_df.empty:
                with st.expander("kobs per-curve table", expanded=False):
                    show_curve = curve_df.copy()
                    show_curve["kobs"] = show_curve["kobs"].map(lambda x: f"{x:.3e}")
                    show_curve["kobs_err"] = show_curve["kobs_err"].map(lambda x: f"{x:.2e}" if np.isfinite(x) else "NA")
                    show_curve["assoc_r2"] = show_curve["assoc_r2"].map(lambda x: f"{x:.4f}")
                    show_curve["assoc_fit_eval"] = curve_df["assoc_r2"].map(lambda x: f"{clamp(float(x) * 100.0):.1f}")
                    show_curve["assoc_fit_status"] = curve_df["assoc_r2"].map(lambda x: score_label(clamp(float(x) * 100.0)))
                    if "dissoc_direct_koff" in show_curve.columns:
                        show_curve["dissoc_direct_koff"] = curve_df["dissoc_direct_koff"].map(lambda x: f"{x:.3e}" if np.isfinite(x) else "NA")
                        show_curve["dissoc_direct_koff_err"] = curve_df["dissoc_direct_koff_err"].map(lambda x: f"{x:.2e}" if np.isfinite(x) else "NA")
                        show_curve["dissoc_direct_r2"] = curve_df["dissoc_direct_r2"].map(lambda x: f"{x:.4f}" if np.isfinite(x) else "NA")
                        show_curve["dissoc_overlay_r2"] = curve_df["dissoc_overlay_r2"].map(lambda x: f"{x:.4f}" if np.isfinite(x) else "NA")
                        show_curve["dissoc_vs_kdiss_fold"] = curve_df["dissoc_vs_kdiss_fold"].map(lambda x: f"{x:.2f}x" if np.isfinite(x) else "NA")
                        show_curve["dissoc_direct_fit_eval"] = curve_df["dissoc_direct_r2"].map(lambda x: f"{clamp(float(x) * 100.0):.1f}" if np.isfinite(x) else "NA")
                        show_curve["dissoc_direct_fit_status"] = curve_df["dissoc_direct_r2"].map(lambda x: score_label(clamp(float(x) * 100.0)) if np.isfinite(x) else "NA")
                        show_curve["kdiss_overlay_eval"] = curve_df["dissoc_overlay_r2"].map(lambda x: f"{clamp(float(x) * 100.0):.1f}" if np.isfinite(x) else "NA")
                        show_curve["kdiss_overlay_status"] = curve_df["dissoc_overlay_r2"].map(lambda x: score_label(clamp(float(x) * 100.0)) if np.isfinite(x) else "NA")
                    st.dataframe(show_curve, use_container_width=True, hide_index=True)

            st.markdown("### 📦 Reproducibility Package")
            kobs_bundle = build_kobs_export_bundle(kobs_results)
            st.download_button(
                "📦 Download kobs Analysis Package (ZIP)",
                kobs_bundle,
                file_name=f"MIXA_kobs_package_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
                mime="application/zip",
                use_container_width=True,
                help="Includes kobs method settings, diagnostics, per-curve association and dissociation summaries, and concentration-level linearization data.",
            )

    if active_section == "Equilibrium Analysis":
        st.markdown("### Equilibrium Binding Analysis")
        eq_settings_col1, eq_settings_col2 = st.columns(2)
        with eq_settings_col1:
            equilibrium_model = st.selectbox("Equilibrium model", ["Simple", "Hill (Cooperativity)"], key="equilibrium_model_select")
            st.checkbox(
                "Aggregate repeats per concentration",
                key="equilibrium_aggregate_repeats",
            )
        with eq_settings_col2:
            st.checkbox(
                "Normalize to each dataset's observed maximum",
                key="equilibrium_normalize_percent_bmax",
            )
        equilibrium_model = st.session_state.get("equilibrium_model_select", "Simple")
        equilibrium_aggregate_repeats = bool(st.session_state.get("equilibrium_aggregate_repeats", True))
        equilibrium_normalize_percent_bmax = bool(st.session_state.get("equilibrium_normalize_percent_bmax", False))
        eq_point_min = float(time_min)
        eq_point_max = float(max(eq_point_min + 0.1, t_dissoc_start))
        eq_point_default = float(np.clip(st.session_state.get("eq_t_measure_input", t_dissoc_start - 1.0), eq_point_min, eq_point_max))
        st.session_state["eq_t_measure_input"] = eq_point_default
        equilibrium_t_measure = st.number_input(
            "Equilibrium sampling point (s)",
            min_value=eq_point_min,
            max_value=eq_point_max,
            step=0.1,
            key="eq_t_measure_input",
            help="Choose where response should represent equilibrium. Flatness is checked using only the 10 s preceding this point.",
        )
        st.caption("Equilibrium flatness check uses only data before this point (default 10 s pre-window).")

        run_equilibrium_clicked = st.button("⚖️ Run Equilibrium Analysis", use_container_width=True, type="primary")
        cached_eq_results = st.session_state.get("latest_equilibrium_results")
        if cached_eq_results and not run_equilibrium_clicked:
            requested = {"equilibrium_model_ui": equilibrium_model,
                         "aggregate_repeats": equilibrium_aggregate_repeats,
                         "normalize_percent_bmax": equilibrium_normalize_percent_bmax,
                         "equilibrium_sampling_time_s": float(equilibrium_t_measure)}
            saved = cached_eq_results.get("fit_settings", {})
            if any(saved.get(key) != value for key, value in requested.items()):
                st.warning("Settings have changed. Displayed results and exports still use the last completed run. Run Equilibrium Analysis to apply the new settings.")

        if run_equilibrium_clicked or (cached_eq_results is not None):
            eq_model_map = {"Simple": "simple", "Hill (Cooperativity)": "hill"}
            eq_results = None
            if run_equilibrium_clicked:
                if t_dissoc_start <= t_assoc_start:
                    st.error("Dissociation start must be greater than association start.")
                    return

                total_included = sum(len(v) for v in st.session_state.include_map.values())
                if total_included == 0:
                    st.error("No curves selected. Please include at least one concentration to run equilibrium.")
                else:
                    t_measure = float(equilibrium_t_measure)
                    with st.spinner("⚖️ Fitting equilibrium data..."):
                        eq_results = fit_equilibrium_advanced(
                            st.session_state.data_list,
                            t_measure=t_measure,
                            include_map=st.session_state.include_map,
                            model=eq_model_map[equilibrium_model],
                            aggregate_repeats=equilibrium_aggregate_repeats,
                            normalize_percent_bmax=equilibrium_normalize_percent_bmax,
                            t_assoc_start=t_assoc_start,
                        )
                        if not eq_results and equilibrium_aggregate_repeats:
                            st.warning(
                                "Repeat-aggregated equilibrium fit did not converge. Falling back to pooled-point equilibrium fit."
                            )
                            eq_results = fit_equilibrium_advanced(
                                st.session_state.data_list,
                                t_measure=t_measure,
                                include_map=st.session_state.include_map,
                                model=eq_model_map[equilibrium_model],
                                aggregate_repeats=False,
                                normalize_percent_bmax=equilibrium_normalize_percent_bmax,
                                t_assoc_start=t_assoc_start,
                            )
            else:
                eq_results = cached_eq_results

            if not eq_results:
                if run_equilibrium_clicked:
                    st.error("Equilibrium fitting failed. Use at least three distinct concentrations (four for Hill), and at least two observations in the five seconds ending at the sampling time for every included dataset.")
            else:
                t_measure = float(eq_results.get("t_measure", equilibrium_t_measure))
                attainment = evaluate_equilibrium_attainment(
                    st.session_state.data_list,
                    st.session_state.include_map,
                    t_measure=t_measure,
                    window_seconds=10.0,
                    t_assoc_start=t_assoc_start,
                )
                quality_summary = score_equilibrium_fit(eq_results, attainment)
                eq_results["attainment"] = attainment
                eq_results["quality_summary"] = quality_summary
                if run_equilibrium_clicked:
                    eq_results["fit_settings"] = {
                        **st.session_state.fit_windows,
                        "analysis_type": "equilibrium",
                        "run_timestamp_utc": datetime.utcnow().isoformat() + "Z",
                        "equilibrium_model_ui": equilibrium_model,
                        "equilibrium_model_code": eq_model_map[equilibrium_model],
                        "aggregate_repeats": bool(eq_results["aggregate_repeats"]),
                        "normalize_percent_bmax": bool(equilibrium_normalize_percent_bmax),
                        "equilibrium_sampling_time_s": float(t_measure),
                        "phase_assoc_start_s": float(t_assoc_start),
                        "phase_dissoc_start_s": float(t_dissoc_start),
                        "repeat_group_mode": repeat_group_mode,
                        "include_map": _snapshot_include_map(st.session_state.include_map),
                    }

                    eq_results["fit_settings"]["project"] = project_context()
                    st.session_state.publication_report = None
                    st.session_state.analysis_history.append(
                        {"timestamp": datetime.now(), "type": "equilibrium", "results": eq_results}
                    )
                    st.session_state.latest_equilibrium_results = eq_results

                st.markdown("## ⚖️ Equilibrium Results")
                equilibrium_view = st.radio("Results view", ["Publication figure", "Diagnostics"], horizontal=True, key="equilibrium_results_view")
                st.caption(eq_results.get("uncertainty_method", CONDITIONAL_ERROR) + ". Profile intervals and independent-repeat SD are separate uncertainty measures.")
                for message in eq_results.get("scientific_warnings", []):
                    st.warning(message)
                lo, hi = eq_results.get("KD_profile_ci95", (np.nan, np.nan))
                st.caption(f"Approximate 95% profile interval: {lo:.3g} to {hi:.3g} nM. " + eq_results.get("profile_interval_method", ""))
                if eq_results.get("aggregate_repeats", False) and eq_results.get("normalize_percent_bmax", False):
                    st.caption("Repeat means scaled to each file's observed maximum; error bars show SD where estimable.")
                elif eq_results.get("aggregate_repeats", False):
                    st.caption("Repeat-aggregated responses in input units; error bars show SD where estimable.")
                elif eq_results.get("normalize_percent_bmax", False):
                    st.caption("Repeat-level points scaled to each file's observed maximum.")
                else:
                    st.caption("Pooled repeat-level points in input response units.")
                st.caption("Fit weighting: " + eq_results.get("weighting", "See saved fit settings"))

                top_left, top_right = st.columns([3, 1.25])
                rmax_label = "R<sub>max</sub>"
                rmax_unit = "% observed max" if eq_results.get("normalize_percent_bmax", False) else "input units"
                with top_left:
                    cols = st.columns(4 if eq_results["n_hill"] != 1.0 else 3)

                    with cols[0]:
                        st.markdown(
                            f"""
                            <div class="metric-card">
                                <div class="metric-label">{'Hill C<sub>1/2</sub> (apparent)' if eq_results.get('model') == 'hill' else 'K<sub>D</sub>'}</div>
                                <div class="metric-value">{eq_results['KD']:.2f}</div>
                                <div class="metric-ci">{f"± {eq_results['KD_err']:.2f} nM" if np.isfinite(eq_results['KD_err']) else 'Model SE unavailable'}</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    with cols[1]:
                        st.markdown(
                            f"""
                            <div class="metric-card">
                                <div class="metric-label">{rmax_label}</div>
                                <div class="metric-value">{eq_results['Rmax']:.3f}</div>
                                <div class="metric-ci">{f"± {eq_results['Rmax_err']:.3f} {rmax_unit}" if np.isfinite(eq_results['Rmax_err']) else 'Model SE unavailable'}</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    with cols[2]:
                        st.markdown(
                            f"""
                            <div class="metric-card">
                                <div class="metric-label">R²</div>
                                <div class="metric-value">{eq_results['r_squared']:.4f}</div>
                                <div class="metric-ci">Isotherm Fit</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    if eq_results["n_hill"] != 1.0:
                        with cols[3]:
                            st.markdown(
                                f"""
                                <div class="metric-card">
                                    <div class="metric-label">Hill n</div>
                                    <div class="metric-value">{eq_results['n_hill']:.2f}</div>
                                    <div class="metric-ci">Cooperativity</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )

                with top_right:
                    st.markdown(
                        create_quality_ring(
                            quality_summary["overall_score"], label="Equilibrium Overall", size=190, radius=62
                        ),
                        unsafe_allow_html=True,
                    )
                    eq_txt = "Reached" if attainment["equilibrium_reached"] else "Not Reached"
                    st.caption(
                        f"Equilibrium attainment at sampling time: {eq_txt} ({attainment['reached_fraction']*100:.0f}% curves flat)"
                    )
                    st.caption("Diagnostic scores are heuristic checks, not confidence levels.")

                if equilibrium_view == "Diagnostics":
                    st.markdown("#### Panel-by-Panel Diagnostic Scores")
                    st.caption("Hover ⓘ chips for one-line interpretation of each equilibrium diagnostic metric.")
                    render_diagnostic_legend(quality_summary)
                    eq_panel_df = pd.DataFrame(
                        [
                            {
                                "Panel": panel["name"],
                                "Score": round(panel["score"], 1),
                                "Status": score_label(panel["score"]),
                                "What It Means": DIAGNOSTIC_EXPLANATIONS.get(panel_key, ""),
                                "Detail": panel["detail"],
                            }
                            for panel_key, panel in quality_summary.get("panels", {}).items()
                        ]
                    )
                    st.dataframe(eq_panel_df, use_container_width=True, hide_index=True)

                    st.markdown("### 🔍 Equilibrium Diagnostic Dashboard")
                    fig_eq_diag = plot_equilibrium_diagnostic_dashboard(eq_results, attainment, quality_summary)
                    show_figure(fig_eq_diag)
                    plt.close(fig_eq_diag)

                if equilibrium_view == "Publication figure":
                    render_figure_gallery({"Equilibrium": eq_results}, st.session_state.data_list, key="equilibrium_clean",
                                         dpi=export_dpi, color_style=equilibrium_pub_style)
                st.markdown("#### Equilibrium Attainment (Flatness in 10 s Before Sampling Point)")
                att_df = pd.DataFrame(attainment["per_curve"])
                if not att_df.empty:
                    att_df["slope"] = att_df["slope"].map(lambda x: f"{x:.3e}")
                    att_df["norm_slope"] = att_df["norm_slope"].map(lambda x: f"{x:.3e}")
                    att_df["score"] = att_df["score"].map(lambda x: f"{x:.1f}")
                    st.dataframe(att_df, use_container_width=True, hide_index=True)

                st.markdown("### 📦 Reproducibility Package")
                equilibrium_bundle = build_equilibrium_export_bundle(eq_results)
                st.download_button(
                    "📦 Download Equilibrium Analysis Package (ZIP)",
                    equilibrium_bundle,
                    file_name=f"MIXA_equilibrium_package_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
                    mime="application/zip",
                    use_container_width=True,
                    help="Includes fit settings, isotherm tables, repeat-normalized points, and equilibrium-attainment metrics.",
                )

    if active_section == "Kinetic Model Selector":
        st.markdown("### Kinetic Model Selector")
        st.caption(
            f"Selected fit intervals: association {t_fit_assoc_start:.1f}-{t_fit_assoc_end:.1f} s; dissociation {t_fit_dissoc_start:.1f}-{t_fit_dissoc_end:.1f} s."
        )
        selector_col1, selector_col2 = st.columns(2)
        with selector_col1:
            st.checkbox("Normalize baseline", key="normalize_baseline")
        with selector_col2:
            st.checkbox("Drift correction", key="correct_drift")
            st.checkbox("Non-specific linear component", key="include_nonspecific")
        normalize = bool(st.session_state.get("normalize_baseline", True))
        correct_drift = bool(st.session_state.get("correct_drift", False))
        include_nonspecific = bool(st.session_state.get("include_nonspecific", False))
        st.info(
            "Use this section only for kinetic-model selection. Cross-method KD comparison is in Model Comparison."
        )
        st.caption(
            "Conditional Gaussian AICc/BIC comparison on identical selected observations. Akaike weights indicate relative candidate support, not mechanism probabilities."
        )
        btn_col1, btn_col2 = st.columns(2)
        with btn_col1:
            if st.button("🧠 Evaluate 1:1 vs 2-State vs Delivery Lag", use_container_width=True):
                with st.spinner("Evaluating curve-wise kinetic model candidates..."):
                    st.session_state.model_compare = evaluate_kinetic_model_candidates(
                        st.session_state.data_list,
                        t_assoc_start,
                        t_dissoc_start,
                        include_map=st.session_state.include_map,
                        normalize=normalize,
                        correct_drift=correct_drift,
                        include_nonspecific=include_nonspecific,
                        assoc_window_start=t_fit_assoc_start,
                        assoc_window_end=t_assoc_end,
                        dissoc_window_start=t_fit_dissoc_start,
                        dissoc_window_end=t_dissoc_end,
                    )
        with btn_col2:
            if st.button("🌐 Evaluate Global Mechanistic Candidates (Full Dataset)", key="run_global_mechanistic_selector", use_container_width=True):
                with st.spinner("Evaluating global shared-rate mechanistic candidates on full observations..."):
                    st.session_state.model_compare = evaluate_global_mechanistic_candidates(
                        st.session_state.data_list,
                        t_assoc_start,
                        t_dissoc_start,
                        include_map=st.session_state.include_map,
                        normalize=normalize,
                        correct_drift=correct_drift,
                        include_nonspecific=include_nonspecific,
                        assoc_window_start=t_fit_assoc_start,
                        assoc_window_end=t_assoc_end,
                        dissoc_window_start=t_fit_dissoc_start,
                        dissoc_window_end=t_dissoc_end,
                    )

        model_cmp = st.session_state.model_compare
        if model_cmp:
            if model_cmp.get("curve_subset_applied", False):
                st.caption(
                    f"Runtime optimization: model selector used {model_cmp.get('curves_used', 0)} of "
                    f"{model_cmp.get('curves_available', 0)} included curves "
                    f"(max {model_cmp.get('max_points_per_curve', 0)} points per curve)."
                )
            cmp_df = pd.DataFrame(model_cmp["table"]).copy()
            rank_col = model_cmp.get("ranking_metric", "AICc")
            if rank_col == "AICc" and "Total AICc" in cmp_df.columns:
                cmp_df = cmp_df.sort_values("Total AICc", ascending=True, na_position="last")
            elif "Total AIC" in cmp_df.columns:
                cmp_df = cmp_df.sort_values("Total AIC", ascending=True, na_position="last")

            for col in ["Fit Success %", "Mean R²", "Mean Quality", "ΔAIC", "ΔAICc", "ΔBIC", "Akaike Weight"]:
                if col in cmp_df.columns:
                    cmp_df[col] = cmp_df[col].map(lambda x: f"{x:.2f}" if np.isfinite(x) else "NA")
            for col in ["Total AIC", "Total AICc", "Total BIC"]:
                if col in cmp_df.columns:
                    cmp_df[col] = cmp_df[col].map(lambda x: f"{x:.1f}" if np.isfinite(x) else "NA")
            if "Evidence Ratio" in cmp_df.columns:
                cmp_df["Evidence Ratio"] = cmp_df["Evidence Ratio"].map(
                    lambda x: "1.0 (best)" if np.isfinite(x) and x <= 1.0001 else (f"{x:.1f}" if np.isfinite(x) else "inf")
                )

            display_cols = [
                "Model",
                "Fits",
                "Fit Success %",
                "Status",
                "Total AICc",
                "ΔAICc",
                "Akaike Weight",
                "Support",
                "Total BIC",
                "ΔBIC",
                "Evidence Ratio",
                "Mean R²",
                "Mean Quality",
            ]
            display_cols = [c for c in display_cols if c in cmp_df.columns]
            st.dataframe(
                cmp_df[display_cols],
                use_container_width=True,
                hide_index=True,
            )
            if model_cmp.get("recommended"):
                rec = model_cmp["recommended"]
                st.success(
                    f"Suggested kinetic model: {rec['Model']} "
                    f"(relative weight={rec.get('Akaike Weight', 0.0):.2f}, "
                    f"ΔAICc={rec.get('ΔAICc', np.nan):.2f})."
                )
                mapped_option = MODEL_SELECTOR_TO_BINDING_OPTION.get(rec["Model"])
                if mapped_option:
                    st.button(
                        f"✅ Apply Suggested Model to Kinetic Analysis ({mapped_option})",
                        key="apply_recommended_model_button",
                        use_container_width=True,
                        on_click=apply_suggested_binding_model,
                        args=(rec["Model"],),
                    )
                st.caption(model_cmp.get("reason", ""))
                if model_cmp.get("notes"):
                    st.caption(model_cmp.get("notes"))
            else:
                st.warning(model_cmp.get("reason", "Model comparison did not converge."))

    if active_section == "Model Comparison":
        st.markdown("### Model Comparison")
        st.info(
            "Compare model estimates and residual diagnostics. The summary score is heuristic; agreement between methods using the same data is not independent validation."
        )

        kinetic_results = [h for h in st.session_state.analysis_history if h["type"] == "kinetic"]
        equilibrium_results = [h for h in st.session_state.analysis_history if h["type"] == "equilibrium"]
        kobs_results = [h for h in st.session_state.analysis_history if h["type"] == "kobs"]

        kin = st.session_state.get("latest_kinetic_results")
        kin_source_label = "Global shared / legacy kinetic fit"
        if kin is None and st.session_state.get("latest_mechanistic_results") is not None:
            kin = mechanistic_to_kinetic_summary(st.session_state["latest_mechanistic_results"])
            kin_source_label = f"Manual mechanistic fit ({kin.get('shared_model', '')})" if kin else ""
        if kin is None and st.session_state.get("assisted_review") is not None:
            rev = st.session_state["assisted_review"]
            idx = rev.get("recommended_index") if rev.get("recommended_index") is not None else rev.get("display_index")
            if idx is not None and idx < len(rev.get("attempts", [])) and "result" in rev["attempts"][idx]:
                kin = mechanistic_to_kinetic_summary(rev["attempts"][idx]["result"])
                kin_source_label = f"Assisted kinetic fit ({kin.get('shared_model', '')})" if kin else ""
        if kin is None and kinetic_results:
            kin = kinetic_results[-1]["results"]

        eq = st.session_state.get("latest_equilibrium_results")
        if eq is None and equilibrium_results:
            eq = equilibrium_results[-1]["results"]

        if kin is not None and eq is not None:
            st.caption(f"Kinetic source: {kin_source_label} | Affinity metric: {kin.get('affinity_metric', 'KD_nM')}")
            kobs_eval = st.session_state.get("latest_kobs_results")
            if (kobs_eval is None) and kobs_results:
                kobs_eval = kobs_results[-1]["results"]
            if kobs_eval is None:
                kobs_eval = kin.get("kobs_linearization")
            report = build_compare_report(kin, eq, kobs_results=kobs_eval)

            if np.isfinite(report.get("kobs_kd_nM", np.nan)):
                c1, c2, c3, c4, c5 = st.columns(5)
                with c1:
                    st.metric("Kinetic K_D", f"{report['kinetic_kd_nM']:.2f} nM")
                with c2:
                    st.metric("Equilibrium K_D", f"{report['equilibrium_kd_nM']:.2f} nM")
                with c3:
                    st.metric("kobs K_D", f"{report['kobs_kd_nM']:.2f} nM")
                with c4:
                    st.metric("Max Fold", f"{report['max_pairwise_fold']:.2f}×")
                with c5:
                    st.metric("Combined Score", f"{report['combined_score']:.1f}")
            else:
                c1, c2, c3, c4 = st.columns(4)
                with c1:
                    st.metric("Kinetic K_D", f"{report['kinetic_kd_nM']:.2f} nM")
                with c2:
                    st.metric("Equilibrium K_D", f"{report['equilibrium_kd_nM']:.2f} nM")
                with c3:
                    st.metric("Fold Difference", f"{report['fold_difference']:.2f}×")
                with c4:
                    st.metric("Combined Score", f"{report['combined_score']:.1f}")

            st.markdown("#### Cross-Method Diagnostic Summary")
            summary_cards = [
                compare_score_html("Kinetic diagnostics", report.get("kinetic_score", np.nan)),
                compare_score_html("Equilibrium diagnostics", report.get("equilibrium_score", np.nan)),
                compare_score_html("Agreement score", report.get("agreement_score", np.nan)),
                compare_score_html("Combined confidence", report.get("combined_score", np.nan)),
            ]
            if np.isfinite(report.get("kobs_score", np.nan)):
                summary_cards.insert(2, compare_score_html("kobs-linearization", report.get("kobs_score", np.nan)))
            st.markdown("".join(summary_cards), unsafe_allow_html=True)

            fold_value = report.get("max_pairwise_fold", np.nan)
            if np.isfinite(fold_value):
                fold_score = 100.0 if fold_value <= 1.5 else 85.0 if fold_value <= 2.0 else 65.0 if fold_value <= 3.0 else 35.0
                st.markdown(compare_score_html("All-method max fold spread (x)", fold_score), unsafe_allow_html=True)
                st.caption(f"Max pairwise KD fold spread: {fold_value:.2f}x")

            rec_level = recommendation_level(report)
            if rec_level == "low":
                st.success(f"Recommendation: {report['recommendation']}")
            elif rec_level == "medium":
                st.warning(f"Recommendation: {report['recommendation']}")
            else:
                st.error(f"Recommendation: {report['recommendation']}")

            st.markdown("#### Risks / Notes")
            for r in report["risks"]:
                lvl = risk_level(r)
                if lvl == "high":
                    st.error(r)
                elif lvl == "medium":
                    st.warning(r)
                else:
                    st.info(r)

            checks = [
                {
                    "Criterion": "k_obs linearity (R² ≥ 0.90)",
                    "Value": (
                        f"{kin.get('mass_transport_r2', np.nan):.3f}"
                        if np.isfinite(kin.get("mass_transport_r2", np.nan))
                        else "N/A for selected model"
                    ),
                    "Pass": (
                        "Yes"
                        if (np.isfinite(kin.get("mass_transport_r2", np.nan)) and kin.get("mass_transport_r2", 0.0) >= 0.90)
                        else ("N/A" if not np.isfinite(kin.get("mass_transport_r2", np.nan)) else "No")
                    ),
                },
                {
                    "Criterion": "Kinetic overall score (≥ 80)",
                    "Value": f"{report['kinetic_score']:.1f}",
                    "Pass": "Yes" if report["kinetic_score"] >= 80 else "No",
                },
                {
                    "Criterion": "Equilibrium overall score (≥ 80)",
                    "Value": f"{report['equilibrium_score']:.1f}",
                    "Pass": "Yes" if report["equilibrium_score"] >= 80 else "No",
                },
                {
                    "Criterion": "KD agreement (≤ 3x)",
                    "Value": f"{report['fold_difference']:.2f}x",
                    "Pass": "Yes" if report["fold_difference"] <= 3.0 else "No",
                },
                {
                    "Criterion": "All-method max KD spread (≤ 3x)",
                    "Value": f"{report.get('max_pairwise_fold', np.nan):.2f}x",
                    "Pass": "Yes" if report.get("max_pairwise_fold", np.inf) <= 3.0 else "No",
                },
                {
                    "Criterion": "Equilibrium attained at sampling time",
                    "Value": "Reached" if eq.get("attainment", {}).get("equilibrium_reached", False) else "Not reached",
                    "Pass": "Yes" if eq.get("attainment", {}).get("equilibrium_reached", False) else "No",
                },
            ]
            if np.isfinite(report.get("kobs_kd_nM", np.nan)):
                checks.insert(
                    4,
                    {
                        "Criterion": "kobs linearization R² (≥ 0.90)",
                        "Value": f"{kobs_eval.get('linearity_r2', np.nan):.3f}",
                        "Pass": "Yes"
                        if kobs_eval.get("linearity_r2", 0.0) >= 0.90
                        else "No",
                    },
                )
            st.markdown("#### Reporting Checklist")
            st.dataframe(pd.DataFrame(checks), use_container_width=True, hide_index=True)

            report_text = report_to_text(report)
            st.download_button(
                "📥 Download Compare-Methods Report (TXT)",
                report_text,
                file_name="MIXA_compare_methods_report.txt",
                mime="text/plain",
                use_container_width=True,
            )
            full_bundle = build_full_analysis_export_bundle(
                kin, eq, st.session_state.data_list, compare_report=report, kobs_results=kobs_eval
            )
            st.download_button(
                "📦 Download Full MIXA Analysis Package (ZIP)",
                full_bundle,
                file_name=f"MIXA_full_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
                mime="application/zip",
                use_container_width=True,
                help="Includes kinetic + equilibrium packages and compare-methods report.",
            )

        else:
            st.warning("Run both Kinetic Analysis and Equilibrium Analysis to generate the comparison report.")

    if active_section == "Publication Report":
        render_publication_report({
            "kinetic_shared": fit_kinetics_shared_params,
            "kinetic_curvewise": fit_kinetics_global,
            "kobs": fit_kobs_linearization,
            "equilibrium": fit_equilibrium_advanced,
        })

    st.markdown("---")
    with st.expander("❓ FAQ & Help"):
        st.markdown(
            """
**Q: Why exclude curves?**
A: Single concentrations can be distorted by injection artifacts, baseline drift, bubbles, or referencing errors.

**Q: What do quality scores establish?**
A: Scores summarize diagnostic checks. They are heuristic, not statistical confidence levels or evidence that a model is valid. Inspect residuals, parameter uncertainty, and repeat consistency.

**Q: What counts as a repeat?**
A: An independent experiment has its own Repeat ID. Technical measurements share an ID and do not increase the independent sample size.
"""
        )

    st.markdown("---")
    render_app_footer()


def main():
    st.markdown(LEGACY_STYLES[0], unsafe_allow_html=True)
    legacy_main()


if __name__ == "__main__":
    main()
