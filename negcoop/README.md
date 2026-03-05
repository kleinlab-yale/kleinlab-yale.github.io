[README.md](https://github.com/user-attachments/files/25780796/README.md)
# RTK Signaling Explorer

A zero-build static web app for illustrating how receptor abundance, dimerization Kd, cooperativity, and receptor internalization reshape RTK signaling output.

## What it is

This app is designed for GitHub Pages and intended for teaching. It emphasizes the qualitative behaviors you described from your Molecular Cell paper:

- weak or negatively cooperative dimerization can create lower-amplitude, longer-lived signaling at low receptor abundance
- the same weak dimerization step can be titrated at higher receptor abundance, converting the response into a stronger transient
- stronger non-cooperative or positive-cooperative dimerization produces more burst-like signaling and stronger receptor loss from the surface

The current curve tuning is intentionally shape-first:

- transient presets peak at about 2 minutes and collapse by about 15 minutes
- sustained weak-dimerization presets stay low but can persist for roughly 30 to 60 minutes

The implementation is intentionally compact rather than a methods-level reproduction of every equation in the paper.

## Files

- `index.html`: structure and teaching copy
- `styles.css`: visual design and layout
- `app.js`: simulation logic, UI wiring, charts, phase map, and interpretation text

## Local preview

This app no longer depends on JavaScript modules, so you can either open `index.html` directly or use a simple local web server from the repo root:

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

The simulator uses a compact teaching model:

- receptor abundance, ligand, Kd, and cooperativity determine whether the response favors a fast transient or a low sustained plateau
- the transient component is tuned to peak early
- the sustained component dominates only in weak negative-cooperative regimes
- internalization strips surface receptors quickly when the transient component is strong

This is enough to let students see the switch you care about: weak dimerization can look sustained at low receptor abundance but transient at high receptor abundance because mass action overcomes the same Kd.
