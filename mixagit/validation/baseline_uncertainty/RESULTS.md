# Baseline Uncertainty Repair

Generated: 2026-10-20T12:40:21.287830+00:00

Same fitted values, selected observations and objectives; different covariance calculation. Parenthetical ranges are 95% Wilson Monte Carlo intervals, not binding-parameter intervals.

| Design | Parameter | Conditional baseline coverage | Propagated coverage | Available pairs |
| --- | --- | --- | --- | --- |
| iid_baseline_5 | kon | 26.5% (20.9-33.0) | 96.5% (93.0-98.3) | 200/200 |
| iid_baseline_5 | koff | 60.0% (53.1-66.5) | 97.0% (93.6-98.6) | 200/200 |
| iid_baseline_5 | KD_nM | 24.0% (18.6-30.4) | 95.5% (91.7-97.6) | 200/200 |
| iid_baseline_20 | kon | 49.0% (42.2-55.9) | 93.5% (89.2-96.2) | 200/200 |
| iid_baseline_20 | koff | 81.0% (75.0-85.8) | 94.0% (89.8-96.5) | 200/200 |
| iid_baseline_20 | KD_nM | 48.0% (41.2-54.9) | 94.5% (90.4-96.9) | 200/200 |
| iid_baseline_80 | kon | 73.5% (67.0-79.1) | 93.0% (88.6-95.8) | 200/200 |
| iid_baseline_80 | koff | 89.5% (84.5-93.0) | 92.5% (88.0-95.4) | 200/200 |
| iid_baseline_80 | KD_nM | 75.0% (68.6-80.5) | 93.0% (88.6-95.8) | 200/200 |
| iid_baseline_20_estimated_weights | kon | 54.5% (47.6-61.3) | 95.0% (91.0-97.3) | 200/200 |
| iid_baseline_20_estimated_weights | koff | 85.0% (79.4-89.3) | 93.5% (89.2-96.2) | 200/200 |
| iid_baseline_20_estimated_weights | KD_nM | 53.5% (46.6-60.3) | 93.0% (88.6-95.8) | 200/200 |
| ou_baseline_20_tau_4 | kon | 59.5% (52.6-66.1) | 93.0% (88.6-95.8) | 200/200 |
| ou_baseline_20_tau_4 | koff | 84.0% (78.3-88.4) | 93.5% (89.2-96.2) | 200/200 |
| ou_baseline_20_tau_4 | KD_nM | 58.5% (51.6-65.1) | 92.5% (88.0-95.4) | 200/200 |

## Original Automated Scenario

- kon: 30/33 available intervals covered truth; 40 runs requested.
- koff: 32/33 available intervals covered truth; 40 runs requested.
- KD_nM: 30/33 available intervals covered truth; 40 runs requested.

## Scope

First-order local Gaussian reference propagation, conditional on chosen model, relative noise weights and supplied OU time. Shared controls, concentrations, uncertain phases and model selection are not jointly propagated.

All failures and unavailable intervals remain in the JSON/CSV denominators. Independent-repeat SD is unchanged. Finite simulation coverage measures these designs; it is not a universal calibration claim.
