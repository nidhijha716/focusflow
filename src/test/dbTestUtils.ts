import { openDB } from "idb";
import { createV1Schema } from "@/db/schema";
import type { FocusFlowDB, FocusFlowDBSchema } from "@/db/schema";

let counter = 0;

/**
 * Opens a fresh, isolated `focusflow`-schema database for a single test,
 * backed by `fake-indexeddb` (see vitest.setup.ts). A unique database name
 * per call keeps tests independent without needing to delete/reset a
 * shared database between them.
 */
export async function createTestDb(): Promise<FocusFlowDB> {
  counter += 1;
  const name = `focusflow-test-${Date.now()}-${counter}`;
  return openDB<FocusFlowDBSchema>(name, 1, {
    upgrade(db) {
      createV1Schema(db);
    },
  });
}
