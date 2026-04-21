export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: unknown) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    invoke: (channel: string, data?: unknown) => Promise<unknown>;
  };
  store: {
    get: (params: { key: string; storeType: 'settings' | 'storage' }) => Promise<unknown>;
    set: (params: { key: string; value: unknown; storeType: 'settings' | 'storage' }) => Promise<boolean>;
    delete: (params: { key: string; storeType: 'settings' | 'storage' }) => Promise<boolean>;
    clear: (storeType: 'settings' | 'storage') => Promise<boolean>;
  };
  getFileIcon: (filePath: string) => Promise<{
    success: boolean;
    icon?: string;
    message?: string;
  }>;
  platform: string;
  window: {
    minimize: () => void;
    maximize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
    onVisibilityChange: (callback: (isVisible: boolean) => void) => void;
    isVisible: () => Promise<boolean>;
  };
  updater: {
    // 手动检查更新
    checkUpdates: () => Promise<unknown>;
    // 安装更新
    installUpdate: () => Promise<void>;

    // 监听更新事件
    onUpdateFound: (callback: () => void) => void;
    onUpdateNotFound: (callback: () => void) => void;
    onUpdateReady: (callback: () => void) => void;
    onUpdateError: (callback: (error: string) => void) => void;

    // 移除监听（防止重复）
    off: (channel: string) => void;
  };
  dialog: {
    openFile: () => Promise<string[] | null>;
  };
  backup: {
    createBackup: (type?: 'auto' | 'manual') => Promise<{ success: boolean; backupId?: string; error?: string }>;
    restoreBackup: (backupId: string) => Promise<{ success: boolean; error?: string }>;
    cleanupBackups: () => Promise<{ success: boolean; error?: string }>;
    getBackups: () => Promise<{ success: boolean; backups?: any[]; error?: string }>;
    setAutoBackupInterval: (interval: string) => Promise<{ success: boolean; error?: string }>;
  };
  logger: {
    clearLogs: () => Promise<{ success: boolean; error?: string }>;
    setAutoCleanupDays: (days: string) => Promise<{ success: boolean; error?: string }>;
    getLogs: () => Promise<{ success: boolean; logs?: any[]; error?: string }>;
  };
  getUserAvatar: () => Promise<string | null>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}