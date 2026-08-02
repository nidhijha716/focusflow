"use client";

import { useTimer } from "@/hooks/useTimer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionCompletionAnnouncer } from "@/hooks/useSessionCompletionAnnouncer";
import { cn } from "@/lib/cn";
import { formatClockTime, TIMER_MODE_SESSION_LABELS, toProgressPercent } from "@/lib/format";

const ACCENT_BAR_CLASSES = {
  focus: "bg-[var(--focus)]",
  short_break: "bg-[var(--short-break)]",
  long_break: "bg-[var(--long-break)]",
} as const;

/**
 * `TimerDisplay` -- time, mode label, progress (doc 05_Frontend_Specification.pdf
 * section 4). Reads `useTimer()` directly rather than taking props: this
 * and `ModeSelector`/`TimerControls` are the three components explicitly
 * "wired to `useTimer()`" per the Phase 3 brief, so there is one obvious
 * place a future agent looks for the live countdown instead of hunting
 * through prop-drilling.
 */
export function TimerDisplay() {
  const { snapshot } = useTimer();
  const reducedMotion = useReducedMotion();
  const announcement = useSessionCompletionAnnouncer();

  const progressPercent = toProgressPercent(snapshot.remainingMs, snapshot.durationMs);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {TIMER_MODE_SESSION_LABELS[snapshot.mode]}
        {snapshot.status === "paused" ? " \u00b7 Paused" : null}
      </p>

      <p
        className={cn(
          "timer-value font-semibold text-text-primary",
          !reducedMotion && "transition-colors duration-300"
        )}
      >
        {formatClockTime(snapshot.remainingMs)}
      </p>

      {/* Supplementary only -- the clock text above already conveys remaining time on its own (doc 08 section 17). */}
      <div
        aria-hidden="true"
        className="h-1.5 w-full max-w-xs overflow-hidden rounded-pill bg-surface-soft"
      >
        <div
          className={cn(
            "h-full rounded-pill",
            ACCENT_BAR_CLASSES[snapshot.mode],
            !reducedMotion && "transition-[width] duration-300 ease-linear"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Announces meaningful completions only (see the hook's docstring) -- never every tick. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
