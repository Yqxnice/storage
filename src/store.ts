import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 在渲染进程中使用 electron-store，降级到 localStorage
const storage = {
  getItem: async (name: string) => {
    try {
      if (!window.electron?.store) {
        console.log('[Storage] 使用 localStorage 作为降级方案');
        const item = localStorage.getItem(name);
        if (!item) return null;
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }
      const item = await window.electron.store.get(name);
      if (!item) return null;

      // 如果是字符串，尝试解析
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }

      // 如果已经是对象，直接返回
      return item;
    } catch (error) {
      console.error('Failed to get item from store:', error);
      return null;
    }
  },
  setItem: async (name: string, value: unknown) => {
    try {
      if (!window.electron?.store) {
        console.log('[Storage] 使用 localStorage 作为降级方案');
        localStorage.setItem(name, JSON.stringify(value));
        return;
      }
      await window.electron.store.set(name, value);
    } catch (error) {
      console.error('Failed to set item in store:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      if (!window.electron?.store) {
        console.log('[Storage] 使用 localStorage 作为降级方案');
        localStorage.removeItem(name);
        return;
      }
      await window.electron.store.delete(name);
    } catch (error) {
      console.error('Failed to remove item from store:', error);
    }
  }
};

export interface Box {
  id: string;
  name: string;
  itemCount: number;
}

export interface Item {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'icon';
  path: string;
  boxId: string;
  addedAt: number;
  tags: string[];
}

export interface AppState {
  // Box 相关
  boxes: Box[];
  activeBoxId: string | null;
  addBox: (name: string) => void;
  updateBox: (id: string, name: string) => void;
  deleteBox: (id: string) => void;
  setActiveBox: (id: string) => void;
  reorderBoxes: (fromIndex: number, toIndex: number) => void;
  
  // Item 相关
  items: Item[];
  addItem: (item: Omit<Item, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, boxId: string) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  addTagToItem: (id: string, tag: string) => void;
  removeTagFromItem: (id: string, tag: string) => void;
  updateItemName: (id: string, name: string) => void;
  
  // 视图相关
  viewMode: 'large' | 'small' | 'list';
  setViewMode: (mode: 'large' | 'small' | 'list') => void;
  
  // 系统托盘相关
  trayVisible: boolean;
  setTrayVisible: (visible: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Box 相关 - 初始为空，由主进程首次启动时填充
      boxes: [],
      activeBoxId: null,
      addBox: (name) => {
        const newBox = {
          id: crypto.randomUUID(),
          name,
          itemCount: 0
        };
        set((state) => ({
          boxes: [...state.boxes, newBox]
        }));
      },
      updateBox: (id, name) => {
        set((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === id ? { ...box, name } : box
          )
        }));
      },
      deleteBox: (id) => {
        set((state) => ({
          boxes: state.boxes.filter((box) => box.id !== id),
          items: state.items.filter((item) => item.boxId !== id),
          activeBoxId: state.activeBoxId === id ? (state.boxes.find((box) => box.id !== id)?.id || null) : state.activeBoxId
        }));
      },
      setActiveBox: (id) => {
        set({ activeBoxId: id });
      },
      reorderBoxes: (fromIndex, toIndex) => {
        set((state) => {
          if (fromIndex < 0 || fromIndex >= state.boxes.length || toIndex < 0 || toIndex >= state.boxes.length) {
            return state;
          }

          const newBoxes = [...state.boxes];
          const [movedBox] = newBoxes.splice(fromIndex, 1);
          newBoxes.splice(toIndex, 0, movedBox);

          return {
            boxes: newBoxes
          };
        });
      },
      
      // Item 相关 - 初始为空，由主进程首次启动时填充
      items: [],
      addItem: (item) => {
        console.log('[Store] addItem called with:', item)
        // 检查是否已经存在相同路径的文件
        const existingItem = get().items.find(i => i.path === item.path);
        if (existingItem) {
          console.log('[Store] 文件已存在，跳过添加:', item.path)
          return; // 已存在，不添加
        }

        const newItem = {
          ...item,
          id: crypto.randomUUID(),
          addedAt: Date.now()
        };
        console.log('[Store] 添加新文件:', newItem)
        set((state) => ({
          items: [...state.items, newItem],
          boxes: state.boxes.map((box) =>
            box.id === item.boxId ? { ...box, itemCount: box.itemCount + 1 } : box
          )
        }));
      },
      removeItem: (id) => {
        const item = get().items.find((item) => item.id === id);
        if (item) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            boxes: state.boxes.map((box) =>
              box.id === item.boxId ? { ...box, itemCount: box.itemCount - 1 } : box
            )
          }));
        }
      },
      moveItem: (id, boxId) => {
        const item = get().items.find((item) => item.id === id);
        if (item) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, boxId } : item
            ),
            boxes: state.boxes.map((box) =>
              box.id === item.boxId
                ? { ...box, itemCount: box.itemCount - 1 }
                : box.id === boxId
                ? { ...box, itemCount: box.itemCount + 1 }
                : box
            )
          }));
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

          return {
            items: [...newBoxItems, ...otherItems]
          };
        });
      },
      addTagToItem: (id, tag) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && !item.tags.includes(tag)
              ? { ...item, tags: [...item.tags, tag] }
              : item
          )
        }));
      },
      removeTagFromItem: (id, tag) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, tags: item.tags.filter((t) => t !== tag) }
              : item
          )
        }));
      },
      updateItemName: (id, name) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, name } : item
          )
        }));
      },
      
      // 视图相关
      viewMode: 'large',
      setViewMode: (mode) => {
        set({ viewMode: mode });
      },
      
      // 系统托盘相关
      trayVisible: true,
      setTrayVisible: (visible) => {
        set({ trayVisible: visible });
      }
    }),
    {
      name: 'desk-organizer-storage',
      storage: createJSONStorage(() => storage)
    }
  )
);
