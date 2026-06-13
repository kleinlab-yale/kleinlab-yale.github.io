# Math Pet Evolution: Sky Meadow

Static GitHub Pages prototype for a 3D-feeling math pet game. The app uses a full-screen WebGL scene with GPT-generated PNG art, sliced character sprites, a small HUD, a closet, and a modal math quest loop.

## Current Direction

- Full-screen game space instead of dashboard cards.
- WebGL-rendered world using GPT-generated raster PNG assets.
- Small HUD: current objective, pet meters, world progress, closet, and one main math button.
- Math appears only when the player clicks `Practice Math`.
- Same-device save data through `localStorage`.
- Quest gates require enough correct answers; wrong attempts do not pass the level.
- The pet uses full integrated sprite variants for outfits, not square overlay shapes.
- Math content is now aimed at accelerated 4th-grade work: distributive property, combining like terms, equations, fraction equations, decimals as fractions, and area/perimeter.
- The cottage can be entered after hatching; home and outdoor math unlock arrangeable decorations, and the TV can change channels.

## Files

- `index.html`: static page shell and HUD/modals.
- `styles.css`: full-screen game UI and overlays.
- `script.js`: WebGL renderer, save state, closet, and math quest logic.
- `assets/gpt-*.png`: GPT-generated backdrop, egg, pet, and outfit sprite textures.
- `tools/slice_gpt_atlas.py`: dependency-free PNG slicer that chroma-keys and trims the generated pet atlas.
- `tools/slice_home_decor.py`: dependency-free PNG slicer for the home decoration atlas.
- `tools/slice_yard_decor.py`: dependency-free PNG slicer for the outdoor decoration atlas.
- `tools/generate_assets.py`: legacy procedural asset generator retained as a fallback, not the current visual direction.

## Local Preview

```bash
cd /Users/daryl/Documents/4/codex/mathgame
python3 -m http.server 8000
```

Open `http://localhost:8000`.

For a non-persistent preview with the pet already hatched and clothed, open `http://localhost:8000/?demo=1`.

To clear same-device progress and restart from a new egg, open `http://localhost:8000/?reset=1` or use the in-game `Restart` button.

## Slice GPT Sprite Atlas

```bash
python3 tools/slice_gpt_atlas.py
```

This reads `assets/gpt-puppy-atlas-source.png` and writes the individual transparent pet frames used by the game.

## Slice GPT Yard Decor Atlas

```bash
python3 tools/slice_yard_decor.py
```

This reads `assets/gpt-yard-decor-atlas-source.png` and writes the outdoor decor sprite PNGs.

## GitHub Pages

Push this folder to a repository, then enable Pages from the repository root in `Settings -> Pages`.
