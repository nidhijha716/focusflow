import { openDB } from "idb";
import { DB_NAME, DB_VERSION, type FocusFlowDB, type FocusFlowDBSchema } from "@/db/schema";
import { runMigrations } from "@/db/migrations";

let dbPromise: Promise<FocusFlowDB> | null = null;

/**
 * Opens the shared IndexedDB connection (02_Technical_Architecture §2/§5).
 * This is the migration *runner* only: `DB_NAME`, `DB_VERSION`, and the
 * `FocusFlowDBSchema` are owned by db/schema.ts, and the content of each
 * version's upgrade step is owned by db/migrations.ts (`runMigrations`) —
 * both belong to the entity/schema layer, not to this architecture-layer
 * client.
 */
export function getDb(): Promise<FocusFlowDB> {
  if (!dbPromise) {
    dbPromise = openDB<FocusFlowDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, newVersion, transaction) {
        runMigrations(database, transaction, oldVersion, newVersion ?? DB_VERSION);
      },
      blocked(currentVersion, blockedVersion) {
        console.warn(`[db] Open of "${DB_NAME}" v${blockedVersion} blocked by an open connection at v${currentVersion}.`);
      },
      blocking(currentVersion, blockedVersion) {
        console.warn(`[db] This connection to "${DB_NAME}" v${currentVersion} is blocking v${blockedVersion}.`);
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const database = await dbPromise;
  database.close();
  dbPromise = null;
}
