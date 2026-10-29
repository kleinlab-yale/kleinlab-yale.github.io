from copy import deepcopy
import io
import json
import zipfile

import numpy as np
import pytest

import mixa_app as app
from mixa_automation import input_fingerprint
from mixa_mechanisms import derived_affinities, fit_mechanism, parameter_defaults, prepare_curves
from mixa_uncertainty import baseline_reference, propagate_baseline, reference_moments
from mixa_methods import write_methods_exports


def prepared(seed=11, noise=.2):
    rng = np.random.default_rng(seed)
    t = np.arange(181.)
    data = dict(filename="test.csv", repeat_id="R1", time=t, concentrations=[5., 15., 50., 150., 500.], responses={})
    for concentration in data["concentrations"]:
        data["responses"][concentration] = app.model_1to1(t, 1.2e5, .012, 85., concentration*1e-9, 20., 100.) + rng.normal(0., noise, len(t))
    include = {data["filename"]: set(data["concentrations"])}
    windows = dict(phase_assoc_start_s=20., phase_dissoc_start_s=100., fit_assoc_start_s=20.,
                   fit_assoc_end_s=100., fit_dissoc_start_s=100., fit_dissoc_end_s=180.)
    return data, include, windows


def test_finite_gaussian_median_variance_against_separate_monte_carlo():
    moments = reference_moments(np.arange(20.), np.arange(20., 50.))
    samples = np.random.default_rng(9967).normal(size=(100000, 20))
    reference_variance = np.var(np.median(samples, axis=1), ddof=1)
    assert moments["variance_factor"] == pytest.approx(reference_variance, rel=.025)
    np.testing.assert_array_equal(moments["cross_covariance_factor"], 0.)
    np.testing.assert_allclose(moments["rank_weights"], 1/20)
    assert reference_moments(np.array([0.]), np.array([1.]))["variance_factor"] == 1.


@pytest.mark.parametrize("tau", [0., 5.])
def test_propagation_matches_explicit_full_covariance_including_cross_phase_terms(tau):
    baseline = np.array([0., .8, 1.7, 3., 4.])
    selected = np.array([5., 5.2, 6., 9., 11., 15., 21.])
    all_times = np.r_[baseline, selected]
    mask = np.r_[np.zeros(len(baseline), bool), np.ones(len(selected), bool)]
    correlation = np.exp(-np.abs(selected[:, None]-selected[None, :])/tau) if tau else np.eye(len(selected))
    whitening = np.linalg.inv(np.linalg.cholesky(correlation))
    moments = reference_moments(baseline, selected, tau)
    beta, cross = moments["variance_factor"], moments["cross_covariance_factor"]
    raw = correlation+beta*np.ones_like(correlation)-cross[:, None]-cross[None, :]
    objective_covariance = whitening @ raw @ whitening.T
    jacobian = np.column_stack([np.linspace(.1, 2., len(selected)), np.sin(selected)])
    residual = np.array([.1, -.2, .1, .3, -.1, -.2, .2])
    curve = dict(time=all_times, fit_mask=mask, on=5., **baseline_reference(all_times, 5.))
    result, metadata = propagate_baseline(jacobian, residual, [curve], tau)
    influence = np.linalg.solve(jacobian.T @ jacobian, jacobian.T)
    hat = jacobian @ influence
    variance = residual @ residual/np.trace((np.eye(len(selected))-hat) @ objective_covariance)
    expected = variance*influence @ objective_covariance @ influence.T
    np.testing.assert_allclose(result, expected, atol=1e-12, rtol=1e-10)
    assert metadata["kinetic_observations"] == len(selected)
    assert metadata["free_parameters"] == jacobian.shape[1]
    assert metadata["references"][0]["raw_cross_phase_covariance_included"] == (tau > 0)


def test_ou_median_covariance_against_independently_generated_correlated_raw_data():
    base = np.arange(6.)
    selected = np.array([6., 7., 10., 16.])
    all_times, tau = np.r_[base, selected], 3.
    covariance = np.exp(-np.abs(all_times[:, None]-all_times[None, :])/tau)
    raw = np.random.default_rng(772).normal(size=(80000, len(all_times))) @ np.linalg.cholesky(covariance).T
    normalized = raw[:, len(base):]-np.median(raw[:, :len(base)], axis=1)[:, None]
    moments = reference_moments(base, selected, tau)
    cross, beta = moments["cross_covariance_factor"], moments["variance_factor"]
    expected = covariance[len(base):, len(base):]+beta-cross[:, None]-cross[None, :]
    np.testing.assert_allclose(expected, np.cov(normalized, rowvar=False), atol=.025, rtol=.04)


def test_reference_uncertainty_is_not_double_counted_when_a_free_offset_already_absorbs_it():
    selected = np.arange(10., 50.)
    times = np.arange(50.)
    jacobian = np.column_stack([np.ones(len(selected)), selected-selected.mean()])
    residual = np.random.default_rng(6).normal(size=len(selected))
    covariance, metadata = propagate_baseline(jacobian, residual, [dict(time=times, fit_mask=times >= 10., on=10., **baseline_reference(times, 10.))])
    conditional = np.linalg.inv(jacobian.T @ jacobian)*(residual @ residual)/(len(selected)-2)
    assert covariance[1, 1] == pytest.approx(conditional[1, 1], rel=1e-10)
    assert covariance[0, 0] > conditional[0, 0]
    assert metadata["residual_variance_trace"] == pytest.approx(len(selected)-2)


