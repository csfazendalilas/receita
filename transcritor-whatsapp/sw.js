// Service worker simples: faz cache do "app shell" para abrir offline.
// Os modelos do Whisper são cacheados separadamente pelo transformers.js
// (Cache Storage do navegador), então não precisamos lidar com eles aqui.

const CACHE = 'transcritor-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './worker.js',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Só tratamos requisições da própria origem (o app shell).
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
