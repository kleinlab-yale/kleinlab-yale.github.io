# ROS1 activation by NELL2

This workspace now contains a small self-contained viewer that turns the mechanism in your figures
into a rotatable 3D schematic.

## Files

- `index.html`: entry point
- `styles.css`: page styling
- `model.js`: canvas renderer and state logic

## What it shows

- `Unliganded`: the small CATCH hand is tucked into the hip pocket and the ectodomain stays bent
- `NELL2 site 1`: NELL2 clusters ROS1 without pulling the hand out of the hip pocket
- `NELL2 sites 1/2/3`: the CATCH plus FNIII-1/2 block rotates about 130 degrees around YWTD-A, the hand exits the hip pocket, and the legs become dynamic and draw together

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
