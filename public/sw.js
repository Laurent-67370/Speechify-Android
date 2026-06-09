// Standard Service Worker using Google's Workbox CDN for rich PWA capabilities
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('[Service Worker] Workbox chargé avec succès.');

  // Force activation of the latest updated service worker immediately
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  // Keep caches clean and take control of open tabs immediately
  workbox.core.clientsClaim();

  // Cache name conventions
  const CACHE_NAME_PREFIX = 'liseuse-vocale-pwa';
  const STATIC_CACHE_NAME = `${CACHE_NAME_PREFIX}-static-v1`;
  const PAGES_CACHE_NAME = `${CACHE_NAME_PREFIX}-pages-v1`;
  const IMAGES_CACHE_NAME = `${CACHE_NAME_PREFIX}-images-v1`;
  const FONTS_CACHE_NAME = `${CACHE_NAME_PREFIX}-fonts-v1`;

  // Caching the App Shell (index.html, start url) using Network-First to guarantee freshness when online, 
  // with safe offline fallback
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: PAGES_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        })
      ]
    })
  );

  // Cache static bundle JS, CSS and modules using Stale-While-Revalidate
  // This provides immediate loading speeds, updating the bundle files silently in the background
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style' ||
      (request.destination === 'worker' && request.url.includes('sw.js') === false),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: STATIC_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 40,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        })
      ]
    })
  );

  // Cache vector graphics and offline brand icons
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.url.endsWith('.svg') || request.url.endsWith('.png'),
    new workbox.strategies.CacheFirst({
      cacheName: IMAGES_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }),
        // Allow caching opaque responses (external image CDNs)
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Cache Google fonts stylesheet & font files
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: FONTS_CACHE_NAME,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 180 * 24 * 60 * 60 // 180 days (half a year)
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Offline fallback mechanism: if connection is completely cut off, we ensure Gutenberg searches or remote resources
  // degrade gracefully instead of crashing
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
