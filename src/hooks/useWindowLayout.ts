import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDebounce } from './useDebounce';
import type { WindowLayout, WindowPosition } from '../types';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/window';

const WINDOW_LAYOUT_VERSION = 1;

export const useWindowLayout = () => {
  const lastSavedLayout = useRef<WindowLayout | null>(null);

  const getCurrentWindowPosition = useCallback(async (): Promise<WindowPosition> => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const window = getCurrentWindow();
    
    try {
      const [position, size, isMaximized, isMinimized, isAlwaysOnTop] = await Promise.all([
        window.innerPosition().catch(() => null),
        window.innerSize().catch(() => null),
        window.isMaximized().catch(() => false),
        window.isMinimized().catch(() => false),
        window.isAlwaysOnTop().catch(() => false)
      ]);

      return {
        x: position?.x ?? 0,
        y: position?.y ?? 0,
        width: size?.width ?? 800,
        height: size?.height ?? 600,
        isMaximized: isMaximized ?? false,
        isMinimized: isMinimized ?? false,
        isAlwaysOnTop: isAlwaysOnTop ?? false
      };
    } catch {
      return {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        isMaximized: false,
        isMinimized: false,
        isAlwaysOnTop: false
      };
    }
  }, []);

  const saveLayout = useCallback(async (layout: WindowLayout) => {
    try {
      await invoke('save_window_layout', { layout });
      lastSavedLayout.current = layout;
    } catch (error) {
      console.error('保存窗口布局失败:', error);
    }
  }, []);

  const debouncedSave = useDebounce(saveLayout, 500);

  const saveCurrentLayout = useCallback(async () => {
    try {
      const mainWindowPos = await getCurrentWindowPosition();
      
      const layout: WindowLayout = {
        mainWindow: mainWindowPos,
        floatWindows: {},
        version: WINDOW_LAYOUT_VERSION
      };

      await debouncedSave(layout);
    } catch (error) {
      console.error('保存当前布局失败:', error);
    }
  }, [getCurrentWindowPosition, debouncedSave]);

  const restoreLayout = useCallback(async () => {
    try {
      const layout = await invoke<WindowLayout | null>('load_window_layout');
      
      if (layout) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();

        const pos = layout.mainWindow;
        
        if (pos && !pos.isMaximized) {
          await window.setPosition(new LogicalPosition(pos.x, pos.y));
          await window.setSize(new LogicalSize(pos.width, pos.height));
        }

        if (pos?.isMaximized) {
          await window.maximize();
        }

        if (pos?.isAlwaysOnTop !== (await window.isAlwaysOnTop())) {
          await window.setAlwaysOnTop(pos.isAlwaysOnTop);
        }
      }
    } catch (error) {
      console.error('恢复窗口布局失败:', error);
    }
  }, []);

  const resetLayout = useCallback(async () => {
    try {
      await invoke('reset_window_layout');
      lastSavedLayout.current = null;
    } catch (error) {
      console.error('重置窗口布局失败:', error);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      saveCurrentLayout();
    };

    const handleMove = () => {
      saveCurrentLayout();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('move', handleMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('move', handleMove);
    };
  }, [saveCurrentLayout]);

  useEffect(() => {
    restoreLayout();
  }, [restoreLayout]);

  return {
    saveLayout,
    restoreLayout,
    resetLayout,
    saveCurrentLayout
  };
};
