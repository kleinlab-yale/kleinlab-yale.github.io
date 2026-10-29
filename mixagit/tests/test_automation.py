from copy import deepcopy
import json

import numpy as np
import pytest

from mixa_automation import (Candidate, FitPolicy, attempt_table, baseline_evidence,
                             candidate_plan, candidate_rules, choose_candidate, input_fingerprint,
                             review_metadata, run_assisted_fit)
from mixa_mechanisms import binding_prediction
from mixa_science import drift_comparison
from mixa_selection import detect_binding_phases


def curves_with_noise(drift=0., concentrations=(5., 15., 50., 150., 500.), seed=7):
    rng = np.random.default_rng(seed)
    time = np.arange(181.)
    p = dict(kon=1.2e5, koff=.012, Rmax=100.)
    curves = []
    for concentration in concentrations:
        y = binding_prediction(time, concentration * 1e-9, 20., 100., p)
        y += drift * (time - 20) + rng.normal(0., .2, len(time))
        curves.append(dict(filename="one.csv", repeat_id="R1", concentration_nM=concentration,
                           concentration_M=concentration * 1e-9, time=time.copy(), response=y,
                           fit_mask=time >= 20, on=20., off=100., relative_sd=1., noise_sd=.2))
    return curves


def test_simple_fit_stops_without_unnecessary_terms_and_preserves_observations():
    curves = curves_with_noise()
    fingerprint = input_fingerprint(curves)
    review = run_assisted_fit(curves, FitPolicy(starts=2, runtime_s=30.),
                              dict(allow_drift=True, drift_supported=True), mode="automatic")
    assert len(review["attempts"]) == 1
    assert review["recommended_index"] == 0
    assert review["attempts"][0]["candidate"]["terms"] == ()
    assert review["attempts"][0]["assessment"]["profiles"]["eligible"]
    assert input_fingerprint(curves) == fingerprint
    fit = review["attempts"][0]["result"]
    assert fit["values"]["kon::all"] == pytest.approx(1.2e5, rel=.03)
    assert fit["values"]["koff::all"] == pytest.approx(.012, rel=.03)
    assert fit["n_observations"] == sum(c["fit_mask"].sum() for c in curves)
    json.dumps(review_metadata(review), allow_nan=False)


def test_guided_requires_a_separate_action_before_testing_drift():
    curves = curves_with_noise(drift=.04)
    evidence = dict(allow_drift=True, drift_supported=True)
    policy = FitPolicy(starts=2, runtime_s=40.)
    first = run_assisted_fit(curves, policy, evidence)
    assert len(first["attempts"]) == 1
    assert first["recommended_index"] is None
    assert "linear drift" in first["next_candidate"]
    second = run_assisted_fit(curves, policy, evidence, previous=first)
    assert len(first["attempts"]) == 1
    assert len(second["attempts"]) == 2
    assert second["recommended_index"] == 1
    fitted = second["attempts"][1]["result"]
    drifts = fitted["parameter_table"].query("parameter == 'drift'").value
    assert np.allclose(drifts, .04, atol=.003)
    assert attempt_table(second).shape[0] == 2


def test_automatic_drift_is_supported_but_never_forced():
    curves = curves_with_noise(drift=.04)
    review = run_assisted_fit(curves, FitPolicy(starts=2, runtime_s=40.),
                              dict(allow_drift=True, drift_supported=True), mode="automatic")
    assert review["recommended_index"] == 1
    assert len(review["attempts"]) == 2
    assert review["attempts"][1]["aicc"] < review["attempts"][0]["aicc"] - 2


def test_empirical_corrections_are_compared_separately_and_together():
    curves = curves_with_noise()
    evidence = dict(allow_drift=True, drift_supported=False, explore_empirical_corrections=True,
                    allow_linear_nonspecific=True)
    plan, blocked = candidate_plan(evidence, {}, FitPolicy(), curves)
    assert not blocked
    assert {frozenset(c.terms) for c in plan} == {frozenset(), frozenset(["drift"]),
        frozenset(["linear_nonspecific"]), frozenset(["drift", "linear_nonspecific"])}
    assert plan[0] == Candidate()
    rule = next(r for r in candidate_rules(Candidate(terms=("linear_nonspecific",)), curves, FitPolicy(), evidence) if r.key == "ns_linear")
    assert not rule.fixed and not rule.positive and rule.lower < 0 < rule.upper


