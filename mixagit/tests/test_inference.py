from copy import deepcopy
from dataclasses import replace
import io
import zipfile

import numpy as np
import pytest

from mixa_inference import (adaptive_profile, coordinate_scales, estimates, omission_review, predict, refit, refit_sampling,
                            review_problem, sampling_setup, simulate_curves, write_review_exports)
from mixa_mechanisms import fit_mechanism, parameter_defaults


def truth(t, c, kon=1.2e5, koff=.012, capacity=90.):
    rate = kon*c+koff
    duration = np.maximum(np.minimum(t, 100.)-20., 0.)
    return capacity*kon*c/rate*(1-np.exp(-rate*duration))*np.exp(-koff*np.maximum(t-100., 0.))


def example(repeats=1, per_curve=False, seed=13):
    rng, t = np.random.default_rng(seed), np.arange(0., 181., 4.)
    curves = []
    for r in range(repeats):
        for conc in [15., 50., 150., 500.]:
            curves.append(dict(filename=f"f{r}", repeat_id=f"r{r}", concentration_M=conc*1e-9, concentration_nM=conc,
                on=20., off=100., time=t, response=truth(t, conc*1e-9)+rng.normal(0., .15, len(t)),
                fit_mask=((t >= 28) & (t <= 92)) | ((t >= 112) & (t <= 172))))
    rules = [replace(rule, scope="Per curve" if per_curve else "Global") if rule.key == "Rmax" else rule
             for rule in parameter_defaults("langmuir")]
    fit = fit_mechanism(curves, "langmuir", rules, starts=1)
    return fit, review_problem(fit)


def test_refit_reproduces_saved_objective_and_does_not_mutate_main_fit():
    fit, problem = example()
    before = deepcopy(fit)
    checked = refit(problem, starts=2)
    assert checked["rss"] == pytest.approx(fit["rss"], rel=1e-7)
    assert checked["values"]["kon::all"] == pytest.approx(fit["values"]["kon::all"], rel=1e-5)
    assert fit["values"] == before["values"]
    for curve, old in zip(fit["curves"], before["curves"]):
        np.testing.assert_array_equal(curve["response"], old["response"])
    fit["curves"][0]["fitted"][0] += .01
    with pytest.raises(ValueError, match="prediction"):
        review_problem(fit)


def test_adaptive_profile_resolves_both_crossings_with_nuisance_refits():
    _, problem = example()
    profile = adaptive_profile(problem, "kon::all", starts=1, runtime_s=30.)
    meta, table = profile["metadata"], profile["table"]
    assert meta["lower_status"] == meta["upper_status"] == "Crossing resolved"
    assert meta["lower"] < meta["estimate"] < meta["upper"]
    assert not meta["better_optimum_found"]
    assert (table.likelihood_ratio > meta["threshold"]).any()
    assert (table.likelihood_ratio < meta["threshold"]).any()
    assert "N*log" in meta["method"]


def test_profile_open_bounds_and_runtime_are_not_finite_endpoints():
    _, problem = example()
    row = problem["controls"]["kon::all"]
    row.update(lower=row["value"]*.9999, upper=row["value"]*1.0001)
    result = adaptive_profile(problem, "kon::all", starts=1)
    assert result["metadata"]["lower"] is result["metadata"]["upper"] is None
    assert result["metadata"]["lower_status"] == "Open at declared bound"
    result = adaptive_profile(problem, "kon::all", runtime_s=1e-9)
    assert result["metadata"]["lower"] is result["metadata"]["upper"] is None
    assert "Incomplete" in result["metadata"]["upper_status"]


def test_concentration_omissions_never_train_on_held_out_observations():
    _, problem = example()
    payload = omission_review(problem, "Concentration", starts=1)
    cases = payload["cases"]
    assert len(cases) == 4 and (cases.status == "Complete").all()
    assert (cases.training_observations+cases.held_out_observations == problem["n_observations"]).all()
    assert (cases.scored_observations == cases.held_out_observations).all()
    for case in cases.itertuples():
        points = payload["held_out_points"].loc[payload["held_out_points"].omitted == case.omitted]
        assert points.concentration_nM.nunique() == 1
        assert case.held_out_rmse == pytest.approx(np.sqrt(np.mean(points.residual**2)))
    assert any(payload["shifts"].estimate.str.startswith("KD_nM"))


