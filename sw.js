const CACHE = "quiz-v1";
const ASSETS = [
  ".",
  "index.html",
  "style.css",
  "app.js",
  "quiz.js",
  "sets.js",
  "store.js",
  "i18n.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "sets/index.json",
  "sets/idrott-ak6-anatomi.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (cached) => cached ?? fetch(e.request)
    )
  );
});
