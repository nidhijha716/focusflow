import { readLocalStorageValue, writeLocalStorageValue } from "@/lib/security/storageGuard";
import { STORAGE_KEYS } from "./keys";
import { UiPreferencesStateSchema, defaultUiPreferencesState, type UiPreferencesState } from "@/types/storage";

/** Reads `pomodoro:ui:v1`, falling back to empty UI prefs if missing/corrupt. */
export function readUiPreferencesState(): UiPreferencesState {
  const result = readLocalStorageValue(STORAGE_KEYS.ui, UiPreferencesStateSchema);
  return result.ok ? result.value : defaultUiPreferencesState();
}

export function writeUiPreferencesState(state: UiPreferencesState): void {
  writeLocalStorageValue(STORAGE_KEYS.ui, UiPreferencesStateSchema, state);
}
