import { useCallback, useRef, useEffect } from 'react';

export function useDebounce<T extends (...args: unknown[]) => Promise<unknown> | unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  const timeoutRef = useRef<number | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debouncedFn = useCallback((...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    return new Promise((resolve) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        const result = fnRef.current(...args);
        resolve(result as ReturnType<T>);
      }, delay);
    });
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

export function debounce<T extends (...args: unknown[]) => Promise<unknown> | unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  let timeout: number | null = null;
  return (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    return new Promise((resolve) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = window.setTimeout(() => {
        const result = fn(...args);
        resolve(result as ReturnType<T>);
      }, delay);
    });
  };
}
