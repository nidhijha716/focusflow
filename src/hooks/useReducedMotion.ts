"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", onChange);
  return () => mediaQueryList.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the user's `prefers-reduced-motion` preference.
 *
 * Source: 08_UI_Theme_Colors_and_Responsive_Rules.pdf section 20/21 --
 * "Respect prefers-reduced-motion and avoid flashing or rapid pulsing" and
 * "Animated backgrounds should pause/reduce when ... reduced-motion is
 * enabled". CSS alone (the media query in globals.css) already disables
 * animation/transition durations; this hook exists for components that need
 * to branch in JS (e.g. skip mounting a decorative animation library, pause
 * a canvas/video background) rather than just shortening a CSS transition.
 *
 * Uses `useSyncExternalStore` (React's recommended pattern for subscribing
 * to browser APIs) so the value stays consistent between server and client
 * snapshots without setState-in-effect cascading renders.
 *
 * Ownership: this hook is owned by the theme system (Agent 8). Other agents
 * should import it rather than re-implementing the same media query.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
