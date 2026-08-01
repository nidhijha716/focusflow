import { readLocalStorageValue, writeLocalStorageValue } from "@/lib/security/storageGuard";
import { STORAGE_KEYS } from "./keys";
import { SettingsStateSchema, defaultSettingsState, type SettingsState } from "@/types/storage";

/** Reads `pomodoro:settings:v1`, falling back to product defaults if missing/corrupt. */
export function readSettingsState(): SettingsState {
  const result = readLocalStorageValue(STORAGE_KEYS.settings, SettingsStateSchema);
  return result.ok ? result.value : defaultSettingsState();
}

export function writeSettingsState(state: SettingsState): void {
  writeLocalStorageValue(STORAGE_KEYS.settings, SettingsStateSchema, state);
}
