# MIXA Scientific Audit And Simplest-First Automation Assessment

Historical before-repair snapshot. The local `0.5.5-preview` implementation
and remaining limits are documented in [ASSISTED_FITTING.md](/Users/daryl/Documents/4/codex/mixa/ASSISTED_FITTING.md).
Original numeric evidence is preserved in
`preview/scientific_audit_2026-10-19/results_before_repairs.json`; the current
`results.json` is the rerun after repairs. Source line references below describe
the audited pre-repair layout.

Date: 2026-10-19. Audited local application: `0.5.4-preview`.

## Verdict And Scope

The core binding equations are consistent with their stated reaction schemes,
and the new numerical reference checks passed. That does not establish the
correct mechanism for an experiment or make every returned rate scientifically
reportable. Four reproducible safeguards still need repair, two of them high
priority. I would not enable unattended, publication-qualified model selection
until those are addressed.

This audit examined the active `mixa_app.py` workflow, mechanistic engine,
equilibrium and kobs analysis, observation selection, preprocessing, diagnostics,
and parameter/repeat reporting. The rejected `mixa_ui.py` is not the active UI.
This is a source/numerical audit, not vendor certification, an independent
instrument benchmark, or validation of arbitrary receptor-dimer mechanisms.

Only this report and a standalone audit script were added. Application fitting
behavior, UI, figures and the live Hugging Face Space were not changed by this
audit. Source hashes before and after the numerical audit are identical.

## Prioritized Findings

### P1-01: A Structurally Unidentifiable Curve Can Report Spurious Precision

Locations: [mixa_app.py:1170](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:1170),
[mixa_app.py:1773](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:1773),
[mixa_app.py:1816](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:1816).

