import type { TimerMode as PersistedTimerMode, TimerStatus as PersistedTimerStatus } from "@/types/storage";

/**
 * Re-exported from the canonical persisted schema (`@/types/storage`,
 * 03_Local_Data_Schema.pdf §2) so the FSM and the `pomodoro:timer:v1` record
 * never define two competing `TimerMode` unions that can silently drift.
 */
export type TimerMode = PersistedTimerMode;

/**
 * The FSM has one extra, transient status beyond the persisted union:
 * `"completed"` is set only between a TICK reaching zero and the reducer
 * resolving the next mode's idle snapshot (see services/timer.service.ts,
 * `timerReducer`'s "SKIP"/"COMPLETE" case) and is never itself the
 * long-lived state a page reload restores into. `services/storage.service.ts`
 * maps it back to `"idle"` when persisting.
 */
export type TimerStatus = PersistedTimerStatus | "completed";

export interface TimerSnapshot {
  status: TimerStatus;
  mode: TimerMode;
  /** Absolute epoch ms the current interval ends at. Null when not running. */
  deadline: number | null;
  /** Time left in the current interval, in ms. Authoritative when `deadline` is null. */
  remainingMs: number;
  /** Total duration of the current interval, in ms (used for progress display). */
  durationMs: number;
  /** Completed focus sessions since the last long break, drives long-break scheduling. */
  focusSessionsSinceLongBreak: number;
}

export type TimerEvent =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | { type: "SKIP" }
  | { type: "TICK"; now: number }
  | { type: "COMPLETE" }
  | { type: "CHANGE_MODE"; mode: TimerMode }
  | { type: "RESTORE"; snapshot: TimerSnapshot };

/** Messages sent from the main thread to the timer worker. */
export type TimerWorkerInboundMessage =
  | { type: "START"; deadline: number }
  | { type: "PAUSE" }
  | { type: "STOP" }
  | { type: "SYNC"; deadline: number };

/** Messages sent from the timer worker back to the main thread. */
export type TimerWorkerOutboundMessage =
  | { type: "TICK"; remainingMs: number }
  | { type: "COMPLETE" };
