import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";

// 工具函数
const validateNonEmpty = (value: string, msg: string) => {
  if (!value || value.trim() === "") {
    throw new Error(msg);
  }
};

// 校验 command 参数
const validateCommand = (command: string) => {
  if (!command || typeof command !== "string" || command.trim() === "") {
    throw new Error("IPC调用失败：command必须是非空字符串");
  }
};

// 统一错误处理函数
const handleError = (error: unknown, context: string) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`${context} 失败: ${errorMessage}`);
};

// 验证路径或URL是否有效
const isValidPathOrUrl = (path: string): boolean => {
  // 检查是否为有效的URL
  try {
    new URL(path);
    return true;
  } catch {
    // 不是URL，检查是否为有效的文件路径
    // 基本的路径验证：不包含非法字符，且不是只包含路径分隔符
    const illegalChars = /[<>:"|?*]/;
    if (illegalChars.test(path)) {
      return false;
    }
    // 检查是否为绝对路径（Windows 或 Unix）
    const isAbsolutePath = /^[a-zA-Z]:\\|^\\|^\//.test(path);
    // 检查是否为相对路径
    const isRelativePath = /^[.\\/].*/.test(path);
    return isAbsolutePath || isRelativePath;
  }
};

// 带超时的 invoke 调用
const invokeWithTimeout = async <T = unknown>(
  command: string,
  params?: Record<string, unknown>,
  timeout = 5000,
): Promise<T> => {
  validateCommand(command);
  return Promise.race([
    invoke<T>(command, params),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`调用超时: ${command}`)), timeout),
    ),
  ]);
};

// 类型定义
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

export interface FileInfo {
  name: string;
  category: string;
  type: string;
  path: string;
  /** 若存在，主窗口将把条目加入该收纳盒而非当前活动盒 */
  targetBoxId?: string;
}

export interface DialogInputOptions {
  title?: string;
  placeholder?: string;
  value?: string;
}

export interface FsMkdirOptions {
  recursive?: boolean;
}

// 枚举定义
export enum PlatformType {
  Win32 = "win32",
  Darwin = "darwin",
  Linux = "linux",
}

// 事件类型定义
export type FileAddedEventDetail = FileInfo;

// IPC Channel 常量
export const IPC_CHANNELS = {
  DRAG_FILES: "drag_files",
  PATH_ITEM_KIND: "path_item_kind",
  OPEN_ITEM: "open_item",
  STORE_GET: "store_get",
  STORE_SET: "store_set",
  STORE_DELETE: "store_delete",
  STORE_CLEAR: "store_clear",
  FILE_ADDED: "file:added",
  REGISTER_GLOBAL_SHORTCUT: "register_global_shortcut",
  UNREGISTER_GLOBAL_SHORTCUT: "unregister_global_shortcut",
  DIALOG_SHOW_INPUT_BOX: "dialog_show_input_box",
  DIALOG_SHOW_CONFIRM: "dialog_show_confirm",
  OPEN_FILE_DIALOG: "open_file_dialog",
  FS_EXISTS: "fs_exists",
  FS_MKDIR: "fs_mkdir",
  APP_GET_PATH: "app_get_path",
  CHECK_FOR_UPDATES: "check_for_updates",
  BACKUP_CREATE: "backup_create",
  BACKUP_RESTORE: "backup_restore",
  BACKUP_CLEANUP: "backup_cleanup",
  BACKUP_GET_BACKUPS: "backup_get_backups",
  BACKUP_SET_AUTO_BACKUP_INTERVAL: "backup_set_auto_backup_interval",
  LOGGER_CLEAR_LOGS: "logger_clear_logs",
  LOGGER_SET_AUTO_CLEANUP_DAYS: "logger_set_auto_cleanup_days",
  LOGGER_GET_LOGS: "logger_get_logs",
  LOGGER_WRITE_LOG: "logger_write_log",
  SET_PORTABLE_MODE: "set_portable_mode",
};

// 获取当前窗口实例（在非Tauri环境中可能会失败）
let appWindow: { minimize: () => Promise<void>; maximize: () => Promise<void>; toggleMaximize: () => Promise<void>; close: () => Promise<void>; isMaximized: () => Promise<boolean>; isVisible: () => Promise<boolean>; };
try {
  appWindow = getCurrentWindow();
} catch (error) {
  // 创建一个模拟的窗口对象，避免后续调用崩溃
  appWindow = {
    minimize: () => Promise.resolve(),
    maximize: () => Promise.resolve(),
    toggleMaximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    isMaximized: () => Promise.resolve(false),
    isVisible: () => Promise.resolve(true)
  };
}

