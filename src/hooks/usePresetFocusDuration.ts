"use client";

import { useEffect } from "react";
import { timerConfigFromSettings } from "@/services/timer.service";
import { useSettingsStore } from "@/stores/settings.store";
import { useTimerStore } from "@/stores/timer.store";

/**
 * Applies a preset route's intended focus duration (POM-036: "Preset pages
 * initialize intended duration") to the *runtime* timer store only --
 * never to `pomodoro:settings:v1` (services/storage.service.ts). Landing on
 * a marketing/SEO page must not silently rewrite the user's own configured
 * focus duration (04_Security_and_Access "Preservation of existing
 * functionality" concern); it should only affect what this tab shows while
 * the user is on this page.
 *
 * Guarded to only act while idle: if a session is already running/paused
 * (e.g. synced in from another tab via services/sync.service.ts), visiting
 * a preset page must not silently discard it. On unmount, restores the
 * settings-derived duration -- but only if the timer is still idle, so
 * starting a session on the preset page and then navigating away never has
 * its in-progress duration yanked out from under it.
 */
export function usePresetFocusDuration(minutes: number): void {
  useEffect(() => {
    const overrideMs = minutes * 60 * 1000;
    const initial = useTimerStore.getState();
    if (initial.snapshot.status !== "idle") return;

    initial.setDurations({ ...initial.durations, focus: overrideMs });
    initial.changeMode("focus");

    return () => {
      const current = useTimerStore.getState();
      if (current.snapshot.status !== "idle") return;

      const restored = timerConfigFromSettings(useSettingsStore.getState().durations);
      current.setDurations(restored.durations);
      current.changeMode(current.snapshot.mode);
    };
  }, [minutes]);
}
