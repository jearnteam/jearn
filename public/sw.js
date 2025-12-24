/* =========================================================
 * JEARN Service Worker (DISABLED / SAFE MODE)
 *
 * Purpose:
 * - Allow PWA installability
 * - Avoid ALL fetch interception
 * - Avoid avatar / CDN / SSE / API bugs
 * - No caching, no offline logic
 *
 * This is intentional.
 * ========================================================= */

/* ------------------------------
 * INSTALL
 * ------------------------------ */
self.addEventListener("install", () => {
  // Activate immediately
  self.skipWaiting();
});

/* ------------------------------
 * ACTIVATE
 * ------------------------------ */
self.addEventListener("activate", (event) => {
  // Take control of all pages
  event.waitUntil(self.clients.claim());
});

/* ------------------------------
 * FETCH
 * ------------------------------
 * 🚫 NO fetch handler on purpose
 *
 * This means:
 * - Browser handles all requests normally
 * - CDN requests bypass SW
 * - No cache poisoning
 * - No 404 (from service worker)
 * - No SSE breakage
 * - No avatar spam
 * ------------------------------ */
