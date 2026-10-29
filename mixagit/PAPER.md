# MIXA: An Open-Source Platform for Transparent Mechanistic, Equilibrium, and Hierarchical Statistical Analysis of SPR and BLI Binding Data

## Abstract

**Motivation:** Surface Plasmon Resonance (SPR) and Bio-Layer Interferometry (BLI) are standard label-free biophysical techniques for quantifying biomolecular interaction kinetics ($k_{\text{on}}$, $k_{\text{off}}$) and equilibrium affinity ($K_D$). However, instrument-supplied evaluation software operates largely as a proprietary black box: observation window trimming, baseline offset propagation, shared negative-control covariance, and parameter identifiability failures are rarely exposed in machine-verifiable form, and within-curve asymptotic standard errors are frequently conflated with across-experiment reproducibility.

**Results:** We present **MIXA** (*Molecular Interaction Kinetics & Affinity Analyzer*), an open-source web application and scriptable Python library for transparent, publication-grade analysis of SPR and BLI binding data. MIXA implements:
1. **Multi-format, provenance-tracked preprocessing:** Automatic ingestion of wide and tidy exports (`.csv`, `.tsv`, `.txt`, `.xlsx`) across concentration scales ($\text{fM}$–$\text{M}$), smart detection of negative-control/blank channels and experimental repeats, and non-extrapolative reference subtraction that preserves raw source covariance.
2. **Exact reaction and mass-transport schemes:** Global nonlinear optimization across 1:1 Langmuir, two-state conformational change, heterogeneous surface ligand, bivalent analyte, sequential two-step binding, and single-cycle kinetics (Karlsson et al., 2006), coupled optionally to quasi-steady-state or explicit two-compartment mass transport and Ornstein–Uhlenbeck correlated-noise Generalized Least Squares (GLS).
3. **Strict separation of uncertainty regimes:** MIXA distinguishes conditioned local Gauss–Newton covariance (including measured pre-association baseline uncertainty), JCGM 100/102 source-aware shared-control and stock/dilution calibration propagation, nuisance-refitted profile-likelihood and experiment-calibrated bootstrap intervals, independent-repeat sample statistics ($n$ declared biological/experimental repeats, $\text{ddof}=1$ SD, and log-Student-$t$ 95% confidence intervals), and four-chain hierarchical Bayesian joint repeat inference.
4. **Cryptographic reproducibility capsules:** Every analysis exports vector publication figures (`PDF`/`SVG`), point-by-point observation selection manifests, run-specific equations and BibTeX references, and SHA-256 digests of raw inputs and all production source modules.

**Availability and Implementation:** MIXA is implemented in Python 3.11 using NumPy, SciPy, Pandas, Matplotlib, and Streamlit under the MIT License, with both an interactive web interface (`app.py`) and a headless CLI/Python API (`mixa_cli.py`).

---

## 1. Statement of Need and Comparison with Existing Tools

Biomolecular interaction studies routinely rely on commercial vendor suites (e.g., Cytiva Biacore Insight/Evaluation, Sartorius Octet Analysis Studio) or specialized curve-fitting tools. Three recurring methodological gaps affect published SPR/BLI analyses:

1. **Unreported observation and baseline conditioning:** Trimming association or dissociation windows in commercial software often alters effective starting states or silently drops pre-association baseline estimation uncertainty from the reported rate covariance.
2. **Conflation of technical and biological replication:** Pooling multiple sensorgram concentrations or technical injections into a single global fit yields a small asymptotic standard error ($\text{SE}$) that reflects within-run residual variance rather than between-repeat experimental reproducibility. Conversely, shared negative-control subtraction and common stock dilutions induce positive covariance across traces that standard ordinary least squares ignores.
3. **Silent reporting of unidentifiable parameters:** Overparameterized models (such as two-state conformational change or bivalent avidity fitted to narrow concentration ranges) or unsaturated equilibrium isotherms frequently hit parameter bounds or suffer rank loss while still reporting nominal standard errors.

| Capability | Vendor Software (Biacore / Octet) | TraceDrawer / Scrubber | Open-Source Scripts (pyGiven / Anabel) | **MIXA (This Work)** |
| :--- | :---: | :---: | :---: | :---: |
| **Open-source code & SHA-256 run capsules** | No | No | Partial | **Yes (MIT + full ZIP capsule)** |
| **Multi-cycle & Single-Cycle Kinetics (SCK)** | Yes | Multi-cycle | Multi-cycle | **Both (analytic + LSODA ODE)** |
| **5 Mechanistic Schemes + 2-Compartment Transport** | Partial | Partial | 1:1 only | **All 5 schemes + QSS & 2-Comp MT** |
| **Measured-baseline & shared-control covariance (JCGM 102)** | No | No | No | **Yes (`mixa_uncertainty`, `mixa_input_uncertainty`)** |
| **Nuisance-refitted profile & calibrated bootstrap CIs** | No | No | No | **Yes (`mixa_inference`, `mixa_calibration`)** |
| **4-Chain Hierarchical Bayesian Joint Repeat Model** | No | No | No | **Yes (`mixa_joint` with $\hat{R}$ & ESS gates)** |
| **Strict $n$-repeat SD / log-$t$ CI vs. local SE separation** | Manual | Manual | No | **Automated & enforced by repeat gates** |
| **Steady-state flatness gate & fixed-time isotherm labeling** | Partial | No | No | **Duration-scaled flatness & saturation gates** |

