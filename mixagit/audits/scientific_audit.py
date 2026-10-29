"""Independent scientific checks. Does not change the application or live Space."""

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import sys
from unittest.mock import patch
import warnings

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for name in ["streamlit", "streamlit.runtime.scriptrunner_utils.script_run_context"]:
    logging.getLogger(name).setLevel(logging.ERROR)

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats
from scipy.integrate import solve_ivp

import mixa_app as app
from mixa_reporting import analyze_repeats, summarize_repeats
from mixa_science import fit_profile_isotherm


DESTINATION = ROOT / "preview" / "scientific_audit"
CHECKS = []


def check(name, passed, evidence, priority="P1"):
    CHECKS.append({"name": name, "status": "PASS" if passed else "FAIL", "priority": priority,
                   "evidence": evidence})
    print(f"{CHECKS[-1]['status']}: {name}", flush=True)


def dataset(name, time, responses, repeat=None):
    return {"filename": name, "repeat_id": repeat or name, "repeat_group": "Audit",
            "time": time, "responses": responses, "concentrations": sorted(responses)}


def reference_kinetics(time, kon, koff, rmax, concentration, on=20., off=100.):
    # An independently integrated one-compartment mass-action model.
    bound = time[(time >= on) & (time <= off)]
    association = solve_ivp(lambda t, r: [kon * concentration * (rmax - r[0]) - koff * r[0]],
                            (on, off), [0.], dense_output=True, rtol=1e-10, atol=1e-11)
    result = np.zeros_like(time)
    result[(time >= on) & (time <= off)] = association.sol(bound)[0]
    later = time[time > off]
    if len(later):
        dissociation = solve_ivp(lambda t, r: [-koff * r[0]], (off, float(later[-1])),
                                association.sol(off), dense_output=True, rtol=1e-10, atol=1e-11)
        result[time > off] = dissociation.sol(later)[0]
    return result


def equilibrium_data(kd, concentrations, capacities=(100.,)):
    time = np.arange(181.)
    return [dataset(f"eq_{i}.csv", time, {
        c: np.where(time >= 20, capacity * c / (kd + c), 0.) for c in concentrations})
        for i, capacity in enumerate(capacities)]


