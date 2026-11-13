/* Cache hors ligne de l'application Darija. VERSION est recalculée par export_app.py à chaque mise à jour. */
const VERSION = 'darija-1222ac37-af4955';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('darija-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Tout est servi depuis le cache (hors ligne garanti) ; la nouvelle version arrive par l'installation d'un nouveau sw.js.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
