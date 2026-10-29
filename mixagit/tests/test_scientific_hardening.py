"""Scientific regression cases, including adversarial data and missing uncertainty."""

import json
from unittest.mock import patch

import numpy as np
import pytest
from scipy.integrate import solve_ivp

import mixa_app as app
from mixa_figures import independent_summary, kinetic_repeat_points
from mixa_reporting import analyze_repeats
from mixa_science import (conditional_covariance, fit_profile_isotherm, gaussian_information,
                          residual_dependence, scientific_metadata, two_state_affinity)


def dataset(responses, name="repeat.csv", time=None):
    return dict(filename=name, repeat_id=name, repeat_group="Test", time=np.arange(181.) if time is None else time,
                responses=responses, concentrations=sorted(responses))


@pytest.mark.parametrize("model,parameters", [
    (app.model_2_state, [1.2e5, .012, 100., .04, .008, 50e-9, 20., 100.]),
    (app.model_1to1_mass_transport, [1.2e5, .012, 100., .1, 50e-9, 20., 100.]),
])
def test_observation_grid_cannot_change_physical_predictions(model, parameters):
    time = np.arange(181.)
    full = model(time, *parameters)
    for selected in [(time >= 110), ((time >= 32) & (time <= 90)) | ((time >= 110) & (time <= 160)), time == 137]:
        np.testing.assert_allclose(model(time[selected], *parameters), full[selected], atol=1e-8, rtol=1e-10)
    irregular = np.array([21.2, 47.1, 99.999, 100., 100.001, 131.2, 175.4])
    np.testing.assert_allclose(model(irregular, *parameters), model(np.r_[0., irregular, 500.], *parameters)[1:-1], atol=1e-8)


def test_two_state_against_independent_ode_and_one_state_limit():
    time = np.array([20., 21.3, 45., 99., 100., 100.1, 140., 180.])
    kon, koff, rmax, ka, kd, c = 1.2e5, .012, 100., .04, .008, 50e-9

    def rhs(t, state, concentration):
        a, b = state
        return [kon * concentration * (rmax - a - b) - (koff + ka) * a + kd * b, ka * a - kd * b]

    on = solve_ivp(lambda t, s: rhs(t, s, c), (20., 100.), [0., 0.], dense_output=True, rtol=1e-11, atol=1e-11)
    off = solve_ivp(lambda t, s: rhs(t, s, 0.), (100., 180.), on.sol(100.), dense_output=True, rtol=1e-11, atol=1e-11)
    expected = np.array([(on.sol(t) if t <= 100 else off.sol(t)).sum() for t in time])
    np.testing.assert_allclose(app.model_2_state(time, kon, koff, rmax, ka, kd, c, 20., 100.), expected, atol=1e-8)
    np.testing.assert_allclose(app.model_2_state(time, kon, koff, rmax, 0., kd, c, 20., 100.),
                               app.model_1to1(time, kon, koff, rmax, c, 20., 100.), atol=1e-10)


def test_delivery_lag_against_independent_ode():
    time = np.arange(0., 181., 1.7)
    c, kon, koff, rmax, lag = 50e-9, 1.2e5, .012, 100., .1
    on = solve_ivp(lambda t, r: [kon * c * (1 - np.exp(-lag * (t - 20))) * (rmax - r[0]) - koff * r[0]],
                   (20., 100.), [0.], method="DOP853", rtol=1e-11, atol=1e-11, dense_output=True)
    expected = np.zeros_like(time)
    active = (time >= 20) & (time <= 100)
    expected[active] = on.sol(time[active])[0]
    expected[time > 100] = on.sol(100.)[0] * np.exp(-koff * (time[time > 100] - 100))
    np.testing.assert_allclose(app.model_1to1_mass_transport(time, kon, koff, rmax, lag, c, 20., 100.), expected, atol=2e-7)


