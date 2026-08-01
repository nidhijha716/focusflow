import { z } from "zod";

/**
 * Task record — IndexedDB store `tasks` (focusflow DB).
 * Source: 03_Local_Data_Schema.pdf, section 4.
 *
 * The zod schema is the single source of truth; the `Task` type is derived
 * from it so the interface and its runtime validator can never drift apart.
 */
export const TaskSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  completed: z.boolean(),
  position: z.number(),
  estimatedPomodoros: z.number().int().nonnegative().optional(),
  directFocusSeconds: z.number().nonnegative(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/** Fields accepted when creating a task; id/timestamps are assigned by the repository. */
export const NewTaskInputSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  directFocusSeconds: true,
}).extend({
  directFocusSeconds: z.number().nonnegative().default(0),
});

export type NewTaskInput = z.infer<typeof NewTaskInputSchema>;