def test_held_out_local_capacity_is_not_leaked_from_the_full_fit():
    _, problem = example(repeats=2, per_curve=True)
    payload = omission_review(problem, "Independent repeat", starts=1)
    assert payload["held_out_points"].empty
    assert (payload["cases"].scored_observations == 0).all()
    assert payload["cases"].prediction_status.str.contains("no training data").all()
    assert payload["shifts"].refit_value.notna().any()
    assert payload["shifts"].status.str.contains("local group omitted").any()


def test_failed_and_unrun_omissions_stay_in_denominators():
    _, problem = example()
    payload = omission_review(problem, "Concentration", runtime_s=1e-9)
    assert len(payload["cases"]) == 4
    assert payload["cases"].status.str.startswith("Not run").all()


def test_sampling_requires_200_complete_refits_and_retains_all_requested_runs():
    _, problem = example()
    result = refit_sampling(problem, draws=20, starts=1, runtime_s=30.)
    assert len(result["runs"]) == result["metadata"]["complete_draws"] == 20
    assert result["summary"].interval95_low.isna().all()
    assert result["summary"].status.str.contains("Insufficient").all()
    samples = result["samples"].pivot(index="draw", columns="estimate", values="value")
    np.testing.assert_allclose(samples["KD_nM::kon::all|koff::all"], samples["koff::all"]/samples["kon::all"]*1e9)
    rerun = refit_sampling(problem, draws=20, starts=1, runtime_s=30.)
    np.testing.assert_array_equal(result["samples"].value, rerun["samples"].value)
    missing = refit_sampling(problem, draws=200, runtime_s=1e-9, interval_method="percentile")
    assert len(missing["runs"]) == 200 and missing["metadata"]["complete_draws"] == 0
    assert missing["summary"].interval95_high.isna().all()
    with pytest.raises(RuntimeError, match="No refit converged"):
        refit_sampling(problem, draws=200, runtime_s=1e-9, interval_method="studentized")


def test_sampling_produces_nonlinear_rate_and_kd_intervals_with_enough_refits():
    _, problem = example()
    result = refit_sampling(problem, draws=200, starts=1, runtime_s=60., measurement_sd=.15)
    assert result["metadata"]["complete_draws"] == 200
    summary = result["summary"].set_index("estimate")
    assert (summary.status == "Available").all()
    for key, value in [("kon::all", 1.2e5), ("koff::all", .012), ("KD_nM::kon::all|koff::all", 100.)]:
        assert summary.at[key, "interval95_low"] < value < summary.at[key, "interval95_high"]


def test_studentized_intervals_invert_per_draw_pivots_with_baseline_aware_scales():
    _, problem = example()
    result = refit_sampling(problem, draws=200, starts=1, runtime_s=90.)
    assert "Studentized" in result["metadata"]["interval_method"]
    summary = result["summary"].set_index("estimate")
    key = "KD_nM::kon::all|koff::all"
    row = summary.loc[key]
    assert row.status == "Available"
    sample = result["samples"].loc[lambda t: t.estimate == key]
    a, b = np.quantile(sample.studentized_pivot, [.025, .975])
    scale = result["metadata"]["base_coordinate_scales"][key]["se"]
    assert row.interval95_low == pytest.approx(row.point_estimate*np.exp(-b*scale))
    assert row.interval95_high == pytest.approx(row.point_estimate*np.exp(-a*scale))
    assert row.interval95_low > 0


def test_analytic_studentization_uses_the_full_two_state_affinity_covariance():
    _, problem = example()
    problem["model"] = "two_state"
    for c in problem["curves"]:
        c["_review_keys"].update(k_forward="k_forward::all", k_reverse="k_reverse::all")
    for key, value in [("k_forward::all", .03), ("k_reverse::all", .009)]:
        problem["controls"][key] = dict(value=value, lower=value/100, upper=value*100, positive=True, fixed=False)
    values = {k: r["value"] for k, r in problem["controls"].items()}
    names = list(values)
    rng = np.random.default_rng(8)
    a = rng.normal(size=(len(names), len(names)))*.01
    cov = a @ a.T
    result = coordinate_scales(problem, dict(values=values, free_names=names, scale_covariance=cov))
    target = "KD_overall_nM::kon::all|koff::all|k_forward::all|k_reverse::all"
    kf, kr = values["k_forward::all"], values["k_reverse::all"]
    g = np.array([-1., 1., 0., -kf/(kf+kr), kf/(kf+kr)])
    assert result[target]["se"] == pytest.approx(np.sqrt(g @ cov @ g))


