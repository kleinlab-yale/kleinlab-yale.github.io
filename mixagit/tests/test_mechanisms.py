from dataclasses import replace

import numpy as np
import pytest

from mixa_mechanisms import (Parameter, _whiten, assay_guidance, binding_prediction, derived_affinities,
                             expand_parameter_controls, fit_mechanism, fit_single_cycle_kinetics, local_precision,
                             mechanistic_to_kinetic_summary, parameter_defaults, prepare_curves, profile_parameter,
                             refit_independent_repeats, single_cycle_prediction, stoichiometry_from_capacity)


WINDOWS = dict(phase_assoc_start_s=20., phase_dissoc_start_s=100., fit_assoc_start_s=32., fit_assoc_end_s=90.,
               fit_dissoc_start_s=110., fit_dissoc_end_s=160.)


def parameters(model="langmuir", **kwargs):
    return {rule.key: rule.initial for rule in parameter_defaults(model, **kwargs)}


def make_curves(model="langmuir", transport="None", repeats=1, noise=0.):
    p = parameters(model, transport=transport)
    t, rng, curves = np.arange(0., 181., 3.), np.random.default_rng(3), []
    for repeat in range(repeats):
        for conc in [15., 50., 500.]:
            y = binding_prediction(t, conc * 1e-9, 20., 100., p, model, transport)
            curves.append(dict(filename=f"file{repeat}", repeat_id=f"repeat{repeat}", concentration_nM=conc,
                               concentration_M=conc * 1e-9, time=t, response=y + rng.normal(0., noise, len(t)),
                               fit_mask=((t >= 32) & (t <= 90)) | ((t >= 110) & (t <= 160)), on=20., off=100.))
    return curves


