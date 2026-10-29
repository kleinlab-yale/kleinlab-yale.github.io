# MIXA Simplest-First Assisted Fitting

Local version: `0.5.5-preview`, 2026-10-19. Not deployed by this task.

Subsequent local `0.5.7-preview` propagates measured-baseline uncertainty in
kinetic parameter errors without changing the objective, selected data or
decision thresholds. See BASELINE_UNCERTAINTY.md for the covariance equations,
paired calibration and remaining conditional inputs. Old saved fits require a
rerun to obtain those errors.

## Use

Kinetic Analysis now starts with a Fitting Assistance panel. Guided is the
default. Existing manual models, backgrounds and advanced constraints remain
below it, or select Manual controls to use them directly. The established
navigation, diagnostic panels, equilibrium, kobs and publication layouts remain.

- Guided: **Fit 1:1 and assess** runs only the basic linked 1:1 fit. A separate
  **Test next permitted candidate** action approves each subsequent attempt.
- Automatic, conservative: **Run conservative automatic analysis** tries a
  finite prespecified candidate set, starting with 1:1 and stopping when an
  adequately supported candidate passes the declared qualification policy.
- Both modes may return no adequate model, insufficient noise information,
  unresolved base fit, no justified addition or budget exhausted. They do not
  alter phases/windows, discard observations, select a background subtraction
  to improve fit, or keep adding parameters until R-squared is high.

Surface capacity linkage and kinetic rate linkage are explicit. Per curve is
appropriate for independent BLI biosensors unless surfaces are deliberately
linked. Per repeat rates share values across concentrations within each
declared independent experiment; they do not force different experiments to
have identical rates. The UI defaults to Per repeat when multiple Repeat IDs
are present. This is a prespecified design choice, not an automatically selected
random-effects model or proof that the Repeat IDs are independent.

Absolute noise SD comes from detrended pre-association observations (at least
eight points), an independently supplied measurement, or is unavailable.
Exact/near-exact baseline values are not a measured zero noise variance. When
all trace noise scales are available they set fixed relative weights. Missing
noise information permits a diagnostic base fit, not automatic qualification.
Baseline SD is estimated and treated conditionally; it is not external validation
of the instrument/noise process.

The synthetic demonstration retains its known generation-phase metadata
(20/100 seconds), so the default guided run can be exercised without manual
phase edits. Imported traces without metadata still use waveform proposals;
timing must be reviewed if their fit/residuals suggest a mismatch.

## Candidate Permissions

Linear drift may be tested when enabled and supported by a resolved baseline
trend or independently declared control evidence. Residual offset and injection
bulk steps require explicit referencing/instrument support. The simple model is
still fitted without those optional terms first.

A reversible background candidate requires independently supplied positive
background kon, koff and capacity, fixed during sample fitting. The supplied
capacity must apply to each linked surface. Surface-specific control constraints
remain a manual-engine task. The assistant does not freely fit an arbitrary
second component and call it nonspecific, or use the empirical linear
nonspecific ramp automatically.

Two-state, heterogeneous, bivalent and sequential candidates are opt-in and
require an assay justification. The bivalent model additionally requires a
bivalent soluble analyte declaration. A bivalent immobilized antibody alone
does not satisfy that condition. Quasi-steady 1:1 transport requires independent
density/flow/shaking evidence. Full two-compartment transport and its calibration
controls remain manual; no response-to-concentration calibration is invented.

The finite preset includes supported 1:1 corrections and pairs of corrections,
then assay-permitted mechanisms with the same permitted terms. Candidates are
ordered by their expanded count of free linked parameters, always beginning
with basic 1:1; the maximum is 16 candidates. A truncated plan is disclosed.
This is not an exhaustive search of all possible models, three/four-way
correction combinations, reaction networks or hierarchical random effects.

## Qualification And Selection

All candidates use the same prepared responses, exact observation masks,
physical phase history, linkage policy and noise model. A SHA-256 input digest
is checked against each completed fit. Changed inputs/policy cannot be appended
to an old comparison. Different preprocessing choices are not ranked against
one another using incompatible likelihoods.

Default policy:

1. At least two starts must reach the best residual objective within the
   declared numerical tolerance; incomplete searches and active bounds do not
   qualify. Covariance must pass the existing scaled-sensitivity checks.
2. Positive rate/capacity model SE must be finite and no larger than its value.
   These are conditional local errors, not independent-repeat SD.
3. Trace objective RMSE and phase-local block bias must be no greater than
   1.5 times the declared noise SD. Phase-specific serial-correlation screens
   must pass on objective residuals/innovations. These are transparent
   descriptive thresholds, not calibrated goodness-of-fit tests.
4. Each free kinetic/transport rate must have a complete, nuisance-refitted
   exploratory profile, with RSS exclusions on both sides before hitting bounds.
   The profile grid spans up to one decade either side, with five points plus
   the optimum. Unknown/failed points and a better discovered minimum withhold
   qualification. This is not a certified confidence interval or proof that
   all minima were found.