def main_checks():
    rng = np.random.default_rng(1729)
    time = np.arange(181.)
    concentrations = [5., 15., 50., 150., 500.]
    kon, koff = 1.2e5, .012
    clean = {c: reference_kinetics(time, kon, koff, 100., c * 1e-9) for c in concentrations}
    equation_error = max(float(np.max(np.abs(clean[c] - app.model_1to1(time, kon, koff, 100., c * 1e-9, 20., 100.))))
                         for c in concentrations)
    data = [dataset("kinetic.csv", time, {c: y + rng.normal(0., .03, len(time)) for c, y in clean.items()})]
    included = {data[0]["filename"]: set(concentrations)}
    fit = app.fit_kinetics_shared_params(data, 20., 100., included)
    check("one_to_one_equations_and_parameter_recovery", equation_error < 1e-6 and
          abs(fit["global_kon"] / kon - 1) < .01 and abs(fit["global_koff"] / koff - 1) < .01,
          {"max_equation_error_response_units": equation_error, "true_kon": kon, "fitted_kon": fit["global_kon"],
           "true_koff": koff, "fitted_koff": fit["global_koff"], "true_KD_nM": koff / kon * 1e9,
           "fitted_KD_nM": fit["global_KD"] * 1e9})
    check("fitted_rmax_uncertainty_not_reported_as_exact_zero",
          all(f["Rmax_err"] > 0 for f in fit["individual_fits"]),
          {"reported_Rmax_errors": [f["Rmax_err"] for f in fit["individual_fits"]],
           "noise_sd": .03, "note": "Rmax was estimated, not fixed."}, "P2")

    mask = ((time >= 32) & (time <= 90)) | ((time >= 110) & (time <= 160))
    model_parameters = {
        "two_state": (app.model_2_state, (kon, koff, 100., .04, .008, 50e-9, 20., 100.)),
        "transport_lag": (app.model_1to1_mass_transport, (kon, koff, 100., .1, 50e-9, 20., 100.))}
    for name, (model, parameters) in model_parameters.items():
        full, trimmed = model(time, *parameters)[mask], model(time[mask], *parameters)
        error = float(np.max(np.abs(full - trimmed)))
        check(f"{name}_predictions_invariant_to_unobserved_time_grid", error < 1e-6,
              {"max_same_time_prediction_difference": error, "first_selected_time_s": float(time[mask][0]),
               "prediction_full_grid_first_point": float(full[0]), "prediction_trimmed_grid_first_point": float(trimmed[0]),
               "note": "Parameters and physical phase transitions are identical; only observation times differ."})

    parameters = np.array([kon, koff, 100., .04, .008])
    response = app.model_2_state(time, *parameters, 50e-9, 20., 100.)
    with patch.object(app, "multi_start_curve_fit", return_value=(parameters, np.eye(5) * 1e-12)):
        fitted = app.fit_kinetics_advanced(time, response, 50e-9, 20., 100., model="2-state", show_warnings=False)
    effective_kd = (koff / kon) / (1 + parameters[3] / parameters[4])
    check("two_state_reported_affinity_matches_total_equilibrium_occupancy",
          np.isclose(fitted["KD"], effective_kd),
          {"reported_KD_nM": fitted["KD"] * 1e9, "overall_equilibrium_KD_nM": effective_kd * 1e9,
           "microscopic_first_step_KD_nM": koff / kon * 1e9,
           "note": "Injected known converged parameters isolate the reporting formula, not solver accuracy."})

    saturated = equilibrium_data(33., [3.3, 10., 33., 100., 330.])
    eq_included = {d["filename"]: set(d["concentrations"]) for d in saturated}
    eq = app.fit_equilibrium_advanced(saturated, 90., eq_included, aggregate_repeats=True, t_assoc_start=20.)
    check("well_saturated_equilibrium_parameter_recovery", abs(eq["KD"] / 33. - 1) < 1e-5,
          {"true_KD_nM": 33., "fitted_KD_nM": eq["KD"], "fitted_Rmax": eq["Rmax"]})

    unsaturated = equilibrium_data(10000., concentrations, capacities=(95., 100., 105.))
    eq_included = {d["filename"]: set(d["concentrations"]) for d in unsaturated}
    eq = app.fit_equilibrium_advanced(unsaturated, 90., eq_included, aggregate_repeats=True, t_assoc_start=20.)
    settings = {"equilibrium_sampling_time_s": 90., "equilibrium_model_code": "simple",
                "aggregate_repeats": True, "normalize_percent_bmax": False, "phase_assoc_start_s": 20.}
    eq["fit_settings"] = settings
    with patch("mixa_reporting.project_context", return_value={}):
        report = analyze_repeats(unsaturated, eq_included, {"Equilibrium": eq}, {"equilibrium": app.fit_equilibrium_advanced})
    bound = max(float(np.max(eq["responses"])) * 2., 1.)
    check("unsaturated_isotherm_does_not_report_unflagged_bound_limited_affinity",
          abs(eq["KD"] / 10000. - 1) < .05 and eq.get("summary_eligible") is False
          and report["summary"].iloc[0].n_independent == 0,
          {"true_KD_nM": 10000., "fitted_KD_nM": eq["KD"], "fitted_Rmax": eq["Rmax"],
           "former_Rmax_cap_for_comparison_only": bound, "r_squared": eq["r_squared"], "conditional_KD_SE_nM": eq["KD_err"],
           "repeat_KD_mean_nM": float(report["summary"].iloc[0]["mean"]),
           "repeat_KD_sd_nM": float(report["summary"].iloc[0].sd),
           "repeat_statuses": report["repeat_estimates"].status.tolist(),
           "summary_eligible": eq.get("summary_eligible"), "KD_profile_ci95": eq.get("KD_profile_ci95"),
           "boundary_parameters": eq.get("boundary_parameters", [])})
    fig, ax = plt.subplots(figsize=(6.5, 4), layout="constrained")
    ax.plot(eq["concentrations"], eq["responses"], "o", label="Known synthetic equilibrium data")
    ax.plot(eq["conc_fit"], eq["response_fit"], label=f"Current fit: KD {eq['KD']:.0f} nM")
    ax.plot(eq["conc_fit"], 100 * eq["conc_fit"] / (10000 + eq["conc_fit"]), "--", label="Truth: KD 10000 nM")
    ax.set(xlabel="Concentration (nM)", ylabel="Response (input units)")
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False)
    fig.savefig(DESTINATION / "unsaturated_isotherm_audit.png", dpi=180)
    plt.close(fig)

    slow = [dataset("non_equilibrium.csv", time, {c: .1 * time for c in concentrations})]
    inc = {slow[0]["filename"]: set(concentrations)}
    before = app.evaluate_equilibrium_attainment(slow, inc, 85.)
    changed = deepcopy(slow)
    for y in changed[0]["responses"].values():
        y[time > 85.] += 1e6
    after = app.evaluate_equilibrium_attainment(changed, inc, 85.)
    check("steady_state_classification_does_not_depend_on_future_excluded_data",
          before["equilibrium_reached"] == after["equilibrium_reached"] and
          np.isclose(before["overall_score"], after["overall_score"]),
          {"sampling_time_s": 85., "classification_before": before["equilibrium_reached"],
           "classification_after": after["equilibrium_reached"], "score_before": before["overall_score"],
           "score_after": after["overall_score"], "note": "All data up to and including the sampling time are unchanged."})

    estimates = pd.DataFrame({"method": ["Kinetic"] * 3, "status": ["Complete"] * 3,
        "kon": [1e5, 1.2e5, 1.4e5], "koff": [.0028, .00396, .00532], "KD_nM": [28., 33., 38.]})
    summary = summarize_repeats(estimates)
    kd = summary.loc[summary.parameter == "K_D"].iloc[0]
    single = summarize_repeats(estimates.iloc[:1])
    check("independent_repeat_sd_sem_and_single_repeat_reporting",
          kd["mean"] == 33. and kd.sd == 5. and np.isclose(kd["sem"], 5 / np.sqrt(3)) and
          single.sd.isna().all() and single.ci95_low.isna().all(),
          {"KD_mean_nM": kd["mean"], "KD_sd_nM": kd.sd, "KD_sem_nM": kd["sem"],
           "n_independent": int(kd.n_independent), "single_repeat_SD_unavailable": bool(single.sd.isna().all())})
    kobs = app.fit_kobs_linearization(data, included, 20., 100.)
    table = kobs["concentration_table"]
    check("single_repeat_kobs_sd_is_missing_not_zero", bool(table.kobs_sd.isna().all()),
          {"n_per_concentration": table.kobs_n.tolist(), "reported_kobs_SD": table.kobs_sd.tolist()}, "P2")


