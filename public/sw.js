// Standard Service Worker using Google's Workbox CDN for rich PWA capabilities
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('[Service Worker] Workbox chargé avec succès.');

  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  workbox.core.clientsClaim();

  const CACHE_NAME_PREFIX = 'liseuse-vocale-pwa';
  // ⚠️ Bump de version → invalide tous les caches JS/CSS précédents
  const STATIC_CACHE_NAME = `${CACHE_NAME_PREFIX}-static-v2`;
  const PAGES_CACHE_NAME = `${CACHE_NAME_PREFIX}-pages-v2`;
  const IMAGES_CACHE_NAME = `${CACHE_NAME_PREFIX}-images-v1`;
  const FONTS_CACHE_NAME = `${CACHE_NAME_PREFIX}-fonts-v1`;

  // Nettoyage automatique des anciens caches au activate
  self.addEventListener('activate', (event) => {
    const validCaches = [STATIC_CACHE_NAME, PAGES_CACHE_NAME, IMAGES_CACHE_NAME, FONTS_CACHE_NAME];
    event.waitUntil(
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name.startsWith(CACHE_NAME_PREFIX) && !validCaches.includes(name))
            .map(name => {
              console.log('[Service Worker] Suppression ancien cache:', name);
              return caches.delete(name);
            })
        )
      )
    );
  });

  // App Shell — Network First pour fraîcheur garantie
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: PAGES_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  );

  // JS/CSS — Network First (pas StaleWhileRevalidate) pour toujours servir la dernière version
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style' ||
      (request.destination === 'worker' && request.url.includes('sw.js') === false),
    new workbox.strategies.NetworkFirst({
      cacheName: STATIC_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 40,
          maxAgeSeconds: 24 * 60 * 60 // 1 jour seulement
        })
      ]
    })
  );

  // Images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.url.endsWith('.svg') || request.url.endsWith('.png'),
    new workbox.strategies.CacheFirst({
      cacheName: IMAGES_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })
      ]
    })
  );

  // Google Fonts
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: FONTS_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 180 * 24 * 60 * 60
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })
      ]
    })
  );

  workbox.routing.setCatchHandler(async ({ event }) => {
    switch (event.request.destination) {
      case 'document':
        return caches.match('/');
      default:
        return Response.error();
    }
  });

} else {
  console.log('[Service Worker] Échec du chargement de Workbox.');
}