def test_compare_all_does_not_stop_at_an_adequate_simple_candidate():
    review = run_assisted_fit(curves_with_noise(), FitPolicy(starts=2, runtime_s=40., compare_all=True),
        dict(allow_drift=True, explore_empirical_corrections=True, allow_linear_nonspecific=True), mode="automatic")
    assert len(review["attempts"]) == 4
    assert review["recommended_index"] == 0
    assert review["search_complete"]
    assert len(review["candidate_queue"]) == 4


def test_linear_nonspecific_background_can_be_selected_without_reversible_control_parameters():
    curves = curves_with_noise()
    for c in curves:
        c["response"] += 1.7e5*c["concentration_M"]*np.clip(c["time"]-20., 0., 80.)
    review = run_assisted_fit(curves, FitPolicy(starts=2, runtime_s=40., compare_all=True),
                              dict(allow_linear_nonspecific=True), mode="automatic")
    assert len(review["attempts"]) == 2
    assert review["recommended_index"] == 1
    result = review["attempts"][1]["result"]
    assert result["values"]["ns_linear::all"] == pytest.approx(1.7e5, rel=.02)
    assert result["values"]["kon::all"] == pytest.approx(1.2e5, rel=.02)


def test_unpermitted_or_unjustified_corrections_and_wrong_valency_are_not_tried():
    policy = FitPolicy()
    evidence = dict(allow_drift=True, allow_bulk=True, allow_offset=True, allow_nonspecific=True,
                    allow_transport=True, allowed_models=["bivalent"], mechanism_supported=True,
                    mechanism_reason="Antibody immobilized", background_parameters={})
    plan, blocked = candidate_plan(evidence, dict(analyte_valency="Monovalent"), policy)
    assert plan == [Candidate()]
    assert len(blocked) == 6


def test_background_parameters_are_fixed_and_not_arbitrary_free_populations():
    evidence = dict(allow_nonspecific=True, background_parameters=dict(ns_kon=2e4, ns_koff=.03, ns_Rmax=5.))
    policy = FitPolicy()
    plan, blocked = candidate_plan(evidence, {}, policy)
    assert not blocked
    assert len(plan) == 2
    rules = candidate_rules(plan[1], curves_with_noise(), policy, evidence)
    assert all(rule.fixed and rule.initial == evidence["background_parameters"][rule.key]
               for rule in rules if rule.key.startswith("ns_"))
    assert not any(rule.key == "ns_linear" for rule in rules)


def test_explicit_mechanism_rationale_and_finite_candidate_budget():
    evidence = dict(allowed_models=["two_state", "heterogeneous", "sequential"], mechanism_supported=True,
                    mechanism_reason="Independent assay evidence", allow_drift=True, drift_supported=True,
                    allow_offset=True, offset_supported=True)
    plan, blocked = candidate_plan(evidence, {}, FitPolicy(max_candidates=3))
    assert len(plan) == 3 and plan[0] == Candidate()
    assert any("budget" in message for message in blocked)
    assert all(len(candidate.terms) <= 2 for candidate in plan)


def test_same_data_likelihood_rule_prefers_simpler_supported_candidate():
    attempts = [dict(aicc=100., n_parameters=3, assessment=dict(eligible=True)),
                dict(aicc=99., n_parameters=10, assessment=dict(eligible=True)),
                dict(aicc=50., n_parameters=20, assessment=dict(eligible=False))]
    assert choose_candidate(attempts, FitPolicy()) == 0
    attempts[1]["aicc"] = 90.
    assert choose_candidate(attempts, FitPolicy()) == 1
    attempts = [dict(aicc=100., n_parameters=3, assessment=dict(eligible=False)),
                dict(aicc=101., n_parameters=4, assessment=dict(eligible=True))]
    assert choose_candidate(attempts, FitPolicy()) is None


def test_ambiguous_phases_block_fitting_and_input_changes_prevent_continuation():
    curves = curves_with_noise()
    policy = FitPolicy(starts=2, runtime_s=30.)
    blocked = run_assisted_fit(curves, policy, phases_verified=False)
    assert not blocked["attempts"] and blocked["status"] == "Phase review required"
    curves[0]["fit_mask"][30] = False
    with pytest.raises(ValueError, match="Inputs or policy changed"):
        run_assisted_fit(curves, policy, previous=blocked)


