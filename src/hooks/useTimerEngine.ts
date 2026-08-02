"use client";

import { useEffect, useRef } from "react";
import { ALARM_SOUND_ID, ALARM_SOUND_SRC, TIMER_TICK_INTERVAL_MS } from "@/constants/timer.constants";
import { runIfLeader } from "@/lib/leader-election";
import { audioService } from "@/services/audio.service";
import { playSpotifyTrack } from "@/services/spotifyPlayback.service";
import { notifySessionComplete } from "@/services/notification.service";
import { recordCompletedSession } from "@/services/session.service";
import { broadcastSnapshot, subscribeToSync } from "@/services/sync.service";
import { loadTimerSnapshot, saveTimerSnapshot } from "@/services/storage.service";
import { restoreSnapshot, timerConfigFromSettings } from "@/services/timer.service";
import { useSettingsStore } from "@/stores/settings.store";
import { useStatsStore } from "@/stores/stats.store";
import { useTimerStore } from "@/stores/timer.store";
import { createTimerWorker, postToTimerWorker } from "@/workers/createTimerWorker";
import type { TimerSnapshot } from "@/types/timer.types";

function syncWorkerToSnapshot(worker: Worker | null, snapshot: TimerSnapshot): void {
  if (snapshot.status === "running" && snapshot.deadline !== null) {
    postToTimerWorker(worker, { type: "START", deadline: snapshot.deadline });
  } else {
    postToTimerWorker(worker, { type: "STOP" });
  }
}

function sessionJustEnded(before: TimerSnapshot, after: TimerSnapshot): boolean {
  return (
    before.status === "running" &&
    after.status === "idle" &&
    after.mode !== before.mode
  );
}

/**
 * Mounts the timer engine's side effects for the current browser tab:
 *
 * 1. Owns the deadline-tick worker (workers/timer.worker.ts) and keeps it
 *    synced to the FSM's `deadline` -- ticks/COMPLETE always come back
 *    through `useTimerStore.getState().tick()`, which re-derives
 *    `remainingMs` from `Date.now()` against the deadline on the main
 *    thread (services/timer.service.ts), so the worker is only a "wake up
 *    and recompute" pulse, never a second source of truth.
 * 2. Persists state-changing transitions (not plain ticks) via
 *    services/storage.service.ts, and mirrors them to other tabs over
 *    services/sync.service.ts's BroadcastChannel. A transition is any
 *    change to `status`/`mode`/`deadline`; a tick that only lowers
 *    `remainingMs` is not persisted or broadcast, satisfying "save on
 *    state-changing commands, not every tick".
 * 3. Applies snapshots broadcast by other tabs via `restore()`, guarded by
 *    `isApplyingRemoteRef` so re-applying a remote snapshot doesn't bounce
 *    right back out as another broadcast (echo prevention).
 * 4. Gates the alarm (services/audio.service.ts), completed-session
 *    persistence (services/session.service.ts -- IndexedDB `sessions`/
 *    `dailyStats`/streak/daily-challenge writes), and the opt-in browser
 *    notification (services/notification.service.ts) behind cross-tab
 *    leader election (lib/leader-election.ts, Web Locks API) so exactly one
 *    open tab plays/records/notifies per COMPLETE, even though every tab's
 *    own worker independently reaches the same deadline at roughly the
 *    same time.
 * 5. Keeps `durations`/`longBreakInterval` in sync with the settings store
 *    (item 4 of the Phase 2 scope: "timer reads durations from settings"),
 *    and refreshes an idle snapshot's displayed duration immediately when
 *    settings change mid-idle (a running/paused session keeps its
 *    already-started duration).
 * 6. Applies the persisted `pomodoro:timer:v1` snapshot (services/storage.service.ts)
 *    once, here, on mount -- not at `stores/timer.store.ts` module-eval time
 *    -- so the store's SSR-safe idle default is what both the server render
 *    and the client's first hydration pass see (see that store's docstring
 *    for the hydration-error this avoids). `restoreSnapshot` (services/timer.service.ts)
 *    recomputes `remainingMs` from `deadline` against "now", so a timer left
 *    running while the tab/browser was closed still resolves to its correct
 *    current interval, just one effect tick after first paint instead of at it.
 *
 * Mount exactly once per tab -- see providers/TimerProvider.tsx. The store
 * (stores/timer.store.ts) and reducer (services/timer.service.ts) stay
 * side-effect-free; this hook is the integration layer their docstrings
 * defer to.
 */
