# ♛ Arcane Chess — 3D Wizard's Hall & Rated Online Arena

A zero-build, static online chess application designed for **GitHub Pages**. Seamlessly switch at any point between an enchanted **Super Wizard Chess 3D View** (with sculpted battle-pieces, flickering Great Hall braziers, parabolic knight leaps, and explosive stone-shattering captures) and a crisp **Standard 2D Tournament View**.

---

## ✨ Key Features

### 1. Dual Live Views: Super Wizard 3D ↔ Standard 2D
- **✨ Wizard 3D View** (`js/board3d.js`): Powered by Three.js with bespoke sculpted 3D warrior pieces (Armored Foot-Soldier Pawns with shields & spears, Crenellated Fortress Rooks, Warhorse Knights, High Arcane Bishops with levitating crystals, Sorceress Queens, and Monarch Kings).
- **💥 Shattering Capture Physics**: Capturing a piece in 3D mode triggers a shockwave ring, camera shake, and shatters the captured stone piece into 28 bouncing 3D debris fragments.
- **♟️ Standard 2D View** (`js/board2d.js`): Crisp Staunton vector SVG board with click-to-move, drag-and-drop, and 4 board themes (*Classic Wood*, *Tournament Green*, *Arcane Slate*, *Icy Sea*).
- Press **`V`** or click the top bar toggle at any moment during a game to switch between 3D and 2D without losing state.

### 2. 🌐 Room-Name Multiplayer (Zero Backend Required)
- Two players can sign in on the website, switch to **Multiplayer Room**, and enter the **exact same Room Name** (e.g. `great-hall-7`) to connect directly via WebRTC (**PeerJS**) + `BroadcastChannel` local multi-tab sync.
- Supports synchronized chess clocks, real-time algebraic move streaming, live room chat, draw offers, resignations, rematches, and shareable `?room=your-room-name` invite links.

### 3. 🤖 6 AI Bot Personalities Across Elo Tiers
When playing solo, challenge six distinct computer personalities with unique opening books, evaluation weights, and live reactive commentary:
1. **Pip the Automaton (600 Elo)** — *Beginner • Carefree*
2. **Sir Barnaby the Bold (950 Elo)** — *Casual • Reckless Berserker*
3. **Sister Celeste (1250 Elo)** — *Intermediate • Fortress Tactician*
4. **Lord Vesper (1550 Elo)** — *Advanced • Shadow Court Trickster*
5. **Archmage Aurelius (1850 Elo)** — *Master • Grand Wizard Strategist*
6. **The Obsidian Oracle (2150 Elo)** — *Grandmaster • Supreme Astral Engine*

Click **⚔️ Match My Elo** in the top bar to automatically face the personality closest to your current rating.

### 4. 📊 Persistent Player Memory & Adaptive Elo System
- Sign in with your player name to track your **Wins, Losses, Draws, Win Streaks, Peak Elo, Per-Bot Head-to-Head Records, and Match History**.
- Uses FIDE Elo mathematics with a provisional calibration period ($K=40$ for your first 8 matches, then $K=24$) so your Elo rapidly adapts to your true strength.
- Includes an interactive **SVG Elo Rating Progression Chart** and **JSON Profile Export/Import** for cross-device portability.

---

## 🚀 How to Host on GitHub Pages

Because this repository uses pure ES Modules and zero build steps, it deploys directly from your branch:

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Arcane Chess 3D & 2D Online Arena"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose **`main`** and **`/ (root)`**, and click **Save**.
4. Your site will be live at `https://<your-username>.github.io/<your-repo>/`!

---

## 💻 Running Locally

Serve the directory with any static HTTP server:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.
