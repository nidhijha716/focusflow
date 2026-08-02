"use client";

import { useServiceWorkerRegistration } from "@/hooks/useServiceWorkerRegistration";

/**
 * Mounts `useServiceWorkerRegistration` once for the whole app (POM-034).
 * Renders no markup -- the same "invisible mount point" pattern
 * `providers/TimerProvider.tsx` uses for the timer engine, kept as its own
 * component rather than folded into `TimerProvider` since PWA registration
 * and the timer engine are unrelated concerns with independent lifecycles.
 */
export function PwaRegistration() {
  useServiceWorkerRegistration();
  return null;
}
