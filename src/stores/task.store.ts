import { create } from "zustand";
import { getDb } from "@/db/client";
import {
  createTask as createTaskRecord,
  deleteTaskCascade,
  listAllTasks,
  updateTask as updateTaskRecord,
} from "@/db/repositories/taskRepository";
import { readTimerState, writeTimerState } from "@/db/localStorage";
import type { NewTaskInput, Task } from "@/types/task";

export interface NewTaskDraft {
  title: string;
  parentId?: string | null;
  estimatedPomodoros?: number;
}

export interface TaskStoreState {
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  addTask: (draft: NewTaskDraft) => Promise<void>;
  renameTask: (id: string, title: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  selectTask: (id: string | null) => void;
  reorderTask: (id: string, direction: "up" | "down") => Promise<void>;
}

/** Next `position` among siblings sharing `parentId` -- appended to the end of that list. */
function nextPosition(tasks: readonly Task[], parentId: string | null): number {
  const siblings = tasks.filter((task) => task.parentId === parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((task) => task.position)) + 1;
}

function persistSelectedTaskId(id: string | null): void {
  writeTimerState({ ...readTimerState(), selectedTaskId: id });
}

/**
 * Real task store backed by the `tasks` IndexedDB store
 * (`@/db/repositories/taskRepository.ts`). Selection is mirrored into
 * `pomodoro:timer:v1.selectedTaskId` (the same field
 * `services/storage.service.ts` already reads/writes) so
 * `hooks/useTimerEngine.ts` can read the selected task at session-completion
 * time without this store needing to be mounted first, and so selection
 * survives a reload the same way the rest of the timer state does.
 */
export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  selectedTaskId: readTimerState().selectedTaskId,
  isLoading: false,
  hasLoaded: false,
  error: null,

  loadTasks: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const tasks = await listAllTasks(db);
      set({ tasks, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load tasks" });
    }
  },

  addTask: async (draft) => {
    const parentId = draft.parentId ?? null;
    const input: NewTaskInput = {
      parentId,
      title: draft.title,
      completed: false,
      position: nextPosition(get().tasks, parentId),
      estimatedPomodoros: draft.estimatedPomodoros,
      directFocusSeconds: 0,
    };
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      const task = await createTaskRecord(db, input, id);
      set((state) => ({ tasks: [...state.tasks, task] }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to add task" });
    }
  },

  renameTask: async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      const updated = await updateTaskRecord(db, id, { title: trimmed });
      set((state) => ({ tasks: state.tasks.map((task) => (task.id === id ? updated : task)) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to rename task" });
    }
  },

  toggleComplete: async (id) => {
    const current = get().tasks.find((task) => task.id === id);
    if (!current) return;
    const completed = !current.completed;
    try {
      const db = await getDb();
      const updated = await updateTaskRecord(db, id, {
        completed,
        completedAt: completed ? Date.now() : undefined,
      });
      set((state) => ({ tasks: state.tasks.map((task) => (task.id === id ? updated : task)) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update task" });
    }
  },

  deleteTask: async (id) => {
    try {
      const db = await getDb();
      await deleteTaskCascade(db, id);
      set((state) => {
        const idsToRemove = new Set<string>([id]);
        // Mirror the repository's cascade so the in-memory list matches
        // what deleteTaskCascade already removed from IndexedDB.
        let grew = true;
        while (grew) {
          grew = false;
          for (const task of state.tasks) {
            if (task.parentId && idsToRemove.has(task.parentId) && !idsToRemove.has(task.id)) {
              idsToRemove.add(task.id);
              grew = true;
            }
          }
        }
        const selectedTaskId = state.selectedTaskId && idsToRemove.has(state.selectedTaskId) ? null : state.selectedTaskId;
        if (selectedTaskId !== state.selectedTaskId) persistSelectedTaskId(selectedTaskId);
        return {
          tasks: state.tasks.filter((task) => !idsToRemove.has(task.id)),
          selectedTaskId,
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete task" });
    }
  },

  selectTask: (id) => {
    persistSelectedTaskId(id);
    set({ selectedTaskId: id });
  },

  reorderTask: async (id, direction) => {
    const { tasks } = get();
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const siblings = tasks
      .filter((task) => task.parentId === current.parentId)
      .sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((task) => task.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    const neighbor = siblings[swapIndex];

    try {
      const db = await getDb();
      const [updatedCurrent, updatedNeighbor] = await Promise.all([
        updateTaskRecord(db, current.id, { position: neighbor.position }),
        updateTaskRecord(db, neighbor.id, { position: current.position }),
      ]);
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id === updatedCurrent.id) return updatedCurrent;
          if (task.id === updatedNeighbor.id) return updatedNeighbor;
          return task;
        }),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to reorder task" });
    }
  },
}));