def model_selection_checks():
    curves = [dict(filename=f"c{i}", time=np.arange(40.), response=np.ones(40),
                   fit_mask=np.arange(40.) >= 20, concentration_M=float(i + 1), concentration_nM=float(i + 1))
              for i in range(3)]

    def fit(*args, **kwargs):
        model = kwargs["model"]
        if model == "1:1+MT" and args[2] != 1.:
            return None
        p = {"1:1": 3, "1:1+MT": 4, "2-state": 5}[model]
        residual = np.full(20, 10.)
        aic, bic = app.calculate_aic_bic(residual, p)
        return {"residuals_fit": residual, "residuals": np.full(40, 10.), "n_params": p,
                "aic": aic, "bic": bic, "r_squared": .9, "quality_score": 90.}

    with patch.object(app, "_collect_kinetic_curves", return_value=curves), \
            patch.object(app, "fit_kinetics_advanced", side_effect=fit):
        result = app.evaluate_kinetic_model_candidates([], 0., 20., {})
    rows = result["table"]
    comparable = [r for r in rows if r.get("Comparable")]
    incomplete = [r for r in rows if not r.get("Comparable")]
    check("model_selection_compares_identical_observation_sets",
          len(comparable) >= 2 and all(r["Fits"] == len(curves) and r["N Points"] == 60 for r in comparable)
          and all(not np.isfinite(r["Total AICc"]) for r in incomplete)
          and result["recommended"]["code"] != "1:1+MT",
          {"model_fit_counts": {r["Model"]: r["Fits"] for r in rows},
           "recommended": result["recommended"]["Model"], "confidence": result["confidence"],
           "note": "Injected fit outcomes isolate selection logic when one model fails on two of three curves."}, "P2")
    simple = next(r for r in rows if r["code"] == "1:1")
    # Independent calculation: three mean parameters AND an estimated residual variance per curve.
    n, k = 20, 4
    log_likelihood = -.5 * n * (np.log(2 * np.pi * 100.) + 1)
    expected = 3 * (-2 * log_likelihood + 2 * k + 2 * k * (k + 1) / (n - k - 1))
    check("aicc_uses_selected_observation_count", np.isclose(simple["Total AICc"], expected),
          {"reported_AICc": simple["Total AICc"], "expected_AICc": expected,
           "selected_points_per_curve": 20, "full_points_per_curve": 40}, "P2")


