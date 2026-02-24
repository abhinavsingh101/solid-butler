self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Minimal fetch handler to satisfy installability while keeping network-first behavior.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
