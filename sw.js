/* Service worker de HidroSat.
   Estrategia network-first: siempre intenta la red (datos y login frescos),
   y solo cae a la caché si no hay conexión. Cachea únicamente el "shell"
   liviano (html, íconos, manifest) — NO los GeoJSON pesados ni Firebase. */
const CACHE = 'hidrosat-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // login/escrituras: passthrough
  e.respondWith(
    fetch(req)
      .then((res) => {
        // guardar copia del shell (mismo origen, sin los datos pesados) para offline
        if (res && res.ok && req.url.startsWith(self.location.origin) && !req.url.includes('/data/')) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
