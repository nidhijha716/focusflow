/**
 * @deprecated `SettingsSnapshot` used to be a second, competing shape for
 * user preferences alongside the canonical `pomodoro:settings:v1` schema
 * (`@/types/storage`, Agent 3, 03_Local_Data_Schema.pdf ù2). Re-exported
 * here so existing `@/types/settings.types` imports keep working; import
 * `SettingsState` directly from `@/types/storage` in new code.
 */
export type { SettingsState as SettingsSnapshot } from "@/types/storage";
