import type { FocusFlowDB } from "../schema";
import { RewardSchema, type Reward } from "@/types/reward";

/**
 * STUB repository for the `rewards` IndexedDB store.
 * See src/types/reward.ts for why this is minimal — the PDF only specifies
 * the store's key/indexes, not a full record shape. Extend this file (not a
 * new one) once the real shape is confirmed.
 */
function parseRewardOrThrow(record: unknown, id: string): Reward {
  const result = RewardSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt reward record for id="${id}": ${result.error.message}`);
  }
  return result.data;
}

export async function addReward(db: FocusFlowDB, reward: Reward): Promise<Reward> {
  const parsed = RewardSchema.parse(reward);
  await db.put("rewards", parsed);
  return parsed;
}

export async function listRewards(db: FocusFlowDB): Promise<Reward[]> {
  const records = await db.getAll("rewards");
  return records.map((record) => parseRewardOrThrow(record, record.id));
}

export async function listRewardsByType(db: FocusFlowDB, type: string): Promise<Reward[]> {
  const records = await db.getAllFromIndex("rewards", "type", type);
  return records.map((record) => parseRewardOrThrow(record, record.id));
}
