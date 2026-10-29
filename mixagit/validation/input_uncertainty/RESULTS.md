# Correlated Input and Advanced-Model Noise Results

Generated: 2026-10-20T12:46:45.828568+00:00

Known-truth Gaussian designs with known phase times and source SDs; common-stock errors are zero-median lognormal. Input covariance remains local. Advanced noisy tests include weak regimes, all kinetic/capacity parameters free except stated transport calibration, affinity-order label matching, held-out concentration and all failures. Not model-selection or uncertain-phase coverage.

## Input Propagation

Nominal 95% local intervals; failures stay in all-run denominators in JSON. Brackets are Wilson 95% Monte Carlo intervals.

| Design | Analysis | Parameter | Available | Coverage [MC 95%] |
| --- | --- | --- | --- | --- |
| kinetic_shared_zero_reference | budget_off | kon | 200/200 | 96.0% [92.3, 98.0] |
| kinetic_shared_zero_reference | budget_off | koff | 200/200 | 76.5% [70.2, 81.8] |
| kinetic_shared_zero_reference | budget_off | KD_nM | 200/200 | 90.5% [85.6, 93.8] |
| kinetic_shared_reference_OU | budget_off | kon | 200/200 | 65.0% [58.2, 71.3] |
| kinetic_shared_reference_OU | budget_off | koff | 200/200 | 44.0% [37.3, 50.9] |
| kinetic_shared_reference_OU | budget_off | KD_nM | 200/200 | 61.0% [54.1, 67.5] |
| kinetic_common_stock_10pct | budget_off | kon | 200/200 | 3.0% [1.4, 6.4] |
| kinetic_common_stock_10pct | budget_off | koff | 200/200 | 93.0% [88.6, 95.8] |
| kinetic_common_stock_10pct | budget_off | KD_nM | 200/200 | 3.5% [1.7, 7.0] |
| kinetic_shared_zero_reference | current | kon | 200/200 | 95.5% [91.7, 97.6] |
| kinetic_shared_zero_reference | current | koff | 200/200 | 94.5% [90.4, 96.9] |
| kinetic_shared_zero_reference | current | KD_nM | 200/200 | 96.0% [92.3, 98.0] |
| kinetic_shared_reference_OU | current | kon | 200/200 | 94.0% [89.8, 96.5] |
| kinetic_shared_reference_OU | current | koff | 200/200 | 93.5% [89.2, 96.2] |
| kinetic_shared_reference_OU | current | KD_nM | 200/200 | 92.0% [87.4, 95.0] |
| kinetic_common_stock_10pct | current | kon | 200/200 | 95.0% [91.0, 97.3] |
| kinetic_common_stock_10pct | current | koff | 200/200 | 93.0% [88.6, 95.8] |
| kinetic_common_stock_10pct | current | KD_nM | 200/200 | 97.0% [93.6, 98.6] |
| kobs_first_stage_IID | current | kon | 200/200 | 95.5% [91.7, 97.6] |
| kobs_first_stage_IID | current | koff | 200/200 | 94.5% [90.4, 96.9] |
| kobs_first_stage_IID | current | KD_nM | 200/200 | 95.0% [91.0, 97.3] |
| kobs_shared_zero_reference | current | kon | 200/200 | 96.0% [92.3, 98.0] |
| kobs_shared_zero_reference | current | koff | 200/200 | 95.5% [91.7, 97.6] |
| kobs_shared_zero_reference | current | KD_nM | 200/200 | 93.5% [89.2, 96.2] |
| kobs_common_stock_10pct | current | kon | 200/200 | 96.5% [93.0, 98.3] |
| kobs_common_stock_10pct | current | koff | 200/200 | 96.5% [93.0, 98.3] |
| kobs_common_stock_10pct | current | KD_nM | 200/200 | 97.0% [93.6, 98.6] |
| kobs_first_stage_IID | old_line_RSS | kon | 200/200 | 97.0% [93.6, 98.6] |
| kobs_first_stage_IID | old_line_RSS | koff | 200/200 | 89.0% [83.9, 92.6] |
| kobs_first_stage_IID | old_line_RSS | KD_nM | 200/200 | 90.5% [85.6, 93.8] |
| kobs_shared_zero_reference | old_line_RSS | kon | 200/200 | 96.0% [92.3, 98.0] |
| kobs_shared_zero_reference | old_line_RSS | koff | 200/200 | 54.0% [47.1, 60.8] |
| kobs_shared_zero_reference | old_line_RSS | KD_nM | 200/200 | 59.5% [52.6, 66.1] |
| kobs_common_stock_10pct | old_line_RSS | kon | 200/200 | 34.5% [28.3, 41.3] |
| kobs_common_stock_10pct | old_line_RSS | koff | 200/200 | 88.0% [82.8, 91.8] |
| kobs_common_stock_10pct | old_line_RSS | KD_nM | 200/200 | 69.5% [62.8, 75.5] |

## Advanced Noisy Fits

Both identifiable and weak regimes are included. Starts are explicitly near the generating values: this isolates local recovery/uncertainty behavior, not blind global-search performance. Component labels are matched by affinity order for heterogeneous fits. No failed, timed-out or unresolved interval is removed from the requested-fit counts.

