/**
 * 应用常量定义
 */
const STORAGE_TYPE = {
  STORAGE: 'storage',
  SETTINGS: 'settings'
};

const THEME_DEFAULT = 'blue';

import { useEffect, useState, useCallback } from 'react';
// Fix import issue
import Home from './page/Home'
import Settings from './page/Settings'
import TitleBar from './components/common/TitleBar'
import DataPathSelector from './components/DataPathSelector'
import WelcomeModal from './components/WelcomeModal'
import { useStore, type Box, type Item, type SettingsState, type OrphanBoxFloat, setStorageInitialized, getIsResetting, setIsResetting, shouldSkipStartupBackup, recordStartupTime } from './store'
import { restoreOrphanBoxFloatWindows } from './utils/box-float-actions'
import { preloadBoxFloatMenus } from './utils/box-float-menu-window'
import { applyTheme } from './utils/theme'
import { tauriIPC, IPC_CHANNELS } from './utils/tauri-ipc'
import { listen } from '@tauri-apps/api/event'
import { logDebug, logInfo, logError } from './utils/logger'
import { APP_INFO } from './constants'
import { useWindowLayout } from './hooks'
import './styles/app.css'

/**
 * 日志记录函数（写入到日志文件）
 * @param level 日志级别
 * @param message 日志消息
 */
const log = async (level: string, message: string) => {
  // 只有在存储初始化后才写入日志
  if (typeof window !== 'undefined' && (window as any).storageInitialized) {
    await tauriIPC.logger.writeLog(level, message);
  }
};



function App() {
  const { boxes, activeBoxId, setActiveBox, syncStorageFromTauriStore, syncSettingsFromTauriStore, theme, setTheme, timeThemeEnabled, addItem, addBox, scanHiddenFiles, createAutoBackup, setBoxFloatWindowId } = useStore()
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home')
  const [showDataPathSelector, setShowDataPathSelector] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  
  useWindowLayout()

  // 全局阻止原生右键菜单
  useEffect(() => {
    const preventDefaultContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventDefaultContextMenu);
    return () => {
      document.removeEventListener('contextmenu', preventDefaultContextMenu);
    };
  }, []);

  // 预加载菜单系统（零延迟启动！）
  useEffect(() => {
    preloadBoxFloatMenus().catch((err) => {
      logDebug('菜单预加载跳过:', err);
    });
  }, []);

/**
 * 同步应用数据
 * 从存储中加载收纳盒数据和设置，并同步到应用状态
 */
  const syncAppData = useCallback(async () => {
    try {
      log('info', '开始同步应用数据');
      const storageData = await tauriIPC.store.get({ key: 'storage', storeType: STORAGE_TYPE.STORAGE });
      if (storageData && typeof storageData === 'object' && 'boxes' in storageData) {
        syncStorageFromTauriStore(
          storageData as { boxes: Box[]; items: Item[]; activeBoxId: string | null; orphanBoxFloats?: OrphanBoxFloat[] },
        );
        log('info', '存储数据同步完成');
      }

      try {
        await restoreOrphanBoxFloatWindows();
      } catch (e) {
        log('warn', `恢复无主悬浮窗: ${e}`);
      }
      
      // 从存储中加载设置
      const settingsData = await tauriIPC.store.get({ key: 'shortcuts', storeType: STORAGE_TYPE.SETTINGS }) as Record<string, string> | null | undefined;
      
      // 从存储中加载其他设置
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
      
      // 构建最终设置
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
      
      // 同步到状态
      syncSettingsFromTauriStore(finalSettings as Partial<SettingsState>);
      log('info', '设置数据同步完成');
      
      // 注册全局快捷键
      if (finalSettings.shortcuts?.toggleApp) {
        const result = await tauriIPC.shortcut.register(finalSettings.shortcuts.toggleApp);
        if (result) {
          log('info', `快捷键注册成功: ${finalSettings.shortcuts.toggleApp}`);
        } else {
          log('error', `快捷键注册失败: ${finalSettings.shortcuts.toggleApp}`);
        }
      }
      
      log('info', '应用数据同步完成');

      // 启动时创建自动备份，但跳过重置操作后的启动和短时间内的重复启动
      const isResetting = getIsResetting();
      if (!isResetting && !shouldSkipStartupBackup()) {
        try {
          await createAutoBackup('app_start');
          recordStartupTime();
        } catch (error) {
          logError('启动备份失败:', error);
        }
      } else if (isResetting) {
        setIsResetting(false);
      } else {
        logInfo('短时间内重复启动，跳过启动备份');
      }
    } catch (error) {
      log('error', `同步数据失败: ${error}`);
    }
  }, [syncStorageFromTauriStore, syncSettingsFromTauriStore, createAutoBackup]);

