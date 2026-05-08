import { create } from 'zustand';
import { applyTheme, applyTimeTheme } from './utils/theme';
import { tauriIPC } from './utils/tauri-ipc';
import { showMessage } from './components/common';
import { emitBoxFloatItemsReload } from './utils/box-float-notify';
import { destroyBoxFloatWebviews } from './utils/box-float-destroy';
import { logDebug, logInfo, logError } from './utils/logger';
import { emit } from '@tauri-apps/api/event';
import { storageManager} from './utils/storage-manager';
import type { Box, Item, BoxGroup, OrphanBoxFloat } from './types';
import type { SettingsState } from './types/settings';

let isStorageInitialized = false;

const log = async (level: string, message: string) => {
  if (typeof window !== 'undefined' && isStorageInitialized) {
    await tauriIPC.logger.writeLog(level, message);
  }
};

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

const SETTINGS_BACKUP_DEBOUNCE = 2000;
let settingsBackupTimer: number | null = null;

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



interface StorageState {
  boxes: Box[];
  items: Item[];
  activeBoxId: string | null;
  orphanBoxFloats: OrphanBoxFloat[];
  groups: BoxGroup[];
  addBox: (name: string, groupId?: string) => Promise<string>;
  updateBox: (id: string, updates: Partial<Pick<Box, 'name' | 'color' | 'groupId'>>) => Promise<void>;
  deleteBox: (id: string) => Promise<void>;
  setActiveBox: (id: string) => Promise<void>;
  reorderBoxes: (fromIndex: number, toIndex: number) => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'addedAt'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  moveItem: (id: string, boxId: string) => Promise<void>;
  reorderItems: (boxId: string, fromIndex: number, toIndex: number) => Promise<void>;
  updateItemName: (id: string, name: string) => Promise<void>;
  updateItemOrder: (id: string, order: number) => Promise<void>;
  incrementClickCount: (id: string) => Promise<void>;
  syncFromTauriStore: (data: {
    boxes: Box[];
    items: Item[];
    activeBoxId: string | null;
    orphanBoxFloats?: OrphanBoxFloat[];
    groups?: BoxGroup[];
  }) => void;
  setBoxFloatWindowId: (boxId: string, floatWindowId: string | null) => Promise<void>;
  addOrphanBoxFloat: (row: OrphanBoxFloat) => Promise<void>;
  removeOrphanBoxFloat: (floatWindowId: string) => Promise<void>;
  setBoxColor: (boxId: string, color: string) => Promise<void>;
  
