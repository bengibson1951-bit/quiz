# Study Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static PWA that quizzes Ben's daughter on a bundled or imported question set until every question has been answered correctly, with instant feedback and stored results.

**Architecture:** Pure ES modules (`quiz.js` engine, `sets.js` loading/validation, `store.js` persistence, `i18n.js`) driven by one `app.js` that renders four `<section data-screen>` blocks in `index.html`. Question sets are JSON files under `sets/` plus pasted imports in localStorage. No build step; node:test for the pure modules.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), node:test, `npx serve` for preview, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-13-study-quiz-design.md`

## Global Constraints

- No AI calls, no API keys, no network calls other than fetching the app's own files.
- Static files only; must work when opened from GitHub Pages at `/quiz/` (relative paths everywhere).
- Mobile-first, max width 480px, 16px gutters, kid-friendly style matching `../mathsprint/style.css`.
- EN/SV UI strings via `i18n.js`; question content stays in the set's own language.
- localStorage key `quiz.v1`; service worker cache `quiz-v1`.
- Set JSON format exactly as in the spec (`type` is `mc` or `text`).

## Review Focus

1. Wrong answer when only one question remains: it must be re-asked immediately (not dropped, not crash). Test in Task 1.
2. A `text` answer typed with trailing space, different case or a missing hyphen must be accepted. Test in Task 1.
3. A short typed answer (3 letters) must not accept a one-letter slip. Test in Task 1.
4. Pasted JSON that is valid JSON but not a valid set must be rejected with a message, never half-imported. Test in Task 2.
5. Refreshing the page mid-quiz must resume at the same question with the same option order. `resume` stores `shuffled`; manual check in Task 6.

---

### Task 1: Quiz engine

**Files:** Create `package.json`, `quiz.js`; Test `tests/quiz.test.js`.

**Produces:** `createRun(questions, rng)`, `current(run)`, `answer(run, question, given, rng)`, `isFinished(run)`, `summary(run)`, `grade(question, given)`, `shuffleOptions(question, rng)`, `normalize(s)`, `levenshtein(a, b)`, `shuffle(arr, rng)`.
- `run = { queue: string[], done: string[], attempts: {[id]: n}, wrong: {[id]: n}, total }`
- `answer()` returns `{ correct, correctAnswer, explain }`; `summary()` returns `{ total, firstTry, attempts, missedIds }`.

- [ ] Step 1: `package.json` with `"type": "module"`, scripts `test: node --test`, `validate: node tools/validate-sets.js`.
- [ ] Step 2: Write failing tests in `tests/quiz.test.js` (seeded mulberry32 PRNG as in `../mathsprint/tests/game.test.js`): createRun shuffles all ids once; correct removes from queue and records attempt; wrong re-queues and never lands at index 0 or 1 when 3+ remain (loop 200 seeds); wrong on last remaining question re-asks it; run finishes only when all correct and summary gives total/firstTry/attempts/missedIds; grade mc by option text; grade text ignores case, spaces, punctuation, hyphens, rejects empty and different; slips by length (3 letters exact, 5–9 one slip, 10+ two slips); any listed spelling accepted and first reported as canonical; shuffleOptions keeps all options and reports correct text; normalize and levenshtein basics.
- [ ] Step 3: `npm test` → fails (module not found).
- [ ] Step 4: Implement `quiz.js` per spec: `shuffle` (Fisher–Yates), `createRun` (re-shuffle once if order is unchanged), `normalize` (lowercase, hyphens/dashes/underscores → space, strip non letter/number/space, collapse spaces, trim), `levenshtein` (two-row DP), `allowedSlips(len)` = 2 if ≥10, 1 if ≥5, else 0, `grade`, `shuffleOptions`, `answer` (shift head; correct → done; wrong → wrong++ and splice back at position `2 + floor(rng*(len-1))` when `len >= 2` else push), `summary`.
- [ ] Step 5: `npm test` → pass.
- [ ] Step 6: `git init`, repo-local identity Ben Gibson / bengibson1951@gmail.com, commit `feat: quiz engine with tests`.

---

### Task 2: Sets module, bundled set, validator

**Files:** Create `sets.js`, `sets/index.json`, `sets/idrott-ak6-anatomi.json`, `tools/validate-sets.js`, `docs/QUESTION-SETS.md`; Test `tests/sets.test.js`.

**Produces:** `validateSet(obj)` → `{ ok: true, set }` | `{ ok: false, error }`; `parseSet(text)` (wraps JSON.parse); `loadIndex()`; `loadSet(file)`.

- [ ] Step 1: Failing tests: accepts a good set; rejects missing questions; rejects mc with 3 options (error mentions "4 options"); rejects answer out of range; rejects text with no answers; rejects duplicate ids; parseSet reports bad JSON; every file in `sets/` except index is listed in `index.json`, validates, and `count` matches.
- [ ] Step 2: `npm test` → fails.
- [ ] Step 3: Implement `sets.js`: required strings id/title/lang, non-empty questions array, per question id (unique), q, type mc (exactly 4 non-empty string options, integer answer 0–3) or text (non-empty answers array of strings).
- [ ] Step 4: Write `sets/idrott-ak6-anatomi.json` from the booklet photos: ~50 Swedish questions over sections 1–6, ~70% mc / 30% text, text answers with spelling and SV/EN variants where the booklet gives both. `sets/index.json` with one entry and a matching `count`.
- [ ] Step 5: `tools/validate-sets.js`: validates every set file, checks index membership and count, prints ok/FAIL per file, exit 1 on failure.
- [ ] Step 6: `docs/QUESTION-SETS.md`: format, rules, adding a bundled set (file + index + validate + bump sw), importing in-app, and a generation prompt for Claude.
- [ ] Step 7: `npm test` + `npm run validate` pass; commit `feat: sets module, first question set, validator`.

---

### Task 3: Store and i18n

**Files:** Create `store.js`, `i18n.js`.

- [ ] Step 1: `store.js`: `KEY = "quiz.v1"`, `load()` merges defaults `{ lang: "sv", imported: {}, history: {}, resume: null }`, `save(state)`; both wrapped in try/catch.
- [ ] Step 2: `i18n.js`: `STRINGS.en` / `STRINGS.sv`, `t(lang, key, vars)` with `{x}` substitution, `applyI18n(lang)` filling `[data-i18n]` text and `[data-i18n-placeholder]`.
- [ ] Step 3: Commit `feat: store and i18n`.

---

### Task 4: Shell, styles, PWA

**Files:** Create `index.html`, `style.css`, `manifest.json`, `sw.js`, `icons/*`; Modify `../.claude/launch.json`.

- [ ] Step 1: `index.html` with sections home / quiz / results / settings and the element ids used by `app.js`.
- [ ] Step 2: `style.css` adapted from mathsprint, mint theme, option button states (`.opt.right`, `.opt.wrong`, `.opt.dim`), feedback banner, stars, missed list.
- [ ] Step 3: `manifest.json`, `icons/icon.svg` + PNG 192/512, `sw.js` with `CACHE = "quiz-v1"` and the shell + sets in ASSETS.
- [ ] Step 4: launch.json entry `quiz` on port 4330.
- [ ] Step 5: Commit `feat: app shell, styles, PWA files`.

---

### Task 5: app.js

- [ ] Step 1: Boot (load state, i18n, fetch index + sets + imported), Home (Continue card when resume exists, one card per set with count, last result and best), `startRun(setId, mode)`, `showQuestion()` (mc: `shuffled[id] ??= shuffleOptions(q).options`; text: input + Check, Enter submits), answering (disable inputs, colour buttons, feedback banner with correct answer + explanation, Next), finish (history update, clear resume, Results with pct/stars/missed by topic, Again / Only missed / Home), Quit with confirm, Settings (lang, import via `parseSet`, delete imported, clear results).
- [ ] Step 2: Commit `feat: app screens and quiz flow`.

---

### Task 6: Verify in browser, README, deploy

- [ ] Step 1: `preview_start` quiz; walk through every flow incl. refresh-resume and import of valid/broken JSON; check console; mobile screenshot.
- [ ] Step 2: `README.md`.
- [ ] Step 3: Commit; `gh repo create bengibson1951-bit/quiz --public --source . --push`; enable Pages from main root; verify the live URL.
- [ ] Step 4: Memory note `project_quiz.md` + index line.