def test_source_noise_reuses_controls_once_including_the_same_baseline_draw():
    _, problem = example()
    control = dict(id="control", filename="control.csv", concentration_nM=0., role="Negative control",
                   noise_sd=.3, weight=-1., time=problem["curves"][0]["time"], response=np.zeros(46))
    for c in problem["curves"]:
        c["measurement_sources"] = [control]
        c["input_uncertainty_options"] = dict(propagate_measurement=True)
        c.update(baseline_estimated=True, baseline_reference_times=c["time"][c["time"] < 20.])
    setup = sampling_setup(problem)
    simulated = simulate_curves(problem, setup, np.random.default_rng(123))
    values = {k: r["value"] for k, r in problem["controls"].items()}
    errors = [c["response"]-predict(problem, old, values) for c, old in zip(simulated, problem["curves"])]
    for e in errors[1:]:
        np.testing.assert_allclose(e, errors[0], atol=2e-14)
    assert np.median(errors[0][:5]) == pytest.approx(0., abs=1e-14)
    assert setup["source_metadata"][0]["n_target_traces"] == 4


def test_heterogeneous_summaries_use_label_invariant_affinities():
    fit, problem = example()
    problem["model"] = "heterogeneous"
    for c in problem["curves"]:
        c["_review_keys"].update(kon2="kon2::all", koff2="koff2::all", Rmax2="Rmax2::all")
    for key, value in [("kon2::all", 1e4), ("koff2::all", .03), ("Rmax2::all", 40.)]:
        problem["controls"][key] = dict(value=value, lower=value/100, upper=value*100, positive=True, fixed=False)
    values = {k: r["value"] for k, r in problem["controls"].items()}
    a = estimates(problem, values)
    swapped = values.copy()
    for first, second in [("kon", "kon2"), ("koff", "koff2"), ("Rmax", "Rmax2")]:
        swapped[first+"::all"], swapped[second+"::all"] = values[second+"::all"], values[first+"::all"]
    b = estimates(problem, swapped)
    np.testing.assert_array_equal(a.loc[a.kind == "Affinity (nM)", "value"], b.loc[b.kind == "Affinity (nM)", "value"])
    assert a.loc[a.kind == "Parameter", "label_exchangeable"].all()


def test_review_exports_keep_tables_metadata_and_failures():
    fit, problem = example()
    fit["inference_review"] = dict(omissions={"Concentration": omission_review(problem, runtime_s=1e-9)})
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        write_review_exports(archive, "review", fit)
    with zipfile.ZipFile(payload) as archive:
        assert archive.testzip() is None
        assert any(name.endswith("metadata.json") for name in archive.namelist())
        cases = next(name for name in archive.namelist() if name.endswith("cases.csv"))
        assert archive.read(cases).decode().count("Not run") == 4


@pytest.mark.parametrize("model", ["1:1", "1:1+MT"])
def test_legacy_shared_fit_record_reconstructs_actual_objective(model):
    from mixa_app import fit_kinetics_shared_params

    t = np.arange(0., 181., 4.)
    rng = np.random.default_rng(7)
    concentrations = [15., 50., 150., 500.]
    data = [dict(filename="f", repeat_id="r", time=t, concentrations=concentrations,
                 responses={c: truth(t, c*1e-9)+rng.normal(0., .1, len(t)) for c in concentrations})]
    if model == "1:1+MT":
        from mixa_science import delivery_lag_signal

        data[0]["responses"] = {c: delivery_lag_signal(t, 1.2e5, .012, 90., .15, c*1e-9, 20., 100.)+rng.normal(0., .1, len(t)) for c in concentrations}
    result = fit_kinetics_shared_params(data, 20., 100., {"f": set(concentrations)}, model=model)
    problem = review_problem(result)
    assert problem["model"] == ("langmuir" if model == "1:1" else "delivery_lag")
    fit = refit(problem, starts=1)
    assert fit["rss"] == pytest.approx(problem["rss"], rel=1e-5)
