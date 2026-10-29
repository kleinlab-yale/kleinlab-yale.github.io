"""Optional fitting education; examples never change an analysis or its data."""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
from mixa_plotting import show_figure

from mixa_mechanisms import binding_prediction
from mixa_methods import EQUATIONS, bibliography, equation_record, methods_markdown


def teaching_example(kon=1.2e5, koff=.012, concentration_nM=50., assoc=(20., 100.), dissoc=(100., 180.)):
    t = np.arange(181.)
    truth = dict(kon=1.2e5, koff=.012, Rmax=85.)
    measured = binding_prediction(t, concentration_nM*1e-9, 20., 100., truth)
    measured += np.random.default_rng(572).normal(0., .25, len(t))
    prediction = binding_prediction(t, concentration_nM*1e-9, 20., 100., dict(kon=kon, koff=koff, Rmax=85.))
    mask = ((t >= assoc[0]) & (t <= assoc[1])) | ((t >= dissoc[0]) & (t <= dissoc[1]))
    return dict(time=t, measured=measured, prediction=prediction, used=mask, residual=measured-prediction)


def _draw_example(example, show_residual=False):
    count = 2 if show_residual else 1
    figure, axes = plt.subplots(count, 1, figsize=(8., 4.8 if show_residual else 3.4), squeeze=False,
                                gridspec_kw={"height_ratios": [3, 1]} if show_residual else None)
    ax = axes[0, 0]
    t, selected = example["time"], example["used"]
    ax.scatter(t[~selected], example["measured"][~selected], color="#b7bcc2", s=9, label="Not in objective")
    ax.scatter(t[selected], example["measured"][selected], color="#244967", s=9, label="Selected observations")
    ax.plot(t, example["prediction"], color="#cf6c22", linewidth=1.8, label="Model prediction")
    ax.axvline(20., color="#818a95", linestyle=":", linewidth=.9)
    ax.axvline(100., color="#818a95", linestyle=":", linewidth=.9)
    ax.set(ylabel="Response (example units)", xlabel="Time (s)")
    ax.legend(frameon=False, fontsize=8)
    if show_residual:
        residual_ax = axes[1, 0]
        residual_ax.axhline(0., color="#818a95", linewidth=.8)
        residual_ax.scatter(t[selected], example["residual"][selected], s=7, color="#244967")
        residual_ax.set(ylabel="Data - model", xlabel="Time (s)")
    for panel in axes.flat:
        panel.spines[["top", "right"]].set_visible(False)
    figure.tight_layout()
    return figure


def _show_example(example, residual=False):
    figure = _draw_example(example, residual)
    try:
        show_figure(figure)
    finally:
        plt.close(figure)


@st.dialog("Education: How Fitting Works", width="large")
def render_fitting_education():
    render_fitting_education_contents()