def test_two_state_overall_affinity_and_full_covariance_gradient():
    parameters = np.array([1.2e5, .012, 100., .04, .008])
    scales = np.array([1e3, .001, 1., .002, .0005])
    correlation = np.full((5, 5), .3) + .7 * np.eye(5)
    covariance = correlation * np.outer(scales, scales)
    kd, se = two_state_affinity(parameters, covariance)
    gradient = np.zeros(5)
    for i, value in enumerate(parameters):
        step = value * 1e-5
        a, b = parameters.copy(), parameters.copy()
        a[i] += step
        b[i] -= step
        affinity = lambda p: p[1] / p[0] * p[4] / (p[3] + p[4])
        gradient[i] = (affinity(a) - affinity(b)) / (2 * step)
    assert kd == pytest.approx(16.6666666667e-9)
    assert se == pytest.approx(np.sqrt(gradient @ covariance @ gradient), rel=1e-8)
    time = np.arange(181.)
    y = app.model_2_state(time, *parameters, 50e-9, 20, 100)
    with patch.object(app, "multi_start_curve_fit", return_value=(parameters, covariance)):
        fit = app.fit_kinetics_advanced(time, y, 50e-9, 20, 100, model="2-state", show_warnings=False)
    assert fit["KD"] == kd
    assert fit["KD_err"] == se
    assert np.isnan(fit["k_obs"])
    assert fit["microscopic_KD_first_step"] == pytest.approx(100e-9)


def test_equilibrium_capacity_not_capped_and_weak_coverage_not_summarized():
    c = np.array([5., 15., 50., 150., 500.])
    fit = fit_profile_isotherm(c, 100 * c / (10000 + c))
    assert fit["KD"] == pytest.approx(10000, rel=1e-5)
    assert fit["Rmax"] == pytest.approx(100, rel=1e-5)
    assert not fit["saturation_coverage"]
    assert not fit["summary_eligible"]
    data = [dataset({value: np.where(np.arange(181.) >= 20, capacity * value / (10000 + value), 0.) for value in c},
                    name=f"repeat{i}") for i, capacity in enumerate([95., 100., 105.])]
    included = {d["filename"]: set(c) for d in data}
    fit["fit_settings"] = dict(equilibrium_sampling_time_s=90., equilibrium_model_code="simple", aggregate_repeats=True,
                               normalize_percent_bmax=False, phase_assoc_start_s=20.)
    with patch("mixa_reporting.project_context", return_value={}):
        report = analyze_repeats(data, included, {"Equilibrium": fit}, {"equilibrium": app.fit_equilibrium_advanced})
    assert set(report["repeat_estimates"].status) == {"Insufficient saturation"}
    assert report["summary"].n_independent.tolist() == [0]
    assert report["summary"]["mean"].isna().all()


def test_noisy_near_linear_isotherm_has_open_upper_profile_limit():
    c = np.array([1., 3., 10., 30., 100.])
    fit = fit_profile_isotherm(c, .05 * c + np.array([.02, -.02, .01, -.03, .02]))
    assert np.isinf(fit["KD_profile_ci95"][1])
    assert not fit["identifiable"]
    assert not fit["summary_eligible"]


@pytest.mark.parametrize("model,hill", [("simple", 1.), ("hill", 1.8)])
def test_saturated_isotherm_recovery_and_interval(model, hill):
    c = np.array([1., 3., 10., 33., 100., 330., 1000.])
    y = 100 * c**hill / (33**hill + c**hill) + np.array([.1, -.1, .1, -.1, .1, -.1, 0.])
    fit = fit_profile_isotherm(c, y, model=model)
    assert fit["KD"] == pytest.approx(33, rel=.02)
    assert fit["n_hill"] == pytest.approx(hill, rel=.02)
    assert fit["KD_profile_ci95"][0] < 33 < fit["KD_profile_ci95"][1]
    assert fit["summary_eligible"]
    if model == "hill":
        assert "half-saturation" in fit["affinity_interpretation"]


def test_flatness_cannot_see_future_and_no_signal_is_not_equilibrium():
    t = np.arange(181.)
    data = [dataset({10.: .1 * t})]
    inc = {"repeat.csv": {10.}}
    before = app.evaluate_equilibrium_attainment(data, inc, 85., t_assoc_start=20)
    data[0]["responses"][10.][t > 85] += 1e8
    after = app.evaluate_equilibrium_attainment(data, inc, 85., t_assoc_start=20)
    assert before == after
    assert not after["equilibrium_reached"]
    data[0]["responses"][10.] = np.zeros(len(t))
    assert not app.evaluate_equilibrium_attainment(data, inc, 85., t_assoc_start=20)["equilibrium_reached"]


