"""Equation provenance and run-specific methods records, independent of the UI."""

from copy import deepcopy
import hashlib
import json
from pathlib import Path

from mixa_science import json_safe


REGISTRY_VERSION = "2026-10-20.5"
ROOT = Path(__file__).resolve().parent
REFERENCES = {
    "roberts1996": dict(author="Roberts, Gareth O. and Tweedie, Richard L.",
        title="Exponential convergence of Langevin distributions and their discrete approximations", year=1996,
        journal="Bernoulli", doi="10.2307/3318418"),
    "yu2011": dict(author="Yu, Yaming and Meng, Xiao-Li", year=2011, journal="Journal of Computational and Graphical Statistics",
        title="To Center or Not to Center: That Is Not the Question: An Ancillarity-Sufficiency Interweaving Strategy (ASIS) for Boosting MCMC Efficiency",
        doi="10.1198/jcgs.2011.203main"),
    "beran1987": dict(author="Beran, Rudolf", title="Prepivoting to reduce level error of confidence sets",
        year=1987, journal="Biometrika", doi="10.1093/biomet/74.3.457"),
    "haario2001": dict(author="Haario, Heikki and Saksman, Eero and Tamminen, Johanna", title="An adaptive Metropolis algorithm",
        year=2001, journal="Bernoulli", doi="10.2307/3318737"),
    "neal2003": dict(author="Neal, Radford M.", title="Slice Sampling", year=2003,
        journal="The Annals of Statistics", doi="10.1214/aos/1056562461"),
    "vehtari2021": dict(author="Vehtari, Aki and Gelman, Andrew and Simpson, Daniel and Carpenter, Bob and Burkner, Paul-Christian",
        title="Rank-Normalization, Folding, and Localization: An Improved R-hat for Assessing Convergence of MCMC (with Discussion)",
        year=2021, journal="Bayesian Analysis", doi="10.1214/20-BA1221"),
    "hall1988": dict(author="Hall, Peter", title="Theoretical Comparison of Bootstrap Confidence Intervals",
        year=1988, journal="The Annals of Statistics", doi="10.1214/aos/1176350933"),
    "jcgm2008": dict(author="{Joint Committee for Guides in Metrology}",
        title="Evaluation of measurement data: Guide to the expression of uncertainty in measurement",
        year=2008, journal="JCGM 100:2008", doi="10.59161/JCGM100-2008E"),
    "jcgm101": dict(author="{Joint Committee for Guides in Metrology}",
        title="Evaluation of measurement data: Supplement 1 to the GUM: Propagation of distributions using a Monte Carlo method",
        year=2008, journal="JCGM 101:2008", doi="10.59161/JCGM101-2008"),
    "jcgm102": dict(author="{Joint Committee for Guides in Metrology}",
        title="Evaluation of measurement data: Supplement 2 to the GUM: Extension to any number of output quantities",
        year=2011, journal="JCGM 102:2011", doi="10.59161/JCGM102-2011"),
    "oshannessy1993": dict(author="O'Shannessy, D. J. and Brigham-Burke, M. and Soneson, K. K. and Hensley, P. and Brooks, I.",
        title="Determination of rate and equilibrium binding constants for macromolecular interactions using surface plasmon resonance: use of nonlinear least squares analysis methods",
        year=1993, journal="Analytical Biochemistry", doi="10.1006/abio.1993.1355"),
    "oshannessy1996": dict(author="O'Shannessy, D. J. and Winzor, D. J.",
        title="Interpretation of deviations from pseudo-first-order kinetic behavior in the characterization of ligand binding by biosensor technology",
        year=1996, journal="Analytical Biochemistry", doi="10.1006/abio.1996.0167"),
    "schuck1996": dict(author="Schuck, P. and Minton, A. P.",
        title="Analysis of mass transport-limited binding kinetics in evanescent wave biosensors",
        year=1996, journal="Analytical Biochemistry", doi="10.1006/abio.1996.0356"),
    "myszka1998": dict(author="Myszka, D. G. and He, X. and Dembo, M. and Morton, T. A. and Goldstein, B.",
        title="Extending the range of rate constants available from BIACORE: interpreting mass transport-influenced binding data",
        year=1998, journal="Biophysical Journal", doi="10.1016/S0006-3495(98)77549-6"),
    "svitel2003": dict(author="Svitel, J. and Balbo, A. and Mariuzza, R. A. and Gonzales, N. R. and Schuck, P.",
        title="Combined affinity and rate constant distributions of ligand populations from experimental surface binding kinetics and equilibria",
        year=2003, journal="Biophysical Journal", doi="10.1016/S0006-3495(03)75132-7"),
    "nguyen2023": dict(author="Nguyen, K. and Li, K. and Flores, K. and Tomaras, G. D. and Dennison, S. M. and McCarthy, J. M.",
        title="Parameter estimation and identifiability analysis for a bivalent analyte model of monoclonal antibody-antigen binding",
        year=2023, journal="Analytical Biochemistry", doi="10.1016/j.ab.2023.115263"),
    "hines2014": dict(author="Hines, K. E. and Middendorf, T. R. and Aldrich, R. W.",
        title="Determination of parameter identifiability in nonlinear biophysical models: a Bayesian approach",
        year=2014, journal="Journal of General Physiology", doi="10.1085/jgp.201311116"),
    "raue2009": dict(author="Raue, A. and Kreutz, C. and Maiwald, T. and Bachmann, J. and Schilling, M. and Klingmuller, U. and Timmer, J.",
        title="Structural and practical identifiability analysis of partially observed dynamical models by exploiting the profile likelihood",
        year=2009, journal="Bioinformatics", doi="10.1093/bioinformatics/btp358"),
    "hurvich1989": dict(author="Hurvich, C. M. and Tsai, C. L.",
        title="Regression and time series model selection in small samples",
        year=1989, journal="Biometrika", doi="10.1093/biomet/76.2.297"),
    "karlsson2006": dict(author="Karlsson, Robert and Katsamba, Phinikoula S. and Nordin, Helena and Pol, Ewa and Myszka, David G.",
        title="Analyzing a kinetic titration series using affinity biosensors",
        year=2006, journal="Analytical Biochemistry", doi="10.1016/j.ab.2005.09.069"),
}

