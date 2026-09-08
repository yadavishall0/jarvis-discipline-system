// JARVIS Service Worker - Offline Cache Strategy
const CACHE_NAME = 'jarvis-v1.0.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './data/default-routine.js',
  './css/core.css',
  './css/dashboard.css',
  './css/focus.css',
  './css/routine.css',
  './css/analytics.css',
  './css/settings.css',
  './css/responsive.css',
  './js/utils.js',
  './js/storage.js',
  './js/state.js',
  './js/voice.js',
  './js/notifications.js',
  './js/routine.js',
  './js/mission.js',
  './js/enforcement.js',
  './js/recovery.js',
  './js/discipline.js',
  './js/focus.js',
  './js/gate.js',
  './js/analytics.js',
  './js/settings.js',
  './js/jarvis.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[JARVIS SW] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[JARVIS SW] Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[JARVIS SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback to offline index.html if navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
