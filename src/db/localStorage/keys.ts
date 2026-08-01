/**
 * localStorage key names — 03_Local_Data_Schema.pdf, section 2.
 * Kept as literal constants (not string templates) so a typo can never
 * silently create a new, disconnected key.
 */
export const STORAGE_KEYS = {
  timer: "pomodoro:timer:v1",
  settings: "pomodoro:settings:v1",
  ui: "pomodoro:ui:v1",
  schemaVersion: "pomodoro:schema-version",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
