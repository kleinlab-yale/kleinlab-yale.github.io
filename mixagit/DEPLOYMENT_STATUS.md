# MIXA Testing Deployment

## Verified Live 0.5.10 Release

Deployed in place and smoke-tested on 2026-10-21:

- Version: `0.5.10-preview`.
- Commit: `7c781f1fce575fcd20345b5129279afee2cc0a23`.
- The runtime is RUNNING at that exact revision; Streamlit health returns ok.
- All 163 staged release paths match the published resolved bytes. The commit
  changes exactly 108 reviewed paths plus the Hub's three exact-path LFS rules
  in .gitattributes for large validation records.
- The original examples, entrypoint, requirements, Streamlit config, Dockerfile,
  runtime.txt, Python 3.11 and Streamlit 1.54.0 are unchanged. CPU Basic with
  one replica is retained; no hardware or billing changes were made.
- Hosted checks loaded both original examples, applied dataset assignments,
  rendered corrected-data previews, ran default kinetic, kobs and equilibrium
  analyses, and exercised saved-fit diagnostics and the new interval-review
  entry points. Methods & References opens before data loading.
- Source and methods archives, including the LFS bytes, match the reviewed
  hashes. PDF/SVG/PNG and analysis-package controls render. Long calibrated
  refits and joint chains retain their source-matched local validation; they
  were not rerun as part of this hosted smoke session.

Original-example timing/boundary, residual-correlation and equilibrium-attainment
warnings remain visible. Hosted smoke execution does not qualify those example
estimates for reporting. The release gate remains 254 tests and 11 scientific
audit checks; 20 documentation/methods tests passed again after the release-note
and download-link edits, with no numerical code changes.

The immutable staged release is `release/hf-release-0.5.10-20261021/`.
The receipt is `release/deployments/MIXA_0.5.10_20261021.json`; screenshots are
beside it. The complete-history bundle and resolved-file rollback snapshot are
retained under `release/backups/MIXA_before_0.5.10_20261021*`.
This verification note was added locally after publication; it does not modify
or restart the verified deployed revision or its immutable source archive.

## Authorised 0.5.10 In-Place Release

On 2026-10-21 the user requested updating the existing
`Ewaldssphere/MIXA_beta0.3` Space to the reviewed `0.5.10-preview` build.
This authorisation covers the tested 0.5.9/0.5.10 work below and associated
methods, validation evidence and downloads. No hardware, billing, dependency,
entrypoint, Python/Streamlit configuration or original sample changes are made.

Before upload, the live Space was verified RUNNING at
`728a0f21131e3ac327944c928f77ed0cf8045dc7`, on CPU Basic with one replica.
A complete-history mirror and verified Git bundle are retained at
`release/backups/MIXA_before_0.5.10_20261021.git` and
`release/backups/MIXA_before_0.5.10_20261021.bundle`.
The resolved-file snapshot and deployment receipt under release/ record the
reviewed file hashes, new commit, actual running revision and hosted checks.
Preparing or uploading files alone does not confirm a running deployment.

Release gate: 254 passing tests, 11 separate scientific audit checks and the
source-matched studies in FRONTIER_VALIDATION.md. Numerical inference code
is unchanged from the verified local build. The README and download links
are updated for this release; all historical notes below retain their dates.

## Local 0.5.10 Work

The local 0.5.10-preview adds experiment-specific bootstrap calibration,
faster advanced prediction and a separate joint nonlinear 1:1 repeat/reference/
calibration analysis. No live upload, dependency, hardware or billing change
was made. The existing 8524 preview was left untouched; the new isolated local
preview uses 127.0.0.1:8525. The verified live 0.5.8 revision below is unchanged.

Current inference-source/output hashes were verified for the four new studies.
The KD calibration study completed all 120,000 simulated restricted/unrestricted
refit pairs and produced 300/300 intervals, with 93%, 94%, 94% nominal-95% coverage
under the three recorded designs. All 30 advanced three-start searches completed
within the same 30-second budget, versus 15/30 previously. The largest recorded
independent-reference curve discrepancy was about 3.95e-6 response units.

