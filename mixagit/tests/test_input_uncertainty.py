from copy import deepcopy
from dataclasses import replace
import io
import json
import zipfile

import numpy as np
import pytest

import mixa_app as app
from mixa_automation import input_fingerprint
from mixa_data import default_design, example_project, prepare_experiment
from mixa_input_uncertainty import (calibration_covariance, common_options, curve_input,
    estimator_sensitivity, input_options, interpolation_grid, kobs_propagation,
    isotherm_propagation, linear_source_covariance, propagate_fit_inputs, source_id)
from mixa_mechanisms import derived_affinities, fit_mechanism, parameter_defaults, prepare_curves


def project(options=None, shared=True):
    raw, design = example_project()
    if shared:
        design.loc[design.Role == "Negative control", "Background set"] = "Shared"
        design.loc[design.Role == "Sample", ["Background set", "Subtraction"]] = ["Shared", "Control 0 nM"]
    for data in raw:
        data["noise_sd_by_concentration"] = {c: .06 if "control" in data["filename"] else .12 for c in data["concentrations"]}
    data, _ = prepare_experiment(raw, design, "Experiment 1")
    for d in data:
        d["input_uncertainty"] = input_options(options)
    included = {d["filename"]: {5., 15., 50., 150., 500.} for d in data}
    windows = dict(phase_assoc_start_s=20., phase_dissoc_start_s=100., fit_assoc_start_s=20.,
                   fit_assoc_end_s=100., fit_dissoc_start_s=100., fit_dissoc_end_s=180.)
    return data, included, windows


def term(filename, t, sd, weight=1.):
    return dict(id=source_id(filename, 0.), filename=filename, concentration_nM=0.,
                time=t, response=np.zeros(len(t)), noise_sd=sd, weight=weight, role="Sample")


def test_preparation_keeps_exact_source_weights_and_reuse_identity():
    raw, design = example_project()
    design.loc[design.Role == "Negative control", "Background set"] = "Shared"
    design.loc[design.Role == "Sample", ["Background set", "Subtraction"]] = ["Shared", "Control 0 nM"]
    design.loc[[1, 3], "Repeat ID"] = "Control A"
    design.loc[5, "Repeat ID"] = "Control B"
    data, _ = prepare_experiment(raw, design, "Experiment 1")
    first = data[0]["measurement_sources"][50.]
    np.testing.assert_allclose([s["weight"] for s in first], [1., -.25, -.25, -.5])
    assert [s["id"] for s in first[1:]] == [s["id"] for s in data[1]["measurement_sources"][150.][1:]]
    for s in first:
        original = next(d for d in raw if d["filename"] == s["filename"])
        np.testing.assert_array_equal(s["response"], original["responses"][s["concentration_nM"]])


@pytest.mark.parametrize("tau", [0., 3.])
def test_linear_raw_source_covariance_matches_explicit_interpolation_and_shared_noise(tau):
    t = np.array([0., 1., 2.5, 4., 7., 10.])
    q = [np.array([2., 3., 7.]), np.array([1.5, 4.5, 9.])]
    shared = term("control", t, 2., -1.)
    curves = [dict(filename=f"s{i}", concentration_nM=10.+i, on=1.,
                   measurement_sources=[term(f"s{i}", t, 1.), shared]) for i in range(2)]
    projections = [(q[0], np.array([.2, .3, .5])), (q[1], np.array([.4, .4, .2]))]
    options = input_options(dict(propagate_measurement=True, raw_correlation_time_s=tau))
    actual, metadata = linear_source_covariance(curves, projections, options)
    coeff = []
    for times, projection in projections:
        matrix = np.array([np.interp(times, t, row) for row in np.eye(len(t))]).T
        coeff.append(projection @ matrix)
    correlation = np.exp(-np.abs(t[:, None]-t[None, :])/tau) if tau else np.eye(len(t))
    shared_cov = 4*np.array(coeff) @ correlation @ np.array(coeff).T
    expected = shared_cov+np.diag([a @ correlation @ a for a in coeff])
    np.testing.assert_allclose(actual, expected, rtol=1e-12, atol=1e-12)
    assert next(m for m in metadata if m["filename"] == "control")["n_target_traces"] == 2


def test_same_file_zero_reference_is_the_same_noise_source_not_an_independent_copy():
    raw, _ = example_project()
    design = default_design(raw[:1])
    design.loc[0, "Subtraction"] = "Same-file 0 nM"
    raw[0]["noise_sd_by_concentration"] = {c: .2 for c in raw[0]["concentrations"]}
    data, _ = prepare_experiment(raw[:1], design, "Experiment 1")
    c = dict(filename=data[0]["filename"], concentration_nM=0., on=20., **curve_input(data[0], 0.))
    covariance, _ = linear_source_covariance([c], [(np.array([30., 50.]), np.array([.5, .5]))], input_options())
    assert covariance[0, 0] == pytest.approx(0., abs=1e-20)


