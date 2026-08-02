"use client";

import { useEffect, useRef } from "react";
import { ALARM_SOUND_ID, ALARM_SOUND_SRC } from "@/constants/timer.constants";
import { electLeader } from "@/lib/leader-election";
import { audioService } from "@/services/audio.service";
import { notifySessionComplete } from "@/services/notification.service";
import { recordCompletedSession } from "@/services/session.service";
import { broadcastSnapshot, subscribeToSync } from "@/services/sync.service";
import { saveTimerSnapshot } from "@/services/storage.service";
import { timerConfigFromSettings } from "@/services/timer.service";
import { useSettingsStore } from "@/stores/settings.store";
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
 *
 * Mount exactly once per tab -- see providers/TimerProvider.tsx. The store
 * (stores/timer.store.ts) and reducer (services/timer.service.ts) stay
 * side-effect-free; this hook is the integration layer their docstrings
 * defer to.
 */
export function useTimerEngine(): void {
  const durationsSettings = useSettingsStore((state) => state.durations);
  const isApplyingRemoteRef = useRef(false);
  const isLeaderRef = useRef(false);

  useEffect(() => {
    audioService.preload(ALARM_SOUND_ID, ALARM_SOUND_SRC);
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
    const worker = createTimerWorker();
    syncWorkerToSnapshot(worker, useTimerStore.getState().snapshot);

    function handleWorkerMessage(): void {
      const before = useTimerStore.getState().snapshot;
      useTimerStore.getState().tick();
      const after = useTimerStore.getState().snapshot;

      const justCompleted = before.status === "running" && after.status !== "running";
      if (justCompleted && isLeaderRef.current) {
        audioService.play(ALARM_SOUND_ID, { volume: useSettingsStore.getState().alarmVolume });
        void recordCompletedSession(before, Date.now());
        notifySessionComplete(before, after, useSettingsStore.getState().notificationsEnabled);
      }
    }
    worker?.addEventListener("message", handleWorkerMessage);

    const unsubscribeSync = subscribeToSync((message) => {
      if (message.kind !== "snapshot") return;
      isApplyingRemoteRef.current = true;
      useTimerStore.getState().restore(message.snapshot);
      isApplyingRemoteRef.current = false;
    });

    const leader = electLeader();
    let leaderHandleReleased = false;
    void leader?.onElected.then(() => {
      if (!leaderHandleReleased) isLeaderRef.current = true;
    });

    const unsubscribeStore = useTimerStore.subscribe((state, prevState) => {
      if (state.snapshot === prevState.snapshot) return;

      const isTransition =
        state.snapshot.deadline !== prevState.snapshot.deadline ||
        state.snapshot.status !== prevState.snapshot.status ||
        state.snapshot.mode !== prevState.snapshot.mode;
      if (!isTransition) return;

      // Every tab's own worker must track the true deadline regardless of
      // whether this transition originated locally or from a remote
      // snapshot -- otherwise a follower tab's countdown would freeze.
      syncWorkerToSnapshot(worker, state.snapshot);

      if (isApplyingRemoteRef.current) return;
      saveTimerSnapshot(state.snapshot);
      broadcastSnapshot(state.snapshot);
    });

    return () => {
      leaderHandleReleased = true;
      unsubscribeStore();
      unsubscribeSync();
      worker?.removeEventListener("message", handleWorkerMessage);
      worker?.terminate();
      leader?.release();
    };
    // Mount once per tab: only refs (stable) and module-level imports are
    // captured, and settings are always read fresh via getState() inside
    // callbacks, so there is no reactive value this effect needs to depend on.
  }, []);
}
