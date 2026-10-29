# MIXA Saved-Fit Robustness Review

Local version: 0.5.10-preview. This document describes the implemented review
methods, not a claim of universal interval calibration or best-in-class status.

## Access and Preservation

In Kinetic Analysis, select **Robustness & intervals** in the standard shared-fit
results, or the equivalent tab in advanced/assisted results. The original fit,
diagnostic panels, independent-repeat statistics and equilibrium workflow remain.
Review runs are on demand; ordinary widget changes do not trigger refitting.

The review reconstructs the exact saved model, linked/fixed parameters, bounds,
weights, physical phase times and selected observations. It checks its predictions
and objective RSS against the saved fit before enabling review. Standard 1:1,
empirical delivery lag and mechanistic global fits are supported. Curve-wise
aggregate results and robust-loss sensitivity fits are not substituted for a
Gaussian global fit. Older sessions without an exact shared-fit record need a
new main fit.

## Adaptive Parameter Profiles

At each trial value of one free parameter, every remaining active nuisance
parameter is refitted within its saved bounds. Positive parameters use log
coordinates; signed parameters use scaled linear coordinates. Two starts are
attempted per point: the warm start and a broader bounded start. The search
expands on each side and refines a bracketed crossing, rather than declaring
coarse grid endpoints to be interval limits.

For the saved Gaussian objective with fixed relative noise scales and fixed OU
correlation time, profiling the unknown common residual variance gives:

```text
LR(theta) = N * log(RSS_profile(theta) / RSS_saved_minimum)
95% threshold = quantile(chi_square(df=1), 0.95)
```

These are approximate likelihood-ratio confidence limits for the connected
region surrounding the saved optimum. They are conditional on preprocessing,
concentrations, noise assumptions and the selected model. They do not integrate
the optional raw-input covariance budget, model selection or phase uncertainty.
The approximation can be unreliable near singular models or physical boundaries.
An initially bound target is not assigned a regular two-sided interval.

If a profile reaches a declared bound without crossing, that end remains open
within the allowed domain. Failed evaluations, incomplete searches or exhausted
budgets are unknown, not exclusions. If nuisance refitting finds a lower objective
than the saved optimum, both interval limits are withheld and the user is asked
to rerun the main optimization. Multiple disconnected likelihood regions are not
excluded by this connected-region procedure. Profiles target individual model
parameters; nonlinear KD intervals are provided separately by simulation refits.