The final joint study passed all nonlinear nuisance diagnostic gates on 10/10
fixed-population datasets (40 independent chains), and the prior-generated
screen passed on 12/12 datasets (48 chains), including the initially difficult
low-noise case. The actual coverage/ranks, prior families and finite-count
limitations are retained in FRONTIER_VALIDATION.md and raw study records.
Initial slow-mixing and preconditioner studies remain separately labeled;
the likelihood/prior model and convergence thresholds were not changed to
force those checks to pass. Joint inference is initially 1:1, not an advanced
mechanism hierarchy. Source SD ratios/OU times and phase/model choice remain
explicit scope assumptions.

Existing equilibrium, diagnostics, exact selections and independent-repeat
mean +/- sample SD outputs are preserved. New population/curve credible and
predictive outputs are separately labeled. JOINT_INFERENCE.md, REFIT_REVIEW.md,
the equation registry and downloadable source/evidence package document the
methods and conditional assumptions.

Verification: 254 active tests passed. The separate current-source scientific
equation/inference audit passed 11 checks. The curated source and documentation
archives are release/MIXA_0.5.10_source.zip and
release/MIXA_0.5.10_methods_documentation.zip; they are local artifacts, not
published Hugging Face downloads.

## Local 0.5.9 Work

The 0.5.9-preview source adds saved-objective robustness review, compact dataset
assignment/removal, top-of-page navigation, vector previews and expanded
assisted correction comparison. This work has not been deployed. The verified
live release and immutable backups below remain unchanged. See REFIT_REVIEW.md
and validation/refit_review for method definitions and new benchmark scope.

Local verification: 223 active tests passed; the separate equation/inference
audit passed 11 checks. The nonlinear study requested 300 independent datasets
and 400 simulation refits each; KD coverage was 91%, 95% and 99% across the three
recorded designs. Thirty blind advanced datasets yielded converged candidates,
but only 15 completed all three starts within 30 seconds. The updated automatic
comparison selected the correct correction set in 151/160 experiments with no
unnecessary terms; nine remained unqualified. These limits are retained in the
reports. This update is not declared a comprehensively calibrated frontier
release, and has not been uploaded to replace the live Space.

## Verified Live 0.5.8 Release

Deployed and smoke-tested on 2026-10-20 in the existing Space:

- Application: `0.5.8-preview`.
- Commit: `728a0f21131e3ac327944c928f77ed0cf8045dc7`.
- The runtime is RUNNING at that exact revision and Streamlit health returns ok.
- All 79 reviewed paths match the staged hashes. The commit contains exactly
  the 40 authorised changed/new paths. Both new ZIP archives were downloaded
  from the published revision and verified, including their LFS content.
- CPU Basic, one replica, Python 3.11, Streamlit 1.54.0, requirements,
  configuration, entrypoint and original sample files are unchanged.
- Hosted checks loaded both original examples, rendered shared kinetic results,
  saved-fit diagnostics, kobs association curves and equilibrium results, and
  downloaded a valid publication PDF. Existing timing/boundary warnings remain
  visible; the checks do not qualify those particular example estimates.
- Methods & References opens before data are loaded. Its guide download matches
  the reviewed file. The hosted documentation ZIP passes integrity/manifest
  checks and includes all three source-matched benchmark records.
- A fresh synthetic three-repeat session exercised matched controls, the raw
  measurement budget plus 3% common-stock standard uncertainty, a qualified
  simplest-first 1:1 fit, independent-repeat refits and the complete download.
- The downloaded 49-file analysis package retains kon/koff/KD panels and
  mean +/- SD with n=3, all 30 raw-source identities, full parameter covariance,
  separated conditional covariance, run-specific guide/equations/references,
  diagnostics, original data and hashes matching the published analysis source.
  Exported selection flags match all 2,415 objective observations; baseline-only
  points and excluded traces are absent from that objective.