  addGroup: (name: string) => Promise<string>;
  updateGroup: (id: string, updates: Partial<BoxGroup>) => Promise<void>;
  deleteGroup: (id: string, moveBoxesTo?: string) => Promise<void>;
  moveBoxToGroup: (boxId: string, groupId?: string) => Promise<void>;
  toggleGroupCollapse: (groupId: string) => Promise<void>;
  reorderGroups: (fromIndex: number, toIndex: number) => Promise<void>;
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
      }).then(() => {});
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
  
  fileWatchEnabled: false,
  fileWatchPaths: [],
  fileWatchIgnorePatterns: ['node_modules', '.git'],
  fileWatchDebounceDelay: 500,
  
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

  setFileWatchEnabled: async (enabled) => {
    set({ fileWatchEnabled: enabled });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'fileWatchEnabled',
        value: enabled,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 fileWatchEnabled 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
      
      if (enabled) {
        await tauriIPC.fileWatch.start();
      } else {
        await tauriIPC.fileWatch.stop();
      }
    }
  },

  setFileWatchPaths: (paths) => {
    set({ fileWatchPaths: paths });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'fileWatchPaths',
        value: paths,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 fileWatchPaths 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  setFileWatchIgnorePatterns: (patterns) => {
    set({ fileWatchIgnorePatterns: patterns });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'fileWatchIgnorePatterns',
        value: patterns,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 fileWatchIgnorePatterns 失败: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  },

  setFileWatchDebounceDelay: (delay) => {
    set({ fileWatchDebounceDelay: delay });
    if (isStorageInitialized) {
      debouncedSettingsBackup();
      tauriIPC.store.set({
        key: 'fileWatchDebounceDelay',
        value: delay,
        storeType: 'settings'
      }).catch(async (error) => {
        await log('ERROR', `保存设置 fileWatchDebounceDelay 失败: ${error instanceof Error ? error.message : String(error)}`);
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
  createAutoBackup: async (backupType: string) => {
    try {
      if (getIsResetting()) {
        logDebug(`正在重置操作，跳过备份: ${backupType}`);
        return;
      }
      await tauriIPC.backup.createBackup(backupType);
      logInfo(`自动备份成功: ${backupType}`);
    } catch (error) {
      logError(`自动备份失败 (${backupType}):`, error);
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
    if (isStorageInitialized) {
      useSettingsStore.getState().createAutoBackup('settings_only');
    }
    set({ logAutoCleanupDays: days });
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
    const originalIsStorageInitialized = isStorageInitialized;
    
    try {
      if (originalIsStorageInitialized) {
        await useSettingsStore.getState().createAutoBackup('pre_reset_settings');
      }
      
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
        scanHiddenFiles: false,
        fileWatchEnabled: false,
        fileWatchPaths: [],
        fileWatchIgnorePatterns: ['node_modules', '.git'],
        fileWatchDebounceDelay: 500
      };
      
      set(defaultSettings);
      document.documentElement.setAttribute('data-theme', 'blue');
      
      if (originalIsStorageInitialized) {
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
      isStorageInitialized = originalIsStorageInitialized;
    }
  },

  clearAllData: async (option: 'storage' | 'all' = 'all') => {
    const originalIsStorageInitialized = isStorageInitialized;
    
    try {
      if (originalIsStorageInitialized) {
        if (option === 'all') {
          await useSettingsStore.getState().createAutoBackup('pre_clear_all');
        } else {
          await useSettingsStore.getState().createAutoBackup('pre_clear_storage');
        }
      }
      
      isStorageInitialized = false;
      
      if (option === 'all') {
        const hasShownBefore = await tauriIPC.store.get({ 
          key: 'hasShownWelcome', 
          storeType: 'settings' 
        }).catch(() => null);
        
        await tauriIPC.store.clear('settings');
        
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
          scanHiddenFiles: false,
          fileWatchEnabled: false,
          fileWatchPaths: [],
          fileWatchIgnorePatterns: ['node_modules', '.git'],
          fileWatchDebounceDelay: 500
        };
        
        for (const [key, value] of Object.entries(defaultSettings)) {
          await tauriIPC.store.set({
            key,
            value,
            storeType: 'settings'
          });
        }
        
        await tauriIPC.store.set({ 
          key: 'hasInitialized', 
          value: true, 
          storeType: 'settings' 
        });
        
        if (hasShownBefore !== null) {
          await tauriIPC.store.set({ 
            key: 'hasShownWelcome', 
            value: hasShownBefore, 
            storeType: 'settings' 
          });
        }
        
        await storageManager.resetToEmpty();
        
        useSettingsStore.setState(defaultSettings);
        
        document.documentElement.setAttribute('data-theme', 'blue');
        
        showMessage.success('全部数据已重置');
        
        setIsResetting(true);
        window.location.reload();
      } else {
        await storageManager.resetToEmpty();
        
        showMessage.success('收纳盒数据已重置');
      }
    } catch (error) {
      showMessage.error('重置数据失败: ' + error);
    } finally {
      isStorageInitialized = originalIsStorageInitialized;
    }
  },

}));

const useStorageStore = create<StorageState>()((set, get) => {
  const syncStateFromManager = (data: ReturnType<typeof storageManager.getState>) => {
    set({
      boxes: data.boxes,
      items: data.items,
      activeBoxId: data.activeBoxId,
      orphanBoxFloats: data.orphanBoxFloats,
      groups: data.groups,
    });
  };

  storageManager.subscribe(syncStateFromManager);

  return {
    boxes: [],
    items: [],
    activeBoxId: null,
    orphanBoxFloats: [],
    groups: [],

    addOrphanBoxFloat: async (row) => {
      const currentState = get();
      const nextOrphans = [...currentState.orphanBoxFloats.filter((o) => o.floatWindowId !== row.floatWindowId), row];
      await storageManager.update({
        type: 'updateOrphans',
        payload: nextOrphans,
      });
    },

    removeOrphanBoxFloat: async (floatWindowId) => {
      const currentState = get();
      const nextOrphans = currentState.orphanBoxFloats.filter((o) => o.floatWindowId !== floatWindowId);
      await storageManager.update({
        type: 'updateOrphans',
        payload: nextOrphans,
      });
    },
    
    addBox: async (name, groupId) => {
      const result = await storageManager.update({
        type: 'addBox',
        payload: { name, groupId },
      });
      const newBox = result.boxes[result.boxes.length - 1];
      return newBox.id;
    },

    updateBox: async (id, updates) => {
      await storageManager.update({
        type: 'updateBox',
        payload: { id, updates },
      });
    },

    setBoxColor: async (boxId, color) => {
      await storageManager.update({
        type: 'updateBox',
        payload: { id: boxId, updates: { color } },
      });
      await emit('box-float-storage-updated', { boxId });
    },

    deleteBox: async (id) => {
      if (isStorageInitialized) {
        useSettingsStore.getState().createAutoBackup('pre_delete_box');
      }
      
      const floatFid = get().boxes.find((b) => b.id === id)?.floatWindowId;
      
      await storageManager.update({
        type: 'deleteBox',
        payload: { id },
      });

      if (floatFid) {
        try {
          await destroyBoxFloatWebviews(floatFid);
        } catch {
        }
      }
    },
    
    setActiveBox: async (id) => {
      await storageManager.update({
        type: 'setActiveBox',
        payload: { id },
      });
    },
    
    reorderBoxes: async (fromIndex, toIndex) => {
      logDebug('[拖拽] 开始重新排序收纳盒:', fromIndex, '->', toIndex);
      const state = get();
      
      if (fromIndex < 0 || fromIndex >= state.boxes.length || toIndex < 0 || toIndex >= state.boxes.length) {
        logDebug('[拖拽] 索引无效，跳过排序');
        return;
      }

      logDebug('[拖拽] 原收纳盒顺序:', state.boxes.map(box => box.name));
      const newBoxes = [...state.boxes];
      const [movedBox] = newBoxes.splice(fromIndex, 1);
      newBoxes.splice(toIndex, 0, movedBox);
      logDebug('[拖拽] 新收纳盒顺序:', newBoxes.map(box => box.name));

      await storageManager.update({
        type: 'updateBox',
        payload: { id: movedBox.id, updates: {} },
      });
    },
    
    addItem: async (item) => {
      console.log('[store.ts addItem] 开始处理项目:', item.name);
      
      const storageData = storageManager.getState();
      console.log('[store.ts addItem] storageManager 当前项目数量:', storageData.items.length);
      
      const existingItem = storageData.items.find(i => {
        if (item.path && i.path && i.boxId === item.boxId) {
          return i.path === item.path;
        }
        if (item.url && i.url && i.boxId === item.boxId) {
          return i.url === item.url;
        }
        return false;
      });

      if (existingItem) {
        console.log('[store.ts addItem] 项目已存在，跳过:', item.name);
        return;
      }

      console.log('[store.ts addItem] 调用 storageManager.update:', item.name);
      await storageManager.update({
        type: 'addItem',
        payload: item,
      });

      const afterData = storageManager.getState();
      console.log('[store.ts addItem] storageManager 更新后项目数量:', afterData.items.length);
      
      await emitBoxFloatItemsReload(item.boxId);
    },
    
    incrementClickCount: async (id) => {
      await storageManager.update({
        type: 'updateItem',
        payload: { 
          id, 
          updates: { clickCount: (get().items.find(i => i.id === id)?.clickCount || 0) + 1 } 
        },
      });
    },
    
    removeItem: async (id) => {
      const target = get().items.find((i) => i.id === id);
      if (!target) return;

      if (isStorageInitialized) {
        const backupType = target.category === 'web' ? 'pre_delete_link' : 'pre_delete_item';
        useSettingsStore.getState().createAutoBackup(backupType);
      }
      
      const boxId = target.boxId;
      
      await storageManager.update({
        type: 'removeItem',
        payload: { id },
      });
      
      await emitBoxFloatItemsReload(boxId);
    },
    
    moveItem: async (id, boxId) => {
      const moved = get().items.find((i) => i.id === id);
      if (!moved) return;
      
      const fromBox = moved.boxId;
      
      await storageManager.update({
        type: 'moveItem',
        payload: { id, boxId },
      });
      
      await emitBoxFloatItemsReload(fromBox);
      await emitBoxFloatItemsReload(boxId);
    },
    
    reorderItems: async (boxId, fromIndex, toIndex) => {
      console.log('[Store] reorderItems 被调用', { boxId, fromIndex, toIndex });
      
      await storageManager.update({
        type: 'reorderItems',
        payload: { boxId, fromIndex, toIndex },
      });
      
      await emitBoxFloatItemsReload(boxId);
    },

    updateItemName: async (id, name) => {
      const prev = get().items.find((i) => i.id === id);
      
      await storageManager.update({
        type: 'updateItem',
        payload: { id, updates: { name } },
      });
      
      if (prev) {
        await emitBoxFloatItemsReload(prev.boxId);
      }
    },

    updateItemOrder: async (id, order) => {
      const prev = get().items.find((i) => i.id === id);
      
      await storageManager.update({
        type: 'updateItem',
        payload: { id, updates: { order } },
      });
      
      if (prev) {
        await emitBoxFloatItemsReload(prev.boxId);
      }
    },

    syncFromTauriStore: (data) => {
      set({
        boxes: data.boxes || [],
        items: data.items || [],
        activeBoxId: data.activeBoxId || null,
        orphanBoxFloats: Array.isArray(data.orphanBoxFloats) ? data.orphanBoxFloats : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
      });
    },

    setBoxFloatWindowId: async (boxId, floatWindowId) => {
      await storageManager.update({
        type: 'updateBox',
        payload: { id: boxId, updates: { floatWindowId } },
      });
    },

    addGroup: async (name) => {
      const currentState = get();
      const newGroup: BoxGroup = {
        id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
        name,
        order: currentState.groups.length,
        collapsed: false,
        boxIds: []
      };
      
      const newGroups = [...currentState.groups, newGroup];
      await storageManager.update({
        type: 'updateGroups',
        payload: newGroups,
      });
      
      return newGroup.id;
    },

    updateGroup: async (id, updates) => {
      const currentState = get();
      const newGroups = currentState.groups.map(group =>
        group.id === id ? { ...group, ...updates } : group
      );
      await storageManager.update({
        type: 'updateGroups',
        payload: newGroups,
      });
    },

    deleteGroup: async (id, moveBoxesTo) => {
      const currentState = get();
      const groupToDelete = currentState.groups.find(g => g.id === id);
      let newBoxes = currentState.boxes;
      let newGroups = currentState.groups.filter(g => g.id !== id);
      
      if (groupToDelete && moveBoxesTo) {
        newBoxes = currentState.boxes.map(box => 
          groupToDelete.boxIds.includes(box.id) 
            ? { ...box, groupId: moveBoxesTo } 
            : box
        );
        newGroups = newGroups.map(group => 
          group.id === moveBoxesTo
            ? { ...group, boxIds: [...group.boxIds, ...groupToDelete.boxIds] }
            : group
        );
      } else if (groupToDelete) {
        newBoxes = currentState.boxes.map(box => 
          groupToDelete.boxIds.includes(box.id) 
            ? { ...box, groupId: undefined } 
            : box
        );
      }
      
      await storageManager.update({
        type: 'updateGroups',
        payload: newGroups,
      });
    },

    moveBoxToGroup: (() => {
      const processingBoxes = new Set<string>();
      
      return async (boxId: string, groupId?: string) => {
        if (processingBoxes.has(boxId)) {
          return;
        }
        
        const currentState = get();
        const box = currentState.boxes.find(b => b.id === boxId);
        if (!box) return;
        
        const oldGroupId = box.groupId;
        
        if (oldGroupId === groupId) {
          return;
        }
        
        processingBoxes.add(boxId);
        
        try {
          let newGroups = currentState.groups.map(group => {
            if (group.id === oldGroupId) {
              return { ...group, boxIds: group.boxIds.filter(id => id !== boxId) };
            }
            if (group.id === groupId) {
              return { ...group, boxIds: [...group.boxIds, boxId] };
            }
            return group;
          });
          
          const newBoxes = currentState.boxes.map(b => 
            b.id === boxId ? { ...b, groupId } : b
          );
          
          set({ groups: newGroups, boxes: newBoxes });
          
          await storageManager.update({
            type: 'updateGroups',
            payload: newGroups,
          });
          
          await storageManager.update({
            type: 'updateBox',
            payload: { id: boxId, updates: { groupId } },
          });
        } catch (error) {
          console.error('[moveBoxToGroup] Error:', error);
        } finally {
          processingBoxes.delete(boxId);
        }
      };
    })(),

    toggleGroupCollapse: async (groupId) => {
      const currentState = get();
      const newGroups = currentState.groups.map(group =>
        group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
      );
      await storageManager.update({
        type: 'updateGroups',
        payload: newGroups,
      });
    },

    reorderGroups: async (fromIndex, toIndex) => {
      logDebug('[拖拽] 开始重新排序分组:', fromIndex, '->', toIndex);
      await storageManager.update({
        type: 'reorderGroups',
        payload: { fromIndex, toIndex },
      });
    },
  };
});

export { useSettingsStore, useStorageStore };
export type { SettingsState } from './types/settings';

export const useStore = () => {
  const settings = useSettingsStore();
  const storage = useStorageStore();
  
  return {
    ...settings,
    ...storage,
    syncStorageFromTauriStore: storage.syncFromTauriStore
  };
};

export const initStorageManager = async () => {
  await storageManager.init();
};