def test_rank_loss_and_nonpositive_degrees_of_freedom_are_not_finite_errors():
    duplicate = np.column_stack([np.arange(10.), np.arange(10.) * 1000])
    assert conditional_covariance(duplicate, np.ones(10))["covariance"] is None
    result = conditional_covariance(np.eye(3), np.ones(3))
    assert result["degrees_of_freedom"] == 0
    assert result["covariance"] is None


def test_residual_screen_does_not_join_separate_windows():
    rng = np.random.default_rng(2)
    r = rng.normal(size=200)
    for i in range(1, len(r)):
        r[i] += .9 * r[i - 1]
    mask = np.ones(200, dtype=bool)
    mask[50:100] = False
    report = residual_dependence(r, mask)
    assert report["serial_correlation_flag"]
    assert report["adjacent_pairs"] == 148


def test_selected_observation_criteria_count_residual_variance():
    r = np.full(20, 10.)
    result = gaussian_information(r, 3)
    ll = -.5 * 20 * (np.log(2 * np.pi * 100) + 1)
    assert result["k"] == 4
    assert result["aicc"] == pytest.approx(-2 * ll + 2 * 4 + 2 * 4 * 5 / (20 - 4 - 1))
    assert np.isinf(gaussian_information(r[:5], 3)["aicc"])


def test_incomplete_candidate_is_never_rewarded_for_dropping_traces():
    curves = [dict(filename=f"file{i}", rmax_group=f"file{i}", time=np.arange(40.), response=np.ones(40),
                   concentration_M=i + 1., concentration_nM=i + 1., fit_mask=np.arange(40.) >= 20) for i in range(3)]

    def fake_fit(*args, **kwargs):
        code = kwargs["model"]
        if code == "1:1+MT" and args[2] != 1.:
            return None
        return dict(residuals_fit=np.full(20, 10.), residuals=np.full(40, 1e8),
                    n_params={"1:1": 3, "1:1+MT": 4, "2-state": 5}[code], r_squared=.9, quality_score=90.)

    with patch.object(app, "_collect_kinetic_curves", return_value=curves), patch.object(app, "fit_kinetics_advanced", side_effect=fake_fit):
        result = app.evaluate_kinetic_model_candidates([], 0, 20, {})
    table = {row["code"]: row for row in result["table"]}
    assert table["1:1+MT"]["Comparable"] is False
    assert np.isinf(table["1:1+MT"]["Total AICc"])
    assert table["1:1"]["N Points"] == 60
    assert table["1:1"]["N Params"] == 12
    assert table["1:1"]["Total RSS"] == 6000
    assert result["recommended"]["code"] == "1:1"
    assert result["nested_tests"] == []


def test_bootstrap_unavailability_is_explicit_not_a_relabelled_covariance():
    t = np.arange(0., 181., 2.)
    data = [dataset({c: app.model_1to1(t, 1.2e5, .012, 100., c * 1e-9, 20., 100.) for c in [15., 50., 500.]}, time=t)]
    fit = app.fit_kinetics_shared_params(data, 20., 100., {"repeat.csv": {15., 50., 500.}}, do_bootstrap=True)
    assert fit["bootstrap_diagnostics"]["status"] == "Unavailable"
    assert "bootstrap" not in fit
    assert "Conditional IID" in fit["uncertainty_method"]
    assert any("unavailable" in text for text in fit["scientific_warnings"])
    assert all(row["Rmax_err"] >= 0 and np.isfinite(row["Rmax_err"]) for row in fit["individual_fits"])


def test_correlated_residual_warning_reaches_shared_result():
    t = np.arange(181.)
    responses = {c: app.model_1to1(t, 1.2e5, .012, 100., c * 1e-9, 20., 100.) + .2 * np.sin(t / 5)
                 for c in [15., 50., 500.]}
    fit = app.fit_kinetics_shared_params([dataset(responses)], 20, 100, {"repeat.csv": set(responses)})
    assert any(f["residual_dependence"]["serial_correlation_flag"] for f in fit["individual_fits"])
    assert any("Serially correlated" in warning for warning in fit["scientific_warnings"])
    assert "IID" in fit["uncertainty_method"]


