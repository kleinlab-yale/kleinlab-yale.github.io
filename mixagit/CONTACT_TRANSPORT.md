# Two-contact binding with transport

The **Two-contact binding with transport — rapid-capture limit** option models
one analyte molecule making two contacts within one complex. Both bound states
contribute the same analyte mass. Transport includes depletion and local
rebinding. Initial capture is assumed to equilibrate rapidly; separate initial
association and dissociation rates are not estimated.

## Use the MCAM examples

1. In **Data Input**, load MCAM + LM411, MCAM + LM421 or MCAM + LamA4G123. The same
   choices are available as quick-switch buttons in **Kinetic Analysis**.
2. Open **Kinetic Analysis**. The preset selects the contact/transport model,
   the known experimental phase times, and five parameters **per file**. Each
   file contains one repeat's concentration series.
3. Inspect the five parameter controls. **Rmax is common across concentrations
   within that file.** Different repeats can have different capacities. The
   preset uses five starts, 500 evaluations per start, local refinement and
   seed 20261102. The displayed controls govern the calculation.
4. Run the advanced global fit. The three series have 15 estimated parameters:
   12 nonlinear parameters and three profiled capacities. Profiling a capacity
   does not remove it from the parameter count.
5. Download the analysis package from **Export**. It records the selected data,
   bounds, phase times, settings, fitted parameters and model-specific methods.

A bundled saved fit is displayed only when its observations and masks match
the loaded experiment. Changing data or windows invalidates it. Changing solver
or model controls leaves the previous run labeled as a saved run until refitted.

## Equations and interpretation

With initially contacted fraction `x`, doubly contacted fraction `y`, free
fraction `u=1-x-y`, bulk concentration `C` in M, and time in seconds:

```text
capture = (C - K1*x/u)/h
closure = kc*x - ko*y
dx/dt = capture - closure
dy/dt = closure
response = Rmax*(x+y)
KD_overall = K1/(1+kc/ko)
```

`K1` is in M; `kc` and `ko` are in s^-1; transport resistance `h` is in M·s.
Association begins with `x=y=0`. At the buffer switch `C` becomes zero and the
bound states carry forward. Trimming observations does not reset those states.
This model includes transport internally, so a second transport option is disabled.

The current LM411 example gives approximately **12.17 ± 0.48 nM** overall
affinity, mean ± SD across the three existing repeat fits. This is conditional
on the model and concentration selection. It does not assign an individual KD
to either structural domain, establish contact order, or turn `ko` into a
single macroscopic complex off-rate.

For the reviewed selection, pooled fitted/prediction RMSE is **0.01545/0.02466 nm**
for LM411 and **0.008022/0.01482 nm** for isolated α4 LG1–3. Prediction means
omitting an entire concentration and predicting it with capacities fitted only
to the remaining data. This is internal comparison on existing measurements.
The LG1–3 example uses a **1.35 nm capacity ceiling**, active in two repeats.
Its affinity estimates remain conditional on that ceiling. Both constructs
retain the structural contact regions; LG1–3 is not a single-contact deletion.

## Reproduce the checks

```sh
python -m pytest tests/test_contact_transport.py tests/test_contact_transport_workflow.py
python audits/validate_contact_transport.py
```

The audit verifies all six source CSV hashes and exactly reproduces the reviewed
selections and parameter sharing. It also compares independent LSODA/Radau
integrations and performs 33 omitted-concentration folds. Reference inputs and
results are in `validation/contact_transport/`.

The LM411 example uses 7.813–125 nM. Its 250 nM traces remain available in the
source files and can be included in a separately labeled range-sensitivity run.
For other datasets, generic capacity bounds follow the response scale rather
than inheriting the MCAM example's nm-scale ceiling.

The solution-competition module is a separate analysis. Its proportional
free-analyte, surface-saturation and empirical capture-sensitivity assumptions
are explicit controls. A Hill exponent is not a count of structural contacts;
the empirical inhibition midpoint is distinct from a mass-action KD.

## Added LM421 series in version 0.5.12

The complete study and a dedicated LM421 button include the primary a/b/c
concentration series from `20260407_protA_MCAMecdFc-tE421vsCtrl.zip`. The
measured Data1 column is used; Fit1 and nested Fit/Fit2-1 exports are not
additional measurements. Empty reference exports are not subtracted again.
The primary range, 7.813–125 nM, follows the original inclusion flags and
matches the LM411 comparison. The 250 nM trace remains selectable.

With one fitted Rmax per series shared across concentrations, the LM421
overall KD is **13.90 ± 1.71 nM** (mean ± sample SD across three series),
compared with **12.17 ± 0.48 nM** for LM411. Effective initial-contact KD is
**31.31 ± 4.84 nM**. These are effective model parameters, not separately
measured LG1/LG2 affinities. Two contacts plus transport lowers pooled fit
RMSE by 39% and omitted-concentration prediction RMSE by 31% versus 1:1 plus
transport, with five parameters per series in each model. All 60 prediction
folds use training curves only. Including 250 nM gives **13.75 ± 1.47 nM**.
The response shading is measured mean ± sample SD, distinct from parameter
uncertainty. The saved fit is checked against the current observations
before it is displayed.
