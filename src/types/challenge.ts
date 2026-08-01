import { z } from "zod";
import { LocalDateSchema } from "./localDate";

/**
 * STUB — Challenge record — IndexedDB store `challenges` (focusflow DB).
 *
 * 03_Local_Data_Schema.pdf only defines the store's key (`id`) and indexes
 * (`date`, `completed`) for this entity; no field-level record shape is
 * given anywhere in the document. Per Agent 3's analysis phase report, this
 * is a cross-agent blocker (likely owned by feature/gamification scope in
 * 06_Feature_Ticket_List). This schema intentionally only models the fields
 * the spec guarantees exist (via its indexes) plus bookkeeping timestamps,
 * so the object store and repository are usable without over-committing to
 * an unconfirmed shape. Extend `ChallengeSchema` in place once the full
 * record shape is confirmed — do not create a second/parallel type.
 */
export const ChallengeSchema = z.object({
  id: z.string().min(1),
  date: LocalDateSchema,
  completed: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Challenge = z.infer<typeof ChallengeSchema>;
