/*
 * Service worker (spec `pwa` → "Installable app").
 *
 * It exists so the app can be installed, and it is deliberately almost empty
 * of caching. This app is session-gated and every screen renders private data,
 * so caching pages or API responses would put another person's records on the
 * device and would serve stale content to the next signed-in user. Only the
 * icons are stored, because they are public, static and needed for the
 * launcher tile to look right offline.
 *
 * Navigations are passed straight through to the network — the app is
 * online-first — and every other request (attachments, media ranges, uploads)
 * is left untouched so the browser handles it exactly as it would without a
 * worker.
 */

const ICON_CACHE = 'ecotech-agenda-icons-v1';

const ICONS = [
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ICON_CACHE)
      .then((cache) => cache.addAll(ICONS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== ICON_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Icons: cache first, so the tile renders without a round trip.
  if (ICONS.includes(url.pathname)) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // Pages: always from the network. Nothing rendered is ever stored.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
  }
});
