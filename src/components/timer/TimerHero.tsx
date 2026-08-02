"use client";

import { ModeSelector } from "@/components/timer/ModeSelector";
import { TimerControls } from "@/components/timer/TimerControls";
import { TimerDisplay } from "@/components/timer/TimerDisplay";

/**
 * The timer-first hero: mode selector -> countdown -> primary controls
 * (doc 08 section 13). Extracted from `app/page.tsx` (Phase 3) so the SEO
 * preset routes (`app/presets/[preset]/page.tsx`, POM-036) can reuse the
 * exact same live timer UI instead of duplicating it -- both mount the same
 * `useTimer()`-backed components against the one global `useTimerStore`.
 */
export function TimerHero() {
  return (
    <div className="flex flex-col items-center gap-8">
      <ModeSelector />
      <TimerDisplay />
      <TimerControls />
    </div>
  );
}