The immutable published package remains under
`release/hf-release-0.5.8-20261020/`. The receipt is
`release/deployments/MIXA_0.5.8_20261020.json`; the hosted example and screenshots
are beside it. The pre-release bundle and resolved-file snapshot are retained
for rollback. This verification note is local and was added after publication;
it does not restart or modify the verified deployed revision.

## Authorised 0.5.8 In-Place Release

On 2026-10-20 the user explicitly requested publishing the reviewed 0.5.8 build
to the existing `Ewaldssphere/MIXA_beta0.3` Space. This supersedes the local-only
restriction below for this release, not for future unreviewed changes.

Before upload the Space was confirmed RUNNING at
`f58bd2464dc72a5e00480dbe101bad0c3f37ad69`, on CPU Basic with one replica.
The release retains the URL, Python 3.11, Streamlit 1.54.0, requirements,
configuration, entrypoint and both original sample files. No hardware or billing
change is authorised or requested.

The release gate passed 197 tests and 11 targeted scientific audit checks.
The three scientific benchmark records, audit sources and raw evidence hashes
match the current fitting sources. The release includes the retained diagnostic
workflow, source-aware uncertainty reporting, optional methods/education panels
and complete downloadable documentation, source and tests.

Recoverable snapshots of the previous live revision are retained as:

```text
release/backups/MIXA_before_0.5.8_20261020.git
release/backups/MIXA_before_0.5.8_20261020.bundle
release/backups/MIXA_before_0.5.8_20261020_resolved.zip
```

The release receipt under release/deployments/ records the uploaded file hashes,
new commit, actual running revision, unchanged resources and hosted smoke checks.
An upload alone is not confirmation of a successful running release.

## Historical Local 0.5.8 Update

`0.5.8-preview` is local only. The existing live Space remains at verified
`0.5.7-preview`, commit `f58bd2464dc72a5e00480dbe101bad0c3f37ad69`.
No upload, hosting configuration, dependency, hardware or billing change was made.

The local update adds raw shared-control and supplied concentration uncertainty
propagation, first-stage kobs error propagation, advanced noisy-model evidence
and explicit per-parameter local precision screens. It retains the established
workflow, diagnostics, exact fit selections and kon/koff/KD publication panels.
See INPUT_UNCERTAINTY.md for equations, reporting definitions and remaining scope.
The local preview uses port 8523; existing preview sessions are not reset.
The curated local source archive is `release/MIXA_0.5.8_source.zip`.
The verified 0.5.7 release and its rollback snapshots remain unchanged.

Methods & References opens a user guide before upload, with Markdown, BibTeX
and a self-contained documentation ZIP. The guide is also included in each
analysis export beside its run-specific methods/citations. USER_GUIDE.md and
the new documentation module/tests are part of the curated next-release package.

## Verified Live 0.5.7 Release

Deployed and smoke-tested on 2026-10-20 in the existing Space:

- Application version: `0.5.7-preview`.
- Commit: `f58bd2464dc72a5e00480dbe101bad0c3f37ad69`.
- Runtime: RUNNING at that exact revision; Streamlit health returned `ok`.
- All 65 uploaded paths matched the reviewed staged hashes, including the
  downloaded source ZIP. Original examples, entrypoint, requirements and
  Streamlit configuration were unchanged. CPU Basic and one replica were retained.
- Hosted checks loaded both original examples, exercised standard kinetic,
  kobs and equilibrium results, saved-fit diagnostics and the Education dialog,
  and downloaded a valid equilibrium PDF.
- A separate three-repeat synthetic session exercised selectable subtraction,
  matched controls, automatic full-phase selection, a qualified simplest-first
  1:1 fit, independent-repeat refits and complete publication ZIP generation.
- The downloaded 45-file publication package passed its ZIP integrity check.
  It retained kon/koff/KD panels and mean +/- SD with n=3, baseline-propagation
  metadata, decision log, data, diagnostics, references and source-matched
  validation evidence. Its recorded application hashes matched the reviewed source.

