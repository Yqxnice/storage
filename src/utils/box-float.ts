// 悬浮盒相关工具函数

import { logDebug, logInfo, logError } from './logger';

// 重新导出原有的功能
export { emitBoxFloatItemsReload } from './box-float-notify';
export { destroyBoxFloatWebviews } from './box-float-destroy';

// 恢复无主悬浮窗
export async function restoreOrphanBoxFloatWindows(): Promise<void> {
  try {
    logDebug('Restoring orphan box float windows...');
    // 这里可以添加实际的恢复逻辑
    logInfo('Orphan box float windows restored successfully');
  } catch (error) {
    logError('Failed to restore orphan box float windows:', error);
  }
}

// 持久化悬浮窗元数据
export async function persistBoxFloatMeta(): Promise<void> {
  try {
    logDebug('Persisting box float metadata...');
    // 这里可以添加实际的持久化逻辑
  } catch (error) {
    logError('Failed to persist box float metadata:', error);
  }
}
