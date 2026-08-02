import { beforeEach, describe, expect, it } from "vitest";
import { cancelSession, completeFocusSession } from "@/db/integrity/completeFocusSession";
import { createTestDb } from "@/test/dbTestUtils";
import { toCompletedFlag, type FocusFlowDB } from "@/db/schema";
import type { NewSessionInput } from "@/types/session";
import type { Task } from "@/types/task";

async function seedTask(db: FocusFlowDB, id: string): Promise<Task> {
  const task: Task = {
    id,
    parentId: null,
    title: "Write report",
    completed: false,
    position: 0,
    directFocusSeconds: 0,
    createdAt: 0,
    updatedAt: 0,
  };
  await db.put("tasks", { ...task, completedFlag: toCompletedFlag(task.completed) });
  return task;
}

function focusInput(overrides: Partial<NewSessionInput> = {}): NewSessionInput {
  return {
    id: "session-1",
    taskId: null,
    type: "focus",
    plannedSeconds: 1500,
    actualSeconds: 1500,
    startedAt: 0,
    localDate: "2024-01-01",
    ...overrides,
  };
}

let db: FocusFlowDB;

beforeEach(async () => {
  db = await createTestDb();
});

describe("completeFocusSession", () => {
  it("records the session, and rolls it into that local date's dailyStats", async () => {
    await completeFocusSession(db, focusInput(), 1_500_000);

    const session = await db.get("sessions", "session-1");
    expect(session).toMatchObject({ status: "completed", completedAt: 1_500_000 });

    const stats = await db.get("dailyStats", "2024-01-01");
    expect(stats).toMatchObject({ focusSessions: 1, focusSeconds: 1500, shortBreaks: 0, longBreaks: 0 });
  });

  it("credits directFocusSeconds on the attached task, only for focus sessions", async () => {
    await seedTask(db, "task-1");
    await completeFocusSession(db, focusInput({ taskId: "task-1" }));

    const task = await db.get("tasks", "task-1");
    expect(task?.directFocusSeconds).toBe(1500);
  });

  it("does NOT credit a task for a break session, even if a taskId were somehow attached (VAL-012)", async () => {
    await seedTask(db, "task-1");
    await completeFocusSession(
      db,
      focusInput({ id: "session-break", type: "short_break", taskId: "task-1", actualSeconds: 300 })
    );

    const task = await db.get("tasks", "task-1");
    expect(task?.directFocusSeconds).toBe(0);

    const stats = await db.get("dailyStats", "2024-01-01");
    expect(stats).toMatchObject({ shortBreaks: 1, focusSessions: 0, focusSeconds: 0 });
  });

  it("is idempotent by session id: a retried/duplicate call for the same id is a total no-op", async () => {
    await seedTask(db, "task-1");
    const input = focusInput({ taskId: "task-1" });

    const first = await completeFocusSession(db, input, 1_000);
    const second = await completeFocusSession(db, input, 999_999); // simulates a retried call with a different "now"

    expect(second).toEqual(first);

    const stats = await db.get("dailyStats", "2024-01-01");
    expect(stats?.focusSessions).toBe(1); // not 2
    expect(stats?.focusSeconds).toBe(1500); // not 3000

    const task = await db.get("tasks", "task-1");
    expect(task?.directFocusSeconds).toBe(1500); // not 3000
  });

  it("two different sessions on the same local date accumulate rather than overwrite", async () => {
    await completeFocusSession(db, focusInput({ id: "session-1" }));
    await completeFocusSession(db, focusInput({ id: "session-2" }));

    const stats = await db.get("dailyStats", "2024-01-01");
    expect(stats?.focusSessions).toBe(2);
    expect(stats?.focusSeconds).toBe(3000);
  });
});

describe("cancelSession", () => {
  it("records a cancelled session without touching dailyStats or task totals", async () => {
    await seedTask(db, "task-1");
    await cancelSession(db, focusInput({ taskId: "task-1" }), 500);

    const session = await db.get("sessions", "session-1");
    expect(session).toMatchObject({ status: "cancelled", completedAt: 500 });

    const stats = await db.get("dailyStats", "2024-01-01");
    expect(stats).toBeUndefined();

    const task = await db.get("tasks", "task-1");
    expect(task?.directFocusSeconds).toBe(0);
  });

  it("is idempotent by session id", async () => {
    const input = focusInput();
    const first = await cancelSession(db, input, 1);
    const second = await cancelSession(db, input, 2);
    expect(second).toEqual(first);
  });
});
