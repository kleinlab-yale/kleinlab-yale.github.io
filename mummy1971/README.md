# Voice of the Mummy (1971 Milton Bradley) — 3D & 2D Online Multiplayer

An authentic 3D (Three.js / Blender glTF) and 2D orthographic recreation of the classic 1971 Milton Bradley board game ***Voice of the Mummy***, complete with all **40 original dual-sided phonograph record audio tracks** (`SideA` & `SideB`), the original 1971 rulebook ([rules/update_sarc.pdf](rules/update_sarc.pdf)), and **serverless WebRTC P2P online multiplayer** for GitHub Pages.

## Features
- **Interactive 3D & 2D Views (`3D + 2D Split`, `3D Pyramid`, `2D Overhead`)**:
  - **3D View**: Renders the 3-tier step-pyramid board, inverted cardboard box pedestal with Egyptian tomb frieze & checkered lip, 8 stone staircases, 3D displaced metallic bronze Sarcophagus, 26 translucent emerald-green Scarab cabochon gems, translucent ruby-red Cobra & faceted Great Mummy Jewel, 4 folded Deity Temple jewel holders (Bastet, Ra, Anubis, Osiris), 4 double-sided Explorer standees, and a tumbling 3D die.
  - **2D View**: High-resolution perspective-rectified orthographic board (`textures/board_top_ortho.png`) with interactive SVG space highlights, path previews, and token badges.
- **Complete 1971 Rules Engine (Part I & Part II)**:
  - **Part I (`votm-tracks/SideA` — 20 tracks)**: Clockwise movement, collecting the 26 Precious Jewels, stealing from opponents on landing, pulling the Sarcophagus lever on Mummy's Head spaces, climbing steps at corners & protruding staircases, and unlocking the Great Jewel (+5 pts) & cursed Ruby Cobra (-5 pts Evil Spell) once all 6 Top-Level Jewels are collected.
  - **Part II (`votm-tracks/SideB` — 20 tracks)**: Flipping the record to Side #2, moving Clockwise or Counter-Clockwise, passing the cursed Cobra by landing on an opponent by exact count, stealing the Great Jewel, and racing home to your Temple corner by exact count without the Cobra to claim the Homecoming Bonus!
- **GitHub Pages Online Multiplayer (PeerJS WebRTC + Multi-Tab BroadcastChannel)**:
  - Click **🌐 Multiplayer / Setup** → **👑 Host Online Game** to generate a Room Code (`TOMB-XXXX`) and one-click shareable invite link (`?room=TOMB-XXXX`). Friends can join from anywhere via the link or code!

## Running Locally
```bash
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

## Deploying to GitHub Pages
1. Push this directory to a GitHub repository.
2. In your GitHub repository **Settings → Pages**, set **Source** to **Deploy from a branch** (`main`, `/ (root)`).
3. Your live multiplayer game will be hosted at `https://<your-username>.github.io/<repo-name>/`.
