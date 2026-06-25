import { useRef, useLayoutEffect, useCallback } from 'react';

/**
 * A custom hook that returns a stable callback function, but always executes
 * the latest version of the passed function. This completely eliminates 
 * "Stale Closures" when passing callbacks to React.memo() components.
 */
export function useEvent<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);

  useLayoutEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: any[]) => {
    return ref.current?.(...args);
  }, []) as unknown as T;
}
