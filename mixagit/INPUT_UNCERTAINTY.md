# Correlated Inputs and Publication Reporting

Release: `0.5.8-preview`, October 20, 2026. In-place deployment to the existing
Hugging Face Space is authorised. Dependencies, hardware and billing are
unchanged; DEPLOYMENT_STATUS.md records backups and actual runtime verification.

## What Changes

The existing fitting workflow, models, point estimates, observation windows,
objective functions and conditional information criteria are retained.
This update adds three specific scientific improvements:

- A source-aware measurement/calibration uncertainty budget for shared and
  mechanistic/assisted kinetics, kobs regression and binding isotherms.
- First-stage association-rate covariance propagation in kobs reporting,
  including kon/koff covariance when deriving KD.
- Independent noisy-data checks of ten advanced-model regimes, including
  poorly resolved cases, with held-out concentrations and complete denominators.

Mechanistic parameter tables also expose relative local error and a declared
precision screen. Unresolved individual repeat parameters stay in the diagnostic
record but do not contribute to routine parameter mean/SD figures. A derived
affinity is assessed separately, since correlated broad rates can still yield
a well-resolved ratio. The SE/value threshold of 1 matches the existing default
assisted-analysis precision policy; it is not a significance test or a threshold
tuned to these simulations. Selection/exclusion counts require scientific review.

## Controls

The main workspace includes **Measurement and concentration uncertainty**.
Settings are optional and recorded per experiment. Changing them invalidates
saved analysis/export results without changing manually selected fit windows.
Existing saved fits must be rerun.

- **Propagate sample/control measurement uncertainty** enables the raw-source
  calculation. It requires reapplying dataset assignments so the actual control
  identities, subtraction weights and original time grids are available.
- Sample/control noise SDs are Gaussian response SDs on the raw measurement
  scale. With no supplied SD, each raw trace uses at least five pre-association
  points, linear detrending and residual degrees of freedom. These source SD
  estimates are subsequently treated as fixed plug-in values.
- Raw-noise correlation time is a supplied stationary OU time in seconds.
  Zero means IID raw-source noise. This is separate from the objective's
  optional OU whitening time; uncertainty follows the actual saved estimator.
- Common-stock and concentration-level inputs are relative standard
  uncertainties, entered as percentages, not fitted nuisance parameters.
  Stock uncertainty is one common multiplicative error across all fitted files
  and repeats. Level errors are independent between nominal concentration
  levels and shared across files/repeats at the same level.

Zero concentration uncertainties mean that concentrations are treated as fixed,
not that MIXA has established perfectly accurate concentrations. No calibration
error is inferred from a poor fit. Serial-dilution covariance and separate stock
batches require a richer calibration model; they are not silently approximated
as independent repeats.

## Equations and Implementation

For the unchanged fitted residual vector r(theta), let J = dr/dtheta. The local
Gauss-Newton response to an input perturbation dr is

```text
dtheta = -(J'J)^(-1) J' dr
Cov(theta) = L Cov(inputs) L'
```

The implementation scales sensitivity columns and uses SVD. Active bounds,
rank loss, extreme ill-conditioning and robust sensitivity objectives do not
acquire conventional two-sided errors merely by enabling an input budget.
Positive-parameter transformations are included when returning physical units.
This is a local Gauss-Newton approximation, not the exact nonlinear estimator
Hessian or a full nonlinear parameter-refit Monte Carlo procedure.

Each corrected trace retains its exact signed raw-source operator. Sample noise
has weight +1. Control files are averaged within their declared Repeat ID and
then equally across control repeats, with negative subtraction weights.
One reused raw source has one identity everywhere it enters the calculation.
Interpolation uses the measured raw grid, without extrapolation. Thus the same
reference is not replaced with independently drawn noise for every target curve.

For a stationary OU source:

```text
Cov(e(t_i), e(t_j)) = SD^2 exp(-abs(t_i-t_j)/tau)
```

Source innovations are generated on their original irregular grids, interpolated
through the actual subtraction operator and passed through the actual finite
sample-median baseline normalization. All affected parameter changes are
accumulated jointly. The default integration uses 2,048 Gaussian draws with a
recorded seed and half-run variance differences. A constant or fitted linear
baseline trend is a plug-in mean assumption. This is not an assumption that
every observed fluctuation is independent random noise.

When enabled, this raw measurement covariance **replaces** the existing
conditional measurement covariance; it is not added on top of the same noise.
When only calibration is enabled, the existing baseline-aware measurement
covariance is retained. Calibration covariance is then added once:

```text
Cov_calibration(theta) = CV_stock^2 d_stock d_stock'
                      + sum_levels CV_level^2 d_level d_level'
```

