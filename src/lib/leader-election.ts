import { LEADER_LOCK_NAME } from "@/constants/channels.constants";

export interface LeaderElectionHandle {
  /** Resolves once this tab has been granted leadership. */
  onElected: Promise<void>;
  /** Releases leadership, letting another waiting tab become leader. */
  release: () => void;
}

/**
 * Cross-tab leader election via the Web Locks API (candidate mechanism from
 * 02_Technical_Architecture §6: "leader/ownership mechanism ... so two tabs
 * cannot independently complete the same session"). Only one tab across the
 * origin can hold `LEADER_LOCK_NAME` at a time; callers gate idempotent side
 * effects (e.g. completion writes, alarm playback) behind `onElected`.
 *
 * Ref: https://developer.mozilla.org/docs/Web/API/Web_Locks_API
 */
export function electLeader(): LeaderElectionHandle | null {
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return null;
  }

  const controller = new AbortController();
  let resolveElected!: () => void;
  const onElected = new Promise<void>((resolve) => {
    resolveElected = resolve;
  });

  navigator.locks
    .request(LEADER_LOCK_NAME, { signal: controller.signal }, () => {
      resolveElected();
      // Held until `release()` aborts the signal, keeping this tab the
      // leader for as long as it wants ownership.
      return new Promise<void>((resolveHeld) => {
        controller.signal.addEventListener("abort", () => resolveHeld());
      });
    })
    .catch(() => {
      // Aborted before being granted, or Web Locks unsupported in this
      // browser — leadership simply never resolves for this handle.
    });

  return {
    onElected,
    release: () => controller.abort(),
  };
}

/** True if no tab currently holds the leader lock. */
export async function isLeaderAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("locks" in navigator)) return false;
  const snapshot = await navigator.locks.query();
  return !(snapshot.held ?? []).some((lock) => lock.name === LEADER_LOCK_NAME);
}
