import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  isLocalStorageAvailable,
  readLocalStorageValue,
  removeLocalStorageValue,
  writeLocalStorageValue,
} from "@/lib/security/storageGuard";

const Schema = z.object({ count: z.number().int().nonnegative() });
const KEY = "test:value";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  // Guarantees the `setItem` spy below is always restored, even if an
  // assertion inside that test throws before reaching its own cleanup.
  vi.restoreAllMocks();
});

describe("isLocalStorageAvailable", () => {
  it("is true in this jsdom environment", () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });
});

describe("readLocalStorageValue (zod fallback behavior)", () => {
  it("fails safely (does not throw) when the key is missing", () => {
    const result = readLocalStorageValue(KEY, Schema);
    expect(result.ok).toBe(false);
  });

  it("fails safely on malformed JSON instead of throwing", () => {
    window.localStorage.setItem(KEY, "{not valid json");
    const result = readLocalStorageValue(KEY, Schema);
    expect(result.ok).toBe(false);
  });

  it("fails safely when the stored JSON doesn't match the schema, with issue details", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ count: "not-a-number" }));
    const result = readLocalStorageValue(KEY, Schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues?.length).toBeGreaterThan(0);
    }
  });

  it("fails safely when the stored value is a corrupted/wrong-shape record (e.g. an array instead of an object)", () => {
    window.localStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    expect(readLocalStorageValue(KEY, Schema).ok).toBe(false);
  });

  it("succeeds and returns the parsed value when storage holds valid data", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ count: 3 }));
    const result = readLocalStorageValue(KEY, Schema);
    expect(result).toEqual({ ok: true, value: { count: 3 } });
  });
});

describe("writeLocalStorageValue", () => {
  it("persists a value that satisfies the schema", () => {
    const result = writeLocalStorageValue(KEY, Schema, { count: 5 });
    expect(result.ok).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual({ count: 5 });
  });

  it("refuses to persist a value that fails its own schema, and does not touch storage", () => {
    // -1 is valid TypeScript (Schema's inferred type is just `number`) but
    // fails the zod `.min(0)` refinement at runtime -- exactly the guard
    // this test exercises.
    const result = writeLocalStorageValue(KEY, Schema, { count: -1 });
    expect(result.ok).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("reports a dedicated error when localStorage.setItem throws QuotaExceededError, without throwing itself", () => {
    const proto = Object.getPrototypeOf(window.localStorage) as Storage;
    const originalSetItem = proto.setItem.bind(window.localStorage);

    // Only the real key under test throws -- `isLocalStorageAvailable()`'s
    // own probe write (a different key) must keep succeeding, otherwise
    // this only exercises the "storage unavailable" branch instead of the
    // quota-exceeded one.
    vi.spyOn(proto, "setItem").mockImplementation((key: string, value: string) => {
      if (key === KEY) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      originalSetItem(key, value);
    });

    const result = writeLocalStorageValue(KEY, Schema, { count: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/quota/i);
    }
  });
});

describe("removeLocalStorageValue", () => {
  it("removes a stored key", () => {
    window.localStorage.setItem(KEY, "1");
    removeLocalStorageValue(KEY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("never throws even if storage is unavailable", () => {
    expect(() => removeLocalStorageValue(KEY)).not.toThrow();
  });
});
