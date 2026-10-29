"""Equation and decision-gate audit; does not edit or deploy the application.

Exit 1 means a scientific safeguard check failed, not that the app cannot run.
Some decision-gate checks inject results explicitly to isolate reporting logic.
"""

from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for name in ["streamlit", "streamlit.runtime.scriptrunner_utils.script_run_context"]:
    logging.getLogger(name).setLevel(logging.ERROR)

import numpy as np
import pandas as pd
from scipy.integrate import solve_ivp
from scipy.linalg import expm

import mixa_app as app
from mixa_mechanisms import (binding_prediction, derived_affinities, fit_mechanism,
                             parameter_defaults)
from mixa_reporting import summarize_repeats
from mixa_science import fit_profile_isotherm, gaussian_information, json_safe, two_state_signal


CHECKS = []
DESTINATION = ROOT / "preview" / "scientific_audit_2026-10-19"


def check(name, passed, evidence, severity="verification"):
    record = dict(name=name, passed=bool(passed), severity=severity, evidence=evidence)
    CHECKS.append(record)
    print(("PASS" if passed else "FAIL") + ": " + name, flush=True)


def dataset(time, responses, filename="audit.csv"):
    return dict(filename=filename, repeat_id="R1", repeat_group="Audit", time=time,
                concentrations=sorted(responses), responses=responses)


def equation_checks():
    time = np.linspace(0., 180., 181)
    rng = np.random.default_rng(291019)
    errors = {}
    # Independently implement species-balance equations in fractional occupancy.
    for model in ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"]:
        p = {r.key: r.initial for r in parameter_defaults(model)}
        scale = p["Rmax"]

        def rhs(_time, state, concentration):
            x, y = state
            if model == "langmuir":
                return [p["kon"] * concentration * (1 - x) - p["koff"] * x, 0.]
            if model == "heterogeneous":
                return [p["kon"] * concentration * (1 - x) - p["koff"] * x,
                        p["kon2"] * concentration * (p["Rmax2"] / scale - y) - p["koff2"] * y]
            if model == "two_state":
                return [p["kon"] * concentration * (1 - x - y) - (p["koff"] + p["k_forward"]) * x + p["k_reverse"] * y,
                        p["k_forward"] * x - p["k_reverse"] * y]
            if model == "bivalent":
                free = 1 - x - 2 * y
                return [2 * p["kon"] * concentration * free - p["koff"] * x - p["kon2"] * scale * x * free + 2 * p["koff2"] * y,
                        p["kon2"] * scale * x * free - 2 * p["koff2"] * y]
            return [p["kon"] * concentration * (1 - x - y) - p["koff"] * x - p["kon2"] * concentration * x + p["koff2"] * y,
                    p["kon2"] * concentration * x - p["koff2"] * y]

        worst = 0.
        for concentration in [5e-9, 50e-9, 500e-9]:
            association = solve_ivp(lambda ti, s: rhs(ti, s, concentration), (20., 100.), [0., 0.],
                                    method="DOP853", rtol=1e-11, atol=1e-13, dense_output=True)
            dissociation = solve_ivp(lambda ti, s: rhs(ti, s, 0.), (100., 180.), association.sol(100.),
                                     method="DOP853", rtol=1e-11, atol=1e-13, dense_output=True)
            assert association.success and dissociation.success
            states = np.zeros((2, len(time)))
            on = (time >= 20.) & (time <= 100.)
            off = time > 100.
            states[:, on] = association.sol(time[on])
            states[:, off] = dissociation.sol(time[off])
            weights = np.array([1., 2. if model == "sequential" else 1.])
            expected = scale * (weights @ states)
            actual = binding_prediction(time, concentration, 20., 100., p, model)
            worst = max(worst, float(np.max(np.abs(expected - actual))))
        errors[model] = worst
    check("five_binding_schemes_against_separate_fractional_species_ode", max(errors.values()) < 1e-5,
          dict(max_absolute_errors_response_units=errors, note="Numerical agreement for the stated schemes, not proof of experimental mechanism."))

    errors = []
    for _ in range(60):
        kon = 10 ** rng.uniform(3., 8.)
        koff, forward, reverse = 10 ** rng.uniform(-5., 1., 3)
        concentration = 10 ** rng.uniform(-12., -5.)
        a = kon * concentration
        association = np.array([[-a, koff, 0.], [a, -koff - forward, reverse], [0., forward, -reverse]])
        dissociation = association.copy()
        dissociation[:, 0] = 0.
        initial = np.array([100., 0., 0.])
        transition = expm(association * 80.) @ initial
        t = np.array([0., 20., 20.00001, 21., 40., 99.9, 100., 110., 180.])
        expected = []
        for ti in t:
            state = initial if ti < 20. else expm(association * (ti - 20.)) @ initial if ti <= 100. else expm(dissociation * (ti - 100.)) @ transition
            expected.append(state[1:].sum())
        actual = two_state_signal(t, kon, koff, 100., forward, reverse, concentration, 20., 100.)
        errors.append(float(np.max(np.abs(actual - expected))))
    check("two_state_against_three_species_matrix_exponential_sweep", max(errors) < 1e-5,
          dict(cases=60, max_absolute_error_response_units=max(errors), seed=291019,
               parameter_ranges=dict(kon=[1e3, 1e8], unimolecular_rates=[1e-5, 10.], concentration_M=[1e-12, 1e-5])))

    affinities = {}
    for model in ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"]:
        rules = parameter_defaults(model)
        p = {r.key: r.initial for r in rules}
        fit = dict(model=model, parameter_controls=[r.__dict__ for r in rules], free_parameters=[], covariance=None,
                   curves=[dict(filename="one.csv", repeat_id="R1", concentration_nM=50., parameters=p)])
        table = derived_affinities(fit)
        affinities[model] = dict(zip(table.metric, table.value))
    check("mechanism_specific_affinity_definitions", np.isclose(affinities["two_state"]["KD_overall_nM"], 20.) and
          np.isclose(affinities["bivalent"]["KD_macroscopic_capture_nM"], 50.) and
          not any(key in affinities["bivalent"] for key in ["KD_nM", "KD_overall_nM"]),
          dict(values_nM=affinities, note="Definitions follow these rate conventions; no overall avidity KD is implied."))


