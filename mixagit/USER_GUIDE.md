# MIXA User Guide

Version: 0.5.10-preview

MIXA analyzes SPR/BLI binding responses with explicit reaction models, selected
observation intervals, reproducible preprocessing and separately defined
measurement and independent-repeat statistics. This guide describes the
workflow and reporting conventions. The accompanying equation registry gives
the exact equations, units, assumptions, implementation functions, tests and
primary references for each implemented method.

## 1. Data, Repeats and Controls

Import one or several SPR or BLI dataset files (`.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls`).
Instrument metadata preambles are skipped automatically. Wide format has a time column
(seconds, or minutes labeled `(min)` which convert automatically to seconds) and response
columns labeled with explicit units (`fM`, `pM`, `nM`, `uM`/`µM`, `mM`, `M`), bare numeric
concentrations (interpreted using the selected default unit), or reference/blank labels
(`Blank`, `Buffer`, `Ref`, `Reference`, `0 nM`). Long/tidy format supports `time_s` (or
`time`), `concentration` (with optional `unit` column or `concentration_nM`/`uM`/`pM`),
and `response` (or `signal`/`ru`/`nm`). Response remains in the imported units; kinetic
concentration is converted to `mol/L` internally.

Assign each file as `Sample`, `Negative control` or `Exclude`. An `Experiment` identifies
one binding pair/condition. Give independent experimental repeats different
`Repeat ID`s. Technical files from the same experimental preparation share a
`Repeat ID`. Neither concentrations nor technical files increase independent `n`.
Uploaded files can automatically infer `Role`, `Repeat ID`, and reference subtraction
(`Matched concentrations`, `Control 0 nM`, or `Same-file 0 nM`) from filenames and trace
headers, or you can trigger **✨ Auto-predict roles & repeats** in one click.

Dataset assignments and subtraction choices are edited in one compact dataset table,
and all trace concentrations, units, reference roles (`Sample`, `Reference (0 nM)`,
`Exclude`), and active fit inclusion flags (`Include`) across all datasets are managed in
one **Unified column & trace assignments** table without opening per-dataset dropdowns.
To remove files, check their `Remove` cells and click `Remove selected datasets`.
Remaining assignments must be applied again; results are invalidated rather
than kept attached to a changed dataset. Removing a required control does not
silently disable background subtraction.

## Saved-Fit Robustness and Nonlinear Intervals

After a shared, advanced or assisted kinetic fit, open **Robustness & intervals**.
Adaptive parameter profiles refit nuisance parameters and locate likelihood
crossings, preserving open or incomplete limits. Data influence refits after
omitting a concentration, independent repeat or curve, with held-out predictions
only when the training data determine all necessary parameters. Nonlinear
uncertainty simulates and refits the whole saved model, deriving KD separately
in every draw. Estimated-scale analyses use studentized intervals; supplied
raw-source/calibration budgets use percentile propagation under those inputs.
Enabled reused-control and calibration budgets are simulated
without duplicating residual measurement noise. Requested failures and unrun
draws remain in the denominator.

These are additional evidence, not replacements for independent-repeat SD or
the existing diagnostic panels. Conditional profile limits, parametric-refit
percentile limits, local standard uncertainty and independent-repeat SD have
different meanings. Full methods, limits and references are in
[REFIT_REVIEW.md](REFIT_REVIEW.md), included in analysis/documentation downloads.

**Calibrated intervals** simulates independent experiments at the saved fit,
refits restricted and unrestricted objectives, and estimates a target-specific
critical value. KD is constrained using its actual mechanism-specific equation.
This addresses finite-baseline and enabled calibration effects without applying
a benchmark-derived multiplier. All failed/unrun experiments remain recorded;
open or incomplete limits remain unresolved. This is plug-in parametric
calibration, not an exact or model-selection-adjusted confidence guarantee.

