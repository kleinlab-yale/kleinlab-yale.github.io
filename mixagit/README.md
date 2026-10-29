---
title: MIXA 0.5.10
emoji: 🎛️
colorFrom: blue
colorTo: yellow
sdk: streamlit
sdk_version: 1.54.0
python_version: 3.11
app_file: app.py
pinned: false
---

# MIXA 0.5.10

## Release 0.5.10

Adds target-specific bootstrap-calibrated rate/KD intervals, faster complex-model
prediction, and a separate Bayesian joint 1:1 repeat/reference/calibration
analysis. Joint population credible intervals, between-repeat variation,
same-curve uncertainty and new-repeat prediction are explicitly distinguished
from independent-repeat mean +/- sample SD. Model equations, priors, diagnostics,
source hashes and retained failures are included in downloads. See
[JOINT_INFERENCE.md](JOINT_INFERENCE.md), [REFIT_REVIEW.md](REFIT_REVIEW.md) and
[CHANGES_0.5.10.txt](CHANGES_0.5.10.txt).

All 30 advanced-model benchmark datasets completed their three-start searches
within the same 30-second limit, compared with 15/30 in the prior study. A new
300-experiment KD calibration study returned intervals in 300/300 cases; nominal
95% coverage was 93%, 94% and 94% in its three recorded designs. These finite
studies do not establish universal coverage or advanced hierarchical inference.

