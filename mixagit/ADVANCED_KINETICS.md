# Advanced Kinetics: Mechanistic Preview

Version `0.5.4-preview`, authorised for hosted testing on 2026-10-16 in the
existing Space. No paid hardware or billing change is part of this release.
All models are accessed from Kinetic Analysis's single Binding model dropdown,
not a separate Advanced Kinetics sidebar entry. Physical transport and reversible
nonspecific binding controls are displayed alongside the model selection.
For 1:1/two-state fitting, the parameter-control checkbox opens the linked/fixed/
bounded fitting controls in place; complex mechanisms open those controls
automatically. Standard fitting, kobs, equilibrium, diagnostic and publication
pages remain available; their parameter plots have not been removed.

## Assay Orientation

The model must describe the actual soluble and immobilized species, not a
generic "2:1" label. The workspace records technique, immobilized partner,
soluble partner, soluble valency and target process. Unspecified is allowed;
MIXA does not invent the instrument or orientation.

| Experiment | Candidate interpretation | Important limit |
| --- | --- | --- |
| Immobilized ligand, soluble receptor | Sequential capture of two receptors can add a second receptor's response | Does not establish a receptor-receptor interface or exclude pre-existing dimers |
| Immobilized receptor, soluble ligand | 1:1 or a specified stabilization/two-state candidate | Association of receptors already on the surface need not add mass; a two-state fit does not prove dimerization |
| Immobilized receptor, soluble bivalent antibody | Bivalent-analyte surface avidity | Second-arm capture depends on surface availability/density; not a single intrinsic avidity KD |
| Immobilized bivalent antibody, soluble monomeric receptor | Equivalent independent arms can behave as 1:1 with larger capacity | This is not automatically a bivalent soluble-analyte experiment |

Ligand-induced receptor assembly may require an explicit reaction network
containing soluble dimers, surface dimers, ligand-bridged complexes or other
species. That general assembly engine is not implemented here. Models do not
resolve whether ligand is part of the dimer interface without other evidence.

## Controls And Models

Implemented locally:

- Simultaneous global fitting across all selected curves, with Global,
  Per repeat, Per file, Per curve or explicitly assigned Per surface linkage.
- Initial values, fixed values, bounds and group-specific overrides. Positive
  parameters use logarithmic coordinates. Fixed assumptions receive no
  estimated error and cannot create artificial independent-repeat SD.
- 1:1, reversible two-state, two independent surface populations,
  bivalent-analyte avidity and sequential two-analyte binding.
- Quasi-steady 1:1 mass transport and a coupled two-compartment surface
  concentration model. These are distinct from the old empirical delivery lag.
- An optional reversible residual binding population, conditional on controls
  or independent constraints before interpreting it as nonspecific binding.
- A common Background Corrections group for all kinetic models: baseline
  normalization, linear drift, empirical linear nonspecific background and
  reversible nonspecific binding. Drift and both nonspecific terms default off.
  Reversible binding is unavailable with the empirical delivery-lag model.
  Existing advanced drift/baseline selections migrate to these shared controls.
- Optional measurement offset, linear drift and concentration-scaled injection
  bulk response. These are separate from binding and fluid consumption.
- Unweighted/relative-noise-scaled least squares, or GLS with a prespecified
  fixed continuous-time OU noise correlation. Soft-L1 is a sensitivity fit;
  Gaussian SE, AIC and RSS-profile intervals are withheld for it.
- Multistart records, runtime/evaluation limits, boundary detection,
  scaled-Jacobian rank/conditioning, covariance correlation, selected raw and
  whitened residuals, descriptive Q-Q plots and nuisance-refitted profile grids.
- Independent-repeat refits, sample SD, SEM, geometric-mean log-t intervals,
  parameter dot/SD plots and numerical mean +/- SD results. Technical files and
  concentrations do not inflate n. Local rate mixtures are not averaged into
  an invented single rate. Heterogeneous populations are ordered by fitted KD,
  not assigned biological identities.
- PNG/PDF/SVG curves, independent-repeat parameter figures and diagnostics;
  measured points, selection masks, model components, CSV/TXT statistics,
  recipes, original inputs, preprocessing records and code hashes in one ZIP.
- Conditional capacity/stoichiometry calculation requiring loading, molecular
  weights, response-per-mass calibration and independently known active fraction
  for a stoichiometry estimate. Otherwise only apparent capacity is returned.

