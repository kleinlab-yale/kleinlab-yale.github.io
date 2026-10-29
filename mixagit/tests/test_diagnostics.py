from copy import deepcopy
import io
import zipfile

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pytest

from mixa_diagnostics import (correlation_figure, curve_figure, diagnostic_tables, overview_figure,
                              saved_fit_curves, serial_correlations, write_diagnostic_tables)
from mixa_mechanisms import binding_prediction, fit_mechanism, parameter_defaults, _whiten


def saved_curve():
    time = np.arange(15.)
    mask = ((time >= 3) & (time <= 6)) | ((time >= 10) & (time <= 13))
    prediction = np.linspace(1., 4., len(time))
    residual = np.array([900., 900., 900., 1., 2., 3., 4., 900., 900., 900., -2., -4., -6., -8., 900.])
    return dict(filename="A.csv", repeat_id="R1", concentration_nM=50., time=time,
                response=prediction + residual, fitted=prediction, fit_mask=mask,
                whitened_residuals=residual[mask] / 2, on=2., off=8.)


def test_phase_and_curve_statistics_use_exact_saved_selection_not_excluded_points():
    fit = saved_curve()
    before = deepcopy(fit)
    curves = saved_fit_curves({"curves": [fit]})
    tables = diagnostic_tables(curves)
    row = tables["curves"].iloc[0]
    assert (row.n_selected, row.n_excluded, row.n_association, row.n_dissociation) == (8, 7, 4, 4)
    assert row.rmse_response == pytest.approx(np.sqrt(18.75))
    assert row.mean_residual_response == -1.25
    assert row.objective_rss == 37.5
    assert row.objective_rss_share_percent == 100.
    phases = tables["phases"].set_index("phase")
    assert phases.loc["Baseline", "n_selected"] == 0
    assert np.isnan(phases.loc["Baseline", "rmse_response"])
    assert phases.loc["Association", "rmse_response"] == pytest.approx(np.sqrt(7.5))
    assert phases.loc["Dissociation", "rmse_response"] == pytest.approx(np.sqrt(30.))
    assert phases.loc["Association", "first_selected_s"] == 3.
    assert phases.loc["Dissociation", "last_selected_s"] == 13.
    for key in ["response", "fitted", "fit_mask", "whitened_residuals"]:
        np.testing.assert_array_equal(fit[key], before[key])


def test_standard_adapter_uses_saved_global_prediction_not_other_curvewise_fits():
    fit = saved_curve()
    standard = dict(filename=fit["filename"], concentration=50., response_plot=fit["response"],
                    fitted_plot=fit["fitted"], fitted=fit["fitted"] + 1000., fit_mask=fit["fit_mask"])
    data = [dict(filename="A.csv", repeat_id="R1", time=fit["time"], responses={50.: fit["response"] + 2000.})]
    result = dict(individual_fits=[standard], fit_settings=dict(phase_assoc_start_s=2., phase_dissoc_start_s=8.))
    curve = saved_fit_curves(result, data)[0]
    np.testing.assert_array_equal(curve["residuals"], fit["response"] - fit["fitted"])
    np.testing.assert_array_equal(curve["objective"][curve["fit_mask"]], curve["residuals"][curve["fit_mask"]])
    assert diagnostic_tables([curve])["curves"].iloc[0].rmse_response == pytest.approx(np.sqrt(18.75))


def test_serial_pairs_do_not_bridge_selected_gaps_phases_or_missing_time_runs():
    curve = saved_fit_curves({"curves": [saved_curve()]})[0]
    table = serial_correlations(curve, curve["residuals"], max_lag=5)
    assert table.pairs.tolist() == [6, 4, 2, 0, 0]
    assert table.median_elapsed_s.iloc[0] == 1.
    assert table.median_elapsed_s.iloc[2] == 3.
    assert np.isnan(table.correlation.iloc[-1])
    curve["fit_mask"][:] = True
    curve["on"], curve["off"] = 2., 8.
    # Even with continuous selection, no pair crosses a physical phase boundary.
    assert serial_correlations(curve, curve["residuals"], 1).pairs.iloc[0] == 12
    curve["time"][10:] += 100.
    assert serial_correlations(curve, curve["residuals"], 1).pairs.iloc[0] == 11


