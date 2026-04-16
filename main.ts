import { app, BrowserWindow, globalShortcut, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import Store from 'electron-store';
import * as fs from 'fs';

// IPC Channel 常量
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
} as const;

// 文件信息类型
interface FileInfo {
  name: string;
  type: 'file' | 'folder' | 'icon';
  path: string;
  addedAt: number;
}

// 处理文件添加逻辑
async function handleFileAdd(filePath: string): Promise<FileInfo> {
  // 提取文件名
  const name = path.basename(filePath);
  
  // 确定文件类型
  let type: 'file' | 'folder' | 'icon' = 'file';
  if (filePath.endsWith('.lnk')) {
    type = 'icon';
  } else {
    // 这里可以添加逻辑判断是否为文件夹
    // 暂时简单处理，根据路径是否包含扩展名判断
    const ext = path.extname(filePath);
    if (!ext) {
      type = 'folder';
    }
  }
  
  // 返回文件信息
  return {
    name,
    type,
    path: filePath,
    addedAt: Date.now()
  };
}

// 扫描桌面文件和文件夹
async function scanDesktop(): Promise<FileInfo[]> {
  const desktopPath = app.getPath('desktop');
  const items: FileInfo[] = [];
  
  try {
    const files = fs.readdirSync(desktopPath);
    
    for (const file of files) {
      // 跳过隐藏文件和系统文件
      if (file.startsWith('.') || file === 'desktop.ini') {
        continue;
      }
      
      const filePath = path.join(desktopPath, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        // 只收集快捷方式、文件夹和可执行文件
        if (file.endsWith('.lnk') || file.endsWith('.exe') || stat.isDirectory()) {
          const fileInfo = await handleFileAdd(filePath);
          items.push(fileInfo);
        }
      } catch (err) {
        // 跳过无法访问的文件
        console.warn(`无法访问文件: ${filePath}`, err);
      }
    }
    
    console.log(`扫描到 ${items.length} 个桌面项目`);
  } catch (err) {
    console.error('扫描桌面失败:', err);
  }
  
  return items;
}

// 创建一个 electron-store 实例
const store = new Store({
  name: 'desk-organizer'
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // 禁用菜单栏
  Menu.setApplicationMenu(null);

  // preload 文件路径 - 开发环境从源目录加载，生产环境从构建目录加载
  let preloadPath: string;
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：从项目根目录加载
    preloadPath = path.join(__dirname, 'preload.js');
  } else {
    // 生产环境：从构建目录加载
    preloadPath = path.join(__dirname, 'preload.js');
  }

  console.log('[Main] Preload path:', preloadPath);
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] File exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true, // 隐藏菜单栏
    webPreferences: {
      preload: preloadPath,
      // Enable context isolation and disable direct Node integration for security
      nodeIntegration: false,
      contextIsolation: true,
      // webSecurity 保持启用状态，通过 CSP 和 IPC 来处理文件图标
    }
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Drag events are now handled in the renderer via IPC; no main process dragover listener.

  // Drag-and-drop moved to renderer (IPC-based path transfer). Main process no longer handles drop events directly.

  // 允许应用接收文件拖拽（渲染进程处理，主进程不再拦截拖拽）
}

// 注册全局 IPC handlers，避免在 createWindow 内重复注册
// Open file dialog handler for fallback path retrieval from renderer
ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// 监听渲染进程发送的获取文件路径的消息
// 注意：此接口已废弃，实际拖拽通过 drag-files IPC 处理
ipcMain.on(IPC_CHANNELS.GET_FILE_PATH, (event, data) => {
  console.log('接收到获取文件路径请求（已废弃）:', data);
  console.warn(`${IPC_CHANNELS.GET_FILE_PATH} 接口已废弃，请使用 ${IPC_CHANNELS.DRAG_FILES} 接口`);
});