The development baseline is the class of controls and mechanisms described in
the official [Octet SPR Analysis User Guide](https://www.sartorius.com/download/1176988/octet-spr-analysis-user-guide-en-sartorius-pdf-data.pdf):
linked/fixed parameters, bounds, mass transport, two-state and bivalent analyte.
This is a 2022 SPR guide, not a claim about every current BLI product. The
official [SAX2 BLI technical note](https://www.sartorius.com/resource/blob/1350700/91ce4cb3d78b2c2a326677efe6402b26/streptavidin-sax2-biosensors-octet-technical-note-en-l-sarto-1--data.pdf)
also describes heterogeneous-ligand/bivalent fits and unlinked capacities for
different biosensors. MIXA now offers explicit surface groups and defaults to
per-curve capacities when BLI is selected. No numerical parity with proprietary
software, vendor certification or superiority is asserted.

Not implemented or not validated: arbitrary receptor-assembly networks,
general multivalent oligomers, instrument-native raw acquisition formats,
single-cycle/titration concentration histories, automatic noise-model
estimation, transport calibration from instrument geometry, joint propagation
of control/concentration errors, advanced-model hierarchical/random-effects
inference, calibrated complex-model bootstrap coverage, automatic mechanistic
model selection, or real-instrument/vendor benchmark parity.

## Equations And Units

Time is in seconds; bulk/surface analyte concentrations are mol/L. Response
states use the analysis input units. `kon` has units M^-1 s^-1, unimolecular
rates have s^-1, and capacities have response units. Predictions always evolve
from the physical injection start through the physical dissociation transition,
even if observations at those times are excluded. Only selected observations
enter the optimizer, likelihood count and residual degrees of freedom.

For sequential two-analyte binding, let x and y be surface-ligand occupancy
states in single-analyte response equivalents:

```text
free = Rmax - x - y
capture = kon*C*free - koff*x
second = kon2*C*x - koff2*y
dx/dt = capture - second; dy/dt = second
response = x + 2*y
KD1 = koff/kon; KD2 = koff2/kon2
```

For bivalent analyte, x is singly attached analyte and y doubly attached
analyte, in analyte-response units:

```text
free surface sites = Rmax - x - 2*y
capture = 2*kon*C*free - koff*x
closure = kon2*x*free - 2*koff2*y
dx/dt = capture - closure; dy/dt = closure
response = x + y
kon2 units = response^-1 s^-1
per-arm first-step KD = koff/kon
macroscopic first-capture KD = koff/(2*kon)
```

`Rmax` here is the capacity for singly attached analyte, not a measured
stoichiometric ratio. The reported first-step constants are not an overall
surface-avidity KD. The two-state model instead reports both the first-step
KD and overall KD = (koff/kon)*k_reverse/(k_forward+k_reverse).

Quasi-steady transport is restricted to one 1:1 population:

```text
dR/dt = [kon*Cb*(Rmax-R) - koff*R] / [1 + kon*(Rmax-R)/k_transport]
k_transport units = response M^-1 s^-1
```

The two-compartment option couples all bound analyte to surface concentration:

```text
dCs/dt = k_exchange*(Cb-Cs) - response_to_M*dR_bound_analyte/dt
k_exchange units = s^-1
response_to_M units = M/response
```

Rebinding is allowed after bulk concentration falls to zero. `response_to_M`
is an effective surface-volume/response calibration. Its default is fixed but
assumed, not measured. Intrinsic rates remain conditional on that assumption.
NS binding consumes the same analyte pool; measurement drift and bulk-response
terms do not. Numerics use a stiff Radau integrator, with normalized surface
concentration for numerical stability, and analytic propagation where available.

The empirical linear nonspecific background is available with every binding
mechanism and with physical transport. Its convention matches the original
Langmuir implementation, including a signed coefficient after referencing:

```text
linear background = ns_linear * Cb * clip(t - injection_start, 0, association_duration)
ns_linear units = response M^-1 s^-1
linear drift = drift * (t - injection_start)
```

The linear background ramps during association and remains constant during
dissociation. It is an additive empirical signal term, not a saturable binding
population or an analyte sink in the transport equations. Reversible
nonspecific binding has its own kon, koff and capacity, and does consume the
modeled surface analyte pool. Both may be requested, but additional background
terms can be nonidentifiable; inspect correlations and independently measured
controls. Offsets, drift, bulk response and the linear nonspecific contribution
are exported as separate point-level components. All fitted coefficients enter
the parameter count and conditional covariance; empirical coefficients are not
summarized as biological rate constants in independent-repeat plots.

OU whitening uses each actual time gap, including gaps from excluded regions:
alpha = exp(-dt/tau), innovation = (r_i-alpha*r_previous)/sqrt(1-alpha^2).
The stationary first residual is retained; the likelihood includes the
correlation determinant and fixed relative trace-noise scales. Supplying tau
is not estimating it. Control sharing, estimated baseline subtraction and
uncertain concentrations can introduce other correlations not modeled here.

## Validation Status

The new tests exercise observation-grid invariance, physical response counting,
surface occupancy, sequential binding-polynomial equilibrium, transport
depletion/rebinding and fast-exchange limits, nonspecific component separation,
linkage, fixed values, overrides, exact selection, 1:1 and full two-state
parameter recovery, OU whitening, robust-objective inference withholding,
fixed-assumption reporting, profiles and the full optional UI/export workflow.
Conditional one-parameter recovery checks cover heterogeneous, sequential,
bivalent, quasi-steady and full transport models with other values known.
These are not joint identifiability tests for all difficult-model parameters.

Reproduce numerical evidence with:

```sh
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python -m pytest tests -q
.venv/bin/python audits/mechanistic_validation.py --repeats 200
MPLCONFIGDIR=/private/tmp/mixa-publication-mpl .venv/bin/python scripts/preview_mechanistic.py
```

For 200 synthetic experiments with stationary AR(1) noise (rho=0.85), the
nominal 95% conditional intervals covered the known kon/koff/KD in
44.0%/42.0%/48.5% of IID fits. With the *true, supplied* OU correlation time,
coverage was 94.5%/94.5%/94.5%. All 200 intervals were available in each case.
This illustrates the risk from ignoring correlation and checks this specific
GLS implementation; it does not establish coverage under estimated noise,
subtracted controls, complex binding models or real SPR/BLI data.
Evidence and seeds are in `preview/mechanistic_validation/` with code hashes.

Next scientific gate: matched real difficult traces, known sample identities,
orientation, concentrations, ligand loading, flow/shaking conditions and
independent control experiments. Compare against a simpler model and, where
available, the instrument software using identical observations and assumptions.
A visually close fit and small conditional SE do not establish mechanism,
identifiability, stoichiometry or publication readiness.