def transport_checks():
    time = np.linspace(0., 180., 361)
    concentration = 50e-9
    evidence = {}
    for transport in ["Quasi-steady 1:1 transport", "Two-compartment transport"]:
        full = transport == "Two-compartment transport"
        rules = parameter_defaults("langmuir", transport=transport, nonspecific=full)
        p = {rule.key: rule.initial for rule in rules}
        if full:
            p["k_exchange"] = .08

        def rhs(_time, state, bulk):
            x = state[0]
            surface = state[-1] * concentration if full else bulk
            dx = p["kon"] * surface * (1 - x) - p["koff"] * x
            if not full:
                return [dx / (1 + p["kon"] * p["Rmax"] * (1 - x) / p["k_transport"])]
            y, surface_fraction = state[1:]
            dy = p["ns_kon"] * surface * (1 - y) - p["ns_koff"] * y
            uptake = p["Rmax"] * dx + p["ns_Rmax"] * dy
            delivery = p["k_exchange"] * (bulk / concentration - surface_fraction)
            return [dx, dy, delivery - p["response_to_M"] * uptake / concentration]

        initial = np.zeros(3 if full else 1)
        association = solve_ivp(lambda ti, state: rhs(ti, state, concentration), (20., 100.), initial,
                                method="DOP853", rtol=1e-11, atol=1e-13, dense_output=True)
        dissociation = solve_ivp(lambda ti, state: rhs(ti, state, 0.), (100., 180.), association.sol(100.),
                                 method="DOP853", rtol=1e-11, atol=1e-13, dense_output=True)
        assert association.success and dissociation.success
        states = np.zeros((len(initial), len(time)))
        on, off = (time >= 20.) & (time <= 100.), time > 100.
        states[:, on] = association.sol(time[on])
        states[:, off] = dissociation.sol(time[off])
        expected = p["Rmax"] * states[0]
        if full:
            expected += p["ns_Rmax"] * states[1]
        actual, components = binding_prediction(time, concentration, 20., 100., p, transport=transport,
                                                 nonspecific=full, return_components=True)
        result = dict(max_absolute_response_error=float(np.max(np.abs(actual - expected))))
        if full:
            result["max_surface_concentration_error_relative_to_bulk"] = float(np.max(np.abs(
                components["surface_concentration_M"] / concentration - states[-1])))
            result["surface_concentration_at_off_M"] = float(association.sol(100.)[-1] * concentration)
        evidence[transport] = result
    check("transport_against_separate_occupancy_and_surface_pool_ode",
          all(row["max_absolute_response_error"] < 1e-5 for row in evidence.values()) and
          evidence["Two-compartment transport"]["max_surface_concentration_error_relative_to_bulk"] < 1e-7,
          dict(cases=evidence, note="Full transport includes reversible nonspecific binding and dissociation-phase rebinding. The response-to-concentration calibration is supplied, not independently estimated or validated here."))