PRODUCTION_SOURCE_FILES = (
    "app.py", "mixa_app.py", "mixa_cli.py", "mixa_data.py", "mixa_workspace.py", "mixa_reporting.py",
    "mixa_figures.py", "mixa_selection.py", "mixa_science.py", "mixa_diagnostics.py",
    "mixa_mechanisms.py", "mixa_mechanistic_ui.py", "mixa_automation.py", "mixa_assistant_ui.py",
    "mixa_uncertainty.py", "mixa_input_uncertainty.py", "mixa_methods.py", "mixa_documentation.py",
    "mixa_education.py", "mixa_inference.py", "mixa_inference_ui.py", "mixa_inference_figures.py",
    "mixa_calibration.py", "mixa_joint.py", "mixa_residual_tests.py", "mixa_plotting.py",
    "requirements.txt",
)


def source_code_sha256():
    return {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
            for name in PRODUCTION_SOURCE_FILES if (ROOT / name).is_file()}


def _entry(title, equations, units, assumptions, provenance, references, code, tests):
    return dict(title=title, equations=equations, units=units, assumptions=assumptions,
                provenance=provenance, references=references, implementation=code, regression_tests=tests)


EQUATIONS = {
    "langmuir": _entry("1:1 reversible binding", [
        "A + L <-> AL; dR/dt = kon*C*(Rmax-R) - koff*R",
        "kobs = kon*C + koff; Req = Rmax*C/(koff/kon+C)",
        "Rassoc(t) = Req*(1-exp(-kobs*(t-on))); Roff(t) = R(off)*exp(-koff*(t-off))",
        "KD = koff/kon"],
        "C: M; t: s; R/Rmax: input response; kon: M^-1 s^-1; koff: s^-1; KD: M",
        "Initially unoccupied equivalent independent sites; piecewise-constant surface concentration unless transport is enabled; linear response per bound analyte.",
        "Mass-action derivation; cited primary SPR nonlinear fitting work supports the analysis framework, not particular starting values or numerical equivalence.",
        ["oshannessy1993"], ["mixa_mechanisms.py:binding_prediction", "mixa_app.py:model_1to1"],
        ["tests/test_mechanisms.py:test_excluded_points_do_not_affect_objective_or_parameter_recovery"]),
    "two_state": _entry("Reversible two-state binding", [
        "A + L <-> AL <-> AL*; free = Rmax-x-y",
        "v1 = kon*C*free-koff*x; v2 = k_forward*x-k_reverse*y",
        "dx/dt = v1-v2; dy/dt = v2; response = x+y",
        "KD_first = koff/kon; KD_overall = KD_first*k_reverse/(k_forward+k_reverse)"],
        "x,y,Rmax: response; kon: M^-1 s^-1; koff,k_forward,k_reverse: s^-1",
        "Both bound states contribute equal response per analyte; AL* dissociates through AL. Overall affinity assumes reversible equilibrium, not a single exponential off rate.",
        "Explicit mass-action derivation and equilibrium balance for the stated network. Hines is a source for identifiability analysis, not a claim that this particular equation was taken from that paper.",
        ["hines2014"], ["mixa_mechanisms.py:_binding_rhs", "mixa_science.py:two_state_signal", "mixa_mechanisms.py:derived_affinities"],
        ["tests/test_mechanisms.py:test_two_state_global_optimizer_not_curvewise_average"]),
    "heterogeneous": _entry("Two independent surface populations", [
        "dRi/dt = kon_i*C*(Rmax_i-Ri)-koff_i*Ri, i=1,2; response = R1+R2",
        "KD_i = koff_i/kon_i; components may exchange labels"],
        "Each kon: M^-1 s^-1; each koff: s^-1; capacities: response",
        "Independent populations see the same analyte; no interconversion or competition between populations. No unique biological identity is assigned to a component.",
        "Two discrete mass-action populations. Svitel provides related surface-heterogeneity theory; MIXA does not implement that paper's continuous regularized distribution inversion.",
        ["svitel2003"], ["mixa_mechanisms.py:_binding_rhs", "mixa_mechanisms.py:binding_prediction"],
        ["tests/test_mechanisms.py:test_mechanism_prediction_invariant_to_observation_selection"]),
    "bivalent": _entry("Bivalent soluble analyte / surface avidity", [
        "x = singly attached analyte; y = doubly attached analyte; free = Rmax-x-2*y",
        "v1 = 2*kon*C*free-koff*x; v2 = kon2*x*free-2*koff2*y",
        "dx/dt = v1-v2; dy/dt = v2; response = x+y",
        "KD_per_arm_first = koff/kon; KD_macroscopic_capture = koff/(2*kon); no single overall avidity KD"],
        "kon: M^-1 s^-1; kon2: response^-1 s^-1; koff,koff2: s^-1; states/capacity: response equivalents",
        "Two equivalent soluble-analyte arms. First capture has two available arms and a doubly attached analyte has two opening routes. Response counts analyte molecules, not occupied sites; surface closure depends on available site density.",
        "Mass-action network with explicit arm multiplicities. Nguyen is a primary bivalent-analyte and identifiability source. Rate conventions must be mapped before comparing published or vendor parameter values.",
        ["nguyen2023"], ["mixa_mechanisms.py:_binding_rhs", "mixa_mechanisms.py:derived_affinities"],
        ["tests/test_mechanisms.py:test_bivalent_counts_bound_analyte_not_occupied_surface_sites"]),
    "sequential": _entry("Sequential capture of two analyte molecules", [
        "A + L <-> AL; A + AL <-> A2L; free = Rmax-x-y",
        "v1 = kon*C*free-koff*x; v2 = kon2*C*x-koff2*y",
        "dx/dt = v1-v2; dy/dt = v2; response = x+2*y",
        "KD1 = koff/kon; KD2 = koff2/kon2; equilibrium weights = 1, C/KD1, C^2/(KD1*KD2)"],
        "kon,kon2: M^-1 s^-1; koff,koff2: s^-1; x,y: single-analyte response equivalents",
        "Second capture adds a second analyte's response. Constants are macroscopic stepwise values without additional statistical factors. Not a general receptor-assembly network.",
        "Mass-action and binding-polynomial derivation for this explicit network. Hines supplies relevant binding-parameter identifiability methodology, not the origin of these particular equations.",
        ["hines2014"], ["mixa_mechanisms.py:_binding_rhs"],
        ["tests/test_mechanisms.py:test_sequential_adds_second_analyte_mass_and_recovers_binding_polynomial"]),
    "transport_qss": _entry("Quasi-steady 1:1 transport", [
        "Cs = (k_transport*Cb+koff*R)/(k_transport+kon*(Rmax-R))",
        "dR/dt = (kon*Cb*(Rmax-R)-koff*R)/(1+kon*(Rmax-R)/k_transport)"],
        "Cb,Cs: M; k_transport: response M^-1 s^-1",
        "One 1:1 population; fast surface-concentration equilibration. This does not represent an arbitrary fluid-delivery lag.",
        "Quasi-steady elimination of surface concentration from a two-compartment flux balance; see Myszka Appendix A. Response-scaled parameter units are explicit here.",
        ["schuck1996", "myszka1998"], ["mixa_mechanisms.py:binding_prediction"],
        ["tests/test_mechanisms.py:test_quasi_steady_transport_is_not_a_delivery_lag"]),
    "transport_full": _entry("Two-compartment transport", [
        "dCs/dt = k_exchange*(Cb-Cs)-response_to_M*dR_bound_analyte/dt",
        "All specific and reversible background reactions use Cs; Cb becomes zero at dissociation",
        "R_bound_analyte counts x+2*y for sequential binding, x+y for bivalent binding, plus any reversible background"],
        "k_exchange: s^-1; response_to_M: M/response; Cs,Cb: M",
        "Effective well-mixed compartments and linear response calibration; surface initially analyte-free; rebinding allowed. Fixed response_to_M is a conditional calibration assumption unless independently measured.",
        "Response-scaled two-compartment mass balance based on the transport-model class in the cited primary studies; not a spatial flow/diffusion PDE or instrument-geometry calibration.",
        ["schuck1996", "myszka1998"], ["mixa_mechanisms.py:binding_prediction"],
        ["tests/test_mechanisms.py:test_transport_depletion_rebinding_and_fast_transport_limit"]),
    "delivery_lag": _entry("Empirical delivery lag", [
        "Ceff(t) = Cb*(1-exp(-delivery_lag_rate*(t-on))) during association",
        "dR/dt = kon*Ceff*(Rmax-R)-koff*R; after off, dR/dt = -koff*R"],
        "delivery_lag_rate: s^-1",
        "Empirical association delivery transient with immediate zero analyte at off. Does not model depletion/rebinding.",
        "MIXA empirical model definition; not attributed to a primary physical transport equation.", [],
        ["mixa_science.py:delivery_lag_signal", "mixa_app.py:model_1to1_mass_transport"],
        ["tests/test_mechanisms.py:test_quasi_steady_transport_is_not_a_delivery_lag"]),
    "observation_terms": _entry("Additive observation terms", [
        "Y(t) = R_bound(t)+offset+drift*(t-on)+bulk*Cb*I(on<=t<off)+ns_linear*Cb*clip(t-on,0,off-on)"],
        "offset: response; drift: response/s; bulk: response/M; ns_linear: response M^-1 s^-1",
        "Optional empirical terms are distinct from bound analyte and do not consume the transport pool. The linear background remains constant after off. All fitted coefficients count as free parameters.",
        "MIXA observation model, explicitly empirical; coefficients can be signed after referencing. A fitted component can motivate checking controls or alternative explanations.", [],
        ["mixa_mechanisms.py:binding_prediction", "mixa_app.py:non_specific_linear_component"],
        ["tests/test_mechanisms.py:test_empirical_terms_do_not_consume_analyte_in_the_transport_model"]),
    "reversible_background": _entry("Reversible residual binding", [
        "dRns/dt = ns_kon*Cs*(ns_Rmax-Rns)-ns_koff*Rns; response += Rns"],
        "ns_kon: M^-1 s^-1; ns_koff: s^-1; ns_Rmax: response",
        "Consumes the same modeled analyte as specific binding if transport is enabled. A negative-control interpretation requires independently justified controls/constraints.",
        "Additional mass-action population; no arbitrary second component is automatically labeled nonspecific.",
        ["oshannessy1993"], ["mixa_mechanisms.py:binding_prediction"],
        ["tests/test_mechanisms.py:test_nonspecific_component_does_not_mutate_specific_component"]),
    "kobs": _entry("Association kobs regression and off-phase overlay", [
        "Rassoc(u) = B+A*(1-exp(-kobs*u)); kobs(C) = kon*C+koff",
        "Predicted off-phase: Boff+Aoff*exp(-koff_intercept*u); directly fitted koff is a separate diagnostic"],
        "kobs,koff: s^-1; concentration slope: M^-1 s^-1 after nM-to-M conversion",
        "Linear concentration dependence is the 1:1 expectation. Intercept precision depends on concentration range and rate errors. Predicted and directly fitted off-phase scores are not interchangeable.",
        "1:1 pseudo-first-order reduction; related primary analysis of nonideal sensorgrams.",
        ["oshannessy1993", "oshannessy1996"], ["mixa_app.py:fit_kobs_linearization", "mixa_app.py:build_kobs_dissociation_overlay"],
        ["tests/test_analysis.py"]),
    "equilibrium": _entry("Binding isotherm / Hill response", [
        "Simple: R(C) = Rmax*C/(KD+C)",
        "Hill: R(C) = Rmax*C^nH/(C_half^nH+C^nH)"],
        "C,KD,C_half: nM in isotherm fits; nH: dimensionless; Rmax: response",
        "Simple KD requires an appropriate equilibrium observation. A fixed-time response is a fixed-time isotherm. Hill C_half is apparent half saturation; nH is not a measured stoichiometry.",
        "Simple expression follows the 1:1 equilibrium balance; Hill is an empirical response parameterization here. Hines addresses identifiability of binding curves, not automatic mechanistic interpretation of Hill parameters.",
        ["oshannessy1993", "hines2014"], ["mixa_science.py:fit_profile_isotherm", "mixa_app.py:equilibrium_binding", "mixa_app.py:hill_equation"],
        ["tests/test_scientific_hardening.py"]),
    "baseline_propagation": _entry("Measured-baseline uncertainty propagation", [
        "Normalized error = raw selected error - estimated baseline error",
        "Cov(normalized error)/sigma^2 = K + beta*1*1' - h*1' - 1*h'",
        "beta = Var(sample median of Gaussian baseline)/sigma^2; h_i = K_i,baseline * E[gradient(sample median)]",
        "In objective coordinates: A = (J'J)^-1 J'; H = J*A; Q = covariance of normalized objective errors / sigma^2",
        "Cov(parameters) = A*Q*A' * RSS/trace((I-H)*Q)",
        "Var(KD) = gradient(KD)' * Cov(parameters) * gradient(KD)"],
        "Baseline variance: response^2; beta, h and Q: dimensionless; parameter covariance follows each parameter's units",
        "Local first-order optimizer sensitivity with Gaussian raw measurement noise. Actual median, baseline times and supplied OU dependence are used. Relative noise weights, concentrations, controls, phases and selected model remain conditional inputs. No extra fitted offset or baseline observation is added to the kinetic objective.",
        "Correlated-input covariance propagation follows JCGM 100 section 5.2. MIXA implements a low-rank sandwich for its existing estimator; finite median moments use deterministic scrambled-Sobol Gaussian propagation, with an IID large-sample expression for n>=128. This changes covariance, not the conditional likelihood/AIC or exploratory profile definition.",
        ["jcgm2008"], ["mixa_uncertainty.py:propagate_baseline", "mixa_uncertainty.py:reference_moments"],
        ["tests/test_baseline_uncertainty.py:test_propagation_matches_explicit_full_covariance_including_cross_phase_terms"]),
    "input_propagation": _entry("Correlated raw-reference, concentration and two-stage uncertainty", [
        "Corrected trace = raw sample - sum(control_weight*interpolated raw control); each raw trace is one noise source wherever reused",
        "S = -(J'J)^-1*J'; Cov(theta) = S*Cov(processed measurement error)*S' + sum_g dtheta/dlog(C_g) * Var(relative calibration_g) * (dtheta/dlog(C_g))'",
        "Raw Gaussian source draws pass through actual interpolation and median normalization; their projected parameter changes estimate measurement covariance without adding conditional measurement covariance a second time",
        "One common stock scale is shared across all fitted files/repeats; independent concentration-level errors are each shared across files/repeats at that concentration",
        "For kobs: mean_rates = G*curve_rates; beta = B*mean_rates; Cov(beta) = B*G*Cov(curve_rates)*G'*B' + calibration covariance",
        "Derived affinities use full parameter covariance. Isotherm observed-maximum normalization uses the local ratio Jacobian only for a unique positive maximum"],
        "Raw SD: response; stock/level CV: dimensionless relative standard uncertainty; covariance follows output parameter units",
        "Fixed model, objective weights, windows, supplied raw-noise OU time and supplied/baseline-estimated source SDs. Independent raw trace noises except exact reused IDs. Baseline trends are plug-in values. Calibration is independent of measurement noise. Stable local optimizer and maximum identity required; local sensitivities do not account for model/phase selection or uncertain source-SD estimates.",
        "MIXA-specific estimator and subtraction/aggregation Jacobians derived using correlated-input propagation (JCGM 100 section 5.2). Gaussian propagation through finite medians follows JCGM 101/102, while fitted parameters and calibration effects retain a first-order approximation. Not full nonlinear Monte Carlo refitting or a marginal likelihood.",
        ["jcgm2008", "jcgm101", "jcgm102"],
        ["mixa_input_uncertainty.py:propagate_fit_inputs", "mixa_input_uncertainty.py:kobs_propagation", "mixa_input_uncertainty.py:isotherm_propagation"],
        ["tests/test_input_uncertainty.py:test_linear_raw_source_covariance_matches_explicit_interpolation_and_shared_noise",
         "tests/test_input_uncertainty.py:test_kobs_exactly_straight_line_retains_first_stage_measurement_error_and_rate_covariance"]),
    "objective": _entry("Selected observations, likelihood and uncertainty", [
        "r_i = (Y_i-prediction_i)/relative_sd_i for selected observations only",
        "Cov(theta) approximately RSS/(N-p)*(J^T J)^-1, with scaled-SVD rank checks and transform to physical units",
        "Var(g(theta)) approximately gradient(g)^T*Cov(theta)*gradient(g)",
        "AIC = -2*logL+2*K; AICc = AIC+2*K*(K+1)/(N-K-1); K includes estimated residual variance"],
        "N: measured selected points; p: free mean parameters including expanded local nuisance parameters",
        "Base conditional local Gaussian approximation. Baseline/input propagation, when applied, is recorded separately and replaces this base covariance, not the objective. Otherwise concentrations, shared controls, relative weights and selected model remain conditional inputs. Global engine estimates one common residual scale after relative weighting; legacy curve-wise likelihoods can estimate one per curve. Soft-L1 withholds ordinary Gaussian inference.",
        "Nonlinear least squares and small-sample information criterion; AICc is approximate outside its derivation assumptions, not a mechanism probability. Delta-AICc >2 and adequacy cutoffs are MIXA policies, not literature-established universal tests.",
        ["oshannessy1993", "hurvich1989", "hines2014"],
        ["mixa_science.py:conditional_covariance", "mixa_science.py:gaussian_information", "mixa_mechanisms.py:fit_mechanism"],
        ["tests/test_scientific_hardening.py", "tests/test_automation.py"]),
    "ou_noise": _entry("Fixed continuous-time OU noise", [
        "alpha_i = exp(-(t_i-t_previous)/tau)",
        "z_0 = r_0; z_i = (r_i-alpha_i*r_previous)/sqrt(1-alpha_i^2)",
        "log(det(correlation)) = sum(log(1-alpha_i^2)); stationary first residual retained"],
        "tau and actual observed time gaps: seconds",
        "Prespecified stationary Gaussian OU correlation time and fixed relative scales. Uses actual gaps after exclusions. No fitted correlation time, shared-control covariance or preprocessing uncertainty is implied.",
        "Gaussian Markov covariance factorization, checked against a direct covariance-matrix calculation in the validation tests.", [],
        ["mixa_mechanisms.py:_whiten"],
        ["tests/test_mechanisms.py:test_ou_whitening_uses_actual_gaps_and_matches_stationary_ar1"]),
    "profiles": _entry("Nuisance-refitted exploratory profiles", [
        "Fix one parameter, reoptimize other free parameters on the same observations",
        "Approximate RSS cutoff = RSS_best*(1+F_0.95(1,N-p)/(N-p))"],
        "Profile parameter retains its declared units and bounds",
        "Finite grid and local nuisance refits. Failed/missing points are unknown; grid edges are not interval limits. The assistant uses sparse exclusions, not a certified confidence interval.",
        "Profile-based identifiability is supported by Raue; MIXA's finite RSS-F implementation and grid/decision thresholds are explicitly its own approximation.",
        ["raue2009", "hines2014"], ["mixa_mechanisms.py:profile_parameter", "mixa_automation.py:profile_qualification"],
        ["tests/test_mechanisms.py:test_profile_uses_group_specific_bounds"]),
    "repeat_statistics": _entry("Independent-repeat statistics", [
        "mean = sum(x_i)/n; SD = sqrt(sum((x_i-mean)^2)/(n-1)); SEM = SD/sqrt(n)",
        "Geometric mean CI = exp(mean(log(x)) +/- t_0.975,n-1*SD(log(x))/sqrt(n))"],
        "n: eligible independently refitted Repeat IDs, not concentrations or technical files",
        "Repeat IDs must represent independent experiments. SD unavailable for n=1. Log-t CI targets geometric mean, not arithmetic mean. Across-repeat SD/log-t intervals do not propagate common calibration/shared-control covariance or model selection. Mechanistic repeat summaries exclude each missing-covariance or SE/value > 1 parameter estimate, retaining its diagnostics; derived affinities are screened separately using full covariance. This is a declared local precision screen, not a formal identifiability test, and exclusions require review.",
        "Standard sample statistics and Student-t interval applied to log estimates; definitions are stated explicitly rather than attributed to a binding-mechanism paper.", [],
        ["mixa_mechanisms.py:refit_independent_repeats", "mixa_reporting.py:summarize_repeats"],
        ["tests/test_mechanisms.py:test_repeat_refits_count_independent_ids_not_concentrations"]),
    "refit_review": _entry("Saved-fit nonlinear uncertainty and deletion diagnostics", [
        "LR(theta) = N*log(RSS_profile(theta)/RSS_saved_minimum); approximate chi-square(1) threshold",
        "Deletion: refit training selected observations; predict held-out points only with independently fixed or training-estimated parameters",
        "Nonlinear parametric refits: simulate measurements and shared calibration; refit the saved objective; recalculate KD in each draw",
        "Estimated-noise case: studentized pivots, using per-refit baseline-aware scale and log coordinates for positive estimands",
        "External noise/calibration case: central percentile interval under supplied input distributions",
        "Intervals require >=200 complete refits, >=95% completion, and <5% bound/rank-loss refits"],
        "Parameters retain their saved units; derived affinities: nM; likelihood ratio: dimensionless",
        "Fixed model, windows, weights and supplied/plug-in noise assumptions. Profile intervals are conditional, not input-budget intervals. Simulations include only enabled source/calibration components. No model-selection or joint random-effects inference. Thresholds for routine simulation reporting are explicit policies, not calibrated hypothesis tests.",
        "Raue supports nuisance-refitted profile likelihood; Nguyen motivates SPR initialization/identifiability. JCGM 101 supports distribution propagation as a framework, not numerical equivalence to this forward parametric simulation. Detailed estimator, baseline, calibration, label and failure rules are in REFIT_REVIEW.md.",
        ["raue2009", "nguyen2023", "hall1988", "jcgm101"],
        ["mixa_inference.py:review_problem", "mixa_inference.py:adaptive_profile", "mixa_inference.py:omission_review", "mixa_inference.py:refit_sampling"],
        ["tests/test_inference.py:test_adaptive_profile_resolves_both_crossings_with_nuisance_refits",
         "tests/test_inference.py:test_held_out_local_capacity_is_not_leaked_from_the_full_fit",
         "tests/test_inference.py:test_source_noise_reuses_controls_once_including_the_same_baseline_draw"]),
    "residual_simulation": _entry("Joint simulated serial-residual screen", [
        "For objective Jacobian J, e_res_sim = (I-J*pinv(J))*e_sim",
        "T = max over eligible curve/phases of abs(lag1_correlation)*sqrt(number_of_adjacent_pairs)",
        "p_MC = (1+count(T_sim >= T_observed))/(B+1), B=499 by default"],
        "Objective residuals retain saved whitening/relative scales; maximum statistic and tail fraction: dimensionless",
        "Conditional Gaussian noise with supplied/plug-in SDs and OU time. Finite measured baselines and enabled reused raw controls are simulated. Local Gauss-Newton projection approximates parameter refitting. No exact nonlinear goodness-of-fit or model-selection-adjusted p-value is claimed. Phase/trim gaps and curve boundaries are not joined. Source SD, noise-model and calibration estimation uncertainty are not integrated.",
        "MIXA-defined maximum serial statistic and Gaussian simulation, with standard least-squares residual projection and plus-one Monte Carlo counting. JCGM 101 supports simulation-based distribution propagation, not a claim of an exact test or identity with a published SPR algorithm. Observed false-rejection and correction-selection frequencies are reported in the assisted comparison benchmark.",
        ["jcgm101"], ["mixa_residual_tests.py:serial_null_check"],
        ["tests/test_residual_tests.py:test_joint_serial_null_is_reproducible_preserves_fit_and_scans_all_phases",
         "tests/test_residual_tests.py:test_true_ou_noise_is_flagged_under_iid_but_not_after_the_supplied_whitening"]),
    "calibrated_profile": _entry("Experiment-specific bootstrap-calibrated parameter and affinity intervals", [
        "T(theta) = N*log(RSS_constrained(theta)/RSS_unrestricted)",
        "Simulate fresh experiments at the saved estimator; nuisance-refit constrained and unrestricted objectives",
        "Critical value = ordered T_sim at rank min(ceil(confidence*(B+1)),B)",
        "Confidence region: connected theta values with T(theta) <= critical value; exact model-specific KD equality",
        "At least 200 complete simulations and 95% completion; retain every failure/unrun draw; report critical-value Monte Carlo order-statistic precision"],
        "Rates retain saved units; derived affinity nM; RSS-ratio statistic dimensionless",
        "Plug-in parametric calibration under the recorded noise, finite median, reference and calibration distributions. With external budgets this is a hybrid measurement/calibration confidence set, not the conditional Gaussian likelihood. Not a double bootstrap, selection-adjusted interval or universal coverage guarantee. Bound/open, incomplete and better-optimum cases remain unresolved.",
        "Parametric-bootstrap calibration of a refitted statistic and profile inversion. Beran supplies the calibration/prepivoting framework; MIXA implements one plug-in calibration, not the iterated higher-order refinement in that paper. Specific equations and finite-simulation rules are MIXA's explicit implementation.",
        ["beran1987", "raue2009", "jcgm101"], ["mixa_calibration.py:calibrated_profile", "mixa_calibration.py:constrained_refit"],
        ["tests/test_calibration.py:test_affinity_constraint_is_exact_and_refits_nuisance_without_changing_saved_fit",
         "tests/test_calibration.py:test_calibrated_kd_profile_uses_simulated_order_statistic_and_resolves_crossings"]),
    "joint_hierarchy": _entry("Joint nonlinear hierarchical 1:1 response inference", [
        "log(kon_r,koff_r) ~ Normal_2(mu, diag(tau)*Correlation(rho)*diag(tau))",
        "mu ~ Normal_2(log(prior medians), population_log_sd^2*I); tau_j ~ HalfNormal(scale); rho ~ LKJ_2(shape)",
        "C_actual = C_nominal*exp(delta_stock+delta_level); normal delta SD = sqrt(log(1+CV^2)); shared across repeats",
        "y = kinetic_1to1(theta_r,C_actual,Rmax) + X*b + e; b ~ Normal(0,prior_cov); e ~ Normal(0,sigma^2*Sigma_sources)",
        "Sigma_sources = sum_s sigma_s^2*F_s*K_s*F_s'; each raw source s occurs once with all signed interpolation uses",
        "Integrate b exactly: y ~ Normal(kinetic, sigma^2*Sigma_sources + X*prior_cov*X')",
        "Integrate mu exactly conditional on repeat log-rates and between covariance; draw mu from its normal conditional",
        "KD_r = koff_r/kon_r; population median KD = exp(mu_off-mu_on); new-repeat parameter predictions additionally draw between-repeat rates",
        "Four independent complete chains; rank/folded split Rhat <= 1.01 and bulk/tail ESS >=400 for all nonlinear nuisance variables and each reported estimand"],
        "kon M^-1 s^-1; koff s^-1; KD nM; baseline/capacity/input response units; between-rate SD in natural log units",
        "A distinct Bayesian 1:1 model requiring at least three independent repeats. Raw median normalization is undone and explicitly selected baseline points enter the likelihood. Gaussian correction priors replace saved correction bounds; rate/capacity bounds and capacity linkage remain. Priors are declared, not fit-score options. Shared references are analytically integrated; source SD ratios and OU times remain fixed. A common noise multiplier is inferred unless noise SD is supplied. No advanced-mechanism hierarchy, arbitrary dilution covariance or phase/model-selection integration. Posterior credible, between-repeat and predictive intervals are not independent-repeat sample SD or frequentist confidence intervals.",
        "Explicit nonlinear mixed-model construction with normal conjugacy, Gaussian covariance identities and Metropolis-adjusted Langevin/slice sampling. Roberts/Tweedie supports adjusted Langevin sampling, Haario proposal adaptation, Neal slice updates, Yu/Meng reparameterization interweaving and Vehtari multi-chain diagnostics. The exact collapsed rate map and priors are MIXA-specific and derived in JOINT_INFERENCE.md; citations do not certify their binding-data calibration.",
        ["roberts1996", "haario2001", "neal2003", "yu2011", "vehtari2021", "jcgm102"],
        ["mixa_joint.py:JointProblem", "mixa_joint.py:JointNoise", "mixa_joint.py:fit_joint", "mixa_joint.py:interweave_rates"],
        ["tests/test_joint.py:test_population_mean_integration_matches_full_gaussian_density_ratios",
         "tests/test_joint.py:test_marginal_baseline_likelihood_matches_direct_covariance",
         "tests/test_joint.py:test_shared_control_covariance_uses_one_raw_source_and_no_duplicate_residual_term",
         "tests/test_joint.py:test_interweaving_preserves_gaussian_prior_with_exact_jacobian"]),
    "stoichiometry": _entry("Conditional capacity/stoichiometry", [
        "apparent_ratio = Rmax/ligand_loading * MW_ligand/MW_analyte / response_per_mass_ratio",
        "stoichiometry = apparent_ratio/independently_known_active_fraction"],
        "Response-per-mass ratio, active fraction and returned ratio: dimensionless",
        "Requires independently justified response calibration, loading and molecular weights. No automatic RU-to-nm conversion for BLI. No uncertainty propagation is implemented for this derived estimate.",
        "Response-per-mass balance, not inference of molecular stoichiometry from curve shape or Hill slope.", [],
        ["mixa_mechanisms.py:stoichiometry_from_capacity"],
        ["tests/test_mechanisms.py:test_stoichiometry_requires_calibration_and_active_fraction_not_hill_slope"]),
    "single_cycle": _entry("Single-cycle kinetics (sequential non-regenerated injections)", [
        "x(t < on_1) = 0; for injection k on [on_k, off_k] at C_k, propagate dx/dt = f(x, C_k) from x(on_k)",
        "for buffer gap (off_k, on_{k+1}) and terminal dissociation t > off_K, propagate dx/dt = f(x, 0) from x(off_k)",
        "Y(t) = w^T x(t) + offset + drift*(t - on_1) + bulk*C(t)"],
        "C_k: M; on_k, off_k, t: s; x, Rmax: response; kon: M^-1 s^-1; koff: s^-1",
        "No surface regeneration between sequential analyte injections; bound state at each boundary is carried continuously into the next phase.",
        "Piecewise-constant concentration state propagation across sequential injections following the kinetic titration series formulation of Karlsson et al. (2006).",
        ["karlsson2006", "oshannessy1993"],
        ["mixa_mechanisms.py:single_cycle_prediction", "mixa_mechanisms.py:fit_single_cycle_kinetics"],
        ["tests/test_mechanisms.py:test_single_cycle_kinetics_carries_state_across_injections_and_recovers_rates"]),
}


