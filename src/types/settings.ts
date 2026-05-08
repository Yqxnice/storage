import type { ThemeType } from './common';

export type ViewMode = 'large' | 'small' | 'list';

export type AutoBackupInterval = '10min' | '30min' | '1hour' | '3hours' | '6hours' | '12hours' | 'daily';

export interface SettingsState {
  viewMode: ViewMode;
  trayVisible: boolean;
  shortcuts: Record<string, string>;
  theme: ThemeType;
  timeThemeEnabled: boolean;
  sortByClickCount: boolean;
  startOnBoot: boolean;
  startMinimized: boolean;
  minimizeOnClose: boolean;
  autoScanDesktop: boolean;
  handleInvalidMappings: boolean;
  autoBackupInterval: AutoBackupInterval | string;
  logAutoCleanupDays: string;
  scanHiddenFiles: boolean;
  setScanHiddenFiles: (value: boolean) => void;
  
  fileWatchEnabled: boolean;
  fileWatchPaths: string[];
  fileWatchIgnorePatterns: string[];
  fileWatchDebounceDelay: number;
  setFileWatchEnabled: (enabled: boolean) => void;
  setFileWatchPaths: (paths: string[]) => void;
  setFileWatchIgnorePatterns: (patterns: string[]) => void;
  setFileWatchDebounceDelay: (delay: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setTrayVisible: (visible: boolean) => void;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  setTheme: (theme: ThemeType) => void;
  setTimeThemeEnabled: (enabled: boolean) => void;
  setSortByClickCount: (value: boolean) => void;
  setStartOnBoot: (value: boolean) => void;
  setStartMinimized: (value: boolean) => void;
  setMinimizeOnClose: (value: boolean) => void;
  setAutoScanDesktop: (value: boolean) => void;
  setHandleInvalidMappings: (value: boolean) => void;
  setAutoBackupInterval: (interval: AutoBackupInterval | string) => void;
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