// Service Worker for Krishna Homoeopathic Clinic PWA
const CACHE_NAME = 'clinic-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser handle network requests naturally
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
