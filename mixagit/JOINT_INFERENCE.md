# MIXA Joint Repeat Inference

Local version: 0.5.10-preview. This is a separate Bayesian response-level
analysis, not a replacement for independent-repeat mean +/- SD or a claim that
every interval has universal frequentist coverage.

## Scope And Access

Kinetic Analysis > Robustness & intervals > Joint repeats. The first
implementation supports reversible 1:1 binding, at least three independent
Repeat IDs, the saved Rmax linkage, and optional saved linear drift, linear
nonspecific response and injection-bulk response. It does not substitute 1:1 for
an advanced mechanism. Fixed kon/koff, transport and second binding populations
are rejected explicitly. The saved fit and its diagnostics remain unchanged.

Three independent repeats are a minimum input, not assurance that a population
variance or correlation is well determined. With few repeats, inspect prior
sensitivity and posterior uncertainty. Technical repeats of one preparation
must retain the same Repeat ID.

## Response-Level Model

For repeat r, let theta_r = (log kon_r, log koff_r). Then

```text
theta_r | mu,Sigma_between ~ Normal_2(mu,Sigma_between)
Sigma_between = diag(tau) * [[1,rho],[rho,1]] * diag(tau)
mu ~ Normal_2(log(prior rate medians), population_log_sd^2 * I)
tau_j ~ HalfNormal(between_log_sd_scale)
rho ~ LKJ_2(correlation_lkj_shape)
```

The two rates vary jointly. The model does not average individual fitted rates
or treat the number of sensorgram points/concentrations as the independent
sample size. Different files with one Repeat ID share the same pair of rates.
Capacities retain the saved linkage and fixed/free status.

Predicted sensorgrams use the ordinary physical 1:1 equation at the actual
concentration and the saved physical injection times. Only selected kinetic
observations are used. The option to include measured pre-association baseline
adds those points explicitly to the joint likelihood and records their counts.
Excluded association/dissociation points are not silently reintroduced.

The previous measured-median subtraction is undone using its saved offset.
Each corrected trace instead has an uncertain baseline with a declared normal
prior. Thus measured baseline observations and kinetic observations participate
in one model, rather than treating a noisy median as exact or propagating it a
second time. This change applies only to the separate joint analysis.

## Concentration Calibration

Enabled input budgets specify

```text
C_actual = C_nominal * exp(delta_stock + delta_level)
delta_stock ~ Normal(0,log(1+stock_CV^2))
delta_level_j ~ Normal(0,log(1+level_CV^2))
```

One stock factor applies across all repeats. Each concentration-level factor
is also shared across repeats; different levels are independent under this
specified budget. Nominal concentration is the median, not the arithmetic mean
of these lognormal inputs. Arbitrary serial-dilution covariance is not implied.

Internally, log effective_kon_r = log kon_r + delta_stock. This is only a
reparameterization: reported rates are converted back to intrinsic kon_r.
It avoids numerical confounding between a common stock error and kon, without
allowing a common error to average away as additional repeats are added. The
population mean's prior is on intrinsic rates, not effective rates. Calibration
factors are inferred jointly under their supplied metrology distributions.

## Shared References And Measurement Noise

When raw measurement propagation is enabled, one covariance block is built for
each connected raw-source reference graph. If F_s maps one raw source into all
its signed/interpolated uses, then

```text
Sigma_sources = sum_s SD_s^2 * F_s * K_s * F_s'
K_s[i,j] = exp(-abs(t_i-t_j)/tau_noise), or I for IID noise
```

A reused control is one source, not a fresh independent copy for every trace.
Sample noise, control noise, interpolation and response sign all enter this
same covariance. Equivalently, Gaussian uncertainty in the subtracted reference
is analytically marginalized under the stated reference-error model. The
interpolated control mean is the fixed reference procedure; an unknown binding
component or systematic control mismatch is not inferred from this covariance.

No additional independent residual covariance is added on top of enabled raw
measurement noise. Without a raw-source budget, the model uses per-trace
relative scales and the saved fixed OU time instead. Baseline and kinetic
points share the same time-dependent noise model.

Unless measurement SD is supplied through the Python API, a common noise
multiplier is estimated with a half-Student-t(4) prior. For raw-source analysis,
this multiplier scales the entire source covariance; individual source SD ratios
and OU times remain declared inputs. Baseline-estimated source SD ratios are
plug-in quantities, not independently inferred noise components. A source
covariance that is singular is rejected, not repaired with hidden numerical
jitter. The current implementation bounds joint selected-plus-baseline size at
4096 observations; it never silently thins the data.