@pytest.mark.parametrize("model", ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"])
@pytest.mark.parametrize("transport", ["None", "Two-compartment transport"])
def test_mechanism_prediction_invariant_to_observation_selection(model, transport):
    p = parameters(model, transport=transport)
    t = np.arange(181.)
    y = binding_prediction(t, 50e-9, 20., 100., p, model, transport)
    for subset in [(t >= 110), ((t >= 32) & (t <= 90)) | ((t >= 110) & (t <= 160))]:
        np.testing.assert_allclose(binding_prediction(t[subset], 50e-9, 20., 100., p, model, transport), y[subset], atol=1e-5, rtol=1e-6)


def test_bivalent_counts_bound_analyte_not_occupied_surface_sites():
    t = np.arange(0., 500., 2.)
    p = parameters("bivalent")
    p["kon2"], p["koff2"] = .01, .0001
    y, components = binding_prediction(t, 50e-9, 20., 200., p, "bivalent", return_components=True)
    single, double = components["state_1_response"], components["state_2_response"]
    np.testing.assert_allclose(y, single + double)
    assert np.max(single + 2 * double) <= p["Rmax"] * (1 + 1e-7)
    assert np.max(double) > 1.
    p["kon2"] = 0.
    mono = parameters()
    mono["kon"] *= 2
    np.testing.assert_allclose(binding_prediction(t, 50e-9, 20., 200., p, "bivalent"),
                               binding_prediction(t, 50e-9, 20., 200., mono), atol=1e-5)


def test_sequential_adds_second_analyte_mass_and_recovers_binding_polynomial():
    p = parameters("sequential")
    c = 200e-9
    t = np.array([0., 100., 1000., 10000.])
    y, components = binding_prediction(t, c, 0., 10001., p, "sequential", return_components=True)
    one, two = p["kon"] * c / p["koff"], p["kon2"] * c / p["koff2"]
    expected = p["Rmax"] * (one + 2 * one * two) / (1 + one + one * two)
    assert y[-1] == pytest.approx(expected, rel=1e-6)
    np.testing.assert_allclose(y, components["state_1_response"] + components["state_2_response"])


def test_transport_depletion_rebinding_and_fast_transport_limit():
    t = np.arange(0., 181., 2.)
    p = parameters(transport="Two-compartment transport")
    p["k_exchange"] = .03
    y, components = binding_prediction(t, 50e-9, 20., 100., p, transport="Two-compartment transport", return_components=True)
    surface = components["surface_concentration_M"]
    assert 0 < surface[t == 60][0] < 50e-9
    assert surface[t == 110][0] > 0
    assert np.min(surface) >= -1e-12
    p["k_exchange"] = 1e6
    fast = binding_prediction(t, 50e-9, 20., 100., p, transport="Two-compartment transport")
    np.testing.assert_allclose(fast, binding_prediction(t, 50e-9, 20., 100., p), atol=2e-5)


def test_quasi_steady_transport_is_not_a_delivery_lag():
    t = np.arange(181.)
    p = parameters(transport="Quasi-steady 1:1 transport")
    p["k_transport"] = 1e6
    y = binding_prediction(t, 100e-9, 20., 100., p, transport="Quasi-steady 1:1 transport")
    ordinary = binding_prediction(t, 100e-9, 20., 100., p)
    assert y[50] < ordinary[50]
    assert y[120] / y[100] > np.exp(-p["koff"] * 20)
    with pytest.raises(ValueError):
        binding_prediction(t, 100e-9, 20., 100., p, "bivalent", "Quasi-steady 1:1 transport")


def test_nonspecific_component_does_not_mutate_specific_component():
    p = parameters("two_state", nonspecific=True)
    t = np.arange(181.)
    y, components = binding_prediction(t, 100e-9, 20., 100., p, "two_state", nonspecific=True, return_components=True)
    np.testing.assert_allclose(components["specific"], binding_prediction(t, 100e-9, 20., 100., p, "two_state"))
    np.testing.assert_allclose(y, components["specific"] + components["nonspecific"])


@pytest.mark.parametrize("model", ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"])
def test_empirical_background_components_match_legacy_phase_behavior(model):
    t = np.array([0., 20., 50., 100., 150., 180.])
    p = parameters(model)
    base = binding_prediction(t, 100e-9, 20., 100., p, model)
    p.update(offset=.25, drift=.01, bulk=2e6, ns_linear=1e5)
    changed, parts = binding_prediction(t, 100e-9, 20., 100., p, model, return_components=True)
    expected_linear = np.array([0., 0., .3, .8, .8, .8])
    np.testing.assert_allclose(parts["nonspecific_linear"], expected_linear, atol=1e-12)
    expected = .25 + .01 * (t - 20.) + .2 * ((t >= 20.) & (t < 100.)) + expected_linear
    np.testing.assert_allclose(changed - base, expected, atol=1e-9)
    np.testing.assert_allclose(changed, sum(parts.values()), atol=1e-9)
    keep = t >= 50
    np.testing.assert_allclose(binding_prediction(t[keep], 100e-9, 20., 100., p, model), changed[keep], atol=1e-8)


def test_empirical_terms_do_not_consume_analyte_in_the_transport_model():
    p = parameters("bivalent", transport="Two-compartment transport", nonspecific=True)
    t = np.arange(0., 181., 3.)
    base, original = binding_prediction(t, 50e-9, 20., 100., p, "bivalent", "Two-compartment transport", True, True)
    p.update(drift=.01, ns_linear=2e5)
    changed, parts = binding_prediction(t, 50e-9, 20., 100., p, "bivalent", "Two-compartment transport", True, True)
    np.testing.assert_array_equal(parts["surface_concentration_M"], original["surface_concentration_M"])
    np.testing.assert_allclose(changed - base, .01 * (t - 20.) + 2e5 * 50e-9 * np.clip(t - 20., 0., 80.))


@pytest.mark.parametrize("coefficient", [-2e5, 2e5])
def test_global_fit_recovers_drift_and_signed_linear_background(coefficient):
    curves = make_curves(noise=.001)
    for curve in curves:
        t, c = curve["time"], curve["concentration_M"]
        curve["response"] += .007 * (t - 20.) + coefficient * c * np.clip(t - 20., 0., 80.)
    rules = parameter_defaults("langmuir", drift=True, linear_nonspecific=True)
    fit = fit_mechanism(curves, "langmuir", rules, starts=1)
    assert fit["n_parameters"] == 7
    assert fit["values"]["kon::all"] == pytest.approx(1e5, rel=.01)
    assert fit["values"]["koff::all"] == pytest.approx(.01, rel=.01)
    assert fit["values"]["ns_linear::all"] == pytest.approx(coefficient, rel=.02)
    slopes = fit["parameter_table"].loc[fit["parameter_table"].parameter == "drift"]
    np.testing.assert_allclose(slopes.value, .007, rtol=.01, atol=0.)
    assert fit["parameter_table"].model_se.notna().all()
    assert fit["background_terms"]["linear_drift"]
    assert fit["background_terms"]["linear_nonspecific"]
    assert not fit["background_terms"]["reversible_nonspecific"]
    assert not next(rule for rule in rules if rule.key == "ns_linear").positive


def test_explicit_scopes_fixed_values_bounds_and_per_instance_overrides():
    curves = make_curves(repeats=2)
    rules = [replace(rule, scope="Per repeat") if rule.key == "kon" else rule for rule in parameter_defaults("langmuir")]
    expanded = expand_parameter_controls(curves, rules)
    assert expanded.key.value_counts().to_dict() == {"kon": 2, "koff": 1, "Rmax": 2}
    fit = fit_mechanism(curves, "langmuir", rules, starts=1, instance_controls={"kon::repeat0": {"initial": 1e5, "fixed": True}})
    row = fit["parameter_table"].set_index("instance").loc["kon::repeat0"]
    assert row.fixed and np.isnan(row.model_se)
    assert fit["n_parameters"] == 4
    assert fit["n_observations"] == sum(c["fit_mask"].sum() for c in curves)
    assert fit["values"]["kon::repeat1"] == pytest.approx(1e5, rel=1e-5)


def test_surface_group_linking_not_csv_identity_controls_capacities():
    curves = make_curves()
    for curve, sensor in zip(curves, ["S1", "S2", "S2"]):
        curve["surface_id"] = sensor
    rules = [replace(rule, scope="Per surface") if rule.key == "Rmax" else rule for rule in parameter_defaults("langmuir")]
    expanded = expand_parameter_controls(curves, rules)
    assert set(expanded.loc[expanded.key == "Rmax", "instance"]) == {"Rmax::S1", "Rmax::S2"}


def test_excluded_points_do_not_affect_objective_or_parameter_recovery():
    curves = make_curves(noise=.03)
    rules = [replace(rule, initial=rule.initial * 1.4) for rule in parameter_defaults("langmuir")]
    fit = fit_mechanism(curves, "langmuir", rules, starts=1)
    for curve in curves:
        curve["response"][~curve["fit_mask"]] += 1e8
    changed = fit_mechanism(curves, "langmuir", rules, starts=1)
    np.testing.assert_allclose(list(fit["values"].values()), list(changed["values"].values()), rtol=1e-8)
    assert fit["values"]["kon::all"] == pytest.approx(1e5, rel=.03)
    assert fit["values"]["koff::all"] == pytest.approx(.01, rel=.03)
    assert derived_affinities(fit).value.iloc[0] == pytest.approx(100., rel=.04)
    assert derived_affinities(fit).model_se.notna().all()


def test_two_state_global_optimizer_not_curvewise_average():
    curves = make_curves("two_state", noise=.002)
    rules = [replace(rule, initial=rule.initial * 1.15) for rule in parameter_defaults("two_state")]
    fit = fit_mechanism(curves, "two_state", rules, starts=1)
    assert fit["n_parameters"] == 5
    for key, true in parameters("two_state").items():
        assert fit["values"][key + ("::file0" if key == "Rmax" else "::all")] == pytest.approx(true, rel=.08)
    kd = derived_affinities(fit).groupby("metric").value.first()
    assert kd["KD_overall_nM"] == pytest.approx(20., rel=.08)


def test_ou_whitening_uses_actual_gaps_and_matches_stationary_ar1():
    t = np.arange(0., 10000., 2.)
    rng = np.random.default_rng(22)
    innovation = rng.normal(size=len(t))
    r = np.zeros_like(t)
    r[0] = innovation[0]
    for i in range(1, len(r)):
        r[i] = .85 * r[i - 1] + np.sqrt(1 - .85**2) * innovation[i]
    tau = -2 / np.log(.85)
    whitened, logdet = _whiten(r, t, tau)
    np.testing.assert_allclose(whitened, innovation, atol=1e-12)
    assert logdet == pytest.approx((len(t) - 1) * np.log(1 - .85**2))
    keep = np.ones(len(t), bool)
    keep[100:200] = False
    whitened_gap, _ = _whiten(r[keep], t[keep], tau)
    assert np.var(whitened_gap) == pytest.approx(1., abs=.06)


def test_gls_covariance_labels_and_repeat_eligibility_are_not_iid():
    curves = make_curves(repeats=2, noise=.03)
    fit = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1, correlation_time=5.)
    assert "fixed-OU" in fit["covariance_status"]
    assert "IID" not in fit["covariance_status"]
    report = refit_independent_repeats(curves, fit, starts=1)
    assert (report["summary"].n_independent == 2).all()


def test_sensitivity_loss_withholds_gaussian_uncertainty():
    fit = fit_mechanism(make_curves(noise=.03), "langmuir", parameter_defaults("langmuir"), starts=1, loss="soft_l1")
    assert fit["covariance"] is None
    assert fit["parameter_table"].model_se.isna().all()
    assert np.isnan(fit["information_criteria"]["aic"])
    with pytest.raises(ValueError):
        profile_parameter(fit, make_curves(), "kon::all")


def test_stoichiometry_requires_calibration_and_active_fraction_not_hill_slope():
    with pytest.raises(ValueError):
        stoichiometry_from_capacity(20., 100., 150000., 50000.)
    report = stoichiometry_from_capacity(20., 100., 150000., 50000., response_ratio=1.)
    assert report["apparent_capacity_ratio"] == pytest.approx(.6)
    assert report["stoichiometry"] is None
    known = stoichiometry_from_capacity(20., 100., 150000., 50000., response_ratio=1., active_fraction=.3)
    assert known["stoichiometry"] == pytest.approx(2.)


def test_assay_orientation_changes_interpretation_not_just_two_to_one_label():
    surface = assay_guidance(dict(immobilized="Receptor", analyte="Ligand", target_process="Receptor dimerization"), "two_state")
    assert any("need not add mass" in note for note in surface)
    inverse = assay_guidance(dict(immobilized="Ligand", analyte="Receptor"), "sequential")
    assert any("second soluble receptor" in note for note in inverse)
    antibody = assay_guidance(dict(immobilized="Antibody", analyte="Receptor", analyte_valency="Monovalent"), "bivalent")
    assert any("does not make" in note for note in antibody)


def test_repeat_refits_count_independent_ids_not_concentrations():
    curves = make_curves(repeats=3, noise=.03)
    parent = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1)
    report = refit_independent_repeats(curves, parent, starts=1, runtime_s=10.)
    assert report["status"].status.tolist() == ["Complete"] * 3
    assert report["summary"].n_independent.tolist() == [3, 3, 3]
    for curve in curves:
        curve["repeat_id"] = "Same experiment"
    report = refit_independent_repeats(curves, parent, starts=1, runtime_s=10.)
    assert report["summary"].n_independent.tolist() == [1, 1, 1]
    assert report["summary"].sd.isna().all()