/**
 * 初始化应用
 * 1. 全局拦截右键事件，只允许在特定区域右键
 * 2. 拦截F12/开发者工具（只在打包后生效）
 * 3. 检查应用是否已经初始化，显示欢迎弹窗或直接同步数据
 * 4. 初始化主题
 */
  useEffect(() => {
    // 全局拦截右键事件
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // 检查点击目标是否在「可右键区域」内
      const target = e.target as Element;
      const allowRightClick = target.closest('.allow-right-click');
      
      // 只有在可右键区域内才放行，否则完全禁用
      if (!allowRightClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // 拦截F12/开发者工具和F5刷新（可选，加固安全）- 只在打包后生效
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在开发环境中
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
    
    // 添加事件监听器
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
    
    // 清理事件监听器
    return () => {
      // 清理其他事件监听器
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setTheme, syncStorageFromTauriStore, syncSettingsFromTauriStore, syncAppData]);

  // 当主题变化时应用主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

/**
 * 时间主题自动更新
 * 当时间主题功能启用时，每小时检查一次时间，自动切换日/夜主题
 */
  useEffect(() => {
    let intervalId: number | null = null;

    if (timeThemeEnabled) {
      // 每小时检查一次时间，自动切换主题
      const checkTimeAndUpdateTheme = () => {
        const now = new Date();
        const hour = now.getHours();
        const isDay = hour >= 6 && hour < 18;
        const currentTheme = isDay ? 'blue' : 'dark';

        if (theme !== currentTheme) {
          setTheme(currentTheme);
        }
      };

      // 立即执行一次
      checkTimeAndUpdateTheme();

      // 每小时检查一次
      intervalId = window.setInterval(checkTimeAndUpdateTheme, 60 * 60 * 1000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [timeThemeEnabled, theme, setTheme]);

/**
 * 监听 file:added 事件
 * 当文件被拖放到应用时，将其添加到活动收纳盒
 * 如果没有活动收纳盒，自动创建默认收纳盒
 */
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
          // 创建默认收纳盒
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

  // 收纳盒悬浮窗关闭或创建时，子窗口写盘并广播，主窗口与其它 Webview 同步 floatWindowId
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
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen('box-float-storage-updated', () => {
        if (cancelled) return;
        void syncAppData();
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
  }, [syncAppData]);

  // 当 boxes 数组变化且没有活动收纳盒时，设置第一个收纳盒为活动收纳盒
  useEffect(() => {
    if (boxes.length > 0 && !activeBoxId) {
      const newBox = boxes[boxes.length - 1];
      setActiveBox(newBox.id);
    }
  }, [boxes, activeBoxId, setActiveBox]);

  // 添加Tauri系统级拖拽事件处理
  useEffect(() => {
    const unlistenFns: Array<(() => void) | Promise<(() => void)>> = [];
    const cancelled = { value: false };

    const setupListeners = async () => {
      // 监听 Tauri 拖拽进入事件
      const dragEnterUnlisten = await listen('tauri://drag-enter', () => {
      });
      if (!cancelled.value) {
        unlistenFns.push(dragEnterUnlisten);
      } else {
        dragEnterUnlisten();
      }

      // 监听 Tauri 拖拽离开事件
      const dragLeaveUnlisten = await listen('tauri://drag-leave', () => {
      });
      if (!cancelled.value) {
        unlistenFns.push(dragLeaveUnlisten);
      } else {
        dragLeaveUnlisten();
      }

      // 监听 Tauri 拖拽释放事件
      const dragDropUnlisten = await listen('tauri://drag-drop', (e) => {
        if (cancelled.value) return;
        // 从事件中获取拖拽的文件路径
        const payload = e.payload as {
          paths: string[];
          position: { x: number; y: number };
        };
        
        if (payload && payload.paths && payload.paths.length > 0) {
          // 调用后端的drag_files方法处理这些文件
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

    // 清理事件监听器
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

  // 处理欢迎弹窗同意
  const handleWelcomeAgree = async () => {
    // 关闭欢迎弹窗
    setShowWelcomeModal(false);
    
    // 检查是否为便携版（通过检测可执行文件目录下是否存在 .portable 文件）
    const isPortable = await tauriIPC.invoke<boolean>('is_portable_mode', {}).catch(() => false);
    
    if (isPortable) {
      // 便携版：显示数据路径选择对话框
      setShowDataPathSelector(true);
    } else {
      // 安装包版：直接使用安装路径，不显示路径选择
      await handleDataPathSelect('current');
    }
  };

/**
 * 处理数据路径选择
 * 1. 设置便携模式（如果选择当前目录）
 * 2. 保存存储位置到设置
 * 3. 标记应用为已初始化
 * 4. 保存默认设置
 * 5. 同步数据到应用状态
 * 6. 首次安装时创建桌面收纳盒并扫描桌面文件
 * @param storageLocation 存储位置（'appdata'、'current' 或自定义路径）
 */
  const handleDataPathSelect = async (storageLocation: string) => {
    try {
      // 设置便携模式：如果用户选择当前目录，则启用便携模式
      const isPortable = storageLocation === 'current';
      await tauriIPC.setPortableMode(isPortable);

      // 保存存储位置（如果是自定义路径，直接保存完整路径）
      await tauriIPC.store.set({ key: 'dataPath', value: storageLocation, storeType: STORAGE_TYPE.SETTINGS });
      
      // 标记为已初始化
      await tauriIPC.store.set({ key: 'hasInitialized', value: true, storeType: STORAGE_TYPE.SETTINGS });
      
      // 标记为已显示欢迎弹窗
      await tauriIPC.store.set({ key: 'hasShownWelcome', value: true, storeType: STORAGE_TYPE.SETTINGS });
      
      // 保存完整的默认设置
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
      
      // 保存所有默认设置
      for (const [key, value] of Object.entries(defaultSettings)) {
        await tauriIPC.store.set({ key, value, storeType: STORAGE_TYPE.SETTINGS });
      }
      
      // 标记存储已初始化
      setStorageInitialized(true);
      // 设置全局存储初始化标记
      if (typeof window !== 'undefined') {
        (window as any).storageInitialized = true;
      }
      
      // 同步数据到状态
      await syncAppData();
      
      // 检查是否需要创建桌面收纳盒（首次安装时）
      const storageData = await tauriIPC.store.get({ key: 'storage', storeType: STORAGE_TYPE.STORAGE });
      const storedBoxes = storageData && typeof storageData === 'object' && 'boxes' in storageData ? (storageData.boxes as Box[]) : [];
      const storedBoxesCount = Array.isArray(storedBoxes) ? storedBoxes.length : 0;
      
      if (storedBoxesCount === 0) {
        // 创建桌面收纳盒
        const desktopBoxId = addBox('桌面收纳盒');
        // 设置为活动收纳盒
        setActiveBox(desktopBoxId);
        
        try {
          // 调用后端扫描桌面文件函数，使用设置中的扫描隐藏文件选项
          logInfo('开始扫描桌面文件，scanHiddenFiles:', scanHiddenFiles);
          const desktopFiles = await tauriIPC.scanDesktopFiles(scanHiddenFiles);
          logDebug('扫描到的文件数量:', (desktopFiles as Array<any>)?.length);
          
          // 将扫描到的文件添加到桌面收纳盒
          if (desktopFiles && Array.isArray(desktopFiles)) {
            // 使用 for...of 循环并等待每个 addItem 完成
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