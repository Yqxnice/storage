import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// IPC Channel 常量
export const IPC_CHANNELS = {
  GET_FILE_PATH: 'get-file-path',
  DRAG_FILES: 'drag-files',
  OPEN_ITEM: 'open-item',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  STORE_CLEAR: 'store:clear',
  GET_FILE_ICON: 'get-file-icon',
  FILE_ADDED: 'file:added',
  OPEN_FILE_DIALOG: 'open-file-dialog'
} as const;

// 文件信息类型
export interface FileInfo {
  name: string;
  category: 'desktop' | 'web';
  type?: 'file' | 'folder' | 'icon';
  path?: string;
  url?: string;
  icon?: string;
  addedAt: number;
}

// 获取应用数据目录
export function getAppDataPath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'data');
  } else {
    return path.join(process.cwd(), 'data');
  }
}

// 确保数据目录存在
export function ensureDataDir(): string {
  const dataPath = getAppDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    console.log('[Store] 创建数据目录:', dataPath);
  }
  return dataPath;
}

// 应用设置类型
export interface SettingsData {
  hasInitialized: boolean;
  hasShownWelcome: boolean;
  dataPath: string | null;
  viewMode: 'large' | 'small' | 'list';
  trayVisible: boolean;
  shortcuts: Record<string, string>;
  startOnBoot: boolean;
  startMinimized: boolean;
  minimizeOnClose: boolean;
  autoScanDesktop: boolean;
  handleInvalidMappings: boolean;
}

// 用户收纳数据类型
export interface StorageData {
  boxes: Array<{
    id: string;
    name: string;
    itemCount: number;
    createdAt: number;
  }>;
  items: Array<FileInfo & { id: string; boxId: string; clickCount: number }>;
  activeBoxId: string | null;
}

// 创建应用设置存储
export function createSettingsStore(dataPath: string): Store {
  return new Store({
    cwd: dataPath,
    name: 'settings',
    defaults: {
      hasInitialized: false,
      hasShownWelcome: false,
      dataPath: null,
      viewMode: 'large',
      trayVisible: true,
      shortcuts: {
        toggleApp: 'Ctrl+Shift+Space'
      },
      startOnBoot: true,
      startMinimized: false,
      minimizeOnClose: true,
      autoScanDesktop: true,
      handleInvalidMappings: true
    }
  });
}

// 创建用户收纳数据存储
export function createStorageStore(dataPath: string): Store {
  return new Store({
    cwd: dataPath,
    name: 'storage',
    defaults: {
      boxes: [],
      items: [],
      activeBoxId: null
    }
  });
}