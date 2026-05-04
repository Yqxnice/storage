import { create } from 'zustand';
import { applyTheme, applyTimeTheme } from './utils/theme';
import { tauriIPC } from './utils/tauri-ipc';
import { showMessage } from './components/common';
import { emitBoxFloatItemsReload } from './utils/box-float-notify';
import { destroyBoxFloatWebviews } from './utils/box-float-destroy';
import { logDebug, logInfo, logError } from './utils/logger';

// 控制是否保存设置到存储
let isStorageInitialized = false;

/**
 * 日志记录函数（写入到日志文件）
 * @param level 日志级别
 * @param message 日志消息
 */
const log = async (level: string, message: string) => {
  // 只有在存储初始化后才写入日志
  if (typeof window !== 'undefined' && isStorageInitialized) {
    await tauriIPC.logger.writeLog(level, message);
  }
};

// localStorage 的 key
const RESETTING_KEY = 'storage_app_is_resetting';

export const setStorageInitialized = (initialized: boolean) => {
  isStorageInitialized = initialized;
};

export const setIsResetting = (resetting: boolean) => {
  if (typeof window !== 'undefined') {
    if (resetting) {
      localStorage.setItem(RESETTING_KEY, 'true');
    } else {
      localStorage.removeItem(RESETTING_KEY);
    }
  }
};

export const getIsResetting = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(RESETTING_KEY) === 'true';
  }
  return false;
};

// 防抖备份相关
const SETTINGS_BACKUP_DEBOUNCE = 2000;
let settingsBackupTimer: number | null = null;

// 防抖 settings_only 备份，合并多次设置修改
const debouncedSettingsBackup = () => {
  if (settingsBackupTimer) {
    clearTimeout(settingsBackupTimer);
  }
  settingsBackupTimer = window.setTimeout(() => {
    if (isStorageInitialized) {
      useSettingsStore.getState().createAutoBackup('settings_only');
    }
    settingsBackupTimer = null;
  }, SETTINGS_BACKUP_DEBOUNCE);
};

// 启动间隔检测
const STARTUP_INTERVAL_KEY = 'lastStartupTime';
const MIN_STARTUP_INTERVAL = 5 * 60 * 1000; // 5分钟

const shouldSkipStartupBackup = (): boolean => {
  if (typeof window === 'undefined') return false;
  const lastStartup = localStorage.getItem(STARTUP_INTERVAL_KEY);
  if (!lastStartup) return false;
  const interval = Date.now() - parseInt(lastStartup, 10);
  return interval < MIN_STARTUP_INTERVAL;
};

const recordStartupTime = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STARTUP_INTERVAL_KEY, Date.now().toString());
  }
};

export { shouldSkipStartupBackup, recordStartupTime };

export interface Box {
  id: string;
  name: string;
  itemCount: number;
  createdAt: number;
  /** 收纳盒专属悬浮窗 Webview 的实例 id；关闭悬浮窗会清除，不影响收纳盒 */
  floatWindowId?: string;
}

export interface Item {
  id: string;
  name: string;
  category: 'desktop' | 'web';
  type?: 'file' | 'folder' | 'icon';
  path?: string;
  url?: string;
  icon?: string;
  boxId: string;
  addedAt: number;
  clickCount: number;
  size?: number;
}

/**
 * 无主收纳盒悬浮窗（仅磁盘与内存列表记录，不预建收纳盒）。
 * `title` 可重复（如均为 Welcome）；`floatWindowId` 必须全局唯一，与 Webview label 一一对应。
 */
export interface OrphanBoxFloat {
  floatWindowId: string;
  title: string;
}

