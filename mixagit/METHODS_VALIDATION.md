# MIXA Methods and Validation

Methods/education record for the 0.5.8 release, updated October 20, 2026.
In-place deployment to the existing Space is authorised; hosting resources
and dependencies are unchanged. DEPLOYMENT_STATUS.md records runtime verification.

Version `0.5.8-preview` adds explicit source-aware measurement/calibration
propagation, first-stage kobs covariance and ten advanced-model noisy regimes.
See [INPUT_UNCERTAINTY.md](INPUT_UNCERTAINTY.md) and
[the new evidence](validation/input_uncertainty/RESULTS.md). The existing
conditional methods and baseline studies remain separate protocols; their
source-hash comparison is included in analysis exports.

Updated by local `0.5.7-preview`: measured-baseline covariance now propagates
through the existing kinetic estimator. See [BASELINE_UNCERTAINTY.md](BASELINE_UNCERTAINTY.md)
and [the paired repair results](validation/baseline_uncertainty/RESULTS.md).

## Scientific Purpose

MIXA fits SPR/BLI response data with explicit physical and observation models,
reports the uncertainty supported by those data and helps evaluate explanations
for systematic departures from simpler models. A better-supported complex fit
is useful evidence for hypothesis generation and experimental planning. It is
not necessary to frame this work as a search for "proof" of a mechanism.

Vendor estimates are comparators, not the answer key. Published equations,
transparent implementation, known-truth numerical checks, calibrated statistical
behavior and experimental predictive performance are distinct sources of support.
Validation is specific to a model, procedure and tested conditions, not a blanket
label on the entire platform.

## Equation and Source Registry

Methods & References, available at the top of the main workspace without data,
provides USER_GUIDE.md, a full equation/source browser, bibliography and complete
downloadable documentation bundle. The general guide explains model choice
and reporting; saved-analysis methods remain specific to the actual fitted
model, settings and enabled uncertainty components. Each analysis package
includes the guide with a content hash. No private datasets are included in
the standalone documentation bundle.

`mixa_methods.py` is the machine-readable source of truth. Each entry records:

- The actual equations and response-counting convention implemented in MIXA.
- Parameter/state units, initial-state and assay assumptions.
- Primary references with DOIs and the relationship of each reference to the
  implementation. A related paper is not claimed to be the verbatim source of
  a MIXA-specific expression or parameter convention.
- Implementation symbols and regression checks that can be verified in code.

The registry covers 1:1, two-state, discrete heterogeneous populations,
bivalent-soluble-analyte and sequential capture; both physical transport models;
empirical delivery lag and observation terms; reversible residual binding;
kobs; simple/Hill isotherms; covariance, likelihood, OU innovations, exploratory
profiles, independent-repeat statistics and conditional stoichiometry.

For example, first capture and double-attachment opening in the bivalent model
carry explicit factors of two. `kon2` has response^-1 s^-1 units and depends on
surface availability; it is not a second soluble bimolecular rate. Sequential
capture instead adds a second soluble analyte, with response x+2y and `kon2` in
M^-1 s^-1. A single generic "2:1" label would hide that difference.

The kinetics/isotherm equations derive from the stated reaction schemes and
observation rules. Numerical starting values and bounds are disclosed optimizer
controls, not universal constants taken from a publication. Empirical drift,
linear background and delivery-lag expressions are labeled as MIXA definitions.

All standard kinetic, kobs, equilibrium, cross-method and publication packages,
plus mechanistic/assisted packages, include:

- `methods/equations_and_sources.json`: applicable equations and saved settings.
- `methods/METHODS.md`: readable equations, assumptions, provenance and code links.
- `methods/REFERENCES.bib`: only the references applicable to the selected methods.
- `methods/validation_evidence.json`: bundled benchmark summary and a source-hash
  comparison. Changed fitting code makes earlier evidence historical, not current.

The existing raw-data, reference-control, point-selection, parameter,
diagnostic, independent-repeat and figure exports are retained. The methods
record supplements them; it does not replace run-specific settings or raw data.
It is generated at export from the saved model/settings and current registry;
source-matched benchmark evidence does not qualify a particular uploaded dataset
or establish which code ran an older saved analysis.

## Independent Numerical Benchmarks

`validation/reference_simulator.py` has no production prediction imports. It
propagates explicit free/occupied surface species through stoichiometric fluxes
with DOP853, whereas production uses reduced states with analytic propagation or
Radau. The quasi-steady reference calculates the surface concentration from a
flux balance instead of copying the production rate denominator.

The first benchmark assesses agreement of predictions on an irregular grid,
including nonspecific binding coupled to full transport. It then estimates all
free kinetic/capacity parameters jointly from independently simulated noiseless
multi-concentration data for each model. The two-compartment response-to-molar
calibration is fixed to its known value and explicitly recorded. Other fitted
rates are not silently fixed to make recovery work. Prediction tolerance is
2e-5 response units; joint-recovery tolerance is 2% per free parameter, with
incomplete/boundary fits counted as failures.

This checks implementation and optimization on a specified design. It does not
establish advanced-model noisy-data coverage over a broad parameter space.
Heterogeneous components are reported in their simulated ordering for this
benchmark; broader studies must handle affinity-based label switching.

## Statistical Calibration Protocol

The default run uses 200 independent synthetic experiments for each of five
predeclared conditions: standard 1:1, slow dissociation, fast association, OU
noise analyzed as IID, and the identical OU observations analyzed with the true
supplied correlation time. Noise comes from the independent simulator. Fits
use selected subintervals, with the correct physical injection history.

