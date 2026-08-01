import { toCompletedFlag, type ChallengeDbRecord, type FocusFlowDB } from "../schema";
import { ChallengeSchema, type Challenge } from "@/types/challenge";

/**
 * STUB repository for the `challenges` IndexedDB store.
 * See src/types/challenge.ts for why this is minimal -- the PDF only
 * specifies the store's key/indexes, not a full record shape. Extend this
 * file (not a new one) once the real shape is confirmed.
 */
function parseChallengeOrThrow(record: unknown, id: string): Challenge {
  const result = ChallengeSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt challenge record for id="${id}": ${result.error.message}`);
  }
  return result.data;
}

function toDbRecord(challenge: Challenge): ChallengeDbRecord {
  return { ...challenge, completedFlag: toCompletedFlag(challenge.completed) };
}

export async function upsertChallenge(db: FocusFlowDB, challenge: Challenge): Promise<Challenge> {
  const parsed = ChallengeSchema.parse(challenge);
  await db.put("challenges", toDbRecord(parsed));
  return parsed;
}

export async function getChallenge(db: FocusFlowDB, id: string): Promise<Challenge | null> {
  const record = await db.get("challenges", id);
  if (!record) return null;
  return parseChallengeOrThrow(record, id);
}

export async function listChallengesByDate(db: FocusFlowDB, date: string): Promise<Challenge[]> {
  const records = await db.getAllFromIndex("challenges", "date", date);
  return records.map((record) => parseChallengeOrThrow(record, record.id));
}

/** Uses the `completedFlag` mirror index -- see schema.ts for why `completed` itself isn't indexable. */
export async function listChallengesByCompleted(db: FocusFlowDB, completed: boolean): Promise<Challenge[]> {
  const records = await db.getAllFromIndex("challenges", "completedFlag", toCompletedFlag(completed));
  return records.map((record) => parseChallengeOrThrow(record, record.id));
}
