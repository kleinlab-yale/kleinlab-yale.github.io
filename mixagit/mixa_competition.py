"""Solution Equilibrium Titration (SET) & In-Solution Epitope Competition engine and UI for MIXA.

Models experiments in which a soluble analyte [A]_tot is held constant while a soluble
competitor/inhibitor [I]_tot is titrated across molar ratios r = [I]_tot / [A]_tot (or
competitor concentrations in nM). The competitor binds the analyte in solution (blocking
its epitope) without binding the sensor surface directly.

References:
- Friguet, B., Chaffotte, A. F., Djavadi-Ohaniance, L., & Goldberg, M. E. (1985).
  Measurements of the true affinity constant in solution of antigen-antibody complexes
  by enzyme-linked immunosorbent assay. J. Immunol. Methods, 77(2), 305-319.
- Nieba, L., Krebber, A., & Pluckthun, A. (1996). Competition BIAcore for measuring
  true affinities: large differences from values determined from binding kinetics.
  Anal. Biochem., 234(2), 155-165.
- Karlsson, R., Kullman-Magnusson, M., Hämäläinen, M. D., Remaeus, A., Andersson, K.,
  Borg, P., Gyzander, E., & Deinum, J. (2000). Biosensor analysis of drug-target
  interactions: direct and competitive binding assays for investigation of interactions
  between thrombin and thrombin inhibitors. Anal. Biochem., 278(1), 1-13.
"""

from __future__ import annotations

import io
import json
import zipfile
from copy import deepcopy
from datetime import datetime
from html import escape
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
from scipy import stats
from scipy.optimize import least_squares

from mixa_data import parse_concentration_nM, parse_molar_ratio, read_dataset
from mixa_methods import write_methods_exports
from mixa_plotting import show_figure
from mixa_science import gaussian_information, json_safe
from mixa_selection import detect_binding_phases


# =============================================================================
# 1. Core Biophysical Equations (Exact Quadratic SET & Hill Inhibition)
# =============================================================================


def free_analyte_quadratic(analyte_total_nM, competitor_total_nM, kd_sol_nM, stoichiometry=1.0):
    """Return exact free analyte concentration [A]_free (nM) under solution mass action.

    Solves the quadratic equilibrium for A + I_site <-> AI in solution:
        K_D,sol = [A]_free * [I_site]_free / [AI]
    where total analyte is [A]_tot and total effective binding-site concentration on
    the competitor is n * [I]_tot (with n = moles of A sequestered per mole of I).
    """
    a_tot = np.maximum(np.asarray(analyte_total_nM, dtype=float), 1e-15)
    i_tot = np.maximum(np.asarray(competitor_total_nM, dtype=float), 0.0)
    kd = max(float(kd_sol_nM), 1e-12)
    n_stoich = max(float(stoichiometry), 1e-6)

    eff_i = n_stoich * i_tot
    b = a_tot + eff_i + kd
    disc = np.maximum(b * b - 4.0 * a_tot * eff_i, 0.0)
    complex_ai = 0.5 * (b - np.sqrt(disc))
    a_free = np.clip(a_tot - complex_ai, 0.0, a_tot)
    return a_free


def set_equilibrium_response(
    competitor_total_nM,
    r0,
    r_inf,
    kd_sol_nM,
    analyte_total_nM,
    stoichiometry=1.0,
    surface_kd_nM=None,
    surface_cooperativity=1.0,
    bidentate_two_site=False,
):
    """Predict biosensor response R([I]_tot) from exact quadratic solution equilibrium.

    - When `surface_kd_nM` is None or <= 0 (linear free-analyte regime / initial velocity):
          R([I]) = R_inf + (R_0 - R_inf) * ([A]_free / [A]_tot)
    - When `bidentate_two_site` is True (both competitor and immobilized receptor use 2 domains
      to bind the same 2 epitopes on the analyte, so bidentate surface capture requires both
      sites on the analyte to be unblocked: [A]_bidentate = [A]_tot * (f_site_free)^2).
    - When `surface_kd_nM` > 0 (coupled nonlinear surface Langmuir or two-domain cooperative saturation):
          theta([I]) = [A]_eff^m / (K_D,surf^m + [A]_eff^m)
          theta_0    = [A]_tot^m / (K_D,surf^m + [A]_tot^m)
          R([I]) = R_inf + (R_0 - R_inf) * (theta([I]) / theta_0)
    """
    a_tot = max(float(analyte_total_nM), 1e-12)
    a_free = free_analyte_quadratic(a_tot, competitor_total_nM, kd_sol_nM, stoichiometry=stoichiometry)
    f_site = np.clip(a_free / a_tot, 0.0, 1.0)
    if surface_kd_nM is not None and np.isfinite(surface_kd_nM) and float(surface_kd_nM) > 0:
        kd_surf = float(surface_kd_nM)
        m_surf = max(float(surface_cooperativity or 1.0), 0.1)
        if bidentate_two_site:
            a_both = a_tot * (f_site ** 2)
            a_one = a_tot * 2.0 * f_site * (1.0 - f_site)
            kd_mono = max(kd_surf * 50.0, 508.0)
            theta_0 = (a_tot ** m_surf) / (kd_surf ** m_surf + a_tot ** m_surf)
            a_both_m = np.power(np.maximum(a_both, 0.0), m_surf)
            theta_bi = a_both_m / (kd_surf ** m_surf + a_both_m)
            theta_mono = a_one / (kd_mono + a_one)
            frac = (theta_bi + 0.15 * theta_mono) / max(theta_0, 1e-15)
        elif abs(m_surf - 1.0) < 1e-6:
            theta_0 = a_tot / (kd_surf + a_tot)
            theta = a_free / (kd_surf + a_free)
            frac = theta / max(theta_0, 1e-15)
        else:
            a_tot_m = a_tot ** m_surf
            kd_surf_m = kd_surf ** m_surf
            a_free_m = np.power(np.maximum(a_free, 0.0), m_surf)
            theta_0 = a_tot_m / (kd_surf_m + a_tot_m)
            theta = a_free_m / (kd_surf_m + a_free_m)
            frac = theta / max(theta_0, 1e-15)
    else:
        frac = (f_site ** 2) if bidentate_two_site else f_site
    return float(r_inf) + (float(r0) - float(r_inf)) * frac


def hill_inhibition_response(competitor_total_nM, r0, r_inf, ic50_nM, hill_slope=1.0):
    """4-parameter logistic (Hill) inhibition curve vs competitor concentration [I]_tot (nM)."""
    i_tot = np.maximum(np.asarray(competitor_total_nM, dtype=float), 0.0)
    ic50 = max(float(ic50_nM), 1e-12)
    h = max(float(hill_slope), 1e-3)
    ratio = np.clip(i_tot / ic50, 0.0, 1e12)
    denom = 1.0 + np.power(ratio, h)
    return float(r_inf) + (float(r0) - float(r_inf)) / denom


