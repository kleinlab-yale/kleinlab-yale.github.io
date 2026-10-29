# MIXA Methods Validation Results

Generated: 2026-10-20T12:39:33.899501+00:00

Synthetic benchmark evidence with recorded source hashes. Neither vendor agreement nor visual fit quality is the answer key.

## Findings Requiring Attention

Measured-baseline uncertainty now propagates through the existing fit's sensitivities. Compare the estimated-baseline/noise case and the paired baseline study in baseline_uncertainty/RESULTS.md. This does not include shared-control/concentration/model-selection uncertainty. Thresholds were not loosened or tuned to obtain coverage.

The phase-specific residual screens also withheld some correctly specified simple fits. Their empirical withholding frequency is reported, not treated as detection of a real defect in every rejected simulation.

## Independent Numerical and Joint-Recovery Checks

| Model | Transport | Independent prediction agrees | Joint recovery <2% |
| --- | --- | --- | --- |
| langmuir | None | True | True |
| two_state | None | True | True |
| heterogeneous | None | True | True |
| bivalent | None | True | True |
| sequential | None | True | True |
| langmuir | Quasi-steady 1:1 transport | True | True |
| langmuir | Two-compartment transport | True | True |
| two_state + NS | Two-compartment transport | True | not assessed |

Joint recovery is one noiseless design per model with all kinetic/capacity parameters free; two-compartment calibration is fixed and recorded. It is not a complex-model uncertainty-coverage study.

## Conditional Interval Calibration

Nominal 95% local t/delta-method intervals. Percentages below condition on interval availability; availability and all-run fractions are in the JSON. Brackets are Wilson 95% Monte Carlo intervals.

| Design | Parameter | Available | Coverage [MC 95%] | Relative bias |
| --- | --- | --- | --- | --- |
| iid_standard | kon | 200/200 | 96.5% [93.0, 98.3] | 0.00% |
| iid_standard | koff | 200/200 | 95.0% [91.0, 97.3] | 0.01% |
| iid_standard | KD_nM | 200/200 | 96.5% [93.0, 98.3] | 0.01% |
| iid_slow_dissociation | kon | 200/200 | 94.5% [90.4, 96.9] | -0.01% |
| iid_slow_dissociation | koff | 200/200 | 93.5% [89.2, 96.2] | -0.02% |
| iid_slow_dissociation | KD_nM | 200/200 | 93.0% [88.6, 95.8] | -0.01% |
| iid_fast_association | kon | 200/200 | 96.0% [92.3, 98.0] | -0.01% |
| iid_fast_association | koff | 200/200 | 97.5% [94.3, 98.9] | -0.01% |
| iid_fast_association | KD_nM | 200/200 | 93.5% [89.2, 96.2] | -0.00% |
| ou_ignored | kon | 200/200 | 49.5% [42.6, 56.4] | -0.00% |
| ou_ignored | koff | 200/200 | 49.5% [42.6, 56.4] | 0.00% |
| ou_ignored | KD_nM | 200/200 | 49.5% [42.6, 56.4] | 0.01% |
| ou_supplied_true_tau | kon | 200/200 | 97.0% [93.6, 98.6] | -0.00% |
| ou_supplied_true_tau | koff | 200/200 | 95.5% [91.7, 97.6] | 0.01% |
| ou_supplied_true_tau | KD_nM | 200/200 | 96.0% [92.3, 98.0] | 0.01% |

## Full Assisted Procedure

Each experiment reruns the complete finite-candidate policy, multistarts, residual checks, profiles and stopping rules. No decisions are mocked. Known phase times and finite runtime are part of the design.

| Design | Qualified | Unnecessary drift | Supported drift selected |
| --- | --- | --- | --- |
| simple_drift_permitted | 37/40 | 0/40 | 0/40 |
| true_linear_drift | 39/40 | 0/40 | 39/40 |
| simple_estimated_baseline_noise | 33/40 | 0/40 | 0/40 |
| two_state_only_simple_permitted | 0/40 | 0/40 | 0/40 |

### Parameter Intervals After the Full Procedure

These remain conditional-model intervals evaluated after selection, not a newly selection-adjusted interval estimator. The baseline/noise case also reruns preprocessing. Missing recommendations remain in the all-run denominators in the JSON.

| Design | Parameter | Available | Coverage when available [MC 95%] |
| --- | --- | --- | --- |
| simple_drift_permitted | kon | 37/40 | 89.2% [75.3, 95.7] |
| simple_drift_permitted | koff | 37/40 | 94.6% [82.3, 98.5] |
| simple_drift_permitted | KD_nM | 37/40 | 94.6% [82.3, 98.5] |
| true_linear_drift | kon | 39/40 | 94.9% [83.1, 98.6] |
| true_linear_drift | koff | 39/40 | 97.4% [86.8, 99.5] |
| true_linear_drift | KD_nM | 39/40 | 92.3% [79.7, 97.3] |
| simple_estimated_baseline_noise | kon | 33/40 | 90.9% [76.4, 96.9] |
| simple_estimated_baseline_noise | koff | 33/40 | 97.0% [84.7, 99.5] |
| simple_estimated_baseline_noise | KD_nM | 33/40 | 90.9% [76.4, 96.9] |

## Scope

- Independent simulator uses explicit free-surface species, stoichiometric fluxes and DOP853, not MIXA's analytic/Radau prediction functions.
- Coverage scenarios include IID standard/slow/fast designs and paired OU data analyzed with ignored versus true supplied correlation. No correlation time is estimated.
- Held-out concentration is never used for fitting or selecting a candidate; predictive RMSE is exported without a calibrated prediction-interval claim.
- Automation includes a known-zero baseline, a measured-baseline/noise scenario, permitted unnecessary drift, real drift and misspecified two-state data with only 1:1/drift allowed.
- This conditional study does not cover advanced-model noisy intervals, estimated phase boundaries, shared controls or concentration calibration. A separate input_uncertainty study records those selected source/calibration and complex-noise cases; broader grids and permitted mechanism searches remain outside both studies.
- No independent real SPR/BLI dataset is included in this benchmark. Such datasets assess applicability/prediction, not agreement with a vendor as ground truth.

Raw estimates, failed/unresolved results, withheld-concentration prediction errors and source hashes accompany this report. Thresholds were not tuned to these results.