## Baseline And Linear Corrections

Given the nonlinear parameters, selected response terms are linear:

```text
y = f(theta, C_actual, Rmax) + X*b + e
b ~ Normal(0, prior_covariance)
e ~ Normal(0, sigma^2*Sigma_sources)
y | nonlinear parameters ~ Normal(f, sigma^2*Sigma_sources + X*prior_covariance*X')
```

The full covariance determinant is retained; terms do not become free ways to
reduce RSS. Baselines are per trace. Saved free drift, linear nonspecific and
bulk terms retain their linkage but receive the explicit proper Gaussian priors
below, instead of their old hard fitting bounds. Saved fixed corrections remain
fixed. This prior change is displayed because it defines a distinct statistical
model. The linear nonspecific term remains the empirical association ramp held
constant during dissociation, not a second reaction population.

Whitening and a thin SVD reduce the Gaussian integration to its actual linear
basis. Singular values are decomposed directly, without forming a squared
normal matrix that would lose precision in weak directions. No covariance is
computed from a rank-hiding pseudoinverse to manufacture finite parameter errors.

## Default Priors

All scales are editable and exported. Response units are the input units, not
assumed RU or nm. These are explicit broad defaults, not instrument-specific
prior knowledge or priors optimized to make the fit pass.

| Quantity | Default |
| --- | --- |
| Population kon median | 1e5 M^-1 s^-1 |
| Population koff median | 0.01 s^-1 |
| Population mean natural-log SD | log(100) for each rate |
| Between-repeat log-SD half-normal scale | 1 |
| LKJ correlation shape | 2 |
| Capacity median / log SD | 100 response units / log(100) |
| Baseline normal SD | 100 response units |
| Drift normal SD | 1 response unit/s |
| Linear background normal SD | 1e7 response units/M/s |
| Bulk normal SD | 1e7 response units/M |
| Half-t(4) noise prior scale | 1; raw-source multiplier or response units as applicable |

Saved rate/capacity bounds restrict the joint domain; they are not reselected
using fit scores. This is a restriction of the entire joint prior, not a
conditionally renormalized truncated-rate population distribution. Inspect
whether bounds are scientifically justified. Predicted future repeat rates
follow the declared population distribution, not numerical fitting bounds.

## Population Integration And Sampling

The population mean is integrated exactly while the response likelihood remains
nonlinear. For R repeat log-rate vectors with mean xbar, covariance Sigma and
prior mean m0/covariance V0, its normal conditional is

```text
V_mu = inverse(inverse(V0) + R*inverse(Sigma))
m_mu = V_mu * (inverse(V0)*m0 + inverse(Sigma)*sum(theta_r))
```

Conditional population draws are included in reported posterior summaries.
The marginal repeat-rate prior has covariance
`I_R (x) Sigma + ones_R (x) V0`. Regression tests compare the implemented
factorization and conditional moments with this full multivariate normal law.

The nonlinear/calibration/noise block uses preconditioned Metropolis-adjusted
Langevin proposals with analytic likelihood and prior gradients:

```text
q(x_new|x) = Normal(x + h^2*C*grad(log posterior)/2, h^2*C)
acceptance = min(1, posterior_new*q(x|x_new)/(posterior*q(x_new|x)))
```

The full asymmetric Hastings correction is used. Numerical curvature supplies
only a proposal matrix, never a reported Laplace standard error. For constant
linear response terms, an analytic augmented-Jacobian SVD preserves exact
calibration null directions without differencing a large Hessian. Proposal scale
and covariance adapt only in discarded warmup, then remain fixed. Between-rate
scales and correlation use stepping-out/shrinkage slice updates. When the
likelihood permits it, a common-stock draw comes from its exact conditional
normal distribution, restricted to the saved rate domain.
The common concentration-level shift also has an exact conditional normal
update: every log level shifts together while every effective log kon shifts
oppositely. This leaves all kinetic responses unchanged and samples that
calibration alias without a small-step random walk. Concentration-dependent
linear response priors disable these conjugate updates when they would change
the likelihood; the full adjusted sampler then handles those variables.

