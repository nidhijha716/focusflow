import { beforeEach, describe, expect, it } from "vitest";
import { getSubtreeFocusSeconds, getSubtreeFocusSecondsFromList } from "@/db/integrity/taskRollup";
import { createTestDb } from "@/test/dbTestUtils";
import { toCompletedFlag, type FocusFlowDB } from "@/db/schema";
import type { Task } from "@/types/task";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "id",
    parentId: null,
    title: "Task",
    completed: false,
    position: 0,
    directFocusSeconds: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/**
 * Root
 *  |-- Child A (direct: 100)
 *  |     `-- Grandchild (direct: 50)
 *  `-- Child B (direct: 200)
 *
 * Expected subtree total for Root: 100 (own) + 100 (A) + 50 (grandchild) + 200 (B) = 450.
 */
const ROOT = makeTask({ id: "root", directFocusSeconds: 100 });
const CHILD_A = makeTask({ id: "child-a", parentId: "root", directFocusSeconds: 100 });
const GRANDCHILD = makeTask({ id: "grandchild", parentId: "child-a", directFocusSeconds: 50 });
const CHILD_B = makeTask({ id: "child-b", parentId: "root", directFocusSeconds: 200 });
const ALL_TASKS = [ROOT, CHILD_A, GRANDCHILD, CHILD_B];

describe("getSubtreeFocusSecondsFromList (derive-on-read, in-memory)", () => {
  it("sums a task's own directFocusSeconds plus every descendant's, without double-counting", () => {
    expect(getSubtreeFocusSecondsFromList(ALL_TASKS, "root")).toBe(450);
  });

  it("a leaf task's subtree total is just its own directFocusSeconds", () => {
    expect(getSubtreeFocusSecondsFromList(ALL_TASKS, "grandchild")).toBe(50);
  });

  it("a mid-level task's subtree total includes only its own descendants, not siblings", () => {
    expect(getSubtreeFocusSecondsFromList(ALL_TASKS, "child-a")).toBe(150); // 100 + 50, not child-b's 200
  });

  it("returns 0 for an id that doesn't exist in the list", () => {
    expect(getSubtreeFocusSecondsFromList(ALL_TASKS, "missing")).toBe(0);
  });

  it("is re-derived from the current list every call -- updating a child's total is reflected immediately with no cache to invalidate", () => {
    const updatedChildB = { ...CHILD_B, directFocusSeconds: 500 };
    const updatedList = ALL_TASKS.map((task) => (task.id === "child-b" ? updatedChildB : task));
    expect(getSubtreeFocusSecondsFromList(updatedList, "root")).toBe(750);
  });
});

describe("getSubtreeFocusSeconds (derive-on-read, IndexedDB)", () => {
  let db: FocusFlowDB;

  beforeEach(async () => {
    db = await createTestDb();
    for (const task of ALL_TASKS) {
      await db.put("tasks", { ...task, completedFlag: toCompletedFlag(task.completed) });
    }
  });

  it("matches the in-memory computation for the same tree", async () => {
    expect(await getSubtreeFocusSeconds(db, "root")).toBe(450);
    expect(await getSubtreeFocusSeconds(db, "child-a")).toBe(150);
  });

  it("returns 0 for a root id that doesn't exist", async () => {
    expect(await getSubtreeFocusSeconds(db, "does-not-exist")).toBe(0);
  });
});
