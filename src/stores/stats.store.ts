import { create } from "zustand";

/**
 * Placeholder item shape. The authoritative session/stats entity is owned
 * by the local data schema/repositories — this store only provides the
 * runtime container until that schema lands.
 */
export interface StatsStoreItem {
  id: string;
}

export interface StatsStoreState {
  items: StatsStoreItem[];
  isLoading: boolean;
  error: string | null;
  setItems: (items: StatsStoreItem[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStatsStore = create<StatsStoreState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
