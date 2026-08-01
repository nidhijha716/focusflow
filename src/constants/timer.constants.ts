import type { TimerMode } from "@/types/timer.types";

export const DEFAULT_DURATIONS_MS: Record<TimerMode, number> = {
  focus: 25 * 60 * 1000,
  short_break: 5 * 60 * 1000,
  long_break: 15 * 60 * 1000,
};

/** Number of focus sessions completed before a long break is scheduled. */
export const LONG_BREAK_INTERVAL = 4;

/** Worker-internal polling cadence; independent of persistence cadence. */
export const TIMER_TICK_INTERVAL_MS = 250;
