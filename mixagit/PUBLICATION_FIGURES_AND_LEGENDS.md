# Publication Panels (No Titles for Adobe Illustrator), Fit & Error Tables, Figure Legends, and GraphPad Prism Data Outputs

All figure panels in [`publication_outputs/`](publication_outputs/) have **all titles removed** and are saved **as separate individual files** (`PDF`, `SVG` with editable TrueType vector text `pdf.fonttype = 42`, and `600 DPI PNG`) so they can be arranged and labeled directly in Adobe Illustrator. All underlying data, replicate columns, fitted curves, and error metrics ($\text{Mean}$, $\text{SD}$, $\text{SEM}$, $95\%\text{ CI}$) are exported in **GraphPad Prism-ready XY CSV tables** both in [`publication_outputs/`](publication_outputs/) and via one-click download buttons in the MIXA app (**02 / Kinetic Analysis**, **06 / Publication Report**, and **07 / Solution Competition**).

---

## 1. Direct Binding Kinetics Panel (`MCAM-Fc + Laminin-411`, No Title)

### Illustrator-Ready Panel Files (`publication_outputs/`)
- **Vector PDF (Editable text in Illustrator)**: [`publication_outputs/kinetics_panel_notitle.pdf`](publication_outputs/kinetics_panel_notitle.pdf)
- **Vector SVG (Editable text in Illustrator)**: [`publication_outputs/kinetics_panel_notitle.svg`](publication_outputs/kinetics_panel_notitle.svg)
- **High-Resolution PNG (600 DPI)**: [`publication_outputs/kinetics_panel_notitle.png`](publication_outputs/kinetics_panel_notitle.png)

### GraphPad Prism XY Data + Fit CSV & Parameter/Error CSV Files
- **Prism XY Sensorgram Data + Replicates + Mean/SD + Two-Site Fit (`1200 timepoints × 5 concentrations`)**: [`publication_outputs/prism_mcam_lm411_kinetics_data_replicates_fit_sd.csv`](publication_outputs/prism_mcam_lm411_kinetics_data_replicates_fit_sd.csv)
  - Contains `Time_s` (`0–240 s`) followed by `{Conc}_Rep1`, `{Conc}_Rep2`, `{Conc}_Rep3`, `{Conc}_Mean`, `{Conc}_SD`, `{Conc}_SEM`, `{Conc}_N`, `{Conc}_TwoSite_Fit`, and `{Conc}_Residual_Mean` for `125, 62.5, 31.25, 15.625, 7.813 nM`.
- **Kinetics Fit Parameters, $K_D$s & Errors Summary Table (`.csv`)**: [`publication_outputs/mcam_lm411_kinetics_parameters_and_errors.csv`](publication_outputs/mcam_lm411_kinetics_parameters_and_errors.csv)

### Direct Binding Kinetics Fit & Error Table ($N = 3$ Independent Replicates)

| Complex State | Parameter | Unit | Mean ± SD | SEM | Rep 1 | Rep 2 | Rep 3 | Global Fit Quality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Complex (Both Sites Bound)** | **$K_{D,\text{full}}$** | $\text{nM}$ | **$4.63 \pm 0.48$** | $0.28$ | $4.09$ | $4.81$ | $5.00$ | $R^2 = 0.989$, $\text{RMSE} = 0.0128\text{ nm}$ |
| **Full Complex (Both Sites Bound)** | $k_{\text{on},\text{full}}$ | $\text{M}^{-1}\text{s}^{-1}$ | $(5.44 \pm 0.25) \times 10^5$ | $1.45 \times 10^4$ | $5.24 \times 10^5$ | $5.37 \times 10^5$ | $5.72 \times 10^5$ | — |
| **Full Complex (Both Sites Bound)** | $k_{\text{off},\text{full}}$ | $\text{s}^{-1}$ | $(2.53 \pm 0.36) \times 10^{-3}$ | $2.09 \times 10^{-4}$ | $2.14 \times 10^{-3}$ | $2.58 \times 10^{-3}$ | $2.86 \times 10^{-3}$ | — |
| **Intermediate (Partial 1-Site Complex)** | **$K_{D,\text{int}}$** | $\text{nM}$ | **$34.39 \pm 2.34$** | $1.35$ | $32.16$ | $34.17$ | $36.82$ | $R^2 = 0.989$, $\text{RMSE} = 0.0128\text{ nm}$ |
| **Intermediate (Partial 1-Site Complex)** | $k_{\text{on},\text{int}}$ | $\text{M}^{-1}\text{s}^{-1}$ | $(1.13 \pm 0.05) \times 10^6$ | $2.63 \times 10^4$ | $1.08 \times 10^6$ | $1.15 \times 10^6$ | $1.16 \times 10^6$ | — |
| **Intermediate (Partial 1-Site Complex)** | $k_{\text{off},\text{int}}$ | $\text{s}^{-1}$ | $(3.88 \pm 0.41) \times 10^{-2}$ | $2.36 \times 10^{-3}$ | $3.46 \times 10^{-2}$ | $3.92 \times 10^{-2}$ | $4.27 \times 10^{-2}$ | — |