This release is prepared for an in-place update of the existing
`Ewaldssphere/MIXA_beta0.3` Space. Python, Streamlit, dependencies, original
examples and CPU Basic hosting resources are unchanged. See
[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for the release gate, rollback
snapshot and deployment verification status.

## Retained 0.5.9 Features

The retained 0.5.9 update adds adaptive parameter profiles, nonlinear parameter/KD
refit intervals, deletion sensitivity and leakage-safe held-out predictions
for saved global kinetic fits. Existing diagnostic panels, equilibrium plots
and independent-repeat kon/koff/KD mean +/- SD figures are retained. Full
definitions, reporting gates, primary sources and remaining limits are in
[REFIT_REVIEW.md](REFIT_REVIEW.md).

Dataset roles, repeats and background choices are edited in one compact table
with selective removal. Workflow navigation returns to the top; active figure
previews are vector SVG. Assisted fitting can compare the signed linear
nonspecific term and drift separately/together, with a visible candidate queue
and simplest-adequate compare-all policy. Baseline normalization is explicitly
selectable and held identical across candidates.

The 0.5.10 downloads include these retained 0.5.9 features. Earlier versioned
archives remain available as historical releases.

## User Documentation

Read [the MIXA User Guide](USER_GUIDE.md) for data/control assignment, fit windows,
model equations, fitting and selection procedures, uncertainty definitions,
publication reporting and primary references. **Methods & References** in the
application opens the guide and provides Markdown, BibTeX and a complete methods
documentation ZIP, even before data are loaded. Analysis packages also include
the guide plus the applicable equations, citations, saved settings and source
hashes for that particular run. The documentation is bundled with the source;
it does not rely on an external documentation service.

Download the [complete methods documentation](https://huggingface.co/spaces/Ewaldssphere/MIXA_beta0.3/resolve/main/MIXA_0.5.10_methods_documentation.zip?download=true)
or the [source, tests and benchmark evidence](https://huggingface.co/spaces/Ewaldssphere/MIXA_beta0.3/resolve/main/MIXA_0.5.10_source.zip?download=true).

## Release 0.5.8

Version `0.5.8-preview` adds a source-aware measurement/concentration uncertainty
budget, first-stage kobs error propagation and broader advanced-model noise
checks. Shared controls and common-stock errors retain their covariance;
derived KD retains the full rate covariance. Mechanistic repeat summaries
flag and retain unresolved estimates without presenting them as resolved
parameter means. The fitting controls, selected observations, fitted curves,
diagnostics and kon/koff/KD figure layouts are retained.
See [INPUT_UNCERTAINTY.md](INPUT_UNCERTAINTY.md) for equations, tested conditions,
publication reporting and remaining scope. This release preserves the existing
Space URL, dependencies, Python/Streamlit configuration and hosting resources.
DEPLOYMENT_STATUS.md records release approval, backups and verification.

## Deployed Baseline Repair

Release `0.5.7-preview` repairs measured-baseline uncertainty in kinetic parameter
errors without changing fitted curves, selected data or decision thresholds.
The same full covariance is used for kon/koff and derived KD. See
[BASELINE_UNCERTAINTY.md](BASELINE_UNCERTAINTY.md) for equations, scope and paired
coverage evidence. Existing saved fits must be rerun to obtain the new errors.
That reviewed build was deployed in place to the existing
`Ewaldssphere/MIXA_beta0.3` Space. Hosting resources and dependencies are unchanged.
See [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for release gates and rollback.

## Methods and Education

The included `0.5.6-preview` update adds an optional **Education: How Fitting Works** panel,
an equation/source registry included in analysis exports, and independently
generated numerical/statistical benchmark evidence. The established workflow,
fit equations, decision thresholds, diagnostics and figure layouts are unchanged.
See [METHODS_VALIDATION.md](METHODS_VALIDATION.md) for the protocol and
[validation/RESULTS.md](validation/RESULTS.md) for measured performance. The
original baseline-uncertainty undercoverage finding and its paired repair are
reported in [validation/baseline_uncertainty/RESULTS.md](validation/baseline_uncertainty/RESULTS.md).

## Assisted Fitting

The included `0.5.5-preview` update adds simplest-first guided and conservative
automatic analysis inside Kinetic Analysis. Global 1:1 is always the starting
model; corrections and advanced alternatives require explicit permission and
supporting baseline/control or assay evidence. Qualification uses the actual
global fit, fixed observations, complexity-adjusted support, residual/noise
checks, multiple starts and exploratory nuisance-refitted rate profiles.
Failure and ambiguity remain valid outcomes. The recorded benchmarks specify
the tested designs and distinguish numerical recovery from uncertainty coverage.

The October 19 audit's four safeguards are repaired: unresolved curve-wise
rate precision, cross-method qualification, polarity/multi-file phase proposals
and drift complexity checks. Assisted results retain the existing diagnostics
and have separate curve/parameter figures and repeat-statistics exports in
Publication Report. See [ASSISTED_FITTING.md](ASSISTED_FITTING.md) for controls,
policy, reproducibility and limitations. Dependencies and hosting configuration
are unchanged.

## Previous Testing Release

Testing build `0.5.4-preview`, authorised on 2026-10-16 for the existing
`Ewaldssphere/MIXA_beta0.3` Space. It preserves the established workflow and
adds the reviewed fitting, background-control and publication improvements.
This is a testing release, not certification of arbitrary scientific results.
See DEPLOYMENT_STATUS.md for configuration, validation and rollback information.

Version `0.5.4-preview` adds saved-model diagnostic overviews to standard and
mechanistic kinetics, curve/phase RMSE and bias tables, individual trace and
residual inspection, serial-correlation detail, and diagnostic CSV/PDF exports.
The original curve-wise dashboard remains supplementary; its heuristic score
is not an assessment of the reported shared global fit. Publication layouts,
parameter/error plots, equilibrium and kobs analyses are retained. Fitting
algorithms are unchanged in this diagnostic update. See
[DIAGNOSTICS_REVIEW.md](DIAGNOSTICS_REVIEW.md) for the comparison and limits.
The reviewed source, tests and original examples are included in
`MIXA_0.5.4_testing_source.zip`.

Version `0.5.3-preview` adds mechanistic controls and models directly under
Kinetic Analysis. One Binding model dropdown contains all six choices;
physical transport and reversible nonspecific binding are beside it, and
parameter bounds/fixed values/custom linkage are available in the same section.
The shared Background Corrections controls expose baseline normalization,
linear drift, empirical linear nonspecific background and reversible
nonspecific binding consistently across models. Drift and both nonspecific
terms are opt-in; the delivery-lag model does not support reversible background.
See [ADVANCED_KINETICS.md](ADVANCED_KINETICS.md) for equations, assay orientation,
validation and limitations. There is no separate Advanced Kinetics navigation
entry. Standard fitting results and diagnostics remain available.
The underlying `0.5.2-preview` hardening improved fitting and reporting without
replacing the approved workflow or parameter panels. See SCIENTIFIC_HARDENING.md
for corrected calculations, qualification rules, evidence and limitations.

## Preserved Workflow

Data Input, Kinetic Analysis, kobs Linearization, Equilibrium Analysis,
Model Comparison, Publication Report and the optional kinetic model selector
remain separate, directly accessible sections. The original diagnostic
dashboards and individual-fit panels are retained.

Load multiple wide or long dataset files (`.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls`)
with concentrations in `fM`, `pM`, `nM`, `uM`/`µM`, `mM`, or `M`, bare numeric
headers, or `Blank`/`Buffer`/`Ref` reference columns. The original Group 1 and
Group 2a sample datasets and the 3-repeat raw benchmark files (`data/raw_benchmark/`)
remain available. Smart auto-prediction populates `Sample` / `Negative control` /
`Exclude`, `Experiment`, `Repeat ID` and reference subtraction (`Matched concentrations`,
`Control 0 nM`, `Same-file 0 nM`), and a single **Unified column & trace assignments**
table lets users edit any column's role, concentration, unit, or fit inclusion in
one place without per-dataset dropdowns. Technical files share a Repeat ID;
independent experiments have different IDs.

Phase starts are detected automatically by default. Fitting uses the full
association phase up to dissociation, then the full dissociation phase to
the end of each trace. "Adjust phase starts" exposes optional correction
sliders. Independent association/dissociation trimming sliders are available
under "Optional fit trimming" and are off by default. Resetting to automatic
restores the detected starts and full phases. Input/preprocessing changes
refresh detection so a previous dataset's trimmed selection is not reused.

Physical phase transitions and optional association/dissociation fit
intervals are separate. Only selected observations enter kinetic objectives
and their degrees of freedom. Baseline reference observations can support
normalization but do not enter that objective. Saved intervals are reused
for independent-repeat refits. Changing data, controls or intervals
invalidates previous results and exports.

## Publication Outputs

- The main layout after calculating repeat statistics follows the supplied
  reference: a large binding-curve panel above k_on, k_off and K_D panels.
  Individual independent-repeat dots and n accompany the parameter error bars.
  Mean +/- SD and geometric-mean 95% CI are explicit choices; both layouts are
  included in the complete package. Fixed-time isotherms are labeled as such
  when the steady-state check does not pass.
- Standalone kinetic and kobs layouts retain their k_on, k_off and K_D
  independent-repeat dot/error-bar panels. Binding-isotherm layouts retain
  their K_D dot/error-bar panel. Each adds numerical parameter results below
  the plots, for example K_D = 33.0 +/- 5.0 nM
  (mean +/- SD, n=3). Isotherms also have a log-concentration layout. K_D SD
  is calculated from the independent-repeat K_D estimates, not from a ratio
  of mean rates. A single repeat shows SD unavailable, not zero. Readable
  parameter results are available as TXT and CSV, as well as in the figures.
- Unbranded kinetic mean curves with shaded independent-repeat sample SD,
  individual-file data/fit overlays, kobs mean +/- SD with individual repeat
  points, and binding isotherms with individual repeat points and mean +/- SD.
- Linear and logarithmic concentration axes and a combined binding figure.
- Solid model segments inside fitted intervals; dashed predictions outside.
- Technical files are averaged within Repeat ID before between-repeat SD.
  Kinetic time alignment is for display only, within common measured coverage.
  The figure legends describe interpolation and marker thinning explicitly.
- Arithmetic mean, sample SD (ddof=1), SEM, median, geometric mean and
  log-Student-t 95% confidence intervals are separate table columns.
  n is the number of declared independent repeat estimates. SD, SEM and
  across-repeat confidence intervals are unavailable for n=1, not zero.
- Figure-only PNG/PDF/SVG and figure-source CSV/legend downloads are
  available before running the separate independent-repeat refits.
- Complete analysis ZIPs include original inputs and hashes, assignments,
  background correction, point-selection flags, fit settings, software/code
  hashes, residual diagnostics, figures, figure-source tables and legends.

Plots use consistent print-sized sans-serif labels, white backgrounds,
thin axes and vector PDF/SVG. Publication Report offers 89 mm and 183 mm
widths. This follows figure-production conventions, not a claim of journal
approval or scientific validity.

## Local Use

The release includes `MIXA_0.5.8_source.zip`, containing the reviewed source,
original examples, tests, audit scripts, benchmark evidence and reproduction notes.
The commands below refer to that complete source package.

Keep app.py, mixa_app.py, mixa_data.py, mixa_workspace.py, mixa_reporting.py,
mixa_selection.py, mixa_figures.py, mixa_science.py, mixa_mechanisms.py,
mixa_mechanistic_ui.py, mixa_diagnostics.py, mixa_automation.py,
mixa_assistant_ui.py, mixa_methods.py, mixa_education.py, mixa_uncertainty.py,
mixa_input_uncertainty.py and mixa_documentation.py together, with USER_GUIDE.md
and the bundled `data/` and `validation/` directories.

```sh
.venv/bin/python -m streamlit run app.py
.venv/bin/python mixa_cli.py data/raw_benchmark/*.csv --output preview/cli_run.json
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python scripts/preview_analysis.py
```

The headless CLI (`mixa_cli.py`) and Python API (`run_headless_analysis`) run the
same preprocessing, phase detection, global mechanistic optimization and
independent-repeat summarization without a browser. See [PAPER.md](PAPER.md),
[CITATION.cff](CITATION.cff) and [LICENSE](LICENSE) for manuscript and archival
metadata.

The preview script writes reviewable figures, source tables and complete
analysis packages under preview/publication/. It runs both original sample
files conservatively as one independent repeat, and separately runs the
clearly labeled three-repeat synthetic demonstration. Synthetic recovery
is a calculation check, not experimental evidence.

## Scientific Limits

A fixed-time isotherm is not established equilibrium affinity when the
steady-state check fails. Across-repeat SD is response/reproducibility
variability, not a model confidence band. Local measurement SE (including
measured-baseline propagation where applicable) and repeat-level confidence
intervals answer different questions.

Reported intervals retain the saved model, windows and noise assumptions.
Supported pooled fits can propagate raw shared-control measurement covariance
and supplied common-stock/level concentration uncertainty when enabled. This is
local propagation, not a full nonlinear refit or selection-adjusted interval.
Across-repeat SD/log-t intervals remain separate from that input budget and can
be affected by correlated repeat errors. Curve-wise diagnostic fits do not
implement the new budget. Source SD/OU-time estimation error, uncertain phase
boundaries and arbitrary control-transfer bias are not jointly propagated.
Heuristic diagnostic scores are decision aids, not probabilities. The delivery-
lag model is empirical, not a physical mass-transport correction. Advanced
models still require independent experimental benchmarks. Isotherm summaries
exclude unresolved or insufficiently saturated estimates, while keeping their
curves available for inspection. Hill affinity denotes apparent half-saturation.
No automatic data exclusion, invented variability or silent shared-fit
fallback is part of this release.

## Deployment

No dependency, SDK, hosting, hardware or billing changes are requested.
The rejected mixa_ui.py five-stage frontend is not imported or packaged.
The reviewed 0.5.8 build was explicitly authorised on 2026-10-20 for in-place
deployment to the existing Space. This approval does not authorise future
unreviewed changes or paid resources. Submission is verified separately against
the running revision and hosted analysis/download checks.
