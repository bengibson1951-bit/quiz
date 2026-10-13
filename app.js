import { createRun, current, answer, isFinished, summary, shuffleOptions } from "./quiz.js";
import { loadIndex, loadSet, parseSet } from "./sets.js";
import { load, save } from "./store.js";
import { t, applyI18n } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = load();
let sets = [];          // [{ id, set, bundled }]
let active = null;      // { setId, mode, run, shuffled, answered }

const L = () => state.lang;
const tr = (key, vars) => t(L(), key, vars);

// ---------- screens ----------

function show(name) {
  document.querySelectorAll("section[data-screen]").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
  window.scrollTo(0, 0);
}

function setLang(lang) {
  state.lang = lang;
  save(state);
  applyI18n(lang);
  document.title = tr("appName");
  renderHome();
  renderSettings();
}

// ---------- sets ----------

function findSet(id) {
  return sets.find((s) => s.id === id)?.set ?? null;
}

function allSets() {
  const bundled = sets.filter((s) => s.bundled);
  const imported = Object.values(state.imported).map((set) => ({ id: set.id, set, bundled: false }));
  return [...bundled, ...imported];
}

function refreshSetList(bundled) {
  sets = [...bundled, ...Object.values(state.imported).map((set) => ({ id: set.id, set, bundled: false }))];
}

async function boot() {
  applyI18n(L());
  document.title = tr("appName");
  let bundled = [];
  try {
    const index = await loadIndex();
    const loaded = await Promise.all(index.map((e) => loadSet(e.file)));
    bundled = loaded.map((set) => ({ id: set.id, set, bundled: true }));
  } catch (e) {
    console.error(e);
    $("home-error").textContent = tr("loadError");
    $("home-error").hidden = false;
  }
  refreshSetList(bundled);
  renderHome();
  renderSettings();
  show("home");
}

// ---------- home ----------

function pct(first, total) {
  return total ? Math.round((first / total) * 100) : 0;
}

function renderHome() {
  const resumeBox = $("home-resume");
  resumeBox.innerHTML = "";
  let dirty = false;
  for (const [setId, r] of Object.entries(state.resume)) {
    const set = findSet(setId);
    if (!set) { delete state.resume[setId]; dirty = true; continue; }
    const btn = document.createElement("button");
    btn.className = "set-card resume";
    btn.innerHTML = `<span class="set-icon">▶️</span>
      <span class="set-text"><strong>${esc(tr("continueRun"))}</strong>
      <small>${esc(set.title)} · ${esc(tr("continueSub", { done: r.run.done.length, total: r.run.total }))}</small></span>
      <span class="set-arrow">›</span>`;
    btn.addEventListener("click", () => resumeRun(setId));
    resumeBox.appendChild(btn);
  }
  if (dirty) save(state);

  const box = $("home-sets");
  box.innerHTML = "";
  for (const { set } of allSets()) {
    const h = state.history[set.id];
    const btn = document.createElement("button");
    btn.className = "set-card";
    const stats = h
      ? `<span class="set-stats"><small>${esc(tr("best").split(":")[0])}</small><b>${h.bestPct != null ? h.bestPct + "%" : "–"}</b></span>`
      : "";
    const line2 = h ? tr("lastResult", { first: h.last.firstTry, total: h.last.total }) : tr("noResult");
    btn.innerHTML = `<span class="set-icon">📖</span>
      <span class="set-text"><strong>${esc(set.title)}</strong>
      <small>${esc(set.subtitle ?? "")}${set.subtitle ? " · " : ""}${esc(tr("questions", { n: set.questions.length }))}</small>
      <small>${esc(line2)}</small></span>${stats}`;
    btn.addEventListener("click", () => startRun(set.id, "full"));
    box.appendChild(btn);
  }
}

// ---------- quiz ----------

function questionsFor(set, mode) {
  if (mode === "missed") {
    const ids = new Set(state.history[set.id]?.last?.missedIds ?? []);
    const qs = set.questions.filter((q) => ids.has(q.id));
    if (qs.length) return qs;
  }
  return set.questions;
}

function startRun(setId, mode) {
  const set = findSet(setId);
  if (!set) return;
  const qs = questionsFor(set, mode);
  active = { setId, mode, run: createRun(qs), shuffled: {}, answered: false };
  persistRun();
  show("quiz");
  showQuestion();
}

