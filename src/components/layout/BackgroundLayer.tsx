"use client";

import { useAppBackground } from "@/hooks/useAppBackground";

/**
 * Full-viewport background behind the app shell. Applies the user's selected
 * bundled/custom background and a timer-mode tint for contrast.
 */
export function BackgroundLayer() {
  const { baseBackground, overlayBackground } = useAppBackground();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 transition-[background] duration-700 ease-out" style={{ background: baseBackground }} />
      <div className="absolute inset-0 transition-[background] duration-700 ease-out" style={{ background: overlayBackground }} />
    </div>
  );
}
