"use client";

import { useSyncExternalStore } from "react";

function noopSubscribe(): () => void {
  // Feature support can't change during a session, so there is nothing to
  // subscribe to -- this hook only exists to read the flag in an
  // SSR-safe way (see useReducedMotion.ts for the same pattern).
  return () => {};
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Feature-detects the Document Picture-in-Picture API
 * (https://developer.chrome.com/docs/web-platform/document-picture-in-picture),
 * which `components/pip/PiPTimer.tsx` uses to render a live DOM view of the
 * timer in an always-on-top window. Chromium-only as of this writing; other
 * browsers fall through to PiPTimer's disabled state per
 * 05_Frontend_Specification.pdf section 4: "PiPTimer: compact
 * supported-browser timer."
 */
export function usePiPSupport(): boolean {
  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
