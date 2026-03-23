// Dineo Service Worker — Push Notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || 'Dineo — Novo Pedido';
  const options = {
    body: data.body || 'Um novo pedido foi recebido.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: data.url || '/admin/kitchen' },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || 'dineo-order',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/kitchen';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('/admin'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
