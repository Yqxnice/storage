import { emit, listen } from '@tauri-apps/api/event';
import { tauriIPC } from './tauri-ipc';
import type { Box, Item, OrphanBoxFloat, BoxGroup } from '../types';

export interface StorageData {
  boxes: Box[];
  items: Item[];
  activeBoxId: string | null;
  orphanBoxFloats: OrphanBoxFloat[];
  groups: BoxGroup[];
  version: number;
}

export type StorageUpdate = 
  | { type: 'addBox'; payload: Omit<Box, 'id' | 'createdAt' | 'itemCount'> }
  | { type: 'updateBox'; payload: { id: string; updates: Partial<Box> } }
  | { type: 'deleteBox'; payload: { id: string } }
  | { type: 'addItem'; payload: Omit<Item, 'id' | 'addedAt'> }
  | { type: 'removeItem'; payload: { id: string } }
  | { type: 'updateItem'; payload: { id: string; updates: Partial<Item> } }
  | { type: 'moveItem'; payload: { id: string; boxId: string } }
  | { type: 'reorderItems'; payload: { boxId: string; fromIndex: number; toIndex: number } }
  | { type: 'updateGroups'; payload: BoxGroup[] }
  | { type: 'reorderGroups'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'updateOrphans'; payload: OrphanBoxFloat[] }
  | { type: 'setActiveBox'; payload: { id: string | null } };

export const STORAGE_EVENTS = {
  SYNCED: 'storage-synced',
  ERROR: 'storage-error',
  CONFLICT: 'storage-conflict',
};

class StorageManager {
  private data: StorageData = {
    boxes: [],
    items: [],
    activeBoxId: null,
    orphanBoxFloats: [],
    groups: [],
    version: 0,
  };

  private queue: Array<{
    update: StorageUpdate;
    resolve: (data: StorageData) => void;
    reject: (error: Error) => void;
  }> = [];

  private isProcessing = false;
  private listeners = new Set<(data: StorageData) => void>();
  private debounceTimer: number | null = null;
  private isInitialized = false;

  private async loadFromBackend(): Promise<void> {
    try {
      const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' });
      if (raw && typeof raw === 'object') {
        const backendVersion = (raw as StorageData).version || 0;
        
        if (backendVersion > this.data.version) {
          void emit(STORAGE_EVENTS.CONFLICT, {
            localVersion: this.data.version,
            backendVersion,
            timestamp: Date.now(),
          });
        }

        this.data = {
          boxes: (raw as StorageData).boxes || [],
          items: (raw as StorageData).items || [],
          activeBoxId: (raw as StorageData).activeBoxId || null,
          orphanBoxFloats: (raw as StorageData).orphanBoxFloats || [],
          groups: (raw as StorageData).groups || [],
          version: backendVersion,
        };
      }
    } catch (error) {
      console.error('Failed to load storage:', error);
      void emit(STORAGE_EVENTS.ERROR, {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      });
    }
  }

