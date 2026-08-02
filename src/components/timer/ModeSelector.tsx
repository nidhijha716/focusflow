"use client";

import { useTimerActions, useTimerMode, useTimerStatus } from "@/hooks/useTimer";
import { cn } from "@/lib/cn";
import { TIMER_MODE_LABELS } from "@/lib/format";
import { TIMER_MODES, type TimerMode } from "@/types/storage";

const ACCENT_TEXT_CLASSES: Record<TimerMode, string> = {
  focus: "text-[var(--focus)]",
  short_break: "text-[var(--short-break)]",
  long_break: "text-[var(--long-break)]",
};

/**
 * `ModeSelector` -- focus/short/long selection (doc 05_Frontend_Specification.pdf
 * section 4), implemented as a `radiogroup` of equal-width buttons (doc 08
 * section 7: "Mode selector may use three compact equal-width buttons").
 *
 * Disabled while the timer is `"running"`: switching modes mid-session
 * would silently abandon the running interval, which section 7's "Mode
 * changes update duration without corrupting completed-cycle counts" reads
 * as an idle/paused-time action, not a running one. This also keeps every
 * `CHANGE_MODE` transition originating from an idle/paused snapshot, so it
 * can never be confused with a SKIP/COMPLETE transition (see
 * hooks/useSessionCompletionAnnouncer.ts's detection heuristic).
 *
 * Reads `useTimerMode()`/`useTimerStatus()` (not `useTimer()`) so this
 * component never re-renders on the once-a-second TICK -- see those hooks'
 * docstring in hooks/useTimer.ts and architecture doc §10.
 */
export function ModeSelector() {
  const currentMode = useTimerMode();
  const status = useTimerStatus();
  const { changeMode } = useTimerActions();
  const disabled = status === "running";

  return (
    <div role="radiogroup" aria-label="Timer mode" className="flex w-full max-w-md gap-2">
      {TIMER_MODES.map((mode) => {
        const active = currentMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => changeMode(mode)}
            className={cn(
              "control flex-1 rounded-pill border px-3 py-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? cn("border-transparent bg-surface-soft underline", ACCENT_TEXT_CLASSES[mode])
                : "border-border bg-transparent text-text-secondary hover:bg-surface-soft"
            )}
          >
            {TIMER_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