Here d_stock is the sum of concentration sensitivities across all affected
curves, and d_level sums sensitivities at one concentration level. Neither
common error is divided by the number of files or repeats. Concentration
sensitivities are with respect to log concentration; the supplied CV is the
first-order relative standard uncertainty, not an assertion of a particular
large-error distribution.

### kobs Two-Stage Reporting

The association model is B + A(1-exp(-kobs*u)), with B, A and kobs fitted.
Its raw-response rate sensitivity comes from the fitted association Jacobian.
A constant baseline/initial-level shift is absorbed by B, so its variance is
not added a second time to kobs.

Let G average technical files within Repeat ID, then independent repeats at
each concentration. Let B_line be the unchanged weighted regression map:

```text
mean_rates = G * curve_rates
beta = B_line * mean_rates
Cov(beta) = B_line G Cov(curve_rates) G' B_line' + Cov_calibration
```

First-stage fitted rate variance is propagated even when no optional budget
is enabled. With raw propagation enabled, first-stage rate covariance includes
the reused-source graph and raw OU covariance. A perfectly straight observed
kobs line cannot erase the uncertainty of its measured input rates. No line-RSS
scale is used to shrink their propagated variance. Original line weights are
held fixed; uncertainty in estimated weights and model discrepancy are outside
this approximation. Constrained intercept/slope boundaries withhold ordinary
two-sided errors. Two concentrations can support propagated measurement error,
but do not supply a second-stage lack-of-fit degree of freedom.

### KD and Binding Isotherms

For 1:1 KD = koff/kon, the full rate covariance is retained:

```text
Var(KD) = (koff/kon^2)^2 Var(kon) + (1/kon)^2 Var(koff)
        - 2 koff/kon^3 Cov(kon,koff)
```

For more complex models the explicitly named microscopic, overall or apparent
affinity uses its own complete parameter gradient. A generic single KD is not
substituted for distinct estimands.

Simple/Hill isotherm propagation starts from the actual trailing-window raw
averages, referencing operator and technical/repeat aggregation. Optional
observed-maximum normalization uses the local ratio derivative only when the
maximum is positive, unique and separated from competitors by more than three
propagated gap SDs. Otherwise propagated ratio errors are withheld. That guard
is numerical, not a calibrated hypothesis test. The original profile-RSS
interval remains explicitly **conditional**, not a calibration-propagated CI.
This calculation does not establish that the sampled response was at equilibrium.

## Publication Reporting

The method is appropriate for publication reporting when the estimand, repeat
unit, uncertainty definition, enabled components and model diagnostics are
reported with the result. These quantities must not be interchanged:

- **Mean +/- sample SD, n independent repeats** describes reproducibility of
  separately fitted independent experiments. Technical files/concentrations do
  not increase n. SD is unavailable for n=1, not zero. Common-source uncertainty
  is not learned by increasing nominal repeat count.
- **Estimate +/- combined standard uncertainty, u** describes the local
  measurement/calibration budget of a specified pooled fit. For example,
  `KD = 33.0 nM, u(KD) = 3.3 nM` is not automatically `mean +/- repeat SD`.
- **95% CI** requires its construction to be stated: conditional local model,
  conditional profile, fixed-model repeat bootstrap or log-t interval for the
  geometric mean of independent repeat estimates. These are separate outputs,
  not interchangeable names for the same error bars.

State whether a shaded curve envelope is independent-repeat response SD; it is
not a fitted-curve confidence band. Retain the kon/koff/KD parameter panels,
independent-repeat points, n and any exclusion counts. Prefer unrounded numeric
CSV outputs for downstream calculations and the formatted results for display.

Exports retain source identities/SD estimates, enabled calibration scopes,
integration settings, covariance components/parameter order, exact selections,
equations/references, source hashes, diagnostics and the original inputs.
Conventional likelihood, AIC and profiles still describe the original
conditional fit. The optional budget must not be presented as a new marginal
likelihood or selection-adjusted interval. Curve-wise diagnostic engines do not
implement this budget; use the supported shared/mechanistic, kobs or isotherm
result and its saved metadata for the reported uncertainty.

## Known-Truth Evidence

See [validation/input_uncertainty/RESULTS.md](validation/input_uncertainty/RESULTS.md)
and the accompanying JSON/CSVs. The independent DOP853 species simulator does
not import production prediction code. All failures and missing intervals stay
in requested-experiment denominators. Wilson Monte Carlo intervals quantify
simulation precision; no thresholds or bounds were tuned to the outcomes.

