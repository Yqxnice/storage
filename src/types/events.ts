// 事件相关类型定义

export const IPC_CHANNELS = {
  DRAG_FILES: 'drag_files',
  PATH_ITEM_KIND: 'path_item_kind',
  OPEN_ITEM: 'open_item',
  STORE_GET: 'store_get',
  STORE_SET: 'store_set',
  STORE_DELETE: 'store_delete',
  STORE_CLEAR: 'store_clear',
  FILE_ADDED: 'file:added',
  REGISTER_GLOBAL_SHORTCUT: 'register_global_shortcut',
  UNREGISTER_GLOBAL_SHORTCUT: 'unregister_global_shortcut',
  DIALOG_SHOW_INPUT_BOX: 'dialog_show_input_box',
  DIALOG_SHOW_CONFIRM: 'dialog_show_confirm',
  OPEN_FILE_DIALOG: 'open_file_dialog',
  FS_EXISTS: 'fs_exists',
  FS_MKDIR: 'fs_mkdir',
  APP_GET_PATH: 'app_get_path',
  CHECK_FOR_UPDATES: 'check_for_updates',
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',
  BACKUP_CLEANUP: 'backup_cleanup',
  BACKUP_GET_BACKUPS: 'backup_get_backups',
  BACKUP_SET_AUTO_BACKUP_INTERVAL: 'backup_set_auto_backup_interval',
  LOGGER_CLEAR_LOGS: 'logger_clear_logs',
  LOGGER_SET_AUTO_CLEANUP_DAYS: 'logger_set_auto_cleanup_days',
  LOGGER_GET_LOGS: 'logger_get_logs',
  LOGGER_WRITE_LOG: 'logger_write_log',
  SET_PORTABLE_MODE: 'set_portable_mode',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export interface StoreGetParams {
  key: string;
  storeType?: string;
}

export interface StoreSetParams<T = unknown> {
  key: string;
  value: T;
  storeType?: string;
}

export interface StoreDeleteParams {
  key: string;
  storeType?: string;
}

// 事件类型
export type FileAddedEventDetail = {
  name: string;
  category: string;
  type: string;
  path: string;
  targetBoxId?: string;
};
