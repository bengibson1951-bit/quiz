# Pluggquiz / Study Quiz

A study app for school material. A booklet becomes a question set; the app
asks the questions in random order, gives instant right/wrong feedback with
the correct answer and a one-line explanation, and keeps re-asking the ones
you got wrong until every question has been answered correctly.

Live: https://bengibson1951-bit.github.io/quiz/

## Features

- Multiple choice (4 options, shuffled every time) and short typed answers
  (lenient spelling: case, punctuation and one or two typos are forgiven).
- One cycle per round: wrong answers come back later in the same round; the
  round ends when the queue is empty.
- Results: first-try percentage with stars, total answers, list of missed
  questions by topic. "Only the ones I missed" replays just those.
- Progress survives a refresh or a quit (Continue card on Home, one per set).
- EN/SV interface; questions stay in the material's language.
- Installable PWA, works offline after the first visit.
- Question sets are bundled JSON files or pasted into Settings → Import.

## Run locally

Any static server works, e.g. from this folder:

```bash
npx -y serve . -l 4330
```

Then open http://localhost:4330. (In the parent folder's `.claude/launch.json`
this is the `quiz` preview entry.)

## Test

```bash
npm test
```

```bash
npm run validate
```

`npm test` runs the engine and set-validation tests with node:test.
`npm run validate` checks every file in `sets/` against `sets/index.json`.

## Adding material

See [docs/QUESTION-SETS.md](docs/QUESTION-SETS.md) for the JSON format and a
Claude prompt that turns photos of a booklet into a set. Bundled sets go in
`sets/` plus an entry in `sets/index.json`; remember to add the file to
`sw.js` and bump its `CACHE` name before deploying.

## Deploy

GitHub Pages serves `main` at the repo root. Commit, bump `CACHE` in `sw.js`
if any shipped file changed, and push.

## Files

- `index.html`, `style.css`, `app.js` — the UI
- `quiz.js` — pure quiz engine (queue, grading, summary)
- `sets.js` — set loading and validation
- `store.js` — localStorage (`quiz.v1`)
- `i18n.js` — EN/SV strings
- `sets/` — bundled question sets
- `tests/` — node:test suites
- `docs/superpowers/` — design spec and implementation plan
