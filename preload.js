// 预加载脚本，用于在渲染进程和主进程之间建立安全的通信桥梁
const { contextBridge, ipcRenderer, webUtils } = require('electron')

// IPC Channel 常量（与主进程保持一致）
const IPC_CHANNELS = {
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
};

console.log('[Preload] preload.js 已加载');
console.log('[Preload] contextBridge 可用:', !!contextBridge);

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
  },
  store: {
    get: (params) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, params),
    set: (params) => ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, params),
    delete: (params) => ipcRenderer.invoke(IPC_CHANNELS.STORE_DELETE, params),
    clear: (storeType) => ipcRenderer.invoke(IPC_CHANNELS.STORE_CLEAR, storeType)
  },
  getFileIcon: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_ICON, filePath),
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('win-minimize'),
    maximize: () => ipcRenderer.send('win-maximize'),
    toggleMaximize: () => ipcRenderer.send('win-maximize'),
    close: () => ipcRenderer.send('win-close'),
    isMaximized: () => ipcRenderer.invoke('win-is-maximized'),
    onMaximizeChange: (callback) => {
      ipcRenderer.on('win-maximize-change', (_event, isMaximized) => callback(isMaximized));
    },
    onVisibilityChange: (callback) => {
      ipcRenderer.on('win-visibility-change', (_event, isVisible) => callback(isVisible));
    },
    isVisible: () => ipcRenderer.invoke('win-is-visible'),
  },
  updater: {
    // 手动检查更新
    checkUpdates: () => ipcRenderer.invoke('check-for-updates'),
    // 安装更新
    installUpdate: () => ipcRenderer.invoke('install-update'),

    // 监听更新事件
    onUpdateFound: (cb) => ipcRenderer.on('update-found', cb),
    onUpdateNotFound: (cb) => ipcRenderer.on('update-not-found', cb),
    onUpdateReady: (cb) => ipcRenderer.on('update-ready', cb),
    onUpdateError: (cb) => ipcRenderer.on('update-error', cb),

    // 移除监听（防止重复）
    off: (channel) => ipcRenderer.removeAllListeners(channel)
  },
  dialog: {
    openFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG),
    showInputBox: (options) => ipcRenderer.invoke('dialog:showInputBox', options)
  },
  fs: {
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    mkdir: (path, options) => ipcRenderer.invoke('fs:mkdir', path, options)
  },
  app: {
    getPath: (name) => ipcRenderer.invoke('app:get-path', name)
  },
  backup: {
    createBackup: (type) => ipcRenderer.invoke('backup:create', type),
    restoreBackup: (backupId) => ipcRenderer.invoke('backup:restore', backupId),
    cleanupBackups: () => ipcRenderer.invoke('backup:cleanup'),
    getBackups: () => ipcRenderer.invoke('backup:getBackups'),
    setAutoBackupInterval: (interval) => ipcRenderer.invoke('backup:setAutoBackupInterval', interval)
  },
  logger: {
    clearLogs: () => ipcRenderer.invoke('logger:clearLogs'),
    setAutoCleanupDays: (days) => ipcRenderer.invoke('logger:setAutoCleanupDays', days),
    getLogs: () => ipcRenderer.invoke('logger:getLogs')
  }
});

console.log('[Preload] window.electron 已暴露');
console.log('[Preload] window.electron.store 可用:', typeof window !== 'undefined' && window.electron && !!window.electron.store);

// 将主进程的 file:added 事件转发给渲染进程的 DOM 事件
console.log('[Preload] 注册 FILE_ADDED 事件监听器');
ipcRenderer.on(IPC_CHANNELS.FILE_ADDED, (_event, fileInfo) => {
  console.log('[Preload] 收到主进程的 file:added 事件:', fileInfo);
  console.log('[Preload] IPC_CHANNELS.FILE_ADDED:', IPC_CHANNELS.FILE_ADDED);

  // 确保 DOM 加载完成后再转发事件
  if (document.readyState === 'loading') {
    console.log('[Preload] DOM 正在加载，等待 DOMContentLoaded 事件');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Preload] DOM 加载完成，转发 file:added 事件');
      if (window) {
        console.log('[Preload] 转发事件到 window:', IPC_CHANNELS.FILE_ADDED, fileInfo);
        window.dispatchEvent(new CustomEvent(IPC_CHANNELS.FILE_ADDED, { detail: fileInfo }));
        console.log('[Preload] 已转发 file:added 事件到 DOM');
      } else {
        console.error('[Preload] window 对象不可用，无法转发事件');
      }
    });
  } else {
    console.log('[Preload] DOM 已加载，直接转发 file:added 事件');
    if (window) {
      console.log('[Preload] 转发事件到 window:', IPC_CHANNELS.FILE_ADDED, fileInfo);
      window.dispatchEvent(new CustomEvent(IPC_CHANNELS.FILE_ADDED, { detail: fileInfo }));
      console.log('[Preload] 已转发 file:added 事件到 DOM');
    } else {
      console.error('[Preload] window 对象不可用，无法转发事件');
    }
  }
});

// 将渲染进程中拖拽的文件路径通过 IPC 传递给主进程
document.addEventListener('dragover', function(e){
  e.preventDefault();
  e.stopPropagation();
  console.log('[Preload] 拖拽文件:', e.dataTransfer.files);
}, false);
document.addEventListener('drop', function(e){
  e.preventDefault();
  e.stopPropagation();
  const dt = e.dataTransfer;
  const files = dt && dt.files ? Array.from(dt.files) : [];
  const paths = files.map(function(f){ return webUtils.getPathForFile(f); }).filter(function(p){ return !!p; });
  console.log('[Preload] 拖拽文件路径:', paths);
  if (paths.length > 0) {
    ipcRenderer.send(IPC_CHANNELS.DRAG_FILES, paths);
  }
}, false);