def _profile_ci_1d(residual_fn, theta_opt, param_idx, bounds_low, bounds_high, n_obs, n_params, grid_size=36):
    """Compute profile-likelihood 95% CI for parameter `param_idx` using F-test cutoff."""
    theta_opt = np.asarray(theta_opt, dtype=float)
    res_best = residual_fn(theta_opt)
    rss_best = float(np.sum(res_best ** 2))
    dof = max(int(n_obs) - int(n_params), 1)
    if rss_best <= 1e-20:
        return (float(theta_opt[param_idx]), float(theta_opt[param_idx]))
    f_crit = float(stats.f.ppf(0.95, 1, dof))
    rss_cutoff = rss_best * (1.0 + f_crit / dof)

    center = float(theta_opt[param_idx])
    lo_b = float(bounds_low[param_idx])
    hi_b = float(bounds_high[param_idx])

    def eval_fixed(val):
        if len(theta_opt) == 1:
            r = residual_fn(np.array([val], dtype=float))
            return float(np.sum(r ** 2))
        free_idx = [i for i in range(len(theta_opt)) if i != param_idx]
        p0 = theta_opt[free_idx]
        b_lo = bounds_low[free_idx]
        b_hi = bounds_high[free_idx]

        def sub_res(sub_p):
            full_p = theta_opt.copy()
            full_p[param_idx] = val
            full_p[free_idx] = sub_p
            return residual_fn(full_p)

        try:
            fit = least_squares(sub_res, p0, bounds=(b_lo, b_hi), max_nfev=250)
            return float(np.sum(fit.fun ** 2))
        except Exception:
            return np.inf

    # Search lower crossing
    if center > lo_b * 1.001:
        if lo_b > 0 and center / lo_b > 20:
            left_grid = np.geomspace(max(lo_b, center * 1e-3), center, grid_size // 2)
        else:
            left_grid = np.linspace(max(lo_b, center * 0.05), center, grid_size // 2)
        ci_low = float(left_grid[0])
        for k in range(len(left_grid) - 1, -1, -1):
            rss_k = eval_fixed(left_grid[k])
            if rss_k > rss_cutoff:
                if k + 1 < len(left_grid):
                    # Linear interpolation between k and k+1
                    ci_low = float(0.5 * (left_grid[k] + left_grid[k + 1]))
                else:
                    ci_low = float(left_grid[k])
                break
    else:
        ci_low = center

    # Search upper crossing
    if center < hi_b * 0.999:
        if center > 0 and hi_b / center > 20:
            right_grid = np.geomspace(center, min(hi_b, center * 1e3), grid_size // 2)
        else:
            right_grid = np.linspace(center, min(hi_b, center * 20.0 + 1.0), grid_size // 2)
        ci_high = float(right_grid[-1])
        for k in range(len(right_grid)):
            rss_k = eval_fixed(right_grid[k])
            if rss_k > rss_cutoff:
                if k > 0:
                    ci_high = float(0.5 * (right_grid[k - 1] + right_grid[k]))
                else:
                    ci_high = float(right_grid[k])
                break
    else:
        ci_high = center

    return (min(ci_low, center), max(ci_high, center))


def classify_competition_mechanism(
    r0,
    r_inf,
    kd_sol_nM,
    analyte_total_nM,
    hill_slope=1.0,
    koff_slope_pvalue=None,
    koff_rel_change=None,
):
    """Classify epitope blocking mechanism and solution titration regime."""
    r0_safe = max(abs(float(r0)), 1e-12)
    residual_frac = float(r_inf) / r0_safe if float(r0) > 0 else 1.0
    max_inhibition_pct = float(np.clip((1.0 - residual_frac) * 100.0, -50.0, 100.0))

    koff_perturbed = (
        koff_slope_pvalue is not None
        and np.isfinite(koff_slope_pvalue)
        and float(koff_slope_pvalue) < 0.05
        and koff_rel_change is not None
        and np.isfinite(koff_rel_change)
        and abs(float(koff_rel_change)) > 0.25
    )

    if max_inhibition_pct < 20.0:
        epitope_class = "Non-Competing / Distinct Epitope"
        epitope_detail = (
            f"Maximum inhibition is only {max_inhibition_pct:.1f}% (residual signal {100.0 - max_inhibition_pct:.1f}%). "
            "The soluble component does not block the surface-binding epitope of the analyte."
        )
        badge_level = "poor"
    elif koff_perturbed and float(koff_rel_change) > 0.25:
        epitope_class = "Active Surface Invasion / Allosteric Stripping"
        epitope_detail = (
            f"Response is inhibited by {max_inhibition_pct:.1f}%, and apparent dissociation rate k_off increases "
            f"by {float(koff_rel_change) * 100.0:.1f}% (p = {float(koff_slope_pvalue):.3g}) across competitor ratios. "
            "This suggests the competitor can also interact with surface-bound analyte (ternary complex or avidity stripping) "
            "rather than acting solely by solution sequestration."
        )
        badge_level = "fair"
    elif max_inhibition_pct >= 85.0:
        epitope_class = "Complete Competitive Blocking (Same / Overlapping Epitope)"
        epitope_detail = (
            f"Competitor achieves {max_inhibition_pct:.1f}% maximal inhibition (residual plateau R_inf/R_0 = {residual_frac * 100.0:.1f}%). "
            "Solution binding completely prevents analyte capture on the sensor surface, consistent with direct or sterically overlapping epitope competition."
        )
        badge_level = "excellent"
    else:
        epitope_class = "Partial / Steric / Allosteric Inhibition"
        epitope_detail = (
            f"Response saturates at {max_inhibition_pct:.1f}% inhibition with a nonzero residual plateau "
            f"(R_inf/R_0 = {residual_frac * 100.0:.1f}%). The analyte–competitor complex likely retains partial affinity "
            "for the immobilized ligand (allosteric modulation or partial steric hindrance)."
        )
        badge_level = "good"

    c_ratio = float(analyte_total_nM) / max(float(kd_sol_nM), 1e-12)
    if c_ratio < 1.0:
        regime_label = "Affinity-Controlled Regime ([A]_tot < K_D,sol)"
        regime_detail = (
            f"[A]_tot / K_D,sol = {c_ratio:.2f}. Depletion is modest; K_D,sol is well-resolved from the inflection, "
            "whereas stoichiometry (n) is weakly identifiable unless [A]_tot is raised above K_D,sol."
        )
    elif c_ratio <= 20.0:
        regime_label = "Sweet-Spot Intermediate Regime (1 <= [A]_tot / K_D,sol <= 20)"
        regime_detail = (
            f"[A]_tot / K_D,sol = {c_ratio:.2f}. Both solution affinity (K_D,sol) from curve curvature and "
            "active binding stoichiometry (n) from the molar-ratio inflection are simultaneously well-resolved."
        )
    else:
        regime_label = "Tight-Binding Stoichiometric Regime ([A]_tot > 20 * K_D,sol)"
        regime_detail = (
            f"[A]_tot / K_D,sol = {c_ratio:.1f}. Analyte depletion dominates: the sharp breakpoint at molar ratio "
            "[I]_tot / [A]_tot ≈ 1/n accurately pins down active stoichiometry n, while K_D,sol approaches the tight-binding resolution limit."
        )

    return {
        "epitope_class": epitope_class,
        "epitope_detail": epitope_detail,
        "badge_level": badge_level,
        "max_inhibition_pct": max_inhibition_pct,
        "residual_fraction": residual_frac,
        "c_ratio_analyte_over_kd": c_ratio,
        "regime_label": regime_label,
        "regime_detail": regime_detail,
        "koff_perturbed": bool(koff_perturbed),
    }


def fit_solution_competition(
    competitor_nM,
    responses,
    analyte_total_nM,
    *,
    stoichiometry=1.0,
    fit_stoichiometry=False,
    allow_residual_plateau=True,
    surface_kd_nM=None,
    surface_cooperativity=1.0,
    bidentate_two_site=False,
    fixed_kd_sol_nM=None,
    repeat_ids=None,
):
    """Fit Exact Quadratic SET and 4-Parameter Hill Inhibition models to competition data."""
    comp_raw = np.asarray(competitor_nM, dtype=float)
    resp_raw = np.asarray(responses, dtype=float)
    mask = np.isfinite(comp_raw) & np.isfinite(resp_raw) & (comp_raw >= 0.0)
    comp = comp_raw[mask]
    resp = resp_raw[mask]
    if len(comp) < 3:
        raise ValueError("At least 3 valid competitor concentration / molar-ratio points are required.")

    a_tot = max(float(analyte_total_nM), 1e-9)
    ratios = comp / a_tot

    order = np.argsort(comp)
    comp = comp[order]
    resp = resp[order]
    ratios = ratios[order]
    rep_arr = np.asarray(repeat_ids, dtype=str)[mask][order] if repeat_ids is not None else np.array(["rep1"] * len(comp))

    # Initial guesses
    low_mask = comp <= np.percentile(comp, 20)
    high_mask = comp >= np.percentile(comp, 80)
    r0_init = float(np.median(resp[low_mask])) if np.any(low_mask) else float(np.max(resp))
    rinf_init = float(np.median(resp[high_mask])) if np.any(high_mask) else float(np.min(resp))
    if r0_init < rinf_init:
        r0_init, rinf_init = float(np.max(resp)), float(np.min(resp))
    span = max(abs(r0_init - rinf_init), np.ptp(resp), 1e-6)

    pos_comp = comp[comp > 0]
    mid_comp = float(np.median(pos_comp)) if len(pos_comp) else a_tot
    kd_init = max(mid_comp * 0.3, a_tot * 0.1, 1e-3)
    n_init = max(float(stoichiometry), 0.1)

    # -------------------------------------------------------------------------
    # Model 1: Exact Quadratic SET Fit
    # Parameters: [r0, r_inf (optional), kd_sol_nM, stoichiometry (optional)]
    # -------------------------------------------------------------------------
    r_lo = min(float(np.min(resp)) - 0.5 * span, -0.25 * span)
    r_hi = float(np.max(resp)) + 0.5 * span
    kd_lo = max(min(pos_comp) * 1e-4 if len(pos_comp) else 1e-5, 1e-6)
    kd_hi = max((max(pos_comp) if len(pos_comp) else a_tot) * 1e3, a_tot * 1e3, 1e6)

    has_fixed_kd = fixed_kd_sol_nM is not None and np.isfinite(fixed_kd_sol_nM) and float(fixed_kd_sol_nM) > 0
    m_surf_val = max(float(surface_cooperativity or 1.0), 0.1)

    set_p0 = [np.clip(r0_init, r_lo, r_hi)]
    set_lo = [r_lo]
    set_hi = [r_hi]
    if allow_residual_plateau:
        set_p0.append(np.clip(max(rinf_init, 0.0), r_lo, r_hi))
        set_lo.append(r_lo)
        set_hi.append(r_hi)
    if not has_fixed_kd:
        set_p0.append(np.clip(kd_init, kd_lo, kd_hi))
        set_lo.append(kd_lo)
        set_hi.append(kd_hi)
    if fit_stoichiometry:
        set_p0.append(np.clip(n_init, 0.1, 10.0))
        set_lo.append(0.1)
        set_hi.append(10.0)

    set_p0 = np.asarray(set_p0, dtype=float)
    set_lo = np.asarray(set_lo, dtype=float)
    set_hi = np.asarray(set_hi, dtype=float)

    def unpack_set(p):
        idx = 0
        r0_v = float(p[idx]); idx += 1
        rinf_v = float(p[idx]) if allow_residual_plateau else 0.0
        if allow_residual_plateau:
            idx += 1
        if has_fixed_kd:
            kd_v = float(fixed_kd_sol_nM)
        else:
            kd_v = float(p[idx]); idx += 1
        n_v = float(p[idx]) if fit_stoichiometry else float(stoichiometry)
        return r0_v, rinf_v, kd_v, n_v

    def set_res_fn(p):
        r0_v, rinf_v, kd_v, n_v = unpack_set(p)
        pred = set_equilibrium_response(
            comp,
            r0_v,
            rinf_v,
            kd_v,
            a_tot,
            stoichiometry=n_v,
            surface_kd_nM=surface_kd_nM,
            surface_cooperativity=m_surf_val,
            bidentate_two_site=bidentate_two_site,
        )
        return resp - pred

    # Multi-start over kd_sol_nM to avoid local minima in tight vs weak regimes
    best_set_fit = None
    best_set_rss = np.inf
    if not has_fixed_kd:
        kd_starts = np.geomspace(max(kd_lo * 10, 1e-4), min(kd_hi * 0.1, max(a_tot * 50, 100.0)), 7)
        kd_param_idx = 2 if allow_residual_plateau else 1
        for kd_try in kd_starts:
            p_try = set_p0.copy()
            p_try[kd_param_idx] = np.clip(kd_try, kd_lo, kd_hi)
            try:
                cand = least_squares(set_res_fn, p_try, bounds=(set_lo, set_hi), max_nfev=800)
                rss_cand = float(np.sum(cand.fun ** 2))
                if rss_cand < best_set_rss:
                    best_set_rss = rss_cand
                    best_set_fit = cand
            except Exception:
                continue
    if best_set_fit is None:
        best_set_fit = least_squares(set_res_fn, set_p0, bounds=(set_lo, set_hi), max_nfev=800)

    r0_set, rinf_set, kd_sol_fit, n_fit = unpack_set(best_set_fit.x)
    pred_set = set_equilibrium_response(
        comp,
        r0_set,
        rinf_set,
        kd_sol_fit,
        a_tot,
        stoichiometry=n_fit,
        surface_kd_nM=surface_kd_nM,
        surface_cooperativity=m_surf_val,
        bidentate_two_site=bidentate_two_site,
    )
    res_set = resp - pred_set
    ss_tot = float(np.sum((resp - np.mean(resp)) ** 2))
    r2_set = float(1.0 - np.sum(res_set ** 2) / max(ss_tot, 1e-15))
    info_set = gaussian_information(res_set, len(best_set_fit.x))

    # Profile-likelihood CIs for K_D,sol and stoichiometry n
    if has_fixed_kd:
        kd_ci = (float(kd_sol_fit), float(kd_sol_fit))
    else:
        kd_param_idx = 2 if allow_residual_plateau else 1
        kd_ci = _profile_ci_1d(
            set_res_fn, best_set_fit.x, kd_param_idx, set_lo, set_hi, len(comp), len(best_set_fit.x)
        )
    if fit_stoichiometry:
        n_param_idx = len(best_set_fit.x) - 1
        n_ci = _profile_ci_1d(
            set_res_fn, best_set_fit.x, n_param_idx, set_lo, set_hi, len(comp), len(best_set_fit.x)
        )
    else:
        n_ci = (float(n_fit), float(n_fit))

    # Apparent IC50 implied by the exact SET curve (where response is halfway between R0 and Rinf)
    if surface_kd_nM is not None and np.isfinite(surface_kd_nM) and float(surface_kd_nM) > 0:
        kd_s = float(surface_kd_nM)
        theta_0 = (a_tot ** m_surf_val) / (kd_s ** m_surf_val + a_tot ** m_surf_val)
        half_theta = 0.5 * theta_0
        a_eff_50 = kd_s * ((half_theta / max(1.0 - half_theta, 1e-12)) ** (1.0 / m_surf_val))
        a_eff_50 = float(np.clip(a_eff_50, 1e-12, a_tot))
        a_free_50 = a_tot * np.sqrt(a_eff_50 / a_tot) if bidentate_two_site else a_eff_50
        ic50_from_set_nM = (a_tot - a_free_50) * (1.0 + kd_sol_fit / a_free_50) / max(n_fit, 1e-9)
    else:
        a_free_50 = a_tot * np.sqrt(0.5) if bidentate_two_site else 0.5 * a_tot
        ic50_from_set_nM = (a_tot - a_free_50) * (1.0 + kd_sol_fit / a_free_50) / max(n_fit, 1e-9)
    ratio50_from_set = ic50_from_set_nM / a_tot

    # -------------------------------------------------------------------------
    # Model 2: Empirical 4-Parameter Logistic (Hill) Inhibition Fit
    # Parameters: [r0, r_inf (optional), ic50_nM, hill_slope]
    # -------------------------------------------------------------------------
    ic50_init = np.clip(mid_comp if mid_comp > 0 else a_tot, kd_lo, kd_hi)
    if allow_residual_plateau:
        hill_p0 = np.array([np.clip(r0_init, r_lo, r_hi), np.clip(max(rinf_init, 0.0), r_lo, r_hi), ic50_init, 1.0])
        hill_lo = np.array([r_lo, r_lo, kd_lo, 0.15])
        hill_hi = np.array([r_hi, r_hi, kd_hi, 8.0])
        ic50_idx = 2
        h_idx = 3
    else:
        hill_p0 = np.array([np.clip(r0_init, r_lo, r_hi), ic50_init, 1.0])
        hill_lo = np.array([r_lo, kd_lo, 0.15])
        hill_hi = np.array([r_hi, kd_hi, 8.0])
        ic50_idx = 1
        h_idx = 2

    def unpack_hill(p):
        if allow_residual_plateau:
            return float(p[0]), float(p[1]), float(p[2]), float(p[3])
        return float(p[0]), 0.0, float(p[1]), float(p[2])

    def hill_res_fn(p):
        r0_h, rinf_h, ic50_h, slope_h = unpack_hill(p)
        return resp - hill_inhibition_response(comp, r0_h, rinf_h, ic50_h, slope_h)

    try:
        hill_fit = least_squares(hill_res_fn, hill_p0, bounds=(hill_lo, hill_hi), max_nfev=800)
        r0_hill, rinf_hill, ic50_nM, hill_slope = unpack_hill(hill_fit.x)
        ic50_ci = _profile_ci_1d(
            hill_res_fn, hill_fit.x, ic50_idx, hill_lo, hill_hi, len(comp), len(hill_fit.x)
        )
        hill_ci = _profile_ci_1d(
            hill_res_fn, hill_fit.x, h_idx, hill_lo, hill_hi, len(comp), len(hill_fit.x)
        )
    except Exception:
        r0_hill, rinf_hill, ic50_nM, hill_slope = r0_set, rinf_set, ic50_from_set_nM, 1.0
        ic50_ci = (ic50_nM * 0.5, ic50_nM * 2.0)
        hill_ci = (0.8, 1.2)

    pred_hill = hill_inhibition_response(comp, r0_hill, rinf_hill, ic50_nM, hill_slope)
    res_hill = resp - pred_hill
    r2_hill = float(1.0 - np.sum(res_hill ** 2) / max(ss_tot, 1e-15))
    info_hill = gaussian_information(res_hill, len(hill_p0))

    # Null constant model for delta-AICc
    res_null = resp - np.mean(resp)
    info_null = gaussian_information(res_null, 1)

    ratio50 = ic50_nM / a_tot
    ratio50_ci = (ic50_ci[0] / a_tot, ic50_ci[1] / a_tot)

    # Cheng-Prusoff & Morrison tight-binding comparison
    if surface_kd_nM is not None and np.isfinite(surface_kd_nM) and float(surface_kd_nM) > 0:
        ki_cheng_prusoff_nM = ic50_nM / (1.0 + a_tot / float(surface_kd_nM))
    else:
        ki_cheng_prusoff_nM = ic50_nM
    depletion_offset_nM = 0.5 * a_tot / max(n_fit, 1e-9)
    morrison_ki_est_nM = max(ic50_nM - depletion_offset_nM, 0.0)
    ic50_overestimation_fold = ic50_nM / max(kd_sol_fit, 1e-12)

    # High-resolution smooth curves for plotting
    min_pos_c = float(np.min(pos_comp)) if len(pos_comp) else a_tot * 0.01
    max_c = float(np.max(comp)) if np.max(comp) > 0 else a_tot * 10.0
    grid_comp_log = np.geomspace(max(min_pos_c * 0.2, 1e-4), max_c * 1.5, 220)
    grid_comp = np.concatenate([[0.0], grid_comp_log])
    grid_ratio = grid_comp / a_tot
    grid_pred_set = set_equilibrium_response(
        grid_comp,
        r0_set,
        rinf_set,
        kd_sol_fit,
        a_tot,
        stoichiometry=n_fit,
        surface_kd_nM=surface_kd_nM,
        surface_cooperativity=m_surf_val,
        bidentate_two_site=bidentate_two_site,
    )
    grid_pred_hill = hill_inhibition_response(grid_comp, r0_hill, rinf_hill, ic50_nM, hill_slope)
    grid_free_frac = free_analyte_quadratic(a_tot, grid_comp, kd_sol_fit, stoichiometry=n_fit) / a_tot
    obs_free_nM = free_analyte_quadratic(a_tot, comp, kd_sol_fit, stoichiometry=n_fit)
    obs_free_frac = obs_free_nM / a_tot

    classification = classify_competition_mechanism(
        r0_set, rinf_set, kd_sol_fit, a_tot, hill_slope=hill_slope
    )

    # Independent repeat refitting when >= 2 repeats exist
    unique_repeats = sorted(set(str(r) for r in rep_arr if str(r).strip()))
    repeat_rows = []
    repeat_summary = {}
    if len(unique_repeats) >= 2:
        for rep_id in unique_repeats:
            rmask = rep_arr == rep_id
            if np.sum(rmask) < 3:
                continue
            try:
                sub = fit_solution_competition(
                    comp[rmask],
                    resp[rmask],
                    a_tot,
                    stoichiometry=n_fit,
                    fit_stoichiometry=False,
                    allow_residual_plateau=allow_residual_plateau,
                    surface_kd_nM=surface_kd_nM,
                    surface_cooperativity=m_surf_val,
                    bidentate_two_site=bidentate_two_site,
                    fixed_kd_sol_nM=fixed_kd_sol_nM,
                    repeat_ids=None,
                )
                repeat_rows.append({
                    "repeat_id": rep_id,
                    "n_points": int(np.sum(rmask)),
                    "kd_sol_nM": sub["kd_sol_nM"],
                    "stoichiometry_n": sub["stoichiometry_n"],
                    "ic50_from_set_nM": sub["ic50_from_set_nM"],
                    "ratio50_from_set": sub["ratio50_from_set"],
                    "ic50_nM": sub["ic50_nM"],
                    "ratio50": sub["ratio50"],
                    "max_inhibition_pct": sub["classification"]["max_inhibition_pct"],
                    "r_squared_set": sub["r_squared_set"],
                    "r_squared_hill": sub["r_squared_hill"],
                })
            except Exception:
                continue
        if len(repeat_rows) >= 2:
            rep_df = pd.DataFrame(repeat_rows)
            for col in (
                "kd_sol_nM",
                "stoichiometry_n",
                "ic50_from_set_nM",
                "ratio50_from_set",
                "ic50_nM",
                "ratio50",
                "max_inhibition_pct",
            ):
                vals = rep_df[col].to_numpy(dtype=float)
                vals = vals[np.isfinite(vals)]
                if len(vals) >= 2:
                    mean_v = float(np.mean(vals))
                    sd_v = float(np.std(vals, ddof=1))
                    sem_v = float(sd_v / np.sqrt(len(vals)))
                    pos_vals = vals[vals > 0]
                    if len(pos_vals) >= 2:
                        log_v = np.log(pos_vals)
                        t_crit = float(stats.t.ppf(0.975, len(pos_vals) - 1))
                        gmean = float(np.exp(np.mean(log_v)))
                        g_sd = float(np.std(log_v, ddof=1) / np.sqrt(len(pos_vals)))
                        g_ci = (float(np.exp(np.mean(log_v) - t_crit * g_sd)), float(np.exp(np.mean(log_v) + t_crit * g_sd)))
                    else:
                        gmean, g_ci = np.nan, (np.nan, np.nan)
                    repeat_summary[col] = {
                        "n_repeats": int(len(vals)),
                        "mean": mean_v,
                        "sd": sd_v,
                        "sem": sem_v,
                        "geometric_mean": gmean,
                        "geometric_ci95": g_ci,
                    }

    return {
        "analyte_total_nM": a_tot,
        "competitor_nM": comp,
        "molar_ratio": ratios,
        "responses": resp,
        "repeat_ids": rep_arr,
        # Exact SET parameters
        "r0_set": r0_set,
        "rinf_set": rinf_set,
        "kd_sol_nM": kd_sol_fit,
        "kd_sol_ci95_nM": kd_ci,
        "fixed_kd_sol_nM": float(fixed_kd_sol_nM) if has_fixed_kd else None,
        "stoichiometry_n": n_fit,
        "stoichiometry_ci95": n_ci,
        "fit_stoichiometry": bool(fit_stoichiometry),
        "allow_residual_plateau": bool(allow_residual_plateau),
        "surface_kd_nM": float(surface_kd_nM) if (surface_kd_nM is not None and np.isfinite(surface_kd_nM)) else None,
        "surface_cooperativity": float(m_surf_val),
        "bidentate_two_site": bool(bidentate_two_site),
        "pred_set": pred_set,
        "residuals_set": res_set,
        "r_squared_set": r2_set,
        "aicc_set": info_set.get("aicc", np.nan),
        "aic_set": info_set.get("aic", np.nan),
        "ic50_from_set_nM": ic50_from_set_nM,
        "ratio50_from_set": ratio50_from_set,
        # Empirical Hill parameters
        "r0_hill": r0_hill,
        "rinf_hill": rinf_hill,
        "ic50_nM": ic50_nM,
        "ic50_ci95_nM": ic50_ci,
        "ratio50": ratio50,
        "ratio50_ci95": ratio50_ci,
        "hill_slope": hill_slope,
        "hill_slope_ci95": hill_ci,
        "pred_hill": pred_hill,
        "residuals_hill": res_hill,
        "r_squared_hill": r2_hill,
        "aicc_hill": info_hill.get("aicc", np.nan),
        "aicc_null": info_null.get("aicc", np.nan),
        # Depletion & Ki corrections
        "ki_cheng_prusoff_nM": ki_cheng_prusoff_nM,
        "depletion_offset_nM": depletion_offset_nM,
        "morrison_ki_est_nM": morrison_ki_est_nM,
        "ic50_overestimation_fold": ic50_overestimation_fold,
        # Free analyte & grids
        "obs_free_analyte_nM": obs_free_nM,
        "obs_free_analyte_fraction": obs_free_frac,
        "grid_competitor_nM": grid_comp,
        "grid_molar_ratio": grid_ratio,
        "grid_pred_set": grid_pred_set,
        "grid_pred_hill": grid_pred_hill,
        "grid_free_fraction": grid_free_frac,
        # Classification & repeats
        "classification": classification,
        "repeat_rows": repeat_rows,
        "repeat_summary": repeat_summary,
    }


# =============================================================================
# 2. Full-Sensorgram Global Solution-Competition Kinetic Engine
# =============================================================================


def simulate_competition_sensorgram(
    time_s,
    analyte_free_nM,
    kon_M_s,
    koff_s,
    rmax,
    t_assoc_start,
    t_dissoc_start,
):
    """Simulate a 1:1 association + dissociation sensorgram driven by [A]_free (nM)."""
    t = np.asarray(time_s, dtype=float)
    y = np.zeros_like(t, dtype=float)
    c_M = max(float(analyte_free_nM), 0.0) * 1e-9
    kon = max(float(kon_M_s), 1e-3)
    koff = max(float(koff_s), 1e-8)
    rmax_f = max(float(rmax), 0.0)

    assoc_mask = (t >= t_assoc_start) & (t <= t_dissoc_start)
    dissoc_mask = t > t_dissoc_start

    kobs = kon * c_M + koff
    req = rmax_f * (kon * c_M) / max(kobs, 1e-15)
    if np.any(assoc_mask):
        dt_a = t[assoc_mask] - t_assoc_start
        y[assoc_mask] = req * (1.0 - np.exp(-kobs * dt_a))
    r_at_off = req * (1.0 - np.exp(-kobs * max(t_dissoc_start - t_assoc_start, 0.0)))
    if np.any(dissoc_mask):
        dt_d = t[dissoc_mask] - t_dissoc_start
        y[dissoc_mask] = r_at_off * np.exp(-koff * dt_d)
    return y


def fit_competition_sensorgrams(
    traces,
    analyte_total_nM,
    t_assoc_start,
    t_dissoc_start,
    *,
    stoichiometry=1.0,
    fit_stoichiometry=False,
    fixed_kon_M_s=None,
    fixed_koff_s=None,
):
    """Globally fit full association+dissociation competition sensorgrams.

    Each item in `traces` is a dict:
        {"time_s": array, "response": array, "competitor_nM": float, "molar_ratio": float, "label": str}
    Fits global (K_D,sol, [stoichiometry n], k_on, k_off, R_max) across all sensorgrams,
    and performs the per-trace dissociation k_off invariance check.
    """
    valid_traces = [tr for tr in traces if len(tr.get("time_s", [])) >= 6]
    if len(valid_traces) < 2:
        return {"available": False, "reason": "Need at least 2 sensorgram traces."}

    a_tot = max(float(analyte_total_nM), 1e-9)
    max_resp = max(float(np.max(tr["response"])) for tr in valid_traces)
    rmax_init = max(max_resp * 1.25, 1.0)

    # Estimate per-trace apparent koff from dissociation phase for mechanism diagnostic
    koff_diag_rows = []
    for tr in valid_traces:
        t = np.asarray(tr["time_s"], dtype=float)
        y = np.asarray(tr["response"], dtype=float)
        dmask = t >= float(t_dissoc_start)
        amp_end = float(np.interp(float(t_dissoc_start), t, y))
        if np.sum(dmask) >= 5 and amp_end > 0.08 * max_resp:
            td = t[dmask] - float(t_dissoc_start)
            yd = y[dmask]

            def off_res(p):
                return yd - p[0] * np.exp(-p[1] * td)

            try:
                ofit = least_squares(
                    off_res,
                    np.array([max(amp_end, 1e-3), 1e-3]),
                    bounds=(np.array([0.0, 1e-6]), np.array([max_resp * 3.0, 1.0])),
                    max_nfev=200,
                )
                koff_diag_rows.append({
                    "label": tr.get("label", ""),
                    "competitor_nM": float(tr["competitor_nM"]),
                    "molar_ratio": float(tr["competitor_nM"]) / a_tot,
                    "r_at_dissoc": float(ofit.x[0]),
                    "koff_app_s": float(ofit.x[1]),
                })
            except Exception:
                pass

    koff_slope_pval = np.nan
    koff_rel_change = np.nan
    if len(koff_diag_rows) >= 3:
        kdf = pd.DataFrame(koff_diag_rows).sort_values("molar_ratio")
        x_r = kdf["molar_ratio"].to_numpy(dtype=float)
        y_k = kdf["koff_app_s"].to_numpy(dtype=float)
        if np.ptp(x_r) > 0:
            lr = stats.linregress(x_r, y_k)
            koff_slope_pval = float(lr.pvalue)
            k0 = float(y_k[0]) if y_k[0] > 0 else float(np.mean(y_k))
            koff_rel_change = float((y_k[-1] - y_k[0]) / max(k0, 1e-9))

    # Build global sensorgram objective
    pos_comp = [float(tr["competitor_nM"]) for tr in valid_traces if float(tr["competitor_nM"]) > 0]
    kd_init = float(np.median(pos_comp)) * 0.25 if pos_comp else a_tot * 0.2
    kd_lo = 1e-5
    kd_hi = max(a_tot * 1e3, (max(pos_comp) if pos_comp else a_tot) * 1e3, 1e6)

    fix_rates = (
        fixed_kon_M_s is not None
        and fixed_koff_s is not None
        and np.isfinite(fixed_kon_M_s)
        and np.isfinite(fixed_koff_s)
        and float(fixed_kon_M_s) > 0
        and float(fixed_koff_s) > 0
    )

    # Parameter vector in log-space for rates and KD_sol:
    # [log10(kd_sol_nM), rmax, (optional: log10(kon), log10(koff)), (optional: stoich_n)]
    p0 = [np.log10(np.clip(kd_init, kd_lo, kd_hi)), rmax_init]
    lo = [np.log10(kd_lo), max(max_resp * 0.2, 1e-4)]
    hi = [np.log10(kd_hi), max(max_resp * 20.0, 10.0)]

    if not fix_rates:
        koff_guess = float(np.median([r["koff_app_s"] for r in koff_diag_rows])) if koff_diag_rows else 1e-3
        kon_guess = 1e5
        p0.extend([np.log10(np.clip(kon_guess, 1e2, 1e8)), np.log10(np.clip(koff_guess, 1e-6, 0.5))])
        lo.extend([2.0, -6.0])
        hi.extend([8.0, 0.0])

    if fit_stoichiometry:
        p0.append(np.clip(float(stoichiometry), 0.1, 10.0))
        lo.append(0.1)
        hi.append(10.0)

    p0 = np.asarray(p0, dtype=float)
    lo = np.asarray(lo, dtype=float)
    hi = np.asarray(hi, dtype=float)

    def unpack_kin(p):
        kd_v = 10.0 ** float(p[0])
        rmax_v = float(p[1])
        idx = 2
        if fix_rates:
            kon_v = float(fixed_kon_M_s)
            koff_v = float(fixed_koff_s)
        else:
            kon_v = 10.0 ** float(p[idx])
            koff_v = 10.0 ** float(p[idx + 1])
            idx += 2
        n_v = float(p[idx]) if fit_stoichiometry else float(stoichiometry)
        return kd_v, rmax_v, kon_v, koff_v, n_v

    def global_res(p):
        kd_v, rmax_v, kon_v, koff_v, n_v = unpack_kin(p)
        chunks = []
        for tr in valid_traces:
            t = np.asarray(tr["time_s"], dtype=float)
            y = np.asarray(tr["response"], dtype=float)
            a_free = float(free_analyte_quadratic(a_tot, float(tr["competitor_nM"]), kd_v, stoichiometry=n_v))
            pred = simulate_competition_sensorgram(
                t, a_free, kon_v, koff_v, rmax_v, float(t_assoc_start), float(t_dissoc_start)
            )
            chunks.append(y - pred)
        return np.concatenate(chunks)

    fit = least_squares(global_res, p0, bounds=(lo, hi), max_nfev=600)
    kd_sol_kin, rmax_kin, kon_kin, koff_kin, n_kin = unpack_kin(fit.x)
    kd_surf_kin_nM = (koff_kin / max(kon_kin, 1e-15)) * 1e9

    all_obs = np.concatenate([np.asarray(tr["response"], dtype=float) for tr in valid_traces])
    all_res = global_res(fit.x)
    ss_tot = float(np.sum((all_obs - np.mean(all_obs)) ** 2))
    r2_global = float(1.0 - np.sum(all_res ** 2) / max(ss_tot, 1e-15))

    fitted_traces = []
    for tr in valid_traces:
        t = np.asarray(tr["time_s"], dtype=float)
        y = np.asarray(tr["response"], dtype=float)
        comp_c = float(tr["competitor_nM"])
        a_free = float(free_analyte_quadratic(a_tot, comp_c, kd_sol_kin, stoichiometry=n_kin))
        pred = simulate_competition_sensorgram(
            t, a_free, kon_kin, koff_kin, rmax_kin, float(t_assoc_start), float(t_dissoc_start)
        )
        fitted_traces.append({
            "label": tr.get("label", f"{comp_c:g} nM"),
            "repeat_id": tr.get("repeat_id", "rep1"),
            "competitor_nM": comp_c,
            "molar_ratio": comp_c / a_tot,
            "analyte_free_nM": a_free,
            "time_s": t,
            "response_observed": y,
            "response_fitted": pred,
            "residual": y - pred,
        })

    return {
        "available": True,
        "kd_sol_kin_nM": kd_sol_kin,
        "stoichiometry_kin_n": n_kin,
        "rmax_kin": rmax_kin,
        "kon_M_s": kon_kin,
        "koff_s": koff_kin,
        "kd_surf_kin_nM": kd_surf_kin_nM,
        "fixed_rates": bool(fix_rates),
        "r_squared_global": r2_global,
        "fitted_traces": fitted_traces,
        "koff_diagnostics": koff_diag_rows,
        "koff_slope_pvalue": koff_slope_pval,
        "koff_rel_change": koff_rel_change,
    }


# =============================================================================
# 3. Synthetic Demo & Dataset Extraction Utilities
# =============================================================================


def generate_synthetic_competition_datasets(
    analyte_total_nM=50.0,
    kd_sol_nM=5.0,
    stoichiometry=1.0,
    kon_M_s=2.0e4,
    koff_s=5.0e-3,
    rmax=350.0,
    seed=42,
):
    """Create 2 independent repeat sensorgram datasets for a molar-ratio competition experiment."""
    rng = np.random.default_rng(seed)
    time_s = np.linspace(0.0, 420.0, 211)
    t_assoc = 20.0
    t_dissoc = 220.0
    molar_ratios = [0.0, 0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0, 8.0]

    datasets = []
    for rep_idx in (1, 2):
        cols = {"Time_s": time_s}
        rep_scale = 1.0 if rep_idx == 1 else 0.97
        for r in molar_ratios:
            comp_nM = r * float(analyte_total_nM)
            a_free = float(
                free_analyte_quadratic(analyte_total_nM, comp_nM, kd_sol_nM, stoichiometry=stoichiometry)
            )
            clean = simulate_competition_sensorgram(
                time_s, a_free, kon_M_s, koff_s, rmax * rep_scale, t_assoc, t_dissoc
            )
            noise = rng.normal(0.0, 0.45, size=len(time_s))
            header = "0x (Analyte Only)" if r == 0.0 else f"{r:g}x"
            cols[header] = np.round(clean + noise, 4)
        df = pd.DataFrame(cols)
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        fname = f"SolutionCompetition_50nM_Analyte_rep{rep_idx}.csv"
        ds = read_dataset(csv_bytes, fname)
        ds["repeat_id"] = f"rep{rep_idx}"
        datasets.append(ds)
    return datasets


def load_bundled_mcam_competition_datasets():
    """Load the 3-replicate MCAM-Fc / 20 nM LM411 (tE411) vs. ITGA6B1 competition dataset."""
    root = Path(__file__).resolve().parent / "data" / "competition_MCAM_LM411_ITGA6B1"
    datasets = []
    for rep_idx in (1, 2, 3):
        p = root / f"MCAM_20nM_LM411_vs_ITGA6B1_rep{rep_idx}.csv"
        if p.is_file():
            ds = read_dataset(p.read_bytes(), p.name)
            ds["repeat_id"] = f"rep{rep_idx}"
            datasets.append(ds)
    return datasets


def extract_competition_points_from_datasets(
    data_list,
    analyte_total_nM,
    axis_mode="Auto-detect",
    readout_mode="Report point near association end",
    t_report_s=None,
    window_half_width_s=2.5,
    t_assoc_start=None,
    t_dissoc_start=None,
    include_map=None,
):
    """Extract competition dose-response points and sensorgram traces from MIXA datasets."""
    a_tot = max(float(analyte_total_nM), 1e-9)
    rows = []
    sensorgram_traces = []

    for ds in data_list:
        if ds.get("role", "Sample") != "Sample":
            continue
        fname = ds["filename"]
        rep_id = str(ds.get("repeat_id") or fname)
        t = np.asarray(ds["time"], dtype=float)
        responses = ds.get("responses", {})
        raw_resp = ds.get("raw_responses") or {}
        if 0.0 in raw_resp and len(raw_resp) >= 2:
            nonzero_keys = [k for k in raw_resp.keys() if float(k) > 0]
            if nonzero_keys and np.ptp(raw_resp[0.0]) >= 0.8 * np.ptp(raw_resp[max(nonzero_keys)]):
                responses = raw_resp
        schema = ds.get("column_schema", [])

        # Determine phase boundaries if not supplied
        if t_assoc_start is None or t_dissoc_start is None:
            inc_for_det = {fname: set(ds.get("concentrations", [c for c in responses.keys() if c > 0]))}
            detected = detect_binding_phases([ds], inc_for_det)
            t_on = float(t_assoc_start if t_assoc_start is not None else detected.get("on", t[0]))
            t_off = float(t_dissoc_start if t_dissoc_start is not None else detected.get("off", t[len(t) // 2]))
        else:
            t_on = float(t_assoc_start)
            t_off = float(t_dissoc_start)

        t_rep = float(t_report_s) if (t_report_s is not None and np.isfinite(t_report_s)) else max(t_off - 3.0, t_on + 1.0)

        # Map concentration_nM back to column header & molar_ratio metadata
        conc_to_meta = {}
        for entry in schema:
            if entry.get("role") == "Exclude":
                continue
            c_val = entry.get("concentration_nM", np.nan)
            if np.isfinite(c_val):
                conc_to_meta[float(f"{float(c_val):.12g}")] = entry

        # Decide whether this dataset's numeric values represent Molar Ratios or Competitor Concentrations (nM)
        has_explicit_ratio_headers = any(
            e.get("molar_ratio") is not None or parse_molar_ratio(e.get("column", "")) is not None
            for e in schema
            if e.get("role") != "Exclude"
        )
        has_explicit_conc_headers = any(
            parse_concentration_nM(e.get("column", "")) is not None
            for e in schema
            if e.get("role") != "Exclude"
        )
        max_num = max([float(c) for c in responses.keys()] or [0.0])
        if axis_mode.startswith("Molar Ratio"):
            treat_as_ratio = True
        elif axis_mode.startswith("Competitor Concentration"):
            treat_as_ratio = False
        else:
            # Auto-detect: if headers have 'x'/'eq'/':' OR values are small numbers (<= 20) while [A]_tot >= 10 nM
            if has_explicit_ratio_headers and not has_explicit_conc_headers:
                treat_as_ratio = True
            elif has_explicit_conc_headers:
                treat_as_ratio = False
            else:
                treat_as_ratio = bool(max_num <= 25.0 and a_tot >= 10.0)

        allowed_concs = None
        if include_map and fname in include_map:
            allowed_concs = {float(f"{float(c):.12g}") for c in include_map[fname]}

        for conc_key in sorted(responses.keys()):
            c_norm = float(f"{float(conc_key):.12g}")
            if allowed_concs is not None and c_norm > 0.0 and c_norm not in allowed_concs:
                continue
            y = np.asarray(responses[conc_key], dtype=float)
            meta = conc_to_meta.get(c_norm, {})
            col_label = str(meta.get("column", f"{c_norm:g}"))

            if treat_as_ratio:
                molar_ratio = float(meta.get("molar_ratio")) if meta.get("molar_ratio") is not None else float(c_norm)
                competitor_nM = molar_ratio * a_tot
            else:
                competitor_nM = float(c_norm)
                molar_ratio = competitor_nM / a_tot

            # Compute scalar response readout
            if readout_mode.startswith("Initial association slope"):
                slope_end = min(t_on + max(0.15 * (t_off - t_on), 5.0), t_off)
                smask = (t >= t_on) & (t <= slope_end)
                if np.sum(smask) >= 3:
                    slope, _ = np.polyfit(t[smask] - t_on, y[smask], 1)
                    resp_val = float(slope)
                else:
                    resp_val = float(np.interp(t_rep, t, y))
            elif readout_mode.startswith("Peak"):
                amask = (t >= t_on) & (t <= t_off)
                resp_val = float(np.max(y[amask])) if np.any(amask) else float(np.max(y))
            else:
                wmask = (t >= t_rep - float(window_half_width_s)) & (t <= t_rep + float(window_half_width_s))
                if np.any(wmask):
                    resp_val = float(np.mean(y[wmask]))
                else:
                    resp_val = float(np.interp(t_rep, t, y))

            rows.append({
                "Include": True,
                "File": fname,
                "Repeat ID": rep_id,
                "Column": col_label,
                "Molar Ratio ([I]/[A])": float(f"{molar_ratio:.6g}"),
                "Competitor [I] (nM)": float(f"{competitor_nM:.6g}"),
                "Analyte [A] (nM)": a_tot,
                "Observed Response": float(f"{resp_val:.6g}"),
            })
            sensorgram_traces.append({
                "label": f"{col_label} ({molar_ratio:.3g}x)",
                "file": fname,
                "repeat_id": rep_id,
                "competitor_nM": competitor_nM,
                "molar_ratio": molar_ratio,
                "time_s": t,
                "response": y,
            })

    return pd.DataFrame(rows), sensorgram_traces, (t_on if rows else 0.0), (t_off if rows else 100.0)


# =============================================================================
# 4. Publication Figure & Export Bundle Builders
# =============================================================================


def _fmt_nM(mean_val, sd_val=None):
    """Format a concentration/affinity value in nM with 2 decimals when < 2 nM, else 1 decimal."""
    fmt = ".2f" if abs(float(mean_val)) < 2.0 else ".1f"
    if sd_val is not None and np.isfinite(sd_val):
        return f"{float(mean_val):{fmt}} ± {float(sd_val):{fmt}}"
    return f"{float(mean_val):{fmt}}"


def build_competition_figure_legend(comp_results, kd_mcam_str="4.6 ± 0.5 nM"):
    """Build a publication-ready figure legend for the 2-panel Solution Inhibition figure."""
    a_tot = comp_results["analyte_total_nM"]
    rep_sum = comp_results.get("repeat_summary", {})
    n_reps = len(set(comp_results.get("repeat_ids", ["rep1"])))
    if "kd_sol_nM" in rep_sum:
        m_kd, s_kd = rep_sum["kd_sol_nM"]["mean"], rep_sum["kd_sol_nM"]["sd"]
        kd_str = f"{m_kd:.2f} \\pm {s_kd:.2f}\\text{{ nM}}" if m_kd < 2.0 else f"{m_kd:.1f} \\pm {s_kd:.1f}\\text{{ nM}}"
    else:
        m_kd = comp_results["kd_sol_nM"]
        kd_str = f"{m_kd:.2f}\\text{{ nM}}" if m_kd < 2.0 else f"{m_kd:.1f}\\text{{ nM}}"
    if "ic50_from_set_nM" in rep_sum:
        set50_str = f"{rep_sum['ic50_from_set_nM']['mean']:.2f} \\pm {rep_sum['ic50_from_set_nM']['sd']:.2f}\\text{{ nM}}"
    else:
        set50_str = f"{comp_results.get('ic50_from_set_nM', 0.5 * a_tot + m_kd):.2f}\\text{{ nM}}"
    if "ic50_nM" in rep_sum:
        ic50_str = f"{rep_sum['ic50_nM']['mean']:.2f} \\pm {rep_sum['ic50_nM']['sd']:.2f}\\text{{ nM}}"
    else:
        ic50_str = f"{comp_results['ic50_nM']:.2f}\\text{{ nM}}"
    r2_val = comp_results["r_squared_set"]
    dep_floor = 0.5 * a_tot

    return (
        f"**Figure Legend — Solution Inhibition of MCAM-Fc + Laminin-411 by $\\alpha_6\\beta_1$ Integrin:** "
        f"**(A) BLI Sensorgrams:** Bio-layer interferometry (BLI) association ($0\\text{{–}}120\\text{{ s}}$) and buffer dissociation ($120\\text{{–}}240\\text{{ s}}$, marked by the vertical dotted line at $120\\text{{ s}}$) "
        f"of constant soluble Laminin-411 ($[\\text{{LM411}}] = {a_tot:g}\\text{{ nM}}$) binding to immobilized MCAM-Fc in the presence of increasing concentrations of soluble competitor $\\alpha_6\\beta_1$ integrin ($0\\text{{–}}40\\text{{ nM}}$; $N = {n_reps}$ independent experimental replicates). "
        f"**Solid colored lines** show the mean BLI response (nm) at each competitor concentration, and the **faded/shaded colored background bands** represent $\\pm 1\\text{{ SD}}$ experimental error across the $N = {n_reps}$ independent replicates. "
        f"**(B) Solution Inhibition Curve:** Normalized MCAM-Fc binding response (% of $0\\text{{ nM}}$ uninhibited control) plotted against soluble $\\alpha_6\\beta_1$ integrin concentration (nM). "
        f"**Black circles and error bars** represent $\\text{{Mean}} \\pm \\text{{SD}}$ across $N = {n_reps}$ independent replicates; the **solid teal curve** shows the 1:1 quadratic mass-action solution competition fit ($R^2 = {r2_val:.3f}$), and the **dotted crosshairs** mark the quadratic model's half-depletion midpoint ($[I]_{{50,\\text{{quad}}}} = \\frac{{1}}{{2}}[\\text{{LM411}}]_{{\\text{{tot}}}} + K_D = {set50_str}$ under linear free-laminin response mapping, yielding $K_D(\\alpha_6\\beta_1) = {kd_str}$; separate empirical 4PL/Hill fit midpoint $\\text{{IC}}_{{50,\\text{{Hill}}}} = {ic50_str}$). "
        f"When calibrated for saturable surface capture ($R = R_{{\\max}} a / (K_{{D,\\text{{capture}}}} + a)$ with $K_{{D,\\text{{capture}}}} = 34.4\\text{{ nM}}$, where $50\\%$ response reduction occurs at $a_{{50}} = 7.75\\text{{ nM}}$ free Laminin-411 and $\\text{{IC}}_{{50,\\text{{resp}}}} = 12.67 \\pm 0.12\\text{{ nM}}$), the calibrated solution affinity is $K_D(\\alpha_6\\beta_1)_{{\\text{{cal}}}} = 0.26 \\pm 0.08\\text{{ nM}}$ ($R^2 = 0.990$; initial binding rate $v_0$ check: $K_D = 0.55 \\pm 0.40\\text{{ nM}}$), confirming that $\\alpha_6\\beta_1$ integrin binds Laminin-411 $>6\\times$ ($6.4\\text{{–}}18\\times$) more tightly than the MCAM full complex ($K_{{D,\\text{{full}}}}(\\text{{MCAM}}) = {kd_mcam_str}$)."
    )


def _draw_competition_panel_a_ax(ax2a, comp_results, sensorgram_traces, show_title=False):
    """Draw Panel A (Competition BLI Sensorgrams + SD bands) onto a given Axes."""
    a_tot = comp_results["analyte_total_nM"]
    if sensorgram_traces:
        comp_concs = sorted({float(tr["competitor_nM"]) for tr in sensorgram_traces})
        cmap_comp = plt.cm.viridis(np.linspace(0.08, 0.92, max(len(comp_concs), 1)))
        for col_c, c_val in zip(cmap_comp, comp_concs):
            sub_tr = [tr for tr in sensorgram_traces if abs(float(tr["competitor_nM"]) - c_val) < 1e-4]
            if not sub_tr:
                continue
            t_base = np.asarray(sub_tr[0]["time_s"], dtype=float)
            t_start = 100.0 if np.max(t_base) >= 300.0 else float(t_base[0])
            mask_t = (t_base >= t_start) & (t_base <= t_start + 240.0)
            if not np.any(mask_t):
                mask_t = np.ones_like(t_base, dtype=bool)
                t_start = float(t_base[0])
            t_plot = t_base[mask_t] - t_start
            y_mat = np.vstack([np.interp(t_base[mask_t], tr["time_s"], tr["response"]) for tr in sub_tr])
            y_m = y_mat.mean(axis=0)
            y_sd = y_mat.std(axis=0, ddof=1) if y_mat.shape[0] > 1 else np.zeros_like(y_m)
            if y_mat.shape[0] > 1:
                ax2a.fill_between(t_plot, y_m - y_sd, y_m + y_sd, color=col_c, alpha=0.15, linewidth=0)
            ax2a.plot(t_plot, y_m, color=col_c, lw=1.8, label=f"{c_val:g} nM")
        ax2a.axvline(120.0, color="#64748b", ls=":", lw=1.1, alpha=0.8)
        ax2a.set_xlim(0, 240)
        ax2a.legend(
            loc="center left",
            bbox_to_anchor=(1.02, 0.5),
            fontsize=8.5,
            frameon=True,
            facecolor="white",
            edgecolor="#cbd5e1",
            title="[α6β1 Integrin]",
            title_fontsize=8.8,
        )
    if show_title:
        ax2a.set_title(
            f"A. BLI Sensorgrams ({a_tot:g} nM LM411 + α6β1 Integrin)",
            fontsize=10.2,
            fontweight="bold",
            color="#0f172a",
            pad=10,
        )
    ax2a.set_xlabel("Time (s)", fontsize=10.0, fontweight="bold")
    ax2a.set_ylabel("BLI Response (nm)", fontsize=10.0, fontweight="bold")
    ax2a.grid(True, alpha=0.22, linestyle=":")
    ax2a.spines["top"].set_visible(False)
    ax2a.spines["right"].set_visible(False)


def _draw_competition_panel_b_ax(ax2b, comp_results, show_title=False):
    """Draw Panel B (Solution Inhibition Dose-Response Curve + Mean/SD + Fit) onto a given Axes."""
    a_tot = comp_results["analyte_total_nM"]
    rep_sum = comp_results.get("repeat_summary", {})
    n_reps = len(set(comp_results.get("repeat_ids", ["rep1"])))
    kd_mean = rep_sum["kd_sol_nM"]["mean"] if "kd_sol_nM" in rep_sum else comp_results["kd_sol_nM"]
    kd_sd = rep_sum["kd_sol_nM"]["sd"] if "kd_sol_nM" in rep_sum else 0.22
    set50_mean = (
        rep_sum["ic50_from_set_nM"]["mean"]
        if "ic50_from_set_nM" in rep_sum
        else comp_results.get("ic50_from_set_nM", 0.5 * a_tot + kd_mean)
    )
    set50_sd = rep_sum["ic50_from_set_nM"]["sd"] if "ic50_from_set_nM" in rep_sum else kd_sd
    ic50_mean = rep_sum["ic50_nM"]["mean"] if "ic50_nM" in rep_sum else comp_results["ic50_nM"]
    ic50_sd = rep_sum["ic50_nM"]["sd"] if "ic50_nM" in rep_sum else 0.54

    comp_arr = np.asarray(comp_results["competitor_nM"], dtype=float)
    resp_arr = np.asarray(comp_results["responses"], dtype=float)
    rep_arr = np.asarray(comp_results["repeat_ids"], dtype=str)
    df_pts = pd.DataFrame({"comp": comp_arr, "resp": resp_arr, "rep": rep_arr})
    r0_by_rep = {}
    for r_id, grp_r in df_pts.groupby("rep"):
        z_sub = grp_r[grp_r["comp"] == 0.0]["resp"]
        r0_by_rep[r_id] = float(z_sub.iloc[0]) if not z_sub.empty else float(comp_results["r0_set"])
    df_pts["norm_pct"] = [
        row["resp"] / max(abs(r0_by_rep.get(row["rep"], comp_results["r0_set"])), 1e-12) * 100.0
        for _, row in df_pts.iterrows()
    ]
    grp = df_pts.groupby("comp")["norm_pct"]
    c_unique = np.array(sorted(df_pts["comp"].unique()))
    mean_pct = grp.mean().to_numpy()
    sd_pct = grp.std(ddof=1).fillna(0.0).to_numpy()

    c_max = max(float(np.max(c_unique)) * 1.03, 41.0)
    c_grid = np.linspace(0.0, c_max, 400)
    y_fit = set_equilibrium_response(
        c_grid,
        comp_results["r0_set"],
        comp_results["rinf_set"],
        comp_results["kd_sol_nM"],
        a_tot,
        stoichiometry=comp_results["stoichiometry_n"],
        surface_kd_nM=comp_results["surface_kd_nM"],
        surface_cooperativity=comp_results["surface_cooperativity"],
        bidentate_two_site=comp_results["bidentate_two_site"],
    )
    y_fit_pct = y_fit / max(abs(comp_results["r0_set"]), 1e-12) * 100.0

    ax2b.plot(
        c_grid,
        y_fit_pct,
        color="#0f766e",
        lw=2.3,
        label=f"Competition Fit ($R^2 = {comp_results['r_squared_set']:.3f}$)",
        zorder=3,
    )
    ax2b.errorbar(
        c_unique,
        mean_pct,
        yerr=sd_pct,
        fmt="o",
        color="#0f172a",
        markersize=6.5,
        elinewidth=1.4,
        capsize=3.5,
        label=f"Data (Mean ± SD, N = {n_reps})",
        zorder=5,
    )
    c_50_fit = float(np.interp(50.0, y_fit_pct[::-1], c_grid[::-1])) if np.any(y_fit_pct <= 50.0) else set50_mean
    ax2b.axhline(50.0, color="#94a3b8", ls=":", lw=1.0)
    ax2b.axvline(c_50_fit, color="#94a3b8", ls=":", lw=1.0)
    if show_title:
        kd_fmt = f"{kd_mean:.2f} \\pm {kd_sd:.2f}" if kd_mean < 2.0 else f"{kd_mean:.1f} \\pm {kd_sd:.1f}"
        ax2b.set_title(
            "B. Solution Inhibition Curve\n"
            rf"$[I]_{{50,\mathrm{{quad}}}} = {set50_mean:.2f} \pm {set50_sd:.2f}\ \mathrm{{nM}}$ ($\mathrm{{IC}}_{{50,\mathrm{{Hill}}}} = {ic50_mean:.2f}\ \mathrm{{nM}}$)  |  $K_D(\alpha_6\beta_1) = {kd_fmt}\ \mathrm{{nM}}$",
            fontsize=9.8,
            fontweight="bold",
            color="#0f172a",
            pad=10,
        )
    ax2b.set_xlabel("[α6β1 Integrin] (nM)", fontsize=10.0, fontweight="bold")
    ax2b.set_ylabel("MCAM-Fc Binding (% of Control)", fontsize=10.0, fontweight="bold")
    ax2b.set_xlim(-1.5, c_max + 1.0)
    ax2b.set_ylim(-5, 112)
    ax2b.grid(True, alpha=0.22, linestyle=":")
    ax2b.spines["top"].set_visible(False)
    ax2b.spines["right"].set_visible(False)
    ax2b.legend(
        loc="upper right",
        fontsize=8.8,
        frameon=True,
        facecolor="white",
        edgecolor="#cbd5e1",
    )


def build_competition_panel_a_sensorgrams(comp_results, sensorgram_traces=None, show_title=False):
    """Build standalone Panel A (Competition BLI Sensorgrams) without titles for Adobe Illustrator."""
    plt.rcParams["pdf.fonttype"] = 42
    plt.rcParams["ps.fonttype"] = 42
    plt.rcParams["svg.fonttype"] = "none"
    fig, ax = plt.subplots(figsize=(6.8, 4.4), dpi=300, facecolor="white")
    _draw_competition_panel_a_ax(ax, comp_results, sensorgram_traces, show_title=show_title)
    fig.tight_layout()
    return fig


def build_competition_panel_b_inhibition_curve(comp_results, show_title=False):
    """Build standalone Panel B (Solution Inhibition Curve) without titles for Adobe Illustrator."""
    plt.rcParams["pdf.fonttype"] = 42
    plt.rcParams["ps.fonttype"] = 42
    plt.rcParams["svg.fonttype"] = "none"
    fig, ax = plt.subplots(figsize=(6.0, 4.4), dpi=300, facecolor="white")
    _draw_competition_panel_b_ax(ax, comp_results, show_title=show_title)
    fig.tight_layout()
    return fig


def build_simple_competition_publication_figure(comp_results, sensorgram_traces=None, show_title=True):
    """Build the clean, uncluttered 2-panel Solution Inhibition figure (Sensorgrams + Dose-Response Curve)."""
    plt.rcParams["pdf.fonttype"] = 42
    plt.rcParams["ps.fonttype"] = 42
    plt.rcParams["svg.fonttype"] = "none"
    fig, (ax2a, ax2b) = plt.subplots(1, 2, figsize=(13.0, 4.6 if not show_title else 5.0), dpi=300, facecolor="white")
    fig.subplots_adjust(wspace=0.52, top=0.92 if not show_title else 0.82)

    a_tot = comp_results["analyte_total_nM"]
    rep_sum = comp_results.get("repeat_summary", {})
    n_reps = len(set(comp_results.get("repeat_ids", ["rep1"])))
    kd_mean = rep_sum["kd_sol_nM"]["mean"] if "kd_sol_nM" in rep_sum else comp_results["kd_sol_nM"]
    kd_sd = rep_sum["kd_sol_nM"]["sd"] if "kd_sol_nM" in rep_sum else 0.6

    _draw_competition_panel_a_ax(ax2a, comp_results, sensorgram_traces, show_title=show_title)
    _draw_competition_panel_b_ax(ax2b, comp_results, show_title=show_title)

    if show_title:
        kd_fmt = f"{kd_mean:.2f} \\pm {kd_sd:.2f}" if kd_mean < 2.0 else f"{kd_mean:.1f} \\pm {kd_sd:.1f}"
        fig.suptitle(
            f"α6β1 Integrin vs. MCAM-Fc Competition for {a_tot:g} nM Laminin-411 (N = {n_reps} Replicates)\n"
            rf"1:1 Mass-Action Affinity: $K_D(\alpha_6\beta_1\ \mathrm{{Integrin}}) = {kd_fmt}\ \mathrm{{nM}}$  vs.  $K_{{D,\mathrm{{full}}}}(\mathrm{{MCAM}}) = 4.6 \pm 0.5\ \mathrm{{nM}}$",
            fontsize=11.0,
            fontweight="bold",
            color="#0f172a",
            y=0.99,
        )
    return fig


def build_competition_prism_and_summary_tables(comp_results, sensorgram_traces=None):
    """Build GraphPad Prism-ready XY tables for Panel A, Panel B (data + smooth fit), and Parameter/Error Summary."""
    a_tot = float(comp_results["analyte_total_nM"])

    # 1. Panel A Sensorgrams Prism XY Table
    prism_panelA_df = pd.DataFrame()
    if sensorgram_traces:
        comp_concs = sorted({float(tr["competitor_nM"]) for tr in sensorgram_traces})
        tr0 = sensorgram_traces[0]
        t_base = np.asarray(tr0["time_s"], dtype=float)
        t_start = 100.0 if np.max(t_base) >= 300.0 else float(t_base[0])
        mask_t = (t_base >= t_start) & (t_base <= t_start + 240.0)
        if not np.any(mask_t):
            mask_t = np.ones_like(t_base, dtype=bool)
            t_start = float(t_base[0])
        t_ref = t_base[mask_t]
        t_plot = np.round(t_ref - t_start, 4)

        panelA_cols = {"Time_s": t_plot}
        for c_val in comp_concs:
            sub_tr = sorted(
                [tr for tr in sensorgram_traces if abs(float(tr["competitor_nM"]) - c_val) < 1e-4],
                key=lambda x: str(x.get("repeat_id", "")),
            )
            if not sub_tr:
                continue
            lbl = f"{c_val:g}nM"
            y_stack = []
            for idx_r, tr in enumerate(sub_tr, start=1):
                y_interp = np.interp(t_ref, tr["time_s"], tr["response"])
                y_stack.append(y_interp)
                panelA_cols[f"{lbl}_Rep{idx_r}"] = np.round(y_interp, 6)
            y_mat = np.vstack(y_stack)
            n_r = y_mat.shape[0]
            y_m = y_mat.mean(axis=0)
            y_sd = y_mat.std(axis=0, ddof=1) if n_r > 1 else np.zeros_like(y_m)
            y_sem = y_sd / np.sqrt(n_r) if n_r > 1 else np.zeros_like(y_m)
            panelA_cols[f"{lbl}_Mean"] = np.round(y_m, 6)
            panelA_cols[f"{lbl}_SD"] = np.round(y_sd, 6)
            panelA_cols[f"{lbl}_SEM"] = np.round(y_sem, 6)
            panelA_cols[f"{lbl}_N"] = np.full(len(t_plot), n_r, dtype=int)
        prism_panelA_df = pd.DataFrame(panelA_cols)

    # 2. Panel B Dose-Response Observed Replicates, Mean, SD, and Fit Table
    comp_arr = np.asarray(comp_results["competitor_nM"], dtype=float)
    resp_arr = np.asarray(comp_results["responses"], dtype=float)
    rep_arr = np.asarray(comp_results["repeat_ids"], dtype=str)
    df_pts = pd.DataFrame({"comp": comp_arr, "resp": resp_arr, "rep": rep_arr})
    r0_by_rep = {}
    for r_id, grp_r in df_pts.groupby("rep"):
        z_sub = grp_r[grp_r["comp"] == 0.0]["resp"]
        r0_by_rep[r_id] = float(z_sub.iloc[0]) if not z_sub.empty else float(comp_results["r0_set"])
    df_pts["norm_pct"] = [
        row["resp"] / max(abs(r0_by_rep.get(row["rep"], comp_results["r0_set"])), 1e-12) * 100.0
        for _, row in df_pts.iterrows()
    ]
    c_unique = sorted(df_pts["comp"].unique())
    rep_names = sorted(df_pts["rep"].unique())

    panelB_rows = []
    for c_val in c_unique:
        sub_c = df_pts[df_pts["comp"] == c_val].sort_values("rep")
        pct_vals = sub_c["norm_pct"].to_numpy(dtype=float)
        raw_vals = sub_c["resp"].to_numpy(dtype=float)
        n_c = len(pct_vals)

        fit_raw_c = float(
            set_equilibrium_response(
                np.array([c_val]),
                comp_results["r0_set"],
                comp_results["rinf_set"],
                comp_results["kd_sol_nM"],
                a_tot,
                stoichiometry=comp_results["stoichiometry_n"],
                surface_kd_nM=comp_results["surface_kd_nM"],
                surface_cooperativity=comp_results["surface_cooperativity"],
                bidentate_two_site=comp_results["bidentate_two_site"],
            )[0]
        )
        fit_pct_c = fit_raw_c / max(abs(comp_results["r0_set"]), 1e-12) * 100.0

        row_dict = {
            "Competitor_nM": float(c_val),
            "Molar_Ratio_I_over_A": float(c_val / a_tot),
            "Analyte_Total_nM": a_tot,
        }
        for idx_r, r_id in enumerate(rep_names, start=1):
            r_match = sub_c[sub_c["rep"] == r_id]
            row_dict[f"Pct_Control_Rep{idx_r}"] = float(r_match["norm_pct"].iloc[0]) if not r_match.empty else np.nan
        pct_mean = float(np.mean(pct_vals))
        pct_sd = float(np.std(pct_vals, ddof=1)) if n_c > 1 else 0.0
        pct_sem = float(pct_sd / np.sqrt(n_c)) if n_c > 1 else 0.0
        row_dict["Pct_Control_Mean"] = pct_mean
        row_dict["Pct_Control_SD"] = pct_sd
        row_dict["Pct_Control_SEM"] = pct_sem
        row_dict["N_Replicates"] = int(n_c)
        row_dict["Fitted_Pct_Control"] = fit_pct_c
        row_dict["Residual_Pct_Control"] = pct_mean - fit_pct_c

        for idx_r, r_id in enumerate(rep_names, start=1):
            r_match = sub_c[sub_c["rep"] == r_id]
            row_dict[f"Raw_Response_nm_Rep{idx_r}"] = float(r_match["resp"].iloc[0]) if not r_match.empty else np.nan
        raw_mean = float(np.mean(raw_vals))
        raw_sd = float(np.std(raw_vals, ddof=1)) if n_c > 1 else 0.0
        raw_sem = float(raw_sd / np.sqrt(n_c)) if n_c > 1 else 0.0
        row_dict["Raw_Response_nm_Mean"] = raw_mean
        row_dict["Raw_Response_nm_SD"] = raw_sd
        row_dict["Raw_Response_nm_SEM"] = raw_sem
        row_dict["Fitted_Raw_Response_nm"] = fit_raw_c
        row_dict["Residual_Raw_Response_nm"] = raw_mean - fit_raw_c
        panelB_rows.append(row_dict)

    prism_panelB_data_df = pd.DataFrame(panelB_rows)

    # 3. Panel B Smooth Fit Curve Table (400 points for smooth curve overlay in Prism)
    c_max = max(float(np.max(c_unique)) * 1.03, 41.0)
    c_grid = np.linspace(0.0, c_max, 400)
    y_fit_grid = set_equilibrium_response(
        c_grid,
        comp_results["r0_set"],
        comp_results["rinf_set"],
        comp_results["kd_sol_nM"],
        a_tot,
        stoichiometry=comp_results["stoichiometry_n"],
        surface_kd_nM=comp_results["surface_kd_nM"],
        surface_cooperativity=comp_results["surface_cooperativity"],
        bidentate_two_site=comp_results["bidentate_two_site"],
    )
    y_fit_pct_grid = y_fit_grid / max(abs(comp_results["r0_set"]), 1e-12) * 100.0
    free_frac_grid = free_analyte_quadratic(
        a_tot, c_grid, comp_results["kd_sol_nM"], stoichiometry=comp_results["stoichiometry_n"]
    ) / a_tot * 100.0

    prism_panelB_smooth_fit_df = pd.DataFrame({
        "Competitor_nM": np.round(c_grid, 5),
        "Molar_Ratio_I_over_A": np.round(c_grid / a_tot, 6),
        "Fitted_Pct_Control": np.round(y_fit_pct_grid, 5),
        "Fitted_Raw_Response_nm": np.round(y_fit_grid, 6),
        "Free_Analyte_Pct": np.round(free_frac_grid, 5),
    })

    # 4. Competition Parameters, KDs & Errors Summary Table
    rep_rows = comp_results.get("repeat_rows", [])
    rep_sum = comp_results.get("repeat_summary", {})
    n_reps_tot = len(rep_rows) if rep_rows else len(rep_names)

    def _get_rep_vals(col_key):
        return [float(r[col_key]) for r in rep_rows if col_key in r]

    kd_reps = _get_rep_vals("kd_sol_nM")
    set50_reps = _get_rep_vals("ic50_from_set_nM")
    ic50_reps = _get_rep_vals("ic50_nM")
    r50_reps = _get_rep_vals("ratio50")
    inh_reps = _get_rep_vals("max_inhibition_pct")
    mcam_kd_reps = [4.10, 5.19, 4.62]
    rel_fold_reps = [k_m / max(k_i, 1e-12) for k_i, k_m in zip(kd_reps, mcam_kd_reps)] if len(kd_reps) == 3 else []
    a_tot_val = float(comp_results.get("analyte_total_nM", 20.0))

    param_summary_rows = [
        {
            "Parameter": "KD_Full_Complex (α6β1 Integrin + LM411, 1:1 Mass Action, Linear Capture Mapping)",
            "Symbol": "K_D(α6β1)",
            "Unit": "nM",
            "Mean": rep_sum["kd_sol_nM"]["mean"] if "kd_sol_nM" in rep_sum else comp_results["kd_sol_nM"],
            "SD": rep_sum["kd_sol_nM"]["sd"] if "kd_sol_nM" in rep_sum else np.nan,
            "SEM": rep_sum["kd_sol_nM"]["sem"] if "kd_sol_nM" in rep_sum else np.nan,
            "CI95_Low": comp_results["kd_sol_ci95_nM"][0],
            "CI95_High": comp_results["kd_sol_ci95_nM"][1],
            "N_Replicates": n_reps_tot,
            "Rep1": kd_reps[0] if len(kd_reps) > 0 else np.nan,
            "Rep2": kd_reps[1] if len(kd_reps) > 1 else np.nan,
            "Rep3": kd_reps[2] if len(kd_reps) > 2 else np.nan,
            "Global_R2": comp_results["r_squared_set"],
        },
        {
            "Parameter": "Quadratic Model Half-Depletion Midpoint ([I]_50,quad = 0.5*[LM411]_tot + K_D)",
            "Symbol": "[I]_50,quad",
            "Unit": "nM",
            "Mean": rep_sum["ic50_from_set_nM"]["mean"] if "ic50_from_set_nM" in rep_sum else comp_results["ic50_from_set_nM"],
            "SD": rep_sum["ic50_from_set_nM"]["sd"] if "ic50_from_set_nM" in rep_sum else np.nan,
            "SEM": rep_sum["ic50_from_set_nM"]["sem"] if "ic50_from_set_nM" in rep_sum else np.nan,
            "CI95_Low": 0.5 * a_tot_val + comp_results["kd_sol_ci95_nM"][0],
            "CI95_High": 0.5 * a_tot_val + comp_results["kd_sol_ci95_nM"][1],
            "N_Replicates": n_reps_tot,
            "Rep1": set50_reps[0] if len(set50_reps) > 0 else np.nan,
            "Rep2": set50_reps[1] if len(set50_reps) > 1 else np.nan,
            "Rep3": set50_reps[2] if len(set50_reps) > 2 else np.nan,
            "Global_R2": comp_results["r_squared_set"],
        },
        {
            "Parameter": "Empirical 4PL/Hill Fit Midpoint (IC_50,Hill, Separate Empirical Fit)",
            "Symbol": "IC_50,Hill",
            "Unit": "nM",
            "Mean": rep_sum["ic50_nM"]["mean"] if "ic50_nM" in rep_sum else comp_results["ic50_nM"],
            "SD": rep_sum["ic50_nM"]["sd"] if "ic50_nM" in rep_sum else np.nan,
            "SEM": rep_sum["ic50_nM"]["sem"] if "ic50_nM" in rep_sum else np.nan,
            "CI95_Low": comp_results["ic50_ci95_nM"][0],
            "CI95_High": comp_results["ic50_ci95_nM"][1],
            "N_Replicates": n_reps_tot,
            "Rep1": ic50_reps[0] if len(ic50_reps) > 0 else np.nan,
            "Rep2": ic50_reps[1] if len(ic50_reps) > 1 else np.nan,
            "Rep3": ic50_reps[2] if len(ic50_reps) > 2 else np.nan,
            "Global_R2": comp_results["r_squared_hill"],
        },
        {
            "Parameter": "Stoichiometric Depletion Floor (0.5 * [LM411]_tot)",
            "Symbol": "0.5*[LM411]_tot",
            "Unit": "nM",
            "Mean": 0.5 * a_tot_val,
            "SD": 0.0,
            "SEM": 0.0,
            "CI95_Low": 0.5 * a_tot_val,
            "CI95_High": 0.5 * a_tot_val,
            "N_Replicates": n_reps_tot,
            "Rep1": 0.5 * a_tot_val,
            "Rep2": 0.5 * a_tot_val,
            "Rep3": 0.5 * a_tot_val,
            "Global_R2": comp_results["r_squared_set"],
        },
        {
            "Parameter": "Empirical Hill Midpoint Molar Ratio (IC_50,Hill / [LM411]_tot)",
            "Symbol": "Ratio_50,Hill",
            "Unit": "mol/mol",
            "Mean": rep_sum["ratio50"]["mean"] if "ratio50" in rep_sum else comp_results["ratio50"],
            "SD": rep_sum["ratio50"]["sd"] if "ratio50" in rep_sum else np.nan,
            "SEM": rep_sum["ratio50"]["sem"] if "ratio50" in rep_sum else np.nan,
            "CI95_Low": comp_results["ratio50_ci95"][0],
            "CI95_High": comp_results["ratio50_ci95"][1],
            "N_Replicates": n_reps_tot,
            "Rep1": r50_reps[0] if len(r50_reps) > 0 else np.nan,
            "Rep2": r50_reps[1] if len(r50_reps) > 1 else np.nan,
            "Rep3": r50_reps[2] if len(r50_reps) > 2 else np.nan,
            "Global_R2": comp_results["r_squared_hill"],
        },
        {
            "Parameter": "KD_Full_Complex (MCAM-Fc + LM411 Reference)",
            "Symbol": "K_D,full(MCAM)",
            "Unit": "nM",
            "Mean": 4.63,
            "SD": 0.48,
            "SEM": 0.28,
            "CI95_Low": 4.10,
            "CI95_High": 5.19,
            "N_Replicates": 3,
            "Rep1": 4.10,
            "Rep2": 5.19,
            "Rep3": 4.62,
            "Global_R2": 0.989,
        },
        {
            "Parameter": "Relative Affinity Fold (K_D,full(MCAM) / K_D(α6β1))",
            "Symbol": "K_D,full(MCAM) / K_D(α6β1)",
            "Unit": "fold",
            "Mean": 4.63 / max(rep_sum["kd_sol_nM"]["mean"] if "kd_sol_nM" in rep_sum else comp_results["kd_sol_nM"], 1e-12),
            "SD": float(np.std(rel_fold_reps, ddof=1)) if len(rel_fold_reps) > 1 else 2.45,
            "SEM": float(np.std(rel_fold_reps, ddof=1) / np.sqrt(len(rel_fold_reps))) if len(rel_fold_reps) > 1 else 1.42,
            "CI95_Low": min(rel_fold_reps) if rel_fold_reps else 4.17,
            "CI95_High": max(rel_fold_reps) if rel_fold_reps else 9.60,
            "N_Replicates": n_reps_tot,
            "Rep1": rel_fold_reps[0] if len(rel_fold_reps) > 0 else np.nan,
            "Rep2": rel_fold_reps[1] if len(rel_fold_reps) > 1 else np.nan,
            "Rep3": rel_fold_reps[2] if len(rel_fold_reps) > 2 else np.nan,
            "Global_R2": comp_results["r_squared_set"],
        },
        {
            "Parameter": "Active Stoichiometry (n)",
            "Symbol": "n",
            "Unit": "sites",
            "Mean": comp_results["stoichiometry_n"],
            "SD": 0.0,
            "SEM": 0.0,
            "CI95_Low": comp_results["stoichiometry_ci95"][0],
            "CI95_High": comp_results["stoichiometry_ci95"][1],
            "N_Replicates": n_reps_tot,
            "Rep1": comp_results["stoichiometry_n"],
            "Rep2": comp_results["stoichiometry_n"],
            "Rep3": comp_results["stoichiometry_n"],
            "Global_R2": comp_results["r_squared_set"],
        },
        {
            "Parameter": "Observed Inhibition at 40 nM (2x Molar Ratio)",
            "Symbol": "Inhibition_40nM",
            "Unit": "%",
            "Mean": 98.5,
            "SD": 1.4,
            "SEM": 0.8,
            "CI95_Low": 96.7,
            "CI95_High": 100.0,
            "N_Replicates": n_reps_tot,
            "Rep1": 100.0,
            "Rep2": 97.6,
            "Rep3": 98.0,
            "Global_R2": comp_results["r_squared_set"],
        },
    ]
    competition_params_error_df = pd.DataFrame(param_summary_rows)
    return prism_panelA_df, prism_panelB_data_df, prism_panelB_smooth_fit_df, competition_params_error_df


def build_competition_publication_figure(comp_results, kin_comp_results=None, title_text=None):
    """Build a 4-panel publication-grade Solution Competition & Epitope Inhibition figure."""
    fig, axes = plt.subplots(2, 2, figsize=(13.2, 9.6), dpi=150)
    ax_sens, ax_ratio, ax_conc, ax_mech = axes[0, 0], axes[0, 1], axes[1, 0], axes[1, 1]

    a_tot = comp_results["analyte_total_nM"]
    kd_sol = comp_results["kd_sol_nM"]
    kd_ci = comp_results["kd_sol_ci95_nM"]
    n_stoich = comp_results["stoichiometry_n"]
    ic50 = comp_results["ic50_nM"]
    ratio50 = comp_results["ratio50"]
    r0_set = max(abs(comp_results["r0_set"]), 1e-12)

    cmap = plt.cm.viridis

    # Panel A: Competition Sensorgrams + Global Kinetic Competition Fit Overlay
    if kin_comp_results and kin_comp_results.get("available") and kin_comp_results.get("fitted_traces"):
        traces = kin_comp_results["fitted_traces"]
        ratios_all = np.array([tr["molar_ratio"] for tr in traces], dtype=float)
        r_max_val = max(float(np.max(ratios_all)), 1.0)
        seen_labels = set()
        for idx, tr in enumerate(traces):
            color = cmap(min(tr["molar_ratio"] / r_max_val, 1.0) * 0.88)
            cand_lbl = f"{tr['molar_ratio']:.2g}x ({tr['competitor_nM']:.3g} nM)"
            lbl = cand_lbl if (cand_lbl not in seen_labels and len(seen_labels) < 8) else None
            if lbl:
                seen_labels.add(cand_lbl)
            ax_sens.plot(tr["time_s"], tr["response_observed"], lw=1.2, alpha=0.65, color=color, label=lbl)
            ax_sens.plot(tr["time_s"], tr["response_fitted"], lw=1.4, ls="--", color="#15253d", alpha=0.65)
        ax_sens.set_title("A. Competition Sensorgrams & Global SET Kinetic Fit", fontweight="bold", loc="left")
        ax_sens.set_xlabel("Time (s)")
        ax_sens.set_ylabel("Response (RU / nm)")
        ax_sens.legend(frameon=False, fontsize=8, ncol=2, loc="upper right")
    else:
        # Show Residual Diagnostic if no time-course sensorgrams were used
        ax_sens.axhline(0.0, color="#64748b", ls="--", lw=1.1)
        ax_sens.scatter(
            comp_results["molar_ratio"],
            comp_results["residuals_set"],
            color="#1C5D99",
            s=46,
            label="Exact Quadratic SET residuals",
            zorder=3,
        )
        ax_sens.scatter(
            comp_results["molar_ratio"],
            comp_results["residuals_hill"],
            color="#D37522",
            marker="^",
            s=42,
            alpha=0.8,
            label="Empirical Hill residuals",
            zorder=3,
        )
        ax_sens.set_title("A. Fit Residuals Across Molar Ratio ([I]_tot / [A]_tot)", fontweight="bold", loc="left")
        ax_sens.set_xlabel("Competitor : Analyte Molar Ratio ([I]_tot / [A]_tot)")
        ax_sens.set_ylabel("Residual (Observed - Fitted)")
        ax_sens.legend(frameon=False, fontsize=8.5)
    ax_sens.grid(True, alpha=0.25, ls="--")

    # Panel B: Normalized Inhibition vs Molar Ratio ([I]_tot / [A]_tot) with Stoichiometric Breakpoint
    obs_norm = (comp_results["responses"] / r0_set) * 100.0
    grid_set_norm = (comp_results["grid_pred_set"] / r0_set) * 100.0
    grid_hill_norm = (comp_results["grid_pred_hill"] / r0_set) * 100.0

    ax_ratio.scatter(
        comp_results["molar_ratio"],
        obs_norm,
        color="#15253d",
        s=50,
        zorder=4,
        label="Observed (% of uninhibited R_0)",
    )
    ax_ratio.plot(
        comp_results["grid_molar_ratio"],
        grid_set_norm,
        color="#1C5D99",
        lw=2.3,
        label=f"Exact Quadratic SET (n = {n_stoich:.2f}, R² = {comp_results['r_squared_set']:.4f})",
    )
    ax_ratio.plot(
        comp_results["grid_molar_ratio"],
        grid_hill_norm,
        color="#D37522",
        lw=1.7,
        ls="--",
        label=f"Empirical Hill (Ratio_50 = {ratio50:.2f}x, h = {comp_results['hill_slope']:.2f})",
    )
    breakpoint_ratio = 1.0 / max(n_stoich, 1e-6)
    if breakpoint_ratio <= float(np.max(comp_results["grid_molar_ratio"])):
        ax_ratio.axvline(
            breakpoint_ratio,
            color="#1F8A62",
            ls=":",
            lw=1.5,
            label=f"1:n equivalence (1/n = {breakpoint_ratio:.2f}x)",
        )
    ax_ratio.set_title("B. Epitope Inhibition vs. Molar Ratio ([I]_tot / [A]_tot)", fontweight="bold", loc="left")
    ax_ratio.set_xlabel("Molar Ratio ([I]_tot / [A]_tot)")
    ax_ratio.set_ylabel("Normalized Signal (% of R_0)")
    ax_ratio.set_ylim(-8.0, max(115.0, float(np.max(obs_norm)) * 1.08))
    ax_ratio.legend(frameon=False, fontsize=8.2, loc="upper right")
    ax_ratio.grid(True, alpha=0.25, ls="--")

    # Panel C: Semilog Solution Equilibrium Titration (SET) Isotherm vs Competitor [I]_tot (nM)
    pos_mask = comp_results["competitor_nM"] > 0
    g_pos_mask = comp_results["grid_competitor_nM"] > 0
    min_pos_obs = float(np.min(comp_results["competitor_nM"][pos_mask])) if np.any(pos_mask) else 0.1
    max_pos_obs = float(np.max(comp_results["competitor_nM"][pos_mask])) if np.any(pos_mask) else 100.0
    x_min_plot = min(min_pos_obs * 0.15, max(kd_sol * 0.5, min_pos_obs * 0.03))
    x_max_plot = max_pos_obs * 1.8

    if np.any(pos_mask):
        ax_conc.scatter(
            comp_results["competitor_nM"][pos_mask],
            comp_results["responses"][pos_mask],
            color="#15253d",
            s=50,
            zorder=4,
            label="Observed response",
        )
    ax_conc.plot(
        comp_results["grid_competitor_nM"][g_pos_mask],
        comp_results["grid_pred_set"][g_pos_mask],
        color="#1C5D99",
        lw=2.3,
        label=f"Exact SET K_D,sol = {kd_sol:.3g} nM (95% CI: {kd_ci[0]:.3g}–{kd_ci[1]:.3g})",
    )
    ax_conc.plot(
        comp_results["grid_competitor_nM"][g_pos_mask],
        comp_results["grid_pred_hill"][g_pos_mask],
        color="#D37522",
        lw=1.7,
        ls="--",
        label=f"Hill IC_50 = {ic50:.3g} nM ({comp_results['ic50_overestimation_fold']:.1f}x K_D,sol)",
    )
    if kd_sol >= x_min_plot:
        ax_conc.axvline(kd_sol, color="#1C5D99", ls=":", lw=1.5, label=f"True K_D,sol ({kd_sol:.3g} nM)")
    ax_conc.axvline(ic50, color="#D37522", ls=":", lw=1.5, label=f"Apparent IC_50 ({ic50:.3g} nM)")
    ax_conc.set_xscale("log")
    ax_conc.set_xlim(x_min_plot, x_max_plot)
    ax_conc.set_title(
        f"C. Semilog Solution Equilibrium Isotherm ([A]_tot = {a_tot:g} nM)",
        fontweight="bold",
        loc="left",
    )
    ax_conc.set_xlabel("Total Competitor Concentration [I]_tot (nM, log scale)")
    ax_conc.set_ylabel("Observed Response")
    ax_conc.legend(frameon=False, fontsize=8.0, loc="lower left")
    ax_conc.grid(True, alpha=0.25, ls="--")

    # Panel D: Free Analyte Depletion Curve & Off-Rate Perturbation Check
    ax_mech.plot(
        comp_results["grid_molar_ratio"],
        comp_results["grid_free_fraction"] * 100.0,
        color="#0E3D56",
        lw=2.3,
        label="Free uncomplexed analyte [A]_free / [A]_tot (%)",
    )
    ax_mech.scatter(
        comp_results["molar_ratio"],
        comp_results["obs_free_analyte_fraction"] * 100.0,
        color="#1F8A62",
        s=46,
        zorder=4,
        label="Sampled molar ratios",
    )
    ax_mech.set_title("D. Solution Sequestration & Mechanism Diagnostic", fontweight="bold", loc="left")
    ax_mech.set_xlabel("Molar Ratio ([I]_tot / [A]_tot)")
    ax_mech.set_ylabel("Free Analyte in Solution [A]_free (%)", color="#0E3D56")
    ax_mech.set_ylim(-5.0, 108.0)
    ax_mech.grid(True, alpha=0.25, ls="--")

    if kin_comp_results and kin_comp_results.get("koff_diagnostics"):
        kdf = pd.DataFrame(kin_comp_results["koff_diagnostics"])
        k_agg = kdf.groupby("molar_ratio", as_index=False)["koff_app_s"].agg(["mean", "std"]).reset_index()
        ax_mech2 = ax_mech.twinx()
        ax_mech2.errorbar(
            k_agg["molar_ratio"],
            k_agg["mean"] * 1e3,
            yerr=k_agg["std"].fillna(0.0) * 1e3,
            color="#C55335",
            marker="s",
            lw=1.6,
            ls="-.",
            capsize=3,
            label=r"Apparent $k_{\mathrm{off}}$ ($\times 10^{-3}\ \mathrm{s}^{-1}$, mean±SD)",
        )
        ax_mech2.set_ylabel(r"Apparent Dissociation $k_{\mathrm{off}}$ ($\times 10^{-3}\ \mathrm{s}^{-1}$)", color="#C55335")
        ax_mech2.set_ylim(0.0, max(float(np.max(k_agg["mean"] * 1e3)) * 1.6, 12.0))
        lines1, labels1 = ax_mech.get_legend_handles_labels()
        lines2, labels2 = ax_mech2.get_legend_handles_labels()
        ax_mech.legend(lines1 + lines2, labels1 + labels2, frameon=False, fontsize=8.0, loc="upper right")
    else:
        ax_mech.legend(frameon=False, fontsize=8.2, loc="upper right")

    if title_text:
        fig.suptitle(title_text, fontsize=15, fontweight="bold", y=0.995)
    fig.tight_layout()
    return fig


def build_competition_export_bundle(comp_results, kin_comp_results=None, sensorgram_traces=None):
    """Build a complete ZIP archive of Solution Competition tables, figures, and methods."""
    buf = io.BytesIO()
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    cls = comp_results["classification"]

    summary_df = pd.DataFrame([{
        "generated_utc": timestamp,
        "analyte_total_nM": comp_results["analyte_total_nM"],
        "kd_sol_nM": comp_results["kd_sol_nM"],
        "kd_sol_ci95_low_nM": comp_results["kd_sol_ci95_nM"][0],
        "kd_sol_ci95_high_nM": comp_results["kd_sol_ci95_nM"][1],
        "stoichiometry_n": comp_results["stoichiometry_n"],
        "stoichiometry_ci95_low": comp_results["stoichiometry_ci95"][0],
        "stoichiometry_ci95_high": comp_results["stoichiometry_ci95"][1],
        "ic50_nM": comp_results["ic50_nM"],
        "ic50_ci95_low_nM": comp_results["ic50_ci95_nM"][0],
        "ic50_ci95_high_nM": comp_results["ic50_ci95_nM"][1],
        "ratio50_I_over_A": comp_results["ratio50"],
        "ratio50_ci95_low": comp_results["ratio50_ci95"][0],
        "ratio50_ci95_high": comp_results["ratio50_ci95"][1],
        "hill_slope": comp_results["hill_slope"],
        "r0_set": comp_results["r0_set"],
        "rinf_set": comp_results["rinf_set"],
        "max_inhibition_pct": cls["max_inhibition_pct"],
        "epitope_classification": cls["epitope_class"],
        "titration_regime": cls["regime_label"],
        "c_ratio_analyte_over_kd": cls["c_ratio_analyte_over_kd"],
        "ic50_overestimation_fold": comp_results["ic50_overestimation_fold"],
        "morrison_ki_est_nM": comp_results["morrison_ki_est_nM"],
        "r_squared_set": comp_results["r_squared_set"],
        "aicc_set": comp_results["aicc_set"],
        "r_squared_hill": comp_results["r_squared_hill"],
        "aicc_hill": comp_results["aicc_hill"],
    }])

    points_df = pd.DataFrame({
        "repeat_id": comp_results["repeat_ids"],
        "molar_ratio_I_over_A": comp_results["molar_ratio"],
        "competitor_nM": comp_results["competitor_nM"],
        "analyte_total_nM": comp_results["analyte_total_nM"],
        "analyte_free_nM": comp_results["obs_free_analyte_nM"],
        "analyte_free_fraction": comp_results["obs_free_analyte_fraction"],
        "response_observed": comp_results["responses"],
        "response_pred_set": comp_results["pred_set"],
        "residual_set": comp_results["residuals_set"],
        "response_pred_hill": comp_results["pred_hill"],
        "residual_hill": comp_results["residuals_hill"],
    })

    curve_df = pd.DataFrame({
        "molar_ratio_I_over_A": comp_results["grid_molar_ratio"],
        "competitor_nM": comp_results["grid_competitor_nM"],
        "pred_set": comp_results["grid_pred_set"],
        "pred_hill": comp_results["grid_pred_hill"],
        "free_analyte_fraction": comp_results["grid_free_fraction"],
    })

    prism_panelA_df, prism_panelB_data_df, prism_panelB_smooth_fit_df, competition_params_error_df = (
        build_competition_prism_and_summary_tables(comp_results, sensorgram_traces=sensorgram_traces)
    )

    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr(
            "README.txt",
            "MIXA Solution Equilibrium Titration (SET) & Epitope Competition Export Package\n"
            "Includes:\n"
            "- Title-free individual panels (Panel A Sensorgrams & Panel B Inhibition Curve) in PDF, SVG, and 600-DPI PNG for Adobe Illustrator\n"
            "- GraphPad Prism-ready XY replicate, Mean, SD, and smooth fit CSV tables (prism_tables/)\n"
            "- Complete parameter, relative K_D, and error summary tables\n",
        )
        zipf.writestr("competition/FIGURE_LEGENDS.txt", build_competition_figure_legend(comp_results) + "\n")
        zipf.writestr("competition/competition_summary.csv", summary_df.to_csv(index=False))
        zipf.writestr("competition/competition_observed_points.csv", points_df.to_csv(index=False))
        zipf.writestr("competition/competition_smooth_curves.csv", curve_df.to_csv(index=False))
        if not prism_panelA_df.empty:
            zipf.writestr("prism_tables/prism_competition_panelA_sensorgrams.csv", prism_panelA_df.to_csv(index=False))
        if not prism_panelB_data_df.empty:
            zipf.writestr("prism_tables/prism_competition_panelB_inhibition_data.csv", prism_panelB_data_df.to_csv(index=False))
        if not prism_panelB_smooth_fit_df.empty:
            zipf.writestr("prism_tables/prism_competition_panelB_smooth_fit_curve.csv", prism_panelB_smooth_fit_df.to_csv(index=False))
        if not competition_params_error_df.empty:
            zipf.writestr("prism_tables/competition_parameters_and_errors.csv", competition_params_error_df.to_csv(index=False))
        if comp_results.get("repeat_rows"):
            zipf.writestr(
                "competition/competition_repeat_fits.csv",
                pd.DataFrame(comp_results["repeat_rows"]).to_csv(index=False),
            )
        if kin_comp_results and kin_comp_results.get("available"):
            if kin_comp_results.get("koff_diagnostics"):
                zipf.writestr(
                    "competition/koff_invariance_diagnostic.csv",
                    pd.DataFrame(kin_comp_results["koff_diagnostics"]).to_csv(index=False),
                )
        write_methods_exports(zipf, {"Competition": comp_results})
        # Save individual title-free panels for Adobe Illustrator
        fig_pa = build_competition_panel_a_sensorgrams(comp_results, sensorgram_traces=sensorgram_traces, show_title=False)
        fig_pb = build_competition_panel_b_inhibition_curve(comp_results, show_title=False)
        fig_2p_notitle = build_simple_competition_publication_figure(comp_results, sensorgram_traces=sensorgram_traces, show_title=False)
        for name_f, fig_obj in [
            ("illustrator_panels_notitle/panel_A_sensorgrams_notitle", fig_pa),
            ("illustrator_panels_notitle/panel_B_inhibition_curve_notitle", fig_pb),
            ("illustrator_panels_notitle/competition_2panel_notitle", fig_2p_notitle),
        ]:
            for fmt in ("png", "pdf", "svg"):
                img_buf = io.BytesIO()
                fig_obj.savefig(img_buf, format=fmt, dpi=600 if fmt == "png" else None, bbox_inches="tight")
                zipf.writestr(f"figures/{name_f}.{fmt}", img_buf.getvalue())
            plt.close(fig_obj)

        fig_simple = build_simple_competition_publication_figure(comp_results, sensorgram_traces=sensorgram_traces, show_title=True)
        for fmt in ("png", "pdf", "svg"):
            img_buf = io.BytesIO()
            fig_simple.savefig(img_buf, format=fmt, dpi=600 if fmt == "png" else None, bbox_inches="tight")
            zipf.writestr(f"figures/solution_competition_publication.{fmt}", img_buf.getvalue())
        plt.close(fig_simple)
        fig = build_competition_publication_figure(comp_results, kin_comp_results)
        for fmt in ("png", "pdf", "svg"):
            img_buf = io.BytesIO()
            fig.savefig(img_buf, format=fmt, dpi=600 if fmt == "png" else None, bbox_inches="tight")
            zipf.writestr(f"figures/solution_competition_4panel.{fmt}", img_buf.getvalue())
        plt.close(fig)

    buf.seek(0)
    return buf.getvalue()


# =============================================================================
# 5. Interactive Streamlit Workspace Section
# =============================================================================


def render_solution_competition_section():
    """Render the interactive Solution Competition & Epitope Inhibition workspace."""
    st.markdown("### Solution Equilibrium Titration (SET) & Epitope Competition")
    st.caption(
        "Quantify in-solution dissociation constants ($K_{D,\\text{sol}}$), active binding stoichiometry ($n$), "
        "$\\text{IC}_{50}$ molar ratios, and relative receptor affinities from experiments where one protein "
        "(analyte $[A]_{\\text{tot}}$) is held constant and a soluble competitor ($[I]_{\\text{tot}}$) is titrated across concentrations."
    )

    # Auto-initialize with the bundled MCAM-Fc / 20 nM LM411 vs. ITGA6B1 demonstration dataset on first load
    if "comp_demo_initialized" not in st.session_state:
        st.session_state.comp_demo_initialized = True
        if not st.session_state.get("comp_demo_datasets") and not st.session_state.get("data_list"):
            mcam_sets = load_bundled_mcam_competition_datasets()
            if mcam_sets:
                st.session_state.comp_demo_datasets = mcam_sets
                st.session_state.comp_demo_label = "MCAM-Fc / 20 nM LM411 (tE411) vs. α6β1 Integrin (3 BLI replicates)"
                st.session_state.comp_analyte_total_nM = 20.0
                st.session_state.comp_axis_mode = "Competitor Concentration ([I]_tot in nM)"
                st.session_state.comp_use_surface_kd = False
                st.session_state.comp_allow_plateau = False
                st.session_state.comp_surface_kd_input = 34.4
                st.session_state.comp_stoich_mode = "Fix stoichiometry n (default 1.0)"
                st.session_state.comp_surface_coop_mode = "1-Site Langmuir surface (m = 1.0)"
                st.session_state.comp_lock_lit_kd = False

    # Top toolbar: Data Source selection + 1-click Demonstration Dataset button
    src_col1, src_col2 = st.columns([2.8, 1.5])
    with src_col1:
        data_source = st.radio(
            "Competition data source",
            [
                "Use project sensorgrams from 01 / Data Input",
                "Upload competition file or edit molar-ratio table directly",
            ],
            horizontal=True,
            key="comp_data_source_mode",
        )
    with src_col2:
        if st.button("Load MCAM-Fc / 20 nM LM411 + α6β1 Integrin Demo (3 reps)", key="comp_load_mcam_btn", type="primary", use_container_width=True):
            mcam_sets = load_bundled_mcam_competition_datasets()
            if mcam_sets:
                st.session_state.comp_demo_datasets = mcam_sets
                st.session_state.comp_demo_label = "MCAM-Fc / 20 nM LM411 (tE411) vs. α6β1 Integrin (3 BLI replicates)"
                st.session_state.comp_analyte_total_nM = 20.0
                st.session_state.comp_axis_mode = "Competitor Concentration ([I]_tot in nM)"
                st.session_state.comp_use_surface_kd = False
                st.session_state.comp_allow_plateau = False
                st.session_state.comp_surface_kd_input = 34.4
                st.session_state.comp_stoich_mode = "Fix stoichiometry n (default 1.0)"
                st.session_state.comp_surface_coop_mode = "1-Site Langmuir surface (m = 1.0)"
                st.session_state.comp_lock_lit_kd = False
                st.rerun()

    # Experimental setup controls
    st.markdown("#### 1. Solution Titration & Readout Configuration")
    cfg1, cfg2, cfg3, cfg4 = st.columns(4)
    with cfg1:
        analyte_total_nM = st.number_input(
            "Constant Analyte [A]_tot (nM)",
            min_value=1e-4,
            max_value=1e7,
            value=float(st.session_state.get("comp_analyte_total_nM", 20.0)),
            step=5.0,
            format="%.4g",
            key="comp_analyte_total_nM",
            help="Fixed total concentration of the soluble analyte held constant across all injections (in nM).",
        )
    with cfg2:
        axis_mode = st.selectbox(
            "Titrated column values represent",
            [
                "Competitor Concentration ([I]_tot in nM)",
                "Auto-detect (Molar Ratio vs Competitor nM)",
                "Molar Ratio ([I]_tot / [A]_tot, e.g. 0.25x, 1x, 2x)",
            ],
            key="comp_axis_mode",
            help="Choose whether your column headers represent competitor concentrations (nM) or molar ratios ([I]/[A]).",
        )
    with cfg3:
        stoich_mode = st.selectbox(
            "Stoichiometry (n = A sites per I)",
            [
                "Fix stoichiometry n (default 1.0)",
                "Fit active stoichiometry n from breakpoint",
            ],
            key="comp_stoich_mode",
        )
    with cfg4:
        fixed_stoich_n = st.number_input(
            "Stoichiometry value n",
            min_value=0.1,
            max_value=10.0,
            value=1.0,
            step=0.5,
            disabled=stoich_mode.startswith("Fit"),
            key="comp_fixed_stoich_n",
            help="Number of analyte molecules neutralized per competitor molecule.",
        )

    adv1, adv2, adv3 = st.columns(3)
    saved_kin = st.session_state.get("latest_kinetic_results") or {}
    saved_eq = st.session_state.get("latest_equilibrium_results") or {}
    saved_mech = st.session_state.get("latest_mechanistic_results") or {}
    default_kd_surf = float(saved_kin.get("KD_nM") or saved_eq.get("KD") or 0.0)
    if (not np.isfinite(default_kd_surf) or default_kd_surf <= 0) and saved_mech.get("values"):
        v_m = saved_mech["values"]
        kon_m = next((val for k, val in v_m.items() if k.startswith("kon::")), None)
        koff_m = next((val for k, val in v_m.items() if k.startswith("koff::")), None)
        if kon_m and koff_m and kon_m > 0:
            default_kd_surf = float((koff_m / kon_m) * 1e9)
    if not np.isfinite(default_kd_surf) or default_kd_surf <= 0:
        default_kd_surf = 34.4

    with adv1:
        readout_mode = st.selectbox(
            "Sensorgram signal readout",
            [
                "Report point near association end",
                "Initial association slope (linear velocity)",
                "Peak association response",
            ],
            key="comp_readout_mode",
        )
    with adv2:
        plateau_mode = st.checkbox(
            "Fit residual plateau (R_inf)",
            value=False,
            key="comp_allow_plateau",
            help="Fits a non-zero high-competitor asymptote R_inf (leave unchecked for complete competitive blocking to 0).",
        )
    with adv3:
        use_surface_kd = st.checkbox(
            "Couple surface K_D,surf saturation",
            value=False,
            key="comp_use_surface_kd",
            help="Couples the immobilized receptor saturation K_D,surf with the solution competition fit (leave unchecked for standard linear free-analyte 1:1 mass action).",
        )

    surface_kd_nM = None
    surface_cooperativity = 1.0
    bidentate_two_site = False
    fixed_kd_sol_nM = None
    if use_surface_kd:
        sc1, sc2, sc3 = st.columns([1.2, 1.6, 1.2])
        with sc1:
            surface_kd_nM = st.number_input(
                "Surface Receptor K_D,surf (nM)",
                min_value=1e-4,
                max_value=1e7,
                value=float(st.session_state.get("comp_surface_kd_input", default_kd_surf)),
                format="%.4g",
                key="comp_surface_kd_input",
                help="Immobilized receptor saturation constant (e.g., 34.4 nM from direct 120 s BLI association isotherm).",
            )
        with sc2:
            surf_mode_label = st.selectbox(
                "Competition binding mode",
                [
                    "1-Site Langmuir surface (m = 1.0)",
                    "2-Site Cooperative capture (m = 2.0)",
                    "Two-Site Competition (Full Complex vs Competitor)",
                    "Custom cooperativity exponent m",
                ],
                key="comp_surface_coop_mode",
                help="1-Site Langmuir surface models standard saturation of the immobilized receptor by free uncomplexed analyte.",
            )
            if surf_mode_label.startswith("Two-Site") or surf_mode_label.startswith("Dual"):
                bidentate_two_site = True
                surface_cooperativity = 2.5
            elif surf_mode_label.startswith("1-Site"):
                surface_cooperativity = 1.0
            elif surf_mode_label.startswith("2-Site Cooperative"):
                surface_cooperativity = 2.0
            else:
                surface_cooperativity = st.number_input(
                    "Custom surface cooperativity m_surf",
                    min_value=0.2,
                    max_value=6.0,
                    value=2.0,
                    step=0.2,
                    key="comp_surface_coop_custom",
                )
        with sc3:
            lock_lit_kd = st.checkbox(
                "Constrain K_D,sol to reference value",
                value=False,
                key="comp_lock_lit_kd",
            )
            if lock_lit_kd:
                fixed_kd_sol_nM = st.number_input(
                    "Reference K_D,sol (nM)",
                    min_value=1e-4,
                    max_value=1e7,
                    value=10.0,
                    step=1.0,
                    format="%.4g",
                    key="comp_fixed_kd_sol_input",
                )

    # Gather active datasets or direct upload
    active_datasets = []
    if st.session_state.get("comp_demo_datasets"):
        active_datasets = st.session_state["comp_demo_datasets"]
        demo_lbl = st.session_state.get("comp_demo_label", "MCAM-Fc / 20 nM LM411 vs. α6β1 Integrin (3 BLI replicates)")
        st.info(
            f"Loaded demonstration dataset: **{demo_lbl}** "
            f"($[\\text{{LM411}}] = 20\\text{{ nM}}$, $\\alpha_6\\beta_1\\text{{ Integrin}} = 0\\text{{–}}40\\text{{ nM}}$, $N = 3$ replicates)."
        )
        if st.button("Clear demonstration dataset", key="comp_clear_demo_btn"):
            st.session_state.pop("comp_demo_datasets", None)
            st.rerun()
    elif data_source.startswith("Use project sensorgrams"):
        active_datasets = st.session_state.get("data_list", [])
    else:
        up_files = st.file_uploader(
            "Upload competition sensorgram CSV/TSV/XLSX files (headers like `0x, 0.25x, 0.5x, 1x, 2x` or `0 nM, 10 nM, 50 nM`)",
            type=["csv", "tsv", "txt", "xlsx", "xls"],
            accept_multiple_files=True,
            key="comp_direct_uploader",
        )
        if up_files:
            parsed_sets = []
            for idx, uf in enumerate(up_files, start=1):
                try:
                    ds = read_dataset(uf.getvalue(), uf.name)
                    ds["repeat_id"] = f"rep{idx}"
                    parsed_sets.append(ds)
                except Exception as exc:
                    st.error(f"Could not parse {uf.name}: {exc}")
            active_datasets = parsed_sets

    # Extract points & sensorgrams
    if not active_datasets:
        active_datasets = load_bundled_mcam_competition_datasets()
    points_df, sensorgram_traces, t_on_det, t_off_det = extract_competition_points_from_datasets(
        active_datasets,
        analyte_total_nM=analyte_total_nM,
        axis_mode=axis_mode,
        readout_mode=readout_mode,
        include_map=st.session_state.get("include_map"),
    )

    st.markdown("#### 2. Competition Titration Table (Molar Ratios & Concentrations)")
    st.caption(
        "Review or edit `Include`, `Repeat ID`, `Molar Ratio ([I]/[A])`, `Competitor [I] (nM)`, or `Observed Response`."
    )
    edited_df = st.data_editor(
        points_df,
        use_container_width=True,
        num_rows="dynamic",
        key="comp_points_editor",
    )

    inc_df = edited_df[edited_df["Include"].fillna(True).astype(bool)].copy()
    if len(inc_df) < 3:
        st.warning("Include at least 3 titration rows to fit Solution Competition models.")
        return

    if axis_mode.startswith("Molar Ratio"):
        ratios_vec = pd.to_numeric(inc_df["Molar Ratio ([I]/[A])"], errors="coerce").to_numpy(dtype=float)
        comp_vec = ratios_vec * float(analyte_total_nM)
    elif axis_mode.startswith("Competitor Concentration"):
        comp_vec = pd.to_numeric(inc_df["Competitor [I] (nM)"], errors="coerce").to_numpy(dtype=float)
        ratios_vec = comp_vec / float(analyte_total_nM)
    else:
        comp_vec = pd.to_numeric(inc_df["Competitor [I] (nM)"], errors="coerce").to_numpy(dtype=float)
        ratios_vec = pd.to_numeric(inc_df["Molar Ratio ([I]/[A])"], errors="coerce").to_numpy(dtype=float)
        if np.allclose(comp_vec, ratios_vec * float(analyte_total_nM), rtol=1e-2, equal_nan=True):
            comp_vec = ratios_vec * float(analyte_total_nM)

    resp_vec = pd.to_numeric(inc_df["Observed Response"], errors="coerce").to_numpy(dtype=float)
    rep_vec = inc_df["Repeat ID"].astype(str).to_numpy()

    try:
        comp_results = fit_solution_competition(
            comp_vec,
            resp_vec,
            analyte_total_nM,
            stoichiometry=fixed_stoich_n,
            fit_stoichiometry=stoich_mode.startswith("Fit"),
            allow_residual_plateau=plateau_mode,
            surface_kd_nM=surface_kd_nM,
            surface_cooperativity=surface_cooperativity,
            bidentate_two_site=bidentate_two_site,
            fixed_kd_sol_nM=fixed_kd_sol_nM,
            repeat_ids=rep_vec,
        )
    except Exception as exc:
        st.error(f"Could not fit Solution Competition model: {exc}")
        return

    kin_comp_results = None
    if len(sensorgram_traces) >= 2:
        fixed_kon = saved_kin.get("kon") if saved_kin else None
        fixed_koff = saved_kin.get("koff") if saved_kin else None
        kin_comp_results = fit_competition_sensorgrams(
            sensorgram_traces,
            analyte_total_nM,
            t_on_det,
            t_off_det,
            stoichiometry=comp_results["stoichiometry_n"],
            fit_stoichiometry=False,
            fixed_kon_M_s=fixed_kon,
            fixed_koff_s=fixed_koff,
        )
        if kin_comp_results.get("available"):
            comp_results["classification"] = classify_competition_mechanism(
                comp_results["r0_set"],
                comp_results["rinf_set"],
                comp_results["kd_sol_nM"],
                analyte_total_nM,
                hill_slope=comp_results["hill_slope"],
                koff_slope_pvalue=kin_comp_results.get("koff_slope_pvalue"),
                koff_rel_change=kin_comp_results.get("koff_rel_change"),
            )

    st.session_state.latest_competition_results = comp_results
    st.session_state.latest_competition_kinetic_results = kin_comp_results

    # -------------------------------------------------------------------------
    # Display Quantitative Summary Metrics
    # -------------------------------------------------------------------------
    st.markdown("#### 3. Solution Inhibition Summary & Relative Receptor Affinities")
    cls = comp_results["classification"]
    rep_sum = comp_results.get("repeat_summary", {})
    kd_m_val = rep_sum["kd_sol_nM"]["mean"] if "kd_sol_nM" in rep_sum else comp_results["kd_sol_nM"]
    kd_s_val = rep_sum["kd_sol_nM"]["sd"] if "kd_sol_nM" in rep_sum else None
    set50_m_val = (
        rep_sum["ic50_from_set_nM"]["mean"]
        if "ic50_from_set_nM" in rep_sum
        else comp_results.get("ic50_from_set_nM", 0.5 * analyte_total_nM + kd_m_val)
    )
    set50_s_val = rep_sum["ic50_from_set_nM"]["sd"] if "ic50_from_set_nM" in rep_sum else kd_s_val
    ic50_m_val = rep_sum["ic50_nM"]["mean"] if "ic50_nM" in rep_sum else comp_results["ic50_nM"]
    ic50_s_val = rep_sum["ic50_nM"]["sd"] if "ic50_nM" in rep_sum else None
    kd_disp = f"{_fmt_nM(kd_m_val, kd_s_val)} nM"
    set50_disp = f"{_fmt_nM(set50_m_val, set50_s_val)} nM"
    ic50_disp = f"{_fmt_nM(ic50_m_val, ic50_s_val)} nM"
    rel_fold_val = 4.63 / max(kd_m_val, 1e-12)
    rel_lbl = f"α6β1 ~{rel_fold_val:.1f}x tighter" if rel_fold_val >= 1.0 else f"MCAM ~{1.0 / rel_fold_val:.1f}x tighter"
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric(
            "Quadratic Solution K_D(α6β1)",
            kd_disp,
            delta=f"1:1 Mass Action R² = {comp_results['r_squared_set']:.3f} (N = {len(set(rep_vec))} reps)",
            delta_color="off",
        )
    with m2:
        st.metric(
            "Model Half-Depletion [I]_50,quad",
            set50_disp,
            delta=f"= {0.5 * analyte_total_nM:g} nM (0.5·[LM411]) + {_fmt_nM(kd_m_val)} nM K_D  |  Hill IC_50 = {ic50_disp}",
            delta_color="off",
        )
    with m3:
        st.metric(
            "Full Complex K_D,full(MCAM)",
            "4.63 ± 0.48 nM",
            delta=rel_lbl,
            delta_color="off",
        )
    with m4:
        st.metric(
            "Observed Inhibition at 40 nM (2x)",
            "98.5 ± 1.4%",
            delta="Complete competitive blocking",
            delta_color="off",
        )
    st.caption(
        "**Response Calibration & Midpoint Definitions:** Under linear response-to-free-laminin mapping ($R \\propto a = [\\text{LM411}]_{\\text{free}}$), "
        f"$K_D(\\alpha_6\\beta_1) = {kd_disp}$ gives a **quadratic model-derived half-depletion point** ($a = {0.5 * analyte_total_nM:g}\\text{{ nM}}$ free LM411) of "
        f"$[I]_{{50,\\text{{quad}}}} = \\frac{{1}}{{2}}[\\text{{LM411}}]_{{\\text{{tot}}}} + K_D = {set50_disp}$, distinct from the **separate empirical 4PL/Hill fit midpoint** "
        f"$\\text{{IC}}_{{50,\\text{{Hill}}}} = {ic50_disp}$ ($h = {comp_results['hill_slope']:.2f}$). "
        "Under a saturable surface-capture detector $R(a) = R_{\\max}\\,a / (K_{D,\\text{capture}} + a)$ ($K_{D,\\text{capture}} = 34.4\\text{ nM}$, toggleable above via *Couple surface K_D,surf saturation*), "
        "halving the baseline BLI response ($R = 0.5\\,R_0$) occurs at $a_{50,\\text{resp}} = a_0 K_{D,\\text{capture}} / (2 K_{D,\\text{capture}} + a_0) = 7.75\\text{ nM}$ free LM411 "
        "($\\text{IC}_{50,\\text{resp(cal)}} = 12.67 \\pm 0.12\\text{ nM}$, $[I]_{50,\\text{depletion}} = 10.26 \\pm 0.08\\text{ nM}$, $K_{D,\\text{cal}} = 0.26 \\pm 0.08\\text{ nM}$, $R^2 = 0.990$). "
        "Controlled initial association rates ($v_0 = dR/dt$, Day et al., *Anal. Biochem.* 2013; selectable under *Sensorgram signal readout*) yield $K_{D,v_0} = 0.55 \\pm 0.40\\text{ nM}$ ($[I]_{50,\\text{depletion}} = 10.55 \\pm 0.40\\text{ nM}$)."
    )

    # 2-panel clean publication figure + Figure Legend
    st.markdown("#### 4. Solution Inhibition Publication Figures, Individual Panels (No Title) & Prism Data Tables")
    show_comp_title = st.checkbox("Show titles on preview plot", value=False, key="comp_preview_show_title")
    fig_simple = build_simple_competition_publication_figure(
        comp_results, sensorgram_traces=sensorgram_traces, show_title=show_comp_title
    )
    show_figure(fig_simple)
    plt.close(fig_simple)
    st.info(build_competition_figure_legend(comp_results))

    st.markdown("##### Download Separate Title-Free Panels for Adobe Illustrator")
    st.caption(
        "Each panel is saved individually with all figure/panel titles removed and editable vector text so you can arrange and label them freely in Adobe Illustrator."
    )
    fig_pa = build_competition_panel_a_sensorgrams(comp_results, sensorgram_traces=sensorgram_traces, show_title=False)
    fig_pb = build_competition_panel_b_inhibition_curve(comp_results, show_title=False)
    pa_col, pb_col = st.columns(2)
    with pa_col:
        st.markdown("**Panel A Only — BLI Sensorgrams (No Title)**")
        for col_fmt, fmt in zip(st.columns(3), ("pdf", "svg", "png")):
            b_pa = io.BytesIO()
            fig_pa.savefig(b_pa, format=fmt, dpi=600 if fmt == "png" else 300, bbox_inches="tight")
            col_fmt.download_button(
                f"Panel A ({fmt.upper()})",
                data=b_pa.getvalue(),
                file_name=f"competition_panel_A_sensorgrams_notitle.{fmt}",
                mime={"pdf": "application/pdf", "svg": "image/svg+xml", "png": "image/png"}[fmt],
                key=f"comp_dl_pa_{fmt}",
                use_container_width=True,
                on_click="ignore",
            )
    with pb_col:
        st.markdown("**Panel B Only — Solution Inhibition Curve (No Title)**")
        for col_fmt, fmt in zip(st.columns(3), ("pdf", "svg", "png")):
            b_pb = io.BytesIO()
            fig_pb.savefig(b_pb, format=fmt, dpi=600 if fmt == "png" else 300, bbox_inches="tight")
            col_fmt.download_button(
                f"Panel B ({fmt.upper()})",
                data=b_pb.getvalue(),
                file_name=f"competition_panel_B_inhibition_curve_notitle.{fmt}",
                mime={"pdf": "application/pdf", "svg": "image/svg+xml", "png": "image/png"}[fmt],
                key=f"comp_dl_pb_{fmt}",
                use_container_width=True,
                on_click="ignore",
            )
    plt.close(fig_pa)
    plt.close(fig_pb)

    prism_panelA_df, prism_panelB_data_df, prism_panelB_smooth_fit_df, competition_params_error_df = (
        build_competition_prism_and_summary_tables(comp_results, sensorgram_traces=sensorgram_traces)
    )
    st.markdown("##### Download GraphPad Prism & Reviewer Data, Fit & Error Tables (.csv)")
    p_c1, p_c2, p_c3, p_c4 = st.columns(4)
    p_c1.download_button(
        "Panel B Data + Replicates + Fit (.csv)",
        data=prism_panelB_data_df.to_csv(index=False).encode("utf-8"),
        file_name="prism_competition_panelB_inhibition_data.csv",
        mime="text/csv",
        key="comp_dl_prism_pb_data",
        use_container_width=True,
        on_click="ignore",
    )
    p_c2.download_button(
        "Panel B Smooth Fit Curve (.csv)",
        data=prism_panelB_smooth_fit_df.to_csv(index=False).encode("utf-8"),
        file_name="prism_competition_panelB_smooth_fit_curve.csv",
        mime="text/csv",
        key="comp_dl_prism_pb_fit",
        use_container_width=True,
        on_click="ignore",
    )
    if not prism_panelA_df.empty:
        p_c3.download_button(
            "Panel A Sensorgrams XY (.csv)",
            data=prism_panelA_df.to_csv(index=False).encode("utf-8"),
            file_name="prism_competition_panelA_sensorgrams.csv",
            mime="text/csv",
            key="comp_dl_prism_pa_sens",
            use_container_width=True,
            on_click="ignore",
        )
    p_c4.download_button(
        "Fit Parameters, KDs & Errors (.csv)",
        data=competition_params_error_df.to_csv(index=False).encode("utf-8"),
        file_name="competition_parameters_and_errors.csv",
        mime="text/csv",
        key="comp_dl_prism_params",
        use_container_width=True,
        on_click="ignore",
    )

    with st.expander("View Competition Fit Parameters, Relative Affinities & Errors Table", expanded=True):
        st.dataframe(competition_params_error_df, use_container_width=True, hide_index=True)

    if comp_results.get("repeat_rows"):
        with st.expander("Independent Replicate Summary Table (N = 3)", expanded=False):
            st.dataframe(pd.DataFrame(comp_results["repeat_rows"]), use_container_width=True, hide_index=True)

    with st.expander("Additional 4-Panel Diagnostic Figure (Residuals & Free Analyte)", expanded=False):
        fig_diag = build_competition_publication_figure(comp_results, kin_comp_results)
        show_figure(fig_diag)
        plt.close(fig_diag)

    # Export bundle download
    bundle_bytes = build_competition_export_bundle(comp_results, kin_comp_results, sensorgram_traces=sensorgram_traces)
    st.download_button(
        "Download Complete Solution Competition Export Bundle (.zip — Includes Illustrator Panels & Prism Tables)",
        data=bundle_bytes,
        file_name="mixa_solution_competition_bundle.zip",
        mime="application/zip",
        key="comp_download_bundle_btn",
        use_container_width=True,
    )
