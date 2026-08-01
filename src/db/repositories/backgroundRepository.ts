import type { FocusFlowDB } from "../schema";
import {
  BackgroundRecordSchema,
  NewBackgroundInputSchema,
  type BackgroundRecord,
  type NewBackgroundInput,
} from "@/types/background";

/**
 * Repository for the `backgrounds` IndexedDB store.
 * Source: 03_Local_Data_Schema.pdf, section 8.
 *
 * Only structural validation (mimeType allow-list, positive dimensions/size,
 * `Blob` instance check) happens here. Content-level security checks
 * (e.g. sniffing real file bytes, enforcing a max upload size/quota) belong
 * to Agent 4 (Security and Access) wrapping `NewBackgroundInputSchema` ù do
 * not duplicate that policy here.
 */
function parseBackgroundOrThrow(record: unknown, id: string): BackgroundRecord {
  const result = BackgroundRecordSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt background record for id="${id}": ${result.error.message}`);
  }
  return result.data;
}

export async function addBackground(
  db: FocusFlowDB,
  input: NewBackgroundInput,
  id: string,
): Promise<BackgroundRecord> {
  const parsedInput = NewBackgroundInputSchema.parse(input);
  const record: BackgroundRecord = {
    ...parsedInput,
    id,
    createdAt: Date.now(),
  };
  await db.put("backgrounds", BackgroundRecordSchema.parse(record));
  return record;
}

export async function getBackground(db: FocusFlowDB, id: string): Promise<BackgroundRecord | null> {
  const record = await db.get("backgrounds", id);
  if (!record) return null;
  return parseBackgroundOrThrow(record, id);
}

export async function listBackgrounds(db: FocusFlowDB): Promise<BackgroundRecord[]> {
  const records = await db.getAll("backgrounds");
  return records.map((record) => parseBackgroundOrThrow(record, record.id));
}

/** For Agent 4's `checkBackgroundCountQuota` (src/lib/security/quota.ts) to check before `addBackground`. */
export async function countBackgrounds(db: FocusFlowDB): Promise<number> {
  return db.count("backgrounds");
}

export async function deleteBackground(db: FocusFlowDB, id: string): Promise<void> {
  await db.delete("backgrounds", id);
}
