// Minimal service worker — mainly here so Chrome/Android treat GharKaKhana as an
// installable app ("Add to Home Screen"). Keeps a small cache of the shell page
// so it opens instantly on repeat visits; live data always comes from Firestore.
//
// IMPORTANT: bump CACHE_NAME (v1 -> v2 -> v3...) any time gharkakhana-website.html
// changes in a way that matters — this is what forces phones to drop old cached
// JS instead of silently keeping it, which was causing "works when Claude checks
// it, not on the live GitHub link" bugs.
const CACHE_NAME = "gharkakhana-shell-v2";
const SHELL_FILES = [
  "gharkakhana-website.html",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting(); // activate the new SW immediately instead of waiting for all tabs to close
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))) // wipe old cache versions
    )
  );
  self.clients.claim(); // take control of already-open tabs right away
});

self.addEventListener("fetch", event => {
  // Network-first for everything (so menu/orders/JS stay live); fall back to the
  // cached shell only if the network request fails (e.g. briefly offline).
  // cache:"reload" forces a real round-trip instead of letting the browser's own
  // HTTP cache quietly hand back a stale response even in "network-first" mode.
  event.respondWith(
    fetch(event.request, { cache: "reload" }).catch(() => caches.match(event.request))
  );
});