def test_no_reference_no_new_parameters_and_invalid_or_overlapping_references_are_not_silently_used():
    t = np.arange(20.)
    curve = dict(time=t, fit_mask=t >= 5., on=5.)
    jacobian = np.linspace(1., 2., 15)[:, None]
    covariance, metadata = propagate_baseline(jacobian, np.ones(15), [curve])
    assert covariance is None and not metadata["applied"]
    curve.update(baseline_estimated=True, baseline_reference_times=np.array([0., 7.]))
    with pytest.raises(ValueError, match="distinct"):
        propagate_baseline(jacobian, np.ones(15), [curve])


def test_fits_objectives_masks_and_derived_values_are_unchanged_but_errors_include_the_baseline():
    data, include, windows = prepared()
    curves = prepare_curves([data], include, windows)
    fixed_reference = [{key: value for key, value in curve.items() if not key.startswith("baseline_")} for curve in curves]
    fitted = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1)
    conditional = fit_mechanism(fixed_reference, "langmuir", parameter_defaults("langmuir"), starts=1)
    assert fitted["values"] == conditional["values"]
    assert fitted["rss"] == conditional["rss"]
    assert fitted["information_criteria"] == conditional["information_criteria"]
    assert fitted["n_parameters"] == conditional["n_parameters"] == 3
    assert fitted["n_observations"] == conditional["n_observations"] == 805
    assert fitted["baseline_uncertainty"]["applied"]
    assert "baseline propagation" in fitted["uncertainty_method"]
    assert derived_affinities(fitted).iloc[0].value == derived_affinities(conditional).iloc[0].value
    assert derived_affinities(fitted).iloc[0].model_se > 2*derived_affinities(conditional).iloc[0].model_se
    np.testing.assert_array_equal(fitted["curves"][0]["fit_mask"], conditional["curves"][0]["fit_mask"])


def test_reference_metadata_and_times_participate_in_saved_analysis_identity():
    data, include, windows = prepared()
    curves = prepare_curves([data], include, windows)
    changed = deepcopy(curves)
    changed[0]["baseline_reference_times"] = changed[0]["baseline_reference_times"][1:]
    assert input_fingerprint(curves) != input_fingerprint(changed)
    changed = deepcopy(curves)
    changed[0]["baseline_estimated"] = False
    assert input_fingerprint(curves) != input_fingerprint(changed)


def test_legacy_shared_and_individual_engines_use_the_same_propagation_and_keep_original_reference_grid():
    data, include, _ = prepared()
    curves = app._collect_kinetic_curves([data], include, 20., 100.)
    downsampled = app.downsample_curve_object(curves[0], 50)
    assert len(downsampled["baseline_mask"]) == len(downsampled["time"])
    np.testing.assert_array_equal(downsampled["baseline_reference_times"], curves[0]["baseline_reference_times"])
    fit = app._shared_kinetics_fit(curves, 20., 100., allow_curve_offsets=False, seed_from_individual=False)
    assert fit["baseline_uncertainty"]["applied"]
    single = app.fit_kinetics_advanced(data["time"], data["responses"][50.], 50e-9, 20., 100., show_warnings=False)
    assert single["baseline_uncertainty"]["applied"]
    assert "baseline propagation" in single["uncertainty_method"]


def test_kobs_with_free_constant_offset_is_invariant_to_reference_level():
    data, _, _ = prepared()
    original = app.fit_kobs_from_association(data["time"], data["responses"][50.], 20., 100.)
    shifted = data["responses"][50.].copy()
    shifted[data["time"] < 20.] += 5.
    changed = app.fit_kobs_from_association(data["time"], shifted, 20., 100.)
    assert changed["kobs"] == pytest.approx(original["kobs"], rel=1e-6)


def test_relative_trace_weights_and_linked_parameters_match_full_block_covariance():
    rng = np.random.default_rng(14)
    counts, scales = [12, 17], [1., 3.]
    curves, blocks, covariances = [], [], []
    for count, sd in zip(counts, scales):
        times = np.arange(float(5+count))
        curves.append(dict(time=times, on=5., fit_mask=times >= 5., relative_sd=sd, **baseline_reference(times, 5.)))
        blocks.append(rng.normal(size=(count, 3))/sd)
        beta = reference_moments(times[:5], times[5:])["variance_factor"]
        covariances.append(np.eye(count)+beta*np.ones((count, count)))
    jacobian, residual = np.vstack(blocks), rng.normal(size=sum(counts))
    covariance, _ = propagate_baseline(jacobian, residual, curves)
    full = np.zeros((sum(counts), sum(counts)))
    full[:counts[0], :counts[0]], full[counts[0]:, counts[0]:] = covariances
    influence = np.linalg.solve(jacobian.T @ jacobian, jacobian.T)
    expected = (influence @ full @ influence.T)*(residual @ residual)/np.trace((np.eye(len(residual))-jacobian @ influence) @ full)
    np.testing.assert_allclose(covariance, expected, rtol=1e-10)


def test_analysis_method_exports_record_the_repaired_uncertainty_and_primary_source():
    data, include, windows = prepared()
    fit = fit_mechanism(prepare_curves([data], include, windows), "langmuir", parameter_defaults("langmuir"), starts=1)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        write_methods_exports(archive, {"Kinetic": fit})
    with zipfile.ZipFile(io.BytesIO(buffer.getvalue())) as archive:
        methods = json.loads(archive.read("methods/equations_and_sources.json"))
        assert "baseline_propagation" in methods["equations"]
        assert "jcgm2008" in methods["references"]
        assert methods["run"]["Kinetic"]["baseline_uncertainty"]["applied"]
        assert "baseline propagation" in methods["run"]["Kinetic"]["uncertainty_method"]