def test_precision_screen_is_explicit_and_does_not_call_a_fixed_value_an_estimate():
    assert local_precision(1., 1.)["local_precision_status"] == "Locally resolved"
    assert local_precision(1., 1.01)["local_precision_status"] == "Weak local precision"
    assert local_precision(1., np.nan)["local_precision_status"] == "Unavailable"
    assert local_precision(1., np.nan, fixed=True)["local_precision_status"] == "Fixed"


def test_unresolved_rates_stay_in_diagnostics_but_do_not_hide_a_resolved_ratio(monkeypatch):
    import mixa_mechanisms

    curves = make_curves(noise=.03)
    fit = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1)
    vector = np.array([fit["values"][key] if key.startswith(("kon::", "koff::")) else 0.
                       for key in fit["free_parameters"]])
    fit["covariance"] = 4*np.outer(vector, vector)+fit["covariance"]
    for i, key in enumerate(fit["free_parameters"]):
        fit["parameter_table"].loc[fit["parameter_table"].instance == key, "model_se"] = np.sqrt(fit["covariance"][i, i])
    monkeypatch.setattr(mixa_mechanisms, "fit_mechanism", lambda *args, **kwargs: fit)
    report = refit_independent_repeats(curves, fit, starts=1)
    summary = report["summary"].set_index("parameter")
    assert summary.loc["kon", "n_independent"] == summary.loc["koff", "n_independent"] == 0
    assert summary.loc["KD_nM", "n_independent"] == 1
    assert len(report["estimates"]) == 3
    assert report["status"].status.tolist() == ["Complete with unresolved parameters"]
    assert set(report["estimates"].status) == {"Complete", "Unresolved local precision"}