def coverage_experiment(n):
    rng = np.random.default_rng(9017)
    time = np.arange(0., 181., 2.)
    truth = np.array([1.2e5, .012, 100.])
    output = {}
    for rho in [0., .85]:
        estimates, errors = [], []
        for _ in range(n):
            curves = []
            for c in [15., 50., 500.]:
                noise = rng.normal(0., .2, len(time))
                for j in range(1, len(noise)):
                    noise[j] = rho * noise[j - 1] + np.sqrt(1 - rho ** 2) * noise[j]
                y = reference_kinetics(time, truth[0], truth[1], 100., c * 1e-9) + noise
                curves.append(dict(filename="repeat.csv", rmax_group="repeat.csv", time=time, response=y,
                    concentration_M=c * 1e-9, model_baseline=0., fit_mask=time >= 20.))
            fit = app._shared_kinetics_fit(curves, 20., 100., allow_curve_offsets=False,
                seed_from_individual=False, fast_mode=True, max_nfev=3500, max_runtime_s=8.)
            if fit and fit.get("covariance_rates") is not None:
                kd = fit["koff"] / fit["kon"] * 1e9
                gradient = np.array([-fit["koff"] / fit["kon"] ** 2, 1 / fit["kon"]]) * 1e9
                kd_se = np.sqrt(max(float(gradient @ fit["covariance_rates"] @ gradient), 0.))
                estimates.append([fit["kon"], fit["koff"], kd])
                errors.append([fit["kon_sem"], fit["koff_sem"], kd_se])
        estimates, errors = np.asarray(estimates), np.asarray(errors)
        covered = np.abs(estimates - truth) <= stats.norm.ppf(.975) * errors
        output[str(rho)] = {"n_converged": len(estimates), "requested": n,
            "coverage_nominal_95_percent": dict(zip(["kon", "koff", "KD"], np.mean(covered, axis=0).tolist())),
            "empirical_sd_divided_by_mean_reported_se": dict(zip(["kon", "koff", "KD"],
                (np.std(estimates, axis=0, ddof=1) / np.mean(errors, axis=0)).tolist()))}
    return {"status": "EXPLORATORY", "stationary_noise_sd": .2, "known_baseline": 0.,
            "time_step_s": 2., "seed": 9017, "conditions_by_AR1_rho": output,
            "note": "A small, seeded experiment, not a general coverage certification. Each 95% interval is estimate +/- 1.96 conditional model SE."}


def profile_coverage_experiment(n):
    rng = np.random.default_rng(6120)
    conditions = {}
    for name, true_kd, concentrations, noise_sd in [
        ("saturated", 33., np.array([1., 3., 10., 33., 100., 330., 1000.]), 1.),
        ("weak_saturation", 10000., np.array([5., 15., 50., 150., 500.]), .1),
    ]:
        covered = eligible = open_upper = 0
        for _ in range(n):
            response = 100 * concentrations / (true_kd + concentrations) + rng.normal(0., noise_sd, len(concentrations))
            fit = fit_profile_isotherm(concentrations, response)
            low, high = fit["KD_profile_ci95"]
            covered += low <= true_kd <= high
            eligible += fit["summary_eligible"]
            open_upper += np.isinf(high)
        conditions[name] = {"requested": n, "true_KD_nM": true_kd, "noise_sd": noise_sd,
                            "profile_interval_coverage": covered / n, "summary_eligible_fraction": eligible / n,
                            "open_upper_interval_fraction": open_upper / n}
    return {"status": "EXPLORATORY", "seed": 6120, "conditions": conditions,
            "note": "Simple isotherm, known zero offset, independent Gaussian response noise, residual variance estimated. Not a general calibration or Hill-model certification."}


def clean_json(value):
    if isinstance(value, dict):
        return {k: clean_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean_json(v) for v in value]
    if isinstance(value, (float, np.floating)):
        return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.integer, np.bool_)):
        return value.item()
    return value


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--coverage-repeats", type=int, default=60)
    args = parser.parse_args()
    if args.coverage_repeats < 2:
        parser.error("--coverage-repeats must be at least 2")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        main_checks()
        model_selection_checks()
        coverage = coverage_experiment(args.coverage_repeats)
        profile_coverage = profile_coverage_experiment(args.coverage_repeats)
    results = {"created_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Post-hardening local preview verification. No changes deployed to the live Space. Original pre-hardening evidence is preserved in scientific_audit_before_hardening.",
        "application_source_sha256": {n: hashlib.sha256((ROOT / n).read_bytes()).hexdigest()
            for n in ["mixa_app.py", "mixa_reporting.py", "mixa_data.py", "mixa_figures.py", "mixa_selection.py", "mixa_science.py"]},
        "checks": CHECKS, "conditional_interval_coverage": coverage, "equilibrium_profile_coverage": profile_coverage}
    (DESTINATION / "results.json").write_text(json.dumps(clean_json(results), indent=2, allow_nan=False) + "\n")
    print(json.dumps(clean_json(coverage), indent=2), flush=True)
    print(json.dumps(clean_json(profile_coverage), indent=2), flush=True)
    print(f"Evidence: {DESTINATION / 'results.json'}", flush=True)
    sys.exit(1 if any(c["status"] == "FAIL" for c in CHECKS) else 0)
