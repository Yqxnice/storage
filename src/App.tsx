const STORAGE_TYPE = {
  STORAGE: 'storage',
  SETTINGS: 'settings'
};

const THEME_DEFAULT = 'blue';

import { useEffect, useState, useCallback } from 'react';
import Home from './page/Home'
import Settings from './page/Settings'
import TitleBar from './components/common/TitleBar'
import DataPathSelector from './components/DataPathSelector'
import WelcomeModal from './components/WelcomeModal'
import { useStore, type SettingsState,  setStorageInitialized, getIsResetting, setIsResetting } from './store'
import { restoreOrphanBoxFloatWindows } from './utils/box-float-actions'
import { preloadBoxFloatMenus } from './utils/box-float-menu-window'
import { applyTheme } from './utils/theme'
import { tauriIPC, IPC_CHANNELS } from './utils/tauri-ipc'
import { listen } from '@tauri-apps/api/event'
import { logDebug, logInfo, logError } from './utils/logger'
import { APP_INFO } from './constants'
import { useWindowLayout } from './hooks'
import { storageManager, STORAGE_EVENTS } from './utils/storage-manager'
import './styles/app.css'

const log = async (level: string, message: string) => {
  if (typeof window !== 'undefined' && (window as any).storageInitialized) {
    await tauriIPC.logger.writeLog(level, message);
  }
};

