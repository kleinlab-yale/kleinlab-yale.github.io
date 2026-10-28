# Chessmate 2.3 — Your chess home

A warm, modern chess clubhouse with computer personalities, 2D/3D boards, named home rooms, friends, and progression.

**Website destination:** [kleinlab-yale.github.io/Chessmate](https://kleinlab-yale.github.io/Chessmate/)

**Current activation status:** Connected to the configured Supabase Free project. The schema is installed and username login is enabled. A live integration check passed signup/login, room reservation, host-approved admission, six legal moves, chat, agreed draw, private saved progress, friend invitations, and login from a fresh client. Upload the prepared `Chessmate` folder to update the GitHub website; this local release has not been published yet.

## The player flow

1. Enter **Your name** and **Create a password**, then choose **Create my chess home**. The same name identifies the player and permanent home. Returning players use **Sign in → Open my chess home**; this device remembers the name, and an existing session opens the home directly.
2. **My home** shows the player's name, whether their home is open, a highlighted waiting room, **Send invite**, and **Choose a computer**. Clear tabs lead to **My home**, **Play computer**, **Friends**, and **My progress**. Avatar and outfits are under the profile button.
3. **Send invite** offers **Text message**, **WhatsApp**, and **Email**, with the invitation already filled in. **More apps** uses the device's sharing menu where supported. Copying is an optional fallback. The sender picks the recipient and presses Send in their own app; Chessmate does not read contacts or send messages itself. Message-app support varies by device.
4. Opening the invitation signs an existing player into the waiting flow immediately. A new player first creates their own home using the same two fields. The host sees **“Lily is here, ready to play!”** and a large **Play Lily** button. The visitor sees that they are waiting and who starts the game. The invite is consumed once, so refreshing after the game does not join the old queue again.
5. Finished games return each player to their own home with a result card and **Play again**. Previous opponents appear under **Your chess friends**. Play again sends an in-app invitation to that friend's home; they join, and the host starts. Friends can also visit by entering a name or pasted invitation under **Friends**.
6. Rating, XP, outfits, history, avatar, and friends stay saved to the account. Keep the page open to remain present and see arriving friends. An offline owner's home still exists; visitors see that the owner is away.

## Included features

- Six computer personalities at 400–1900 estimated Elo. A local worker varies search depth and mistakes; these difficulty labels are not calibrated tournament ratings.
- Legal moves, castling, en passant, promotion choices, checkmate and draws through chess.js.
- A fixed 8×8 SVG-backed 2D board, legal-move highlights, keyboard navigation, flipping, and PGN export. The background and hit targets share one square coordinate system, including at phone widths.
- A Three.js 3D board with modeled pieces, lighting, orbit, zoom, and click-to-move.
- Account-owned named rooms, host-approved waiting lists, saved friends, durable in-app invitations, live moves, chat, resignations, and agreed draws.
- Elo progression, streaks, match history, XP levels, reward points, avatar outfits, and seasonal collections.
- Username/password sign-in, one-step account and room creation, profile editing, and visible save status. Forgotten passwords are handled by the organizer, without email.

New players start at 800 Elo. Rating uses K=32 with a floor of 100. Wins earn 80 points/XP, draws 40, and completed losses 25. Rewards require six half-moves or checkmate; a taken-back bot game becomes unrated practice. Each 250 lifetime XP adds a level. Spending points preserves lifetime XP. The latest 300 games are retained.

This remains a casual chess app. Read [backend behavior and limitations](_source/supabase/SETUP.md#data-and-operating-behavior) for concurrency, offline-result reconciliation, data visibility, and client-computed progression. Account security and room ownership are server enforced; competitive anti-cheat is outside this version.

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

After connecting and testing accounts, replace only the existing `Chessmate` folder at the root of `kleinlab-yale/kleinlab-yale.github.io` on `main`. Preserve the lab website's root files and publishing settings. Unzip `Chessmate-2.3.zip` before using GitHub's folder-upload interface.

`version.json` identifies version **2.3.0 / Your chess home**, so you can distinguish it from the older code-based rooms currently on GitHub. Rebuilding `_source` produces a fresh deployable folder. The optional standalone workflow in `_source/.github` does not replace the lab site's deployment.

## Validation

`pnpm test` runs 27 tests: chess legality and special moves, bot responses, ratings/rewards, room names and sharing, and actual PostgreSQL row policies/functions via PGlite. Database tests cover unique ownership, private progress, stale-save protection, host-only acceptance, match membership, event ordering, malformed payload rejection, durable invitations, mutual friends, repeat games, and reciprocal waiting requests.

This update was exercised with two local simulated players through invitation entry, host approval, six moves, an agreed draw, automatic return to both homes, and a second game. The responsive home and messaging chooser were inspected at phone width. These UI checks create no Supabase accounts; the original hosted login/database integration check predates this update. Actual messaging-app handoff and a full game between two physical phones have not been tested for this release. No database migration is required.

## Source map

- `src/App.jsx`, `src/HomeScreen.jsx` — welcome, permanent home, progression, wardrobe, and navigation
- `src/AccountForm.jsx`, `src/usernameAuth.js`, `src/useAccount.js`, `src/cloud.js` — authentication and cloud saves
- `src/RoomLobby.jsx`, `src/CloudRooms.js` — named rooms, waiting guests, friends, realtime transport
- `src/Game.jsx` — chess, chat, result handling, and worker coordination
- `src/Board2D.jsx`, `src/Board3D.jsx` — board rendering
- `src/engine.js`, `src/profile.js`, `src/data.js` — engine, progression, and collections
- `supabase/schema.sql` — tables, permissions, and authenticated database actions
- `supabase/SETUP.md` — backend activation and release checks
- `scripts/reset-player-password.mjs` — private organizer password reset; never part of the browser bundle

Built with React, Vite, chess.js, Three.js, Supabase, and Lucide. Hero artwork provenance is in `design/asset-prompt.md`; avatars and chess pieces are defined in source.
