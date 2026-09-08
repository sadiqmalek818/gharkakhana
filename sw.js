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
// ---------------------------------------------------------------------------
// ADD THIS TO YOUR EXISTING sw.js — don't replace the whole file, just paste
// this at the end. It doesn't touch your existing caching code at all.
// ---------------------------------------------------------------------------

// Fires when a push arrives from the server — including while the site is
// fully closed, as long as the browser/OS itself is running (this is what
// makes it different from the in-app notifications used elsewhere).
self.addEventListener("push", (event) => {
  let data = { title: "GharKaKhana", body: "Naya update hai!", url: "/" };
  try { data = event.data.json(); } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",   // use whatever icon filename your manifest already has
      badge: "icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

// Tapping the notification opens (or focuses) the site instead of just
// dismissing it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
