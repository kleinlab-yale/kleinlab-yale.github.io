"""Physical and fitted-objective checks for one-analyte contact closure with transport."""
from dataclasses import replace

import numpy as np
import pytest
from scipy.optimize import minimize_scalar

import mixa_mechanisms as mechanisms
from mixa_input_uncertainty import input_options
from mixa_mechanisms import (
    binding_prediction, contact_closure_transport_limit_rules,
    cross_validate_omitted_concentration, fit_mechanism, parameter_defaults,
)

MODEL = "contact_closure_transport_limit"


def make_curves(amplitudes=(1.1,), *, same_repeat=False, noise=0., budget=None):
    parameters = {rule.key: rule.initial for rule in contact_closure_transport_limit_rules()}
    times = np.linspace(0., 300., 121)
    rng = np.random.default_rng(42)
    curves = []
    for index, amplitude in enumerate(amplitudes):
        for concentration in [15.63, 62.5, 125.]:
            p = {**parameters, "Rmax": amplitude}
            response = binding_prediction(times, concentration*1e-9, 20., 160., p, MODEL)
            curves.append(dict(
                filename=f"sensor_series_{index}.csv", repeat_id="shared" if same_repeat else f"repeat_{index}",
                concentration_nM=concentration, concentration_M=concentration*1e-9,
                time=times, response=response+rng.normal(0., noise, len(times)),
                fit_mask=times>=20., on=20., off=160.,
                **({"input_uncertainty_options": budget} if budget else {}),
            ))
    return curves


def capacity_only_rules(scope="Per file", lower=1e-9):
    return [replace(rule, fixed=rule.key!="Rmax", scope=scope if rule.key=="Rmax" else "Per file",
                    lower=lower if rule.key=="Rmax" else rule.lower)
            for rule in contact_closure_transport_limit_rules()]


def test_equilibrium_and_equal_analyte_mass():
    p = {rule.key: rule.initial for rule in contact_closure_transport_limit_rules()}
    p["Rmax"] = 1.4
    concentration = 80e-9
    response, parts = binding_prediction(np.array([0., 100., 1000., 20000.]), concentration, 0., 21000., p,
                                         MODEL, return_components=True)
    kd = p["KD_first_contact_M"]/(1+p["kclose"]/p["kopen"])
    assert response[-1] == pytest.approx(p["Rmax"]*concentration/(kd+concentration), rel=2e-6)
    np.testing.assert_allclose(response, parts["state_1_response"]+parts["state_2_response"])
    assert parts["two_contact_fraction"][-1]/parts["initial_contact_fraction"][-1] == pytest.approx(
        p["kclose"]/p["kopen"], rel=2e-6)


def test_physical_phase_history_is_independent_of_observation_trimming():
    p = {rule.key: rule.initial for rule in contact_closure_transport_limit_rules()}
    times = np.linspace(0., 300., 151)
    full = binding_prediction(times, 62.5e-9, 20., 160., p, MODEL)
    for mask in [times>190., ((times>40.) & (times<120.)) | (times>190.)]:
        trimmed = binding_prediction(times[mask], 62.5e-9, 20., 160., p, MODEL)
        np.testing.assert_allclose(trimmed, full[mask], rtol=2e-6, atol=2e-8)
    assert np.all(full[times<20.] == 0.)
    with pytest.raises(ValueError, match="already includes"):
        binding_prediction(times, 62.5e-9, 20., 160., p, MODEL, "Two-compartment transport")


def test_rmax_shared_across_files_when_repeat_linkage_is_requested():
    curves = make_curves((1., 1.2), same_repeat=True)
    fit = fit_mechanism(curves, MODEL, capacity_only_rules("Per repeat"), starts=1)
    assert fit["n_parameters"] == 1
    assert len(fit["free_parameters"]) == 1
    assert fit["values"]["Rmax::shared"] == pytest.approx(1.1, rel=2e-6)
    assert {round(c["parameters"]["Rmax"], 8) for c in fit["curves"]} == {round(fit["values"]["Rmax::shared"], 8)}


@pytest.mark.parametrize("lower", [2e-7, .5])
def test_profiled_capacity_honors_declared_lower_bound(lower):
    curves = make_curves((lower/10.,))
    rules = [replace(rule, initial=max(rule.initial, lower)) if rule.key=="Rmax" else rule
             for rule in capacity_only_rules(lower=lower)]
    fit = fit_mechanism(curves, MODEL, rules, starts=1)
    assert fit["curves"][0]["parameters"]["Rmax"] == pytest.approx(lower, rel=1e-8)
    assert "total_Rmax_lower" in fit["active_bounds"]


