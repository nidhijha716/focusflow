import type { TimerWorkerInboundMessage } from "@/types/timer.types";

/**
 * SSR/browser-safe factory for the deadline-tick worker (workers/timer.worker.ts).
 * Returns null when Workers are unavailable (server render, or a browser
 * without Worker support) so callers can no-op instead of branching on
 * `typeof window` at every call site -- same convention as
 * `lib/broadcast-channel.ts`'s `createTypedBroadcastChannel`.
 *
 * `new Worker(new URL(..., import.meta.url), { type: "module" })` is the
 * standard bundler-native worker pattern: Turbopack and webpack both follow
 * the `new Worker()` call to include the target module (and its own
 * `@/...` imports, resolved the same way as any other module) in the build
 * graph -- see node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md
 * ("Magic Comments" section, which documents Turbopack's support for
 * `new Worker()` expressions) and MDN's Worker constructor reference:
 * https://developer.mozilla.org/docs/Web/API/Worker/Worker
 *
 * `type: "module"` is required because timer.worker.ts uses ES `import`
 * statements at its top level.
 */
export function createTimerWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  return new Worker(new URL("./timer.worker.ts", import.meta.url), { type: "module" });
}

/** Type-safe wrapper around `Worker.postMessage` for the timer worker's inbound contract. */
export function postToTimerWorker(worker: Worker | null, message: TimerWorkerInboundMessage): void {
  worker?.postMessage(message);
}
