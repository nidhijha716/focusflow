import { readLocalStorageValue, writeLocalStorageValue } from "@/lib/security/storageGuard";
import { STORAGE_KEYS } from "./keys";
import { TimerStateSchema, defaultTimerState, type TimerState } from "@/types/storage";

/**
 * Reads `pomodoro:timer:v1`, falling back to a fresh idle timer if
 * missing/corrupt. Validation + safe fallback is delegated to Agent 4's
 * `@/lib/security/storageGuard` (see that file's docstring, which names
 * this module as its intended caller) so there is a single localStorage
 * guard implementation shared by every persisted key.
 */
export function readTimerState(): TimerState {
  const result = readLocalStorageValue(STORAGE_KEYS.timer, TimerStateSchema);
  return result.ok ? result.value : defaultTimerState();
}

export function writeTimerState(state: TimerState): void {
  writeLocalStorageValue(STORAGE_KEYS.timer, TimerStateSchema, state);
}
