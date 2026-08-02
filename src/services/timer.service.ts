import { DEFAULT_DURATIONS_MS, LONG_BREAK_INTERVAL } from "@/constants/timer.constants";
import type { SettingsState } from "@/types/storage";
import type { TimerEvent, TimerMode, TimerSnapshot } from "@/types/timer.types";

export interface TimerReducerContext {
  now: number;
  durations: Record<TimerMode, number>;
  longBreakInterval: number;
}

/** The non-time-dependent half of `TimerReducerContext` -- everything the settings store owns. */
export type TimerConfig = Pick<TimerReducerContext, "durations" | "longBreakInterval">;

/**
 * Converts the canonical `pomodoro:settings:v1` durations (seconds, per
 * `@/types/storage`'s `SettingsState`) into the ms-based `TimerConfig` the
 * reducer expects. This is the single place that does the seconds->ms
 * conversion so the store and its wiring hook never hard-code
 * `DEFAULT_DURATIONS_MS` once real user settings are available.
 */
export function timerConfigFromSettings(durations: SettingsState["durations"]): TimerConfig {
  return {
    durations: {
      focus: durations.focusSeconds * 1000,
      short_break: durations.shortBreakSeconds * 1000,
      long_break: durations.longBreakSeconds * 1000,
    },
    longBreakInterval: durations.longBreakInterval,
  };
}

/**
 * Deadline algorithm (see 02_Technical_Architecture section 4):
 *   deadline = Date.now() + remainingMs
 *   remainingMs = max(0, deadline - Date.now())
 * `deadline` is null whenever the timer is not actively running, so
 * `remainingMs` alone stays authoritative while idle/paused.
 */
export function computeRemainingMs(deadline: number | null, remainingMs: number, now: number): number {
  if (deadline === null) return remainingMs;
  return Math.max(0, deadline - now);
}

export function createIdleSnapshot(mode: TimerMode, durationMs: number): TimerSnapshot {
  return {
    status: "idle",
    mode,
    deadline: null,
    remainingMs: durationMs,
    durationMs,
    focusSessionsSinceLongBreak: 0,
  };
}

/**
 * Recovery path for a snapshot loaded from `services/storage.service.ts`
 * (`pomodoro:timer:v1`) at app start.
 *
 * `defaultTimerState()` (@/types/storage, Agent 3) reports `durationMs: 0` /
 * `remainingMs: 0` / `deadline: null` as its sentinel for "nothing has ever
 * been saved for this browser" -- that combination can never come from a
 * real save (settings durations are `z.number().int().positive()`), so it's
 * safe to treat it as "first run" and hand back a fresh idle snapshot sized
 * from the caller's current settings-driven durations instead of a
 * zero-length countdown.
 *
 * Otherwise, if the persisted snapshot was `"running"`, this replays a
 * single `TICK` at `now` through the same pure reducer used at runtime
 * (see `computeRemainingMs`) so a timer left running while the tab/browser
 * was closed resolves to the correct current interval: still running with
 * less time left, or already past its deadline and rolled over to the next
 * mode (deadline-based recovery, 02_Technical_Architecture section 4).
 */
export function restoreSnapshot(persisted: TimerSnapshot, config: TimerConfig, now: number = Date.now()): TimerSnapshot {
  const neverPersisted = persisted.durationMs === 0 && persisted.remainingMs === 0 && persisted.deadline === null;
  if (neverPersisted) {
    return createIdleSnapshot("focus", config.durations.focus);
  }
  if (persisted.status !== "running") return persisted;
  return timerReducer(persisted, { type: "TICK", now }, config);
}

function getNextMode(currentMode: TimerMode, focusSessionsSinceLongBreak: number, longBreakInterval: number): TimerMode {
  if (currentMode !== "focus") return "focus";
  const willReachLongBreak = focusSessionsSinceLongBreak + 1 >= longBreakInterval;
  return willReachLongBreak ? "long_break" : "short_break";
}

/**
 * Pure state-machine transition (states: idle/running/paused/completed;
 * modes: focus/short_break/long_break; events: START/PAUSE/RESUME/RESET/
 * SKIP/TICK/COMPLETE/CHANGE_MODE/RESTORE -- see 02_Technical_Architecture section 4).
 *
 * This function has no side effects: callers (stores/hooks) own persistence,
 * worker messages, and cross-tab broadcast. `context.durations` lets callers
 * inject user-configured durations (e.g. from the settings store) instead of
 * hard-coding defaults here.
 */
export function timerReducer(
  state: TimerSnapshot,
  event: TimerEvent,
  context: Partial<TimerReducerContext> = {}
): TimerSnapshot {
  const now = context.now ?? Date.now();
  const durations = context.durations ?? DEFAULT_DURATIONS_MS;
  const longBreakInterval = context.longBreakInterval ?? LONG_BREAK_INTERVAL;

  switch (event.type) {
    case "START": {
      if (state.status === "running") return state;
      return { ...state, status: "running", deadline: now + state.remainingMs };
    }

    case "PAUSE": {
      if (state.status !== "running") return state;
      return {
        ...state,
        status: "paused",
        remainingMs: computeRemainingMs(state.deadline, state.remainingMs, now),
        deadline: null,
      };
    }

    case "RESUME": {
      if (state.status !== "paused") return state;
      return { ...state, status: "running", deadline: now + state.remainingMs };
    }

    case "RESET": {
      return createIdleSnapshot(state.mode, durations[state.mode]);
    }

    case "SKIP":
    case "COMPLETE": {
      const nextMode = getNextMode(state.mode, state.focusSessionsSinceLongBreak, longBreakInterval);
      const nextFocusSessionsSinceLongBreak =
        state.mode === "focus" ? (state.focusSessionsSinceLongBreak + 1) % longBreakInterval : state.focusSessionsSinceLongBreak;

      return {
        status: "idle",
        mode: nextMode,
        deadline: null,
        remainingMs: durations[nextMode],
        durationMs: durations[nextMode],
        focusSessionsSinceLongBreak: nextFocusSessionsSinceLongBreak,
      };
    }

    case "TICK": {
      if (state.status !== "running") return state;
      const remainingMs = computeRemainingMs(state.deadline, state.remainingMs, event.now);
      if (remainingMs <= 0) {
        return timerReducer(state, { type: "COMPLETE" }, { ...context, now: event.now });
      }
      return { ...state, remainingMs };
    }

    case "CHANGE_MODE": {
      return createIdleSnapshot(event.mode, durations[event.mode]);
    }

    case "RESTORE": {
      return event.snapshot;
    }

    default:
      return state;
  }
}
