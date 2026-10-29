from dataclasses import replace

import numpy as np
import pytest
from scipy import linalg, stats

from mixa_joint import (JointNoise, JointPriors, JointProblem, between_covariance, chain_diagnostics,
                        fit_joint, interweave_rates, langevin_step, population_conditional, rate_marginal_logpdf)
from mixa_input_uncertainty import common_options
from tests.test_inference import example


def test_population_mean_integration_matches_full_gaussian_density_ratios():
    prior = JointPriors()
    rng = np.random.default_rng(2)
    rates = rng.normal(size=(4, 2))*.3+np.log([1e5, .01])
    matrices = [between_covariance(np.array([-.7, -1., .5])), between_covariance(np.array([-.4, -1.5, -.8]))]
    differences = []
    for matrix in matrices:
        full = np.kron(np.eye(4), matrix)+np.kron(np.ones((4, 4)), np.eye(2)*prior.population_log_sd**2)
        exact = stats.multivariate_normal.logpdf(rates.ravel(), mean=np.tile(np.log([1e5, .01]), 4), cov=full)
        differences.append(exact-rate_marginal_logpdf(rates, matrix, prior))
        mean, covariance = population_conditional(rates, matrix, prior)
        joint_cov = np.eye(2)*prior.population_log_sd**2
        cross = np.tile(joint_cov, (1, 4))
        expected = np.log([1e5, .01])+cross @ np.linalg.solve(full, (rates-np.log([1e5, .01])).ravel())
        np.testing.assert_allclose(mean, expected)
        np.testing.assert_allclose(covariance, joint_cov-cross @ np.linalg.solve(full, cross.T))
    assert differences[0] == pytest.approx(differences[1])


def test_interweaving_preserves_gaussian_prior_with_exact_jacobian():
    prior = JointPriors()
    old, new = between_covariance(np.array([-1., -2., .2])), between_covariance(np.array([-.1, -.4, -.6]))
    rates = np.array([[11.3, -4.8], [11.7, -4.5], [11.6, -4.6]])
    mapped = interweave_rates(rates, old, new, prior)
    jacobian_logdet = .5*((len(rates)-1)*(np.linalg.slogdet(new)[1]-np.linalg.slogdet(old)[1])
        +np.linalg.slogdet(np.eye(2)*prior.population_log_sd**2+new/len(rates))[1]
        -np.linalg.slogdet(np.eye(2)*prior.population_log_sd**2+old/len(rates))[1])
    assert rate_marginal_logpdf(mapped, new, prior)-rate_marginal_logpdf(rates, old, prior)+jacobian_logdet == pytest.approx(0., abs=1e-10)


def test_rank_normalized_diagnostics_detect_location_scale_and_stuck_chains():
    rng = np.random.default_rng(3)
    x = rng.normal(size=(4, 2000))
    good = chain_diagnostics(x)
    assert good["rhat"] < 1.01 and min(good["bulk_ess"], good["tail_ess"]) > 400
    shifted = x.copy()
    shifted[0] += 2.
    assert chain_diagnostics(shifted)["rhat"] > 1.1
    scaled = x.copy()
    scaled[0] *= 10.
    assert chain_diagnostics(scaled)["rhat"] > 1.1
    assert not np.isfinite(chain_diagnostics(np.ones((4, 100)))["rhat"])


def test_metropolis_adjusted_langevin_preserves_a_known_correlated_gaussian():
    rng = np.random.default_rng(6307)
    covariance = np.array([[1., .7], [.7, 2.]])
    inverse, chol = np.linalg.inv(covariance), np.linalg.cholesky(covariance)

    def target(x):
        return -.5*x @ inverse @ x, -inverse @ x

    x = np.array([2., -2.])
    value, gradient = target(x)
    samples = []
    for i in range(14000):
        x, value, gradient, moved = langevin_step(x, value, gradient, covariance, chol, 1.2, rng, target)
        if i >= 1000:
            samples.append(x.copy())
    np.testing.assert_allclose(np.mean(samples, axis=0), 0., atol=.04)
    np.testing.assert_allclose(np.cov(samples, rowvar=False), covariance, atol=.06)


def test_joint_observation_model_undoes_median_and_does_not_add_excluded_kinetic_points():
    result, _ = example(repeats=3)
    for c in result["curves"]:
        baseline = np.median(c["response"][c["time"] < c["on"]])
        c["response"] -= baseline
        c["fitted"] -= baseline
        c["baseline_offset"] = baseline
        c["model_baseline"] = -baseline
    problem = JointProblem(result, measurement_sd=.15)
    restored = np.concatenate([c["response"][m]+c["baseline_offset"] for c, m in zip(problem.curves, problem.masks)])
    np.testing.assert_array_equal(problem.response, restored)
    assert problem.noise.n == problem.saved["n_observations"]+problem.observation_record.baseline_observations.sum()
    for c, mask in zip(problem.curves, problem.masks):
        assert np.all((mask & ~c["fit_mask"]) <= (c["time"] < c["on"]))


