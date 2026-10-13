// Pure quiz engine. No DOM, no storage. `rng` is a () => [0, 1) function.
//
// A run is one cycle through a question set: every question is asked in
// random order; a wrong answer puts the question back later in the queue, so
// the cycle only ends once every question has been answered correctly.

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createRun(questions, rng = Math.random) {
  const ids = questions.map((q) => q.id);
  let queue = shuffle(ids, rng);
  if (ids.length > 1 && queue.every((id, i) => id === ids[i])) queue = shuffle(ids, rng);
  return { queue, done: [], attempts: {}, wrong: {}, total: ids.length };
}

export const current = (run) => run.queue[0];
export const isFinished = (run) => run.queue.length === 0;

export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[-‐‑‒–—_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function allowedSlips(len) {
  return len >= 10 ? 2 : len >= 5 ? 1 : 0;
}

export function grade(question, given) {
  const explain = question.explain ?? "";
  if (question.type === "mc") {
    const correctAnswer = question.options[question.answer];
    return { correct: given === correctAnswer, correctAnswer, explain };
  }
  const g = normalize(given);
  const correctAnswer = question.answers[0];
  let correct = false;
  if (g) {
    for (const a of question.answers) {
      const n = normalize(a);
      if (g === n || levenshtein(g, n) <= allowedSlips(n.length)) { correct = true; break; }
    }
  }
  return { correct, correctAnswer, explain };
}

export function shuffleOptions(question, rng = Math.random) {
  return { options: shuffle(question.options, rng), correct: question.options[question.answer] };
}

export function answer(run, question, given, rng = Math.random) {
  const id = question.id;
  if (run.queue[0] !== id) throw new Error("answer(): question is not current");
  const result = grade(question, given);
  run.attempts[id] = (run.attempts[id] ?? 0) + 1;
  run.queue.shift();
  if (result.correct) {
    run.done.push(id);
  } else {
    run.wrong[id] = (run.wrong[id] ?? 0) + 1;
    const len = run.queue.length;
    if (len >= 2) {
      // Insert at index 2..len so at least two other questions come first.
      const pos = 2 + Math.floor(rng() * (len - 1));
      run.queue.splice(pos, 0, id);
    } else {
      run.queue.push(id);
    }
  }
  return result;
}

export function summary(run) {
  const seen = [...new Set([...run.done, ...run.queue])];
  const firstTry = seen.filter((id) => !(run.wrong[id] > 0) && run.done.includes(id)).length;
  const attempts = Object.values(run.attempts).reduce((a, b) => a + b, 0);
  const missedIds = seen.filter((id) => run.wrong[id] > 0);
  return { total: run.total, firstTry, attempts, missedIds };
}