Primary methodology: [Raue et al. (2009)](https://doi.org/10.1093/bioinformatics/btp358).
Binding-specific motivation for initialization and identifiability analysis:
[Nguyen et al. (2023)](https://doi.org/10.1016/j.ab.2023.115263).

## Deletion Sensitivity and Held-Out Predictions

Leave out all observations belonging to one concentration, independent Repeat
ID or curve. Refit only the remaining selected observations, keeping the model,
parameter linkages, bounds and preprocessing rules fixed. Report each surviving
parameter and derived affinity and its percentage change from the full-data fit.
Failed, incomplete and unrun deletion cases remain in the requested case table.
No deletion is automatically accepted and no percentage threshold is presented
as a calibrated significance test.

Held-out selected responses are compared with predictions only if every needed
parameter is fixed independently or estimated from the training data. A removed
curve's local Rmax, offset or drift is never borrowed from the full-data fit. If
any needed free local parameter has no training observations, that curve's
prediction is unavailable. Missing curves are not silently included in the
aggregate prediction score. Scores show the number of observations actually
scored. The exported points contain measured response, prediction and residual.

Shared controls and preprocessing can connect training and held-out traces.
This is a fixed-pipeline predictive/sensitivity check, not an independent
experimental validation or an unbiased estimate of new-laboratory prediction
error. For heterogeneous populations, raw parameter labels may exchange; ordered
lower/higher population affinities provide label-invariant comparisons.

## Nonlinear Parametric Refit Intervals

Simulate fresh measurements from the saved fitted response and refit every free
parameter with the original nominal concentrations, weights, bounds and masks.
Derived KD is recalculated in every draw using the relevant mechanism-specific
definition. Thus rate covariance and nonlinear ratio behavior are preserved
without using a first-order KD derivative.

When raw measurement propagation is enabled, each raw source is drawn once per
experiment and reused everywhere its ID occurs. Source subtraction weights,
interpolation, response sign and the finite measured-baseline median are
reapplied. IID or supplied OU noise is simulated on the actual raw time grid.
This measurement model replaces, rather than duplicates, conditional residual
noise. Otherwise, independent trace noise uses supplied fixed objective SD or
the saved residual noise estimate, including the baseline-adjusted variance
estimate when available. Relative trace scales and the fixed objective OU time
are retained. Baseline trends are centered consistently with the existing
finite-median propagation model.

Enabled concentration CVs generate median-one lognormal calibration factors:
one stock factor is shared across all files/repeats; one independent factor per
unique concentration is shared by that level across files/repeats. Curves are
simulated at the perturbed actual concentrations, then fitted at the recorded
nominal concentrations. The assumed distributions and supplied/estimated source
SDs are recorded. Noise scales and OU-time estimation uncertainty are not
integrated. These forward parametric simulations are not a Bayesian posterior or
an implementation of every procedure in JCGM 101.

When the residual noise scale is estimated from the same fit and no external
raw-source/calibration budget is enabled, automatic reporting uses a studentized
parametric bootstrap. Every refit recomputes its own local scale using the full
parameter covariance and finite-baseline propagation. Positive parameters and
affinities use log coordinates; signed parameters use linear coordinates:

```text
t_b = (g(theta_b)-g(theta_hat)) / se_g,b
CI_g = [g(theta_hat)-q_0.975(t)*se_g,hat,
        g(theta_hat)-q_0.025(t)*se_g,hat]
```

Transform log limits back to the parameter's units. KD scale uses the full
joint rate covariance, including conversion rates for the two-state overall
affinity. This local scale studentizes a fully nonlinear refit distribution;
it does not replace the refits with a delta-method interval. A base-scale fit
must first succeed. A better base optimum requires a new main fit. Limits
outside a saved parameter domain are withheld rather than clipped.

For supplied noise SDs, raw-source budgets or calibration distributions, the
automatic method instead reports central 2.5th/97.5th percentiles under those
explicit external input assumptions. The initial percentile-only benchmark is
retained under validation/refit_review_percentile_initial; one measured-baseline
IID design showed undercoverage. Studentization was introduced for the
estimated-scale case for methodological reasons, not by tuning coverage
thresholds. Its observed coverage is reported separately. Relevant primary
methodology: [Hall (1988)](https://doi.org/10.1214/aos/1176350933).

Either method requires at least 200 complete refits and at least 95% completion
of all requested draws; studentized intervals also require finite pivots for
that parameter in at least 200 and 95% of requested draws. Nonconvergence,
timeouts and unrun draws remain in the denominator. Bound estimates are retained
in draw tables, not removed to improve the intervals. If at least 5% of completed
refits reach any fitted bound or have unresolved sensitivities, routine
two-sided intervals are withheld. These are explicit conservative reporting
rules, not universal statistical thresholds. Heterogeneous raw-component
intervals are withheld because of exchangeable labels; ordered population
affinities are available. Fixed parameters have no estimated interval.

Simulation SD is the spread of fitted estimates under this model, **not**
independent-repeat sample SD. The original publication mean +/- SD panels remain
unchanged. Parametric percentile intervals can have finite-sample bias and
coverage errors; the benchmark reports their observed coverage rather than
assuming exact 95% coverage.

Relevant uncertainty-distribution framework:
[JCGM 101 (2008)](https://www.bipm.org/en/doi/10.59161/jcgm101-2008).
The exact generative assumptions and numerical implementation are stated above;
that reference is not a claim of numerical equivalence to a particular example.

## Remaining Scientific Scope

Joint repeats now implements a distinct Bayesian nonlinear 1:1 response-level
model for repeat variation, shared Gaussian reference covariance and enabled
concentration calibration. Its priors, collapsed likelihood, four-chain sampler,
diagnostic gates and credible-versus-SD definitions are documented in
JOINT_INFERENCE.md. It does not extend the hierarchy to advanced mechanisms,
arbitrary dilution covariance, phase uncertainty or model-selection-adjusted intervals. It does not
guarantee global optimization or complete identifiability. Adding the review
methods does not by itself resolve weak two-state or overlapping-population
data. Independent-repeat SD/log-t summaries remain separate. Broad experimental
SPR/BLI benchmarking and calibrated complex-model interval coverage remain
necessary before any comprehensive state-of-the-art claim.

## Experiment-Specific Calibrated Intervals

Calibrated intervals uses the same saved estimator and selected observations,
but determines its critical fit statistic by independent simulated experiments
instead of assuming a chi-square threshold:

```text
T(theta) = N*log(RSS_constrained(theta)/RSS_unrestricted)
For each simulated experiment, nuisance-refit both objectives at theta_saved
Critical value = sorted T_sim at min(ceil(confidence*(B+1)),B)
Confidence set: connected theta values with observed T(theta) <= critical value
```

Physical rates are fixed exactly during their restricted refit. Supported KD
targets use an exact equality-constrained SLSQP fit of the relevant ratio,
including the two-state overall-affinity conversion factor. All remaining
free nuisance parameters and saved bounds remain active. Exchangeable
heterogeneous labels/ordered-population constraints are not substituted with an
incorrect single-component constraint.

Noise, finite measured medians, reused control sources and enabled concentration
budgets are generated as in Nonlinear uncertainty. Calibration and observed
profile refits retain all failures and unrun draws. At least 200 complete
simulations and 95% completion are required. The report includes binomial
order-statistic Monte Carlo bounds for the estimated critical value, its seed,
search budgets and every restricted/unrestricted search. Crossing refinement
locates limits adaptively; unresolved/open limits are not finite endpoints.

This is a single plug-in parametric calibration, not a double bootstrap or an
exact confidence guarantee. With external input budgets, the statistic need
not be a Gaussian likelihood ratio: the resulting interval is a hybrid
measurement/calibration confidence set under those explicitly simulated inputs.
Noise/kernel estimation, phase/model selection and between-repeat random
effects are not integrated by this method. Joint repeats handles the supported
between-repeat model separately, with posterior credible intervals.

The methodological framework is parametric calibration/profile inversion;
[Beran (1987)](https://doi.org/10.1093/biomet/74.3.457) motivates calibration and
prepivoting, not a claim that MIXA implements that paper's iterated higher-order
procedure. A critical value is calculated from the current experiment, never
chosen to make a known-truth benchmark achieve 95% coverage.

The new study used 100 fresh outer experiments per design, disjoint from the
0.5.9 study, and 400 calibration simulations per experiment. All 300 intervals
were available. Nominal 95% KD coverage was 93% for measured-baseline IID noise
(Wilson Monte Carlo 95% range 86.3-96.6%), 94% for the fixed-OU case (87.5-97.2%),
and 94% for shared-control/common-stock inputs (87.5-97.2%). These results are
consistent with 95% within their simulation precision, not proof of exact
calibration or a paired improvement over the older different outer datasets.
All records and source hashes are in validation/frontier_calibration.

## Complex-Model Prediction Performance

The mass-action equations did not change. Sequential two-analyte capture without
transport is propagated by exact two-state matrix functions, including its
physical phase transition. Nonlinear avidity and transport ODEs use LSODA with
analytic state/concentration derivatives and the same 2e-8 relative tolerance.
The Radau path remains available for numerical comparison. There is no automatic
data thinning, lower-precision fit mode, or truth-derived free initialization.

Using the same ten designs, three datasets per design, defaults plus two broad
starts and 30-second budget, all 30 current searches completed, versus 15/30
previously. Median example runtimes were about 4.6 s for standard-density
avidity, 15.4 s for low-density avidity, 0.16-0.21 s for sequential capture and
8.1 s for two-compartment transport. The largest independent-reference curve
difference in the recorded sweep was about 3.95e-6 response units. Timings are
hardware/design specific; completed search and accurate prediction do not imply
resolved microscopic rates. See validation/frontier_performance for every
attempt, held-out prediction error and numerical accuracy record.

## Joint Residual Simulation

The Joint residual check simulates Gaussian measurement errors on each actual
time grid, reapplies finite median baselines and any enabled shared raw-control
measurement covariance, then projects out the local fitted-parameter effect:

```text
e_res_sim = (I-J*pinv(J))*e_sim
T = maximum abs(lag1 correlation)*sqrt(adjacent pairs), across curves/phases
p_MC = (1+number of simulated T >= observed T)/(B+1)
```

The simulation uses the saved objective Jacobian and its scaled full-rank
inverse, not a rank-hiding pseudoinverse of unresolved parameters. Default B is
499 with a recorded seed. Curve boundaries, phase boundaries and trimmed gaps
are not joined; phases require twenty contiguous adjacent pairs. The maximum
statistic accounts for repeated serial looks across the fitted dataset. The
0.05 tail rule replaces the older decision rule that rejected a run if any
individual descriptive lag-1 flag was present. Original per-curve flags remain
visible as descriptive diagnostics.

This conditional Monte Carlo tail fraction is not an exact omnibus
goodness-of-fit test. The effect of refitting is locally linearized; source SDs
and OU times are supplied or plug-in estimates. Concentration calibration,
uncertain phase choices and model selection are not integrated. Serial
structure can have multiple causes; the check does not identify which added
binding mechanism is appropriate. Noise-model and residual-size checks remain
separate. If prerequisites or the diagnostic budget fail, automatic analysis
does not treat the missing check as a pass.

The original assisted-comparison screen, including false rejections, is retained
under validation/assisted_comparison_initial. Current comparison evidence is
reported separately; no correlation threshold was tuned to those outcomes.

## Exports

The review can be downloaded directly and is included in subsequent analysis
and publication packages. Each profile, omission and simulation run has its own
method/seed/budget metadata, exact-problem fingerprint and CSV tables. Requested
failures and unrun cases are retained. General methods documentation includes
this file and primary references. Plots can be downloaded as PDF, SVG or PNG.

## Measured Evidence and Remaining Priorities

The current interval study used 100 independent experiments in each of three
prespecified designs, with 400 nonlinear simulation refits per experiment.
Nominal 95% KD coverage was 91% for measured-baseline IID noise (Wilson Monte
Carlo 95% range 83.8-95.2%), 95% for the fixed-OU design (88.8-97.8%), and 99%
for shared-control/common-stock input propagation (94.6-99.8%). All 100
experiments in each design produced intervals. These results do not establish
uniform 95% calibration: the IID design remains a specific possible
undercoverage concern, and the external-input design was conservative in this
sample. Both initial and current results are retained. No rule was adjusted to
force these frequencies toward 95%.

Blind advanced recovery starts were software defaults, not generating free
parameter values. All 30 requested datasets yielded a converged candidate, but
only 15 completed all three starts within the recorded 30-second budget. Thus
ODE optimization cost and broader interval calibration remain concrete work,
not resolved capabilities. Weak regimes can still fit the response well while
their individual rates remain poorly determined.

The updated assisted comparison tried all four correction combinations in
160 independent simulations. Correct qualified selections were 37/40 simple,
37/40 drift, 38/40 linear background and 39/40 drift plus linear background.
There were no unnecessary added terms in those designs; nine experiments
remained unqualified, not counted as correct selections. These counts concern
the declared model/noise scenarios, not arbitrary experimental SPR/BLI data.

The active regression/Streamlit suite passed 223 tests and the separate
equation/inference audit passed 11 checks. Such implementation checks are not
substitutes for the interval/recovery evidence above. See the machine-readable
records for seeds, failures, source comparisons and Monte Carlo uncertainty.

Reproduce the studies from this directory with:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/validate_refit_review.py --coverage-repeats 100 --draws 400 --blind-repeats 3 --blind-runtime 30
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/validate_assisted_comparison.py --repeats 40
```

The refit study's fitting/refit numerical core matches the current source. Its
record also hashes an automation import that it did not exercise; that exact
earlier helper is archived in validation/refit_review_source_capsule after the
serial decision gate was subsequently improved. The separate updated assisted
study matches all its current exercised sources. These source differences are
reported, not relabeled as identical code.

## Usability and Assisted Comparison

Dataset assignments and background choices use one compact editable table.
Select Remove and click Remove selected datasets to remove files without
refreshing the website. Removing data invalidates results; missing control
assignments must be resolved explicitly. Page changes reset the main viewport
to the top. Preview figures use SVG paths instead of enlarged raster images;
publication PNG resolution remains an independent export setting.
Manual 1:1 controls are the initial analysis view. Guided and Automatic display
only their own active controls; changing pages preserves the selected mode and
its settings. This avoids showing two different baseline-normalization controls.
Manual two-state selection uses the linked global mechanistic engine, not the
legacy curve-wise diagnostic fallback. The curve-wise functions remain for
legacy diagnostic APIs; the primary two-state workflow no longer labels a
curve-wise result as a requested global analysis.

Assisted analysis exposes baseline normalization as a fixed preprocessing
choice. Linear drift and the manual signed linear nonspecific response may be
tested separately and together. Their inclusion is not itself an assertion
about a biological background mechanism. Compare-all mode attempts the visible
permitted sequence within its budget, while retaining complexity, residual,
multistart and identifiability gates. Mechanistic alternatives and physical
transport still require explicit assay-supported permissions. The queue records
what ran and what did not; no highest-score-at-any-cost policy is used.
Compare-all recommends the fewest-parameter qualified candidate, using AICc to
break ties. A more elaborate model does not replace an already adequate simple
model merely because its residual sum of squares is smaller. Added terms must
still improve AICc sufficiently over simpler attempted models. These are
declared selection rules, not calibrated posterior model probabilities.
