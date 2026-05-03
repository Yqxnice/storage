import { useEffect, useRef, useCallback } from 'react';

export function useEvent<T extends Event>(
  eventName: string,
  handler: (event: T) => void,
  element: HTMLElement | Window | Document | null = window
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      handlerRef.current(event as T);
    };

    element.addEventListener(eventName, eventListener);
    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  const handlerRef = useRef(handler);
  const unlistenRef = useRef<(() => void) | Promise<() => void> | null>(null);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let cancelled = false;

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<T>(eventName, (event) => {
          if (!cancelled) {
            handlerRef.current(event.payload);
          }
        });

        if (!cancelled) {
          unlistenRef.current = unlisten;
        } else {
          await unlisten();
        }
      } catch (error) {
        console.error(`Failed to setup Tauri event listener for ${eventName}:`, error);
      }
    };

    setupListener();

    return () => {
      cancelled = true;
      const cleanup = async () => {
        if (unlistenRef.current) {
          try {
            const unlisten = await unlistenRef.current;
            unlisten();
          } catch (error) {
            console.error('Failed to cleanup Tauri event listener:', error);
          }
        }
      };
      cleanup();
    };
  }, [eventName]);
}
