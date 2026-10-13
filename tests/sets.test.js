import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateSet, parseSet } from "../sets.js";

const good = () => ({
  id: "s", title: "T", lang: "sv",
  questions: [
    { id: "a", type: "mc", topic: "x", q: "?", options: ["1", "2", "3", "4"], answer: 1, explain: "e" },
    { id: "b", type: "text", topic: "x", q: "?", answers: ["yes"], explain: "e" },
  ],
});

test("accepts a good set", () => {
  const v = validateSet(good());
  assert.equal(v.ok, true);
  assert.equal(v.set.id, "s");
});
test("rejects non-objects", () => {
  assert.equal(validateSet(null).ok, false);
  assert.equal(validateSet("x").ok, false);
  assert.equal(validateSet([]).ok, false);
});
test("rejects missing id/title/lang", () => {
  for (const k of ["id", "title", "lang"]) {
    const s = good(); delete s[k];
    assert.match(validateSet(s).error, new RegExp(k));
  }
});
test("rejects missing or empty questions", () => {
  const s = good(); delete s.questions;
  assert.equal(validateSet(s).ok, false);
  const e = good(); e.questions = [];
  assert.equal(validateSet(e).ok, false);
});
test("rejects mc with 3 options", () => {
  const s = good(); s.questions[0].options.pop();
  assert.match(validateSet(s).error, /4 options/);
});
test("rejects answer out of range or non-integer", () => {
  const s = good(); s.questions[0].answer = 4;
  assert.equal(validateSet(s).ok, false);
  const t = good(); t.questions[0].answer = "1";
  assert.equal(validateSet(t).ok, false);
});
test("rejects text with no answers", () => {
  const s = good(); s.questions[1].answers = [];
  assert.equal(validateSet(s).ok, false);
});
test("rejects unknown type and missing q", () => {
  const s = good(); s.questions[0].type = "tf";
  assert.match(validateSet(s).error, /type/);
  const t = good(); t.questions[0].q = "";
  assert.equal(validateSet(t).ok, false);
});
test("rejects duplicate ids", () => {
  const s = good(); s.questions[1].id = "a";
  assert.match(validateSet(s).error, /duplicate/i);
});
test("parseSet reports bad JSON and validates good JSON", () => {
  assert.match(parseSet("{nope").error, /JSON/);
  assert.equal(parseSet(JSON.stringify(good())).ok, true);
});

test("all bundled sets are valid, listed in index.json with the right count", () => {
  const dir = new URL("../sets/", import.meta.url);
  const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));
  assert.ok(index.length >= 1);
  for (const entry of index) {
    const set = JSON.parse(readFileSync(new URL(entry.file, dir), "utf8"));
    const v = validateSet(set);
    assert.equal(v.ok, true, entry.file + ": " + v.error);
    assert.equal(set.id, entry.id);
    assert.equal(set.title, entry.title);
    assert.equal(set.lang, entry.lang);
    assert.equal(set.questions.length, entry.count);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json");
  assert.deepEqual(files.sort(), index.map((e) => e.file).sort());
});

test("bundled mc questions have distinct options and the answer is one of them", () => {
  const dir = new URL("../sets/", import.meta.url);
  const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));
  for (const entry of index) {
    const set = JSON.parse(readFileSync(new URL(entry.file, dir), "utf8"));
    for (const q of set.questions) {
      if (q.type !== "mc") continue;
      assert.equal(new Set(q.options.map((o) => o.toLowerCase())).size, 4, `${entry.file} ${q.id}: duplicate options`);
    }
  }
});