// IPC: receive drag file paths from renderer and process them
ipcMain.on(IPC_CHANNELS.DRAG_FILES, (event, filePaths) => {
  console.log('接收到拖拽文件路径:', filePaths);
  if (!Array.isArray(filePaths)) return;
  for (const filePath of filePaths) {
    if (typeof filePath !== 'string' || filePath.length === 0) continue;
    console.log('处理文件:', filePath);
    handleFileAdd(filePath).then(fileInfo => {
      console.log('处理后的文件信息:', fileInfo);
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.FILE_ADDED, fileInfo);
        console.log(`已发送${IPC_CHANNELS.FILE_ADDED}事件:`, fileInfo.name);
      }
    }).catch(error => {
      console.error('处理拖拽文件时出错:', error);
    });
  }
});

// 监听渲染进程发送的打开文件或文件夹的消息
ipcMain.on(IPC_CHANNELS.OPEN_ITEM, (event, item) => {
  if (!item.path) return;

  console.log('打开项目:', item);
  console.log('项目路径:', item.path);

  // 根据操作系统选择不同的命令
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Windows 系统
    // 使用 spawn 命令，避免命令注入
    spawn('cmd.exe', ['/c', 'start', '', item.path], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } else if (process.platform === 'darwin') {
    // macOS 系统
    spawn('open', [item.path], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } else {
    // Linux 系统
    spawn('xdg-open', [item.path], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  }
});

app.on('ready', async () => {
  createWindow();
  
  // 检查是否是首次启动
  const hasInitialized = store.get('hasInitialized') as boolean;
  
  if (!hasInitialized) {
    console.log('首次启动，正在初始化...');
    
    // 扫描桌面
    const desktopItems = await scanDesktop();
    
    // 创建初始数据 - 按照 zustand persist 的格式
    const initialData = {
      state: {  // zustand persist 需要 state 包装
        boxes: [
          {
            id: '1',
            name: '桌面文件',
            itemCount: desktopItems.length,
            createdAt: Date.now()
          }
        ],
        items: desktopItems.map((item, index) => ({
          ...item,
          id: `item-${index + 1}`,
          boxId: '1',
          tags: []  // 添加空的标签数组，匹配 Item 接口
        })),
        activeBoxId: '1',
        viewMode: 'large',
        searchQuery: '',
        trayVisible: true
      },
      version: 0  // zustand persist 版本控制
    };
    
    // 保存初始数据 - 使用 zustand persist 期望的格式
    store.set('desk-organizer-storage', initialData);
    
    // 标记已初始化
    store.set('hasInitialized', true);
    
    console.log(`初始化完成，已添加 ${desktopItems.length} 个桌面项目`);
    console.log('收纳盒:', initialData.state.boxes[0].name, '- 文件数:', initialData.state.boxes[0].itemCount);
  } else {
    console.log('非首次启动，跳过初始化');
  }
  
  // 注册全局快捷键 (Ctrl+Shift+Space)
  const ret = globalShortcut.register('Ctrl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!ret) {
    console.log('Failed to register shortcut');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 存储相关的 IPC 处理程序
ipcMain.handle(IPC_CHANNELS.STORE_GET, (event, key) => {
  return store.get(key);
});

ipcMain.handle(IPC_CHANNELS.STORE_SET, (event, { key, value }) => {
  store.set(key, value);
  return true;
});

ipcMain.handle(IPC_CHANNELS.STORE_DELETE, (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle(IPC_CHANNELS.STORE_CLEAR, () => {
  store.clear();
  return true;
});

// 获取文件图标
ipcMain.handle(IPC_CHANNELS.GET_FILE_ICON, async (event, filePath) => {
  try {
    // 核心：获取系统图标（大小可选：normal / large）
    const iconNative = await app.getFileIcon(filePath, { size: 'large' });

    // 转为 base64，直接给前端 img 标签使用
    const base64 = iconNative.toDataURL();

    return {
      success: true,
      icon: base64
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err)
    };
  }
});

app.on('will-quit', () => {
  // 注销全局快捷键
  globalShortcut.unregisterAll();
});
