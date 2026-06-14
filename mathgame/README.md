# Math Pet Evolution: Sky Meadow

Static GitHub Pages prototype for a 3D-feeling math pet game. The app uses a full-screen WebGL scene with GPT-generated PNG art, sliced character sprites, a small HUD, a closet, and a modal math quest loop.

## Current Direction

- Full-screen game space instead of dashboard cards.
- WebGL-rendered world using GPT-generated raster PNG assets.
- Small HUD: current objective, pet meters, world progress, closet, and one main math button.
- Phone-safe HUD and overlays: iPhone-sized screens use compact controls, safe-area padding, and scrollable modals.
- Math appears only when the player clicks `Practice Math`.
- Same-device save data through `localStorage`.
- Quest gates require enough correct answers; wrong attempts do not pass the level.
- The pet hatches from one of three mystery eggs into a golden puppy, corgi puppy, or husky puppy.
- Each puppy uses full integrated sprite variants for outfits and action poses, not square overlay shapes.
- Equipped outfits now persist through action and interaction poses using breed/outfit/action PNG sprite variants.
- Companion actions trigger light sprite loops: wagging for feed/fetch/call and roll-over for rub.
- Dragging a pet close to the home couch snaps it into a couch-sit sprite pose.
- Decor and pet placement use direct drag only; the old arrow move controls were removed.
- Quest modals include a touch/mouse whiteboard for scratch math work.
- Math content is now aimed at accelerated 4th-grade work: distributive property, combining like terms, equations, fraction equations, decimals as fractions, and area/perimeter.
- Math problems are generated with a recent-prompt filter to avoid obvious repeats during a session.
- The cottage can be entered after hatching; home and outdoor math unlock arrangeable decorations, and the TV/remote can cycle multiple channels.
- Completing all living-room decor unlocks a new Kitchen room with its own generated backdrop and kitchen decor sprites.
- Secret one-time engagement awards can fire from specific action/decor combinations without listing the recipes in the UI.
- Tapping placed stateful decor toggles real sprite states: TV channels, lamp on/off, fridge open/closed, oven open/closed, and campfire lit/out.
- Math now drives a simple game economy: correct answers and quest clears earn coins, perfect clears and boss quests discover gems, and coins/gems buy snacks, wardrobe items, and decor.
- Outdoor decor is anchored to the panning meadow backdrop and uses backdrop-scaled drag math so placed yard items can move freely while staying fixed to the scene.
- Bridge Algebra now opens a real bridge crossing into Waterfall Clearing, with its own generated backdrop and waterfall decor sprites.
- Clearing the boss quest at Waterfall opens Mountain Shelter, with a mountain backdrop, camp decor, and a hidden camp routine award.
- Repaired home/kitchen sprites replace cut-off and semi-transparent decor, with extra counter-scale kitchen items for player decoration.

## Files

- `index.html`: static page shell and HUD/modals.
- `styles.css`: full-screen game UI and overlays.
- `script.js`: WebGL renderer, save state, closet, and math quest logic.
- `assets/gpt-*.png`: GPT-generated backdrop, egg, puppy, outfit, pose, and decor sprite textures.
- `tools/slice_gpt_atlas.py`: dependency-free PNG slicer that chroma-keys and trims the generated pet atlas.
- `tools/slice_puppy_variants.py`: dependency-free PNG slicer for the three 12-frame puppy variant atlases.
- `tools/slice_couch_sit.py`: dependency-free PNG slicer for the three couch-sit puppy poses.
- `tools/slice_home_decor.py`: dependency-free PNG slicer for the home decoration atlas.
- `tools/slice_yard_decor.py`: dependency-free PNG slicer for the outdoor decoration atlas.
- `tools/slice_waterfall_decor.py`: dependency-free PNG slicer for the Waterfall Clearing decoration atlas.
- `tools/slice_kitchen_decor.py`: dependency-free PNG slicer for the Kitchen decoration atlas.
- `tools/slice_outfit_action_sprites.py`: dependency-free PNG slicer for breed/outfit/action sprite sheets.
- `tools/slice_stateful_decor.py`: dependency-free PNG slicer for decor on/off and open/closed state pairs.
- `tools/slice_magenta_repair_assets.py`: dependency-free slicer for magenta-key repaired decor, counter-item, and mountain camp atlases.
- `tools/remove_magenta_key.py`: dependency-free magenta-key transparency cleaner for individual repaired sprites.
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

This reads `assets/gpt-puppy-atlas-source.png` and writes the original single-puppy transparent frames retained as legacy source material.

## Slice Puppy Variant Atlases

```bash
python3 tools/slice_puppy_variants.py
```

This reads the golden, corgi, and husky 4-by-3 atlas sources and writes the transparent breed-specific closet and action frames used by the game.

## Slice GPT Yard Decor Atlas

```bash
python3 tools/slice_yard_decor.py
```

This reads `assets/gpt-yard-decor-atlas-source.png` and writes the outdoor decor sprite PNGs.

## Slice GPT Waterfall Decor Atlas

```bash
python3 tools/slice_waterfall_decor.py
```

This reads `assets/gpt-waterfall-decor-atlas-source.png` and writes the Waterfall Clearing decor sprite PNGs.

## Slice GPT Kitchen Decor Atlas

```bash
python3 tools/slice_kitchen_decor.py
```

This reads `assets/gpt-kitchen-decor-atlas-source.png` and writes the Kitchen decor sprite PNGs.

## Slice Outfit Action Atlases

```bash
python3 tools/slice_outfit_action_sprites.py
```

This reads `assets/gpt-puppy-{breed}-{look}-action-atlas-source.png` files and writes outfit-aware action sprites for thinking, celebrating, wagging, rolling, and couch-sitting.

## Slice Stateful Decor Atlas

```bash
python3 tools/slice_stateful_decor.py
```

This reads `assets/gpt-stateful-decor-atlas-source.png` and writes TV, lamp, fridge, and oven state sprites.

## Slice Repaired Decor And Counter Items

```bash
python3 tools/slice_magenta_repair_assets.py
python3 tools/remove_magenta_key.py
```

These tools process magenta-key repaired decor atlases and individual sprites for home/kitchen fixes, TV channels, remote, counter-scale kitchen decorations, and Mountain Shelter camp items.

## GitHub Pages

Push this folder to a repository, then enable Pages from the repository root in `Settings -> Pages`.