The six input designs each use 200 independent experiments: shared-zero controls,
shared OU controls, 10% common stock calibration, first-stage kobs IID errors,
shared-control kobs and stock-calibrated kobs. Source SDs and phase boundaries
are supplied correctly. Raw integration uses 1,024 draws in this study. Stock
errors are zero-median lognormal with the declared relative SD; this is not a
claim that the calibration experiment had a mean-unbiased lognormal error.
Paired legacy/current calculations use the same fitted values.

The ten advanced regimes use ten noisy experiments each, including resolved
and weak two-state conversion, separated/overlapping populations, bivalent
normal/low-density binding, sequential normal/weak second capture and both
physical transport models. All kinetic/capacity parameters are free except
the recorded response-to-molar transport calibration. Heterogeneous labels
are matched by affinity order. A held-out concentration is never fitted.
Predeclared starts are 0.8/1.2 times the generating values: this isolates local
recovery/error behavior, not blind initialization or full multistart qualification.
Ten runs per regime are an initial screen, not precise coverage calibration.

Resolved designs recover parameters closely in these simulations. Weak
conversion and overlapping populations can have a good response fit while
individual rates or population affinities remain badly determined. Wide local
intervals containing truth do not establish useful precision or reliable
nonlinear interval shape. Keep the precision warnings/profiles and consider
whether the assay provides enough information for the desired parameters.

The older conditional methods and measured-baseline studies are retained as
separate protocols, with current source comparisons in the export registry.
They are not relabeled as studies of shared controls or calibration.

## Remaining Scope

The new budget is a defensible, explicit approximation, not a complete model
of every laboratory uncertainty. It does not propagate uncertainty in source
SD/OU-time estimates, phase detection, selected model, arbitrary control
transfer bias, between-control biological/process variation, serial-dilution
covariance, calibration-batch identities or response-to-molar conversion.
Across-repeat SD/log-t summaries remain separate from common-source covariance;
a hierarchical joint repeat/calibration estimator is not implemented. Noisy
advanced-model coverage over broad grids, blind/multistart recovery and realistic
non-Gaussian/heteroscedastic noise remain follow-up work. Independent SPR/BLI
datasets should assess applicability and prediction, not agreement with a
vendor fit as the truth.

## Reproduce

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/validate_input_uncertainty.py --input-repeats 200 --advanced-repeats 10
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/validate_methods.py --coverage-repeats 200 --automation-repeats 40
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/validate_baseline_uncertainty.py --repeats 200
```

Run on frozen production/audit sources. The new study rejects source changes
during execution rather than assigning new hashes to mixed-version evidence.

Primary uncertainty references are JCGM 100 section 5.2 (correlated inputs),
[JCGM 101](https://www.bipm.org/en/doi/10.59161/jcgm101-2008) (Monte Carlo
propagation) and [JCGM 102](https://www.bipm.org/en/doi/10.59161/jcgm102-2011)
(multiple correlated outputs). The implementation's finite-median and
Gauss-Newton scope is narrower than a full nonlinear parameter distribution.
The actual MIXA equations/code/tests and reference relationships are recorded
in `mixa_methods.py` and each run's methods exports.

## Verified Release Checks

The complete suite passes 197 tests, including the documentation workflow.
All 11 targeted equation/decision audit
checks and seven independent joint-recovery cases pass. The conditional
1,000-experiment study, five paired 200-experiment baseline studies, 160 unique
automatic experiments and the new 1,200 input-error/100 advanced-noise
experiments were rerun against the current fitting sources. Repeated automatic
seeds in separate studies are not counted as additional independent experiments.
All three bundled benchmark records match the production source hashes.

The six new input designs produced KD coverage of 92.0-97.0% for nominal 95%
local intervals, with 200/200 intervals available in each design. Shared OU
control KD coverage improved from 61.0% with the budget off to 92.0% with its
correct source model; the 10% common-stock kinetic case improved from 3.5% to
97.0%. Their Wilson Monte Carlo ranges and all rate results remain in the
machine-readable report. The 100 advanced runs converged in this local-start
screen, but weak-conversion and overlapping-population parameters include weak
precision and bias: this is not a blanket advanced-model qualification.

Browser checks exercised source assignments, persistence of the enabled input
budget between pages, the simplest-first qualified 1:1 result, independent
repeat refits and the complete analysis download. The publication package
retains numerical mean/SD/n results and all three kon/koff/KD panels. Primary
covariance is named `parameter_covariance.csv`; the original conditional
matrix, when available, is exported separately with its own definition.

Generate a fresh source-matched, clearly labeled synthetic example with:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python scripts/preview_mechanistic.py --input-budget
```
