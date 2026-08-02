import { z } from "zod";

/**
 * STUB — Reward record — IndexedDB store `rewards` (focusflow DB).
 *
 * 03_Local_Data_Schema.pdf only defines the store's key (`id`) and indexes
 * (`unlockedAt`, `type`) for this entity; no field-level record shape is
 * given anywhere in the document (same blocker as `challenges`, see
 * src/types/challenge.ts). This schema models only the fields guaranteed by
 * the stated indexes. Extend in place once the full shape is confirmed.
 */
export const RewardSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  unlockedAt: z.number(),
  createdAt: z.number(),
});

export type Reward = z.infer<typeof RewardSchema>;
