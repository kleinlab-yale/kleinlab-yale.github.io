const CACHE_NAME = "math-pet-offline-20260701-dog-assets";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260620-decor-scroll",
  "./script.js?v=20260701-dog-assets",
  "./workbook-questions.js?v=20260618-answer-integrity",
];

let warmingPromise = null;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith("math-pet-offline-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

async function warmGameCache(assetUrls) {
  const cache = await caches.open(CACHE_NAME);
  const urls = Array.from(new Set([...APP_SHELL, ...assetUrls]))
    .map((url) => new URL(url, self.registration.scope).href)
    .filter((url) => new URL(url).origin === self.location.origin);
  let cached = 0;
  let failed = 0;

  await broadcast({ type: "OFFLINE_PROGRESS", cached, total: urls.length, failed });
  for (const url of urls) {
    try {
      const request = new Request(url, { credentials: "same-origin" });
      const existing = await cache.match(request, { ignoreSearch: true });
      if (!existing) {
        const response = await fetch(request);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(request, response.clone());
      }
      cached += 1;
    } catch {
      failed += 1;
    }
    if ((cached + failed) % 10 === 0 || cached + failed === urls.length) {
      await broadcast({ type: "OFFLINE_PROGRESS", cached, total: urls.length, failed });
    }
  }

  await broadcast({
    type: failed ? "OFFLINE_INCOMPLETE" : "OFFLINE_READY",
    cached,
    total: urls.length,
    failed,
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_GAME" || !Array.isArray(event.data.assets)) return;
  if (!warmingPromise) {
    warmingPromise = warmGameCache(event.data.assets).finally(() => {
      warmingPromise = null;
    });
  }
  event.waitUntil(warmingPromise);
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(new Request(new URL("./index.html", self.registration.scope)), response.clone());
    return response;
  } catch {
    return cache.match(new Request(new URL("./index.html", self.registration.scope)), { ignoreSearch: true })
      || cache.match(new Request(self.registration.scope), { ignoreSearch: true });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    event.request.mode === "navigate"
      ? networkFirstNavigation(event.request)
      : cacheFirst(event.request),
  );
});
