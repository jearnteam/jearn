/* A safe, tiny service worker for installability + basic offline cache */
const CACHE = "jearn-static-v2"; // bump version on change
const ASSETS = [
  "/", // your app shell
  "/manifest.webmanifest",
  "/offline.html", // fallback for navigation (optional)
];

// Ignore API calls, SSE, Next.js assets, uploads, avatars, etc.
const IGNORE_PATTERNS = [
  "/api/",
  "/_next",
  "/sw.js",
  "/favicon",
  "/icon",
  "/apple-touch-icon",
  "/robots.txt",
  "/sitemap",
  "/uploads/",
  "/stream",
  "/avatar",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // ✅ Skip SSE stream – don't cache or handle
  if (request.url.includes("/api/stream")) return;

  // Normal fetch handler here...
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
  } else {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }

  // ✅ Cache-first for static resources
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
