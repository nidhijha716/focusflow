import { z } from "zod";
import { LocalDateSchema } from "./localDate";

/**
 * Session record — IndexedDB store `sessions` (focusflow DB).
 * Source: 03_Local_Data_Schema.pdf, section 5.
 */
export const SessionTypeSchema = z.enum(["focus", "short_break", "long_break"]);
export type SessionType = z.infer<typeof SessionTypeSchema>;

export const SessionStatusSchema = z.enum(["completed", "cancelled"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1).nullable(),
  type: SessionTypeSchema,
  plannedSeconds: z.number().nonnegative(),
  actualSeconds: z.number().nonnegative(),
  status: SessionStatusSchema,
  startedAt: z.number(),
  completedAt: z.number().optional(),
  localDate: LocalDateSchema,
});

export type Session = z.infer<typeof SessionSchema>;

/** Fields accepted when starting a session; status/completedAt are set by the repository. */
export const NewSessionInputSchema = SessionSchema.omit({
  status: true,
  completedAt: true,
  actualSeconds: true,
}).extend({
  actualSeconds: z.number().nonnegative().default(0),
});

export type NewSessionInput = z.infer<typeof NewSessionInputSchema>;
