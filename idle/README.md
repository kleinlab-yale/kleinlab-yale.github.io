# Idle Town

Idle Town is a cozy, installable browser game inspired by Coleytown in Westport, Connecticut. Grade 5–6 math earns seeds, introductory Chinese earns wood and ore, and farming supplies the coins and animal feed used to grow the town.

## Play locally

The game has no build step or runtime dependencies.

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Publish in the Klein Lab site

Copy the deployable files into the `idle/` folder of
`kleinlab-yale/kleinlab-yale.github.io`. The included manifest and service
worker make the game installable as a PWA at the published `/idle/` URL.

## Game systems

- A bright, border-free River Town map where every crop, habitat, and building is a separate movable layer
- Clean standalone image assets (not runtime atlas crops), including padded apple canopies with no clipped edges
- Crop art visibly moves from bare soil to sprouts, young plants, and mature harvests
- Visible timed construction: foundations become scaffolding, then distinctly larger finished buildings
- Chicken and cow habitats that visibly fill as the population grows
- A player-controlled Arrange Town mode with saved drag-and-drop placement
- A true empty-meadow start with no completed buildings or animal habitats
- A connected economy: math → seeds → crops/feed → coins, while Chinese → wood/ore → buildings
- Chickens and cows consume harvested feed before they grow, then sell eggs and milk for passive income
- Painted farmers, market vendors, and early-town teachers walking through the live town map
- A separate Compo Coast screen that unlocks after River Town is fully developed, followed by downtown, schools, and modern Westport
- Four crops with planting costs, real-time growth, offline readiness, yields, and market prices
- Passive town income and upgradable school, market, bakery, library, and animal projects
- Grade 5–6 fractions, multiplication, division, percents, geometry, and word problems
- A touch-friendly scratch whiteboard with pen, eraser, and clear controls
- Intro Chinese vocabulary and phrase practice with pinyin
- Learning-powered market boosts and subject-specific three-answer supply crates
- Town XP, milestones, autosave, offline earnings, music/SFX controls, and reduced-motion support
- Responsive desktop, tablet, and phone layouts with touch and keyboard-friendly controls

Player progress is stored locally in the browser. No account, ads, analytics, or server are required.