def test_common_calibration_is_not_divided_by_repeat_count():
    o = input_options(dict(stock_cv=.1))
    one, _ = calibration_covariance(np.array([[100.], [0.]]), [50.], o)
    many, _ = calibration_covariance(np.array([[20.]*5, [0.]*5]), [50.]*5, o)
    np.testing.assert_allclose(one, many)
    assert many[0, 0] == pytest.approx(100.)


def test_finite_median_measurement_propagation_preserves_shared_control_variance():
    t = np.arange(15.)
    options = input_options(dict(propagate_measurement=True, draws=8192))
    shared = term("control", t, .8, -1.)
    curves = [dict(filename=f"s{i}", concentration_nM=float(i+1), on=5., time=t, fit_mask=t >= 5.,
                   baseline_estimated=True, baseline_reference_times=t[:5],
                   measurement_sources=[term(f"s{i}", t, .2), shared], input_uncertainty_options=options)
              for i in range(2)]
    jac = np.ones((20, 1))
    covariance, metadata = propagate_fit_inputs(jac, curves, np.eye(1))
    rng = np.random.default_rng(7621)
    control = rng.normal(0, .8, (60000, len(t)))
    errors = []
    for _ in range(2):
        noise = rng.normal(0, .2, control.shape)-control
        errors.append(noise[:, 5:].mean(axis=1)-np.median(noise[:, :5], axis=1))
    expected = np.var(np.mean(errors, axis=0), ddof=1)
    assert covariance[0, 0] == pytest.approx(expected, rel=.06)
    assert metadata["applied"]
    assert len(metadata["raw_sources"]) == 3
    assert "replaces" in metadata["no_double_counting"]


def test_kobs_exactly_straight_line_retains_first_stage_measurement_error_and_rate_covariance():
    levels = np.array([5., 15., 50., 150., 500.])
    y = 1.2e-4*levels+.012
    curves = [dict(filename="one", repeat_id="R1", concentration_nM=c, kobs_err=.002) for c in levels]
    covariance, metadata = kobs_propagation(curves, levels, y, np.ones(5), np.array([1.2e-4, .012]))
    design = np.column_stack([levels, np.ones(5)])
    units = np.diag([1e9, 1.])
    expected = units @ np.linalg.inv(design.T @ design) @ units*.002**2
    np.testing.assert_allclose(covariance, expected, rtol=1e-10)
    assert covariance[1, 1] > 0 and covariance[0, 1] < 0
    assert metadata["first_stage_propagated"]
    assert not metadata["applied"]


def test_kobs_stock_calibration_uses_full_rate_covariance_not_independent_rate_errors():
    levels = np.array([5., 15., 50., 150., 500.])
    curves = [dict(filename="one", repeat_id="R1", concentration_nM=c, kobs_err=.00001,
                   input_uncertainty_options=input_options(dict(stock_cv=.1))) for c in levels]
    covariance, metadata = kobs_propagation(curves, levels, 1.2e-4*levels+.012, np.ones(5), np.array([1.2e-4, .012]))
    calibration = np.array(metadata["calibration_covariance"])
    assert calibration[0, 0] == pytest.approx((.1*1.2e5)**2, rel=1e-10)
    assert abs(calibration[1, 1]) < 1e-25
    assert covariance[0, 0] >= calibration[0, 0]


def test_kobs_aggregation_does_not_count_technical_files_as_independent_repeats():
    levels = np.array([5., 50., 500.])
    curves = [dict(filename=f"f{i}", repeat_id="R1" if i < 2 else "R2", concentration_nM=c, kobs_err=.002)
              for c in levels for i in range(3)]
    covariance, detail = kobs_propagation(curves, levels, 1.2e-4*levels+.012, np.ones(3), np.array([1.2e-4, .012]))
    np.testing.assert_allclose(np.diag(detail["concentration_mean_rate_covariance"]), .002**2*(.25**2+.25**2+.5**2))
    assert covariance.shape == (2, 2)


def test_budget_changes_errors_not_values_masks_objectives_or_model_counts():
    data, included, windows = project(dict(stock_cv=.08), shared=False)
    curves = prepare_curves(data, included, windows)
    rules = parameter_defaults("langmuir")
    with_budget = fit_mechanism(curves, "langmuir", rules, starts=1)
    no_budget = deepcopy(curves)
    for c in no_budget:
        c["input_uncertainty_options"] = input_options()
    conditional = fit_mechanism(no_budget, "langmuir", rules, starts=1)
    assert with_budget["values"] == conditional["values"]
    assert with_budget["rss"] == conditional["rss"]
    assert with_budget["information_criteria"] == conditional["information_criteria"]
    assert with_budget["n_parameters"] == conditional["n_parameters"]
    assert derived_affinities(with_budget).model_se.iloc[0] > 10*derived_affinities(conditional).model_se.iloc[0]
    covariance = np.array(with_budget["input_uncertainty"]["calibration_covariance"])
    first = with_budget["free_parameters"].index("kon::all")
    off = with_budget["free_parameters"].index("koff::all")
    assert covariance[first, first] == pytest.approx((.08*with_budget["values"]["kon::all"])**2, rel=1e-4)
    assert covariance[off, off] < 1e-15
    assert input_fingerprint(curves) != input_fingerprint(no_budget)