def test_marginal_baseline_likelihood_matches_direct_covariance():
    result, _ = example(repeats=3)
    prior = replace(JointPriors(), baseline_sd=2.)
    problem = JointProblem(result, prior, measurement_sd=.15)
    core = problem.initial
    residual = problem.response-problem.prediction(core)
    covariance = np.eye(len(residual))*.15**2+4.*(problem.linear_columns @ problem.linear_columns.T)
    exact = stats.multivariate_normal.logpdf(residual, cov=covariance)
    assert problem.likelihood(core) == pytest.approx(exact, abs=1e-7)


def test_shared_control_covariance_uses_one_raw_source_and_no_duplicate_residual_term():
    t = np.array([0., 2., 4.])
    control = dict(id="ctrl", filename="control", role="Negative control", concentration_nM=0.,
                   time=t, response=np.zeros(3), noise_sd=.3, weight=-1.)
    curves = []
    for i in range(2):
        sample = dict(id=f"s{i}", filename=f"s{i}", role="Sample", concentration_nM=5.,
                      time=t, response=np.zeros(3), noise_sd=.2, weight=1.)
        curves.append(dict(time=t, on=2., filename=f"s{i}", concentration_nM=5., response_sign=1.,
                           measurement_sources=[sample, control], input_uncertainty_options=dict(propagate_measurement=True)))
    noise = JointNoise(curves, [np.ones(3, bool)]*2, common_options(curves), 0.)
    covariance = np.eye(6)*.04+np.kron(np.ones((2, 2)), np.eye(3)*.09)
    inverse_chol = noise.apply(np.eye(6))
    np.testing.assert_allclose(inverse_chol @ covariance @ inverse_chol.T, np.eye(6), atol=1e-14)
    assert len(noise.metadata) == 3
    v = np.arange(6.)
    np.testing.assert_allclose(noise.apply(np.eye(6)).T @ v, noise.adjoint(v))


@pytest.mark.parametrize("calibrated_background", [False, True])
def test_joint_analytic_gradient_matches_finite_differences(calibrated_background):
    from audits.validate_frontier import joint_case

    result, _ = joint_case(3, 71)
    if calibrated_background:
        from mixa_mechanisms import fit_mechanism, parameter_defaults

        rules = parameter_defaults("langmuir", drift=True, linear_nonspecific=True, bulk=True)
        result = fit_mechanism(result["curves"], "langmuir", rules, starts=1, compute_input_uncertainty=False)
    problem = JointProblem(result, replace(JointPriors(), baseline_sd=3., linear_background_sd=2e6))
    core = problem.initial.copy()
    core[problem.stock_index] = .3
    core[problem.level_start:problem.level_start+4] = [.2, -.1, .05, -.15]
    core[0] += .03
    hyper = np.array([-1.5, -1.8, .3])
    value, gradient = problem.logpdf_gradient(core, hyper)
    assert value == pytest.approx(problem.logpdf(core, hyper))
    finite = []
    for i in range(len(core)):
        step = np.zeros(len(core))
        step[i] = max(abs(core[i]), 1.)*1e-6
        finite.append((problem.logpdf(core+step, hyper)-problem.logpdf(core-step, hyper))/(2*step[i]))
    np.testing.assert_allclose(gradient, finite, rtol=5e-4, atol=2e-3)
    if not calibrated_background:
        jacobian = problem.prediction_jacobian(core)
        for i in range(len(core)):
            step = np.zeros(len(core))
            step[i] = max(abs(core[i]), 1.)*1e-6
            expected = (problem.prediction(core+step)-problem.prediction(core-step))/(2*step[i])
            np.testing.assert_allclose(jacobian[:, i], expected, rtol=1e-5, atol=1e-6)


def test_common_level_shift_preserves_all_kinetic_predictions_and_relative_levels():
    from audits.validate_frontier import joint_case

    result, _ = joint_case(3, 2)
    problem = JointProblem(result)
    original = problem.initial.copy()
    changed = original.copy()
    changed[:problem.n_rates:2] -= .07
    changed[problem.level_start:problem.level_start+len(problem.levels)] += .07/problem.level_sd
    np.testing.assert_allclose(problem.prediction(original), problem.prediction(changed), atol=1e-12)


def test_joint_requires_independent_repeats_and_does_not_silently_replace_advanced_models():
    result, _ = example(repeats=2)
    with pytest.raises(ValueError, match="three independent"):
        JointProblem(result)
    result["transport"] = "Quasi-steady 1:1 transport"
    # Invalid old prediction is rejected before a different model is substituted.
    with pytest.raises((ValueError, KeyError)):
        JointProblem(result)


def test_joint_timeout_retains_requested_chains_and_withholds_all_intervals():
    result, _ = example(repeats=3)
    before = result["values"].copy()
    output = fit_joint(result, warmup=100, draws=20, runtime_s=1e-9)
    assert len(output["chains"]) == 4
    assert output["chains"].retained_draws.sum() == 0
    assert not output["metadata"]["all_chains_complete"]
    assert output["summary"].empty
    assert result["values"] == before