A further prior-preserving centered/noncentered map improves near-zero-variance
behavior. It separately whitens the repeat mean under `V0+Sigma/R` and the
zero-sum deviations under Sigma, and remaps both under a proposed Sigma. Its
Gaussian rate-density ratio cancels its transformation Jacobian exactly; the
acceptance rule retains the likelihood, remaining priors and hard-domain checks.
Tests verify this cancellation. This is a MIXA-specific collapsed construction,
not a claim to reproduce a published sampler line for line.

Independent chains have independent recorded seeds and dispersed initial states.
Every requested chain remains in the output, including failures, incomplete
warmup and runtime-limited retained sampling.

## Reporting And Convergence

Routine intervals require all requested chains to complete, at least four
independent chains, rank-normalized/folded split Rhat <= 1.01, and bulk and
5%/95% tail ESS >= 400 for every repeat rate, capacity, calibration/noise and
between-repeat parameter. Each reported derived estimand must also meet these
criteria. Missing or failed checks are not passes. Raw draws and exploratory
quantiles remain auditable when routine intervals are withheld.

- **Population median kon/koff/KD:** posterior median and 95% credible interval
  for a population's typical rate/affinity, with population-mean uncertainty.
- **Between-repeat SD/correlation:** uncertainty in the population variation,
  not SEM and not a substitute for an observed independent-repeat sample SD.
- **Population mean/SD KD:** model-based lognormal moments, calculated per
  posterior draw using the rate covariance. These can be tail-sensitive with
  few repeats and require their own numerical diagnostic gate.
- **Repeat-specific rates/KD:** partially pooled estimates from the same joint
  likelihood, not independent repeated fits.
- **New-repeat prediction:** additionally draws a repeat from the population;
  this is wider than uncertainty in a population mean and does not include a
  future instrument's measurement error.

Posterior SD describes posterior uncertainty in that stated estimand. The
original publication independent-repeat mean +/- sample SD remains available
unchanged. A Bayesian credible interval is not labeled a frequentist 95%
confidence interval. These convergence thresholds are reporting safeguards,
not a mathematical guarantee of global mixing, correct priors or correct model.

## Reproducibility And Limits

### Curve Uncertainty And Predictive Checks

When the joint convergence gates pass, up to 500 posterior states distributed
across all chains are used to draw Gaussian baseline/correction coefficients
from their exact conditional posterior. Mean-curve bands include uncertainty in
these coefficients and the nonlinear parameters. Pointwise predictive bands
add fresh measurement noise with the same shared-source covariance. Neither
band is an independent-repeat sample SD or a simultaneous confidence band.

The output also compares observed and replicated squared whitened residual
discrepancies under those posterior draws. Its tail fraction is a descriptive
posterior predictive check using the data-informed posterior, not a uniform
frequentist p-value and not a fit-selection gate. Only the actually selected
kinetic points and explicit measured baseline enter this calculation.

Downloads include priors, input budgets/source identities, saved-fit fingerprint,
observation counts, sampler settings, raw transformed chains, physical posterior
draws, convergence diagnostics and figures. Equations and references accompany
the analysis package. Initial slow-mixing results are retained separately, not
overwritten with a more favorable sampler result.

This implementation does not jointly infer advanced mechanisms, phase times,
model choice, arbitrary dilution covariance, separate unknown control/sample
noise kernels, or systematic control mismatch. Those are different model
extensions, not implicit properties of the word hierarchical. Source code and
finite synthetic validation define the supported scope. Prior sensitivity and
assay appropriateness still matter for publication reporting.

## Primary Method References

- [Roberts and Tweedie (1996), Langevin distributions and their discrete approximations](https://doi.org/10.2307/3318418).
- [Haario, Saksman and Tamminen (2001), adaptive Metropolis](https://doi.org/10.2307/3318737).
- [Neal (2003), slice sampling](https://doi.org/10.1214/aos/1056562461).
- [Yu and Meng (2011), centered/noncentered interweaving](https://doi.org/10.1198/jcgs.2011.203main).
- [Vehtari et al. (2021), rank-normalized multi-chain diagnostics](https://doi.org/10.1214/20-BA1221).
- [JCGM 102 (2011), multivariate uncertainty framework](https://doi.org/10.59161/JCGM102-2011).

These support the stated method foundations. The likelihood, priors, collapsed
factorization and sampler composition above are explicit MIXA implementations;
the citations do not themselves validate those implementation choices.
