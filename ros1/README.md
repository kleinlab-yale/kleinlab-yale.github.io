# ROS1 activation by NELL2

This workspace now contains a small self-contained viewer that turns the mechanism in your figures
into a rotatable 3D schematic.

## Files

- `index.html`: entry point
- `styles.css`: page styling
- `model.js`: canvas renderer and state logic

## What it shows

- `Unliganded`: the small CATCH hand is tucked into the hip pocket and the ectodomain stays bent
- `NELL2 site 1`: the rigid `NELL2` trimer binds the strong site-1 interface on `YWTD-A`, but the rigid ROS1 arm has not yet flipped up to add site 2 on `FNIII-2` and site 3 on `FNIII-1`
- `NELL2 sites 1/2/3`: `NELL2` remains rigid and bound at site 1 on `YWTD-A` while the ROS1 arm swings upward as a rigid `CATCH + FNIII-1/2` body, adding site 2 on `FNIII-2` and site 3 on `FNIII-1`; `CATCH` just releases from the `YWTD-B` pocket so the legs, transmembrane segments, and kinase regions can draw together

## Antibody blockade

- `RX5`: drawn as a Y-shaped antibody whose single contacting Fab tip caps the site-1 epitope on `YWTD-A`, preventing productive engagement by NELL2
- `CTX`: drawn as the same Y-shaped antibody, but with one Fab tip docked between the FNIII arm and `YWTD-A` shoulder, preventing the rigid arm-body from flipping up to add site 2 on `FNIII-2` and site 3 on `FNIII-1`

## Domain layout encoded in the schematic

- N-terminal `CATCH`
- `FNIII-1` and `FNIII-2`
- `YWTD-A`
- `FNIII-3`
- `YWTD-B`
- `FNIII-4` and `FNIII-5`
- `YWTD-C`
- `FNIII-6`, `FNIII-7`, `FNIII-8`, and `FNIII-9`
- the transmembrane segment at the membrane

## Structural basis

This is a mechanistic cartoon based on the Nature Communications proof and the structures reported
alongside it, especially PDB entries `9PVP`, `10FT`, `10GH`, `9DZ4`, and `9PWQ`.

The current geometry emphasizes the paper's mechanistic logic:

- `NELL2` is shown as a rigid trimer scaffold with a central spine
- the same rigid `NELL2` conformation is used whether ligand is bound or detached off to the side
- `site 1` stays anchored on `YWTD-A`
- the dominant conformational change is an about `130 degrees` shoulder-hinged swing of the rigid ROS1 arm
- the leg is treated as released and more dynamic in the active state rather than as a completely new fixed conformation

Paper link: <https://www.nature.com/articles/s41467-026-69630-7>

## Open it

Open [index.html](/Users/daryl/Documents/4/codex/ros1/index.html) directly in a browser.

If you prefer serving it locally:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.
