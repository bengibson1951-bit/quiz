// Question-set loading and validation. See docs/QUESTION-SETS.md for the format.

export function validateSet(s) {
  const fail = (error) => ({ ok: false, error });
  if (!s || typeof s !== "object" || Array.isArray(s)) return fail("Not an object");
  for (const k of ["id", "title", "lang"]) {
    if (typeof s[k] !== "string" || !s[k]) return fail(`Missing "${k}"`);
  }
  if (!Array.isArray(s.questions) || s.questions.length === 0) return fail('Missing "questions"');
  const ids = new Set();
  for (const [i, q] of s.questions.entries()) {
    const where = `question ${i + 1}`;
    if (!q || typeof q !== "object") return fail(`${where}: not an object`);
    if (typeof q.id !== "string" || !q.id) return fail(`${where}: missing id`);
    if (ids.has(q.id)) return fail(`${where}: duplicate id "${q.id}"`);
    ids.add(q.id);
    if (typeof q.q !== "string" || !q.q) return fail(`${where}: missing q`);
    if (q.type === "mc") {
      const okOptions = Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every((o) => typeof o === "string" && o);
      if (!okOptions) return fail(`${where}: mc needs exactly 4 options`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return fail(`${where}: answer must be 0-3`);
    } else if (q.type === "text") {
      const okAnswers = Array.isArray(q.answers) && q.answers.length > 0 &&
        q.answers.every((a) => typeof a === "string" && a);
      if (!okAnswers) return fail(`${where}: text needs answers`);
    } else {
      return fail(`${where}: type must be mc or text`);
    }
  }
  return { ok: true, set: s };
}

export function parseSet(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "Invalid JSON: " + e.message };
  }
  return validateSet(obj);
}

export async function loadIndex() {
  const r = await fetch("sets/index.json");
  if (!r.ok) throw new Error("sets/index.json " + r.status);
  return r.json();
}

export async function loadSet(file) {
  const r = await fetch("sets/" + file);
  if (!r.ok) throw new Error(file + " " + r.status);
  return r.json();
}
