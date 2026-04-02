// ==========================
// 🔧 INSTALL / ACTIVATE
// ==========================
self.addEventListener("install", () => {
  console.log("✅ SW installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ SW activated");
  event.waitUntil(self.clients.claim());
});

// ==========================
// 🔔 PUSH (MAIN FEATURE)
// ==========================
self.addEventListener("push", (event) => {
  if (!event.data) return;

  event.waitUntil(
    (async () => {
      const data = event.data.json();

      const title = data.title || "JEARN";
      const tag = data.tag || "notify:social";

      // 🔍 check existing notification
      const existing = await self.registration.getNotifications({ tag });
      const hasExisting = existing.length > 0;

      // 🔁 replace old
      for (const n of existing) n.close();

      await self.registration.showNotification(title, {
        body: data.body,
        icon: "/icon.png",
        badge: "/icon.png",
        tag,

        // 🧠 CORE LOGIC
        silent: hasExisting,
        renotify: !hasExisting,
        requireInteraction: !hasExisting,

        data: {
          url: data.url || "/",
        },
      });
    })()
  );
});

// ==========================
// 🖱️ CLICK HANDLING
// ==========================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url)) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
