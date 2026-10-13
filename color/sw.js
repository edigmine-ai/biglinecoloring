// Offline: keep the app and its pages on the device after the first visit.
const CACHE = "color-it-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  ...["bonnie-star", "barnaby-blocks", "mitten", "pumpkin-ghost"].flatMap(p => [`pages/${p}.png`, `pages/${p}-thumb.png`])];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => { if (e.request.method === "GET") e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
