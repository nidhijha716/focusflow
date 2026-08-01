/**
 * Safe `localStorage` read/write wrapper.
 *
 * Scope: 04_Security_and_Access.pdf ù8, ù10 ù "Never assume persisted JSON
 * is trustworthy; parse and validate it" and "Test malformed localStorage
 * ... records."
 *
 * This module intentionally does NOT define entity schemas (Timer state,
 * Settings, etc.) ù those belong to the local data layer (03_Local_Data_Schema,
 * owned separately). Callers pass in a Zod schema (`z.ZodType<T>`), so this
 * file stays a thin, reusable guard that any entity schema can plug into
 * once it exists, e.g.:
 *
 * ```ts
 * import { timerStateSchema } from "@/lib/data/schemas"; // Agent 3's schema
 * import { readLocalStorageValue } from "@/lib/security/storageGuard";
 *
 * const result = readLocalStorageValue("timerState", timerStateSchema);
 * if (result.ok) { ... } else { ... fall back to defaults ... }
 * ```
 */

import type { z } from "zod";
import type { ValidationResult } from "@/types/security";
import { isQuotaExceededError } from "./quota";

/** True if `window.localStorage` exists and a probe write/remove succeeds (private mode, disabled storage, SSR). */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return false;
  }
  const probeKey = "__security_storage_probe__";
  try {
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function zodIssuesToStrings(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

/**
 * Reads and validates a JSON-encoded value from `localStorage`. Never
 * throws: unavailable storage, missing keys, malformed JSON, and schema
 * mismatches all resolve to `{ ok: false, ... }` so callers can fall back to
 * safe defaults instead of crashing the timer.
 */
export function readLocalStorageValue<T>(key: string, schema: z.ZodType<T>): ValidationResult<T> {
  if (!isLocalStorageAvailable()) {
    return { ok: false, error: "localStorage is unavailable in this environment." };
  }

  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return { ok: false, error: `No value stored for key "${key}".` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: `Value stored for key "${key}" is not valid JSON.` };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: `Value stored for key "${key}" failed schema validation.`,
      issues: zodIssuesToStrings(result.error),
    };
  }

  return { ok: true, value: result.data };
}

/**
 * Validates `value` against `schema` and, only if valid, persists it as JSON
 * under `key`. Handles quota-exceeded and unavailable-storage failures
 * without throwing.
 */
export function writeLocalStorageValue<T>(
  key: string,
  schema: z.ZodType<T>,
  value: T
): ValidationResult<T> {
  if (!isLocalStorageAvailable()) {
    return { ok: false, error: "localStorage is unavailable in this environment." };
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      error: `Refusing to persist an invalid value for key "${key}".`,
      issues: zodIssuesToStrings(result.error),
    };
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(result.data));
    return { ok: true, value: result.data };
  } catch (err) {
    return {
      ok: false,
      error: isQuotaExceededError(err)
        ? `Storage quota exceeded while saving key "${key}".`
        : `Failed to save key "${key}" to localStorage.`,
    };
  }
}

/** Removes a key from `localStorage` without throwing if storage is unavailable. */
export function removeLocalStorageValue(key: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Intentionally ignored: removal failures should never crash the app.
  }
}
