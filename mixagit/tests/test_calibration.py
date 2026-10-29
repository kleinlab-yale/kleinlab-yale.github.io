from copy import deepcopy

import numpy as np
import pytest

from mixa_calibration import calibrated_profile, constrained_refit, target_definition, target_value
from mixa_inference import objective
from tests.test_inference import example


def test_affinity_constraint_is_exact_and_refits_nuisance_without_changing_saved_fit():
    fit, problem = example()
    original = deepcopy(fit["values"])
    target = "KD_nM::kon::all|koff::all"
    center = target_definition(problem, target)["value"]
    result = constrained_refit(problem, target, center*1.2)
    assert result["complete"]
    assert result["values"]["koff::all"]/result["values"]["kon::all"]*1e9 == pytest.approx(center*1.2, rel=1e-7)
    residual = objective(problem, result["values"])
    assert result["rss"] == pytest.approx(residual @ residual)
    assert result["rss"] > fit["rss"]
    assert fit["values"] == original


def test_calibration_keeps_every_failure_and_withholds_intervals_with_small_budgets():
    _, problem = example()
    result = calibrated_profile(problem, "kon::all", draws=20, runtime_s=1e-9)
    assert len(result["calibration_runs"]) == 20
    assert result["metadata"]["complete_draws"] == 0
    assert result["metadata"]["lower"] is result["metadata"]["upper"] is None
    assert result["metadata"]["critical_value"] is None


def test_calibrated_kd_profile_uses_simulated_order_statistic_and_resolves_crossings():
    _, problem = example()
    result = calibrated_profile(problem, "KD_nM::kon::all|koff::all", draws=200, starts=1, runtime_s=90.)
    info = result["metadata"]
    assert info["complete_draws"] == 200
    x = np.sort(result["calibration_runs"].loc[lambda t: t.status == "Complete", "statistic"])
    assert info["critical_value"] == x[min(int(np.ceil(.95*(len(x)+1))), len(x))-1]
    assert info["lower_status"] == info["upper_status"] == "Crossing resolved"
    assert 0 < info["lower"] < info["estimate"] < info["upper"]


def test_two_state_constraint_uses_overall_affinity_not_first_step():
    _, problem = example()
    problem["model"] = "two_state"
    for c in problem["curves"]:
        c["_review_keys"].update(k_forward="k_forward::all", k_reverse="k_reverse::all")
    for key, value in [("k_forward::all", .03), ("k_reverse::all", .009)]:
        problem["controls"][key] = dict(value=value, lower=value/100, upper=value*100, positive=True, fixed=False)
    target = "KD_overall_nM::kon::all|koff::all|k_forward::all|k_reverse::all"
    definition = target_definition(problem, target)
    values = {k: r["value"] for k, r in problem["controls"].items()}
    assert target_value(definition, values) == pytest.approx(values["koff::all"]/values["kon::all"]*1e9*.009/.039)


def test_unsupported_or_fixed_calibration_target_fails_closed():
    _, problem = example()
    problem["controls"]["kon::all"]["fixed"] = True
    with pytest.raises(ValueError, match="estimated"):
        target_definition(problem, "kon::all")
