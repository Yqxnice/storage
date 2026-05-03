// 存储相关类型定义

export interface Box {
  id: string;
  name: string;
  itemCount: number;
  createdAt: number;
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
}

export interface OrphanBoxFloat {
  floatWindowId: string;
  title: string;
}

export interface StorageData {
  boxes: Box[];
  items: Item[];
  activeBoxId: string | null;
  orphanBoxFloats: OrphanBoxFloat[];
}