function resumeRun(setId) {
  const r = state.resume[setId];
  if (!r || !findSet(setId)) return;
  active = { setId, mode: r.mode, run: r.run, shuffled: r.shuffled ?? {}, answered: false };
  show("quiz");
  showQuestion();
}

function persistRun() {
  if (active) state.resume[active.setId] = { mode: active.mode, run: active.run, shuffled: active.shuffled };
  save(state);
}

function currentQuestion() {
  const set = findSet(active.setId);
  const id = current(active.run);
  return set.questions.find((q) => q.id === id);
}

function showQuestion() {
  const { run } = active;
  if (isFinished(run)) return finishRun();
  const q = currentQuestion();
  if (!q) { // set changed under us; abandon
    active = null; persistRun(); renderHome(); show("home"); return;
  }
  active.answered = false;

  $("progress-bar").style.width = `${(run.done.length / run.total) * 100}%`;
  $("remaining").textContent = tr("remaining", { n: run.total - run.done.length });
  $("q-topic").textContent = q.topic ?? "";
  $("q-text").textContent = q.q;
  const card = $("q-card");
  card.classList.remove("right", "wrong");
  $("feedback").hidden = true;
  $("feedback").classList.remove("right", "wrong");
  $("btn-next").hidden = true;

  const answers = $("answers");
  const form = $("text-form");
  answers.innerHTML = "";
  if (q.type === "mc") {
    form.hidden = true;
    if (!active.shuffled[q.id]) active.shuffled[q.id] = shuffleOptions(q).options;
    active.shuffled[q.id].forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.type = "button";
      b.dataset.value = opt;
      b.innerHTML = `<span class="letter">${"ABCD"[i]}</span><span>${esc(opt)}</span>`;
      b.addEventListener("click", () => submit(opt));
      answers.appendChild(b);
    });
    persistRun();
  } else {
    form.hidden = false;
    const input = $("text-input");
    input.value = "";
    input.disabled = false;
    $("btn-check").disabled = false;
    setTimeout(() => input.focus(), 50);
  }
}

function submit(given) {
  if (!active || active.answered) return;
  const q = currentQuestion();
  if (!q) return;
  active.answered = true;
  const result = answer(active.run, q, given);
  persistRun();

  const card = $("q-card");
  card.classList.add(result.correct ? "right" : "wrong");

  if (q.type === "mc") {
    $("answers").querySelectorAll(".opt").forEach((b) => {
      b.disabled = true;
      const v = b.dataset.value;
      if (v === result.correctAnswer) b.classList.add("right");
      else if (v === given) b.classList.add("wrong");
      else b.classList.add("dim");
    });
  } else {
    $("text-input").disabled = true;
    $("btn-check").disabled = true;
  }

  const fb = $("feedback");
  fb.classList.add(result.correct ? "right" : "wrong");
  $("fb-title").textContent = result.correct ? tr("right") : tr("wrong");
  let answerHtml = `${esc(tr("correctIs"))} <b>${esc(result.correctAnswer)}</b>`;
  if (!result.correct && q.type === "text" && given.trim()) {
    answerHtml += `<br><span class="muted-light">${esc(tr("youWrote"))} ${esc(given.trim())}</span>`;
  }
  $("fb-answer").innerHTML = answerHtml;
  $("fb-explain").textContent = result.explain || "";
  $("fb-explain").hidden = !result.explain;
  fb.hidden = false;

  const next = $("btn-next");
  next.hidden = false;
  setTimeout(() => next.focus(), 50);
}

function next() {
  if (!active || !active.answered) return;
  showQuestion();
}

function finishRun() {
  const set = findSet(active.setId);
  const s = summary(active.run);
  const prev = state.history[set.id];
  const entry = {
    last: { date: new Date().toISOString().slice(0, 10), total: s.total, firstTry: s.firstTry, attempts: s.attempts, missedIds: s.missedIds },
    bestPct: prev?.bestPct ?? null,
  };
  if (active.mode === "full") {
    // Best is only tracked for full runs, so a 3-question "missed" round can't claim 100%.
    entry.bestPct = Math.max(prev?.bestPct ?? 0, pct(s.firstTry, s.total));
  } else if (prev?.last) {
    // A "missed" round keeps the full run's score; only the still-missed list is updated.
    entry.last = { ...prev.last, missedIds: s.missedIds };
  }
  state.history[set.id] = entry;
  delete state.resume[set.id];
  save(state);
  renderResults(set, s);
  active = null;
  show("results");
}