def test_fixed_rate_ratios_do_not_create_fake_zero_repeat_sd():
    curves = make_curves(repeats=3, noise=.03)
    rules = [replace(rule, fixed=True) if rule.key in {"kon", "koff"} else rule
             for rule in parameter_defaults("langmuir")]
    fit = fit_mechanism(curves, "langmuir", rules, starts=1)
    affinities = derived_affinities(fit)
    assert not affinities.estimated.any()
    assert affinities.model_se.isna().all()
    assert refit_independent_repeats(curves, fit, starts=1)["summary"].empty


def test_profile_uses_group_specific_bounds():
    curves = make_curves(noise=.03)
    fit = fit_mechanism(curves, "langmuir", parameter_defaults("langmuir"), starts=1,
                        instance_controls={"kon::all": dict(lower=5e4, upper=2e5)})
    profile = profile_parameter(fit, curves, "kon::all", points=5, runtime_s=10.)
    assert profile["table"].value.between(5e4 * (1 - 1e-12), 2e5 * (1 + 1e-12)).all()
    assert (profile["table"].status == "Converged").all()


@pytest.mark.parametrize("model,transport,target", [
    ("heterogeneous", "None", "kon2"),
    ("bivalent", "None", "kon2"),
    ("sequential", "None", "kon2"),
    ("langmuir", "Quasi-steady 1:1 transport", "k_transport"),
    ("langmuir", "Two-compartment transport", "k_exchange"),
])
def test_conditional_recovery_for_difficult_mechanisms(model, transport, target):
    curves = make_curves(model, transport, noise=.001)
    defaults = parameter_defaults(model, transport=transport)
    rules = [replace(rule, initial=rule.initial * 1.5) if rule.key == target else replace(rule, fixed=True)
             for rule in defaults]
    fit = fit_mechanism(curves, model, rules, transport, starts=1, runtime_s=25.)
    expected = next(rule.initial for rule in defaults if rule.key == target)
    assert fit["values"][target + "::all"] == pytest.approx(expected, rel=.03)
    assert fit["n_parameters"] == 1
    assert not fit["boundary_parameters"]


