# Question sets

A question set is one JSON file. The app ships with sets in `sets/` and can
also import a set pasted into **Settings → Import**.

## Format

```json
{
  "id": "idrott-ak6-anatomi",
  "title": "Anatomi, Fysiologi, Kost och Idrottsskador",
  "subtitle": "År 6 · Idrott och Hälsa",
  "lang": "sv",
  "created": "2026-10-13",
  "questions": [
    {
      "id": "q01", "type": "mc", "topic": "Anatomi – Skelettet",
      "q": "Ungefär hur många ben består skelettet av?",
      "options": ["Drygt 206", "Drygt 106", "Drygt 306", "Drygt 506"],
      "answer": 0,
      "explain": "Skelettet består av drygt 206 ben och är levande vävnad."
    },
    {
      "id": "q02", "type": "text", "topic": "Behandling – PRICE",
      "q": "Vad står C för i PRICE?",
      "answers": ["compression", "kompression", "tryck"],
      "explain": "C = Compression (tryck): vira ett elastiskt förband stramt direkt."
    }
  ]
}
```

Rules:

- `id`, `title`, `lang` and a non-empty `questions` array are required.
  `subtitle` and `created` are optional.
- Every question needs a unique `id`, a `topic`, the question text `q`, a
  `type` of `mc` or `text`, and a one-sentence `explain` taken from the
  material (shown after every answer).
- `mc`: exactly 4 `options` and `answer` = index (0–3) of the correct one as
  written. The app shuffles the options every time the question is shown, so
  putting the right answer first is fine.
- `text`: `answers` lists accepted spellings. The first one is shown as the
  correct answer. Matching ignores case, spaces, punctuation and hyphens, and
  allows one typo for answers of 5–9 letters and two for 10 or more.
- Questions are written in the language of the material. The app's own
  buttons are translated separately (EN/SV).

## Adding a bundled set

1. Save the file as `sets/<id>.json`.
2. Add an entry to `sets/index.json` with `id`, `file`, `title`, `subtitle`,
   `lang` and `count` (number of questions).
3. Run `npm run validate` and `npm test`.
4. Add the file to `ASSETS` in `sw.js` and bump `CACHE` (e.g. `quiz-v2`).
5. Commit and push; GitHub Pages redeploys automatically.

## Importing in the app

Settings → Import: paste the JSON and tap Import. The set is stored in that
browser's localStorage and listed under the bundled sets. Imported sets can be
deleted from the same screen.

## Generating a set with Claude

Take clear photos of every page of the material and give Claude this prompt
together with the photos (in Claude Code or a normal Claude chat). Paste the
reply into the app or save it as a file.

```
Read all the pages in these photos. They are study material for a year 6 pupil.
Create a quiz question set as JSON in exactly this format, and reply with the
JSON only, no explanation:

{ "id": "<short-kebab-case-id>", "title": "<title from the material>",
  "subtitle": "<year / subject>", "lang": "<sv or en: the language of the material>",
  "created": "<today YYYY-MM-DD>",
  "questions": [
    { "id": "q01", "type": "mc", "topic": "<section heading>", "q": "...",
      "options": ["correct", "wrong", "wrong", "wrong"], "answer": 0, "explain": "..." },
    { "id": "q02", "type": "text", "topic": "<section heading>", "q": "...",
      "answers": ["canonical answer", "other accepted spelling"], "explain": "..." }
  ] }

Rules:
- Cover every section and every fact a test could ask about; aim for 45–80 questions.
- About 70% "mc" and 30% "text".
- Questions and answers in the same language as the material.
- "mc": exactly 4 options, all plausible and of similar length, only one correct,
  and "answer" is the index of the correct option.
- "text": the answer is a single word or short phrase that the pupil can type.
  List spelling variants and, where the material gives both, Swedish and English
  forms (e.g. "compression", "kompression", "tryck").
- "explain": one sentence from the material that states the fact.
- Ask each fact only once. Never invent facts that are not in the material.
- "topic": the section heading the fact comes from, e.g. "Anatomi – Leder".
- ids q01, q02, … and valid JSON (double quotes, no trailing commas).
```
