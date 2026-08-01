import type { DBSchema, IDBPDatabase, IDBPTransaction, StoreNames } from "idb";
import type { BackgroundRecord } from "@/types/background";
import type { Challenge } from "@/types/challenge";
import type { DailyStats } from "@/types/dailyStats";
import type { Reward } from "@/types/reward";
import type { Session } from "@/types/session";
import type { Streak } from "@/types/streak";
import type { Task } from "@/types/task";

/**
 * IndexedDB schema for the `focusflow` database.
 * Source: 03_Local_Data_Schema.pdf, section 3 (store/key/index table).
 *
 * This is the single source of truth for store names, key paths and
 * indexes. Repositories (src/db/repositories/*) must only reference stores
 * through `FocusFlowDBSchema` / `STORE_NAMES` -- never hardcode a store name
 * string in a repository file.
 *
 * IndexedDB constraint: index paths must resolve to a valid IDB key
 * (string | number | Date | BufferSource | array of those). The PDF lists
 * two kinds of indexes that don't satisfy this on their own:
 *   1. `completed` on `tasks`/`challenges` is a boolean. Booleans are not a
 *      valid IDB key, so a record with `completed: false`/`true` indexed
 *      directly would silently never appear in the index. We mirror it into
 *      a DB-only `completedFlag: 0 | 1` field that IS indexed; the public
 *      `Task`/`Challenge` types (and their zod schemas) are unaffected --
 *      repositories compute/strip `completedFlag` at the write/read boundary.
 *   2. `parentId` on `tasks`, `taskId` on `sessions`, and `lastActiveDate` on
 *      `streak` are nullable strings. `null` is likewise not a valid IDB
 *      key, so records with a null value for these fields are simply absent
 *      from the index (per spec, not an error). The index type therefore
 *      omits `null`; querying for "no parent"/"no task" must fall back to
 *      `getAll` + filter (see `listRootTasks` in taskRepository.ts) rather
 *      than an index lookup with a `null` key.
 */
export const DB_NAME = "focusflow" as const;

/** Bump when adding/changing stores or indexes; add a branch in `MIGRATIONS` (src/db/migrations.ts). */
export const DB_VERSION = 1 as const;

export const STORE_NAMES = {
  tasks: "tasks",
  sessions: "sessions",
  dailyStats: "dailyStats",
  streak: "streak",
  challenges: "challenges",
  backgrounds: "backgrounds",
  rewards: "rewards",
} as const;

/** DB-only boolean-to-key mirror; never exposed on the public `Task` type. */
export type TaskDbRecord = Task & { completedFlag: 0 | 1 };
/** DB-only boolean-to-key mirror; never exposed on the public `Challenge` type. */
export type ChallengeDbRecord = Challenge & { completedFlag: 0 | 1 };

export function toCompletedFlag(completed: boolean): 0 | 1 {
  return completed ? 1 : 0;
}

export interface FocusFlowDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: TaskDbRecord;
    indexes: {
      parentId: string;
      completedFlag: 0 | 1;
      position: number;
      updatedAt: number;
    };
  };
  sessions: {
    key: string;
    value: Session;
    indexes: {
      taskId: string;
      type: string;
      status: string;
      startedAt: number;
      completedAt: number;
      localDate: string;
    };
  };
  dailyStats: {
    key: string;
    value: DailyStats;
    indexes: {
      date: string;
    };
  };
  streak: {
    key: string;
    value: Streak;
    indexes: {
      lastActiveDate: string;
    };
  };
  challenges: {
    key: string;
    value: ChallengeDbRecord;
    indexes: {
      date: string;
      completedFlag: 0 | 1;
    };
  };
  backgrounds: {
    key: string;
    value: BackgroundRecord;
    indexes: {
      createdAt: number;
    };
  };
  rewards: {
    key: string;
    value: Reward;
    indexes: {
      unlockedAt: number;
      type: string;
    };
  };
}

export type FocusFlowDB = IDBPDatabase<FocusFlowDBSchema>;
export type FocusFlowUpgradeTransaction = IDBPTransaction<
  FocusFlowDBSchema,
  Array<StoreNames<FocusFlowDBSchema>>,
  "versionchange"
>;

/**
 * Creates all 7 object stores + indexes for schema version 1.
 *
 * Exposed as a standalone function (rather than calling `openDB` directly
 * here) so Agent 2's migration runner can invoke it for the `oldVersion < 1`
 * branch alongside whatever migration-sequencing convention their runner
 * uses. See src/db/migrations.ts for the version -> upgrade-step map.
 */
export function createV1Schema(db: IDBPDatabase<FocusFlowDBSchema>): void {
  const tasks = db.createObjectStore(STORE_NAMES.tasks, { keyPath: "id" });
  tasks.createIndex("parentId", "parentId");
  tasks.createIndex("completedFlag", "completedFlag");
  tasks.createIndex("position", "position");
  tasks.createIndex("updatedAt", "updatedAt");

  const sessions = db.createObjectStore(STORE_NAMES.sessions, { keyPath: "id" });
  sessions.createIndex("taskId", "taskId");
  sessions.createIndex("type", "type");
  sessions.createIndex("status", "status");
  sessions.createIndex("startedAt", "startedAt");
  sessions.createIndex("completedAt", "completedAt");
  sessions.createIndex("localDate", "localDate");

  const dailyStats = db.createObjectStore(STORE_NAMES.dailyStats, { keyPath: "date" });
  dailyStats.createIndex("date", "date");

  const streak = db.createObjectStore(STORE_NAMES.streak, { keyPath: "id" });
  streak.createIndex("lastActiveDate", "lastActiveDate");

  const challenges = db.createObjectStore(STORE_NAMES.challenges, { keyPath: "id" });
  challenges.createIndex("date", "date");
  challenges.createIndex("completedFlag", "completedFlag");

  const backgrounds = db.createObjectStore(STORE_NAMES.backgrounds, { keyPath: "id" });
  backgrounds.createIndex("createdAt", "createdAt");

  const rewards = db.createObjectStore(STORE_NAMES.rewards, { keyPath: "id" });
  rewards.createIndex("unlockedAt", "unlockedAt");
  rewards.createIndex("type", "type");
}