  private async writeToBackend(): Promise<void> {
    try {
      await tauriIPC.store.set({
        key: 'storage',
        value: this.data,
        storeType: 'storage',
      });
    } catch (error) {
      console.error('Failed to write storage:', error);
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const maxRetries = 3;

    try {
      while (this.queue.length > 0) {
        const { update, resolve, reject } = this.queue.shift()!;
        let retries = 0;

        while (retries < maxRetries) {
          try {
            this.applyUpdate(update);
            await this.writeToBackend();
            this.notifyListeners();
            this.debouncedNotify();
            resolve({ ...this.data });
            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              void emit(STORAGE_EVENTS.ERROR, {
                error: error instanceof Error ? error.message : String(error),
                update,
                timestamp: Date.now(),
              });
              reject(error instanceof Error ? error : new Error(String(error)));
              break;
            }
            await new Promise(r => setTimeout(r, Math.pow(2, retries) * 100));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private applyUpdate(update: StorageUpdate): void {
    switch (update.type) {
      case 'addBox': {
        // 检查同一分组下是否有重名的收纳盒
        const { name, groupId } = update.payload;
        const isDuplicate = this.data.boxes.some(box => 
          box.name === name && box.groupId === groupId
        );
        if (isDuplicate) {
          throw new Error(`同一${groupId ? '分组' : '区域'}下已存在名为"${name}"的收纳盒`);
        }

        this.data.version += 1;
        const newBox: Box = {
          ...update.payload,
          id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
          createdAt: Date.now(),
          itemCount: 0,
        };
        this.data.boxes = [...this.data.boxes, newBox];

        if (update.payload.groupId) {
          this.data.groups = this.data.groups.map(group =>
            group.id === update.payload.groupId
              ? { ...group, boxIds: [...group.boxIds, newBox.id] }
              : group
          );
        }
        break;
      }

      case 'updateBox': {
        const { id, updates } = update.payload;
        const box = this.data.boxes.find(b => b.id === id);
        
        if (!box) break;

        // 如果更新了名称或分组，检查重名
        const newName = updates.name !== undefined ? updates.name : box.name;
        const newGroupId = updates.groupId !== undefined ? updates.groupId : box.groupId;
        
        if (updates.name !== undefined || updates.groupId !== undefined) {
          const isDuplicate = this.data.boxes.some(b => 
            b.id !== id && b.name === newName && b.groupId === newGroupId
          );
          if (isDuplicate) {
            throw new Error(`同一${newGroupId ? '分组' : '区域'}下已存在名为"${newName}"的收纳盒`);
          }
        }

        this.data.version += 1;
        this.data.boxes = this.data.boxes.map(b =>
          b.id === id
            ? { ...b, ...updates }
            : b
        );
        break;
      }

      case 'deleteBox': {
        this.data.version += 1;
        const boxToDelete = this.data.boxes.find(b => b.id === update.payload.id);
        const floatWindowId = boxToDelete?.floatWindowId;

        this.data.boxes = this.data.boxes.filter(box => box.id !== update.payload.id);
        this.data.items = this.data.items.filter(item => item.boxId !== update.payload.id);
        this.data.groups = this.data.groups.map(group => ({
          ...group,
          boxIds: group.boxIds.filter(id => id !== update.payload.id),
        }));

        if (this.data.activeBoxId === update.payload.id) {
          this.data.activeBoxId = this.data.boxes[0]?.id || null;
        }

        if (floatWindowId) {
          this.data.orphanBoxFloats = this.data.orphanBoxFloats.filter(
            o => o.floatWindowId !== floatWindowId
          );
        }
        break;
      }

      case 'addItem': {
        console.log('[storage-manager applyUpdate addItem] 开始处理:', update.payload.name);
        console.log('[storage-manager applyUpdate addItem] 当前 items 数量:', this.data.items.length);
        
        console.log('[storage-manager applyUpdate addItem] 检查重复 - payload:', {
          name: update.payload.name,
          path: update.payload.path,
          boxId: update.payload.boxId,
          url: update.payload.url
        });
        
        if (this.data.items.length > 0) {
          console.log('[storage-manager applyUpdate addItem] 现有项目:', this.data.items.map(i => ({
            name: i.name,
            path: i.path,
            boxId: i.boxId,
            url: i.url
          })));
        }
        
        const existing = this.data.items.find(i => {
          if (update.payload.path && i.path && i.boxId === update.payload.boxId) {
            return i.path === update.payload.path;
          }
          if (update.payload.url && i.url && i.boxId === update.payload.boxId) {
            return i.url === update.payload.url;
          }
          return false;
        });
        
        if (existing) {
          console.log('[storage-manager applyUpdate addItem] 项目已存在，跳过:', update.payload.name);
          console.log('[storage-manager applyUpdate addItem] 匹配的现有项目:', {
            name: existing.name,
            path: existing.path,
            boxId: existing.boxId
          });
          return;
        }

        this.data.version += 1;
        console.log('[storage-manager applyUpdate addItem] 版本号递增:', this.data.version);
        
        const newItem: Item = {
          ...update.payload,
          id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
          addedAt: Date.now(),
          clickCount: 0,
        };

        this.data.items = [...this.data.items, newItem];
        console.log('[storage-manager applyUpdate addItem] 添加后 items 数量:', this.data.items.length);
        
        this.data.boxes = this.data.boxes.map(box =>
          box.id === update.payload.boxId
            ? { ...box, itemCount: box.itemCount + 1 }
            : box
        );
        break;
      }

      case 'removeItem': {
        const item = this.data.items.find(i => i.id === update.payload.id);
        if (!item) return;

        this.data.version += 1;
        this.data.items = this.data.items.filter(i => i.id !== update.payload.id);
        this.data.boxes = this.data.boxes.map(box =>
          box.id === item.boxId
            ? { ...box, itemCount: Math.max(0, box.itemCount - 1) }
            : box
        );
        break;
      }

      case 'updateItem': {
        this.data.version += 1;
        this.data.items = this.data.items.map(item =>
          item.id === update.payload.id
            ? { ...item, ...update.payload.updates }
            : item
        );
        break;
      }

      case 'moveItem': {
        const item = this.data.items.find(i => i.id === update.payload.id);
        if (!item) return;

        this.data.version += 1;
        const oldBoxId = item.boxId;
        const newBoxId = update.payload.boxId;

        this.data.items = this.data.items.map(i =>
          i.id === update.payload.id ? { ...i, boxId: newBoxId } : i
        );

        this.data.boxes = this.data.boxes.map(box => {
          if (box.id === oldBoxId) {
            return { ...box, itemCount: Math.max(0, box.itemCount - 1) };
          }
          if (box.id === newBoxId) {
            return { ...box, itemCount: box.itemCount + 1 };
          }
          return box;
        });
        break;
      }

      case 'reorderItems': {
        const { boxId, fromIndex, toIndex } = update.payload;
        const boxItems = this.data.items.filter(i => i.boxId === boxId);
        const otherItems = this.data.items.filter(i => i.boxId !== boxId);

        if (fromIndex < 0 || fromIndex >= boxItems.length || toIndex < 0 || toIndex >= boxItems.length) {
          return;
        }

        this.data.version += 1;
        const newBoxItems = [...boxItems];
        const [moved] = newBoxItems.splice(fromIndex, 1);
        newBoxItems.splice(toIndex, 0, moved);

        const updatedItems = newBoxItems.map((item, index) => ({
          ...item,
          order: index,
        }));

        this.data.items = [...updatedItems, ...otherItems];
        break;
      }

      case 'reorderGroups': {
        const { fromIndex, toIndex } = update.payload;

        if (fromIndex < 0 || fromIndex >= this.data.groups.length || toIndex < 0 || toIndex >= this.data.groups.length) {
          return;
        }

        this.data.version += 1;
        const newGroups = [...this.data.groups];
        const [movedGroup] = newGroups.splice(fromIndex, 1);
        newGroups.splice(toIndex, 0, movedGroup);

        const updatedGroups = newGroups.map((group, index) => ({
          ...group,
          order: index,
        }));

        this.data.groups = updatedGroups;
        break;
      }

      case 'updateGroups': {
        this.data.version += 1;
        this.data.groups = update.payload;
        break;
      }

      case 'updateOrphans': {
        this.data.version += 1;
        this.data.orphanBoxFloats = update.payload;
        break;
      }

      case 'setActiveBox': {
        this.data.version += 1;
        this.data.activeBoxId = update.payload.id;
        break;
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.data }));
  }

  private debouncedNotify(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      void emit(STORAGE_EVENTS.SYNCED, { ...this.data });
      this.debounceTimer = null;
    }, 50);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadFromBackend();
    this.isInitialized = true;
    this.notifyListeners();
    this.debouncedNotify();
  }

  public async update(update: StorageUpdate): Promise<StorageData> {
    return new Promise((resolve, reject) => {
      this.queue.push({ update, resolve, reject });
      void this.processQueue();
    });
  }

  public getState(): StorageData {
    return { ...this.data };
  }

  public subscribe(listener: (data: StorageData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async syncFromBackend(): Promise<void> {
    await this.loadFromBackend();
    this.notifyListeners();
    this.debouncedNotify();
  }

  public isProcessingQueue(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public async resetToEmpty(): Promise<void> {
    this.data = {
      boxes: [],
      items: [],
      activeBoxId: null,
      orphanBoxFloats: [],
      groups: [],
      version: 0,
    };
    await this.writeToBackend();
    this.notifyListeners();
    this.debouncedNotify();
  }

  public async resetWithDefaultBox(): Promise<string> {
    const desktopBoxId = crypto.randomUUID().replace(/-/g, '').substring(0, 6);
    this.data = {
      boxes: [{
        id: desktopBoxId,
        name: '桌面收纳盒',
        itemCount: 0,
        createdAt: Date.now(),
        floatWindowId: null,
      }],
      items: [],
      activeBoxId: desktopBoxId,
      orphanBoxFloats: [],
      groups: [],
      version: 0,
    };
    await this.writeToBackend();
    this.notifyListeners();
    this.debouncedNotify();
    return desktopBoxId;
  }
}

export const storageManager = new StorageManager();

export const useStorageSync = () => {
  const subscribeToStorage = (callback: (data: StorageData) => void) => {
    return storageManager.subscribe(callback);
  };

  const getStorageState = () => storageManager.getState();

  const updateStorage = (update: StorageUpdate) => storageManager.update(update);

  const initStorage = () => storageManager.init();

  const syncStorage = () => storageManager.syncFromBackend();

  return {
    subscribeToStorage,
    getStorageState,
    updateStorage,
    initStorage,
    syncStorage,
  };
};