// 存储相关类型定义

export interface Box {
  id: string;
  name: string;
  itemCount: number;
  createdAt: number;
  floatWindowId?: string;
  color?: string;
  groupId?: string;
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
  order?: number;
  size?: number;
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
  groups: BoxGroup[];
  version: number;
}

export const BOX_COLOR_PRESETS: string[] = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

export interface BoxGroup {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  boxIds: string[];
}

export const FILE_TYPE_MAPPINGS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  document: ['doc', 'docx', 'pdf', 'txt', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'odp'],
  video: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  code: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'rs', 'go', 'rb', 'php']
};

export interface ArchiveConfig {
  enabled: boolean;
  interval: 'weekly' | 'monthly' | 'yearly';
  keepInOriginal: boolean;
  archiveGroupId: string;
}

export type FileChangeType = 'created' | 'modified' | 'deleted' | 'renamed';

export interface FileChangeEvent {
  id: string;
  path: string;
  changeType: FileChangeType;
  oldPath?: string;
  timestamp: number;
}

export interface FileWatchConfig {
  enabled: boolean;
  watchedPaths: string[];
  ignorePatterns: string[];
  debounceDelay: number;
}

export interface FileWatchStatus {
  isWatching: boolean;
  watchedCount: number;
  lastEventTime?: number;
}