### Figure Legend — Direct Binding Kinetics (`MCAM-Fc + Laminin-411`)
> **Figure Legend:** Bio-layer interferometry (BLI) sensorgrams of soluble Laminin-411 ($7.8, 15.6, 31.25, 62.5, 125\text{ nM}$) binding to immobilized MCAM-Fc across $N = 3$ independent experimental replicates. **Solid colored curves** represent the mean BLI response (nm) at each concentration, and **faded/shaded colored background bands** represent $\pm 1\text{ SD}$ experimental error across the $N = 3$ replicates. **Black dashed curves** show the global two-site kinetic model fit ($R^2 = 0.989$). The **vertical dotted line at $120\text{ s}$** marks the transition from association ($0\text{–}120\text{ s}$) to buffer dissociation ($120\text{–}240\text{ s}$). Across $N = 3$ independent replicates, the **Full Complex** (both binding sites engaged) yields $K_{D,\text{full}} = 4.6 \pm 0.5\text{ nM}$, and the **Intermediate (Partial) Complex** (initial single-site contact) yields $K_{D,\text{int}} = 34.4 \pm 2.3\text{ nM}$ ($\text{Mean} \pm \text{SD}$).

---

## 2. Solution Inhibition Separate Panels (`20 nM Laminin-411 + α6β1 Integrin`, No Titles)

### Panel A (Saved Separately, No Title): Competition BLI Sensorgrams
- **Vector PDF (Editable in Illustrator)**: [`publication_outputs/competition_panel_A_sensorgrams_notitle.pdf`](publication_outputs/competition_panel_A_sensorgrams_notitle.pdf)
- **Vector SVG (Editable in Illustrator)**: [`publication_outputs/competition_panel_A_sensorgrams_notitle.svg`](publication_outputs/competition_panel_A_sensorgrams_notitle.svg)
- **High-Resolution PNG (600 DPI)**: [`publication_outputs/competition_panel_A_sensorgrams_notitle.png`](publication_outputs/competition_panel_A_sensorgrams_notitle.png)

### Panel B (Saved Separately, No Title): Solution Inhibition Dose-Response Curve
- **Vector PDF (Editable in Illustrator)**: [`publication_outputs/competition_panel_B_inhibition_curve_notitle.pdf`](publication_outputs/competition_panel_B_inhibition_curve_notitle.pdf)
- **Vector SVG (Editable in Illustrator)**: [`publication_outputs/competition_panel_B_inhibition_curve_notitle.svg`](publication_outputs/competition_panel_B_inhibition_curve_notitle.svg)
- **High-Resolution PNG (600 DPI)**: [`publication_outputs/competition_panel_B_inhibition_curve_notitle.png`](publication_outputs/competition_panel_B_inhibition_curve_notitle.png)

