// 应用配置常量

export const STORAGE_TYPES = {
  STORAGE: 'storage',
  SETTINGS: 'settings',
} as const;

export const THEME_DEFAULT = 'blue' as const;

export const DEBOUNCE_DELAY = 300;

export const STORAGE_INITIALIZED_KEY = 'storage_app_initialized';

export const RESETTING_KEY = 'storage_app_is_resetting';

export const DEFAULT_SHORTCUTS = {
  toggleApp: 'Ctrl+Shift+Space',
} as const;

export const DEFAULT_SETTINGS = {
  viewMode: 'large' as const,
  trayVisible: true,
  shortcuts: DEFAULT_SHORTCUTS,
  theme: THEME_DEFAULT,
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
} as const;

export const AUTO_BACKUP_INTERVALS = ['10min', '30min', '1hour', '3hours', '6hours', '12hours', 'daily'] as const;

export const VIEW_MODES = ['large', 'small', 'list'] as const;
