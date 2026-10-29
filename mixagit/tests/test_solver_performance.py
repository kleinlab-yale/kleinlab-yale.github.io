import numpy as np
import pytest

from mixa_mechanisms import _binding_derivatives, _binding_rhs, binding_prediction, parameter_defaults
from validation.reference_simulator import simulate


@pytest.mark.parametrize("model", ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"])
def test_analytic_state_and_concentration_jacobians_match_reaction_rates(model):
    parameters = {r.key: r.initial for r in parameter_defaults(model)}
    state = np.array([10.]) if model == "langmuir" else np.array([10., 5.])
    concentration = 80e-9
    jac, dc = _binding_derivatives(state, concentration, parameters, model)
    columns = []
    for i in range(len(state)):
        step = np.zeros(len(state))
        step[i] = 1e-4
        columns.append((_binding_rhs(state+step, concentration, parameters, model)-_binding_rhs(state-step, concentration, parameters, model))/2e-4)
    np.testing.assert_allclose(jac, np.column_stack(columns), rtol=1e-7, atol=1e-9)
    finite_c = (_binding_rhs(state, concentration+1e-12, parameters, model)-_binding_rhs(state, concentration-1e-12, parameters, model))/2e-12
    np.testing.assert_allclose(dc, finite_c, rtol=1e-7, atol=1e-4)


def test_sequential_exact_propagation_matches_independent_network_across_rate_scales():
    rng = np.random.default_rng(862)
    t = np.sort(np.r_[0., 20., rng.uniform(21., 99., 20), 100., rng.uniform(101., 400., 30)])
    for _ in range(12):
        p = {r.key: r.initial for r in parameter_defaults("sequential")}
        for key in ["kon", "koff", "kon2", "koff2"]:
            p[key] *= np.exp(rng.uniform(-2., 2.))
        concentration = np.exp(rng.uniform(np.log(5e-9), np.log(2e-6)))
        actual = binding_prediction(t, concentration, 20., 100., p, "sequential")
        expected = simulate(t, concentration, 20., 100., p, "sequential")
        np.testing.assert_allclose(actual, expected, rtol=2e-7, atol=2e-6)


@pytest.mark.parametrize("model", ["langmuir", "two_state", "heterogeneous", "bivalent", "sequential"])
def test_lsoda_full_transport_and_reference_population_use_the_same_physical_equations(model):
    t = np.r_[np.arange(0., 101., 5.), np.arange(110., 301., 10.)]
    p = {r.key: r.initial for r in parameter_defaults(model, transport="Two-compartment transport", nonspecific=True)}
    p["k_exchange"], p["response_to_M"] = .1, 2e-9
    fast = binding_prediction(t, 150e-9, 20., 100., p, model, "Two-compartment transport", True)
    radau = binding_prediction(t, 150e-9, 20., 100., p, model, "Two-compartment transport", True, integration_method="Radau")
    independent = simulate(t, 150e-9, 20., 100., p, model, "Two-compartment transport", True)
    np.testing.assert_allclose(fast, independent, rtol=3e-7, atol=5e-6)
    np.testing.assert_allclose(fast, radau, rtol=3e-7, atol=5e-6)
