export interface TypedBroadcastChannel<T> {
  postMessage: (message: T) => void;
  subscribe: (listener: (message: T) => void) => () => void;
  close: () => void;
}

/**
 * SSR-safe, typed wrapper around the native BroadcastChannel API. Returns
 * null when unavailable (server, or a browser without BroadcastChannel
 * support) so callers can no-op instead of branching on `typeof window`
 * everywhere.
 */
export function createTypedBroadcastChannel<T>(name: string): TypedBroadcastChannel<T> | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  const channel = new BroadcastChannel(name);

  return {
    postMessage: (message: T) => channel.postMessage(message),
    subscribe: (listener: (message: T) => void) => {
      const handler = (event: MessageEvent<T>) => listener(event.data);
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    },
    close: () => channel.close(),
  };
}
