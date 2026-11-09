import { useCallback, useLayoutEffect, useRef } from "react";

/** At most one pending action per mounted workflow. */
export function useDeferredAction() {
  const pending = useRef<number | null>(null);
  useLayoutEffect(() => () => {
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = null;
  }, []);

  return useCallback((action: () => void, delay: number) => {
    if (pending.current !== null) return;
    pending.current = window.setTimeout(() => {
      pending.current = null;
      action();
    }, delay);
  }, []);
}
