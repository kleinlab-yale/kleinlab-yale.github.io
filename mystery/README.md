# Kimmy Finch Mysteries: The Picnic Pet

A first playable demo for a bright kid-friendly point-and-click detective series.

Kimmy Finch is a clever adopted girl who founded the Finch Street Mystery Club. Each chapter solves a neighbor's case, while tiny clues slowly build toward Kimmy's own long-running question: who was she before she was adopted?

## What is in this demo

- A cheerful Case 01 about finding Pickles, Lila's missing pet rabbit, before the town picnic.
- Bright generated locations: tree-fort mystery HQ, bakery patio, picnic park, and community garden.
- Kimmy portrait, three NPC portraits, a cute Pickles close-up, and zoomed-in clue art.
- Friendly NPC dialogue written for future voice acting. The rejected local system-voice experiment is not exposed in the demo UI.
- Zork-style action menus on hotspots: inspect, interview, collect, try a wrong move, or unlock a better option after finding the right clue.
- A gated case flow: Lila opens the case, Mrs. Poppy unlocks the bakery evidence, the bakery trail unlocks the park, the park prints unlock the garden, and Mr. Basil unlocks the final rabbit-coaxing puzzle.
- A notebook, clue bag, long-mystery panel, progress meter, story button, reset button, and map navigation.
- Serialized clues: Kimmy notices a crescent-and-star mark like her locket, Mrs. Poppy nearly calls her Mara, and an old photograph shows someone who looks like Kimmy.
- A Case 02 teaser for Briar Lane: a haunted-house setup that should point toward Kimmy's relatives just enough to be intriguing, not enough to solve the family mystery.
- `voice-script.json` defines the character lines and target filenames for future proper voice assets.
- `story-bible.md` captures the longer family-mystery arc and early chapter direction.

## How to run

Open `index.html` in a browser, or serve the folder with a tiny local server:

```bash
python3 -m http.server 8001
```

Then visit `http://127.0.0.1:8001/mystery/`.

## Voice status

Voice acting is currently disabled in the live demo because local macOS English TTS did not meet the quality bar for character dialogue.

The `/mathidle` game works differently: it plays short pre-recorded Mandarin `.wav` files for lesson prompts, then falls back to a Mandarin browser voice only when needed. That approach is good for short language-listening phrases, but it does not create believable English character acting for a story mystery game.

The mystery game should use the same file-first playback pattern once there are better assets: recorded lines, licensed voice clips, or a high-quality local voice model. The current local generator remains only as an experimental scratch tool:

```bash
node mystery/tools/generate-voices.mjs --dry-run
```

## Asset notes

The current Case 01 art and earlier Moonwake Observatory concept art are both in `assets/`. The live demo uses the brighter Case 01 assets; the Moonwake art is preserved as a possible later chapter direction.
