"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` (POM-034 -- see that file's docstring for why it
 * is a hand-written static script rather than a webpack-based PWA plugin).
 *
 * Registration is skipped outside production. Registering in `next dev`
 * would let the service worker's cache-first strategy serve stale
 * `/_next/static/*` chunks over Turbopack's HMR-updated ones during local
 * development -- every popular Next.js PWA setup guide recommends
 * dev/build-mode gating for the same reason once a real SW is introduced.
 */
export function useServiceWorkerRegistration(swUrl = "/sw.js"): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(swUrl).catch((error: unknown) => {
      console.warn("[pwa] Service worker registration failed", error);
    });
  }, [swUrl]);
}
