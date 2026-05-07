import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const abortController = new AbortController();

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<T>(eventName, (event) => {
          if (abortController.signal.aborted) return;
          handlerRef.current(event.payload);
        });

        abortController.signal.addEventListener('abort', () => {
          try {
            unlisten();
          } catch {
          }
        });
      } catch (error) {
        console.error(`Failed to setup Tauri event listener for ${eventName}:`, error);
      }
    };

    setupListener();

    return () => {
      abortController.abort();
    };
  }, [eventName]);
}