function App() {
  const { boxes, activeBoxId, setActiveBox, syncStorageFromTauriStore, syncSettingsFromTauriStore, theme, setTheme, timeThemeEnabled, addItem, addBox, scanHiddenFiles, setBoxFloatWindowId } = useStore()
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home')
  const [showDataPathSelector, setShowDataPathSelector] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  
  useWindowLayout()

  useEffect(() => {
    const preventDefaultContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventDefaultContextMenu);
    return () => {
      document.removeEventListener('contextmenu', preventDefaultContextMenu);
    };
  }, []);

  useEffect(() => {
    preloadBoxFloatMenus().catch((err) => {
      logDebug('菜单预加载跳过:', err);
    });
  }, []);

  const syncAppData = useCallback(async (skipInit = false) => {
    try {
      log('info', '开始同步应用数据');
      
      if (!skipInit) {
        await storageManager.init();
      } else {
        await storageManager.syncFromBackend();
      }
      const storageData = storageManager.getState();
      
      syncStorageFromTauriStore({
        boxes: storageData.boxes,
        items: storageData.items,
        activeBoxId: storageData.activeBoxId,
        orphanBoxFloats: storageData.orphanBoxFloats,
        groups: storageData.groups,
      });
      log('info', '存储数据同步完成');

      try {
        await restoreOrphanBoxFloatWindows();
      } catch (e) {
        log('warn', `恢复无主悬浮窗: ${e}`);
      }
      
      const settingsData = await tauriIPC.store.get({ key: 'shortcuts', storeType: STORAGE_TYPE.SETTINGS }) as Record<string, string> | null | undefined;
      
      const viewMode = await tauriIPC.store.get({ key: 'viewMode', storeType: STORAGE_TYPE.SETTINGS }) || 'large';
      const trayVisible = await tauriIPC.store.get({ key: 'trayVisible', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const theme = await tauriIPC.store.get({ key: 'theme', storeType: STORAGE_TYPE.SETTINGS }) || 'blue';
      const timeThemeEnabled = await tauriIPC.store.get({ key: 'timeThemeEnabled', storeType: STORAGE_TYPE.SETTINGS }) === true;
      const sortByClickCount = await tauriIPC.store.get({ key: 'sortByClickCount', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const startOnBoot = await tauriIPC.store.get({ key: 'startOnBoot', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const startMinimized = await tauriIPC.store.get({ key: 'startMinimized', storeType: STORAGE_TYPE.SETTINGS }) === true;
      const minimizeOnClose = await tauriIPC.store.get({ key: 'minimizeOnClose', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const autoScanDesktop = await tauriIPC.store.get({ key: 'autoScanDesktop', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const handleInvalidMappings = await tauriIPC.store.get({ key: 'handleInvalidMappings', storeType: STORAGE_TYPE.SETTINGS }) !== false;
      const autoBackupInterval = await tauriIPC.store.get({ key: 'autoBackupInterval', storeType: STORAGE_TYPE.SETTINGS }) || '10min';
      const logAutoCleanupDays = await tauriIPC.store.get({ key: 'logAutoCleanupDays', storeType: STORAGE_TYPE.SETTINGS }) || '2';
      const scanHiddenFiles = await tauriIPC.store.get({ key: 'scanHiddenFiles', storeType: STORAGE_TYPE.SETTINGS }) === true;
      
      const finalSettings = {
        viewMode: viewMode,
        trayVisible: trayVisible,
        shortcuts: settingsData || {
          toggleApp: 'Ctrl+Shift+Space'
        },
        theme: theme,
        timeThemeEnabled: timeThemeEnabled,
        sortByClickCount: sortByClickCount,
        startOnBoot: startOnBoot,
        startMinimized: startMinimized,
        minimizeOnClose: minimizeOnClose,
        autoScanDesktop: autoScanDesktop,
        handleInvalidMappings: handleInvalidMappings,
        autoBackupInterval: autoBackupInterval,
        logAutoCleanupDays: logAutoCleanupDays,
        scanHiddenFiles: scanHiddenFiles
      };
      
      syncSettingsFromTauriStore(finalSettings as Partial<SettingsState>);
      log('info', '设置数据同步完成');
      
      if (finalSettings.shortcuts?.toggleApp) {
        const result = await tauriIPC.shortcut.register(finalSettings.shortcuts.toggleApp);
        if (result) {
          log('info', `快捷键注册成功: ${finalSettings.shortcuts.toggleApp}`);
        } else {
          log('error', `快捷键注册失败: ${finalSettings.shortcuts.toggleApp}`);
        }
      }
      
      log('info', '应用数据同步完成');

      const isResetting = getIsResetting();
      if (isResetting) {
        setIsResetting(false);
      }
    } catch (error) {
      log('error', `同步数据失败: ${error}`);
    }
  }, [syncStorageFromTauriStore, syncSettingsFromTauriStore]);

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as Element;
      const allowRightClick = target.closest('.allow-right-click');
      
      if (!allowRightClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const isDev = import.meta.env.DEV;
      if (!isDev) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === 'F5') {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    const initApp = async () => {
      try {
        const hasInitialized = await tauriIPC.store.get({ key: 'hasInitialized', storeType: STORAGE_TYPE.SETTINGS });
        const hasShownWelcome = await tauriIPC.store.get({ key: 'hasShownWelcome', storeType: STORAGE_TYPE.SETTINGS });
        
        if (!hasInitialized || !hasShownWelcome) {
          setShowWelcomeModal(true);
          const defaultTheme = THEME_DEFAULT;
          setTheme(defaultTheme);
          applyTheme(defaultTheme);
        } else {
          setStorageInitialized(true);
          if (typeof window !== 'undefined') {
            (window as any).storageInitialized = true;
          }
          await syncAppData();
          const defaultTheme = THEME_DEFAULT;
          setTheme(defaultTheme);
          applyTheme(defaultTheme);
          log('info', `应用初始化完成，主题: ${defaultTheme}`);
        }
      } catch (error) {
        console.error(`初始化失败: ${error}`);
        applyTheme(THEME_DEFAULT);
      }
    };
    
    initApp();
    
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setTheme, syncStorageFromTauriStore, syncSettingsFromTauriStore, syncAppData]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let intervalId: number | null = null;

    if (timeThemeEnabled) {
      const checkTimeAndUpdateTheme = () => {
        const now = new Date();
        const hour = now.getHours();
        const isDay = hour >= 6 && hour < 18;
        const currentTheme = isDay ? 'blue' : 'dark';

        if (theme !== currentTheme) {
          setTheme(currentTheme);
        }
      };

      checkTimeAndUpdateTheme();
      intervalId = window.setInterval(checkTimeAndUpdateTheme, 60 * 60 * 1000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [timeThemeEnabled, theme, setTheme]);

  useEffect(() => {
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen(IPC_CHANNELS.FILE_ADDED, (event) => {
        if (cancelled) return;
        const fileInfo = event.payload as {
          name: string;
          category: 'desktop' | 'web';
          type?: 'file' | 'folder' | 'icon';
          path?: string;
          targetBoxId?: string;
          size?: number;
        };

        if (fileInfo?.targetBoxId) {
          addItem({
            name: fileInfo.name,
            category: fileInfo.category,
            type: fileInfo.type,
            path: fileInfo.path,
            boxId: fileInfo.targetBoxId,
            clickCount: 0,
            size: fileInfo.size
          });
          return;
        }

        if (fileInfo && activeBoxId) {
          addItem({
            name: fileInfo.name,
            category: fileInfo.category,
            type: fileInfo.type,
            path: fileInfo.path,
            boxId: activeBoxId,
            clickCount: 0,
            size: fileInfo.size
          });
        } else if (!activeBoxId) {
          const boxName = '默认收纳盒';
          addBox(boxName);
        }
      });
      
      if (cancelled) {
        unlisten();
        return;
      }
      unlistenFn = unlisten;
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      } else if (unlistenFn instanceof Promise) {
        unlistenFn.then(fn => fn()).catch(logError);
      }
    };
  }, [activeBoxId, addItem, addBox]);

  useEffect(() => {
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen<{ boxId: string; floatWindowId: string | null }>(
        'box-float-meta-changed',
        (event) => {
          if (cancelled) return;
          const { boxId, floatWindowId } = event.payload
          if (boxId) {
            setBoxFloatWindowId(boxId, floatWindowId)
          }
        },
      );
      
      if (cancelled) {
        unlisten();
        return;
      }
      unlistenFn = unlisten;
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      } else if (unlistenFn instanceof Promise) {
        unlistenFn.then(fn => fn()).catch(logError);
      }
    };
  }, [setBoxFloatWindowId])



  useEffect(() => {
    if (boxes.length > 0 && !activeBoxId) {
      const newBox = boxes[boxes.length - 1];
      setActiveBox(newBox.id);
    }
  }, [boxes, activeBoxId, setActiveBox]);

  useEffect(() => {
    const unlistenFns: Array<(() => void) | Promise<(() => void)>> = [];
    const cancelled = { value: false };

    const setupListeners = async () => {
      const dragEnterUnlisten = await listen('tauri://drag-enter', () => {
      });
      if (!cancelled.value) {
        unlistenFns.push(dragEnterUnlisten);
      } else {
        dragEnterUnlisten();
      }

      const dragLeaveUnlisten = await listen('tauri://drag-leave', () => {
      });
      if (!cancelled.value) {
        unlistenFns.push(dragLeaveUnlisten);
      } else {
        dragLeaveUnlisten();
      }

      const dragDropUnlisten = await listen('tauri://drag-drop', (e) => {
        if (cancelled.value) return;
        const payload = e.payload as {
          paths: string[];
          position: { x: number; y: number };
        };
        
        if (payload && payload.paths && payload.paths.length > 0) {
          tauriIPC.dragFiles(payload.paths)
            .catch((error) => {
              logError('拖拽文件处理失败:', error);
            });
        }
      });
      if (!cancelled.value) {
        unlistenFns.push(dragDropUnlisten);
      } else {
        dragDropUnlisten();
      }
    };

    setupListeners();

    return () => {
      cancelled.value = true;
      unlistenFns.forEach(unlisten => {
        if (typeof unlisten === 'function') {
          unlisten();
        } else if (unlisten instanceof Promise) {
          unlisten.then(fn => fn()).catch(logError);
        }
      });
    };
  }, []);

  const handleNavClick = (nav: 'home' | 'stats' | 'help' | 'settings') => {
    if (nav === 'settings') {
      setCurrentPage('settings');
    } else {
      setCurrentPage('home');
    }
  };

  const handleWelcomeAgree = async () => {
    setShowWelcomeModal(false);
    
    const isPortable = await tauriIPC.invoke<boolean>('is_portable_mode', {}).catch(() => false);
    
    if (isPortable) {
      setShowDataPathSelector(true);
    } else {
      await handleDataPathSelect('current');
    }
  };

  const handleDataPathSelect = async (storageLocation: string) => {
    try {
      const isPortable = storageLocation === 'current';
      await tauriIPC.setPortableMode(isPortable);

      await tauriIPC.store.set({ key: 'dataPath', value: storageLocation, storeType: STORAGE_TYPE.SETTINGS });
      
      await tauriIPC.store.set({ key: 'hasInitialized', value: true, storeType: STORAGE_TYPE.SETTINGS });
      
      await tauriIPC.store.set({ key: 'hasShownWelcome', value: true, storeType: STORAGE_TYPE.SETTINGS });
      
      const defaultSettings = {
        viewMode: 'large',
        trayVisible: true,
        shortcuts: {
          toggleApp: 'Ctrl+Shift+Space'
        },
        theme: 'blue',
        timeThemeEnabled: false,
        sortByClickCount: true,
        startOnBoot: true,
        startMinimized: false,
        minimizeOnClose: true,
        autoScanDesktop: true,
        handleInvalidMappings: true,
        autoBackupInterval: '10min',
        logAutoCleanupDays: '2',
        scanHiddenFiles: false
      };
      
      for (const [key, value] of Object.entries(defaultSettings)) {
        await tauriIPC.store.set({ key, value, storeType: STORAGE_TYPE.SETTINGS });
      }
      
      setStorageInitialized(true);
      if (typeof window !== 'undefined') {
        (window as any).storageInitialized = true;
      }
      
      await syncAppData();
      
      const storageData = storageManager.getState();
      const storedBoxes = storageData.boxes || [];
      const storedBoxesCount = storedBoxes.length;
      
      if (storedBoxesCount === 0) {
        const desktopBoxId = await addBox('桌面收纳盒');
        await setActiveBox(desktopBoxId);
        
        try {
          logInfo('开始扫描桌面文件，scanHiddenFiles:', scanHiddenFiles);
          const desktopFiles = await tauriIPC.scanDesktopFiles(scanHiddenFiles);
          logDebug('扫描到的文件数量:', (desktopFiles as Array<any>)?.length);
          
          if (desktopFiles && Array.isArray(desktopFiles)) {
            for (const file of desktopFiles as Array<any>) {
              await addItem({
                name: file.name,
                category: file.category || 'desktop',
                type: file.type,
                path: file.path,
                boxId: `${desktopBoxId}`,
                clickCount: 0,
                size: file.size
              });
            }
            logInfo('文件添加完成，共', (desktopFiles as Array<any>).length, '个文件');
          }
        } catch (error) {
          logError('扫描或添加文件时出错:', error);
        }
      }
      
      setShowDataPathSelector(false);
    } catch (error) {
      logError('数据路径选择处理失败:', error);
    }
  };

  return (
    <div className="shell">
      <TitleBar title={APP_INFO.NAME} />
      {currentPage === 'home' ? (
        <Home activeNav="home" onNavClick={handleNavClick} />
      ) : (
        <Settings onNavClick={handleNavClick} />
      )}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onAgree={handleWelcomeAgree}
      />
      <DataPathSelector
        visible={showDataPathSelector}
        onClose={() => setShowDataPathSelector(false)}
        onConfirm={handleDataPathSelect}
      />
    </div>
  );
}

export default App