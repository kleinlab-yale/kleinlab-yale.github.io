# Idle Town

Idle Town is a cozy, installable browser game inspired by Coleytown in Westport, Connecticut. Grade 5–6 math earns seeds, introductory Chinese earns wood, Grade 5 social studies earns ore, and explicit market sales supply the coins used to grow the town.

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
- Three paid construction stages: stone foundation, timber frame, and final finish work, each with visible multi-minute timers
- Chicken and cow habitats that visibly fill as the population grows
- A player-controlled Arrange Town mode with saved drag-and-drop placement
- A sparse one-field start with three seeds, no buildings, and no animal habitats
- A connected economy: math → seeds, Chinese → wood, social studies → ore, and explicit crop/egg/milk sales → coins
- Chickens and cows consume harvested feed before they grow, then produce eggs and milk that must be sold manually
- Painted farmers, market vendors, and teachers with four-frame alternating-leg walk cycles, safe randomized routes, and modern-era wardrobe makeovers
- Purchased projects appear on the map only when construction actually begins
- Increasing field costs, no automatic coin income, capped animal goods, and 35% offline production efficiency
- A separate Compo Coast screen that unlocks after River Town is fully developed, followed by downtown, schools, and modern Westport
- Four crops with 2–12 minute growth, planting costs, offline readiness, yields, and market prices
- Historic, expanded, and modern visual forms for the school, market, bakery, and library
- Grade 5–6 fractions, multiplication, division, percents, geometry, and word problems
- A touch-friendly scratch whiteboard with pen, eraser, and clear controls
- Intro Chinese vocabulary and phrase practice with pinyin
- Grade 5 Connecticut history, geography, civics, government, and citizenship practice
- Learning-powered market boosts and subject-specific three-answer supply crates
- Town XP, milestones, autosave, offline animal production, music/SFX controls, and reduced-motion support
- Responsive desktop, tablet, and phone layouts with touch and keyboard-friendly controls

Player progress is stored locally in the browser. No account, ads, analytics, or server are required.