export function useTimerEngine(): void {
  const durationsSettings = useSettingsStore((state) => state.durations);
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    // Defer fetching/buffering the alarm asset until a session is actually
    // in flight, rather than unconditionally on every app load regardless
    // of whether the timer is ever started this visit (Technical
    // Architecture doc §10: "Lazy-load non-critical ... audio"). A session
    // already `"running"`/`"paused"` at mount (e.g. a reload mid-session)
    // preloads immediately; otherwise this waits for the first
    // START/RESUME. Either way the alarm has at minimum the shortest
    // configured interval's duration to finish buffering before a COMPLETE
    // could possibly need it, so this never risks a late/missing alarm --
    // `audioService.preload` is also idempotent (stores/skips by id), so
    // calling it again on later transitions is a no-op.
    function preloadIfSessionActive(status: string): void {
      if (status === "running" || status === "paused") {
        audioService.preload(ALARM_SOUND_ID, ALARM_SOUND_SRC);
      }
    }

    preloadIfSessionActive(useTimerStore.getState().snapshot.status);
    return useTimerStore.subscribe((state) => preloadIfSessionActive(state.snapshot.status));
  }, []);

  useEffect(() => {
    const config = timerConfigFromSettings(durationsSettings);
    useTimerStore.getState().setDurations(config.durations);
    useTimerStore.getState().setLongBreakInterval(config.longBreakInterval);

    const { snapshot } = useTimerStore.getState();
    if (snapshot.status === "idle") {
      useTimerStore.getState().changeMode(snapshot.mode);
    }
  }, [durationsSettings]);

  useEffect(() => {
    // Runs before the worker/sync subscriptions below are wired up, so this
    // one-time restore never re-triggers the `saveTimerSnapshot`/
    // `broadcastSnapshot` calls further down (those are for *new*
    // transitions, not replaying the one we just loaded).
    const { durations, longBreakInterval } = useTimerStore.getState();
    useTimerStore.getState().restore(restoreSnapshot(loadTimerSnapshot(), { durations, longBreakInterval }));

    const worker = createTimerWorker();
    let fallbackIntervalId: ReturnType<typeof setInterval> | null = null;

    function stopFallbackPolling(): void {
      if (fallbackIntervalId !== null) {
        clearInterval(fallbackIntervalId);
        fallbackIntervalId = null;
      }
    }

    function startFallbackPolling(): void {
      if (worker || fallbackIntervalId !== null) return;
      fallbackIntervalId = setInterval(() => {
        if (useTimerStore.getState().snapshot.status !== "running") return;
        handleWorkerMessage();
      }, TIMER_TICK_INTERVAL_MS);
    }

    function syncWorkerOrFallback(snapshot: TimerSnapshot): void {
      if (snapshot.status === "running" && snapshot.deadline !== null) {
        syncWorkerToSnapshot(worker, snapshot);
        startFallbackPolling();
      } else {
        syncWorkerToSnapshot(worker, snapshot);
        stopFallbackPolling();
      }
    }

    syncWorkerOrFallback(useTimerStore.getState().snapshot);

    function handleWorkerMessage(): void {
      const before = useTimerStore.getState().snapshot;
      useTimerStore.getState().tick();
      const after = useTimerStore.getState().snapshot;

      const justCompleted = sessionJustEnded(before, after);
      if (!justCompleted) return;

      void runIfLeader(async () => {
        const settings = useSettingsStore.getState();
        if (settings.alarmSource === "spotify" && settings.spotifyAlarmTrack?.uri) {
          void playSpotifyTrack(settings.spotifyAlarmTrack.uri, settings.alarmVolume).catch(() => {
            audioService.play(ALARM_SOUND_ID, { volume: settings.alarmVolume });
          });
        } else {
          audioService.play(ALARM_SOUND_ID, { volume: settings.alarmVolume });
        }
        await recordCompletedSession(before, Date.now());
        notifySessionComplete(before, after, settings.notificationsEnabled);
      });
    }
    worker?.addEventListener("message", () => {
      handleWorkerMessage();
    });

    const unsubscribeSync = subscribeToSync((message) => {
      if (message.kind === "stats-updated") {
        void useStatsStore.getState().refreshAll();
        return;
      }
      if (message.kind !== "snapshot") return;
      isApplyingRemoteRef.current = true;
      useTimerStore.getState().restore(message.snapshot);
      isApplyingRemoteRef.current = false;
    });

    const unsubscribeStore = useTimerStore.subscribe((state, prevState) => {
      if (state.snapshot === prevState.snapshot) return;

      const ended = sessionJustEnded(prevState.snapshot, state.snapshot);
      if (ended) {
        void useStatsStore.getState().refreshAll();
      }

      const isTransition =
        state.snapshot.deadline !== prevState.snapshot.deadline ||
        state.snapshot.status !== prevState.snapshot.status ||
        state.snapshot.mode !== prevState.snapshot.mode;
      if (!isTransition) return;

      // Every tab's own worker must track the true deadline regardless of
      // whether this transition originated locally or from a remote
      // snapshot -- otherwise a follower tab's countdown would freeze.
      syncWorkerOrFallback(state.snapshot);

      if (isApplyingRemoteRef.current) return;
      saveTimerSnapshot(state.snapshot);
      broadcastSnapshot(state.snapshot);
    });

    return () => {
      stopFallbackPolling();
      unsubscribeStore();
      unsubscribeSync();
      worker?.removeEventListener("message", handleWorkerMessage);
      worker?.terminate();
    };
    // Mount once per tab: only refs (stable) and module-level imports are
    // captured, and settings are always read fresh via getState() inside
    // callbacks, so there is no reactive value this effect needs to depend on.
  }, []);
}
