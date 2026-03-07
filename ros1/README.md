# ROS1 activation by NELL2

This workspace now contains a small self-contained viewer that turns the mechanism in your figures
into a rotatable 3D schematic.

## Files

- `index.html`: entry point
- `styles.css`: page styling
- `model.js`: canvas renderer and state logic

## What it shows

- `Unliganded`: the small CATCH hand is tucked into the hip pocket and the ectodomain stays bent
- `NELL2 site 1`: NELL2 binds the strong site-1 interface on `YWTD-A`, but the arm has not yet flipped up to add sites 2 and 3
- `NELL2 sites 1/2/3`: NELL2 remains bound at site 1 on `YWTD-A` while the `FNIII-1/2` arm flips up to add sites 2 and 3; `CATCH` just releases from the `YWTD-B` pocket and the transmembrane plus kinase regions draw together

## Antibody blockade

- `RX5`: masks the site-1 epitope on `YWTD-A` and prevents productive engagement by NELL2
- `CTX`: binds between the FNIII arm and `YWTD-A` shoulder and prevents the arm from flipping up to add sites 2 and 3

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

Paper link: <https://www.nature.com/articles/s41467-026-69630-7>

## Open it

Open [index.html](/Users/daryl/Documents/4/codex/ros1/index.html) directly in a browser.

If you prefer serving it locally:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.
