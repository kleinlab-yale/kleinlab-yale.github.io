# Kimmy Finch Mysteries

A playable demo for a bright kid-friendly point-and-click detective series.

Kimmy Finch is a clever adopted girl who founded the Finch Street Mystery Club. Each chapter solves a neighbor's case, while tiny clues slowly build toward Kimmy's own long-running question: who was she before she was adopted?

## What is in this demo

- A cheerful Case 01 about finding Pickles, Lila's missing pet rabbit, before the town picnic.
- A linear bridge from Case 01 into Case 02: Lila pays Kimmy five dollars, then mentions that she feared Pickles had gone near Briar Lane House.
- Case 02, a not-so-haunted-house mystery about who is sneaking into an abandoned house at night.
- A playable Case 03 slice at Moonwake Observatory, where Kimmy investigates impossible flashing lights and opens an archive with clues from earlier cases.
- Generated locations: tree-fort mystery HQ, bakery patio, picnic park, community garden, Briar Lane exterior, foyer, piano room, old girls' room, Moonwake gate, workshop, dome, and archive.
- Kimmy portrait, NPC portraits, a cute Pickles close-up, Case 02 character art, Case 03 observatory art, case-ending story images, and zoomed-in clue art.
- A richer story intro with Kimmy at home with her adoptive parents, Kimmy and Lila in the tree-fort club, and a clearer explanation of Kimmy's background before the first case begins.
- Friendly NPC dialogue written for future voice acting. The rejected local system-voice experiment is not exposed in the demo UI.
- Zork-style action menus on hotspots: inspect, interview, collect, try a wrong move, or unlock a better option after finding the right clue.
- A clearer guided play layer: the current next lead appears on the scene, the next useful hotspot glows, map buttons say when they are current/next/locked, and choices are tagged as best next step, try-and-learn, needs clue, or costs XP.
- A gated case flow: Lila opens the case, Mrs. Poppy unlocks the bakery evidence, the bakery trail unlocks the park, the park prints unlock the garden, and Mr. Basil unlocks the final rabbit-coaxing puzzle.
- Detective XP starts at 100. Evidence-based choices add XP, while guesses, rushing, loud shortcuts, or wrong puzzle sequences lower XP a little with an explanation.
- A first object mini-game: the Briar Lane nursery drawer contains a moon-maze toy. Solving it reveals the 17-inch height-mark sketch needed later for the Moonwake archive code.
- A notebook, clue bag, long-mystery panel, progress meter, story button, reset button, and map navigation.
- A satchel loop where objects from earlier cases matter later: Pickles' bell, Lila's five-dollar fee, the 17-inch Briar Lane height-mark sketch, Mrs. Wren's star chart, and the crescent observatory token all feed Case 03.
- Serialized clues: Kimmy notices a crescent-and-star mark like her locket, Mrs. Poppy nearly calls her Mara, an old photograph shows someone who looks like Kimmy, Briar Lane holds a portrait and old room that feel personal, and Moonwake's ledger hints that Lila Vale may be Kimmy's cousin.
- `voice-script.json` defines the character lines and target filenames for future proper voice assets.
- `story-bible.md` captures the longer family-mystery arc and early chapter direction.

## How to run

Open `index.html` in a browser, or serve the folder with a tiny local server:

```bash
python3 -m http.server 8001
```

Then visit `http://127.0.0.1:8001/mystery/`.

## Save and refresh behavior

The game uses a stable `localStorage` save key, `kimmy-finch-mysteries-save`, so refreshing on iPad should load updated CSS/JS while preserving progress. Older `kimmy-finch-mysteries-v6` saves migrate automatically. The Reset button intentionally clears both the current and legacy save keys.

## Voice status

Voice acting is currently disabled in the live demo because local macOS English TTS did not meet the quality bar for character dialogue.

The `/mathidle` game works differently: it plays short pre-recorded Mandarin `.wav` files for lesson prompts, then falls back to a Mandarin browser voice only when needed. That approach is good for short language-listening phrases, but it does not create believable English character acting for a story mystery game.

The mystery game should use the same file-first playback pattern once there are better assets: recorded lines, licensed voice clips, or a high-quality local voice model. The current local generator remains only as an experimental scratch tool:

```bash
node mystery/tools/generate-voices.mjs --dry-run
```

## Asset notes

The current Case 01, Case 02, and early Case 03 art are live in the demo. Moonwake Observatory uses the earlier observatory concept assets, while the haunted-house chapter uses separate Briar Lane assets.
