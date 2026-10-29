# MIXA Scientific Hardening

Local review version: `0.5.2-preview`, 2026-10-16. Nothing in this release has
been uploaded to Hugging Face. The restored live `0.5` Space is unchanged.

## Corrected Calculations

- Equilibrium fitting no longer caps Rmax at twice the largest measured
  response or KD at ten times the largest concentration. It optimizes log KD
  while analytically profiling nonnegative Rmax. Hill fits also profile the
  Hill coefficient. Numerical search guards are not confidence limits; a
  solution reaching them is flagged as unresolved.
- Approximate 95% affinity profile intervals use
  `RSS(KD) - RSS_min <= RSS_min / (n - p) * F(0.95; 1, n - p)`.
  Rmax and, for Hill, the Hill coefficient are reoptimized at each KD.
  Open endpoints remain open. These are conditional nonlinear-regression
  approximations, not independent-repeat confidence intervals or an exact
  small-sample coverage guarantee. Relative SEM weights are held fixed.
- Routine isotherm parameter summaries require a finite two-sided profile
  interval, resolved parameter sensitivities, no active bounds, and measured
  concentrations spanning the fitted half-saturation value through at least
  twice it. This is a conservative reporting gate, not proof of equilibrium.
  Estimates and curves remain available even when they do not qualify.
- Two-state binding propagates the complete AB/AB* state to the actual
  dissociation boundary, independently of observation times and fit windows.
  Overall affinity is `(koff / kon) * kd / (ka + kd)`, with uncertainty using
  the full parameter covariance. The microscopic first-step constant is
  exported separately. A single kobs or `ln(2)/koff` is no longer presented
  as describing the overall two-state response.
- The former "mass transport" option is explicitly an empirical delivery-lag
  model. Its association ODE is integrated from injection start and its
  dissociation starts from the actual end-of-injection state. It is not a
  coupled surface depletion/rebinding model and does not establish intrinsic
  mass-transport-corrected rates. The internal `1:1+MT` alias is retained.
- Equilibrium flatness qualification cannot use observations after the
  sampling time. It also checks for a resolved response above baseline noise.
  The classification remains a heuristic, not thermodynamic evidence.

