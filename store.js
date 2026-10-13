// localStorage persistence. Shape:
// { lang: "sv"|"en",
//   imported: { [setId]: set },
//   history: { [setId]: { last: {date,total,firstTry,attempts,missedIds}, bestPct } },
//   resume: { [setId]: { mode, run, shuffled: { [qid]: [optionTexts] } } } }

export const KEY = "quiz.v1";

const DEFAULTS = () => ({ lang: "sv", imported: {}, history: {}, resume: {} });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    const state = { ...DEFAULTS(), ...(parsed && typeof parsed === "object" ? parsed : {}) };
    if (!state.resume || typeof state.resume !== "object" || Array.isArray(state.resume)) state.resume = {};
    return state;
  } catch {
    return DEFAULTS();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable: ignore */
  }
}