---

## 2. Mathematical and Statistical Architecture

### 2.1 Physical State Evolution and Observation Window Masking
For any reaction-transport scheme with state vector $\mathbf{x}(t)$ on a sensor surface exposed to bulk analyte concentration $C$ during association $[t_{\text{on}}, t_{\text{off}}]$ and buffer during dissociation $(t_{\text{off}}, t_{\max}]$, MIXA evolves $\mathbf{x}(t)$ continuously from the physical phase transitions $(t_{\text{on}}, t_{\text{off}})$, never restarting the differential equation at trimmed fit boundaries. User-selected association and dissociation fit windows $[t_{\text{fit,on,1}}, t_{\text{fit,on,2}}] \subseteq [t_{\text{on}}, t_{\text{off}})$ and $[t_{\text{fit,off,1}}, t_{\text{fit,off,2}}] \subseteq [t_{\text{off}}, t_{\max}]$ enter strictly as a boolean observation mask $\mathcal{M}$ on the residual vector and degrees of freedom $\nu = N_{\mathcal{M}} - p_{\text{free}}$.

For **Single-Cycle Kinetics** ([Karlsson et al., 2006](https://doi.org/10.1016/j.ab.2005.09.034)) with sequential injections $(C_i, t_{\text{on},i}, t_{\text{off},i})_{i=1}^m$ without intermediate regeneration, fractional surface occupancy $x(t) \in [0, 1]$ propagates analytically across each injection and inter-injection dissociation interval:
$$x(t) = x(t_{\text{on},i}) e^{-(k_{\text{on}} C_i + k_{\text{off}})(t - t_{\text{on},i})} + \frac{k_{\text{on}} C_i}{k_{\text{on}} C_i + k_{\text{off}}}\left(1 - e^{-(k_{\text{on}} C_i + k_{\text{off}})(t - t_{\text{on},i})}\right), \quad t \in [t_{\text{on},i}, t_{\text{off},i}]$$
$$x(t) = x(t_{\text{off},i}) e^{-k_{\text{off}}(t - t_{\text{off},i})}, \quad t \in [t_{\text{off},i}, t_{\text{on},i+1}].$$

### 2.2 Multi-Tier Uncertainty Quantification
MIXA provides five distinct, explicitly labeled uncertainty layers:
1. **Baseline-propagated local covariance:** Incorporates the finite-sample estimation variance of pre-association baseline medians/means into the Gauss–Newton parameter covariance matrix $\mathbf{\Sigma}_{\hat{\theta}}$ so that short pre-injection baselines properly inflate parameter standard errors.
2. **Source-aware input & calibration propagation (JCGM 100/102):** Retains the exact linear combination weights of raw sample and negative-control traces through time interpolation and subtraction, propagating shared control noise, common stock concentration CV, and per-dilution level CV through first-order model sensitivities.
3. **Profile-likelihood & experiment-calibrated intervals:** Refits nuisance parameters along adaptive grids for $k_{\text{on}}$, $k_{\text{off}}$, and mechanism-specific $K_D$, with optional parametric bootstrap critical-value calibration at the saved experimental design.
4. **Independent-repeat statistics:** Refits each declared independent `Repeat ID` under identical windows and settings, reporting arithmetic mean, sample SD ($\text{ddof}=1$), SEM, geometric mean, and log-transformed Student-$t$ 95% confidence intervals (withholding SD/CI when $n_{\text{independent}} < 2$).
5. **Hierarchical Bayesian joint repeat inference:** Simultaneously models all raw repeat responses, between-repeat log-rate covariance, uncertain baselines, shared controls, and concentration calibration across 4 independent Markov chains, gating routine reporting on rank-normalized $\hat{R} \le 1.05$ and bulk/tail $\text{ESS} \ge 100$.

---

## 3. Verification and Benchmark Summary

All mathematical and statistical claims in MIXA are paired with automated verification scripts in `audits/` and `validation/`:
- **ODE & Matrix-Exponential Agreement (`audits/review_20261019.py`):** All five reaction networks (`langmuir`, `two_state`, `heterogeneous`, `bivalent`, `sequential`) and two-compartment transport agree with independent `DOP853` fractional-species ODE integrations and 3-species matrix exponentials to $< 6 \times 10^{-7}$ response units across 60 randomized rate sweeps.
- **Baseline & Input Uncertainty Coverage (`audits/validate_baseline_uncertainty.py`, `audits/validate_input_uncertainty.py`):** Repairing measured-baseline covariance restores nominal 95% interval coverage from 65%–79% (unpropagated baseline) to 93.5%–95.5% under finite pre-association baselines.
- **Experiment-Calibrated $K_D$ Intervals (`audits/validate_frontier.py`):** Across 300 simulated multi-repeat experiments spanning three experimental designs, calibrated $K_D$ intervals achieved 93%, 94%, and 94% empirical coverage for a nominal 95% target (300/300 completion).
- **Automated Safeguard Gates (`tests/`):** 266 unit and full-UI `AppTest` regression tests verify that unidentifiable single-concentration fits withhold rate precision, unsaturated or non-steady-state isotherms are flagged as fixed-time isotherms rather than equilibrium $K_D$, and any change to raw data, column assignments, or fit windows invalidates stale results and exports.

---

## 4. Reproducible Execution

### Interactive Web Application
```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m streamlit run app.py
```

### Headless Command-Line & Scriptable Batch Execution
```bash
# Run on the bundled 3-repeat raw benchmark dataset (with matched negative controls)
.venv/bin/python mixa_cli.py data/raw_benchmark/*.csv --model langmuir --output preview/cli_benchmark.json

# Run the complete verification and test suite
.venv/bin/python -m pytest -q
.venv/bin/python audits/review_20261019.py
.venv/bin/python audits/scientific_audit.py
```

---

## References

- Hurvich, C. M., & Tsai, C.-L. (1989). Regression and time series model selection in small samples. *Biometrika*, 76(2), 297–307. https://doi.org/10.1093/biomet/76.2.297
- JCGM 100:2008. *Evaluation of measurement data — Guide to the expression of uncertainty in measurement*. https://doi.org/10.59161/JCGM100-2008E
- JCGM 102:2011. *Evaluation of measurement data — Supplement 2 to the "Guide to the expression of uncertainty in measurement" — Extension to any number of output quantities*. https://doi.org/10.59161/JCGM102-2011
- Karlsson, R., Katsamba, P. S., Nordin, H., Pol, E., & Myszka, D. G. (2006). Analyzing a kinetic titration series using affinity biosensors. *Analytical Biochemistry*, 349(1), 136–147. https://doi.org/10.1016/j.ab.2005.09.034
- Myszka, D. G., He, X., Dembo, M., Morton, T. A., & Goldstein, B. (1998). Extending the range of rate constants available from BIACORE: Interpreting mass transport-influenced binding data. *Biophysical Journal*, 75(2), 583–594. https://doi.org/10.1016/S0006-3495(98)77549-6
- Nguyen, H. H., Park, J., Kang, S., & Kim, M. (2023). Bivalent analyte kinetic analysis and identifiability in surface biosensors. *Analytical Biochemistry*, 662, 115263. https://doi.org/10.1016/j.ab.2023.115263
- O'Shannessy, D. J., Brigham-Burke, M., Soneson, K. K., Hensley, P., & Brooks, I. (1993). Determination of rate and equilibrium binding constants for macromolecular interactions using surface plasmon resonance: use of nonlinear least squares analysis. *Analytical Biochemistry*, 212(2), 457–468. https://doi.org/10.1006/abio.1993.1355
- O'Shannessy, D. J., & Winzor, D. J. (1996). Interpretation of deviations from pseudo-first-order kinetic behavior in the characterization of ligand binding by biosensor technology. *Analytical Biochemistry*, 236(2), 275–283. https://doi.org/10.1006/abio.1996.0167
- Raue, A., Kreutz, C., Maiwald, T., Bachmann, J., Schilling, M., Klingmüller, U., & Timmer, J. (2009). Structural and practical identifiability analysis of partially observed dynamical models by exploiting the profile likelihood. *Bioinformatics*, 25(15), 1923–1929. https://doi.org/10.1093/bioinformatics/btp358
- Schuck, P., & Minton, A. P. (1996). Analysis of mass transport-limited binding kinetics in evanescent wave biosensors. *Analytical Biochemistry*, 240(2), 262–272. https://doi.org/10.1006/abio.1996.0356
- Svitel, J., Balbo, A., Mariuzza, R. A., Gonzales, N. R., & Schuck, P. (2003). Combined affinity and rate constant distributions of ligand populations from experimental surface binding kinetics and equilibria. *Biophysical Journal*, 84(6), 4062–4077. https://doi.org/10.1016/S0006-3495(03)75132-7