The profiling approach follows standard nonlinear least-squares inference,
which is explicitly approximate in nonlinear models. See the primary
[R profile.nls documentation](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/profile.nls.html)
and [R summary.nls documentation](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/summary.nls.html).
Cytiva gives the upper-concentration coverage rule as a practical safeguard
for freely fitted capacity in its [Biacore S200 handbook](https://cdn.cytivalifesciences.com/api/public/content/digi-47754-pdf).
The additional lower-concentration and profile checks here are MIXA's
conservative reporting policy, not a claim that every experiment meeting
them is valid.

## Uncertainty And Model Decisions

- Shared-fit Rmax standard errors come from the fitted covariance rather
  than a hard-coded zero. Scaled-Jacobian SVD checks identify rank loss and
  poor conditioning. Nonpositive residual degrees of freedom are not
  replaced by one. All shared parameter bounds, including nuisance terms,
  are checked; conditional two-sided errors are withheld at active bounds.
- Single-repeat concentration SD/SEM stays missing, not zero. Missing or
  zero kobs SEMs are not replaced with invented fitting weights. The
  concentration regression uses either all available positive relative SEMs
  or an explicitly unweighted fit. Nonnegative slope/intercept constraints
  are solved jointly; a negative intercept is not merely clipped after OLS.
- Serial residual correlation is screened per trace without joining gaps
  between trimmed windows. The screen is descriptive, not a calibrated test.
  Numerically zero residuals are not interpreted as evidence of correlation.
  Warnings qualify ordinary IID covariance errors. No correlated-error
  covariance correction has been claimed or silently substituted.
- Independent-repeat reporting retains arithmetic mean, sample SD, SEM and
  log-Student-t intervals with explicit independent n. Technical files and
  concentrations never become additional independent repeats. Curve-wise
  kinetic concentration averages remain diagnostic-only estimates, not
  global kinetic results for routine publication summaries.
- The repeat-cluster bootstrap reports its requested, attempted, eligible
  and completed status. Percentile intervals require at least three declared
  independent repeats, 200 eligible refits, 90% successful attempted refits
  and 90% of the requested resamples attempted. The runtime limit can leave
  an interval unavailable. This numerical policy does not increase the
  number of experiments or guarantee coverage, especially with small n.
  A failed/unavailable bootstrap is never labeled as a successful one.
- Candidate AIC/AICc/BIC comparisons require the identical full set of
  selected observations. Failed/mismatched candidates are ineligible.
  Gaussian residual variance is counted as an estimated parameter for each
  independent curve likelihood; the criteria are summed over those curves.
  Weighted isotherm criteria include the fixed relative variance scales.
  Exactly zero RSS has no finite interior variance maximum and does not
  receive a manufactured finite criterion.
- Akaike weights are relative support within the candidate set, not mechanism
  probabilities. Automatic recommendations are withheld for detected serial
  correlation or a preferred boundary fit. Ordinary chi-square likelihood-
  ratio p-values were removed for these nonregular model alternatives.
- Hill affinity is labeled apparent half-saturation `C1/2`; it is not silently
  equated with a microscopic thermodynamic KD.

These distinctions follow the uncertainty assumptions in
[SciPy curve_fit](https://docs.scipy.org/doc/scipy-1.17.0/reference/generated/scipy.optimize.curve_fit.html),
the replicate definitions in [Nature's reproducibility guidance](https://www.nature.com/documents/Biological_and_technical_replicates_guidelines.pdf),
and the caution about boundary likelihood tests in
[Self and Liang (1987)](https://www.tandfonline.com/doi/abs/10.1080/01621459.1987.10478472).

## Preserved Outputs And Evidence

The approved navigation, original sample datasets, individual fits and
diagnostic panels remain. Combined and separate publication figures retain
the k_on, k_off and KD repeat-dot/error-bar panels and numerical mean +/- SD.
Included measurements without a successful fit still contribute to response
means and SD. A missing included prediction withholds the corresponding
mean model line rather than silently averaging only successful predictions.
Parameter eligibility and data-display inclusion are different decisions.

Method-specific and publication ZIPs now include scientific diagnostics:
warnings, eligibility, boundary/rank information, conditional uncertainty
definition, profile/open-limit metadata and bootstrap status. Kinetic CSV
model-error columns are named conditional model SE, not repeat SEM.
Missing/open values are valid JSON nulls with explicit open-limit flags.
The new scientific module is included in the analysis source hashes.

Reproduction:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/scientific_audit.py --coverage-repeats 500
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python scripts/preview_analysis.py
.venv/bin/python scripts/build_release.py
```

The before-hardening counterexamples and hashes remain in
`preview/scientific_audit_before_hardening/results.json`; the original code
archive is `release/MIXA_publication_preview_before_hardening.zip`.
Post-hardening evidence is `preview/scientific_audit/results.json`.
The original audit document is historical, not a new verdict on this build.

Verification completed for this build:

- 62 regression, scientific and Streamlit workflow tests passed.
- All 12 targeted audit checks passed; the original audit had 3 passes and
  9 failures. Selection bookkeeping and affinity-formula checks are separate
  from numerical optimizer-recovery tests.
- The 1,000-fit kinetic covariance stress experiment reproduced nominal
  coverage near 95% under IID noise and only 42.0%-43.6% under AR(1) noise
  with rho 0.85. This known limitation remains explicitly disclosed.
- In 500 saturated simple-isotherm simulations, the nominal 95% profile
  interval covered the true KD in 94.2% of cases. In 500 weak-saturation
  simulations, coverage was 96.8%, 94% had open upper limits, and none
  qualified for a routine affinity summary. These are seeded, conditional
  benchmarks with Monte Carlo uncertainty, not universal coverage guarantees.
- The synthetic three-repeat project retained all 9 eligible method/repeat
  fits. Both original sample files ran through kinetics, kobs and equilibrium;
  the original kinetic boundary estimate remained flagged, not relabeled
  as a well-resolved result. Regenerated separate figures were visually checked.

## Remaining Scientific Limits

Passing targeted tests is not a certification for arbitrary binding data.
Concentrations, baseline referencing, phase detection, selected windows,
control subtraction and observed-maximum normalization are treated as
conditional inputs. The zero-offset isotherm assumes appropriate baseline
referencing. Fixed-time responses are apparent affinity measurements unless
steady state is supported independently. Shared controls can correlate
repeats, and that uncertainty is not jointly propagated. kobs second-stage
covariance does not fully propagate first-stage rate-estimation uncertainty.
Independent Repeat IDs are a user declaration, not proof of independence.

The conditional IID coverage stress test intentionally remains in the audit:
strongly correlated noise still invalidates nominal covariance intervals.
Warnings expose that limitation; they do not repair its coverage.
Profile intervals, Hill inference, model choice and real instrument behavior
still need broader calibration and independent experimental benchmarks.
No optimizer success flag, R-squared, diagnostic score or small repeat SD
establishes the correct physical mechanism.