**Joint repeats** adds a separate Bayesian hierarchical 1:1 analysis for at least
three independent Repeat IDs. It jointly models response data, correlated
between-repeat log rates, uncertain baselines, enabled shared-control covariance
and concentration calibration. It reports population median rates/KD with
credible intervals, individual-repeat estimates, between-repeat variation and
new-repeat parameter prediction separately. Priors are editable and exported;
source-noise ratios and OU times remain specified inputs. Routine intervals
require four complete independent chains and adequate rank-normalized Rhat and
bulk/tail ESS for every nonlinear nuisance variable and each reported estimand.
Changing priors retains separate saved joint analyses for sensitivity review.
See [JOINT_INFERENCE.md](JOINT_INFERENCE.md) for equations and reporting examples.
The original independent-repeat mean +/- sample SD is not replaced.

Advanced prediction uses exact sequential propagation or LSODA with analytic
state derivatives where ODE integration is required; the physical equations,
selected observations and injection-time state history are unchanged. Completion
of a multistart search does not by itself establish parameter resolution.

Assisted fitting now permits testing the signed linear nonspecific response
used in manual fitting, alone or with drift. Automatic compare-all mode attempts
the visible permitted sequence within its budget; the original simplest-adequate
stopping policy remains available by disabling Compare all permitted candidates.
Baseline normalization is selectable but identical across candidates in one run.
The candidate queue records trials, skipped candidates and qualification issues.
The initial screen is manual 1:1; Guided and Automatic show only their own active
controls. Assistance settings persist when changing pages. Automatic serial
assessment uses a conditional simulated maximum across curves/phases, rather
than rejecting a run whenever any individual descriptive lag-1 flag is present.
The local-refitting projection and fixed-noise assumptions are explicit; this
is not an exact omnibus goodness-of-fit test.

Choose the referencing method and control group for each sample. Controls are
averaged within their declared repeat first, then equally across control repeats.
Matching-concentration and zero-concentration referencing are different choices;
use the one appropriate to the experiment. Interpolation stays within measured
control time coverage. Corrected negative responses are not clipped. Inspect the
raw/control/corrected preview before applying assignments.

Shared controls create correlated errors between the samples that use them.
The optional measurement uncertainty budget preserves those source identities
and their subtraction weights. Control transfer bias or differences in surface
chemistry are not converted automatically into random measurement noise.

## 2. Association, Dissociation and Fit Windows

Automatic phase detection proposes the injection start and buffer-switch time.
The default uses the whole association and dissociation phases. Review those
transitions and use Adjust phase starts if necessary. Optional fit trimming
restricts the association and dissociation observations independently.

Only selected observations enter the kinetic residual vector and its degrees
of freedom. The physical model still evolves from the actual phase transitions:
trimming a trace does not restart binding at the first selected observation.
Pre-association data can estimate the reference level/noise without entering the
binding objective. Saved selection flags identify every fitted observation.
Document exclusion reasons; removing points solely to improve fit quality can
bias the reported result.

## 3. Start with 1:1 Kinetics

For a soluble analyte A binding equivalent independent surface sites L:

```text
A + L <-> AL
dR/dt = kon*C*(Rmax-R) - koff*R
kobs = kon*C + koff
KD = koff/kon
```

Here C is mol/L, time is seconds, kon has units M^-1 s^-1, koff has units s^-1,
and R/Rmax are response units. Association starts from an unoccupied surface in
this model. In the absence of transport, dissociation after buffer switch follows
`R(t) = R(off)*exp(-koff*(t-off))`. KD is converted to nM for display.

Use global multi-concentration fitting for routine kinetic reporting. Link rates
only across the experiments that should share them. Link capacity only across
traces representing an appropriate common surface; separate BLI sensors may
require separate capacities. Curve-wise fits remain useful diagnostics, not a
replacement for a physically appropriate global estimate.

The fitting framework is nonlinear least squares. The mechanistic engine uses
bounded SciPy trust-region optimization, log-transformed positive parameters,
declared parameter linkage and optional multiple starts. Simple propagation can
be analytic; coupled reaction/transport systems use numerical integration.
The saved recipe records bounds, fixed parameters, starts, evaluation/runtime
limits and noise settings. A fixed value is an assumption, not an independent
estimate with zero uncertainty.