function renderResults(set, s) {
  const p = pct(s.firstTry, s.total);
  const stars = p >= 90 ? 3 : p >= 70 ? 2 : 1;
  $("res-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  $("res-pct").textContent = p + "%";
  $("res-first").textContent = tr("firstTry", { first: s.firstTry, total: s.total });
  $("res-attempts").textContent = tr("attempts", { n: s.attempts });
  $("res-msg").textContent = tr("stars" + stars);

  const ul = $("res-missed");
  ul.innerHTML = "";
  if (!s.missedIds.length) {
    ul.innerHTML = `<li class="none">${esc(tr("noMissed"))}</li>`;
  } else {
    const missed = set.questions.filter((q) => s.missedIds.includes(q.id));
    let lastTopic = null;
    for (const q of missed) {
      if (q.topic !== lastTopic) {
        ul.insertAdjacentHTML("beforeend", `<li class="topic">${esc(q.topic ?? "")}</li>`);
        lastTopic = q.topic;
      }
      const ans = q.type === "mc" ? q.options[q.answer] : q.answers[0];
      ul.insertAdjacentHTML("beforeend",
        `<li><span class="mq">${esc(q.q)}</span><span class="ma">${esc(ans)}</span>${q.explain ? `<span class="me">${esc(q.explain)}</span>` : ""}</li>`);
    }
  }
  $("btn-missed").hidden = !s.missedIds.length;
  $("btn-missed").onclick = () => startRun(set.id, "missed");
  $("btn-again").onclick = () => startRun(set.id, "full");
}

function quit() {
  if (!active) return;
  if (!confirm(tr("quitConfirm"))) return;
  // Keep the run resumable from Home.
  persistRun();
  active = null;
  renderHome();
  show("home");
}

// ---------- settings ----------

function renderSettings() {
  const ul = $("imported-list");
  ul.innerHTML = "";
  const imported = Object.values(state.imported);
  if (!imported.length) {
    ul.innerHTML = `<li class="none">${esc(tr("noImported"))}</li>`;
    return;
  }
  for (const set of imported) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc(set.title)}<small>${esc(tr("questions", { n: set.questions.length }))}</small></span>`;
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = tr("delete");
    del.addEventListener("click", () => {
      if (!confirm(tr("deleteConfirm", { title: set.title }))) return;
      delete state.imported[set.id];
      delete state.history[set.id];
      delete state.resume[set.id];
      save(state);
      refreshSetList(sets.filter((s) => s.bundled));
      renderSettings();
      renderHome();
    });
    li.appendChild(del);
    ul.appendChild(li);
  }
}

function importSet() {
  const msg = $("import-msg");
  const text = $("import-text").value.trim();
  const v = parseSet(text);
  msg.hidden = false;
  if (!v.ok) {
    msg.className = "import-msg err";
    msg.textContent = tr("importError", { error: v.error });
    return;
  }
  const set = v.set;
  if (sets.some((s) => s.bundled && s.id === set.id)) {
    msg.className = "import-msg err";
    msg.textContent = tr("importError", { error: `id "${set.id}" is already a bundled set` });
    return;
  }
  state.imported[set.id] = set;
  delete state.history[set.id];
  delete state.resume[set.id];
  save(state);
  refreshSetList(sets.filter((s) => s.bundled));
  $("import-text").value = "";
  msg.className = "import-msg ok";
  msg.textContent = tr("importOk", { title: set.title, n: set.questions.length });
  renderSettings();
  renderHome();
}

// ---------- wiring ----------

document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
$("btn-settings").addEventListener("click", () => { renderSettings(); $("import-msg").hidden = true; show("settings"); });
$("btn-back").addEventListener("click", () => { renderHome(); show("home"); });
$("btn-quit").addEventListener("click", quit);
$("btn-next").addEventListener("click", next);
$("btn-home").addEventListener("click", () => { renderHome(); show("home"); });
$("btn-import").addEventListener("click", importSet);
$("btn-clear").addEventListener("click", () => {
  if (!confirm(tr("clearConfirm"))) return;
  state.history = {};
  state.resume = {};
  save(state);
  renderHome();
});
$("text-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (active?.answered) return next();
  submit($("text-input").value);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (!document.querySelector('section[data-screen="quiz"]').classList.contains("active")) return;
  if (active?.answered) { e.preventDefault(); next(); }
});

boot();
