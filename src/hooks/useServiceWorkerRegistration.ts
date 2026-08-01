"use client";

import { useEffect } from "react";

/**
 * Minimal registration stub (02_Technical_Architecture §7). The actual
 * service-worker script (shell caching, cache versioning, activation
 * cleanup) is implemented in a later phase — this hook only wires up the
 * call site so the app shell can adopt it without further changes here.
 */
export function useServiceWorkerRegistration(swUrl = "/sw.js"): void {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(swUrl).catch((error: unknown) => {
      console.warn("[pwa] Service worker registration failed", error);
    });
  }, [swUrl]);
}
