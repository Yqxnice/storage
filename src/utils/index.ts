// 工具函数统一导出

export * from './helpers';
export {
  generateId,
  formatTimestamp,
  isValidPathOrUrl,
  validateNonEmpty,
  validateCommand,
  handleError,
  sleep,
  safeJsonParse,
  safeJsonStringify,
} from './helpers';

export * from './tauri-ipc';
export { tauriIPC, simulateFileAddedEvent, throttle } from './tauri-ipc';

export * from './theme';
export { applyTheme, applyTimeTheme } from './theme';

export * from './logger';
export { logDebug, logInfo, logError } from './logger';

export * from './box-float';
export {
  restoreOrphanBoxFloatWindows,
  persistBoxFloatMeta,
  emitBoxFloatItemsReload,
  destroyBoxFloatWebviews,
} from './box-float';