def equation_record(ids=None):
    keys = list(EQUATIONS) if ids is None else list(dict.fromkeys(ids))
    unknown = set(keys) - set(EQUATIONS)
    if unknown:
        raise ValueError(f"Unknown equation IDs: {sorted(unknown)}")
    references = sorted({key for entry in keys for key in EQUATIONS[entry]["references"]})
    return dict(registry_version=REGISTRY_VERSION, equations={key: deepcopy(EQUATIONS[key]) for key in keys},
                references={key: deepcopy(REFERENCES[key]) for key in references},
                purpose="Traceable fitting and hypothesis-generating model comparison; vendor agreement is not the validation target.")


def equation_ids(result, family="Kinetic"):
    ids = ["objective", "repeat_statistics"]
    if result.get("inference_review"):
        ids += ["refit_review"]
    if result.get("inference_review", {}).get("calibration"):
        ids += ["calibrated_profile"]
    if result.get("inference_review", {}).get("joint"):
        ids += ["joint_hierarchy"]
    if result.get("qualification", {}).get("serial_check", {}).get("available") or result.get("inference_review", {}).get("residual_checks"):
        ids += ["residual_simulation"]
    if result.get("input_uncertainty", {}).get("applied") or result.get("input_uncertainty", {}).get("first_stage_propagated"):
        ids.append("input_propagation")
    if family == "Equilibrium":
        return ids + ["equilibrium"]
    if family == "kobs":
        return ids + ["langmuir", "kobs"]
    model = result.get("model", result.get("shared_model", result.get("fit_settings", {}).get("model", "1:1")))
    aliases = {"1:1": "langmuir", "1:1 Langmuir": "langmuir", "2-state": "two_state",
               "2-State (Advanced)": "two_state", "1:1+MT": "delivery_lag", "1:1 + Delivery Lag": "delivery_lag"}
    model = aliases.get(model, model)
    if model not in {"langmuir", "two_state", "heterogeneous", "bivalent", "sequential", "delivery_lag"}:
        raise ValueError(f"No equation mapping for saved model {model!r}.")
    ids += [model, "observation_terms"]
    if result.get("baseline_uncertainty", {}).get("applied"):
        ids.append("baseline_propagation")
    transport = result.get("transport", "None")
    if transport != "None":
        ids.append({"Quasi-steady 1:1 transport": "transport_qss", "Two-compartment transport": "transport_full"}[transport])
    if result.get("nonspecific"):
        ids.append("reversible_background")
    if result.get("correlation_time", 0.) > 0:
        ids.append("ou_noise")
    if "parameter_controls" in result:
        ids.append("profiles")
    if result.get("single_cycle"):
        ids.append("single_cycle")
    return ids