5. An added-parameter candidate must improve conditional same-observation AICc
   by more than 2 over each attempted simpler competitor. Among adequately
   supported candidates within 2 of the best eligible AICc, prefer fewer free
   parameters. Estimated residual variance and all expanded free local/global
   parameters are counted. These cutoffs are a prespecified policy, not a
   universal or calibrated mechanism test.
6. An unresolved base optimizer/likelihood is a stop condition, not a reason
   to endorse a more complex alternative. Candidate/profile fitting shares a
   bounded runtime (default 180 seconds per action).

The fixed-OU option uses a supplied correlation time and actual observed time
gaps. Qualification examines whitened innovations, not the raw correlation
that this prespecified model is designed to represent. The assistant does not
estimate a correlation time to conceal a bad binding mechanism. Noise-model
validation remains a separate responsibility.

## Repaired Audit Safeguards

- Independent-curve covariance is recomputed from scaled finite-difference
  sensitivities rather than accepted solely because SciPy's pseudoinverse is
  finite. Single-concentration 1:1 association-only data with unknown capacity
  cannot qualify intrinsic rates/KD or receive misleading finite rate errors;
  estimable kobs and the diagnostic curve remain visible.
- Cross-method advice checks eligibility, bounds, identifiability, attainment
  and affinity definitions. High agreement/quality scores do not override a
  failure or equate Hill half-saturation with intrinsic KD.
- Phase proposals orient either response polarity and inspect every included
  file, use supplied injection metadata when available and flag incompatible
  timing/fallbacks. Ambiguous phases require explicit verification before the
  assistant runs. Consistency is still a proposal, not validated injection timing.
- Both legacy drift comparisons now require identical observations, declared
  parameter counts, adequate conditional IID assumptions and AICc support,
  replacing the old 0.2% RSS-gain rule. Direct manual correction is still an
  analyst choice, not proof of drift or a probability of model correctness.

## Outputs And Limits

The existing saved-global-fit Curves, Parameters, Components, Diagnostics,
Identifiability, Independent repeats and Export panels are reused. An
unqualified assisted fit is explicitly diagnostic-only; routine repeat
summaries are disabled for that output. Repeat refits retain declared and
eligible n, sample SD and separately labeled log-t intervals; n=1 has no repeat
SD. The underlying formulas and existing uncertainty definitions are retained.

Publication Report exposes the saved assisted analysis without replacing
standard kinetic, equilibrium or kobs results. Curve-only and parameter-error
figures can be downloaded separately as PDF/SVG/PNG. The package includes the
same figures, repeat tables, measured/fitted/component data, diagnostics,
fixed settings, code/data hashes and every attempted model/qualification failure.
Model-specific affinity definitions are preserved; no overall avidity KD is
invented. Saved recipes are immutable when current controls are edited, and
export caches are tied to their saved results.

Independent-repeat SD, conditional model SE and response-repeat envelopes
remain distinct. Measured-baseline error is propagated in 0.5.7; shared controls,
concentration calibration, phase selection and model-search uncertainty are not
jointly propagated. Repeat
refitting holds the selected model fixed; it is not resampling of the entire
selection procedure. Automatic blocked-time/held-out-repeat validation is not
implemented. Simulated verification is not a real-instrument/vendor benchmark
or evidence for a receptor dimer interface, conformational change or avidity.

## Verification

Verified locally on October 19: **137 regression/scientific/Streamlit tests
passed**, and **11 of 11 targeted audit checks passed**. Browser verification
used the three-repeat synthetic demonstration: the guided run stopped at 1:1
without added corrections, retained 2,415 selected observations, and produced
KD = 99.97 +/- 0.78 nM (sample SD, n=3). These are synthetic validation results,
not measurements from a real binding experiment.

Reproduce the focused tests and original audit counterexamples:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/review_20261019.py
```

New tests cover simple-model stopping, guided approval, supported drift recovery,
same-data/complexity rules, missing noise, parameter/profile/budget failures,
orientation permissions, fixed negative-control constraints, fixed-OU
innovation checks, exact observation preservation, stale-settings protection,
workflow navigation and figure/statistics/export contents. All four original
counterexamples are retained as permanent regressions. Original audit evidence
is `preview/scientific_audit_2026-10-19/results_before_repairs.json`; the rerun is
`preview/scientific_audit_2026-10-19/results.json`.

The reasoning follows the simplest-model/experimental-evidence cautions in
[Cytiva model definitions](https://cdn.cytivalifesciences.com/api/public/content/digi-33042-pdf),
[Sartorius analysis guidance](https://www.sartorius.com/download/1176988/octet-spr-analysis-user-guide-en-sartorius-pdf-data.pdf)
and the covariance limitations in
[SciPy curve_fit](https://docs.scipy.org/doc/scipy-1.17.0/reference/generated/scipy.optimize.curve_fit.html).
Those references do not validate MIXA or establish equivalence with vendor software.