def test_single_cycle_kinetics_carries_state_across_injections_and_recovers_rates():
    t = np.linspace(0., 360., 361)
    steps = [
        dict(concentration_nM=2., on=20., off=60.),
        dict(concentration_nM=10., on=80., off=120.),
        dict(concentration_nM=50., on=140., off=180.),
        dict(concentration_nM=250., on=200., off=240.),
    ]
    p_true = dict(kon=1.2e5, koff=0.015, Rmax=95.)
    y_sck = single_cycle_prediction(t, steps, p_true, model="langmuir")
    # At the start of step 2 (t=80) and step 3 (t=140), residual bound state from prior steps must still be positive!
    assert y_sck[np.searchsorted(t, 80.)] > 0.4
    assert y_sck[np.searchsorted(t, 140.)] > 2.0
    # Also verify ODE vs analytic agreement for two_state single-cycle
    p_ts = parameters("two_state")
    y_ts_analytic = single_cycle_prediction(t, steps, p_ts, model="two_state")
    y_ts_ode = single_cycle_prediction(t, steps, {**p_ts, "k_exchange": 1e4, "response_to_M": 1e-15},
                                       model="two_state", transport="Two-compartment transport")
    assert np.allclose(y_ts_analytic, y_ts_ode, atol=1e-2)

    rng = np.random.default_rng(42)
    trace = dict(
        filename="sck_rep1.csv",
        repeat_id="Repeat 1",
        time=t,
        response=y_sck + rng.normal(0., 0.05, len(t)),
        fit_mask=t >= 20.,
        steps=steps,
    )
    fit = fit_single_cycle_kinetics([trace], model="langmuir", starts=2, runtime_s=20.)
    assert fit["single_cycle"] is True
    assert fit["values"]["kon::all"] == pytest.approx(p_true["kon"], rel=0.03)
    assert fit["values"]["koff::all"] == pytest.approx(p_true["koff"], rel=0.03)
    assert fit["values"]["Rmax::sck_rep1.csv"] == pytest.approx(p_true["Rmax"], rel=0.03)
    bridged = mechanistic_to_kinetic_summary(fit)
    assert bridged["single_cycle"] is True
    assert bridged["global_KD"] == pytest.approx(p_true["koff"] / p_true["kon"], rel=0.04)


def test_mechanistic_to_kinetic_summary_bridges_models():
    curves = make_curves("two_state", noise=0.01)
    fit = fit_mechanism(curves, "two_state", parameter_defaults("two_state"), starts=1, runtime_s=20.)
    summary = mechanistic_to_kinetic_summary(fit)
    assert summary is not None
    assert summary["model"] == "two_state"
    assert summary["affinity_metric"] == "KD_overall_nM"
    assert np.isfinite(summary["global_KD"]) and summary["global_KD"] > 0
    assert len(summary["individual_fits"]) == len(curves)
    assert summary["mechanistic_source"] is fit