def test_robust_fit_optimizes_capacity_for_the_requested_loss():
    curves = make_curves((1.1,))
    curves[0]["response"] = curves[0]["response"].copy()
    curves[0]["response"][80] += 20.
    rules = capacity_only_rules()
    fit = fit_mechanism(curves, MODEL, rules, starts=1, loss="soft_l1", f_scale=.01)
    f = np.concatenate([binding_prediction(c["time"][c["fit_mask"]], c["concentration_M"], c["on"], c["off"],
        {**fit["curves"][0]["parameters"], "Rmax": 1.}, MODEL) for c in curves])
    y = np.concatenate([c["response"][c["fit_mask"]] for c in curves])
    expected = minimize_scalar(lambda a: np.sum(2*.01**2*(np.sqrt(1+((a*f-y)/.01)**2)-1)),
                               bounds=(1e-9, 2.), method="bounded").x
    assert fit["curves"][0]["parameters"]["Rmax"] == pytest.approx(expected, rel=2e-5)
    assert fit["n_profiled_parameters"] == 0
    assert fit["covariance"] is None


def test_budget_propagation_is_applied_to_contact_model():
    curves = make_curves(noise=2e-4)
    rules = contact_closure_transport_limit_rules()
    conditional = fit_mechanism(curves, MODEL, rules, starts=1, seed=17)
    options = input_options({"stock_cv": .05, "propagate_measurement": False})
    with_budget = fit_mechanism([{**c, "input_uncertainty_options": options} for c in curves], MODEL, rules, starts=1, seed=17)
    assert with_budget["input_uncertainty"]["applied"]
    np.testing.assert_allclose(list(with_budget["values"].values()), list(conditional["values"].values()), rtol=1e-10)
    key = next(k for k in with_budget["free_parameters"] if k.startswith("KD_first_contact_M::"))
    index = with_budget["free_parameters"].index(key)
    expected_extra = (.05*with_budget["values"][key])**2
    actual_extra = with_budget["covariance"][index,index]-conditional["covariance"][index,index]
    assert actual_extra == pytest.approx(expected_extra, rel=.02)


def test_completed_fit_survives_timeout_in_a_later_start(monkeypatch):
    curves = make_curves(noise=1e-4)
    original_clock = mechanisms.time.perf_counter
    original_fit = mechanisms.least_squares
    offset = [0.]

    def solve(*args, **kwargs):
        result = original_fit(*args, **kwargs)
        offset[0] = 1000.
        return result

    monkeypatch.setattr(mechanisms.time, "perf_counter", lambda: original_clock()+offset[0])
    monkeypatch.setattr(mechanisms, "least_squares", solve)
    fit = fit_mechanism(curves, MODEL, contact_closure_transport_limit_rules(), starts=2, runtime_s=10.)
    assert fit["timed_out"]
    assert np.isfinite(fit["rss"])
    assert all(np.isfinite(c["fitted"]).all() for c in fit["curves"])


def test_omitted_dose_uses_the_training_capacity_for_each_file():
    curves = make_curves((.9, 1.3), same_repeat=True)
    result = cross_validate_omitted_concentration(curves, capacity_only_rules(), starts=1)
    assert result["n_folds"] == 3
    assert result["n_test_curves"] == 6
    assert result["pooled_cv_rmse_nm"] < 1e-7
    for row in result["folds"]:
        expected = .9 if row["filename"].endswith("0.csv") else 1.3
        assert row["Rmax_train"] == pytest.approx(expected, rel=2e-6)


def test_generic_response_scale_does_not_inherit_mcam_capacity_ceiling():
    rule = next(r for r in parameter_defaults(MODEL, response_scale=100.) if r.key=="Rmax")
    assert rule.initial >= 100.
    assert rule.upper > 100.


def test_unconverged_candidate_is_provisional_without_a_reported_covariance():
    curves = make_curves(noise=1e-4)
    fit = fit_mechanism(curves, MODEL, contact_closure_transport_limit_rules(), starts=1, max_nfev=1)
    assert not fit["optimizer_converged"]
    assert fit["covariance"] is None
    assert "did not converge" in fit["covariance_status"]
