import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hook that returns false during SSR and initial hydration, and true once hydrated on the client.
 * Uses useSyncExternalStore to avoid hydration mismatches and cascading render lint errors.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

