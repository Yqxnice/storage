// 预加载脚本，用于在渲染进程和主进程之间建立安全的通信桥梁
const { contextBridge, ipcRenderer, webUtils } = require('electron')

// IPC Channel 常量（与主进程保持一致）
const IPC_CHANNELS = {
  OPEN_FILE_DIALOG: 'open-file-dialog',
  GET_FILE_PATH: 'get-file-path',
  DRAG_FILES: 'drag-files',
  OPEN_ITEM: 'open-item',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  STORE_CLEAR: 'store:clear',
  GET_FILE_ICON: 'get-file-icon',
  FILE_ADDED: 'file:added'
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
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, { key, value }),
    delete: (key) => ipcRenderer.invoke(IPC_CHANNELS.STORE_DELETE, key),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.STORE_CLEAR)
  },
  getFileIcon: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_ICON, filePath)
});

console.log('[Preload] window.electron 已暴露');
console.log('[Preload] window.electron.store 可用:', typeof window !== 'undefined' && window.electron && !!window.electron.store);

// 将主进程的 file:added 事件转发给渲染进程的 DOM 事件
ipcRenderer.on(IPC_CHANNELS.FILE_ADDED, (_event, fileInfo) => {
  console.log('[Preload] 收到主进程的 file:added 事件:', fileInfo);
  
  // 确保 DOM 加载完成后再转发事件
  if (document.readyState === 'loading') {
    console.log('[Preload] DOM 正在加载，等待 DOMContentLoaded 事件');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Preload] DOM 加载完成，转发 file:added 事件');
      if (window) {
        window.dispatchEvent(new CustomEvent(IPC_CHANNELS.FILE_ADDED, { detail: fileInfo }));
        console.log('[Preload] 已转发 file:added 事件到 DOM');
      } else {
        console.error('[Preload] window 对象不可用，无法转发事件');
      }
    });
  } else {
    console.log('[Preload] DOM 已加载，直接转发 file:added 事件');
    if (window) {
      window.dispatchEvent(new CustomEvent(IPC_CHANNELS.FILE_ADDED, { detail: fileInfo }));
      console.log('[Preload] 已转发 file:added 事件到 DOM');
    } else {
      console.error('[Preload] window 对象不可用，无法转发事件');
    }
  }
});

// 将渲染进程中拖拽的文件路径通过 IPC 传递给主进程
document.addEventListener('dragover', function(e){ e.preventDefault(); e.stopPropagation(); }, false);
document.addEventListener('drop', function(e){
  e.preventDefault();
  e.stopPropagation();
  const dt = e.dataTransfer;
  const files = dt && dt.files ? Array.from(dt.files) : [];
  const paths = files.map(function(f){ return webUtils.getPathForFile(f); }).filter(function(p){ return !!p; });
  if (paths.length > 0) {
    ipcRenderer.send(IPC_CHANNELS.DRAG_FILES, paths);
  }
}, false);
