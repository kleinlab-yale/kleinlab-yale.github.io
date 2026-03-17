# Math Pet Evolution

A static HTML math game designed for GitHub Pages. The player names a mystery egg, solves 4th grade math quests, then grows into harder worlds with multiplication, division, fractions, area, perimeter, and mixed challenge upgrades.

## Files

- `index.html`: page structure
- `styles.css`: visual design and responsive layout
- `script.js`: game logic, question generation, progression, and local save data

## Local preview

If Python is available:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## GitHub Pages

1. Push these files to your GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Select your main branch and the `/ (root)` folder.
5. Save. GitHub will publish `index.html` automatically.

## Game loop

- `Number Forge`: feeds hunger and restores energy with multiplication and division
- `Fraction Bridge`: improves mood and opens world progression with comparison and equivalence work
- `Geometry Workshop`: unlocks decorations and habitat growth with area, perimeter, and measurement
- `Boss Challenge`: mixed review that triggers evolution and unlocks later worlds after balanced practice

## Profiles

- Each player can create a separate same-device profile from the in-game player chooser.
- Profiles are stored locally in the browser, so they work well for a shared family laptop or tablet.
- Profiles do not sync between devices because the site is still fully static on GitHub Pages.

## Save data

Progress is stored in the browser with `localStorage`, so the pet should keep its state between sessions on the same device/browser.