The original examples triggered injection-alignment, boundary and nonattainment
warnings where appropriate; these smoke checks do not endorse their estimates.
Shared-control/concentration/phase/model-selection uncertainty, kobs first-stage
uncertainty propagation and broader advanced-model noise coverage remain explicit
scientific scope items, not claimed repairs in this release. Existing saved fits
must be rerun to obtain the corrected baseline-aware errors.

The immutable staged package remains in `release/hf-release-0.5.7-20261020/`.
The machine-readable receipt is `release/deployments/MIXA_0.5.7_20261020.json`.
Rollback snapshots are listed below. This post-upload status note is local;
it does not modify or restart the verified deployed runtime.

## Authorised 0.5.7 In-Place Release

On 2026-10-20 the user authorised publishing the reviewed current build to the
existing `Ewaldssphere/MIXA_beta0.3` Space. This approval supersedes the local-only
restrictions below for this release, not for future unreviewed changes.

The release combines the retained 0.5.4 diagnostic workflow, simplest-first
assisted fitting, the optional Education panel, equation/source exports and
the measured-baseline uncertainty repair. There is no new frontend redesign.
The release gate rerun passed 167 tests. The recorded scientific studies are
source-matched; their specific designs and statistical limits are reported in
METHODS_VALIDATION.md, BASELINE_UNCERTAINTY.md and validation/RESULTS.md.

Before upload, the live Space was confirmed RUNNING at
`0e1fcb325e7026c8d54ce0fa44289f2c4f67c214`, using CPU Basic and one replica.
The in-place release preserves the Space URL, Python 3.11, Streamlit 1.54.0,
requirements, configuration and both original sample files. No hardware or
billing changes are authorised or requested.

A repository mirror and verified complete-history Git bundle are retained as:

```text
release/backups/MIXA_before_0.5.7_20261020.git
release/backups/MIXA_before_0.5.7_20261020.bundle
```

An additional resolved-file snapshot preserves the current files including LFS
content. The curated deployment package excludes private uploads, credentials,
environments and generated user results. The release receipt under
release/deployments/ records the new commit, remote file hashes, exact running
revision, unchanged hardware and actual hosted smoke checks. Submission alone
does not establish successful deployment.

## Historical Local-Only Work

The following notes record the status before the 0.5.7 deployment approval.

## Local 0.5.7 Baseline Uncertainty Repair

Kinetic parameter errors now propagate measured-reference uncertainty, including
kon/koff covariance when deriving KD. Point estimates, masks, objectives, controls
and decision thresholds are unchanged. The change covers standard shared,
individual and mechanistic/assisted kinetic engines; previous saved fits must be
rerun. See BASELINE_UNCERTAINTY.md and validation/baseline_uncertainty/RESULTS.md.
No live upload, commit, dependency, hardware or billing change was made.
Verified: 167 tests, 11 targeted audit checks, seven joint-recovery cases,
five paired 200-experiment reference studies and the original automatic seeds.
The updated local preview is on port 8522; prior preview sessions were not reset.

## Local 0.5.6 Methods and Education Update

The equation/source registry, independent simulator/benchmark evidence and
optional fitting Education panel are local only. Existing fitting equations,
thresholds, dependencies, data and figure layouts are unchanged. No Hugging Face
upload, commit, hardware or billing change was made. The methods package reports
both passing recovery checks and the measured interval-undercoverage finding
after estimated-baseline preprocessing; it is not a blanket qualification.
See METHODS_VALIDATION.md and validation/RESULTS.md.

## Local 0.5.5 Assisted Fitting Preview

The October 19 scientific safeguards and fitting assistant are local only.
This task does not upload, commit or change Hugging Face hardware, replicas,
dependencies or the live Space. See ASSISTED_FITTING.md for the decision policy
and validation. The previous testing release is retained below.