def bibliography(record):
    rows = []
    for key, ref in record["references"].items():
        fields = ",\n".join(f"  {name} = {{{value}}}" for name, value in ref.items())
        rows.append(f"@article{{{key},\n{fields}\n}}")
    return "\n\n".join(rows) + "\n"


def methods_markdown(record):
    lines = ["# MIXA Equations and Methods", "", f"Registry: {record['registry_version']}", "", record["purpose"], "",
             "References support the stated model/method foundations. Source relationships and MIXA-specific derivations are identified below; a citation is not itself a numerical validation result.", ""]
    if record.get("run"):
        lines += ["## Saved Analysis", "", "```json", json.dumps(json_safe(record["run"]), indent=2, allow_nan=False), "```", ""]
    for key, entry in record["equations"].items():
        lines += [f"## {entry['title']} ({key})", "", "```text", *entry["equations"], "```", "",
                  f"Units: {entry['units']}", "", f"Assumptions: {entry['assumptions']}", "",
                  f"Provenance: {entry['provenance']}", "", "Implementation: " + "; ".join(entry["implementation"]), "",
                  "Regression checks: " + "; ".join(entry["regression_tests"]), ""]
        for ref_id in entry["references"]:
            ref = record["references"][ref_id]
            lines += [f"- [{ref['title']} ({ref['year']})](https://doi.org/{ref['doi']})", ""]
    return "\n".join(lines)


