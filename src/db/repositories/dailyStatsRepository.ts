import type { FocusFlowDB } from "../schema";
import { DailyStatsSchema, emptyDailyStats, type DailyStats } from "@/types/dailyStats";

/**
 * Read-only repository for the `dailyStats` IndexedDB store.
 * Source: 03_Local_Data_Schema.pdf, section 6.
 *
 * Writes only ever happen as a side effect of a completed session (Data
 * Integrity Rules: "Only completed focus sessions increase ... daily focus
 * statistics") and are owned by
 * src/db/integrity/completeFocusSession.ts — this repository intentionally
 * exposes no `put`/`upsert` to prevent a second write path from drifting out
 * of sync with that integrity logic.
 */
function parseStatsOrThrow(record: unknown, date: string): DailyStats {
  const result = DailyStatsSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt dailyStats record for date="${date}": ${result.error.message}`);
  }
  return result.data;
}

export async function getDailyStats(db: FocusFlowDB, date: string): Promise<DailyStats> {
  const record = await db.get("dailyStats", date);
  if (!record) return emptyDailyStats(date);
  return parseStatsOrThrow(record, date);
}

export async function listDailyStatsRange(
  db: FocusFlowDB,
  startDate: string,
  endDate: string,
): Promise<DailyStats[]> {
  const range = IDBKeyRange.bound(startDate, endDate);
  const records = await db.getAll("dailyStats", range);
  return records.map((record) => parseStatsOrThrow(record, record.date));
}
