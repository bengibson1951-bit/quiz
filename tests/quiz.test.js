import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRun, current, answer, isFinished, summary, grade, shuffleOptions, normalize, levenshtein,
} from "../quiz.js";

// Deterministic PRNG (mulberry32) so failures are reproducible.
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mc = (id, answer = 0) => ({ id, type: "mc", topic: "T", q: id + "?", options: ["A", "B", "C", "D"], answer, explain: "because" });
const tx = (id, answers) => ({ id, type: "text", topic: "T", q: id + "?", answers, explain: "because" });
const byId = (qs) => Object.fromEntries(qs.map((q) => [q.id, q]));

test("createRun shuffles every question in once", () => {
  const qs = Array.from({ length: 10 }, (_, i) => mc("q" + i));
  const run = createRun(qs, seeded(1));
  assert.equal(run.queue.length, 10);
  assert.deepEqual([...run.queue].sort(), qs.map((q) => q.id).sort());
  assert.notDeepEqual(run.queue, qs.map((q) => q.id));
  assert.equal(run.total, 10);
});

test("correct answer removes the question from the cycle", () => {
  const qs = [mc("a"), mc("b"), mc("c")];
  const run = createRun(qs, seeded(2));
  const id = current(run);
  const r = answer(run, byId(qs)[id], "A", seeded(3));
  assert.equal(r.correct, true);
  assert.ok(!run.queue.includes(id));
  assert.deepEqual(run.done, [id]);
  assert.equal(run.attempts[id], 1);
  assert.equal(run.wrong[id] ?? 0, 0);
});

test("wrong answer re-queues, never as the very next question when 3+ remain", () => {
  const qs = Array.from({ length: 6 }, (_, i) => mc("q" + i));
  for (let seed = 0; seed < 200; seed++) {
    const run = createRun(qs, seeded(seed));
    const id = current(run);
    const r = answer(run, byId(qs)[id], "B", seeded(seed + 1000));
    assert.equal(r.correct, false);
    assert.equal(r.correctAnswer, "A");
    assert.equal(r.explain, "because");
    assert.equal(run.queue.length, 6);
    assert.notEqual(run.queue[0], id);
    assert.notEqual(run.queue[1], id);
    assert.equal(run.wrong[id], 1);
  }
});

test("wrong answer with two remaining puts it second", () => {
  const qs = [mc("a"), mc("b")];
  for (let seed = 0; seed < 50; seed++) {
    const run = createRun(qs, seeded(seed));
    const id = current(run);
    answer(run, byId(qs)[id], "D", seeded(seed));
    assert.equal(run.queue.length, 2);
    assert.equal(run.queue[1], id);
  }
});

test("wrong answer on the last remaining question re-asks it", () => {
  const qs = [mc("only")];
  const run = createRun(qs, seeded(5));
  answer(run, qs[0], "C", seeded(6));
  assert.equal(isFinished(run), false);
  assert.equal(current(run), "only");
  answer(run, qs[0], "A", seeded(7));
  assert.equal(isFinished(run), true);
});

test("answer throws if the question is not the current one", () => {
  const qs = [mc("a"), mc("b")];
  const run = createRun(qs, seeded(9));
  const notCurrent = byId(qs)[run.queue[1]];
  assert.throws(() => answer(run, notCurrent, "A", seeded(1)));
});

test("run finishes only when every question has been answered correctly; summary is right", () => {
  const qs = [mc("a"), mc("b"), mc("c")];
  const run = createRun(qs, seeded(8));
  let guard = 0;
  let missedOnce = false;
  while (!isFinished(run) && guard++ < 50) {
    const id = current(run);
    if (id === "b" && !missedOnce) { missedOnce = true; answer(run, byId(qs)[id], "D", seeded(guard)); }
    else answer(run, byId(qs)[id], "A", seeded(guard));
  }
  assert.ok(isFinished(run));
  const s = summary(run);
  assert.equal(s.total, 3);
  assert.equal(s.firstTry, 2);
  assert.equal(s.attempts, 4);
  assert.deepEqual(s.missedIds, ["b"]);
});

test("summary mid-run counts unfinished questions in total but not in firstTry", () => {
  const qs = [mc("a"), mc("b"), mc("c")];
  const run = createRun(qs, seeded(11));
  answer(run, byId(qs)[current(run)], "A", seeded(1));
  const s = summary(run);
  assert.equal(s.total, 3);
  assert.equal(s.firstTry, 1);
  assert.equal(s.attempts, 1);
});

test("grade mc compares option text", () => {
  assert.equal(grade(mc("x", 2), "C").correct, true);
  assert.equal(grade(mc("x", 2), "C").correctAnswer, "C");
  assert.equal(grade(mc("x", 2), "A").correct, false);
});

test("grade text: case, spaces, punctuation and hyphens ignored", () => {
  const q = tx("x", ["Hjärnskakning"]);
  assert.equal(grade(q, "hjärnskakning ").correct, true);
  assert.equal(grade(q, "  HJÄRNSKAKNING. ").correct, true);
  assert.equal(grade(tx("y", ["gångjärnsled"]), "gångjärns-led").correct, true);
  assert.equal(grade(tx("z", ["röda blodkroppar"]), "Röda   blodkroppar!").correct, true);
  assert.equal(grade(q, "").correct, false);
  assert.equal(grade(q, "   ").correct, false);
  assert.equal(grade(q, "näsblod").correct, false);
});

test("grade text: slips allowed by length", () => {
  assert.equal(grade(tx("a", ["ben"]), "bon").correct, false);
  assert.equal(grade(tx("a", ["ben"]), "ben").correct, true);
  assert.equal(grade(tx("b", ["brosk"]), "brosk").correct, true);
  assert.equal(grade(tx("b", ["brosk"]), "brosc").correct, true);
  assert.equal(grade(tx("b", ["brosk"]), "brasc").correct, false);
  assert.equal(grade(tx("c", ["kompression"]), "komprission").correct, true);
  assert.equal(grade(tx("c", ["kompression"]), "kamprission").correct, true);
  assert.equal(grade(tx("c", ["kompression"]), "kamprissian").correct, false);
});

test("grade text accepts any listed spelling and reports the first as canonical", () => {
  const q = tx("x", ["compression", "kompression", "tryck"]);
  const r = grade(q, "tryck");
  assert.equal(r.correct, true);
  assert.equal(r.correctAnswer, "compression");
});

test("shuffleOptions keeps all options and reports the correct text", () => {
  const q = mc("x", 3);
  for (let seed = 0; seed < 50; seed++) {
    const s = shuffleOptions(q, seeded(seed));
    assert.deepEqual([...s.options].sort(), ["A", "B", "C", "D"]);
    assert.equal(s.correct, "D");
  }
});

test("normalize and levenshtein", () => {
  assert.equal(normalize("  Hej,  där-borta! "), "hej där borta");
  assert.equal(normalize(null), "");
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("", "abc"), 3);
  assert.equal(levenshtein("abc", "abc"), 0);
});