def render_fitting_education_contents():
    st.caption("Illustrative examples only. These controls do not change your datasets, fit settings or saved results.")
    topic = st.selectbox("Topic", ["1:1 kinetics", "Fit windows and residuals", "Errors and independent repeats",
                                  "Corrections and advanced models", "Automatic analysis", "Equilibrium and kobs",
                                  "Equations and references"], key="education_topic")
    if topic == "1:1 kinetics":
        st.markdown("#### Start with the simplest binding model")
        st.write("Adjust the model prediction against fixed simulated observations. The optimizer searches numerically for the parameters that best describe the selected data.")
        left, right = st.columns(2)
        logkon = left.slider("log10 kon (M^-1 s^-1)", 4., 6., float(np.log10(1.2e5)), .01, key="education_logkon")
        logkoff = right.slider("log10 koff (s^-1)", -3., -1., float(np.log10(.012)), .01, key="education_logkoff")
        kon, koff = 10**logkon, 10**logkoff
        st.write(f"kon = {kon:.3g} M^-1 s^-1; koff = {koff:.3g} s^-1; KD = {koff/kon*1e9:.2f} nM. Example concentration: 50 nM.")
        _show_example(teaching_example(kon, koff))
        st.latex(r"\frac{dR}{dt}=k_{\mathrm{on}}C(R_{\max}-R)-k_{\mathrm{off}}R\qquad K_D=\frac{k_{\mathrm{off}}}{k_{\mathrm{on}}}")
        st.write("During association, binding and dissociation occur together. The approach rate is kobs = kon C + koff. During buffer-only dissociation in the 1:1 model, the response decays with koff. Rmax controls the available response capacity.")
        st.write("Global fitting uses several concentrations together. Parameter linkage specifies what is shared: rates across concentrations within an experiment, and capacity only across traces representing the same surface assumptions.")
    elif topic == "Fit windows and residuals":
        st.markdown("#### A selected interval controls the objective, not the injection history")
        left, right = st.columns(2)
        association = left.slider("Example association observations (s)", 20., 100., (20., 100.), 1., key="education_assoc")
        dissociation = right.slider("Example dissociation observations (s)", 100., 180., (100., 180.), 1., key="education_dissoc")
        mismatch = st.checkbox("Show an incorrect dissociation rate", key="education_mismatch")
        example = teaching_example(koff=.025 if mismatch else .012, assoc=association, dissoc=dissociation)
        _show_example(example, True)
        st.write(f"{int(example['used'].sum())} observations are selected in this illustration. The line is not refitted here: trimming changes which residuals would be optimized, while the model still evolves from injection at 20 s and buffer switch at 100 s.")
        st.latex(r"\mathrm{RSS}=\sum_{i\,\in\,\mathrm{selected}}(R_i-\widehat R_i)^2")
        st.write("A residual is data minus prediction. Inspect phase-specific bias, concentration patterns and serial correlation, not only R-squared. Structured residuals can motivate checking phases, referencing, surface effects or alternative binding models. Random-looking residuals alone do not establish precise rate estimates.")
        st.write("Keep data-selection reasons in the analysis record. Removing points solely because they reduce fit quality can bias the result.")
    elif topic == "Errors and independent repeats":
        st.markdown("#### Three error quantities answer different questions")
        st.markdown("**Conditional model SE** estimates parameter precision within one fitted dataset, given its model, noise assumptions, concentrations, preprocessing and fixed parameters.")
        st.markdown("**Independent-repeat SD** describes the spread of separately fitted independent experiments. Technical files and concentrations do not increase independent n.")
        st.markdown("**Confidence interval** describes uncertainty in a specified estimated quantity under a stated method. MIXA's across-repeat log-t interval targets the geometric mean; it is not the same as mean +/- SD.")
        values = np.array([28., 33., 38.])
        st.dataframe(pd.DataFrame({"Independent repeat": ["R1", "R2", "R3"], "KD (nM)": values}), hide_index=True)
        st.write(f"Example: KD = {values.mean():.0f} +/- {values.std(ddof=1):.0f} nM (arithmetic mean +/- sample SD, n=3). For one repeat, repeat SD is unavailable, not zero. KD SD is calculated from each repeat's KD, not from a ratio of average rates.")
        st.write("The shaded envelope in MIXA's publication kinetic curves is response SD across declared independent repeats after technical averaging. It is not a fitted-curve confidence band or an error bar on KD.")
        st.write("Within a fit, uncertainty in KD includes covariance between kon and koff. Estimated-baseline error shifts a whole trace together; MIXA propagates that shared error through all fitted parameters using the measured reference times. It does not add a freely fitted offset or alter the fitted observations.")
        st.write("Measurement and concentration uncertainty provides an optional raw-source/calibration budget. One reused control trace contributes the same noise to every sample that uses it; a common stock error does not average away across repeats. Calibration CVs are supplied standard uncertainties, not fitted correction terms. These local errors remain conditional on the selected model, windows, noise SDs and correlation time; phase and model-selection uncertainty are separate.")
        st.write("kobs reporting propagates first-stage association-rate covariance through technical/repeat averaging and the concentration regression, then retains kon/koff covariance when calculating KD. A nearly perfect straight line does not erase uncertain first-stage rates. Constant reference shifts absorbed by a freely fitted association offset are not counted twice.")
    elif topic == "Corrections and advanced models":
        st.markdown("#### Match each addition to a specific question")
        st.dataframe(pd.DataFrame([
            ("Baseline normalization", "Subtract a pre-association reference level", "Does not force every noisy baseline point to be identical"),
            ("Linear drift", "Add a time-dependent signal trend", "Inspect baseline and independent references"),
            ("Linear background", "Add a concentration-scaled ramp, held after injection", "Empirical signal term; distinct from drift"),
            ("Reversible background", "Add another binding population", "Control data help assign a nonspecific interpretation"),
            ("Physical transport", "Model analyte supply/depletion and possible rebinding", "Density and flow/shaking variation can help distinguish it"),
            ("Two-state", "Binding followed by a reversible change in bound state", "Check whether all four rates are determined"),
            ("Heterogeneous", "Two independent surface populations", "Not the same as two sites on one molecule"),
            ("Bivalent analyte", "A soluble analyte can attach to two surface sites", "Second attachment depends on surface availability"),
            ("Sequential capture", "A second soluble analyte adds response", "Requires the matching reaction/observation model"),
        ], columns=["Option", "What it represents", "What to examine"]), hide_index=True)
        st.write("More flexible models usually lower residual error. They are useful when the improvement is supported and the extra parameters are estimable. Compare plausible alternatives and use the results to guide further experiments. A model may fit the response well while several rate combinations remain compatible with it.")
        st.write("Soluble versus immobilized valency matters. An immobilized bivalent antibody with soluble monomeric receptor does not automatically require the bivalent-soluble-analyte model. Advanced affinities retain their own definitions; MIXA does not invent a single intrinsic avidity KD.")
    elif topic == "Automatic analysis":
        st.markdown("#### Simplest first, with a visible decision record")
        st.markdown("1. Fit global 1:1 to the selected observations.\n2. Check convergence, boundaries, uncertainty, residuals and rate profiles.\n3. If needed, test only permitted additions supported by baseline/control information or assay rationale.\n4. Compare the same observations and noise assumptions, accounting for all free parameters.\n5. Stop at a supported candidate or return the unresolved issues for review.")
        st.write("Guided mode asks before the next candidate. Automatic mode runs a finite permitted set. Neither changes your selected windows, drops traces or adds every correction automatically.")
        st.write("The current 1.5 residual/noise ratio and delta-AICc >2 cutoffs are disclosed decision policies, not probabilities that a mechanism is correct. The validation package measures their behavior under defined simulations, including unnecessary additions and cases with no recommendation.")
    elif topic == "Equilibrium and kobs":
        st.latex(r"R_{\mathrm{eq}}=R_{\max}\frac{C}{K_D+C}\qquad k_{\mathrm{obs}}=k_{\mathrm{on}}C+k_{\mathrm{off}}")
        st.write("An equilibrium isotherm estimates affinity from the concentration-response relationship after appropriate equilibration. A response sampled before equilibration remains a fixed-time measurement. Without sufficient saturation, capacity and affinity can compensate for each other.")
        st.write("kobs analysis fits association exponentials first, then regresses their rates against concentration. The slope estimates kon and the intercept estimates koff under the simple model. The intercept can be poorly determined even when individual association fits look good.")
        st.write("The koff-from-kobs overlay asks whether that intercept predicts the measured off-phase shape. A direct off-phase fit is a separate estimate with its own residuals and scores. Comparing them is useful diagnostic evidence, not a reason to substitute one score for the other.")
    else:
        key = st.selectbox("Equation or method", list(EQUATIONS), format_func=lambda value: EQUATIONS[value]["title"], key="education_equation")
        record = equation_record([key])
        entry = record["equations"][key]
        st.code("\n".join(entry["equations"]), language="text")
        st.markdown("**Units**")
        st.write(entry["units"])
        st.markdown("**Assumptions and provenance**")
        st.write(entry["assumptions"])
        st.write(entry["provenance"])
        for reference in record["references"].values():
            st.markdown(f"[{reference['title']} ({reference['year']})](https://doi.org/{reference['doi']})")
        st.caption("Empirical terms and explicitly derived equations are labeled as such. References support methods, not universal rate values.")
        full = equation_record()
        st.download_button("Download equation and methods guide", methods_markdown(full), "MIXA_equations_and_methods.md", "text/markdown", on_click="ignore", key="education_download_methods")
        st.download_button("Download references (BibTeX)", bibliography(full), "MIXA_references.bib", "text/plain", on_click="ignore", key="education_download_references")
