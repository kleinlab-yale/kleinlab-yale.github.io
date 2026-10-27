# Chessmate 2.2 — account-owned home rooms

A warm, modern chess clubhouse with computer personalities, 2D/3D boards, named home rooms, friends, and progression.

**Website destination:** [kleinlab-yale.github.io/Chessmate](https://kleinlab-yale.github.io/Chessmate/)

**Current activation status:** Connected to the configured Supabase Free project. The schema is installed and username login is enabled. A live integration check passed signup/login, room reservation, host-approved admission, six legal moves, chat, agreed draw, private saved progress, friend invitations, and login from a fresh client. Upload the prepared `Chessmate` folder to update the GitHub website; this local release has not been published yet.

## The player flow

1. Enter **Your name** and **Create a password**, then press **Start playing**. That same name identifies your player and home room. Returning players choose **Sign in** and use the same two fields.
2. The next screen has two large choices: **Play computer** or **Play a friend**. Progress and avatar options are secondary links.
3. Under **Play a friend**, choose **Send my room link**, or enter the other person’s name or room link and press **Join my friend**. A signed-in visitor enters the waiting list; the host chooses **Play** next to the person they want to play.
4. Previous opponents appear in **Familiar faces**. Tap an avatar to invite that friend or choose **Visit their room**. Invitations are stored for the recipient's next visit.
5. Rating, XP, outfits, history, avatar, and friends are saved to the account. Sign in on another device to retrieve them.

An invitation uses the device's native share sheet where available. The fallback offers copying and **Open Messages**; the sender chooses the recipient and sends the message. Chessmate never reads device contacts or sends an SMS automatically.

## Included features

- Six computer personalities at 400–1900 estimated Elo. A local worker varies search depth and mistakes; these difficulty labels are not calibrated tournament ratings.
- Legal moves, castling, en passant, promotion choices, checkmate and draws through chess.js.
- A fixed 8×8 SVG-backed 2D board, legal-move highlights, keyboard navigation, flipping, and PGN export. The background and hit targets share one square coordinate system, including at phone widths.
- A Three.js 3D board with modeled pieces, lighting, orbit, zoom, and click-to-move.
- Account-owned named rooms, host-approved waiting lists, saved friends, durable in-app invitations, live moves, chat, resignations, and agreed draws.
- Elo progression, streaks, match history, XP levels, reward points, avatar outfits, and seasonal collections.
- Username/password sign-in, one-step account and room creation, profile editing, and visible save status. Forgotten passwords are handled by the organizer, without email.

New players start at 800 Elo. Rating uses K=32 with a floor of 100. Wins earn 80 points/XP, draws 40, and completed losses 25. Rewards require six half-moves or checkmate; a taken-back bot game becomes unrated practice. Each 250 lifetime XP adds a level. Spending points preserves lifetime XP. The latest 300 games are retained.

This remains a casual chess app. Read [backend behavior and limitations](supabase/SETUP.md#data-and-operating-behavior) for concurrency, offline-result reconciliation, data visibility, and client-computed progression. Account security and room ownership are server enforced; competitive anti-cheat is outside this version.

## Develop and build

Use Node.js 22.12+ and pnpm 11.25:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open Vite's local HTTP address. Opening the source `index.html` directly with `file://` does not run the app.

```sh
pnpm test
pnpm build
pnpm package:pages
```

The frontend uses relative assets and runs under `/Chessmate/`. Configure its backend in `public/chessmate-config.js`; no private key belongs in the frontend.

## Folder for GitHub

The package command creates:

```text
release/Chessmate/
  index.html
  room.html
  chessmate-config.js
  version.json
  assets/
  images/
  README.md
  THIRD_PARTY_NOTICES.txt
  _source/              # Editable project, tests, and Supabase schema/setup
```

After connecting and testing accounts, replace only the existing `Chessmate` folder at the root of `kleinlab-yale/kleinlab-yale.github.io` on `main`. Preserve the lab website's root files and publishing settings. Unzip `Chessmate-2.2.zip` before using GitHub's folder-upload interface.

`version.json` identifies version **2.2.0 / Simple play**, so you can distinguish it from the older code-based rooms currently on GitHub. Rebuilding `_source` produces a fresh deployable folder. The optional standalone workflow in `_source/.github` does not replace the lab site's deployment.

## Validation

`pnpm test` runs 24 tests: chess legality and special moves, bot responses, ratings/rewards, room names and sharing, and actual PostgreSQL row policies/functions via PGlite. Database tests cover unique ownership, private progress, stale-save protection, host-only acceptance, match membership, event ordering, malformed payload rejection, durable invitations, and mutual friends.

The updated phone board is checked in-browser at narrow and standard phone widths, including a legal move and computer reply. Hosted username login and the room/game database flow passed a live integration check. A full game between two physical phones remains a useful release check.

## Source map

- `src/App.jsx`, `src/HomeScreen.jsx` — welcome, two-choice start screen, progression, wardrobe, and navigation
- `src/AccountForm.jsx`, `src/usernameAuth.js`, `src/useAccount.js`, `src/cloud.js` — authentication and cloud saves
- `src/RoomLobby.jsx`, `src/CloudRooms.js` — named rooms, waiting guests, friends, realtime transport
- `src/Game.jsx` — chess, chat, result handling, and worker coordination
- `src/Board2D.jsx`, `src/Board3D.jsx` — board rendering
- `src/engine.js`, `src/profile.js`, `src/data.js` — engine, progression, and collections
- `supabase/schema.sql` — tables, permissions, and authenticated database actions
- `supabase/SETUP.md` — backend activation and release checks
- `scripts/reset-player-password.mjs` — private organizer password reset; never part of the browser bundle

Built with React, Vite, chess.js, Three.js, Supabase, and Lucide. Hero artwork provenance is in `design/asset-prompt.md`; avatars and chess pieces are defined in source.