### GraphPad Prism XY Data + Smooth Fit + Parameter/Error CSV Files
- **Panel B Dose-Response Data + Replicates + Mean/SD + Fit (`.csv`)**: [`publication_outputs/prism_competition_panelB_inhibition_data.csv`](publication_outputs/prism_competition_panelB_inhibition_data.csv)
- **Panel B Smooth Model Fit Curve (`400 points` for Prism curve overlay, `.csv`)**: [`publication_outputs/prism_competition_panelB_smooth_fit_curve.csv`](publication_outputs/prism_competition_panelB_smooth_fit_curve.csv)
- **Panel A Competition Sensorgrams XY Replicates + Mean/SD (`.csv`)**: [`publication_outputs/prism_competition_panelA_sensorgrams.csv`](publication_outputs/prism_competition_panelA_sensorgrams.csv)
- **Competition Fit Parameters, Relative Affinities & Errors Table (`.csv`)**: [`publication_outputs/competition_parameters_and_errors.csv`](publication_outputs/competition_parameters_and_errors.csv)

### Solution Inhibition Data & 1:1 Mass-Action Fit Table (Panel B — Normalized % of Control & Raw Response)

| $[\alpha_6\beta_1\text{ Integrin}]$ ($\text{nM}$) | Molar Ratio ($[\text{I}]/[\text{LM411}]$) | Rep 1 (% Control) | Rep 2 (% Control) | Rep 3 (% Control) | Data Mean ± SD (% Control) | SEM (% Control) | 1:1 Mass-Action Fit ($K_D = 0.73\text{ nM}$) | Raw BLI Mean ± SD ($\text{nm}$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$0.00$** | $0.0000$ | $100.00$ | $100.00$ | $100.00$ | **$100.00 \pm 0.00$** | $0.00$ | $100.00$ | $0.3127 \pm 0.0142$ |
| **$1.25$** | $0.0625$ | $101.13$ | $98.50$ | $100.09$ | **$99.91 \pm 1.33$** | $0.77$ | $93.98$ | $0.3123 \pm 0.0117$ |
| **$2.50$** | $0.1250$ | $101.96$ | $99.72$ | $102.95$ | **$101.54 \pm 1.65$** | $0.95$ | $87.99$ | $0.3176 \pm 0.0170$ |
| **$5.00$** | $0.2500$ | $86.29$ | $82.81$ | $86.89$ | **$85.33 \pm 2.20$** | $1.27$ | $76.12$ | $0.2669 \pm 0.0156$ |
| **$10.00$** | $0.5000$ | $65.43$ | $58.70$ | $62.53$ | **$62.22 \pm 3.38$** | $1.95$ | $53.16$ | $0.1945 \pm 0.0114$ |
| **$20.00$** | $1.0000$ | $18.99$ | $15.64$ | $16.50$ | **$17.05 \pm 1.74$** | $1.01$ | **$17.22$** | $0.0532 \pm 0.0044$ |
| **$40.00$** | $2.0000$ | $3.12$ | $0.30$ | $1.16$ | **$1.53 \pm 1.44$** | $0.83$ | **$3.35$** | $0.0047 \pm 0.0044$ |

### Solution Competition Fit Parameters, Relative Affinities & Errors Table ($N = 3$ Independent Replicates)

| Parameter | Symbol | Unit | Mean ± SD | SEM | Rep 1 | Rep 2 | Rep 3 | Global $R^2$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Complex Affinity ($\alpha_6\beta_1\text{ Integrin} + \text{LM411}$, 1:1 Mass Action)** | **$K_D(\alpha_6\beta_1)$** | $\text{nM}$ | **$0.73 \pm 0.22$** | $0.13$ | $0.98$ | $0.54$ | $0.66$ | $0.982$ |
| **Full Complex Affinity (Coupled to 1-Site Surface Saturation $K_{\text{surf}} = 34.4\text{ nM}$)** | **$K_D(\alpha_6\beta_1)_{\text{surf-coupled}}$** | $\text{nM}$ | **$0.26 \pm 0.08$** | $0.05$ | $0.35$ | $0.21$ | $0.24$ | $0.990$ |
| **Observed Inhibition Midpoint (at $20\text{ nM}$ LM411)** | **$\text{IC}_{50}$** | $\text{nM}$ | **$11.53 \pm 0.54$** | $0.31$ | $12.06$ | $10.98$ | $11.55$ | $0.991$ |
| **Stoichiometric Depletion Floor ($\frac{1}{2}[\text{LM411}]_{\text{tot}}$)** | **$\frac{1}{2}[\text{LM411}]_{\text{tot}}$** | $\text{nM}$ | **$10.00 \pm 0.00$** | $0.00$ | $10.00$ | $10.00$ | $10.00$ | — |
| **Midpoint Molar Ratio ($[\text{I}]_{50} / [\text{LM411}]$)** | $\text{Ratio}_{50}$ | $\text{mol/mol}$ | $0.58 \pm 0.03$ | $0.02$ | $0.60$ | $0.55$ | $0.58$ | $0.991$ |
| **Full Complex Affinity ($\text{MCAM-Fc} + \text{LM411}$)** | **$K_{D,\text{full}}(\text{MCAM})$** | $\text{nM}$ | **$4.63 \pm 0.48$** | $0.28$ | $4.09$ | $4.81$ | $5.00$ | $0.989$ |
| **Relative Full-Complex Affinity Fold ($\text{MCAM} / \alpha_6\beta_1$)** | **$K_{D,\text{full}}(\text{MCAM}) / K_D(\alpha_6\beta_1)$** | $\text{fold}$ | **$6.36 \pm 2.68\times$** | $1.55\times$ | $4.19\times$ | $9.55\times$ | $6.96\times$ | — |
| **Observed Inhibition at $40\text{ nM}$ ($2\times$ Ratio)** | $\text{Inhibition}_{40\text{ nM}}$ | $\%$ | **$98.5 \pm 1.4\%$** | $0.8\%$ | $96.9\%$ | $99.7\%$ | $98.8\%$ | $0.982$ |

### Figure Legend — Solution Inhibition of MCAM-Fc + Laminin-411 by $\alpha_6\beta_1$ Integrin
> **Figure Legend:**
> **(A) BLI Sensorgrams:** Bio-layer interferometry (BLI) association ($0\text{–}120\text{ s}$) and buffer dissociation ($120\text{–}240\text{ s}$, marked by the vertical dotted line at $120\text{ s}$) of constant soluble Laminin-411 ($[\text{LM411}] = 20\text{ nM}$) binding to immobilized MCAM-Fc in the presence of increasing concentrations of soluble competitor $\alpha_6\beta_1$ integrin ($0, 1.25, 2.5, 5, 10, 20, 40\text{ nM}$; $N = 3$ independent experimental replicates). **Solid colored lines** show the mean BLI response (nm) at each competitor concentration, and **faded/shaded colored background bands** represent $\pm 1\text{ SD}$ experimental error across the $N = 3$ replicates.
> **(B) Solution Inhibition Curve:** Normalized MCAM-Fc binding response (% of $0\text{ nM}$ uninhibited control) plotted against soluble $\alpha_6\beta_1$ integrin concentration (nM). **Black circles and error bars** represent $\text{Mean} \pm \text{SD}$ across $N = 3$ independent replicates; the **solid teal curve** shows the 1:1 quadratic mass-action solution competition fit ($R^2 = 0.982$), and the **dotted crosshairs** mark the $50\%$ inhibition midpoint ($\text{IC}_{50} = 11.5 \pm 0.5\text{ nM}$). Because $[\text{LM411}]_{\text{tot}} = 20\text{ nM}$, sequestering $50\%$ of the soluble Laminin-411 consumes $\frac{1}{2}[\text{LM411}]_{\text{tot}} = 10.0\text{ nM}$ of competitor ($\text{IC}_{50} = \frac{1}{2}[\text{LM411}]_{\text{tot}} + K_D$), yielding a true 1:1 solution affinity of $K_D(\alpha_6\beta_1) = 0.73 \pm 0.22\text{ nM}$ ($\sim 6.4\times$ tighter than the MCAM full-complex affinity $K_{D,\text{full}}(\text{MCAM}) = 4.63 \pm 0.48\text{ nM}$).

---

## 3. Final Conclusion Schematic: Integrative Mechanistic Model of Laminin-411 Recognition by MCAM and $\alpha_6\beta_1$ Integrin

### Combined & Individual Title-Free Panel Files (`publication_outputs/`)
- **Combined 2-Panel Schematic (With Panel Headers)**:
  - [`publication_outputs/conclusion_mechanistic_model_full.pdf`](publication_outputs/conclusion_mechanistic_model_full.pdf) | [`publication_outputs/conclusion_mechanistic_model_full.svg`](publication_outputs/conclusion_mechanistic_model_full.svg) | [`publication_outputs/conclusion_mechanistic_model_full.png`](publication_outputs/conclusion_mechanistic_model_full.png)
- **Combined 2-Panel Schematic (No Titles)**:
  - [`publication_outputs/conclusion_mechanistic_model_notitle.pdf`](publication_outputs/conclusion_mechanistic_model_notitle.pdf) | [`publication_outputs/conclusion_mechanistic_model_notitle.svg`](publication_outputs/conclusion_mechanistic_model_notitle.svg) | [`publication_outputs/conclusion_mechanistic_model_notitle.png`](publication_outputs/conclusion_mechanistic_model_notitle.png)
- **Separate Individual Panels Without Titles (For Adobe Illustrator)**:
  - **Panel A Only (2D Cell–Matrix Presentation: Membrane MCAM Cannot Block $\alpha_6\beta_1$ Integrin–Driven Migration)**: [`publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.pdf`](publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.pdf) | [`publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.svg`](publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.svg) | [`publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.png`](publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.png)
  - **Panel B Only (2D Cell–Matrix + High 3D Soluble MCAM `sMCAM`: Global LG1–LG2 Saturation Abolishes Migration)**: [`publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.pdf`](publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.pdf) | [`publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.svg`](publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.svg) | [`publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.png`](publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.png)

### Figure Legend — Model of MCAM vs. $\alpha_6\beta_1$ Integrin Competition on Laminin-411
> **Figure Legend:**
> **(A) Membrane MCAM Cannot Block $\alpha_6\beta_1$ Integrin–Driven Migration:** Both MCAM (via domains $\text{V2–C1}$) and $\alpha_6\beta_1$ integrin recognize overlapping binding sites on the $\text{LG1–LG2}$ domains of Laminin-411 ($\text{LG3}$ is uninvolved). When co-expressed on the cell surface, both receptors and matrix Laminin-411 are spatially restricted in 2D, and $\alpha_6\beta_1$ integrin binds Laminin-411 with $>6\text{-fold}$ higher affinity than MCAM. Consequently, membrane-tethered MCAM cannot outcompete or globally deplete Laminin-411, allowing $\alpha_6\beta_1$ integrin engagement and cell migration to proceed.
> **(B) High Soluble MCAM (`sMCAM`) Inhibits Cell Migration:** When supplied at high concentration in 3D solution, freely diffusing soluble MCAM ($\text{sMCAM}$) overcomes both 2D spatial restriction and its lower affinity by globally saturating $\text{LG1–LG2}$ across the Laminin-411 matrix, sterically blocking $\alpha_6\beta_1$ integrin binding and inhibiting cell migration.

---

## 4. Direct Binding Kinetics Panel for Isolated `LamA4G123` (`MCAM-Fc + α4 LG1–LG3` Without $\beta\gamma$ Chains, $15.63\text{–}500\text{ nM}$, No Title)

### Illustrator-Ready Panel Files (`publication_outputs/`)
- **Two-Site Fit Panel (Matches Full LM-411 Trimer Style)**:
  - [`publication_outputs/lama4g123_kinetics_panel_notitle.pdf`](publication_outputs/lama4g123_kinetics_panel_notitle.pdf) | [`publication_outputs/lama4g123_kinetics_panel_notitle.svg`](publication_outputs/lama4g123_kinetics_panel_notitle.svg) | [`publication_outputs/lama4g123_kinetics_panel_notitle.png`](publication_outputs/lama4g123_kinetics_panel_notitle.png)
- **Single-Site 1:1 Fit Panel (Matches Full LM-411 Trimer Style)**:
  - [`publication_outputs/lama4g123_kinetics_panel_1to1_notitle.pdf`](publication_outputs/lama4g123_kinetics_panel_1to1_notitle.pdf) | [`publication_outputs/lama4g123_kinetics_panel_1to1_notitle.svg`](publication_outputs/lama4g123_kinetics_panel_1to1_notitle.svg) | [`publication_outputs/lama4g123_kinetics_panel_1to1_notitle.png`](publication_outputs/lama4g123_kinetics_panel_1to1_notitle.png)
- **Prism XY Sensorgram Data + Replicates + Mean/SD + Fit (`15.63–500 nM`, `7.8 nM` trace removed)**: [`publication_outputs/prism_mcam_lama4g123_kinetics_data_replicates_fit_sd.csv`](publication_outputs/prism_mcam_lama4g123_kinetics_data_replicates_fit_sd.csv)

---

## 5. Complete Supplementary Tables (Global + Per-Curve Fitted & Derived Parameters for Each Dataset)

1. **Supplementary Table S1 (`MCAM-Fc + Intact Laminin-411` [$\alpha_4\beta_1\gamma_1$ Trimer] Direct Binding Kinetics, $7.81\text{–}125\text{ nM}$, $N = 3$ Replicates)**:
   - **Table S1A (Global Fitted & Derived Kinetic/Thermodynamic Parameters)**: [`publication_outputs/supp_table_S1A_mcam_lm411_global_parameters.csv`](publication_outputs/supp_table_S1A_mcam_lm411_global_parameters.csv)
   - **Table S1B (Per-Curve Fitted & Derived Parameters for `125, 62.5, 31.25, 15.63, 7.81 nM`)**: [`publication_outputs/supp_table_S1B_mcam_lm411_per_curve_parameters.csv`](publication_outputs/supp_table_S1B_mcam_lm411_per_curve_parameters.csv)
2. **Supplementary Table S2 (`MCAM-Fc + Isolated LamA4G123` [$\alpha_4$ `LG1–LG3` Without $\beta\gamma$ Chains] Direct Binding Kinetics, $15.63\text{–}500\text{ nM}$, $N = 3$ Replicates)**:
   - **Table S2A (Global Fitted & Derived Kinetic/Thermodynamic Parameters)**: [`publication_outputs/supp_table_S2A_mcam_lama4g123_global_parameters.csv`](publication_outputs/supp_table_S2A_mcam_lama4g123_global_parameters.csv)
   - **Table S2B (Per-Curve Fitted & Derived Parameters for `500, 250, 125, 62.5, 31.25, 15.63 nM`)**: [`publication_outputs/supp_table_S2B_mcam_lama4g123_per_curve_parameters.csv`](publication_outputs/supp_table_S2B_mcam_lama4g123_per_curve_parameters.csv)
3. **Supplementary Table S3 (`α6β1 Integrin vs. MCAM-Fc Solution Competition / Inhibition` on $20\text{ nM}$ Intact Laminin-411, $0\text{–}40\text{ nM}$, $N = 3$ Replicates)**:
   - **Table S3A (Global 1:1 Mass-Action Competition Parameters, $\text{IC}_{50}$, & Relative Affinity Ratios)**: [`publication_outputs/supp_table_S3A_itga6b1_competition_global_parameters.csv`](publication_outputs/supp_table_S3A_itga6b1_competition_global_parameters.csv)
   - **Table S3B (Per-Concentration Dose-Response, Derived Free $[\text{LM411}]_{\text{free}}$, & Fitted Responses)**: [`publication_outputs/supp_table_S3B_itga6b1_competition_per_curve_parameters.csv`](publication_outputs/supp_table_S3B_itga6b1_competition_per_curve_parameters.csv)

