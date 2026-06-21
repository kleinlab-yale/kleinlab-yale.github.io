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
- Three paid construction stages with compact timers, plus optional coin or wood/ore rush spending that speeds the current stage without skipping later payments
- Chicken and cow habitats that visibly fill as the population grows
- A player-controlled Arrange Town mode with saved drag-and-drop placement
- A sparse one-field start with three seeds—enough for one carrot planting—so continued farming requires math-earned seeds
- A connected economy: math → seeds, Chinese → wood, social studies → ore, and explicit crop/egg/milk sales → coins
- Chickens and cows consume harvested feed before they grow, then produce eggs and milk that must be sold manually
- Layer-rigged farmers, market vendors, and teachers whose independent legs swing in opposite phases, with safe randomized routes and modern-era wardrobe makeovers
- Purchased projects appear on the map only when construction actually begins
- Increasing field costs, no automatic coin income, capped animal goods, and 35% offline animal-production efficiency
- A separate Compo Coast screen that unlocks after River Town is fully developed, followed by downtown, schools, and modern Westport
- Four crops with 2–12 minute growth, planting costs, offline readiness, yields, and market prices
- Historic, expanded, and modern visual forms for the school, market, bakery, and library
- Grade 5–6 fractions, multiplication, division, percents, geometry, and word problems
- A touch-friendly scratch whiteboard with pen, eraser, and clear controls
- Intro Chinese vocabulary and phrase practice with pinyin
- Nineteen Grade 5 social-studies mini-lessons with three-sentence teaching passages and 57 Connecticut history, geography, civics, government, economics, and citizenship questions
- Learning-powered market boosts and subject-specific three-answer supply crates
- Reliable offline crops, construction, animal growth, capped goods production, and a welcome-back summary for reloads, backgrounded iPads, and restored Safari pages
- Town XP, milestones, autosave, music/SFX controls, and reduced-motion support
- One permanent device save slot with automatic v5/v6/v7 migration plus iPad-friendly visibility and page-hide saving across site updates
- Responsive desktop, tablet, and phone layouts with touch and keyboard-friendly controls

Player progress is stored locally in the browser. No account, ads, analytics, or server are required.
