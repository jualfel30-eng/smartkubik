// Self-destructing service worker.
// The previous PWA was retired because its runtime cache returned stale
// tenant data across sede switches. This worker replaces the old one,
// clears all caches, unregisters itself, and reloads any open clients
// so users transition to the non-PWA build without manual intervention.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) { /* noop */ }
    try {
      await self.registration.unregister();
    } catch (_) { /* noop */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    } catch (_) { /* noop */ }
  })());
});