Reported metrics include parameter bias, relative RMSE, interval availability,
coverage conditional on availability, and covered-and-available frequency over
all requested experiments. Failed fits and unavailable intervals stay in the
denominator of the all-run metric. Wilson Monte Carlo intervals show how
precisely the simulation estimates each frequency. A 200-experiment result is
an initial calibration measurement, not exact knowledge of the coverage rate.

A withheld concentration is generated independently and never fitted or used
for selection. Clean-curve and future-noisy-trace prediction RMSE are exported.
These are predictive checks, not calibrated prediction bands.

Concentrations, phase times, baseline zero and relative weights are known in
this conditional interval study. The OU comparison supplies tau; it does not
estimate tau from the fitted data or include uncertain controls/calibration.

## Full Automated Procedure

The default run also performs 40 complete automatic analyses per scenario:

- Correct 1:1 with an unnecessary drift candidate explicitly permitted.
- 1:1 plus real linear drift, with independent support for testing drift declared.
- Correct 1:1 using MIXA's pre-association baseline normalization and estimated
  baseline noise, rather than supplying exact noise information.
- Two-state data with only 1:1/drift candidates permitted, to assess behavior
  when the candidate set omits the data-generating model.

Each analysis uses the actual default `FitPolicy`, multistarts, rate profiles,
candidate order, finite runtime, adequacy checks and stopping rules. No
qualification outcomes are mocked or replaced with an AIC-only rule. Counts
include unnecessary additions, supported drift selection, qualified simple
fits to misspecified data, no recommendation and the reasons for withholding.
No recommended model is a valid recorded outcome, not a removed observation.

Post-selection interval availability/coverage for the true 1:1/drift scenarios
is recorded separately. This evaluates the existing conditional intervals
after the full selection procedure; it does not create a selection-adjusted
interval estimator. The misspecified two-state case does not compare its first
step rates to a 1:1 fit as if they were identical estimands.

The current residual/noise, SE/value and delta-AICc thresholds are declared
policies. Their behavior is measured without tuning those thresholds to this
benchmark's results. Forty runs have wide Monte Carlo intervals; zero observed
unnecessary additions is not a demonstrated zero error rate.

### Historical Findings from 0.5.6

All seven joint-recovery cases met their declared tolerance. Nominal 95% local
KD intervals covered the generating value in 96.5% of standard IID fits and
96.0% of correctly specified fixed-OU fits, versus 49.5% when that correlated
noise was treated as IID (200 fits per analysis). The report includes all rate
parameters, Monte Carlo intervals and availability counts.

The 40-run automatic scenarios selected no unnecessary drift terms, selected
supported true drift in 39 runs, and recommended none of the permitted simple
models for the two-state data. The correctly specified simple scenario still
had three withheld fits; the descriptive serial-correlation screen is not free
of false alarms.

The estimated-baseline/noise case exposed a more important gap: KD intervals
covered the truth in only 13 of 33 qualifying fits (39.4%; 40 requested runs).
Version 0.5.6 treated that estimated baseline as fixed. This motivated the
0.5.7 repair and its paired calibration study. On the original automatic seeds,
the repair improved KD coverage to 30/33, with the same fitted values and
qualification decisions. Five further 200-experiment designs are reported in
BASELINE_UNCERTAINTY.md. Shared controls and other uncertainty sources remain
distinct from this measured-baseline repair.

The initial complete regression suite passed 155 tests. Test counts and these
specific benchmark results do not replace the more extensive calibration work
listed below.

## Education Panel

**Education: How Fitting Works** is available from the sidebar without loading
data and from the top of Kinetic Analysis. It opens an optional interactive
panel, not another required workflow step. Examples are synthetic and isolated
from analysis controls, datasets and saved results.

Topics include association/dissociation, kon/koff/KD, the objective and physical
history, residuals, fit windows, global linkage, repeat SD versus model SE and
confidence intervals, corrections, advanced models, automatic analysis,
equilibrium/kobs and the live equation/reference registry. The example windows
change only the objective mask; they do not restart the physical binding
history. The example curve is explicitly not reoptimized when sliders move.

## Reproduce and Extend

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
.venv/bin/python audits/validate_methods.py --output validation --coverage-repeats 200 --automation-repeats 40
```

Read `validation/RESULTS.md` and `validation/benchmark_summary.json`. Raw estimates,
held-out predictions, automatic-run logs and post-selection intervals accompany
the summary. Seeds, software versions and production/validation source hashes
are retained. Simulator and fitter must not share prediction functions.

The local input study adds six 200-experiment correlated-control/calibration
designs and ten ten-experiment advanced-noise designs. Its source SDs/OU times
and phase boundaries are supplied, while advanced starts are deliberately near
the generating values. Full raw estimates, held-out predictions, precision
flags, interval coverage/availability and Monte Carlo intervals are retained.
Weak conversion/overlapping populations expose broad or biased component rates
despite good curve fits. These are measured findings, not cases discarded from
the benchmark. The declared local SE/value screen is not a formal
identifiability test or an outcome-tuned coverage repair.

Next extensions are broader joint-recovery/noisy-coverage grids for each complex
model, blind initialization and realistic non-Gaussian/heteroscedastic noise;
automated searches including competing advanced mechanisms; resampling
the full selection/preprocessing procedure; uncertainty in source SD/OU-time
estimates, phase times, serial dilution and calibration batches; joint
repeat/common-source inference; and independently collected SPR/BLI datasets
with metadata for predictive and experimental-condition checks. Those data need
not agree with vendor estimates to support MIXA's methods.

Primary scientific references are in the registry and its exported BibTeX.
The experimental studies support their respective methods; the numerical and
calibration evidence for MIXA itself is the reproducible benchmark record.
