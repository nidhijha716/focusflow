import { readSettingsState, readTimerState, writeSettingsState, writeTimerState } from "@/db/localStorage";
import { STORAGE_KEYS } from "@/db/localStorage/keys";
import { removeLocalStorageValue } from "@/lib/security/storageGuard";
import { TIMER_STATUSES, type SettingsState, type TimerState } from "@/types/storage";
import type { SettingsSnapshot } from "@/types/settings.types";
import type { TimerSnapshot, TimerStatus } from "@/types/timer.types";

/**
 * Thin facade over the canonical persistence layer (`@/db/localStorage` +
 * zod validation via `@/lib/security/storageGuard`, both Agent 3/4 owned;
 * see 03_Local_Data_Schema.pdf ù2). The timer FSM (`services/timer.service.ts`)
 * and settings store keep calling this module by name so callers don't need
 * to know about the persisted schema shape -- this file only translates
 * between the FSM's `TimerSnapshot` and the persisted `TimerState` record.
 * Settings already share one canonical shape (see `@/types/settings.types`),
 * so no translation is needed there.
 */

const PERSISTABLE_TIMER_STATUSES: ReadonlySet<TimerStatus> = new Set(TIMER_STATUSES);

function toPersistedStatus(status: TimerStatus): TimerState["status"] {
  // "completed" is a transient FSM status (see types/timer.types.ts) that is
  // never the state a page reload should restore into -- fall back to idle.
  return PERSISTABLE_TIMER_STATUSES.has(status) ? (status as TimerState["status"]) : "idle";
}

function toTimerState(snapshot: TimerSnapshot, selectedTaskId: TimerState["selectedTaskId"]): TimerState {
  return {
    mode: snapshot.mode,
    status: toPersistedStatus(snapshot.status),
    durationMs: snapshot.durationMs,
    remainingMs: snapshot.remainingMs,
    deadline: snapshot.deadline,
    // Best-available mapping: both fields count completed focus sessions
    // toward the next long break. Flagged for confirmation against Agent 5
    // (Frontend Specification) if `cycleCount` is meant to be a lifetime
    // total rather than "since last long break".
    cycleCount: snapshot.focusSessionsSinceLongBreak,
    selectedTaskId,
    updatedAt: Date.now(),
  };
}

function toTimerSnapshot(state: TimerState): TimerSnapshot {
  return {
    status: state.status,
    mode: state.mode,
    deadline: state.deadline,
    remainingMs: state.remainingMs,
    durationMs: state.durationMs,
    focusSessionsSinceLongBreak: state.cycleCount,
  };
}

export function saveTimerSnapshot(snapshot: TimerSnapshot): void {
  const { selectedTaskId } = readTimerState();
  writeTimerState(toTimerState(snapshot, selectedTaskId));
}

export function loadTimerSnapshot(): TimerSnapshot {
  return toTimerSnapshot(readTimerState());
}

export function clearTimerSnapshot(): void {
  removeLocalStorageValue(STORAGE_KEYS.timer);
}

export function saveSettings(settings: SettingsSnapshot): void {
  writeSettingsState(settings);
}

export function loadSettings(): SettingsState {
  return readSettingsState();
}
