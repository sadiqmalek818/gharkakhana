// GharKaKhana service worker — caches the app shell so it opens fast
// and works even with a patchy connection. Bump CACHE_NAME whenever
// you update the site so users get the fresh version.
const CACHE_NAME = "gharkakhana-v1";
const APP_SHELL = [
  "./gharkakhana-website.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("./gharkakhana-website.html"))
      );
    })
  );
});
