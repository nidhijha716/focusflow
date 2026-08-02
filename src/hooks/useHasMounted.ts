"use client";

import { useSyncExternalStore } from "react";

function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Returns `false` during server rendering and the initial client render,
 * then `true` from the first paint after hydration onward -- the standard
 * `useSyncExternalStore` pattern for "has this component hydrated yet"
 * (used the same way `hooks/useReducedMotion.ts` and
 * `hooks/usePiPSupport.ts` read other browser-only values). Prefer this
 * over `useState(false)` + `useEffect(() => setMounted(true), [])`: that
 * form calls `setState` synchronously inside an effect body, which
 * `eslint-plugin-react-hooks`'s `set-state-in-effect` rule (enabled via
 * `eslint-config-next` in this project) flags as an unnecessary
 * render-cascading effect.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
