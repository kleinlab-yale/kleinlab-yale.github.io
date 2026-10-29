# Measured-Baseline Uncertainty Repair

Local version `0.5.7-preview`. No Hugging Face deployment is part of this change.

## What Changed

The kinetic engines previously subtracted a measured pre-association median,
then computed parameter covariance as if that median were exact. One reference
error moves an entire trace together; it is not independent point-by-point noise.
That missing covariance substantially narrowed local kon/koff/KD intervals.

The same fitted values, binding equations, selected observations, noise weights,
objectives, parameter counts and fitting controls are retained. No fitted offset,
additional binding population or arbitrary uncertainty multiplier is introduced.
Standard shared, individual and mechanistic/assisted kinetic engines now
propagate the measured reference through the fitted-parameter sensitivities.
The derived KD error uses the resulting full kon/koff covariance.

Independent-repeat SD, SEM and repeat confidence intervals have not been
redefined. A curve envelope remains response-repeat SD, not this local error.
kobs fits with a freely fitted association offset are invariant to an additive
reference shift; they do not receive a redundant baseline inflation. This repair
does not change the equilibrium-isotherm profile interval calculation.

## Equations and Assumptions

For normalized errors e = epsilon_selected - error_in_baseline:

```text
Cov(e) / sigma^2 = K + beta*1*1' - h*1' - 1*h'
beta = Var(sample median of Gaussian baseline) / sigma^2
h_i = Cov(epsilon_selected_i, sample median) / sigma^2
```

K is the selected raw-error correlation matrix: identity for IID measurement
noise or the explicitly supplied fixed-time OU matrix. Under the Gaussian
model, Stein's identity gives h from the baseline/selected cross-correlation
and expected ranks of the median. Both cross-phase terms are retained.

Finite-sample median moments use deterministic scrambled-Sobol Gaussian draws,
with actual reference times and an optional plug-in baseline trend. An IID
stationary reference with at least 128 observations uses pi/(2*n), the
large-sample Gaussian median variance. A single reference point is exact.
Integration method and draw count are exported. Correlated/trending references
above 4096 points currently withhold local uncertainty rather than silently use
an unsupported approximation. IID stationary long baselines have no such limit.

In weighted/whitened optimizer coordinates, let J be the residual Jacobian,
A = (J'J)^-1 J', H = J*A and Q the normalized-error covariance after the existing
noise transformation. The local estimator covariance is:

```text
estimated sigma^2 = RSS / trace((I-H)*Q)
Cov(parameters) = estimated sigma^2 * A*Q*A'
Var(KD) = gradient(KD)' * Cov(parameters) * gradient(KD)
```

The scale denominator accounts for the reference contribution to RSS, avoiding
double counting. Scaled SVD and low-rank reference contributions avoid inversion
of poorly scaled physical parameters and dense observation covariance matrices.
Fixed parameters, active bounds and unresolved sensitivities retain the existing
error-withholding rules.

This propagates correlated inputs through the existing estimator, consistent
with [JCGM 100:2008, section 5.2](https://doi.org/10.59161/JCGM100-2008E).
It is not a replacement marginal-likelihood fit. Existing AIC and exploratory
RSS profiles still condition on preprocessing; their definitions and decision
thresholds are unchanged and exported as such.

The approximation assumes an adequate local binding/observation model and
Gaussian measurement noise with the stated per-trace structure across baseline
and kinetic phases. Relative weights and OU time remain conditional inputs.
The calibrated cases have stationary baselines; trending-reference moments have
numerical support but no broad coverage claim. Shared controls, concentrations,
phase uncertainty, systematic baseline misspecification and model-selection
uncertainty are not jointly propagated. Nominal t/delta intervals remain local
approximations, not an exact t sampling distribution for a normalized nonlinear fit.

## Verification

Tests compare the low-rank calculation with explicit full covariance and with
independently generated correlated Gaussian measurements. They also check no
double counting when a free offset already absorbs the reference, unchanged
point fits/masks/objectives, legacy engine integration, original reference grids
after downsampling, saved-run identity and kobs invariance.

Paired calibration uses independent generation and a separate seed stream from
the original failure. Each pair uses the same fitted values, once with the
baseline held fixed and once with propagation. All 200 local intervals were
available per design:

| Design | KD coverage before | KD coverage after |
| --- | --- | --- |
| IID, 5 baseline observations | 24.0% | 95.5% |
| IID, 20 baseline observations | 48.0% | 94.5% |
| IID, 80 baseline observations | 75.0% | 93.0% |
| IID, 20 baseline observations, estimated relative weights | 53.5% | 93.0% |
| OU, 20 baseline observations, true supplied tau=4 s | 58.5% | 92.5% |

Wilson 95% Monte Carlo intervals include 95% for each rate above. This is
compatibility at this simulation size, not exact/universal 95% calibration.
kon/koff results, availability, failures, seeds and hashes are recorded in
`validation/baseline_uncertainty/RESULTS.md` and its JSON/CSV evidence.

The complete regression/Streamlit suite passed **167 tests** after the repair.
The original targeted scientific audit passed **11/11 checks**, and all seven
independent joint-recovery cases still passed. Production and audit source hashes
were checked against both new evidence records after execution.

The exact original 40-seed automatic scenario reran all selection/profile checks.
Thirty-three fits still qualified, with the same estimates. KD coverage among
them improved from 13/33 (39.4%) to 30/33 (90.9%); kon covered 30/33 and koff
32/33. No tolerance or threshold was changed.

Reproduce:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
.venv/bin/python audits/validate_baseline_uncertainty.py --repeats 200
.venv/bin/python audits/validate_methods.py --coverage-repeats 200 --automation-repeats 40
```

## Reporting and Saved Results

`uncertainty_method` identifies propagated errors. `baseline_uncertainty` records
reference counts, integration method, cross-phase handling and scale calculation.
Primary `model_se`, derived affinities and parameter correlations all use the
propagated covariance. The previous conditional-on-baseline SE is retained only
as an explicitly named diagnostic export column. Packages include the equations,
reference, metadata and new code hashes.

Old saved fits are not retrospectively relabeled. Rerun kinetic analysis under
this version, then rebuild its publication package, to obtain the new local
errors. Original failure evidence is preserved under
`preview/baseline_uncertainty_before_repair/`.