def test_numerically_exact_fit_has_no_fabricated_serial_correlations():
    fit = saved_curve()
    fit["response"] = fit["fitted"].copy()
    fit["whitened_residuals"][:] = 0.
    tables = diagnostic_tables(saved_fit_curves({"curves": [fit]}))
    row = tables["curves"].iloc[0]
    assert row.rmse_response == 0.
    assert np.isnan(row.raw_lag1)
    assert not row.serial_structure_flag
    assert np.isnan(row.objective_rss_share_percent)


def test_diagnostic_rss_shares_reconcile_without_claiming_parameter_influence():
    one = saved_curve()
    two = deepcopy(one)
    two.update(filename="B.csv", repeat_id="R2")
    two["whitened_residuals"] *= 2
    table = diagnostic_tables(saved_fit_curves({"curves": [one, two]}))["curves"]
    np.testing.assert_allclose(table.objective_rss_share_percent, [20., 80.])
    assert table.objective_rss.sum() == 187.5
    assert table.curve_id.tolist() == ["C01", "C02"]


@pytest.mark.parametrize("model", ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"])
def test_model_agnostic_diagnostics_preserve_fitted_objective_and_physical_phase(model):
    rules = parameter_defaults(model)
    values = {r.key: r.initial for r in rules}
    time = np.arange(0., 181., 3.)
    rng = np.random.default_rng(8)
    prediction = binding_prediction(time, 50e-9, 20., 100., values, model)
    raw = dict(filename="A.csv", repeat_id="R1", concentration_nM=50., concentration_M=50e-9,
               time=time, response=prediction + rng.normal(0., .01, len(time)),
               fit_mask=((time >= 32) & (time <= 90)) | ((time >= 110) & (time <= 160)), on=20., off=100., relative_sd=2.)
    # All parameters fixed: verify diagnostics independently of nonlinear optimizer behavior.
    from dataclasses import replace
    result = fit_mechanism([raw], model, [replace(r, fixed=True) for r in rules], correlation_time=2.)
    curves = saved_fit_curves(result)
    table = diagnostic_tables(curves)["curves"]
    assert table.objective_rss.sum() == pytest.approx(result["rss"], rel=1e-5)
    expected, _ = _whiten((raw["response"] - prediction)[raw["fit_mask"]], time[raw["fit_mask"]], 2.)
    np.testing.assert_allclose(curves[0]["objective"][raw["fit_mask"]], expected / 2., atol=1e-7)
    assert table.n_selected.sum() == result["n_observations"]
    assert set(diagnostic_tables(curves)["phases"].phase) == {"Baseline", "Association", "Dissociation"}


def test_diagnostics_reject_misaligned_or_nonfinite_selected_residuals():
    fit = saved_curve()
    fit["whitened_residuals"] = np.zeros(2)
    with pytest.raises(ValueError, match="align exactly"):
        saved_fit_curves({"curves": [fit]})
    fit = saved_curve()
    fit["response"][4] = np.nan
    with pytest.raises(ValueError, match="finite"):
        saved_fit_curves({"curves": [fit]})


def test_overview_and_trace_figures_and_export_keep_selected_data_auditable():
    curves = saved_fit_curves({"curves": [saved_curve()]})
    figures = [overview_figure(curves), curve_figure(curves[0]), correlation_figure(curves[0])]
    try:
        for fig in figures:
            fig.canvas.draw()
        assert len(figures[0].axes) == 8
        trace = figures[1].axes[0]
        selected_line = next(line for line in trace.lines if line.get_label() == "Saved fit in selection")
        np.testing.assert_array_equal(np.isfinite(selected_line.get_ydata()), curves[0]["fit_mask"])
        assert len(figures[1].axes[1].lines[0].get_ydata()) == 8
        payload = io.BytesIO()
        with zipfile.ZipFile(payload, "w") as archive:
            write_diagnostic_tables(archive, "diagnostics", curves)
        with zipfile.ZipFile(payload) as archive:
            table = pd.read_csv(archive.open("diagnostics/curves.csv"))
            assert table.n_selected.tolist() == [8]
            assert "not leave-one-curve-out" in archive.read("diagnostics/DIAGNOSTIC_METHODS.txt").decode()
    finally:
        for fig in figures:
            plt.close(fig)