def test_missing_noise_and_unidentifiable_data_cannot_qualify():
    curves = curves_with_noise(concentrations=(50.,))
    curves[0]["fit_mask"] = (curves[0]["time"] >= 20.) & (curves[0]["time"] < 90.)
    curves[0]["noise_sd"] = np.nan
    review = run_assisted_fit(curves, FitPolicy(starts=2, runtime_s=20.))
    assert review["recommended_index"] is None
    assert review["status"] == "Insufficient noise information"
    failures = review["attempts"][0]["assessment"]["failures"]
    assert any("association-only" in message for message in failures)
    assert any("noise scale" in message for message in failures)


def test_budget_expiry_withholds_incomplete_profiles(monkeypatch):
    import mixa_automation as automation
    monkeypatch.setattr(automation, "profile_qualification", lambda *args: dict(eligible=False, checks=[dict(reason="Profile budget exhausted")]))
    review = run_assisted_fit(curves_with_noise(), FitPolicy(starts=2, runtime_s=20.))
    assert review["recommended_index"] is None
    assert "profiles" in review["attempts"][0]["assessment"]["failures"][-1]


def test_drift_rule_rejects_small_rss_gain_and_incomparable_observations():
    base = dict(n_parameters=5, summary_eligible=True, individual_fits=[dict(filename="one.csv", concentration=50., fit_mask=np.ones(2400, bool), residuals_fit=np.full(2400, np.sqrt(100 / 2400)))])
    extra = deepcopy(base)
    extra["n_parameters"] = 20
    extra["individual_fits"][0]["residuals_fit"] *= np.sqrt(.997)
    decision = drift_comparison(base, extra, shared=True)
    assert not decision["accepted"] and decision["delta_aicc"] > 23
    extra["individual_fits"][0]["fit_mask"][0] = False
    assert not drift_comparison(base, extra, shared=True)["comparable"]


def test_phase_proposals_are_polarity_safe_and_disagreements_are_visible():
    curves = curves_with_noise(concentrations=(50.,))
    curve = curves[0]
    data = dict(filename="one.csv", concentrations=[50.], time=curve["time"],
                responses={50.: binding_prediction(curve["time"], 50e-9, 20., 100., dict(kon=1.2e5, koff=.012, Rmax=100.))})
    positive = detect_binding_phases([data], {"one.csv": {50.}})
    negative = deepcopy(data)
    negative["responses"][50.] *= -1
    inverted = detect_binding_phases([negative], {"one.csv": {50.}})
    assert positive["on"] == inverted["on"] and positive["off"] == inverted["off"]
    other = deepcopy(data)
    other.update(filename="other.csv", phase_assoc_start_s=40., phase_dissoc_start_s=120.)
    mixed = detect_binding_phases([data, other], {"one.csv": {50.}, "other.csv": {50.}})
    assert any("inconsistent injection timing" in message for message in mixed["issues"])
    table = baseline_evidence([data], {"one.csv": {50.}}, 20.)
    assert table.noise_sd.isna().all()  # Exact flat data are not a measured noise floor.


def test_original_four_audit_counterexamples_remain_guarded():
    from audits import review_20261019 as audit
    audit.CHECKS.clear()
    audit.safeguard_checks()
    assert len(audit.CHECKS) == 4
    assert all(check["passed"] for check in audit.CHECKS)


def test_fixed_ou_policy_assesses_innovations_not_raw_autocorrelation():
    curves = curves_with_noise()
    rng = np.random.default_rng(313)
    rho = .85
    for curve in curves:
        noise = rng.normal(0., .2, len(curve["time"]))
        for i in range(1, len(noise)):
            noise[i] = rho * noise[i - 1] + np.sqrt(1 - rho**2) * noise[i]
        curve["response"] = binding_prediction(curve["time"], curve["concentration_M"], 20., 100.,
                                                 dict(kon=1.2e5, koff=.012, Rmax=100.)) + noise
    policy = FitPolicy(starts=2, runtime_s=30., correlation_time=-1 / np.log(rho))
    review = run_assisted_fit(curves, policy)
    assert review["recommended_index"] == 0
    fit = review["attempts"][0]["result"]
    assert any(c["residual_dependence"]["serial_correlation_flag"] for c in fit["curves"])
    assert not any(row["serial_correlation"] for row in review["attempts"][0]["assessment"]["traces"])
