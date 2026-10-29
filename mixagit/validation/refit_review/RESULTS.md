# Nonlinear Refit and Blind-Start Results

Generated: 2026-10-20T18:37:31.079006+00:00

Prespecified known-truth Gaussian IID/OU and shared-zero-control/common-stock simulations. Noise SDs and phase times are supplied correctly. Source-level draws and finite median preprocessing are refitted. Blind starts use defaults, not truth-derived free starts; one fixed response-to-M calibration remains a known input. No threshold tuning, automatic model-selection coverage or experimental SPR/BLI validation is claimed.

## Nonlinear Interval Coverage

Counts retain all requested experiments. Brackets are Wilson 95% Monte Carlo intervals, not binding-parameter intervals.

| Design | Parameter | Available | Coverage when available [MC 95%] |
| --- | --- | --- | --- |
| measured_baseline_IID | kon | 100/100 | 92.0% [85.0, 95.9] |
| measured_baseline_IID | koff | 100/100 | 92.0% [85.0, 95.9] |
| measured_baseline_IID | KD_nM | 100/100 | 91.0% [83.8, 95.2] |
| measured_baseline_OU | kon | 100/100 | 98.0% [93.0, 99.4] |
| measured_baseline_OU | koff | 100/100 | 93.0% [86.3, 96.6] |
| measured_baseline_OU | KD_nM | 100/100 | 95.0% [88.8, 97.8] |
| shared_control_and_stock | kon | 100/100 | 98.0% [93.0, 99.4] |
| shared_control_and_stock | koff | 100/100 | 96.0% [90.2, 98.4] |
| shared_control_and_stock | KD_nM | 100/100 | 99.0% [94.6, 99.8] |

## Blind Advanced Starts

Completed all three requested starts: 15/30. Every failed/timed-out fit remains in raw records. Free starts are software defaults plus broad exploration, not generating values. Small per-regime counts screen optimization behavior; they do not calibrate advanced interval coverage.

| Design | Requested | Converged | Complete search | Median held-out clean RMSE |
| --- | --- | --- | --- | --- |
| two_state_resolved | 3 | 3 | 3 | 0.01671 |
| two_state_weak_conversion | 3 | 3 | 3 | 0.08423 |
| heterogeneous_separated | 3 | 3 | 3 | 0.02003 |
| heterogeneous_overlapping | 3 | 3 | 3 | 0.04269 |
| bivalent_standard_density | 3 | 3 | 0 | 0.01603 |
| bivalent_low_density | 3 | 3 | 0 | 0.02586 |
| sequential_second_capture | 3 | 3 | 0 | 0.01562 |
| sequential_weak_second_capture | 3 | 3 | 0 | 0.03537 |
| quasi_steady_transport | 3 | 3 | 3 | 0.01286 |
| two_compartment_transport | 3 | 3 | 0 | 0.01951 |

See intervals.csv and blind_estimates.csv for all parameter estimates, biases, missing intervals and failures. Good response prediction does not imply resolved individual rates. No benchmark-derived thresholds or exclusions were applied.