// 平台信息
let platformInfo: PlatformType = PlatformType.Win32;
// TODO: 替换为Tauri的platform API，处理异步时序
// platform().then((p) => {
//   platformInfo = p as PlatformType;
// });

export const tauriIPC = {
  invoke: async <T = unknown>(
    command: string,
    params?: Record<string, unknown>,
  ): Promise<T> => {
    try {
      validateCommand(command);
      return await invokeWithTimeout<T>(command, params);
    } catch (error) {
      throw error;
    }
  },
  store: {
    get: async (params: StoreGetParams) => {
      try {
        const result = await invoke(IPC_CHANNELS.STORE_GET, { params });
        return result;
      } catch (error) {
        handleError(error, "Store get");
      }
    },
    set: async <T = unknown>(params: StoreSetParams<T>) => {
      try {
        const result = await invoke(IPC_CHANNELS.STORE_SET, { params });
        return result;
      } catch (error) {
        handleError(error, "Store set");
      }
    },
    delete: async (params: StoreDeleteParams) => {
      try {
        return await invoke(IPC_CHANNELS.STORE_DELETE, { params });
      } catch (error) {
        handleError(error, "Store delete");
      }
    },
    clear: async (storeType: string) => {
      try {
        validateNonEmpty(storeType, "storeType 不能为空");
        return await invoke(IPC_CHANNELS.STORE_CLEAR, { storeType });
      } catch (error) {
        handleError(error, "Store clear");
      }
    },
  },

  get platform() {
    return platformInfo;
  },
  window: {
    minimize: async () => {
      try {
        return await appWindow.minimize();
      } catch (error) {
        handleError(error, "Window minimize");
      }
    },
    maximize: async () => {
      try {
        return await appWindow.maximize();
      } catch (error) {
        handleError(error, "Window maximize");
      }
    },
    toggleMaximize: async () => {
      try {
        return await appWindow.toggleMaximize();
      } catch (error) {
        handleError(error, "Window toggle maximize");
      }
    },
    close: async () => {
      try {
        return await appWindow.close();
      } catch (error) {
        handleError(error, "Window close");
      }
    },
    isMaximized: async () => {
      try {
        return await appWindow.isMaximized();
      } catch (error) {
        handleError(error, "Window is maximized");
      }
    },
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      try {
        const unlistenMaximize = listen("window://maximize", () =>
          callback(true),
        );
        const unlistenUnmaximize = listen("window://unmaximize", () =>
          callback(false),
        );

        // v2 中取消监听返回 Promise，需异步处理
        return async () => {
          try {
            await unlistenMaximize;
            await unlistenUnmaximize;
          } catch (error) {
            handleError(error, "Window onMaximizeChange cleanup");
          }
        };
      } catch (error) {
        return async () => {};
      }
    },
    onVisibilityChange: (callback: (isVisible: boolean) => void) => {
      try {
        const unlistenFocus = listen("window://focus", () => callback(true));
        const unlistenBlur = listen("window://blur", () => callback(false));

        // v2 中取消监听返回 Promise，需异步处理
        return async () => {
          try {
            await unlistenFocus;
            await unlistenBlur;
          } catch (error) {
            handleError(error, "Window onVisibilityChange cleanup");
          }
        };
      } catch (error) {
        return async () => {};
      }
    },
    isVisible: async () => {
      try {
        return await appWindow.isVisible();
      } catch (error) {
        handleError(error, "Window is visible");
      }
    },
  },
  updater: {
    checkUpdates: async () => {
      try {
        return await invoke(IPC_CHANNELS.CHECK_FOR_UPDATES);
      } catch (error) {
        handleError(error, "Check updates");
      }
    },
    installUpdate: () => {
      throw new Error("installUpdate 未实现");
    },
    onUpdateFound: (_callback: () => void) => {
      throw new Error("onUpdateFound 未实现");
    },
    onUpdateNotFound: (_callback: () => void) => {
      throw new Error("onUpdateNotFound 未实现");
    },
    onUpdateReady: (_callback: () => void) => {
      throw new Error("onUpdateReady 未实现");
    },
    onUpdateError: (_callback: (error: string) => void) => {
      throw new Error("onUpdateError 未实现");
    },
    off: (_channel: string) => {
      throw new Error("off 未实现");
    },
  },
  dialog: {
    openFile: async () => {
      try {
        return await invoke<Array<string>>(IPC_CHANNELS.OPEN_FILE_DIALOG);
      } catch (error) {
        handleError(error, "Open file dialog");
      }
    },
    showInputBox: async (options: DialogInputOptions) => {
      try {
        return await invoke<string>(IPC_CHANNELS.DIALOG_SHOW_INPUT_BOX, {
          options,
        });
      } catch (error) {
        handleError(error, "Show input box");
      }
    },
    confirm: async (message: string, title?: string) => {
      try {
        // 在Tauri环境中使用对话框API
        const result = await invoke<boolean>(IPC_CHANNELS.DIALOG_SHOW_CONFIRM, {
          message,
          title: title || "确认操作"
        });
        return result;
      } catch (error) {
        // 在非Tauri环境中回退到window.confirm
        return window.confirm(message);
      }
    },
  },
  fs: {
    exists: async (path: string) => {
      try {
        validateNonEmpty(path, "路径不能为空");
        return await invoke<boolean>(IPC_CHANNELS.FS_EXISTS, { path });
      } catch (error) {
        handleError(error, "Fs exists");
      }
    },
    mkdir: async (
      path: string,
      options: FsMkdirOptions = { recursive: false },
    ) => {
      try {
        validateNonEmpty(path, "路径不能为空");
        return await invoke(IPC_CHANNELS.FS_MKDIR, { path, options });
      } catch (error) {
        handleError(error, "Fs mkdir");
      }
    },
  },
  app: {
    getPath: async (name: string) => {
      try {
        validateNonEmpty(name, "路径名称不能为空");
        return await invoke<string>(IPC_CHANNELS.APP_GET_PATH, { name });
      } catch (error) {
        handleError(error, "App get path");
      }
    },
  },
  backup: {
    createBackup: async (type: string) => {
      try {
        validateNonEmpty(type, "备份类型不能为空");
        return await invoke(IPC_CHANNELS.BACKUP_CREATE, { backupType: type });
      } catch (error) {
        handleError(error, "Create backup");
      }
    },
    restoreBackup: async (backupId: string) => {
      try {
        validateNonEmpty(backupId, "备份 ID 不能为空");
        return await invoke(IPC_CHANNELS.BACKUP_RESTORE, {
          backupId: backupId,
        });
      } catch (error) {
        handleError(error, "Restore backup");
      }
    },
    cleanupBackups: async () => {
      try {
        return await invoke(IPC_CHANNELS.BACKUP_CLEANUP);
      } catch (error) {
        handleError(error, "Cleanup backups");
      }
    },
    getBackups: async () => {
      try {
        return await invoke<Array<string>>(IPC_CHANNELS.BACKUP_GET_BACKUPS);
      } catch (error) {
        handleError(error, "Get backups");
      }
    },
    setAutoBackupInterval: async (interval: string) => {
      try {
        validateNonEmpty(interval, "备份间隔不能为空");
        return await invoke(IPC_CHANNELS.BACKUP_SET_AUTO_BACKUP_INTERVAL, {
          interval,
        });
      } catch (error) {
        handleError(error, "Set auto backup interval");
      }
    },
  },
  logger: {
    clearLogs: async () => {
      try {
        return await invoke(IPC_CHANNELS.LOGGER_CLEAR_LOGS);
      } catch (error) {
        handleError(error, "Clear logs");
      }
    },
    setAutoCleanupDays: async (days: string) => {
      try {
        validateNonEmpty(days, "清理天数不能为空");
        return await invoke(IPC_CHANNELS.LOGGER_SET_AUTO_CLEANUP_DAYS, {
          days,
        });
      } catch (error) {
        handleError(error, "Set auto cleanup days");
      }
    },
    getLogs: async () => {
      try {
        return await invoke<Array<string>>(IPC_CHANNELS.LOGGER_GET_LOGS);
      } catch (error) {
        handleError(error, "Get logs");
      }
    },
    writeLog: async (level: string, message: string) => {
      try {
        validateNonEmpty(level, "日志级别不能为空");
        validateNonEmpty(message, "日志消息不能为空");
        return await invoke(IPC_CHANNELS.LOGGER_WRITE_LOG, {
          level,
          message,
        });
      } catch (error) {
        handleError(error, "Write log");
      }
    },
  },
  // 全局快捷键
  shortcut: {
    register: async (shortcut: string) => {
      try {
        validateNonEmpty(shortcut, "快捷键不能为空");
        await invoke(IPC_CHANNELS.REGISTER_GLOBAL_SHORTCUT, { shortcut });
        return true;
      } catch (error) {
        return false;
      }
    },
    unregister: async (shortcut: string) => {
      try {
        validateNonEmpty(shortcut, "快捷键不能为空");
        await invoke(IPC_CHANNELS.UNREGISTER_GLOBAL_SHORTCUT, { shortcut });
        return true;
      } catch (error) {
        return false;
      }
    },
  },
  // 获取文件图标
  getFileIcon: async (filePath: string, size: number = 32): Promise<string | null> => {
    try {
      validateNonEmpty(filePath, "文件路径不能为空");
      const result = await invoke("get_file_icon", { filePath, size });
      return result as string | null;
    } catch (error) {
      handleError(error, "Get file icon");
      return null;
    }
  },
  // 打开项目（文件或链接）
  openItem: async (path: string) => {
    try {
      validateNonEmpty(path, "路径不能为空");
      // 校验路径格式，避免只包含路径分隔符的情况
      const trimmedPath = path.trim();
      // 修复：用正则匹配「仅包含 / 或 \」的情况（1个或多个分隔符）
      const isOnlySeparators = /^[\\/]+$/.test(trimmedPath);

      if (isOnlySeparators) {
        throw new Error("路径格式错误：不能只包含路径分隔符");
      }
      // 校验路径是否为有效的文件路径或URL
      if (!isValidPathOrUrl(trimmedPath)) {
        throw new Error("路径格式错误：无效的文件路径或URL");
      }
      return await invoke(IPC_CHANNELS.OPEN_ITEM, { path });
    } catch (error) {
      handleError(error, "Open item");
    }
  },
  // 处理拖拽文件；可选 targetBoxId 时由主界面加入指定收纳盒（收纳盒悬浮窗拖放）
  dragFiles: async (paths: string[], targetBoxId?: string | null) => {
    try {
      if (!Array.isArray(paths) || paths.length === 0) {
        throw new Error("文件路径数组不能为空");
      }
      const result = await invoke(IPC_CHANNELS.DRAG_FILES, {
        paths,
        ...(targetBoxId ? { target_box_id: targetBoxId } : {}),
      });
      return result;
    } catch (error) {
      handleError(error, "Drag files");
    }
  },
  pathItemKind: async (path: string): Promise<"file" | "folder" | "unknown"> => {
    try {
      const k = await invoke<string>(IPC_CHANNELS.PATH_ITEM_KIND, { path });
      if (k === "folder" || k === "file") return k;
      return "unknown";
    } catch (error) {
      handleError(error, "Path item kind");
    }
  },
  // 获取文件大小
  getFileSize: async (path: string): Promise<number | null> => {
    try {
      validateNonEmpty(path, "文件路径不能为空");
      const result = await invoke<number | null>("get_file_size", { path });
      return result;
    } catch (error) {
      handleError(error, "Get file size");
      return null;
    }
  },
  // 扫描桌面文件
  scanDesktopFiles: async (scanHidden = false) => {
    try {
      const result = await invoke('scan_desktop_files', { scan_hidden: scanHidden });
      return result;
    } catch (error) {
      handleError(error, "Scan desktop files");
    }
  },
  // 设置便携模式
  setPortableMode: async (isPortable: boolean) => {
    try {
      const result = await invoke(IPC_CHANNELS.SET_PORTABLE_MODE, { isPortable });
      return result;
    } catch (error) {
      handleError(error, "Set portable mode");
    }
  },
  // 设置窗口置顶
  setWindowAlwaysOnTop: async (alwaysOnTop: boolean) => {
    try {
      return await invoke("set_window_always_on_top", { alwaysOnTop });
    } catch (error) {
      handleError(error, "Set window always on top");
    }
  },
  // 设置窗口透明度
  setWindowTransparency: async (transparent: boolean) => {
    try {
      return await invoke("set_window_transparency", { transparent });
    } catch (error) {
      handleError(error, "Set window transparency");
    }
  },
};

// 模拟 file:added 事件
export const simulateFileAddedEvent = (fileInfo: FileAddedEventDetail) => {
  window.dispatchEvent(
    new CustomEvent<FileAddedEventDetail>(IPC_CHANNELS.FILE_ADDED, {
      detail: fileInfo,
    }),
  );
};

// 节流函数
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => unknown) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }
  };
};

