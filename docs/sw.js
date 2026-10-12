/* MUNDOFUT10 — cache para abrir rápido e funcionar offline. Versão aa18515749 */
const CACHE = 'mf10-aa18515749';
const PRECACHE = ["./", "index.html", "data/db.json", "data/draft.json", "data/flags.json", "data/games.json", "favicon.png", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "js/app.js", "js/core.js", "js/games/g01.js", "js/games/g02.js", "js/games/g03.js", "js/games/g04.js", "js/games/g05.js", "js/games/g06.js", "js/games/g07.js", "js/games/g08.js", "js/games/g09.js", "js/games/g10.js", "js/games/g11.js", "js/i18n.js", "js/stadium.js", "js/ui.js", "manifest.webmanifest", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mf10-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === location.origin;
  if (same) {   // arquivos do site: sempre a versão mais nova da rede; cache só sem internet
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? 'index.html' : req, cp)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true })));
    return;
  }
  // bibliotecas e fontes externas (não mudam): cache primeiro
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
