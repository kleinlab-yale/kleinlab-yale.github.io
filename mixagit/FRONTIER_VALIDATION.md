# MIXA 0.5.10 Validation Results

Generated: 2026-10-20T22:18:50.110920-04:00

This report is generated from retained raw records, with source/output hashes verified. Studies address different questions; their denominators and uncertainty definitions are not interchangeable.

## Experiment-Specific KD Interval Calibration

One hundred fresh outer experiments per design, disjoint from the prior 0.5.9 study, and 400 simulated restricted/unrestricted refit pairs per experiment. Critical values were estimated independently from each fitted experiment, not tuned to these coverage outcomes.

| Design | Available / Requested | Covered / Available | Coverage [Wilson MC 95%] |
| --- | --- | --- | --- |
| measured_baseline_IID | 100/100 | 93/100 | 93.0% [86.3, 96.6] |
| measured_baseline_OU | 100/100 | 94/100 | 94.0% [87.5, 97.2] |
| shared_control_and_stock | 100/100 | 94/100 | 94.0% [87.5, 97.2] |

Complete calibrated simulation pairs: 120000/120000. Both fits and all failures/unrun draws remain in runs.json. Coverage is for the tested 1:1 KD estimand and specified noise/input designs, not every advanced rate or arbitrary measurement distribution.

## Complex-Model Performance

Converged: 30/30; completed all three requested starts within 30 seconds: 30/30. The previous matching-design study completed 15/30 searches. Free starts are software defaults plus two broad starts; one effective transport calibration is fixed input.

| Design | Datasets | Complete Search | Median Seconds | Median Held-Out Clean RMSE |
| --- | --- | --- | --- | --- |
| two_state_resolved | 3 | 3 | 0.247 | 0.01671 |
| two_state_weak_conversion | 3 | 3 | 1.18 | 0.08423 |
| heterogeneous_separated | 3 | 3 | 0.0697 | 0.02003 |
| heterogeneous_overlapping | 3 | 3 | 0.184 | 0.04269 |
| bivalent_standard_density | 3 | 3 | 4.61 | 0.01603 |
| bivalent_low_density | 3 | 3 | 15.4 | 0.02586 |
| sequential_second_capture | 3 | 3 | 0.207 | 0.01562 |
| sequential_weak_second_capture | 3 | 3 | 0.161 | 0.03537 |
| quasi_steady_transport | 3 | 3 | 1.48 | 0.01286 |
| two_compartment_transport | 3 | 3 | 8.1 | 0.01951 |

Largest independent reaction-network prediction difference: 3.945e-06 response units across 40 recorded curve comparisons. All states retain physical injection history and selected observation masks. Timings are hardware/design specific; prediction accuracy and optimizer completion do not establish microscopic rate resolution.

## Joint Nonlinear Repeat Recovery

Ten fixed-population known-truth datasets (five each with 3/6 independent repeats), shared raw control, 10% common stock and 3% concentration-level uncertainty. The actual default priors are used. Independent chains have 2000 discarded warmup steps and 4000 retained draws each. These small recovery counts are not a frequentist calibration certificate for Bayesian intervals.

| Independent Repeats | Parameter | Available / Requested | Covered / Available |
| --- | --- | --- | --- |
| 3 | population_median_kon | 5/5 | 5/5 |
| 3 | population_median_koff | 5/5 | 5/5 |
| 3 | population_median_KD_nM | 5/5 | 5/5 |
| 6 | population_median_kon | 5/5 | 5/5 |
| 6 | population_median_koff | 5/5 | 4/5 |
| 6 | population_median_KD_nM | 5/5 | 5/5 |

Complete chains: 40/40. Datasets meeting all joint nonlinear nuisance convergence/ESS gates: 10/10. Every rate, capacity, calibration/noise and between-repeat parameter is checked, not only population KD.

## Prior-Generated Joint Calibration Screen

Twelve independently prior-generated datasets under the exported restricted prior family, including random between-rate covariance, capacities/baselines, half-t measurement multiplier, reused controls and common/level calibration. Four independent chains use 2000 warmup and 8000 retained draws each. Rank records use up to 100 spaced samples per chain; counts are descriptive, not a fitted uniformity test.

| Parameter | Available / Requested | Covered / Available | Covered / All Requested |
| --- | --- | --- | --- | --- |
| population_median_kon | 12/12 | 11/12 | 11/12 |
| population_median_koff | 12/12 | 12/12 | 12/12 |
| population_median_KD_nM | 12/12 | 12/12 | 12/12 |
| between_log_sd_kon | 12/12 | 10/12 | 10/12 |
| between_log_sd_koff | 12/12 | 12/12 | 12/12 |
| between_rate_correlation | 12/12 | 12/12 | 12/12 |
| common_stock_factor | 12/12 | 12/12 | 12/12 |
| measurement_noise_scale | 12/12 | 11/12 | 11/12 |

Joint-gate availability: 12/12 datasets. Unavailable cases are not removed from the all-requested denominator. Twelve ranks per estimand cannot establish uniform posterior calibration; prior-generated results and fixed-population recovery are distinct evidence.

## Traceability And Reporting Scope

All four studies' production inference source hashes match the current packaged files, and all recorded raw-output hashes were checked when generating this summary. The byte-identical original performance runner is archived in validation/frontier_source_capsule; its calibration/performance functions are unchanged in the current expanded runner. Historical initial sampler, preconditioner, percentile and serial-screen results remain separately labeled with their literal source hashes.

For publication, state the model, selection/reference procedure, independent experimental n, uncertainty definition and enabled input budget. Joint analyses additionally require the exact priors, chain diagnostics and posterior/predictive distinction. Original independent-repeat mean +/- sample SD is preserved. A posterior SD/credible interval, model-based between-repeat SD and frequentist confidence interval are not interchangeable.

Joint inference currently supports 1:1, not advanced mechanistic hierarchies. Source SD ratios/OU times, arbitrary dilution covariance and phase/model selection retain their explicitly stated scope. See REFIT_REVIEW.md, JOINT_INFERENCE.md and the per-study results.json/raw CSVs for reproducible protocols, seeds, numerical limits and failures.
