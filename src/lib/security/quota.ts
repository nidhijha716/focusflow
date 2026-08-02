/**
 * Storage quota handling: max saved custom backgrounds + generic
 * quota-exceeded / low-storage detection.
 *
 * Scope: 04_Security_and_Access.pdf §6, §8 — "Set a maximum ... number of
 * saved custom backgrounds", "Handle IndexedDB unavailable/quota errors
 * without crashing the timer", "Warn when custom images cannot be stored
 * because quota is exceeded."
 */

import type { QuotaCheckResult, StorageEstimateSnapshot } from "@/types/security";

/** Default max number of custom backgrounds a user may save at once. */
export const DEFAULT_MAX_CUSTOM_BACKGROUNDS = 10;

/**
 * Checks whether saving one more custom background would exceed the allowed
 * count. Pure/synchronous — callers pass in the current count from wherever
 * Agent 3's repository layer tracks it (IndexedDB is not touched here).
 */
export function checkBackgroundCountQuota(
  currentCount: number,
  maxCount: number = DEFAULT_MAX_CUSTOM_BACKGROUNDS
): QuotaCheckResult {
  if (currentCount >= maxCount) {
    return {
      ok: false,
      reason: `You can save up to ${maxCount} custom backgrounds. Delete one before adding another.`,
      currentCount,
      maxCount,
    };
  }
  return { ok: true, currentCount, maxCount };
}

/**
 * True if `error` represents a browser storage quota failure, across the
 * shapes thrown by `localStorage.setItem` (DOMException) and IndexedDB
 * transactions (also DOMException, name `QuotaExceededError`).
 */
export function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      // Legacy numeric code, still set by some browsers alongside the name.
      error.code === 22)
  );
}

/**
 * Best-effort snapshot of overall origin storage usage via the Storage
 * Manager API. Returns `supported: false` (never throws) when unavailable —
 * e.g. older browsers, some privacy modes, or non-browser environments.
 */
export async function getStorageEstimate(): Promise<StorageEstimateSnapshot> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usageBytes: null, quotaBytes: null, usageRatio: null, supported: false };
  }

  try {
    const { usage, quota } = await navigator.storage.estimate();
    const usageBytes = usage ?? null;
    const quotaBytes = quota ?? null;
    const usageRatio =
      usageBytes !== null && quotaBytes !== null && quotaBytes > 0 ? usageBytes / quotaBytes : null;

    return { usageBytes, quotaBytes, usageRatio, supported: true };
  } catch {
    return { usageBytes: null, quotaBytes: null, usageRatio: null, supported: false };
  }
}

/**
 * True if usage is at or above `thresholdRatio` (default 90%) of the
 * origin's storage quota. Used to proactively warn before writes start
 * failing with quota errors. Returns `false` if the estimate is unsupported
 * or unknown — callers should still handle `isQuotaExceededError` on the
 * actual write as the authoritative check.
 */
export async function isStorageNearQuota(thresholdRatio = 0.9): Promise<boolean> {
  const estimate = await getStorageEstimate();
  return estimate.usageRatio !== null && estimate.usageRatio >= thresholdRatio;
}
