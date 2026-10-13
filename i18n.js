// EN/SV UI strings. `{x}` placeholders are filled by t(lang, key, vars).
// Question content is NOT translated; it stays in the set's own language.

export const STRINGS = {
  en: {
    appName: "Study Quiz",
    tagline: "Keep going until you've got them all right! 🌟",
    settings: "Settings",
    continueRun: "Continue where you left off",
    continueSub: "{done} of {total} done",
    questions: "{n} questions",
    lastResult: "Last: {first}/{total} first try",
    best: "Best: {pct}%",
    noResult: "Not played yet",
    quit: "Quit",
    quitConfirm: "Stop this round? You can continue later from the home screen.",
    remaining: "{n} left",
    check: "Check",
    next: "Next",
    typeAnswer: "Type your answer…",
    right: "Correct! 🎉",
    wrong: "Not quite…",
    correctIs: "Correct answer:",
    youWrote: "You wrote:",
    finished: "All done!",
    firstTry: "{first} of {total} right on the first try",
    attempts: "{n} answers in total",
    missedTitle: "Practise these",
    noMissed: "No mistakes at all — amazing! 🌟",
    again: "Play again",
    onlyMissed: "Only the ones I missed",
    home: "Home",
    back: "Back",
    language: "Language",
    importTitle: "Import a question set",
    importHelp: "Paste the JSON for a question set and tap Import. See docs/QUESTION-SETS.md for the format.",
    importBtn: "Import",
    importOk: "Imported \"{title}\" ({n} questions).",
    importError: "Could not import: {error}",
    importedSets: "Imported sets",
    noImported: "No imported sets yet.",
    delete: "Delete",
    deleteConfirm: "Delete \"{title}\"?",
    clearResults: "Clear all results",
    clearConfirm: "Clear all saved results?",
    loadError: "Could not load the question sets. Check your connection and reload.",
    stars3: "Brilliant!",
    stars2: "Great work!",
    stars1: "Good practice — try again!",
  },
  sv: {
    appName: "Pluggquiz",
    tagline: "Fortsätt tills du har alla rätt! 🌟",
    settings: "Inställningar",
    continueRun: "Fortsätt där du slutade",
    continueSub: "{done} av {total} klara",
    questions: "{n} frågor",
    lastResult: "Senast: {first}/{total} rätt direkt",
    best: "Bäst: {pct}%",
    noResult: "Inte spelad än",
    quit: "Avsluta",
    quitConfirm: "Avsluta omgången? Du kan fortsätta senare från startsidan.",
    remaining: "{n} kvar",
    check: "Svara",
    next: "Nästa",
    typeAnswer: "Skriv ditt svar…",
    right: "Rätt! 🎉",
    wrong: "Inte riktigt…",
    correctIs: "Rätt svar:",
    youWrote: "Du skrev:",
    finished: "Klart!",
    firstTry: "{first} av {total} rätt på första försöket",
    attempts: "{n} svar totalt",
    missedTitle: "Öva på dessa",
    noMissed: "Inga fel alls — fantastiskt! 🌟",
    again: "Spela igen",
    onlyMissed: "Bara de jag missade",
    home: "Hem",
    back: "Tillbaka",
    language: "Språk",
    importTitle: "Importera frågeset",
    importHelp: "Klistra in JSON för ett frågeset och tryck Importera. Formatet finns i docs/QUESTION-SETS.md.",
    importBtn: "Importera",
    importOk: "Importerade \"{title}\" ({n} frågor).",
    importError: "Kunde inte importera: {error}",
    importedSets: "Importerade set",
    noImported: "Inga importerade set än.",
    delete: "Ta bort",
    deleteConfirm: "Ta bort \"{title}\"?",
    clearResults: "Rensa alla resultat",
    clearConfirm: "Rensa alla sparade resultat?",
    loadError: "Kunde inte ladda frågeseten. Kontrollera uppkopplingen och ladda om.",
    stars3: "Strålande!",
    stars2: "Bra jobbat!",
    stars1: "Bra övning — prova igen!",
  },
};

export function t(lang, key, vars = {}) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function applyI18n(lang, root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  document.documentElement.lang = lang;
}
