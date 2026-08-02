import type { FocusFlowDBSchema, FocusFlowUpgradeTransaction } from "./schema";
import { createV1Schema } from "./schema";
import type { IDBPDatabase } from "idb";

/**
 * Migration steps for the `focusflow` IndexedDB database.
 * Source: 03_Local_Data_Schema.pdf, Data Integrity Rules — "Provide explicit
 * IndexedDB migration functions for future versions."
 *
 * Ownership note: Agent 3 (this file) owns the *content* of each version's
 * migration step. Agent 2 owns the migration *runner* — the code that opens
 * the database and decides which steps to invoke for a given
 * `oldVersion -> newVersion` transition (their `src/db/client.ts`). Agent 2's
 * runner should call `runMigrations` (or iterate `MIGRATIONS` directly)
 * instead of re-implementing store-creation logic, to avoid duplicating the
 * v1 schema definition.
 */
export type MigrationStep = (
  db: IDBPDatabase<FocusFlowDBSchema>,
  transaction: FocusFlowUpgradeTransaction,
) => void;

/** Keyed by the version a step upgrades *to*. */
export const MIGRATIONS: Record<number, MigrationStep> = {
  1: (db) => createV1Schema(db),
};

/**
 * Runs every migration step between `(oldVersion, newVersion]` in order.
 * Intended to be called from the `upgrade()` callback passed to idb's
 * `openDB` (see src/db/client.ts).
 */
export function runMigrations(
  db: IDBPDatabase<FocusFlowDBSchema>,
  transaction: FocusFlowUpgradeTransaction,
  oldVersion: number,
  newVersion: number,
): void {
  for (let version = oldVersion + 1; version <= newVersion; version += 1) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(`No migration registered for focusflow schema version ${version}`);
    }
    step(db, transaction);
  }
}