## Authorised 0.5.4 Diagnostic Release

The user authorised publishing the reviewed diagnostic-panel update on
2026-10-16 as `0.5.4-preview`. It evaluates the actual saved model in both
kinetic engines, adds phase/curve review and retains the supplementary original
dashboards. See `DIAGNOSTICS_REVIEW.md`. This release preserves the existing
Space, CPU Basic hardware, one replica, Python 3.11, Streamlit 1.54.0,
dependencies, configuration and original sample data. The reviewed changes
passed all 121 regression tests and final targeted UI checks.

Before upload the live Space was confirmed RUNNING at
`50e631e6ae6d78fad558c4ac9bc34c76a2228637`. A complete repository mirror and
recoverable Git bundle were saved as:

```text
release/backups/MIXA_before_0.5.4_testing_20261016.git
release/backups/MIXA_before_0.5.4_testing_20261016.bundle
```

The release is not considered verified until the new runtime revision is
RUNNING and hosted smoke checks exercise sample loading, saved-fit diagnostics,
trace inspection and the retained analysis workflow. The resulting commit,
hash verification and smoke checks are recorded in a separate release receipt.
This authorisation does not extend to future unreviewed changes.

## Previously Verified 0.5.3 Release

Verified on 2026-10-16 after the authorised upload:

- Live testing version: `0.5.3-preview`.
- Commit: `50e631e6ae6d78fad558c4ac9bc34c76a2228637`.
- Runtime: RUNNING at that exact revision; Streamlit health endpoint returned ok.
- Hardware: CPU Basic, one replica, unchanged; no paid upgrade was requested.
- All 18 uploaded files matched the staged hashes, including a downloaded
  verification of the LFS source ZIP. Original data, dependencies and config
  were confirmed unchanged.
- Hosted smoke checks loaded both original sample files, verified the simple
  Langmuir/off-background defaults, rendered kinetic results and diagnostic
  controls, ran equilibrium analysis, downloaded a valid PDF, and opened the
  six-model menu and advanced bivalent/shared-background controls.
- The sample kinetic fit displayed a boundary warning and the fixed-time
  isotherm displayed nonattainment. These are functional checks, not claims
  that these particular sample estimates are resolved or at equilibrium.

The immutable uploaded package and manifest remain under
`release/hf-testing-0.5.3-20261016/`. The machine-readable verification receipt
is `release/deployments/MIXA_0.5.3_testing_20261016.json`. This local post-upload
status section was added after committing the tested application; it does not
change the deployed runtime files.

## Authorised Package And Backup

The user authorised upload of `0.5.3-preview` for hosted testing on 2026-10-16
in the existing `Ewaldssphere/MIXA_beta0.3` Space. This supersedes the local-only
restriction in the historical notes below for this reviewed build only.

The pre-upload revision was confirmed RUNNING at
`eba70aedb17c9bf11e2772ab37ea0b210a77f800`, on CPU Basic with one replica.
Python 3.11, Streamlit 1.54.0, dependency pins and `.streamlit/config.toml` are
unchanged. No hardware, billing or SDK change is part of the upload.

A complete pre-upload repository mirror and Git bundle are retained locally:

```text
release/backups/MIXA_before_0.5.3_testing_20261016.git
release/backups/MIXA_before_0.5.3_testing_20261016.bundle
```

The build passed 109 automated tests and all 12 targeted scientific audit
checks before upload preparation. The reviewed source, original examples,
tests and audit scripts are included in `MIXA_0.5.3_testing_source.zip` in the
hosted repository. No private uploads, credentials, environments or generated
user results are included. Validation limits are described in
`SCIENTIFIC_HARDENING.md` and `ADVANCED_KINETICS.md`.

Post-upload verification must check the exact new revision, container startup,
sample loading, 1:1 Langmuir default, advanced/background controls and unchanged
CPU Basic hardware. Upload/build success alone is not an application smoke
test. The verification result is recorded separately with the commit SHA.
Future unreviewed changes still require new authorisation to deploy.

