/**
 * Service Worker for retop PWA (getretop.web.app).
 * Caches static app shell assets for instant, reliable offline loading.
 */

const CACHE_NAME = "retop-pwa-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./offline.html",
  "./style.css",
  "./offline.js",
  "./manifest.webmanifest",
  "./icons/icon16.png",
  "./icons/icon32.png",
  "./icons/icon48.png",
  "./icons/icon128.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[retop SW] Pre-caching offline app shell");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[retop SW] Some static assets failed to cache:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache hit, background fetch updates
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fallback to offline.html for HTML requests
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./offline.html");
        }
      });
    })
  );
});
