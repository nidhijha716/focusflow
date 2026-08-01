import { readLocalStorageValue, writeLocalStorageValue } from "@/lib/security/storageGuard";
import { STORAGE_KEYS } from "./keys";
import { CURRENT_SCHEMA_VERSION, SchemaVersionSchema, type SchemaVersion } from "@/types/storage";

/**
 * Reads `pomodoro:schema-version`. Falls back to `CURRENT_SCHEMA_VERSION`
 * rather than `0`, since a missing/corrupt key on a fresh install should
 * not be mistaken for "needs migration from version 0" by callers that
 * compare this value against `CURRENT_SCHEMA_VERSION`.
 */
export function readSchemaVersion(): SchemaVersion {
  const result = readLocalStorageValue(STORAGE_KEYS.schemaVersion, SchemaVersionSchema);
  return result.ok ? result.value : CURRENT_SCHEMA_VERSION;
}

export function writeSchemaVersion(version: SchemaVersion): void {
  writeLocalStorageValue(STORAGE_KEYS.schemaVersion, SchemaVersionSchema, version);
}