def inference_checks():
    rules = [replace(r, fixed=True) for r in parameter_defaults("langmuir")]
    p = {r.key: r.initial for r in rules}
    time = np.array([0., 2., 20., 21., 25., 35., 60., 90., 100., 110., 125., 170.])
    mask = (time >= 20.) & (time != 60.)
    residual = np.random.default_rng(412).normal(0., .3, len(time))
    prediction = binding_prediction(time, 50e-9, 20., 100., p)
    curve = dict(filename="noise.csv", repeat_id="R1", concentration_nM=50., concentration_M=50e-9,
                 time=time, response=prediction + residual, fit_mask=mask, on=20., off=100., relative_sd=1.7)
    tau = 7.
    result = fit_mechanism([curve], "langmuir", rules, correlation_time=tau)
    selected_time, r = time[mask], residual[mask]
    covariance = 1.7**2 * np.exp(-np.abs(selected_time[:, None] - selected_time[None, :]) / tau)
    q = float(r @ np.linalg.solve(covariance, r))
    n = len(r)
    ll = -.5 * (n * (np.log(2 * np.pi) + 1 + np.log(q / n)) + np.linalg.slogdet(covariance)[1])
    check("fixed_ou_gls_rss_and_loglikelihood_against_full_covariance", np.isclose(result["rss"], q, rtol=1e-10) and
          np.isclose(result["information_criteria"]["log_likelihood"], ll, rtol=1e-10),
          dict(engine_rss=result["rss"], reference_rss=q, engine_loglikelihood=result["information_criteria"]["log_likelihood"],
               reference_loglikelihood=ll, selected_times_s=selected_time, supplied_tau_s=tau))

    c = np.array([1., 3., 10., 33., 100., 330., 1000.])
    fits = {model: fit_profile_isotherm(c, 100 * c**power / (33.**power + c**power), model=model)
            for model, power in [("simple", 1.), ("hill", 1.4)]}
    check("isotherm_simple_and_hill_recovery", all(np.isclose(f["KD"], 33., rtol=1e-5) for f in fits.values()),
          {name: {key: f[key] for key in ["KD", "Rmax", "n_hill", "summary_eligible"]} for name, f in fits.items()})

    estimates = pd.DataFrame(dict(method=["Kinetic"] * 3, status=["Complete"] * 3,
                                  kon=[1e5, 1.2e5, 1.4e5], koff=[.0028, .00396, .00532], KD_nM=[28., 33., 38.]))
    summary = summarize_repeats(estimates).set_index("parameter")
    one = summarize_repeats(estimates.iloc[:1])
    check("independent_repeat_sd_and_single_repeat_missingness", summary.loc["K_D", "mean"] == 33. and
          summary.loc["K_D", "sd"] == 5. and one.sd.isna().all(), summary.reset_index().to_dict("records"))


