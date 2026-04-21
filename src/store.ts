import { create } from 'zustand';
import { applyTheme, applyTimeTheme } from './utils/theme';

export interface Box {
  id: string;
  name: string;
  itemCount: number;
  createdAt: number;
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
  createBackup: () => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  cleanupBackups: () => Promise<void>;
  clearLogs: () => Promise<void>;
  syncSettingsFromElectronStore: (data: Partial<SettingsState>) => void;
  resetSettings: () => void;
  clearAllData: () => void;
}

interface StorageState {
  boxes: Box[];
  items: Item[];
  activeBoxId: string | null;
  addBox: (name: string) => void;
  updateBox: (id: string, name: string) => void;
  deleteBox: (id: string) => void;
  setActiveBox: (id: string) => void;
  reorderBoxes: (fromIndex: number, toIndex: number) => void;
  addItem: (item: Omit<Item, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, boxId: string) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  updateItemName: (id: string, name: string) => void;
  incrementClickCount: (id: string) => void;
  syncFromElectronStore: (data: { boxes: Box[]; items: Item[]; activeBoxId: string | null }) => void;
}

export interface AppState extends SettingsState, StorageState {}

const useSettingsStore = create<SettingsState>()((set) => ({
  viewMode: 'large',
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  trayVisible: true,
  setTrayVisible: (visible) => {
    set({ trayVisible: visible });
  },

  shortcuts: {
    toggleApp: 'Ctrl+Shift+Space'
  },
  setShortcuts: (shortcuts) => {
    set({ shortcuts });
  },

  theme: 'blue',
  timeThemeEnabled: false,
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
  setTimeThemeEnabled: (enabled) => {
    set((state) => {
      const newTheme = applyTimeTheme(enabled, state.theme);
      return {
        timeThemeEnabled: enabled,
        theme: enabled ? newTheme : state.theme
      };
    });
  },

  sortByClickCount: true,
  setSortByClickCount: (value) => {
    set({ sortByClickCount: value });
  },

  startOnBoot: true,
  startMinimized: false,
  minimizeOnClose: true,
  autoScanDesktop: true,
  handleInvalidMappings: true,
  autoBackupInterval: '10min',
  logAutoCleanupDays: '2',
  
  setStartOnBoot: (value) => {
    set({ startOnBoot: value });
  },
  setStartMinimized: (value) => {
    set({ startMinimized: value });
  },
  setMinimizeOnClose: (value) => {
    set({ minimizeOnClose: value });
  },
  setAutoScanDesktop: (value) => {
    set({ autoScanDesktop: value });
  },
  setHandleInvalidMappings: (value) => {
    set({ handleInvalidMappings: value });
  },
  setAutoBackupInterval: (interval) => {
    set({ autoBackupInterval: interval });
    if (window.electron && window.electron.store) {
      window.electron.store.set({
        key: 'autoBackupInterval',
        value: interval,
        storeType: 'settings'
      });
    }
    if (window.electron && window.electron.backup) {
      window.electron.backup.setAutoBackupInterval(interval);
    }
  },
  createBackup: async () => {
    if (window.electron && window.electron.backup) {
      try {
        await window.electron.backup.createBackup();
        window.alert('手动备份创建成功');
      } catch (error) {
        console.error('创建备份失败:', error);
        window.alert('创建备份失败: ' + error);
      }
    }
  },
  restoreBackup: async (backupId) => {
    if (window.electron && window.electron.backup) {
      try {
        await window.electron.backup.restoreBackup(backupId);
        window.alert('数据恢复成功');
        window.location.reload();
      } catch (error) {
        console.error('恢复备份失败:', error);
        window.alert('恢复备份失败: ' + error);
      }
    }
  },
  cleanupBackups: async () => {
    if (window.confirm('确定要清理所有备份文件吗？此操作不可恢复。')) {
      if (window.electron && window.electron.backup) {
        try {
          await window.electron.backup.cleanupBackups();
          window.alert('备份清理成功');
        } catch (error) {
          console.error('清理备份失败:', error);
          window.alert('清理备份失败: ' + error);
        }
      }
    }
  },
  setLogAutoCleanupDays: (days) => {
    set({ logAutoCleanupDays: days });
    if (window.electron && window.electron.store) {
      window.electron.store.set({
        key: 'logAutoCleanupDays',
        value: days,
        storeType: 'settings'
      });
    }
    if (window.electron && window.electron.logger) {
      window.electron.logger.setAutoCleanupDays(days);
    }
  },
  clearLogs: async () => {
    if (window.confirm('确定要清理所有日志文件吗？此操作不可恢复。')) {
      if (window.electron && window.electron.logger) {
        try {
          await window.electron.logger.clearLogs();
          window.alert('日志清理成功');
        } catch (error) {
          console.error('清理日志失败:', error);
          window.alert('清理日志失败: ' + error);
        }
      }
    }
  },

  syncSettingsFromElectronStore: (data) => {
    console.log('[Store] settings syncFromElectronStore:', data);
    set((state) => ({
      ...state,
      ...data
    }));
  },

  resetSettings: () => {
    set({
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
      logAutoCleanupDays: '2'
    });
    document.documentElement.setAttribute('data-theme', 'blue');
  },

  clearAllData: () => {
    if (window.electron && window.electron.store) {
      window.electron.store.delete({ key: 'storage', storeType: 'storage' });
    }
  }
}));

