import type { FocusFlowDB } from "../schema";
import { SessionSchema, type Session } from "@/types/session";

/**
 * Repository for the `sessions` IndexedDB store.
 * Source: 03_Local_Data_Schema.pdf, section 5.
 *
 * Write paths that must be idempotent (completion/cancellation) intentionally
 * live in src/db/integrity/completeFocusSession.ts and are re-exported here
 * as the single public entry point — do not add a second `completeSession`
 * implementation in this file.
 */
export { completeFocusSession, cancelSession } from "../integrity/completeFocusSession";

function parseSessionOrThrow(record: unknown, id: string): Session {
  const result = SessionSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt session record for id="${id}": ${result.error.message}`);
  }
  return result.data;
}

export async function getSession(db: FocusFlowDB, id: string): Promise<Session | null> {
  const record = await db.get("sessions", id);
  if (!record) return null;
  return parseSessionOrThrow(record, id);
}

export async function listSessionsByTask(db: FocusFlowDB, taskId: string): Promise<Session[]> {
  const records = await db.getAllFromIndex("sessions", "taskId", taskId);
  return records.map((record) => parseSessionOrThrow(record, record.id));
}

export async function listSessionsByLocalDate(db: FocusFlowDB, localDate: string): Promise<Session[]> {
  const records = await db.getAllFromIndex("sessions", "localDate", localDate);
  return records.map((record) => parseSessionOrThrow(record, record.id));
}

/** Inclusive range over the `localDate` index, e.g. for a weekly/monthly stats view. */
export async function listSessionsByLocalDateRange(
  db: FocusFlowDB,
  startLocalDate: string,
  endLocalDate: string,
): Promise<Session[]> {
  const range = IDBKeyRange.bound(startLocalDate, endLocalDate);
  const records = await db.getAllFromIndex("sessions", "localDate", range);
  return records.map((record) => parseSessionOrThrow(record, record.id));
}
