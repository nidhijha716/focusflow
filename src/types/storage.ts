import { z } from "zod";

/**
 * localStorage-backed shapes — 03_Local_Data_Schema.pdf, section 2.
 *
 * The PDF describes these keys by prose ("Durations, auto-start, alarm/music
 * volumes, notification and appearance preferences") rather than an
 * itemized field list (unlike Task/Session/DailyStats/Streak). The field
 * names below are a best-effort, TypeScript-safe interpretation of that
 * prose and are intentionally easy to extend. Flagged in Agent 3's report
 * for confirmation against Agent 5 (Frontend Specification) and Agent 8
 * (UI Theme) — update in place here if their docs specify exact fields;
 * do not create a second/competing settings or UI-state type.
 */

export const TIMER_MODES = ["focus", "short_break", "long_break"] as const;
export const TimerModeSchema = z.enum(TIMER_MODES);
export type TimerMode = z.infer<typeof TimerModeSchema>;

export const TIMER_STATUSES = ["idle", "running", "paused"] as const;
export const TimerStatusSchema = z.enum(TIMER_STATUSES);
export type TimerStatus = z.infer<typeof TimerStatusSchema>;

/** `pomodoro:timer:v1` */
export const TimerStateSchema = z.object({
  mode: TimerModeSchema,
  status: TimerStatusSchema,
  durationMs: z.number().nonnegative(),
  remainingMs: z.number().nonnegative(),
  deadline: z.number().nullable(),
  cycleCount: z.number().int().nonnegative(),
  selectedTaskId: z.string().min(1).nullable(),
  updatedAt: z.number(),
});

export type TimerState = z.infer<typeof TimerStateSchema>;

export function defaultTimerState(): TimerState {
  return {
    mode: "focus",
    status: "idle",
    durationMs: 0,
    remainingMs: 0,
    deadline: null,
    cycleCount: 0,
    selectedTaskId: null,
    updatedAt: Date.now(),
  };
}

/** `pomodoro:settings:v1` */
export const SettingsStateSchema = z.object({
  durations: z.object({
    focusSeconds: z.number().int().positive(),
    shortBreakSeconds: z.number().int().positive(),
    longBreakSeconds: z.number().int().positive(),
    longBreakInterval: z.number().int().positive(),
  }),
  autoStartBreaks: z.boolean(),
  autoStartFocus: z.boolean(),
  alarmVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  notificationsEnabled: z.boolean(),
  appearance: z.object({
    theme: z.enum(["light", "dark", "system"]),
    backgroundId: z.string().min(1).nullable(),
  }),
});

export type SettingsState = z.infer<typeof SettingsStateSchema>;

export function defaultSettingsState(): SettingsState {
  return {
    durations: {
      focusSeconds: 25 * 60,
      shortBreakSeconds: 5 * 60,
      longBreakSeconds: 15 * 60,
      longBreakInterval: 4,
    },
    autoStartBreaks: false,
    autoStartFocus: false,
    alarmVolume: 1,
    musicVolume: 0.5,
    notificationsEnabled: true,
    appearance: {
      theme: "system",
      backgroundId: null,
    },
  };
}

/** `pomodoro:ui:v1` */
export const UiPreferencesStateSchema = z.object({
  openPanels: z.array(z.string()),
  selectedBackgroundId: z.string().min(1).nullable(),
});

export type UiPreferencesState = z.infer<typeof UiPreferencesStateSchema>;

export function defaultUiPreferencesState(): UiPreferencesState {
  return {
    openPanels: [],
    selectedBackgroundId: null,
  };
}

/** `pomodoro:schema-version` */
export const SchemaVersionSchema = z.number().int().nonnegative();
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;

export const CURRENT_SCHEMA_VERSION: SchemaVersion = 1;
