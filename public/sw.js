// Cache for offline support
const CACHE_NAME = "tawsil-v1";
const CACHED_URLS = ["/", "/track", "/rider", "/manifest.json", "/icon-192.png"];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHED_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", function(event) {
  // Network first, fall back to cache for navigation
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener("push", function(event) {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "توصيل", {
      body: data.body || "طلب جديد",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.data
    })
  );
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("/rider"));
});
