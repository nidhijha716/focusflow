import { create } from "zustand";

/**
 * Placeholder item shape. The authoritative Task entity (fields, indexes,
 * relations) is owned by the local data schema/repositories — this store
 * only provides the runtime container until that schema lands.
 */
export interface TaskStoreItem {
  id: string;
}

export interface TaskStoreState {
  items: TaskStoreItem[];
  isLoading: boolean;
  error: string | null;
  setItems: (items: TaskStoreItem[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
