import type { FocusFlowDB } from "../schema";
import type { Task } from "@/types/task";

/**
 * Derive-on-read parent focus-time rollup.
 * Source: 03_Local_Data_Schema.pdf, Data Integrity Rules — "Parent totals
 * should be derived from descendants or carefully maintained to avoid
 * double-counting."
 *
 * Per Agent 3's implementation decision: a task's own `directFocusSeconds`
 * is a maintained field (incremented directly when one of ITS OWN focus
 * sessions completes — see completeFocusSession.ts). A parent task's
 * aggregate total is never cached; it is always computed by walking the
 * subtree at read time. This removes an entire class of drift bugs where a
 * cached parent counter and its children's real values disagree.
 */
export async function getSubtreeFocusSeconds(db: FocusFlowDB, rootTaskId: string): Promise<number> {
  const root = await db.get("tasks", rootTaskId);
  if (!root) return 0;

  let total = root.directFocusSeconds;
  const children = await db.getAllFromIndex("tasks", "parentId", rootTaskId);
  for (const child of children) {
    total += await getSubtreeFocusSeconds(db, child.id);
  }
  return total;
}

/**
 * Same rollup, but computed from an already-loaded task list (e.g. a
 * repository's `listAll()` result) instead of issuing per-node DB reads.
 * Prefer this in UI/selectors that already hold the full task list to avoid
 * N+1 IndexedDB round-trips.
 */
export function getSubtreeFocusSecondsFromList(tasks: readonly Task[], rootTaskId: string): number {
  const byParent = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const bucket = byParent.get(task.parentId) ?? [];
    bucket.push(task);
    byParent.set(task.parentId, bucket);
  }

  const byId = new Map(tasks.map((task) => [task.id, task] as const));

  function sum(taskId: string): number {
    const task = byId.get(taskId);
    if (!task) return 0;
    const childTotal = (byParent.get(taskId) ?? []).reduce(
      (acc, child) => acc + sum(child.id),
      0,
    );
    return task.directFocusSeconds + childTotal;
  }

  return sum(rootTaskId);
}