def test_raw_reference_budget_runs_in_mechanistic_and_standard_shared_and_kobs_engines():
    data, included, windows = project(dict(propagate_measurement=True, stock_cv=.03, draws=512), shared=False)
    curves = prepare_curves(data, included, windows)
    fit = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1)
    assert fit["input_uncertainty"]["applied"]
    assert np.isfinite(fit["parameter_table"].model_se).all()
    legacy_curves = app._collect_kinetic_curves(data, included, 20., 100.)
    legacy = app._shared_kinetics_fit(legacy_curves, 20., 100., allow_curve_offsets=False, seed_from_individual=False)
    assert legacy["input_uncertainty"]["applied"]
    kobs = app.fit_kobs_linearization(data, included, 20., 100.)
    assert kobs["input_uncertainty"]["applied"]
    assert kobs["input_uncertainty"]["first_stage_propagated"]
    assert kobs["KD_err"] > 0


def test_association_offset_absorbs_constant_baseline_reference_error():
    t = np.arange(181.)
    y = 30*(1-np.exp(-.04*np.maximum(t-20, 0)))+np.random.default_rng(671).normal(0, .1, len(t))
    fit = app.fit_kobs_from_association(t, y, 20., 100.)
    assert abs(np.sum(fit["rate_sensitivity"])) < 1e-12
    y[t < 20] += 50
    shifted = app.fit_kobs_from_association(t, y, 20., 100.)
    assert shifted["kobs_err"] == pytest.approx(fit["kobs_err"], rel=1e-4)


def test_missing_raw_source_budget_withholds_errors_instead_of_silent_fallback():
    data, included, windows = project(dict(propagate_measurement=True), shared=False)
    data[0].pop("measurement_sources")
    fit = fit_mechanism(prepare_curves(data, included, windows), "langmuir", parameter_defaults("langmuir"), starts=1)
    assert fit["covariance"] is None
    assert fit["parameter_table"].model_se.isna().all()
    assert "provenance" in fit["input_uncertainty"]["error"]


def test_equilibrium_common_stock_error_does_not_shrink_across_repeats_and_profiles_stay_conditional():
    data, included, _ = project(dict(stock_cv=.1), shared=False)
    for d in data:
        for concentration in d["concentrations"]:
            d["responses"][concentration] = np.full(len(d["time"]), 100*concentration/(33+concentration))
    fit = app.fit_equilibrium_advanced(data, 95., included, aggregate_repeats=True, t_assoc_start=20.)
    assert fit["input_uncertainty"]["applied"]
    assert fit["KD"] == pytest.approx(33., rel=1e-5)
    assert fit["KD_err"] == pytest.approx(3.3, rel=1e-4)
    assert fit["KD_profile_ci95"][1]-fit["KD_profile_ci95"][0] < .001


@pytest.mark.parametrize("changes", [dict(stock_cv=-1.), dict(level_cv=np.nan), dict(draws=12), dict(propagate_measurement=1), dict(unknown=2)])
def test_invalid_input_budgets_are_rejected(changes):
    with pytest.raises(ValueError):
        input_options(changes)


def isotherm_inputs(shared=True):
    concentrations = np.array([10., 50., 200.])
    times = np.array([0., 1., 2., 40., 41., 42.])
    options = input_options(dict(propagate_measurement=True))
    control = term("control", times, .9, -1.)
    curves = [dict(filename="sample.csv", concentration_nM=c, on=20., sample_times=times[-3:],
                   input_uncertainty_options=options,
                   measurement_sources=[term(f"raw{i}", times, .6)]+([control] if shared else []))
              for i, c in enumerate(concentrations)]
    return curves, concentrations


def test_isotherm_raw_window_and_shared_reference_covariance_match_explicit_sandwich():
    curves, concentrations = isotherm_inputs()
    occupancy = concentrations/(33.+concentrations)
    jacobian = np.column_stack([occupancy, -100*occupancy*(1-occupancy)/33.])
    influence = np.linalg.pinv(jacobian)
    mean_covariance = .6**2/3*np.eye(3)+.9**2/3*np.ones((3, 3))
    covariance, metadata = isotherm_propagation(curves, 100*occupancy, np.eye(3), concentrations,
        np.ones(3), [100., 33.], np.eye(2))
    np.testing.assert_allclose(covariance, influence @ mean_covariance @ influence.T, rtol=1e-12)
    assert metadata["applied"] and len(metadata["raw_sources"]) == 4


@pytest.mark.parametrize("means,match", [([20., 50., 50.], "tied maximum"),
                                         ([20., 49.5, 50.], "not stable"),
                                         ([-5., -3., -1.], "nonpositive")])
def test_observed_maximum_normalization_withholds_unstable_local_ratio_errors(means, match):
    curves, concentrations = isotherm_inputs(shared=False)
    with pytest.raises(ValueError, match=match):
        isotherm_propagation(curves, means, np.eye(3), concentrations,
            np.ones(3), [100., 33.], np.eye(2), normalize_max=True)
