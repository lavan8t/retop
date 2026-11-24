/**
 * Service worker template for the retop PWA.
 * build.ts replaces the cache-name and precache-list placeholders below with
 * values derived from the real dist/ output when it emits dist/sw.js.
 */

const CACHE_NAME = __SW_CACHE_NAME__;
const ASSETS_TO_CACHE = __SW_PRECACHE_ASSETS__;

const CACHEABLE_EXTENSIONS = [
  '.css',
  '.html',
  '.ico',
  '.js',
  '.png',
  '.svg',
  '.webmanifest',
  '.woff',
  '.woff2',
];

function isCacheableStatic(request, response) {
  if (request.method !== 'GET') return false;
  if (!response || response.status !== 200 || response.type !== 'basic')
    return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  const extension = url.pathname
    .slice(url.pathname.lastIndexOf('.'))
    .toLowerCase();
  return CACHEABLE_EXTENSIONS.includes(extension);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[retop SW] Pre-caching offline app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        // A partial shell is worse than no install: let the old worker stay active.
        console.error('[retop SW] Pre-cache failed:', error);
        throw error;
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (isCacheableStatic(request, response)) {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => {}),
            );
          }
          return response;
        })
        .catch((error) => {
          const wantsHtml =
            request.mode === 'navigate' ||
            request.headers.get('accept')?.includes('text/html');
          if (wantsHtml) {
            return caches
              .match('./offline.html')
              .then((offline) => offline || Response.error());
          }
          throw error;
        });
    }),
  );
});