const useStorageStore = create<StorageState>()((set, get) => ({
  boxes: [],
  items: [],
  activeBoxId: null,
  
  addBox: (name) => {
    const newBox: Box = {
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      name,
      itemCount: 0,
      createdAt: Date.now()
    };
    set((state) => {
      const newBoxes = [...state.boxes, newBox];
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: newBoxes,
            items: state.items,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }
      
      return { boxes: newBoxes };
    });
  },
  
  updateBox: (id, name) => {
    set((state) => {
      const newBoxes = state.boxes.map((box) =>
        box.id === id ? { ...box, name } : box
      );
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: newBoxes,
            items: state.items,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }
      
      return { boxes: newBoxes };
    });
  },
  
  deleteBox: (id) => {
    set((state) => {
      const newBoxes = state.boxes.filter((box) => box.id !== id);
      const newItems = state.items.filter((item) => item.boxId !== id);
      const newActiveBoxId = state.activeBoxId === id 
        ? (newBoxes.find((box) => box.id !== id)?.id || null) 
        : state.activeBoxId;
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: newBoxes,
            items: newItems,
            activeBoxId: newActiveBoxId
          },
          storeType: 'storage'
        });
      }
      
      return {
        boxes: newBoxes,
        items: newItems,
        activeBoxId: newActiveBoxId
      };
    });
  },
  
  setActiveBox: (id) => {
    set((state) => {
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: state.boxes,
            items: state.items,
            activeBoxId: id
          },
          storeType: 'storage'
        });
      }
      
      return { activeBoxId: id };
    });
  },
  
  reorderBoxes: (fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex < 0 || fromIndex >= state.boxes.length || toIndex < 0 || toIndex >= state.boxes.length) {
        return state;
      }

      const newBoxes = [...state.boxes];
      const [movedBox] = newBoxes.splice(fromIndex, 1);
      newBoxes.splice(toIndex, 0, movedBox);
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: newBoxes,
            items: state.items,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }

      return { boxes: newBoxes };
    });
  },
  
  addItem: (item) => {
    console.log('[Store] addItem called with:', item);
    let existingItem;
    if (item.category === 'desktop' && item.path) {
      existingItem = get().items.find(i => i.path === item.path);
    } else if (item.category === 'web' && item.url) {
      existingItem = get().items.find(i => i.url === item.url);
    }
    if (existingItem) {
      console.log('[Store] 项目已存在，跳过添加:', item.path || item.url);
      return;
    }

    const newItem: Item = {
      ...item,
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      addedAt: Date.now(),
      clickCount: 0
    };
    console.log('[Store] 添加新文件:', newItem);
    
    set((state) => {
      const newItems = [...state.items, newItem];
      const newBoxes = state.boxes.map((box) =>
        box.id === item.boxId ? { ...box, itemCount: box.itemCount + 1 } : box
      );
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: newBoxes,
            items: newItems,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
        console.log('[Store] 保存到 electron-store 成功');
      }
      
      return {
        items: newItems,
        boxes: newBoxes
      };
    });
  },
  
  incrementClickCount: (id) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, clickCount: (item.clickCount || 0) + 1 } : item
      );
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: state.boxes,
            items: newItems,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }
      
      return { items: newItems };
    });
  },
  
  removeItem: (id) => {
    const item = get().items.find((item) => item.id === id);
    if (item) {
      set((state) => {
        const newItems = state.items.filter((item) => item.id !== id);
        const newBoxes = state.boxes.map((box) =>
          box.id === item.boxId ? { ...box, itemCount: box.itemCount - 1 } : box
        );
        
        if (window.electron && window.electron.store) {
          window.electron.store.set({
            key: 'storage',
            value: {
              boxes: newBoxes,
              items: newItems,
              activeBoxId: state.activeBoxId
            },
            storeType: 'storage'
          });
        }
        
        return {
          items: newItems,
          boxes: newBoxes
        };
      });
    }
  },
  
  moveItem: (id, boxId) => {
    const item = get().items.find((item) => item.id === id);
    if (item) {
      set((state) => {
        const newItems = state.items.map((item) =>
          item.id === id ? { ...item, boxId } : item
        );
        const newBoxes = state.boxes.map((box) =>
          box.id === item.boxId
            ? { ...box, itemCount: box.itemCount - 1 }
            : box.id === boxId
            ? { ...box, itemCount: box.itemCount + 1 }
            : box
        );
        
        if (window.electron && window.electron.store) {
          window.electron.store.set({
            key: 'storage',
            value: {
              boxes: newBoxes,
              items: newItems,
              activeBoxId: state.activeBoxId
            },
            storeType: 'storage'
          });
        }
        
        return {
          items: newItems,
          boxes: newBoxes
        };
      });
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
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: state.boxes,
            items: newItems,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }

      return { items: newItems };
    });
  },

  updateItemName: (id, name) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, name } : item
      );
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: 'storage',
          value: {
            boxes: state.boxes,
            items: newItems,
            activeBoxId: state.activeBoxId
          },
          storeType: 'storage'
        });
      }
      
      return { items: newItems };
    });
  },

  syncFromElectronStore: (data) => {
    console.log('[Store] syncFromElectronStore:', data);
    set({
      boxes: data.boxes || [],
      items: data.items || [],
      activeBoxId: data.activeBoxId || null
    });
  }
}));

export { useSettingsStore, useStorageStore };

export const useStore = () => {
  const settings = useSettingsStore();
  const storage = useStorageStore();
  
  return {
    ...settings,
    ...storage,
    syncStorageFromElectronStore: storage.syncFromElectronStore
  };
};
