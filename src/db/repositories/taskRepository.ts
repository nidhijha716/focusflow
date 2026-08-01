import { toCompletedFlag, type FocusFlowDB, type TaskDbRecord } from "../schema";
import { NewTaskInputSchema, TaskSchema, type NewTaskInput, type Task } from "@/types/task";

/**
 * Repository for the `tasks` IndexedDB store.
 * Source: 03_Local_Data_Schema.pdf, section 4.
 *
 * Every record is validated with `TaskSchema` on the way out of the DB so a
 * malformed/legacy record can never silently propagate into the app (Data
 * Integrity Rules: "Reject malformed persisted values and fall back to safe
 * defaults" -- for a required entity like a task, "reject" means throwing
 * rather than fabricating a fake task; callers should catch and skip/report
 * the offending id). `TaskSchema.safeParse` also strips the DB-only
 * `completedFlag` mirror field (see src/db/schema.ts) back down to the
 * public `Task` shape.
 */
function parseTaskOrThrow(record: unknown, id: string): Task {
  const result = TaskSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt task record for id="${id}": ${result.error.message}`);
  }
  return result.data;
}

function toDbRecord(task: Task): TaskDbRecord {
  return { ...task, completedFlag: toCompletedFlag(task.completed) };
}

export async function createTask(db: FocusFlowDB, input: NewTaskInput, id: string): Promise<Task> {
  const parsedInput = NewTaskInputSchema.parse(input);
  const now = Date.now();
  const task: Task = {
    ...parsedInput,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("tasks", toDbRecord(TaskSchema.parse(task)));
  return task;
}

export async function getTask(db: FocusFlowDB, id: string): Promise<Task | null> {
  const record = await db.get("tasks", id);
  if (!record) return null;
  return parseTaskOrThrow(record, id);
}

/** Direct children of `parentId` via the `parentId` index. */
export async function listChildren(db: FocusFlowDB, parentId: string): Promise<Task[]> {
  const records = await db.getAllFromIndex("tasks", "parentId", parentId);
  return records.map((record) => parseTaskOrThrow(record, record.id));
}

/**
 * Top-level tasks (`parentId === null`). `null` is not a valid IndexedDB
 * key, so these are never present in the `parentId` index (see schema.ts)
 * and must be found via a full scan + filter instead.
 */
export async function listRootTasks(db: FocusFlowDB): Promise<Task[]> {
  const records = await db.getAll("tasks");
  return records
    .filter((record) => record.parentId === null)
    .map((record) => parseTaskOrThrow(record, record.id));
}

export async function listAllTasks(db: FocusFlowDB): Promise<Task[]> {
  const records = await db.getAll("tasks");
  return records.map((record) => parseTaskOrThrow(record, record.id));
}

/** Uses the `completedFlag` mirror index -- see schema.ts for why `completed` itself isn't indexable. */
export async function listTasksByCompleted(db: FocusFlowDB, completed: boolean): Promise<Task[]> {
  const records = await db.getAllFromIndex("tasks", "completedFlag", toCompletedFlag(completed));
  return records.map((record) => parseTaskOrThrow(record, record.id));
}

export async function updateTask(
  db: FocusFlowDB,
  id: string,
  patch: Partial<Omit<Task, "id" | "createdAt">>,
): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new Error(`Cannot update task id="${id}": not found`);
  }
  const updated = TaskSchema.parse({
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  });
  await db.put("tasks", toDbRecord(updated));
  return updated;
}

/**
 * Deletes a task and all of its descendants. Cascading is required here to
 * avoid orphaned children pointing at a `parentId` that no longer exists,
 * which would otherwise silently break the derive-on-read rollup in
 * src/db/integrity/taskRollup.ts.
 */
export async function deleteTaskCascade(db: FocusFlowDB, id: string): Promise<void> {
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  async function deleteSubtree(taskId: string): Promise<void> {
    const children = await store.index("parentId").getAll(taskId);
    for (const child of children) {
      await deleteSubtree(child.id);
    }
    await store.delete(taskId);
  }

  await deleteSubtree(id);
  await tx.done;
}
