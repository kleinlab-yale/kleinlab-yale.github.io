# RTK Signaling Explorer

A zero-build static web app for illustrating how receptor abundance, dimerization Kd, cooperativity, and receptor internalization reshape RTK signaling output.

## What it is

This app is designed for GitHub Pages and intended for teaching. It emphasizes the qualitative behaviors you described from your Molecular Cell paper:

- weak or negatively cooperative dimerization can create lower-amplitude, longer-lived signaling at low receptor abundance
- the same weak dimerization step can be titrated at higher receptor abundance, converting the response into a stronger transient
- stronger non-cooperative or positive-cooperative dimerization produces more burst-like signaling and stronger receptor loss from the surface

The implementation is intentionally compact rather than a methods-level reproduction of every equation in the paper.

## Files

- `index.html`: structure and teaching copy
- `styles.css`: visual design and layout
- `model.mjs`: simulation logic and presets
- `app.js`: UI wiring, charts, phase map, and interpretation text

## Local preview

Because this is a static site, you can preview it with any simple web server from the repo root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository settings, open `Pages`.
3. Set the source to `Deploy from a branch`.
4. Choose your default branch and `/ (root)`.
5. Save. GitHub Pages will publish `index.html` directly.

## Model summary

The simulator uses a small dynamical system:

- ligand occupancy creates a pool of bound surface receptors
- dimerization depends on receptor abundance, Kd, and a cooperativity-shaped response curve
- active receptors drive both signaling and internalization
- recycling slowly returns receptors to the surface

This is enough to let students see the switch you care about: weak dimerization can look sustained at low receptor abundance but transient at high receptor abundance because mass action overcomes the same Kd.