With relative noise scales s_i, the objective is the sum of squared selected
residuals divided by s_i^2. Fixed-OU GLS instead whitens residuals using the
actual measured time gaps and the supplied correlation time. Robust soft-L1
fits are sensitivity analyses: conventional Gaussian covariance, AIC and RSS
profile inference are withheld for those fits.

Primary nonlinear SPR fitting framework: [O'Shannessy et al., 1993,
Analytical Biochemistry](https://doi.org/10.1006/abio.1993.1355).
The mass-action equation follows the stated reaction scheme; particular MIXA
optimizer starting values and bounds are not constants taken from that paper.

## 4. Choosing Corrections or a More Complex Model

Start with 1:1 and inspect the actual saved model's residuals, phase-specific
bias, concentration dependence, parameter errors, boundaries and identifiability
profiles. A high R-squared alone does not establish reliable rates. A more
flexible model normally lowers residual error, so that improvement must be
weighed against parameter count, uncertainty and assay plausibility.

Guided analysis fits 1:1 first and proposes only permitted next candidates.
Automatic analysis runs a bounded permitted set under the saved policy; it
does not remove observations or enable every correction. Additions require the
declared control/baseline evidence or assay rationale. Complexity comparisons
use the same observations and compatible noise assumptions. The decision log
records attempts, qualification failures, runtime and the reason for the
recommendation or absence of a recommendation. AICc differences and heuristic
quality scores are not probabilities that a molecular explanation is correct.

**Baseline normalization** subtracts a measured pre-association reference.
It does not make every noisy baseline point identical. **Linear drift** is a
time-dependent observation term. **Linear nonspecific background** is a
concentration-scaled association ramp held constant during dissociation.
**Reversible background** is an additional kinetic population and can consume
analyte in the full transport model. These terms are not interchangeable.
Empirical terms are labeled as MIXA observation-model definitions, not attributed
to a physical equation from a paper.

**Two-state binding** uses `A + L <-> AL <-> AL*`, with equal response per bound
analyte in both states. The first-step `koff/kon` differs from overall equilibrium
affinity, `KD_overall = (koff/kon)*k_reverse/(k_forward+k_reverse)`.

**Two independent surface populations** sum two 1:1 responses with separate
rates/capacities. This discrete model is not continuous affinity-distribution
inversion. Related surface-heterogeneity methods: [Svitel et al., 2003,
Biophysical Journal](https://doi.org/10.1016/S0006-3495(03)75132-7).

**Bivalent soluble analyte** counts singly and doubly attached analyte molecules,
with response x+y but surface occupation x+2y. First capture and double-attachment
opening have explicit factors of two. Surface closure kon2 has units
response^-1 s^-1, not M^-1 s^-1. An immobilized bivalent antibody with soluble
monomeric receptor does not automatically imply this model. Relevant bivalent
estimation/identifiability work: [Nguyen et al., 2023, Analytical
Biochemistry](https://doi.org/10.1016/j.ab.2023.115263). Map parameter conventions
before comparing results from different implementations.

**Sequential capture** uses `A + L <-> AL; A + AL <-> A2L`, with response x+2y.
Both association rates are soluble bimolecular rates in M^-1 s^-1. MIXA reports
the explicitly defined stepwise affinities. This network differs from surface
closure by a single bivalent analyte. Two-state and sequential equations are
mass-action derivations of the displayed networks, not equations attributed
verbatim to an identifiability paper.

**Physical transport** models surface analyte supply/depletion and rebinding.
The quasi-steady option eliminates the surface concentration by flux balance;
the full two-compartment option evolves that concentration explicitly. Its
response-to-molar calibration is a stated fixed assumption unless independently
measured. Empirical delivery lag is a different association transient and does
not model depletion/rebinding. Primary transport foundations:
[Schuck and Minton, 1996](https://doi.org/10.1006/abio.1996.0356) and
[Myszka et al., 1998](https://doi.org/10.1016/S0006-3495(98)77549-6).

**Single-cycle kinetics (SCK)** models sequential ascending analyte injections
on a single sensorgram without intermediate surface regeneration, carrying fractional
surface occupancy `x(t)` continuously across each injection `[t_on,i, t_off,i]` and
inter-injection dissociation interval. Primary SCK foundation:
[Karlsson et al., 2006, Analytical Biochemistry](https://doi.org/10.1016/j.ab.2005.09.034).

In **Kinetic Model Selector**, MIXA evaluates global shared-parameter mechanistic
candidates (`1:1 Langmuir`, `1:1 + Quasi-Steady Transport`, `2-State Conformational
Change`, `Heterogeneous Ligand`, `Bivalent Analyte`) on the exact same observation mask
and noise assumption before computing `ΔAICc` and Akaike weights, alongside curve-wise
empirical screening diagnostics.

The complete registry gives every state equation, statistical factor,
observation rule and parameter unit for these models. Affinity names remain
model-specific; there is no invented single intrinsic avidity KD.

## 5. kobs and Off-Phase Diagnostics

Association is fitted as `B + A*(1-exp(-kobs*u))`, where u is time after injection.
The concentration regression `kobs(C)=kon*C+koff` gives a slope and intercept
under the 1:1 expectation. First-stage rate covariance propagates through
technical/repeat aggregation and the line estimator. A nearly perfect line
does not erase uncertainty in its measured input rates. KD uses the full
kon/koff covariance, not independent rate-error assumptions.

The koff-intercept off-phase overlay asks whether that rate predicts the
observed dissociation shape. A direct off-phase fit is a separate diagnostic;
its score is not the score of the intercept-predicted curve. Examine both
phase-specific residuals and the intercept error, particularly near zero.
Relevant nonideal sensorgram analysis: [O'Shannessy and Winzor, 1996,
Analytical Biochemistry](https://doi.org/10.1006/abio.1996.0167).

## 6. Equilibrium and Fixed-Time Isotherms

Responses are averaged over the five seconds ending at the selected sampling
time, within the association phase. Simple fitting uses `Rmax*C/(KD+C)`;
Hill fitting uses `Rmax*C^nH/(C_half^nH+C^nH)`. MIXA profiles capacity and
optimizes affinity in log concentration, with a conditional profile-RSS interval.
Open intervals remain open. Check attainment/flatness and concentration coverage:
an early response is a fixed-time isotherm, not established equilibrium KD.
Hill C_half is apparent half-saturation; its slope is not measured stoichiometry.
Observed-maximum normalization is not a measured saturation capacity.

## 7. Errors, SD and Confidence Intervals

These quantities answer different questions and are labeled separately:

- **Independent-repeat SD:** sample SD of separately fitted independent
  experiment estimates, with n and failed/excluded counts. For n=1, SD is
  unavailable, not zero. Compute each repeat's KD before summarizing KD.
- **Local model error:** parameter precision for one fitted dataset, under the
  saved model, windows, weights, noise assumptions and fixed inputs.
- **Combined input standard uncertainty:** optional local propagation of raw
  sample/control measurement covariance and supplied concentration uncertainty.
  Reused controls/common stock errors remain shared, not independent copies.
- **95% confidence interval:** state its construction and target. The
  across-repeat log-t interval targets a geometric mean; conditional profile,
  local Gaussian and fixed-model repeat bootstrap intervals are separate outputs.

For example, `KD = 33 +/- 5 nM (mean +/- SD, n=3 independent experiments)` is
not interchangeable with `KD = 33 nM, combined standard uncertainty u = 3 nM`
from a pooled fit. A shaded kinetic envelope is independent-repeat response SD,
not a model confidence band or a KD interval.

KD propagation retains rate covariance. The optional source-aware budget
propagates referencing/interpolation and finite-median normalization, then
uses local fitted-model sensitivities. Calibration effects are first order.
Enabled raw measurement covariance replaces, rather than duplicates, the
conditional measurement contribution. Source SDs and OU time are supplied or
plug-in estimates held fixed; their estimation uncertainty is not integrated.
Curve-wise diagnostic engines do not implement this optional budget.
Primary uncertainty foundations: [JCGM 100](https://doi.org/10.59161/JCGM100-2008E),
[JCGM 101](https://doi.org/10.59161/JCGM101-2008) and
[JCGM 102](https://doi.org/10.59161/JCGM102-2011).

Rank loss, active bounds and unresolved covariance prevent ordinary two-sided
errors. Mechanistic repeat summaries screen each parameter separately when
SE/value exceeds 1 or covariance is unavailable. Those estimates remain in the
diagnostic record; a derived affinity is assessed separately using its full
covariance. This declared precision screen is not a formal identifiability test.
Review selection counts and nuisance-refitted profiles. Relevant methodology:
[Raue et al., 2009](https://doi.org/10.1093/bioinformatics/btp358) and
[Hines et al., 2014](https://doi.org/10.1085/jgp.201311116). MIXA's bounded
exploratory RSS profiles are not a claim to reproduce either paper's complete
inference procedure. AICc foundation: [Hurvich and Tsai,
1989](https://doi.org/10.1093/biomet/76.2.297).

## 8. Publication Figures and Reporting

Choose a combined figure or standalone kinetic, kobs or isotherm output.
Parameter figures retain kon/koff/KD as appropriate, independent-repeat dots,
the explicitly chosen error definition and n. Numerical parameter results are
exported as TXT/CSV. PNG is available for raster use; PDF/SVG retain vector lines
and text. Figure-source CSVs and legends specify averaging/interpolation.

Report assay orientation/valency, concentrations and units, reference controls,
independent versus technical repeats, model/linkage, fixed parameters, selected
intervals, noise/weighting, uncertainty method and any failed/excluded estimates.
Include density/flow/shaking information when interpreting transport/avidity.
Do not replace an unresolved estimate with a zero error or a shared-fit copy
counted as an additional independent repeat.

## 9. Traceability and Citations

Each analysis package contains the original inputs/hashes, assignments,
subtraction record, processed observations, fit-selection flags, saved fit
recipe, parameter/affinity estimates, residual diagnostics, covariance metadata,
repeat statistics, figures and software/code hashes, as applicable to that method.

The `methods/` directory includes:

- `USER_GUIDE.md`: this general workflow/reporting guide.
- `METHODS.md`: equations, units, assumptions and provenance applicable to the
  saved analysis, with implementation/test references.
- `equations_and_sources.json`: machine-readable methods and run settings.
- `REFERENCES.bib`: citation-manager entries for the applicable methods.
- `validation_evidence.json`: tested protocols/results and source comparisons.

Use the saved run-specific methods to decide which references apply to a result;
the general guide does not imply that every model was used. Cite MIXA's reported
version, archive the run package and record its analysis code hashes alongside
the relevant primary method references. Published method foundations,
MIXA-specific derivations and empirical observation terms are distinguished
explicitly in the registry. A related reference is not presented as the verbatim
origin of a different equation or implementation.

## 10. Validation and Scope

The documentation bundle contains numerical/statistical benchmark reports and
source comparisons. Independent species-balance simulations check predictions,
joint parameter recovery, interval coverage, held-out concentration predictions
and the actual assisted-analysis procedure. Counts include failures and missing
intervals; simulation coverage has its own Monte Carlo uncertainty.

The current shared-control/calibration designs use known phase times, correctly
specified raw noise and local propagation. Advanced-noise screens include weak
regimes but deliberately near-truth starts and small per-regime counts. Those
results do not establish blind global recovery or universal interval coverage.
Weak conversion/overlapping populations can fit responses well while individual
rates remain poorly determined.

Model selection, detected-phase uncertainty, uncertain source-noise parameters,
arbitrary control-transfer bias, serial-dilution/calibration-batch covariance
and joint repeat/common-source inference are not fully propagated. These are
specific analysis assumptions to disclose, not grounds for substituting a vendor
estimate as the answer key. Use fitted behavior and diagnostics to guide further
scientific decisions and experimental tests.