The independent-curve fitter treats an entirely finite `curve_fit` covariance
as sufficient to report standard errors. It does not establish that the
selected data identify the parameters. A bounded solver can return a finite
pseudoinverse covariance even for a rank-deficient problem, as described in the
[SciPy 1.17 documentation](https://docs.scipy.org/doc/scipy-1.17.0/reference/generated/scipy.optimize.curve_fit.html).

Actual optimizer reproduction: one concentration, 50 nM; association starts at
10 s; observations end at 90 s, before dissociation at 100 s; unknown Rmax;
seeded independent noise SD 0.03 response units. True kon = 120,000, koff =
0.012 and Rmax = 100, hence KD = 100 nM. The fit returns KD = **2.345 nM**, an
R-squared of **0.999978**, kon = 343,693.3 and kon SE = **0.00000313**. It marks
the curve `summary_eligible=True`, with no active bound.

This is structurally unidentifiable, not merely a difficult noisy example:

```text
R(t) = amplitude * (1 - exp(-kobs * (t - on)))
kobs = kon*C + koff
amplitude = Rmax*kon*C/kobs
```

At one concentration, these association observations identify only amplitude
and kobs, not three independent quantities kon, koff and Rmax. Parameter sets
`(120000, 0.012, 100)` and `(90000, 0.0135, 133.3333)` produce identical clean
traces to 7.1e-15 response units.

Impact is specifically the independent-curve precision/eligibility path,
including its reuse by the optional selector. Its aggregate concentration
averages are already labeled diagnostic-only, so this is not evidence that
every global publication estimate suffers the same defect. The newer
mechanistic engine has scaled sensitivity checks, but finite numerical rank
alone is still not proof of practical or structural identifiability.

Required repair: combine design-aware identifiability checks, scaled parameter
sensitivities and nuisance-reoptimized profiles. Withhold unresolved intrinsic
rates/affinity uncertainty; retain estimable quantities such as kobs. Do not
blanket-reject association-only experiments: multiple concentrations with
appropriately shared parameters or independently known capacity can provide
additional identifying information.

### P1-02: Cross-Method Advice Can Approve Ineligible Results

Locations: [mixa_app.py:4853](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:4853),
[mixa_app.py:4901](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:4901).

The recommendation is driven by heuristic quality and agreement scores. It
does not enforce the methods' summary eligibility, boundary or identifiability
flags. An equilibrium-flatness warning is appended without necessarily blocking
the reporting recommendation.

A controlled bookkeeping reproduction supplies matching 33 nM estimates and
high scores, but explicitly marks all methods ineligible, kinetics bound-limited,
and equilibrium unresolved/not reached. The report still says **"Proceed with
reporting using both methods and include diagnostics."** This uses injected
result objects to isolate the gate; it is not an optimizer benchmark or an
estimate of how often real data trigger the issue.

Required repair: make qualification failures non-overridable by agreement or
quality scores. Compare like-defined affinity quantities only. Agreement between
analyses of the same data is not independent experimental validation, and Hill
half-saturation is not automatically the same quantity as intrinsic 1:1 KD.

### P2-03: Automatic Phase Detection Is Not Polarity-Safe

Locations: [mixa_app.py:4771](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:4771),
[mixa_app.py:4818](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:4818),
[mixa_app.py:4830](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:4830).

Association detection uses absolute departure from baseline, but dissociation
detection uses the maximum signed response. For an otherwise identical exact
1:1 trace with physical on/off at 20/100 s, positive data produce 21/99 s;
inverted data produce **21/80 s**. The latter substitutes the fallback off-time
while still labeling the result auto-detected. The advanced polarity control
acts later and does not repair the previously chosen times.

The detector also uses the first file, not independent phase validation for
every loaded file. A shared time origin must therefore be justified rather
than assumed for unrelated injections.

Required repair: use injection metadata when available, handle polarity before
detection, validate per-file transitions/alignment, distinguish fallbacks from
detections, and require review for ambiguous phases. Do not compensate for a
wrong phase boundary by adding drift or a complex binding mechanism.

### P2-04: The Existing Drift Rule Does Not Penalize Complexity

Location: [mixa_app.py:2411](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:2411).

When the user enables drift, the shared fitter tries drift/no-drift candidates.
It can accept drift for an RSS reduction exceeding 0.2%, provided its heuristic
metrics do not worsen. That is not a minimal-complexity selection rule. Drift
is not enabled automatically by default; this finding concerns the opt-in
acceptance rule, not an existing fully automatic pipeline.

A controlled candidate-level test uses 2,400 identical selected observations,
RSS 100 with five mean parameters versus RSS 99.7 with twenty. The rule accepts
drift. Under the same IID Gaussian likelihood and estimated variance convention,
the drift candidate has AICc **23.14 higher**, despite its 0.3% lower RSS.
These injected residuals isolate the rule; they do not quantify false-positive
rates or establish a universal AICc cutoff.

Required repair: use a prespecified comparable likelihood/complexity policy,
control or baseline support, parameter identification and, where feasible,
held-out predictive performance. RSS reduction alone must not authorize a
correction or a mechanistic conclusion.

## Equations And Statistics That Passed

The following are verified for the stated assumptions and tested cases, not
assertions that the corresponding parameters can always be estimated.

| Area | Examination and result |
| --- | --- |
| 1:1 Langmuir | `dR/dt = kon*C*(Rmax-R) - koff*R`; closed form agrees with separately integrated occupancy equations. `kobs = kon*C + koff` applies to this ideal scheme, not arbitrary multistep kinetics. |
| Two-state | `A+B <-> AB <-> AB*`; signal is AB + AB*. Independent three-species matrix exponentials agree across 60 seeded rate/concentration cases. Overall KD is `(koff/kon)*k_reverse/(k_forward+k_reverse)`, not merely koff/kon. |
| Heterogeneous surface | Two independent 1:1 populations, summed response and separately defined population affinities. |
| Bivalent analyte | Free sites are `Rmax-x-2*y`; signal is `x+y`, not `x+2*y`. The second arm occupies another site without adding another analyte molecule. Per-arm rate conventions and response-unit-dependent second association are explicit; no overall avidity KD is fabricated. |
| Sequential binding | `A+L <-> AL; A+AL <-> A2L`; response is `x+2*y`. This is not automatically a general model of receptor dimerization in either assay orientation. |
| Physical transport | Quasi-steady 1:1 and full two-compartment predictions agree with separate occupancy/surface-pool integration. The full reference includes reversible nonspecific consumption and dissociation-phase rebinding. Response-to-concentration calibration remains a supplied assumption. |
| Empirical delivery lag | Explicitly a concentration-delivery approximation, separate from physical depletion/rebinding transport. It must not establish intrinsic transport-corrected rates by itself. |
| Selected observations | Physical binding history is propagated through injection boundaries independently of which observations enter the residual objective. Exact selection and excluded-data invariance are regression-tested. |
| Additive observation terms | Offset, drift, bulk response and empirical concentration-dependent linear signal are distinct from a reversible binding population. They are not silently treated as analyte-consuming transport sinks. |
| Fixed-OU GLS | Whitening and the log-determinant agree with an explicit covariance-matrix calculation on irregular times with a selection gap. Tau and relative trace scales are supplied, not validated by this agreement. |
| Gaussian information criteria | Selected-data RSS, estimated residual variance and declared fitted parameter counts are used; fixed weight/correlation determinants are included. Robust sensitivity fits withhold Gaussian criteria and conventional covariance. |
| Equilibrium | Saturated simple and Hill synthetic series recover KD/half-saturation 33 nM and Rmax 100; the Hill case recovers coefficient 1.4. Profile/open-limit checks avoid manufacturing a bounded interval from weak saturation. |
| Independent repeats | KD estimates 28, 33 and 38 nM produce arithmetic mean 33, sample SD 5, SEM 5/sqrt(3), n=3. A single repeat has missing SD, not zero. Log-t intervals target the geometric mean and are separately labeled. |

The five reaction-scheme reference comparisons have maximum response error
below 1.7e-7 units. The two-state matrix-exponential sweep has maximum error
1.5e-11 units. The two transport reference cases have maximum response error
below 3.7e-8 units. These establish implementation agreement in those cases,
not parameter-recovery accuracy across the full parameter space.

Cytiva's [model definitions](https://cdn.cytivalifesciences.com/api/public/content/digi-33042-pdf)
support starting with 1:1, distinguishing second-arm occupancy from added mass,
and not treating a two-state fit as direct proof of conformational change.
The [Sartorius analysis guide](https://www.sartorius.com/download/1176988/octet-spr-analysis-user-guide-en-sartorius-pdf-data.pdf)
also cautions against explaining artifacts by increasingly complex models.
The numerical tests here are MIXA-specific; those documents do not validate
MIXA or guarantee matching vendor parameter conventions.

## Remaining Scientific Limits

- Conditional fit SE is not independent-repeat SD or a guarantee of interval
  coverage. Serially correlated measurements can substantially overstate
  information under an IID likelihood; a warning alone does not correct it.
- Shared controls, baseline estimates, concentrations, detected phases, chosen
  windows and response normalization are treated conditionally. Their errors
  are not jointly propagated. Repeats sharing a control can be correlated.
- kobs regression has conditional second-stage uncertainty; it does not fully
  propagate first-stage association-rate uncertainty. Two concentrations can
  define a line without establishing its mechanistic adequacy.
- Equilibrium flatness is heuristic, not proof of equilibrium. A zero-offset
  isotherm requires justified referencing; Hill half-saturation is apparent
  affinity unless a stronger interpretation is independently supported.
- A finite exploratory profile grid can flag instability but cannot certify
  that all relevant minima or confidence-region endpoints were found.
- Complex mechanisms may be indistinguishable for a given concentration/time
  design. Surface density, flow/shaking changes, orientation, valency and
  independent controls are important evidence, especially for avidity and
  transport. No experimental instrument/vendor validation was performed here.
- Refit-winner uncertainty excludes model-search uncertainty. Repeat SD after
  excluding failed/ineligible fits is conditional on that selection; retain
  declared n, eligible n and the reasons for every exclusion.

## Existing Automation Versus Proposed Workflow

There is limited assistance already, not the full workflow requested:

- [evaluate_kinetic_model_candidates](/Users/daryl/Documents/4/codex/mixa/mixa_app.py:3451)
  is manually run and compares only 1:1, empirical delivery lag and two-state.
  It uses independent-curve fits on up to 18 curves/360 points per curve,
  rather than evaluating the complete saved global mechanistic fit. It now
  requires identical observation sets and withholds some unsafe recommendations.
- The opt-in shared drift comparison exists, but has the P2-04 rule above.
- There is no complete conservative ladder through referencing, justified
  nuisance terms and assay-appropriate advanced mechanisms with validated
  stopping/qualification decisions.

Recommended interface: keep all existing kinetic controls and diagnostics, add
**Guided** as the default assistant and **Automatic, conservative** as an opt-in.
Both use one common engine; guided mode asks before each proposed addition,
whereas automatic mode tries only the explicitly allowed candidate set within
a declared time budget. Neither changes fit windows or discards data to win.

1. Validate controls/repeat assignments, concentrations, polarity, phase
   boundaries, time alignment and the identifiable quantities for the design.
   Apply declared referencing once, not whichever subtraction gives best fit.
2. Fit global 1:1 first, with physically justified shared/local capacities and
   no optional correction terms. Retain the exact observations and physical
   phase history for every later comparison.
3. Evaluate the actual global fit: convergence/multistart stability, active
   bounds, parameter profiles, association/dissociation residual bias and
   correlation, and residual size relative to independently estimated noise.
   Do not use R-squared or a heuristic score as the acceptance target.
4. Suggest a targeted nuisance term only when its source is supported. Examples
   are drift visible in baseline/control data, a justified bulk step, or a
   negative-control-constrained background population. A bad residual pattern
   is a reason to investigate, not evidence naming a unique mechanism.
5. Compare candidates using the same response observations, masks and declared
   likelihood, counting all global/local nuisance and estimated noise
   parameters. Prefer a simpler adequately supported model under a
   prespecified rule. AICc support is not proof of biology or a calibrated
   probability that the selected mechanism is true.
6. Offer transport, heterogeneity, two-state, sequential or bivalent models
   only when the assay geometry and independent evidence permit them. Do not
   assume the same mechanism applies when antibody/receptor immobilization is
   reversed, or infer a ligand-induced dimer interface from a curve alone.
7. Where data permit, assess whole-curve/independent-repeat or blocked-time
   held-out prediction. Randomly splitting adjacent correlated time points is
   not independent validation. Do not adjust a noise model merely to conceal
   mechanistic residual structure.
8. Stop with the simplest adequate, identifiable candidate, or explicitly
   return **no adequate model**, **ambiguous models** or **insufficient data**.
   A boundary optimum or poor identification cannot be repaired by a high
   agreement score. Never promise to fit every dataset successfully.
9. Save the full attempt history, evidence for each addition, exact observations,
   likelihood/scopes, parameter uncertainty, data/source hashes and all
   qualification failures. Keep uncertainty conditional on selection explicit;
   a resampling assessment of the full automated procedure must repeat the
   selection step and preserve experiment/control dependencies.

This is an automation design recommendation, not a feature implemented by the
audit. The prerequisite is to repair and regression-test the four findings,
then benchmark the common decision engine on known-noise simulations and
independent, representative SPR/BLI datasets without rebuilding the UI.

## Evidence And Reproduction

The ordinary suite passes **121 tests**. The new audit has **7 passing
verification groups and 4 failing safeguard cases**. This is not a random sample
of experiments and should not be interpreted as a failure rate. The association
precision and phase tests use actual model/fit functions. Cross-method and drift
decision tests explicitly inject result objects to isolate those decision rules.

[Standalone audit](/Users/daryl/Documents/4/codex/mixa/audits/review_20261019.py)
and [numeric evidence with source hashes](/Users/daryl/Documents/4/codex/mixa/preview/scientific_audit_2026-10-19/results.json).

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python audits/review_20261019.py
```

The standalone audit intentionally exits 1 while its four safeguard cases
fail. That is a scientific audit result, not an app startup failure. Evidence
is regenerated under `preview/scientific_audit_2026-10-19/`. Historical October
16 audit/hardening documents describe earlier snapshots, not this verdict.
