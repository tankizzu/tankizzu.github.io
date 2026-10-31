// Soldirini funziona anche senza rete.
// Quando cambi i file su GitHub, aumenta il numero di versione qui sotto.
const VERSIONE = 'soldirini-4';
const FILE = ['./', 'index.html', 'app.js', 'plus.js', 'xlsx.js', 'modelli.js', 'docs.js', 'fonts.css', 'manifest.json',
  'soldirini-tonda-192.png', 'soldirini-tonda-512.png', 'soldirini-quadrata-192.png', 'soldirini-quadrata-512.png', 'logo-bulldogs.jpg',
  'lib/jszip.min.js', 'lib/jspdf.umd.min.js', 'lib/html2canvas.min.js', 'tpl/ricevuta.xlsx', 'tpl/nota.xlsx', 'tpl/ore.xlsx', 'tpl/esempio-polisportiva.xlsx'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('soldirini-') && k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Prima la rete (così prendi sempre l'ultima versione), se non c'è rete la copia salvata
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSIONE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