def test_included_measurements_do_not_disappear_when_their_fit_fails():
    time = np.arange(8.)
    data = [dataset({10.: np.ones(8) * value}, name=f"repeat{i}", time=time) for i, value in enumerate([1., 3., 8.])]
    result = {"individual_fits": [dict(filename=d["filename"], concentration=10., response_plot=d["responses"][10.],
                                       fitted=np.ones(8), fitted_plot=np.ones(8), fit_mask=np.ones(8, dtype=bool)) for d in data[:2]],
              "curve_observations": [dict(filename=d["filename"], concentration_nM=10., response=d["responses"][10.],
                                           fit_mask=np.ones(8, dtype=bool)) for d in data]}
    points = kinetic_repeat_points(result, data)
    table = independent_summary(points, ["concentration_nM", "time_s"], "response")
    assert table.n_independent.tolist() == [3] * 8
    np.testing.assert_allclose(table["mean"], 4.)
    assert not points.loc[points.repeat_id == "repeat2", "fit_available"].any()
    assert points.loc[points.repeat_id == "repeat2", "fitted"].isna().all()


def test_missing_concentration_sem_is_not_invented_for_weighting():
    t = np.arange(181.)
    c = [5., 15., 50., 150., 500.]
    data = [dataset({value: app.model_1to1(t, 1.2e5, .012, 100 + i * 5, value * 1e-9, 20, 100)
                     for value in (c if i == 0 else c[:2])}, name=f"repeat{i}") for i in range(2)]
    inc = {d["filename"]: set(d["concentrations"]) for d in data}
    fit = app.fit_kobs_linearization(data, inc, 20, 100)
    assert fit["concentration_table"].kobs_n.tolist() == [2, 2, 1, 1, 1]
    assert fit["concentration_table"].kobs_sd.iloc[2:].isna().all()
    assert fit["weighting"].startswith("Unweighted")


def test_open_profile_endpoints_have_explicit_valid_json_metadata():
    c = np.array([1., 3., 10., 30., 100.])
    result = fit_profile_isotherm(c, .05 * c + np.array([.02, -.02, .01, -.03, .02]))
    metadata = scientific_metadata(result)
    payload = json.dumps(metadata, allow_nan=False)
    assert json.loads(payload)["profile_upper_limit_open"]
    assert metadata["KD_profile_ci95"][1] is None


@pytest.mark.parametrize("code,model,parameters", [
    ("2-state", app.model_2_state, [1.2e5, .012, 100., .04, .008]),
    ("1:1+MT", app.model_1to1_mass_transport, [1.2e5, .012, 100., .1]),
])
def test_advanced_optimizer_recovers_identifiable_synthetic_parameters(code, model, parameters):
    t = np.arange(0., 181., 2.)
    y = model(t, *parameters, 150e-9, 20., 100.)
    fit = app.fit_kinetics_advanced(t, y, 150e-9, 20., 100., model=code, show_warnings=False)
    fields = ["kon", "koff", "Rmax", "ka", "kd"] if code == "2-state" else ["kon", "koff", "Rmax", "kmt"]
    np.testing.assert_allclose([fit[key] for key in fields], parameters, rtol=1e-4)
    assert not fit["residual_dependence"]["serial_correlation_flag"]


def test_weighted_likelihood_is_invariant_to_relative_weight_scale():
    r, sigma = np.array([1., -.5, .2, .4, -.3]), np.array([1., 2., 3., 4., 5.])
    first = gaussian_information(r, 2, sigma=sigma)
    second = gaussian_information(r, 2, sigma=sigma * 100)
    assert first["aic"] == pytest.approx(second["aic"], abs=1e-10)
    assert first["bic"] == pytest.approx(second["bic"], abs=1e-10)
    assert np.isinf(gaussian_information(np.zeros(10), 2)["aic"])


def test_excluded_dataset_cannot_limit_equilibrium_sampling():
    t = np.arange(181.)
    concentrations = [3.3, 10., 33., 100., 330.]
    included = dataset({c: np.where(t >= 20, 100 * c / (33 + c), 0.) for c in concentrations})
    excluded = dataset({c: np.zeros(10) for c in concentrations}, name="excluded.csv", time=np.arange(10.))
    fit = app.fit_equilibrium_advanced([included, excluded], 90, {"repeat.csv": set(concentrations), "excluded.csv": set()}, t_assoc_start=20.)
    assert fit["KD"] == pytest.approx(33., rel=1e-5)
    assert set(fit["repeat_response_table"].repeat_id) == {"repeat.csv"}