def safeguard_checks():
    t = np.arange(0., 91.)
    concentration, on, off = 50e-9, 10., 100.
    truth = np.array([1.2e5, .012, 100.])
    alternative = np.array([9e4, .0135, 100. * 4 / 3])
    clean = app.model_1to1(t, *truth, concentration, on, off)
    other = app.model_1to1(t, *alternative, concentration, on, off)
    identical = float(np.max(np.abs(clean - other)))
    y = clean + np.random.default_rng(20).normal(0., .03, len(t))
    fit = app.fit_kinetics_advanced(t, y, concentration, on, off, normalize=False,
                                  show_warnings=False, fit_mask=t >= on)
    check("unidentifiable_single_concentration_association_withholds_curvewise_rate_precision",
          not fit["summary_eligible"] and not np.isfinite(fit["kon_err"]),
          dict(known_kon=truth[0], fitted_kon=fit["kon"], reported_kon_se=fit["kon_err"],
               known_KD_nM=100., fitted_KD_nM=fit["KD"] * 1e9,
               r_squared=fit["r_squared"], summary_eligible=fit["summary_eligible"],
               same_trace_distinct_parameters_max_difference=identical,
               equivalent_parameters=[truth, alternative],
               note="Actual optimizer, not mocked. One concentration, unknown capacity, no observed dissociation: only amplitude and kobs are identifiable."), "P1")

    kin = dict(global_KD=33e-9, diagnostic_summary=dict(overall_score=100.),
               summary_eligible=False, boundary_parameters=["koff"])
    eq = dict(KD=33., quality_summary=dict(overall_score=100.), attainment=dict(equilibrium_reached=False),
              summary_eligible=False, identifiable=False)
    kobs = dict(KD=33e-9, overall_score=100., summary_eligible=False)
    report = app.build_compare_report(kin, eq, kobs)
    check("cross_method_advice_blocks_ineligible_or_non_equilibrium_results", not report["recommendation"].startswith("Proceed"),
          dict(report=report, note="Controlled result objects isolate the reporting gate; scores are not observed data or a prevalence estimate."), "P1")

    t = np.arange(181.)
    response = app.model_1to1(t, 1.2e5, .012, 100., 50e-9, 20., 100.)
    detected = {}
    for sign, label in [(1., "positive"), (-1., "inverted")]:
        data = dataset(t, {50.: sign * response})
        detected[label] = app.auto_detect_binding_phases([data], {data["filename"]: {50.}})
    check("automatic_phase_detection_handles_response_polarity", abs(detected["positive"][1] - detected["inverted"][1]) <= 2.,
          dict(true_on_s=20., true_off_s=100., detected=detected,
               note="The existing advanced invert-response control acts after shared phase detection."), "P2")

    n = 2400
    base_rss, extra_rss = 100., 99.7
    base = dict(individual_fits=[dict(residuals_fit=np.full(160, np.sqrt(base_rss / n)), residuals=np.full(160, np.sqrt(base_rss / n))) for _ in range(15)],
                avg_quality=95., avg_r_squared=.99, mass_transport_r2=np.nan, n_parameters=5,
                summary_eligible=True, boundary_parameters=[])
    drift = deepcopy(base)
    for f in drift["individual_fits"]:
        f["residuals_fit"] *= np.sqrt(extra_rss / base_rss)
        f["residuals"] *= np.sqrt(extra_rss / base_rss)
    drift.update(avg_quality=95.01, avg_r_squared=.99001, n_parameters=20)
    original = app.fit_kinetics_shared_params

    def candidate(*args, **kwargs):
        assert kwargs.get("enforce_drift_guardrail") is False
        return deepcopy(drift if kwargs["correct_drift"] else base)

    with patch.object(app, "fit_kinetics_shared_params", side_effect=candidate):
        chosen = original([], 20., 100., {}, correct_drift=True)
    base_information = gaussian_information(np.full(n, np.sqrt(base_rss / n)), 5)
    drift_information = gaussian_information(np.full(n, np.sqrt(extra_rss / n)), 20)
    delta = drift_information["aicc"] - base_information["aicc"]
    check("drift_acceptance_penalizes_extra_fitted_terms", chosen["n_parameters"] == 5 and not chosen["drift_comparison"]["accepted"],
          dict(selected_guardrail=chosen["drift_guardrail"], base_rss=base_rss, drift_rss=extra_rss,
               mean_parameter_counts=[5, 20], drift_minus_base_AICc=delta,
               note="Injected candidate residuals test complexity protection against the original 0.2% RSS-gain counterexample. The current rule also requires eligible, comparable fits. AICc is conditional support, not a calibrated mechanism test."), "P2")


def main():
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob("mixa_*.py")}
    equation_checks()
    transport_checks()
    inference_checks()
    safeguard_checks()
    after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob("mixa_*.py")}
    assert before == after, "The audit must not change application source."
    DESTINATION.mkdir(parents=True, exist_ok=True)
    payload = dict(created_utc=datetime.now(timezone.utc).isoformat(), application_version=app.APP_VERSION,
                   scope="Current local source; this audit execution does not edit application source or deploy. Not instrument/vendor validation.",
                   application_source_sha256=before, checks=CHECKS,
                   passed=sum(c["passed"] for c in CHECKS), failed=sum(not c["passed"] for c in CHECKS))
    (DESTINATION / "results.json").write_text(json.dumps(json_safe(payload), indent=2, allow_nan=False) + "\n")
    print(json.dumps(json_safe(payload), indent=2, allow_nan=False))
    return 1 if payload["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