export interface SettingsState {
  viewMode: 'large' | 'small' | 'list';
  trayVisible: boolean;
  shortcuts: Record<string, string>;
  theme: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'dark';
  timeThemeEnabled: boolean;
  sortByClickCount: boolean;
  startOnBoot: boolean;
  startMinimized: boolean;
  minimizeOnClose: boolean;
  autoScanDesktop: boolean;
  handleInvalidMappings: boolean;
  autoBackupInterval: string;
  logAutoCleanupDays: string;
  scanHiddenFiles: boolean;
  setScanHiddenFiles: (value: boolean) => void;
  setViewMode: (mode: 'large' | 'small' | 'list') => void;
  setTrayVisible: (visible: boolean) => void;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  setTheme: (theme: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'dark') => void;
  setTimeThemeEnabled: (enabled: boolean) => void;
  setSortByClickCount: (value: boolean) => void;
  setStartOnBoot: (value: boolean) => void;
  setStartMinimized: (value: boolean) => void;
  setMinimizeOnClose: (value: boolean) => void;
  setAutoScanDesktop: (value: boolean) => void;
  setHandleInvalidMappings: (value: boolean) => void;
  setAutoBackupInterval: (interval: string) => void;
  setLogAutoCleanupDays: (days: string) => void;
  createAutoBackup: (backupType: string) => Promise<void>;
  createBackup: () => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  cleanupBackups: () => Promise<void>;
  clearLogs: () => Promise<void>;
  syncSettingsFromTauriStore: (data: Partial<SettingsState>) => void;
  resetSettings: () => Promise<void>;
  clearAllData: (option?: 'storage' | 'all') => Promise<void>;
}

