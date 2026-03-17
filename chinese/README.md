# Mandarin Lantern Journey

A static HTML intro Mandarin Chinese learning game designed for GitHub Pages. It teaches:

- pinyin
- tone recognition
- simplified characters
- simple beginner sentences

## Files

- `index.html`: page structure
- `styles.css`: visual design and responsive layout
- `script.js`: course logic, question generation, progression, and local save data

## Local preview

If Python is available:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Course loop

- `Pinyin Path`: sound spelling and tone-marked reading
- `Tone Trail`: tone number and tone mark recognition
- `Hanzi Match`: simplified character matching with pinyin and meaning
- `Sentence Studio`: short greeting and identity sentences
- `Checkpoint Conversation`: mixed review that unlocks the next district

## Profiles

- Each learner can create a same-device profile from the in-game player chooser.
- Profiles are stored locally in the browser.
- Profiles do not sync between devices because the site is fully static.

## Save data

Progress is stored in the browser with `localStorage`, so the course should keep its state between sessions on the same device and browser.
