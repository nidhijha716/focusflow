import type { TimerMode } from "@/types/timer.types";

/**
 * Display-only formatting helpers for the Phase 3 UI layer.
 *
 * `hooks/useTimer.ts` deliberately omits formatted time/labels -- see its
 * docstring -- so this is the one place that turns raw ms/mode values into
 * user-facing strings. Nothing here reads or writes timer state.
 */

/** Human-readable label shown next to (never instead of) the mode accent color -- doc 08 section 2/20. */
export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export const TIMER_MODE_SESSION_LABELS: Record<TimerMode, string> = {
  focus: "Focus session",
  short_break: "Short break",
  long_break: "Long break",
};

/**
 * Formats a millisecond duration as `mm:ss`, or `h:mm:ss` once the duration
 * reaches an hour -- doc 08 section 17: "Reserve enough width for the
 * longest configured display, including hours if custom durations can
 * produce them."
 */
export function formatClockTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/** `remainingMs`/`durationMs` as a 0-100 progress percentage, clamped for safety. */
export function toProgressPercent(remainingMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const elapsed = durationMs - remainingMs;
  return Math.min(100, Math.max(0, (elapsed / durationMs) * 100));
}

export function formatMinutes(totalSeconds: number): number {
  return Math.round(totalSeconds / 60);
}

export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}
