// 类型导出统一入口

// 通用类型
export * from './common';
export type { FileInfo, DialogInputOptions, FsMkdirOptions, PlatformType, ThemeType } from './common';

// 存储类型
export * from './storage';
export type { Box, Item, OrphanBoxFloat, StorageData } from './storage';

// 设置类型
export * from './settings';
export type {
  ViewMode, AutoBackupInterval, SettingsState, SettingsActions, SettingsStore } from './settings';

// 事件类型
export * from './events';
export { IPC_CHANNELS } from './events';
export type { IpcChannel, StoreGetParams, StoreSetParams, StoreDeleteParams, FileAddedEventDetail } from './events';
