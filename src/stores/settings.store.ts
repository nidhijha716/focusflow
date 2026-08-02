import { create } from "zustand";
import { loadSettings, saveSettings } from "@/services/storage.service";
import { defaultSettingsState, type SettingsState } from "@/types/storage";

export interface SettingsStoreState extends SettingsState {
  updateDurations: (durations: Partial<SettingsState["durations"]>) => void;
  setAutoStartBreaks: (autoStartBreaks: boolean) => void;
  setAutoStartFocus: (autoStartFocus: boolean) => void;
  setAlarmVolume: (alarmVolume: number) => void;
  setMusicVolume: (musicVolume: number) => void;
  setNotificationsEnabled: (notificationsEnabled: boolean) => void;
  setAppearance: (appearance: Partial<SettingsState["appearance"]>) => void;
}

function toSnapshot(state: SettingsState): SettingsState {
  return {
    durations: state.durations,
    autoStartBreaks: state.autoStartBreaks,
    autoStartFocus: state.autoStartFocus,
    alarmVolume: state.alarmVolume,
    musicVolume: state.musicVolume,
    notificationsEnabled: state.notificationsEnabled,
    appearance: state.appearance,
  };
}

/**
 * Runtime state seeded from the persisted `pomodoro:settings:v1` record
 * (03_Local_Data_Schema.pdf §2). Writes are delegated to
 * services/storage.service, a thin facade over the canonical
 * `@/db/localStorage` + zod validation layer, rather than touching
 * localStorage inline.
 */
export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...(loadSettings() ?? defaultSettingsState()),

  updateDurations: (durations) => {
    set((state) => ({ durations: { ...state.durations, ...durations } }));
    saveSettings(toSnapshot(get()));
  },
  setAutoStartBreaks: (autoStartBreaks) => {
    set({ autoStartBreaks });
    saveSettings(toSnapshot(get()));
  },
  setAutoStartFocus: (autoStartFocus) => {
    set({ autoStartFocus });
    saveSettings(toSnapshot(get()));
  },
  setAlarmVolume: (alarmVolume) => {
    set({ alarmVolume });
    saveSettings(toSnapshot(get()));
  },
  setMusicVolume: (musicVolume) => {
    set({ musicVolume });
    saveSettings(toSnapshot(get()));
  },
  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    saveSettings(toSnapshot(get()));
  },
  setAppearance: (appearance) => {
    set((state) => ({ appearance: { ...state.appearance, ...appearance } }));
    saveSettings(toSnapshot(get()));
  },
}));
