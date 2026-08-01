/**
 * @deprecated These used to be a second, competing set of localStorage key
 * literals (`pomodoro:timer-snapshot`, `pomodoro:settings`) that did not
 * match the keys specified in 03_Local_Data_Schema.pdf ù2
 * (`pomodoro:timer:v1`, `pomodoro:settings:v1`, ...). The canonical keys
 * live in `@/db/localStorage/keys` (Agent 3) and are re-exported here so
 * existing `@/constants/storage.constants` / `@/constants` imports keep
 * working. Import from `@/db/localStorage/keys` directly in new code.
 */
export { STORAGE_KEYS, type StorageKey } from "@/db/localStorage/keys";
