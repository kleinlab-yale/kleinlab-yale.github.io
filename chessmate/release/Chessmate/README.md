# Chessmate

A warm, modern chess clubhouse: memorable computer opponents, an interactive 3D board, private games with friends, and a little progress every day.

**Live destination:** https://kleinlab-yale.github.io/Chessmate/

## What works

- Six computer personalities from 400 to 1900 **estimated** Elo, using a local worker-based chess engine with varying search depth and mistake rates.
- Complete legal chess: castling, en passant, four promotion choices, checkmate, stalemate, repetition, insufficient material, and the fifty-move rule.
- SVG 2D board with legal-move highlights, keyboard navigation, board flipping, and PGN download.
- Three.js 3D board with modeled pieces, lighting and shadows, click-to-move, orbit, and zoom. The 3D code loads only when requested.
- Browser-local player name and avatar, Elo changes, match history, daily streaks, and XP levels.
- Wardrobe purchases using earned points. Lifetime XP stays intact when points are spent. Seasonal collections follow the visitor's calendar; owned items stay available to equip.
- Named home rooms (for example, `emma`), visible waiting lists, host-approved games, and saved friends. Rooms stay open across matches and clubhouse navigation.
- In-app friend invitations, native device sharing, copied links, and a Messages handoff. Live moves, text chat, resignations, and mutual draw offers use PeerJS/WebRTC.
- Responsive layouts, named controls, keyboard focus handling in dialogs, reduced-motion support, and optional move sounds.

## First-pass boundaries

Player profiles are local browser profiles, not authenticated cloud accounts. No password, email, database, or API key is required. Progress is not synchronized across devices and can be changed through browser storage. Export a profile backup from Settings.

Elo is a casual local progression score. The bot difficulty labels are not calibrated tournament ratings. The custom engine searches up to three plies with a time budget, so its strongest level is not a substitute for a rated Stockfish opponent.

Multiplayer uses PeerJS's public signaling service and direct WebRTC data channels. Both players must remain connected. Some restrictive networks require a TURN relay, which is not configured in this first pass. There is no reconnect/resume, central authority, anti-cheat, matchmaking, or persistent chat server. Room names are case-insensitive, remembered locally, and claimed only while their owner keeps the page connected. They are not permanently reserved or authenticated identities. Up to eight guests may wait in a room, and only the host can start a match. Invitations work in-app while the recipient’s named home room is open; otherwise the sender is offered a message/link fallback. A connection loss leaves the game unrated. Private games are untimed; the host plays white and the guest plays black.

## Play with friends

1. Create your player, open **Play with friends**, and choose a room name such as `emma` or `emma-chess`.
2. Click **Open my room**. You enter your home room immediately; it stays available while Chessmate stays open, including while you browse other clubhouse screens.
3. Click **Invite a friend** to use your device’s share sheet, or **Copy link**. Your friend can also type your room name into **Join a room**.
4. Your friend appears under **At your door**. They see that they are waiting. Choose **Play** beside the person you want to play, or decline them. Joining never starts a game automatically.
5. Finish a game to save one another in **Familiar faces**. Tap a friend’s avatar or **Invite to play** to send an in-app invitation; use **Visit their room** to join their waiting list.
6. After the match, **Back to the room** returns you to the lounge. Your home room and other waiting guests remain available. The previous opponent can join again for a rematch.

Native sharing uses the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share); available destinations depend on the device and browser. If unavailable, a dialog offers copying and **Open Messages**. That fallback copies the invitation, opens `sms:` on supported devices, and asks the sender to choose a contact and paste it. Chessmate does not read the address book or automatically send messages. SMS app handoff must be checked on the target phone; desktop and in-app browsers may have no SMS handler.

Room names use 2–24 letters, numbers, or hyphens. Collisions show a useful error. Closing or refreshing a room takes it offline; reopen it with the remembered name. Guessed names can be visited, so named rooms are not secret invite-only rooms. Permanent reserved names, verified identities, cross-device friends, and invitations while offline require authenticated server storage and notifications.