interface StorageState {
  boxes: Box[];
  items: Item[];
  activeBoxId: string | null;
  orphanBoxFloats: OrphanBoxFloat[];
  addBox: (name: string) => string;
  updateBox: (id: string, name: string) => void;
  deleteBox: (id: string) => void;
  setActiveBox: (id: string) => void;
  reorderBoxes: (fromIndex: number, toIndex: number) => void;
  addItem: (item: Omit<Item, 'id' | 'addedAt'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  moveItem: (id: string, boxId: string) => Promise<void>;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  updateItemName: (id: string, name: string) => void;
  incrementClickCount: (id: string) => void;
  syncFromTauriStore: (data: {
    boxes: Box[];
    items: Item[];
    activeBoxId: string | null;
    orphanBoxFloats?: OrphanBoxFloat[];
  }) => void;
  /** 仅更新内存中收纳盒的悬浮窗 id（不写盘；写盘由 box-float-actions.persistBoxFloatMeta 负责） */
  setBoxFloatWindowId: (boxId: string, floatWindowId: string | null) => void;
  addOrphanBoxFloat: (row: OrphanBoxFloat) => void;
  removeOrphanBoxFloat: (floatWindowId: string) => void;
}

export interface AppState extends SettingsState, StorageState {}

const useSettingsStore = create<SettingsState>()((set) => ({
  viewMode: 'large',
  setViewMode: (mode) => {
    set({ viewMode: mode });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'viewMode',
        value: mode,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 viewMode 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  
  trayVisible: true,
  setTrayVisible: (visible) => {
    set({ trayVisible: visible });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'trayVisible',
        value: visible,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 trayVisible 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  shortcuts: {
    toggleApp: 'Ctrl+Shift+Space'
  },
  setShortcuts: (shortcuts) => {
    set({ shortcuts });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'shortcuts',
        value: shortcuts,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 shortcuts 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  theme: 'blue',
  timeThemeEnabled: false,
  setTheme: async (theme) => {
    set({ theme });
    applyTheme(theme);
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'theme',
        value: theme,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 theme 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setTimeThemeEnabled: async (enabled) => {
    set((state) => {
      const newTheme = applyTimeTheme(enabled, state.theme);
      return {
        timeThemeEnabled: enabled,
        theme: enabled ? newTheme : state.theme
      };
    });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'timeThemeEnabled',
        value: enabled,
        storeType: 'settings'
      }).then(() => {

      });
    }
  },

  sortByClickCount: true,
  setSortByClickCount: (value) => {
    set({ sortByClickCount: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'sortByClickCount',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 sortByClickCount 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  startOnBoot: true,
  startMinimized: false,
  minimizeOnClose: true,
  autoScanDesktop: true,
  handleInvalidMappings: true,
  autoBackupInterval: '10min',
  logAutoCleanupDays: '2',
  scanHiddenFiles: false,
  
  setScanHiddenFiles: (value) => {
    set({ scanHiddenFiles: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'scanHiddenFiles',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 scanHiddenFiles 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  setStartOnBoot: (value) => {
    set({ startOnBoot: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'startOnBoot',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 startOnBoot 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setStartMinimized: (value) => {
    set({ startMinimized: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'startMinimized',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 startMinimized 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setMinimizeOnClose: (value) => {
    set({ minimizeOnClose: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'minimizeOnClose',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 minimizeOnClose 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setAutoScanDesktop: (value) => {
    set({ autoScanDesktop: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'autoScanDesktop',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 autoScanDesktop 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setHandleInvalidMappings: (value) => {
    set({ handleInvalidMappings: value });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'handleInvalidMappings',
        value: value,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 handleInvalidMappings 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },
  setAutoBackupInterval: (interval) => {
    set({ autoBackupInterval: interval });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'autoBackupInterval',
        value: interval,
        storeType: 'settings'
      });
      tauriIPC.backup.setAutoBackupInterval(interval);
    }
  },
  // 创建自动备份，支持多种备份类型
  createAutoBackup: async (backupType: string) => {
    try {
      // 如果正在重置操作，跳过备份
      if (getIsResetting()) {
        logDebug(`正在重置操作，跳过备份: ${backupType}`);
        return;
      }
      await tauriIPC.backup.createBackup(backupType);
      logInfo(`自动备份成功: ${backupType}`);
    } catch (error) {
      logError(`自动备份失败 (${backupType}):`, error);
      // 自动备份失败不应该打断用户操作，所以不显示错误提示
    }
  },
  createBackup: async () => {
    try {
      await tauriIPC.backup.createBackup('manual');
      showMessage.success('手动备份创建成功');
    } catch (error) {

      showMessage.error('创建备份失败: ' + error);
    }
  },
  restoreBackup: async (backupId) => {
    try {
      await tauriIPC.backup.restoreBackup(backupId);
      showMessage.success('数据恢复成功');
      window.location.reload();
    } catch (error) {

      showMessage.error('恢复备份失败: ' + error);
    }
  },
  cleanupBackups: async () => {
    try {
      await tauriIPC.backup.cleanupBackups();
      showMessage.success('备份清理成功');
    } catch (error) {

      showMessage.error('清理备份失败: ' + error);
    }
  },
  setLogAutoCleanupDays: (days) => {
    // 先备份设置
    if (isStorageInitialized) {
      useSettingsStore.getState().createAutoBackup('settings_only');
    }
    set({ logAutoCleanupDays: days });
    // 只有在存储初始化后才保存设置
    if (isStorageInitialized) {
      tauriIPC.store.set({
        key: 'logAutoCleanupDays',
        value: days,
        storeType: 'settings'
      });
      tauriIPC.logger.setAutoCleanupDays(days);
    }
  },
  clearLogs: async () => {
    try {
      await tauriIPC.logger.clearLogs();
      showMessage.success('日志清理成功');
    } catch (error) {

      showMessage.error('清理日志失败: ' + error);
    }
  },

  syncSettingsFromTauriStore: (data) => {
    set((state) => ({
      ...state,
      ...data
    }));
  },

  resetSettings: async () => {
    // 保存原始状态
    const originalIsStorageInitialized = isStorageInitialized;
    
    try {
      // 先备份设置
      if (originalIsStorageInitialized) {
        await useSettingsStore.getState().createAutoBackup('pre_reset_settings');
      }
      
      // 立即禁用备份，防止任何后续操作产生备份
      isStorageInitialized = false;
      
      const defaultSettings: Partial<SettingsState> = {
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
      
      set(defaultSettings);
      document.documentElement.setAttribute('data-theme', 'blue');
      
      // 只有在存储初始化后才保存设置
      if (originalIsStorageInitialized) {
        // 保存所有设置
        Object.entries(defaultSettings).forEach(([key, value]) => {
          tauriIPC.store.set({
            key: key,
            value: value,
            storeType: 'settings'
          }).catch(async (error) => {
            await log('ERROR', `保存重置设置 ${key} 失败: ${error instanceof Error ? error.message : String(error)}`);
          });
        });
      }
    } catch (error) {
      showMessage.error('重置设置失败: ' + error);
    } finally {
      // 无论成功或失败，最后都恢复原始状态
      isStorageInitialized = originalIsStorageInitialized;
    }
  },

  clearAllData: async (option: 'storage' | 'all' = 'all') => {
    // 保存原始状态
    const originalIsStorageInitialized = isStorageInitialized;
    
    try {
      // 先备份，根据选项决定备份类型
      if (originalIsStorageInitialized) {
        if (option === 'all') {
          await useSettingsStore.getState().createAutoBackup('pre_clear_all');
        } else {
          await useSettingsStore.getState().createAutoBackup('pre_clear_storage');
        }
      }
      
      // 立即禁用备份，防止任何后续操作产生备份
      isStorageInitialized = false;
      
      if (option === 'all') {
        // 先保存之前的 hasShownWelcome 值（在清除之前）
        const hasShownBefore = await tauriIPC.store.get({ 
          key: 'hasShownWelcome', 
          storeType: 'settings' 
        }).catch(() => null);
        
        // 然后清除数据
        await tauriIPC.store.clear('settings');
        await tauriIPC.store.clear('storage');
        
        // 保存默认设置
        const defaultSettings: Partial<SettingsState> = {
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
          await tauriIPC.store.set({
            key,
            value,
            storeType: 'settings'
          });
        }
        
        // 标记为已经初始化
        await tauriIPC.store.set({ 
          key: 'hasInitialized', 
          value: true, 
          storeType: 'settings' 
        });
        
        // 如果之前有显示过欢迎弹窗，保持这个状态
        if (hasShownBefore !== null) {
          await tauriIPC.store.set({ 
            key: 'hasShownWelcome', 
            value: hasShownBefore, 
            storeType: 'settings' 
          });
        }
        
        // 创建空的收纳盒数据
        const emptyStorage = {
          boxes: [],
          items: [],
          activeBoxId: null,
          orphanBoxFloats: []
        };
        
        await tauriIPC.store.set({
          key: 'storage',
          value: emptyStorage,
          storeType: 'storage'
        });
        
        // 同步到状态
        useSettingsStore.setState(defaultSettings);
        useStorageStore.getState().syncFromTauriStore(emptyStorage);
        
        // 应用默认主题
        document.documentElement.setAttribute('data-theme', 'blue');
        
        showMessage.success('全部数据已重置');
        
        // 设置重置标志，防止 reload 后的启动备份
        setIsResetting(true);
        window.location.reload();
      } else {
        await tauriIPC.store.clear('storage');
        
        // 创建默认的收纳盒（桌面收纳盒）
        const desktopBoxId = crypto.randomUUID().replace(/-/g, '').substring(0, 6);
        const defaultStorage = {
          boxes: [{
            id: desktopBoxId,
            name: '桌面收纳盒',
            itemCount: 0,
            createdAt: Date.now(),
            floatWindowId: null
          }],
          items: [],
          activeBoxId: desktopBoxId,
          orphanBoxFloats: []
        };
        
        await tauriIPC.store.set({
          key: 'storage',
          value: defaultStorage,
          storeType: 'storage'
        });
        
        // 同步到状态
        useStorageStore.getState().syncFromTauriStore(defaultStorage);
        
        showMessage.success('收纳盒数据已重置');
      }
    } catch (error) {
      showMessage.error('重置数据失败: ' + error);
    } finally {
      // 无论成功或失败，最后都恢复原始状态（尽管我们之后会 reload 页面）
      isStorageInitialized = originalIsStorageInitialized;
    }
  },

}));

// 防抖工具函数
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: number | null = null;
  return (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => func(...args), waitFor);
  };
};

// 同步存储数据到 IPC（内部实现）
const performSyncStorageToIPC = async (
  boxes: Box[],
  items: Item[],
  activeBoxId: string | null,
  orphanBoxFloats?: OrphanBoxFloat[],
) => {
  // 只有在存储初始化后才同步数据
  if (!isStorageInitialized) {
    return;
  }

  const orphans =
    orphanBoxFloats !== undefined ? orphanBoxFloats : useStorageStore.getState().orphanBoxFloats;

  try {
    await tauriIPC.store.set({
      key: 'storage',
      value: {
        boxes,
        items,
        activeBoxId,
        orphanBoxFloats: orphans,
      },
      storeType: 'storage',
    });
  } catch (error) {
    log('ERROR', `同步存储数据失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 防抖的同步存储函数（300ms 防抖）
let syncStorageToIPC = debounce(performSyncStorageToIPC, 300);
// 立即同步存储（不防抖，用于关键操作）
let syncStorageToIPCImmediately = performSyncStorageToIPC;

/** 无主悬浮窗列表写入串行化，避免连点创建时异步 set 互相覆盖（标题可相同，以 floatWindowId 区分） */
let orphanListPersistChain = Promise.resolve();
const persistOrphanListAfterChange = () => {
  orphanListPersistChain = orphanListPersistChain.then(async () => {
    if (!isStorageInitialized) return;
    const s = useStorageStore.getState();
    try {
      await tauriIPC.store.set({
        key: 'storage',
        value: {
          boxes: s.boxes,
          items: s.items,
          activeBoxId: s.activeBoxId,
          orphanBoxFloats: s.orphanBoxFloats,
        },
        storeType: 'storage',
      });
    } catch (error) {
      log('ERROR', `保存无主悬浮窗列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
};

const useStorageStore = create<StorageState>()((set, get) => ({
  
  boxes: [],
  items: [],
  activeBoxId: null,
  orphanBoxFloats: [],

  addOrphanBoxFloat: (row) => {
    set((state) => {
      const next = [...state.orphanBoxFloats.filter((o) => o.floatWindowId !== row.floatWindowId), row];
      return { orphanBoxFloats: next };
    });
    persistOrphanListAfterChange();
  },

  removeOrphanBoxFloat: (floatWindowId) => {
    set((state) => ({
      orphanBoxFloats: state.orphanBoxFloats.filter((o) => o.floatWindowId !== floatWindowId),
    }));
    persistOrphanListAfterChange();
  },
  
  addBox: (name) => {
    const newBox: Box = {
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      name,
      itemCount: 0,
      createdAt: Date.now()
    };
    set((state) => {
      const newBoxes = [...state.boxes, newBox];

      syncStorageToIPC(newBoxes, state.items, state.activeBoxId);

      return { boxes: newBoxes };
    });
    return newBox.id;
  },

  updateBox: (id, name) => {
    set((state) => {
      const newBoxes = state.boxes.map((box) =>
        box.id === id ? { ...box, name } : box
      );

      syncStorageToIPC(newBoxes, state.items, state.activeBoxId);

      return { boxes: newBoxes };
    });
  },
  
  deleteBox: async (id) => {
    const floatFid = get().boxes.find((b) => b.id === id)?.floatWindowId;

    // 删除前先备份
    if (isStorageInitialized) {
      // 通过 useSettingsStore 访问 createAutoBackup
      useSettingsStore.getState().createAutoBackup('pre_delete_box');
    }
    
    set((state) => {
      const newBoxes = state.boxes.filter((box) => box.id !== id);
      const newItems = state.items.filter((item) => item.boxId !== id);
      const newActiveBoxId = state.activeBoxId === id 
        ? (newBoxes.find((box) => box.id !== id)?.id || null) 
        : state.activeBoxId;
      
      syncStorageToIPC(newBoxes, newItems, newActiveBoxId);
      
      return {
        boxes: newBoxes,
        items: newItems,
        activeBoxId: newActiveBoxId
      };
    });

    if (floatFid) {
      try {
        await destroyBoxFloatWebviews(floatFid);
      } catch {
        // ignore
      }
    }
  },
  
  setActiveBox: (id) => {
    set((state) => {
      syncStorageToIPC(state.boxes, state.items, id);
      
      return { activeBoxId: id };
    });
  },
  
  reorderBoxes: (fromIndex, toIndex) => {
    logDebug('[拖拽] 开始重新排序收纳盒:', fromIndex, '->', toIndex);
    set((state) => {
      if (fromIndex < 0 || fromIndex >= state.boxes.length || toIndex < 0 || toIndex >= state.boxes.length) {
        logDebug('[拖拽] 索引无效，跳过排序');
        return state;
      }

      logDebug('[拖拽] 原收纳盒顺序:', state.boxes.map(box => box.name));
      const newBoxes = [...state.boxes];
      const [movedBox] = newBoxes.splice(fromIndex, 1);
      newBoxes.splice(toIndex, 0, movedBox);

      logDebug('[拖拽] 新收纳盒顺序:', newBoxes.map(box => box.name));
      syncStorageToIPC(newBoxes, state.items, state.activeBoxId);

      return { boxes: newBoxes };
    });
  },
  
  addItem: async (item) => {
    let existingItem;
    if (item.category === 'desktop' && item.path) {
      existingItem = get().items.find(i => i.path === item.path && i.boxId === item.boxId);
    } else if (item.category === 'web' && item.url) {
      existingItem = get().items.find(i => i.url === item.url && i.boxId === item.boxId);
    }
    if (existingItem) {
      return;
    }

    const newItem: Item = {
      ...item,
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      addedAt: Date.now(),
      clickCount: 0,
      size: item.size
    };

    const currentState = get();
    const newItems = [...currentState.items, newItem];
    const newBoxes = currentState.boxes.map((box) =>
      box.id === item.boxId ? { ...box, itemCount: box.itemCount + 1 } : box
    );

    set({
      items: newItems,
      boxes: newBoxes
    });

    await syncStorageToIPCImmediately(newBoxes, newItems, currentState.activeBoxId);

    emitBoxFloatItemsReload(item.boxId);
  },
  
  incrementClickCount: (id) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, clickCount: (item.clickCount || 0) + 1 } : item
      );
      
      syncStorageToIPC(state.boxes, newItems, state.activeBoxId);
      
      return { items: newItems };
    });
  },
  
  removeItem: async (id) => {
    const target = get().items.find((i) => i.id === id);
    if (target) {
      // 删除前先备份
      if (isStorageInitialized) {
        const backupType = target.category === 'web' ? 'pre_delete_link' : 'pre_delete_item';
        useSettingsStore.getState().createAutoBackup(backupType);
      }
      
      const boxId = target.boxId;
      const currentState = get();
      const newItems = currentState.items.filter((it) => it.id !== id);
      const newBoxes = currentState.boxes.map((box) =>
        box.id === target.boxId ? { ...box, itemCount: box.itemCount - 1 } : box
      );
      
      set({
        items: newItems,
        boxes: newBoxes
      });
      
      // 立即同步存储
      await syncStorageToIPCImmediately(newBoxes, newItems, currentState.activeBoxId);
      
      emitBoxFloatItemsReload(boxId);
    }
  },
  
  moveItem: async (id, boxId) => {
    const moved = get().items.find((i) => i.id === id);
    if (moved) {
      const fromBox = moved.boxId;
      const currentState = get();
      const newItems = currentState.items.map((it) =>
        it.id === id ? { ...it, boxId } : it
      );
      const newBoxes = currentState.boxes.map((box) =>
        box.id === moved.boxId
          ? { ...box, itemCount: box.itemCount - 1 }
          : box.id === boxId
          ? { ...box, itemCount: box.itemCount + 1 }
          : box
      );
      
      set({
        items: newItems,
        boxes: newBoxes
      });
      
      // 立即同步存储
      await syncStorageToIPCImmediately(newBoxes, newItems, currentState.activeBoxId);
      
      emitBoxFloatItemsReload(fromBox);
      emitBoxFloatItemsReload(boxId);
    }
  },
  
  reorderItems: (fromIndex, toIndex) => {
    const activeBoxId = get().activeBoxId;
    set((state) => {
      const boxItems = state.items.filter(item => item.boxId === activeBoxId);
      const otherItems = state.items.filter(item => item.boxId !== activeBoxId);

      if (fromIndex < 0 || fromIndex >= boxItems.length || toIndex < 0 || toIndex >= boxItems.length) {
        return state;
      }

      const newBoxItems = [...boxItems];
      const [movedItem] = newBoxItems.splice(fromIndex, 1);
      newBoxItems.splice(toIndex, 0, movedItem);
      
      const newItems = [...newBoxItems, ...otherItems];
      
      syncStorageToIPC(state.boxes, newItems, state.activeBoxId);

      return { items: newItems };
    });
    if (activeBoxId) {
      emitBoxFloatItemsReload(activeBoxId);
    }
  },

  updateItemName: (id, name) => {
    const prev = get().items.find((i) => i.id === id);
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, name } : item
      );
      
      syncStorageToIPC(state.boxes, newItems, state.activeBoxId);
      
      return { items: newItems };
    });
    if (prev) {
      emitBoxFloatItemsReload(prev.boxId);
    }
  },

  syncFromTauriStore: (data) => {
    set({
      boxes: data.boxes || [],
      items: data.items || [],
      activeBoxId: data.activeBoxId || null,
      orphanBoxFloats: Array.isArray(data.orphanBoxFloats) ? data.orphanBoxFloats : [],
    });
  },

  setBoxFloatWindowId: (boxId, floatWindowId) => {
    set((state) => ({
      boxes: state.boxes.map((b) => {
        if (b.id !== boxId) return b
        if (floatWindowId == null) {
          const { floatWindowId: _drop, ...rest } = b
          return rest as Box
        }
        return { ...b, floatWindowId }
      }),
    }))
  },
}));

export { useSettingsStore, useStorageStore };

export const useStore = () => {
  const settings = useSettingsStore();
  const storage = useStorageStore();
  
  return {
    ...settings,
    ...storage,
    syncStorageFromTauriStore: storage.syncFromTauriStore
  };
};
