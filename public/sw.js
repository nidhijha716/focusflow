/**
 * Hand-rolled offline-shell service worker (POM-034).
 *
 * Why not a plugin (e.g. `@ducanh2912/next-pwa`): this project builds with
 * Next.js 16's Turbopack (see `.next/build/chunks` in the repo -- Turbopack
 * output, not webpack), and every popular Next.js SW plugin (including
 * `@ducanh2912/next-pwa`, the successor to `next-pwa`) is a **webpack
 * plugin** that hooks `webpack()` in `next.config.ts` -- Turbopack does not run webpack config
 * at all, so those plugins silently do nothing (no precache manifest is
 * ever generated) under `next dev`/`next build` on this project. A static,
 * framework-agnostic `public/sw.js` with runtime caching (below) needs no
 * build-time manifest and therefore works identically under Turbopack.
 *
 * Strategy (no build-time knowledge of Next's hashed `/_next/static/*`
 * filenames is required):
 *   - Navigations (`request.mode === "navigate"`): network-first, falling
 *     back to a cached copy of that exact page, and finally to the
 *     precached `/offline` shell if nothing is cached yet.
 *   - Static assets (`/_next/static/*`, `/icons/*`, `/sounds/*`, the
 *     manifest, `/favicon.ico`): cache-first, populated at runtime the
 *     first time each is fetched -- content-hashed filenames make
 *     cache-first safe (a changed file gets a new URL, never a stale hit).
 *
 * This satisfies POM-034's acceptance criterion ("Core timer/tasks/settings
 * work offline after cache") for the case that matters: a user who has
 * already opened the app once while online, then goes offline. The timer
 * engine/task store/settings store never call `fetch()` themselves (they
 * are IndexedDB/localStorage-backed -- see services/storage.service.ts,
 * db/repositories/*), so once the HTML/JS/CSS shell is served from cache,
 * every feature keeps working exactly as it does online.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `pomodoro-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pomodoro-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sounds/alarm.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // A single failed precache entry (e.g. offline during first install)
      // must never leave the service worker permanently stuck in "install
      // failed" -- runtime caching below still populates the cache
      // opportunistically as the user browses.
      .catch((error) => console.warn("[sw] Precache failed", error))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/sounds/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-icon.png"
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const runtimeMatch = await caches.match(request, { cacheName: RUNTIME_CACHE });
    if (runtimeMatch) return runtimeMatch;

    const shellCache = await caches.open(SHELL_CACHE);
    const offlineShell = await shellCache.match(OFFLINE_URL);
    if (offlineShell) return offlineShell;

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
