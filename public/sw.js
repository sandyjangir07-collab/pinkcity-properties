const CACHE_NAME = "pinkcity-crm-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first for same-origin static assets (JS/CSS/images/fonts) only.
// Everything else — Supabase calls, API requests, cross-origin — goes
// straight to the network so data is never served stale.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/.test(url.pathname);

  if (!isSameOrigin || !isStaticAsset || event.request.method !== "GET") {
    return; // let the browser handle it normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
