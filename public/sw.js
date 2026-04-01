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
