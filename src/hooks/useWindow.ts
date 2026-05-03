import { useCallback, useState, useEffect } from 'react';

export function useWindow() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const minimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, []);

  const maximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.maximize();
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  }, []);

  const toggleMaximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error('Failed to toggle maximize window:', error);
    }
  }, []);

  const close = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  const setAlwaysOnTop = useCallback(async (alwaysOnTop: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_window_always_on_top', { alwaysOnTop });
    } catch (error) {
      console.error('Failed to set always on top:', error);
    }
  }, []);

  const setTransparency = useCallback(async (transparent: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_window_transparency', { transparent });
    } catch (error) {
      console.error('Failed to set transparency:', error);
    }
  }, []);

  return {
    isMaximized,
    isVisible,
    minimize,
    maximize,
    toggleMaximize,
    close,
    setAlwaysOnTop,
    setTransparency,
  };
}
