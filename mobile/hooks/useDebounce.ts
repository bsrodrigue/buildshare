import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A hook that returns a debounced version of the provided callback.
 *
 * @param callback The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Maintain a ref to the latest callback to avoid unnecessary re-renders
  // and ensure we always call the most up-to-date logic.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}

/**
 * A hook that returns a debounced value.
 * Useful for search inputs or any value that changes frequently.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