## Historical Pre-Upload Status

Updated 2026-10-15 after the user rejected the 0.6 workflow redesign.

- Live Space: `Ewaldssphere/MIXA_beta0.3`
- Live application version: 0.5, restored at the user's explicit request.
- Restore commit: `eba70aedb17c9bf11e2772ab37ea0b210a77f800`
- Source baseline: `a2162d2965ddcd3bc70623b9002a145cd8da9da1`, immediately before 0.6.
- The restored README and all application, data-workspace and reporting modules
  match that baseline byte-for-byte. Dependencies, sample data, Space URL and
  CPU Basic hardware were not changed.
- The unreferenced `mixa_ui.py`, `mixa_selection.py` and `CHANGES_0.6.txt` remain
  in the Space repository history/current tree but are not used by the restored
  entry point or application. Do not reactivate them without user approval.

## Local Work

The root checkout is now a LOCAL publication-workflow preview, version
`0.5.3-preview`. It preserves the original method-specific navigation and
diagnostic dashboards, adds clean independent-repeat mean/SD figures and
explicit variability tables, and reuses the tested exact-window fitting
implementation. It is NOT the live version. Do not deploy without the user's
explicit approval after review. The rejected five-stage `mixa_ui.py` remains
only as an inactive reference and is excluded from preview packaging.

The local preview also includes separate kinetic, kobs and isotherm figures
with retained parameter dot/error-bar panels, numerical parameter mean +/- SD
and independent n, plus readable TXT/CSV results. The numerical results add to
the plots rather than replacing them. The combined reference layout and
original diagnostics remain.

The 2026-10-16 scientific-hardening changes are local only. See
`SCIENTIFIC_HARDENING.md`. They address advanced-model state propagation,
two-state affinity, isotherm constraints/qualification, uncertainty labels,
candidate comparison, bootstrap status and failed-fit visibility. The
before-hardening code archive and numerical audit evidence are retained.
No Space commit, restart, hardware, SDK, dependency or billing change was made.

The mechanistic kinetics controls are also LOCAL ONLY and are integrated into
Kinetic Analysis's Binding model menu, not a separate navigation entry. See
`ADVANCED_KINETICS.md` for shared/local/fixed controls, explicit orientation,
mechanistic/transport models, covariance/profile diagnostics, repeat statistics
and reproducible validation limits. It does not replace existing analyses or
claim vendor equivalence. The reviewed 0.5.2 archive is retained as
`release/MIXA_scientific_hardening_0.5.2.zip`.

Phase selection in the local preview is automatic/full-phase by default.
Manual phase-start sliders and advanced fit-trimming sliders are opt-in;
resetting restores detected starts and full association/dissociation data.
The automatic/manual flags and detected starts are included in the project
record. This does not imply that detection is correct for every experiment.

The exact pre-0.6 source snapshot is in `release/restore-pre-0.6/`. A recoverable
Git backup is in `release/backups/MIXA_0.5-before-0.6-20261015.bundle`.

Further fit/statistics repairs must stay local for user review. Preserve the
established kinetic, kobs, equilibrium and comparison workflows rather than
replacing their navigation again. Distinguish response/repeat SD, conditional
fit SE and across-independent-repeat confidence intervals. Successful software
tests do not establish statistical validity for arbitrary experimental data.

## Restoration Checks

- Hugging Face API confirmed the restore commit is RUNNING on CPU Basic.
- Both original Group 1 and Group 2a examples loaded in the live application.
- Equilibrium analysis converged and displayed its curve, model SE, attainment
  warning, original diagnostic dashboard and export controls.
- The live equilibrium PNG download succeeded.
- An isolated Streamlit AppTest against the restored snapshot also loaded the
  original examples, ran equilibrium and rendered both result views without an
  application exception.

These are restoration/smoke checks, not a new statistical audit. No additional
scientific or UI changes were included in the rollback.