| Design | Parameter | Available | Coverage when available | Relative bias |
| --- | --- | --- | --- | --- |
| two_state_resolved | kon | 10/10 | 90.0% | -0.04% |
| two_state_resolved | koff | 10/10 | 90.0% | -0.08% |
| two_state_resolved | k_forward | 10/10 | 90.0% | 0.05% |
| two_state_resolved | k_reverse | 10/10 | 80.0% | 0.20% |
| two_state_resolved | KD_first_step_nM | 10/10 | 90.0% | -0.05% |
| two_state_resolved | KD_overall_nM | 10/10 | 100.0% | 0.04% |
| two_state_weak_conversion | kon | 10/10 | 100.0% | 1.47% |
| two_state_weak_conversion | koff | 10/10 | 100.0% | 23.48% |
| two_state_weak_conversion | k_forward | 10/10 | 100.0% | 2742.50% |
| two_state_weak_conversion | k_reverse | 10/10 | 100.0% | 417.45% |
| two_state_weak_conversion | KD_first_step_nM | 10/10 | 100.0% | 21.39% |
| two_state_weak_conversion | KD_overall_nM | 10/10 | 100.0% | -0.15% |
| heterogeneous_separated | kon | 10/10 | 100.0% | 0.10% |
| heterogeneous_separated | koff | 10/10 | 90.0% | 0.03% |
| heterogeneous_separated | kon2 | 10/10 | 100.0% | -0.72% |
| heterogeneous_separated | koff2 | 10/10 | 100.0% | -0.31% |
| heterogeneous_separated | KD_population_1_nM | 10/10 | 100.0% | -0.07% |
| heterogeneous_separated | KD_population_2_nM | 10/10 | 100.0% | 0.42% |
| heterogeneous_overlapping | kon | 10/10 | 70.0% | 2.94% |
| heterogeneous_overlapping | koff | 10/10 | 70.0% | -2.41% |
| heterogeneous_overlapping | kon2 | 10/10 | 90.0% | -9.86% |
| heterogeneous_overlapping | koff2 | 10/10 | 80.0% | 23.16% |
| heterogeneous_overlapping | KD_population_1_nM | 10/10 | 70.0% | -3.35% |
| heterogeneous_overlapping | KD_population_2_nM | 10/10 | 100.0% | 83.77% |
| bivalent_standard_density | kon | 10/10 | 80.0% | -0.04% |
| bivalent_standard_density | koff | 10/10 | 80.0% | 0.06% |
| bivalent_standard_density | kon2 | 10/10 | 90.0% | 0.23% |
| bivalent_standard_density | koff2 | 10/10 | 90.0% | 0.26% |
| bivalent_standard_density | KD_per_arm_first_step_nM | 10/10 | 80.0% | 0.11% |
| bivalent_standard_density | KD_macroscopic_capture_nM | 10/10 | 80.0% | 0.11% |
| bivalent_low_density | kon | 10/10 | 80.0% | 0.51% |
| bivalent_low_density | koff | 10/10 | 100.0% | 0.96% |
| bivalent_low_density | kon2 | 10/10 | 100.0% | 3.69% |
| bivalent_low_density | koff2 | 10/10 | 90.0% | 3.31% |
| bivalent_low_density | KD_per_arm_first_step_nM | 10/10 | 90.0% | 0.55% |
| bivalent_low_density | KD_macroscopic_capture_nM | 10/10 | 90.0% | 0.55% |
| sequential_second_capture | kon | 10/10 | 100.0% | 0.02% |
| sequential_second_capture | koff | 10/10 | 90.0% | 0.01% |
| sequential_second_capture | kon2 | 10/10 | 100.0% | 0.16% |
| sequential_second_capture | koff2 | 10/10 | 90.0% | -0.06% |
| sequential_second_capture | KD_step_1_nM | 10/10 | 100.0% | -0.01% |
| sequential_second_capture | KD_step_2_nM | 10/10 | 100.0% | -0.22% |
| sequential_weak_second_capture | kon | 10/10 | 90.0% | -0.06% |
| sequential_weak_second_capture | koff | 10/10 | 90.0% | -0.06% |
| sequential_weak_second_capture | kon2 | 10/10 | 100.0% | 0.25% |
| sequential_weak_second_capture | koff2 | 10/10 | 100.0% | 0.80% |
| sequential_weak_second_capture | KD_step_1_nM | 10/10 | 90.0% | -0.00% |
| sequential_weak_second_capture | KD_step_2_nM | 10/10 | 100.0% | 0.73% |
| quasi_steady_transport | kon | 10/10 | 100.0% | 0.03% |
| quasi_steady_transport | koff | 10/10 | 100.0% | 0.01% |
| quasi_steady_transport | k_transport | 10/10 | 100.0% | -0.01% |
| quasi_steady_transport | KD_nM | 10/10 | 100.0% | -0.01% |
| two_compartment_transport | kon | 10/10 | 90.0% | -0.09% |
| two_compartment_transport | koff | 10/10 | 90.0% | -0.06% |
| two_compartment_transport | k_exchange | 10/10 | 100.0% | 0.23% |
| two_compartment_transport | KD_nM | 10/10 | 100.0% | 0.03% |

Monte Carlo intervals, raw estimates, failed/unresolved fits, local precision flags, biases, errors and held-out prediction errors are retained in the machine-readable evidence. 10 runs per advanced regime are an initial diagnostic screen, not precise coverage calibration. Available local diagnostic intervals can still have weak precision; their availability does not imply eligibility for routine repeat summaries. No thresholds or parameter bounds were tuned to the outcomes.
