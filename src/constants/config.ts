// 应用配置常量

export const APP_INFO = {
  NAME: '桌面收纳',
  VERSION: '1.0.0',
  IDENTIFIER: 'com.desktopstorage.storage',
  DESCRIPTION: '桌面文件收纳工具',
  TAGLINE: '虚拟映射 · 不移动原始文件',
} as const;

export const DEVELOPER_INFO = {
  AUTHOR: '桌面收纳团队',
  CONTACT_EMAIL: 'support@desktoporganizer.com',
  WEBSITE: 'https://desktoporganizer.com',
  REPOSITORY: 'https://github.com/Yqxnice/storage',
} as const;

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
