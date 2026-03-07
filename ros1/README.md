# ROS1 activation by NELL2

This workspace now contains a small self-contained viewer that turns the mechanism in your figures
into a rotatable 3D schematic.

## Files

- `index.html`: entry point
- `styles.css`: page styling
- `model.js`: canvas renderer and state logic

## What it shows

- `Unliganded`: bent, monomeric ROS1
- `NELL2 site 1`: NELL2 clusters ROS1 without activation
- `NELL2 sites 1/2/3`: arm release, increased leg dynamics, and active geometry

## Structural basis

This is a mechanistic cartoon based on the Nature Communications proof and the structures reported
alongside it, especially PDB entries `9PVP`, `10FT`, `10GH`, `9DZ4`, and `9PWQ`.

## Open it

Open [index.html](/Users/daryl/Documents/4/codex/ros1/index.html) directly in a browser.

If you prefer serving it locally:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.
