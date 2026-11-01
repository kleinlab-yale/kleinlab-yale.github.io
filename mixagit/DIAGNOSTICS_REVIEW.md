# Kinetic diagnostics review

Reviewed changes, 2026-10-16. Authorised for publication as `0.5.4-preview` in
the existing Hugging Face Space. Deployment verification is recorded in
`DEPLOYMENT_STATUS.md` and the separate release receipt.

## Comparison with the earlier application

The restored standard kinetic workflow still contains the earlier eight-panel dashboard: residuals over time, heuristic quality by curve, residual histogram, normal Q-Q, kobs/concentration, and kon/koff/KD distributions. Earlier scientific hardening restricted its residual panels to selected observations. The kobs and equilibrium dashboard functions are unchanged from the pre-0.6 snapshot.

The advanced/mechanistic route did not carry forward equivalent diagnostic depth: it had only four pooled residual panels, optimizer history and a JSON information-criteria display. It lacked a measured-trace/fit/residual inspector and phase-specific curve review.

An additional interpretation problem existed in the standard workflow: when the reported rates came from a shared global fit, its original dashboard and score used separately optimized curve-wise fits. Those can fit well even if the shared reported model fits poorly. That dashboard is still useful for exploring concentration-dependent discrepancies, but is not an adequacy assessment of the saved global fit.

## Local changes

- Standard and mechanistic kinetics now use a common eight-panel diagnostic overview of the actual saved fit, without a hidden refit or averaging traces.
- Overview panels show selected raw residuals over time, ranked curve RMSE, association versus dissociation RMSE, phase-specific bias versus concentration, objective residuals versus predictions, raw/objective lag-1 correlations, an objective-residual histogram and a descriptive normal Q-Q plot.
- A curve-level table links curve IDs to file, Repeat ID and concentration. It reports exact selected/excluded and phase counts, RMSE, mean residual, RMSE relative to the selected response range, objective RSS/share and descriptive serial-structure flags.
- Individual trace inspection shows all measured data, selected points, the saved model, dashed predictions outside selection, and selected-only raw and objective residuals. Phase-specific errors and selected time coverage appear below the trace.
- Serial-correlation detail retains the saved weighting/OU whitening. Pairs never cross files, physical phases, trimmed intervals or sampling gaps exceeding three times the median positive sampling interval. Lags are observation counts, with actual pair elapsed times exported.
- Original eight-panel curve-wise diagnostics and parameter distributions remain available as a supplementary expander. The old score is explicitly a heuristic curve-wise screen, not a global-fit confidence assessment.
- Advanced diagnostics place bound status, conditioning, multistart results and tabular information criteria alongside the saved-fit review. Existing profile, parameter-correlation and independent-repeat parameter panels remain.
- CSV and PDF downloads are available in Diagnostics. Standard analysis/publication packages and mechanistic packages include the curve, phase and serial-correlation tables plus their definitions. Mechanistic packages include the expanded overview in PNG/PDF/SVG.

Publication figure layouts, kon/koff/KD dot/SD plots, sample datasets, inclusion decisions and fitting algorithms are not changed by this diagnostics work. No curve is automatically excluded. A high residual-correlation flag does not identify a binding mechanism. RSS share is not parameter influence; leave-one-curve-out sensitivity would require actual refitting and is not claimed here.

## Local verification

`tests/test_diagnostics.py` checks selected-only arithmetic, exact phase counts, saved-global prediction adaptation, raw/OU-objective alignment across all five mechanistic models, missing/numerical-zero behavior, serial-pair boundaries, plotting and CSV exports. Existing workflow tests now exercise trace switching without refitting and diagnostic tables in both types of export.

The full local regression suite passed all 121 tests. These checks validate the diagnostic implementation and guard the existing workflows; they do not establish that a particular binding model is appropriate for arbitrary instrument data.

`scripts/preview_diagnostics.py` generates local figures/tables for the original samples and the labeled synthetic three-repeat project. These outputs are diagnostic examples, not validation of the original samples' binding mechanism. In particular, the original sample global 1:1 fit reaches a koff bound and has large structured residuals; the new view exposes rather than repairs that unsuitable fit.