## Progression

New players start at 800 Elo. Rating changes use the standard expected-score formula with K = 32 and a floor of 100. Wins award 80 XP and points, draws 40, and losses 25. Games must reach six half-moves to earn rewards, unless they end in checkmate. Each 250 lifetime XP adds a level. Taking back a move turns a bot game into practice: no rating change and 15 points for a qualifying completed game.

Autumn is September–November; winter December–February; spring March–May; summer June–August. Daily goals and streaks use the player's local date. The most recent 300 games are retained.

## Develop locally

Requirements: Node.js 22.12+ and pnpm 11.25.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. For a release:

```sh
pnpm test
pnpm build
pnpm package:pages
```

The application is static. No build-time environment variables or secrets are required. Vite uses relative asset URLs so the app works under `/Chessmate/`.

## Publish within the existing lab website

`pnpm package:pages` builds a self-contained `release/Chessmate/` folder:

```text
Chessmate/
  index.html          # Compiled entry point, ready for GitHub Pages
  favicon.svg
  assets/             # Hashed JS, CSS, and bot worker
  images/             # Compressed hero artwork
  THIRD_PARTY_NOTICES.txt
  README.md
  _source/            # Editable source project; ignored by Jekyll
```

Copy that entire `Chessmate` folder to the root of `kleinlab-yale/kleinlab-yale.github.io` on `main`. Keep the website's existing publishing settings. Do not replace the root `index.html`, `_config.yml`, or unrelated folders. GitHub Pages publishes the app at `https://kleinlab-yale.github.io/Chessmate/`.

The local `release/Chessmate.zip` contains the same folder and can be unzipped before dragging it into GitHub's upload interface. The `_source` directory contains everything needed to rebuild. To update, work inside `_source`, build and package again, then replace only the app's compiled files in `Chessmate/`.

The workflow in this source project's `.github/workflows/deploy.yml` is an optional **standalone-repository** workflow. It is not installed at the lab website's root and does not replace the existing lab website deployment.

## Validation

`pnpm test` runs 23 tests covering move legality, special moves, terminal positions, bot moves and mate detection, rating math, duplicate result protection, reward spending, practice rules, streaks, seasonal availability, room admission, waiting queues, room collisions, slow-connection retries, quick rejoin and disconnect cleanup, invitation delivery, friend persistence, and share cancellation/fallback.

Browser checks exercised profile creation, bot replies, board view switching, saved match results, desktop and phone layouts, and two real PeerJS-connected browser tabs. The named-room update was checked with a guest waiting for host approval, six half-moves, chat delivery, a mutually accepted draw, persistent home rooms, saved friends, a delivered friend invitation, and the offline sharing fallback.

## Project map

- `src/App.jsx` — clubhouse, opponent selection, profile, progression, and wardrobe
- `src/Game.jsx` — game state, worker coordination, result handling, chat
- `src/Board2D.jsx`, `src/Board3D.jsx` — board rendering and interaction
- `src/RoomLobby.jsx` — named home room, waiting list, friends, and sharing interface
- `src/rooms.js` — room protocol, admission handshake, match channels, and friend helpers
- `src/invitations.js` — native sharing and copy fallback
- `src/engine.js` — local alpha-beta search and personality tuning
- `src/profile.js` — persistence helpers, Elo, rewards, and streaks
- `src/data.js` — opponents, outfits, and seasons
- `scripts/package-pages.mjs` — portable deployment package
- `design/asset-prompt.md` — generated illustration provenance and prompt

Built with React, Vite, [chess.js](https://github.com/jhlywa/chess.js), [Three.js](https://threejs.org/), [PeerJS](https://peerjs.com/), and Lucide. The generated hero is an original project asset; avatars, 2D pieces, and 3D pieces are defined in the source.