def validation_evidence():
    path = ROOT / "validation" / "benchmark_summary.json"
    if not path.exists():
        return dict(status="No benchmark evidence bundled", scope="See METHODS_VALIDATION.md for the reproducible protocol.")
    evidence = json.loads(path.read_text())
    matches = {name: (ROOT / name).is_file() and hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == value
               for name, value in evidence["production_code_sha256"].items()}
    record = dict(status="Source-matched synthetic benchmark evidence" if matches and all(matches.values()) else "Historical evidence; source differs",
                source_matches=matches, evidence=evidence,
                scope="Performance applies to the recorded synthetic designs, counts, preprocessing and noise assumptions; not an instrument-wide qualification.")
    baseline_path = ROOT / "validation" / "baseline_uncertainty" / "results.json"
    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text())
        baseline_matches = {name: (ROOT/name).is_file() and hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == value
                            for name, value in baseline["application_source_sha256"].items()}
        record["baseline_propagation_study"] = dict(
            status="Source-matched paired baseline study" if baseline_matches and all(baseline_matches.values()) else "Historical baseline evidence; source differs",
            source_matches=baseline_matches, evidence=baseline)
    input_path = ROOT / "validation" / "input_uncertainty" / "results.json"
    if input_path.exists():
        study = json.loads(input_path.read_text())
        matched = {name: (ROOT/name).is_file() and hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == value
                   for name, value in study["production_code_sha256"].items()}
        record["correlated_input_and_advanced_noise_study"] = dict(
            status="Source-matched input and advanced-noise study" if matched and all(matched.values()) else "Historical input/advanced evidence; source differs",
            source_matches=matched, evidence=study)
    for folder, key in [("refit_review", "nonlinear_refit_and_blind_starts"), ("assisted_comparison", "assisted_correction_comparison"),
                        ("frontier_calibration", "calibrated_interval_study"), ("frontier_performance", "complex_performance_study"),
                        ("frontier_joint", "joint_repeat_study"), ("frontier_joint_sbc", "joint_prior_generated_study")]:
        study_path = ROOT/"validation"/folder/"results.json"
        if not study_path.exists():
            continue
        study = json.loads(study_path.read_text())
        matched = {name: (ROOT/name).is_file() and hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == value
                   for name, value in study["production_code_sha256"].items()}
        capsule = ROOT/"validation"/"refit_review_source_capsule"/"mixa_automation.py"
        archived_helper = (folder == "refit_review" and capsule.exists() and
            hashlib.sha256(capsule.read_bytes()).hexdigest() == study["production_code_sha256"].get("mixa_automation.py"))
        core_matches = all(value for name, value in matched.items() if name != "mixa_automation.py")
        status = "Source-matched current study" if matched and all(matched.values()) else "Historical study; recorded files differ"
        if archived_helper and core_matches and not matched.get("mixa_automation.py", True):
            status = "Fitting/refit core source matches; unused pre-residual-screen automation helper is archived"
        validation_matches = {name: (ROOT/name).is_file() and hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == value
                              for name, value in study.get("validation_code_sha256", {}).items()}
        initial_runner = ROOT/"validation"/"frontier_source_capsule"/"validate_frontier_initial.py"
        runner_capsule = bool(initial_runner.exists() and hashlib.sha256(initial_runner.read_bytes()).hexdigest()
            == study.get("validation_code_sha256", {}).get("audits/validate_frontier.py"))
        record[key] = dict(status=status, source_matches=matched, evidence=study,
                           archived_automation_helper_matches=bool(archived_helper),
                           validation_source_matches=validation_matches, archived_validation_runner_matches=runner_capsule)
    return record


