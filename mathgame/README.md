# Math Pet Evolution

A static HTML math game designed for GitHub Pages. The player names a mystery egg, solves 4th grade math quests, and helps a pet evolve by feeding it, restoring habitats, and unlocking upgrades.

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

- `Multiplication Chain`: feeds hunger and restores energy
- `Fraction Bridge`: improves mood and opens world progression
- `Geometry Workshop`: unlocks decorations and habitat growth
- `Boss Challenge`: mixed review that triggers evolution after balanced practice

## Save data

Progress is stored in the browser with `localStorage`, so the pet should keep its state between sessions on the same device/browser.