def write_methods_exports(archive, results, prefix="methods"):
    from mixa_inference import write_review_exports
    from mixa_inference_figures import write_review_figures

    ids, runs = [], {}
    for family, result in results.items():
        ids += equation_ids(result, family)
        runs[family] = {key: result[key] for key in ["model", "shared_model", "transport", "nonspecific", "noise_model",
            "correlation_time", "loss", "background_terms", "n_observations", "n_parameters", "degrees_of_freedom",
            "optimizer_settings", "parameter_controls", "instance_controls", "qualification", "fit_settings", "refit_spec", "baseline_uncertainty", "input_uncertainty", "uncertainty_method"] if key in result}
        if result.get("recipe"):
            runs[family]["recipe"] = result["recipe"]
        write_review_exports(archive, f"robustness_review/{family}", result)
        write_review_figures(archive, f"robustness_review/{family}", result)
    record = equation_record(ids)
    guide = (ROOT/"USER_GUIDE.md").read_bytes()
    record["user_guide_sha256"] = hashlib.sha256(guide).hexdigest()
    record["current_source_sha256"] = source_code_sha256()
    record["run"] = runs
    record["record_scope"] = "Generated at export from saved model/settings and the current equation registry. Benchmark source matching concerns current files, not an earlier saved run or the user's particular dataset."
    archive.writestr(f"{prefix}/equations_and_sources.json", json.dumps(json_safe(record), indent=2, allow_nan=False))
    archive.writestr(f"{prefix}/METHODS.md", methods_markdown(record))
    archive.writestr(f"{prefix}/USER_GUIDE.md", guide)
    archive.writestr(f"{prefix}/REFIT_REVIEW.md", (ROOT/"REFIT_REVIEW.md").read_bytes())
    archive.writestr(f"{prefix}/JOINT_INFERENCE.md", (ROOT/"JOINT_INFERENCE.md").read_bytes())
    archive.writestr(f"{prefix}/FRONTIER_VALIDATION.md", (ROOT/"FRONTIER_VALIDATION.md").read_bytes())
    archive.writestr(f"{prefix}/REFERENCES.bib", bibliography(record))
    archive.writestr(f"{prefix}/validation_evidence.json", json.dumps(json_safe(validation_evidence()), indent=2, allow_nan=False))
