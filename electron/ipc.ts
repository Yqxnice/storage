import { ipcMain, app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import Store from 'electron-store';
import { IPC_CHANNELS, FileInfo } from './store';
import { getMainWindow } from './window';

// 智能处理文件名
export function processFileName(fileName: string): string {
  let processedName = fileName;

  const commonExtensions = ['.lnk', '.exe', '.bat', '.cmd', '.msi', '.app', '.dmg'];

  for (const ext of commonExtensions) {
    if (processedName.toLowerCase().endsWith(ext.toLowerCase())) {
      processedName = processedName.substring(0, processedName.length - ext.length);
      break;
    }
  }

  const separators = ['-', '_', '.'];
  for (const sep of separators) {
    const index = processedName.indexOf(sep);
    if (index > 0) {
      processedName = processedName.substring(0, index);
      break;
    }
  }

  return processedName.trim();
}

// 处理文件添加逻辑
export async function handleFileAdd(filePath: string): Promise<FileInfo> {
  const originalName = path.basename(filePath);
  const name = processFileName(originalName);

  let type: 'file' | 'folder' | 'icon' = 'file';
  if (filePath.endsWith('.lnk')) {
    type = 'icon';
  } else if (!path.extname(filePath)) {
    type = 'folder';
  }

  return {
    name,
    category: 'desktop',
    type,
    path: filePath,
    addedAt: Date.now()
  };
}

// 注册窗口控制 IPC handlers
export function registerWindowControls(): void {
  // 旧的窗口控制
  ipcMain.on('window-minimize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
  });

  // 新的窗口控制（与 preload.js 对应）
  ipcMain.on('win-minimize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('win-maximize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        setTimeout(() => {
          mainWindow.webContents.send('win-maximize-change', mainWindow.isMaximized());
        }, 100);
      } else {
        mainWindow.maximize();
        setTimeout(() => {
          mainWindow.webContents.send('win-maximize-change', mainWindow.isMaximized());
        }, 100);
      }
    }
  });

  ipcMain.on('win-close', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('win-is-maximized', () => {
    const mainWindow = getMainWindow();
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('win-is-visible', () => {
    const mainWindow = getMainWindow();
    return mainWindow ? mainWindow.isVisible() : false;
  });

  // 监听窗口显示/隐藏事件并通知渲染进程
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.on('show', () => {
      mainWindow.webContents.send('win-visibility-change', true);
    });
    mainWindow.on('hide', () => {
      mainWindow.webContents.send('win-visibility-change', false);
    });
    mainWindow.on('minimize', () => {
      mainWindow.webContents.send('win-visibility-change', false);
    });
    mainWindow.on('restore', () => {
      mainWindow.webContents.send('win-visibility-change', true);
    });
  }
}

// 注册文件操作 IPC handlers
export function registerFileHandlers(): void {
  // 监听渲染进程发送的获取文件路径的消息（已废弃）
  ipcMain.on(IPC_CHANNELS.GET_FILE_PATH, (event, data) => {
    console.log('接收到获取文件路径请求（已废弃）:', data);
    console.warn(`${IPC_CHANNELS.GET_FILE_PATH} 接口已废弃，请使用 ${IPC_CHANNELS.DRAG_FILES} 接口`);
  });

  // IPC: receive drag file paths from renderer and process them
  ipcMain.on(IPC_CHANNELS.DRAG_FILES, (event, filePaths) => {
    console.log('接收到拖拽文件路径:', filePaths);
    if (!Array.isArray(filePaths)) return;

    const mainWindow = getMainWindow();

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

  // 打开文件选择对话框
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async () => {
    const mainWindow = getMainWindow();

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      console.log('[OpenFileDialog] 用户取消或没有选择文件');
      return null;
    }

    console.log('[OpenFileDialog] 用户选择的文件:', result.filePaths);

    // 处理每个选择的文件
    for (const filePath of result.filePaths) {
      handleFileAdd(filePath).then(fileInfo => {
        console.log('[OpenFileDialog] 处理后的文件信息:', fileInfo);
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.FILE_ADDED, fileInfo);
          console.log(`[OpenFileDialog] 已发送${IPC_CHANNELS.FILE_ADDED}事件:`, fileInfo.name);
        }
      }).catch(error => {
        console.error('[OpenFileDialog] 处理文件时出错:', error);
      });
    }

    return result.filePaths;
  });

  // 打开输入对话框
  ipcMain.handle('dialog:showInputBox', async (event, options) => {
    const mainWindow = getMainWindow();

    const result = await dialog.showMessageBox(mainWindow!, {
      title: options.title || '输入',
      message: options.label || '请输入:',
      type: 'question',
      buttons: [options.buttonLabel || '确定', '取消'],
      defaultId: 0,
      cancelId: 1,
      // 使用textfield来获取用户输入
      textFieldLabel: options.label || '请输入:',
      textFieldValue: options.value || ''
    });

    if (result.response === 1) {
      console.log('[ShowInputBox] 用户取消输入');
      return null;
    }

    console.log('[ShowInputBox] 用户输入:', result.response);
    return result.textFieldValue;
  });

  // 监听渲染进程发送的打开文件或文件夹的消息
  ipcMain.on(IPC_CHANNELS.OPEN_ITEM, (event, item) => {
    if (!item.path) return;

    console.log('打开项目:', item);
    console.log('项目路径:', item.path);

    const isWindows = process.platform === 'win32';

    if (isWindows) {
      spawn('cmd.exe', ['/c', 'start', '', item.path], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [item.path], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else {
      spawn('xdg-open', [item.path], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    }
  });

  // 获取文件图标
  ipcMain.handle(IPC_CHANNELS.GET_FILE_ICON, async (event, filePath) => {
    try {
      console.log('[GetFileIcon] 处理文件:', filePath);

      const iconNative = await app.getFileIcon(filePath, { size: 'large' });
      const base64 = iconNative.toDataURL();

      console.log('[GetFileIcon] 获取图标成功');
      return {
        success: true,
        icon: base64
      };
    } catch (err) {
      console.error('[GetFileIcon] 获取图标失败:', err);

      try {
        const { nativeImage } = require('electron');
        const icon = nativeImage.createFromPath(filePath);

        if (!icon.isEmpty()) {
          const base64 = icon.toDataURL();
          console.log('[GetFileIcon] 使用 nativeImage 回退成功');
          return {
            success: true,
            icon: base64
          };
        }
      } catch (fallbackErr) {
        console.error('[GetFileIcon] nativeImage 回退失败:', fallbackErr);
      }

      return {
        success: false,
        message: err instanceof Error ? err.message : String(err)
      };
    }
  });
}

// 注册存储相关 IPC handlers
export function registerStorageHandlers(settingsStore: Store, storageStore: Store, backupManager?: any, logger?: any): void {
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (event, { key, storeType }) => {
    if (storeType === 'settings') {
      if (key === 'settings') {
        return settingsStore.store;
      } else {
        return settingsStore.get(key);
      }
    } else {
      if (key === 'storage') {
        return storageStore.store;
      } else {
        return storageStore.get(key);
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.STORE_SET, (event, { key, value, storeType }) => {
    console.log('[IPC] STORE_SET received:', { key, value, storeType });
    if (storeType === 'settings') {
      if (key === 'settings') {
        settingsStore.set(value);
      } else {
        settingsStore.set(key, value);
      }
    } else {
      if (key === 'storage') {
        storageStore.set(value);
      } else {
        storageStore.set(key, value);
      }
    }
    console.log('[IPC] settingsStore after set:', settingsStore.store);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.STORE_DELETE, (event, { key, storeType }) => {
    if (storeType === 'settings') {
      settingsStore.delete(key);
    } else {
      storageStore.delete(key);
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.STORE_CLEAR, (event, storeType) => {
    if (storeType === 'settings') {
      settingsStore.clear();
    } else {
      storageStore.clear();
    }
    return true;
  });

  // 文件系统操作
  ipcMain.handle('fs:exists', (event, path) => {
    return fs.existsSync(path);
  });

  ipcMain.handle('fs:mkdir', (event, path, options) => {
    return fs.mkdirSync(path, options);
  });

  // 应用操作
  ipcMain.handle('app:get-path', (event, name) => {
    return app.getPath(name);
  });

  // 获取网站信息
  ipcMain.handle('get-site-info', async (event, url) => {
    try {
      const https = require('https');
      const urlObj = new URL(url);
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            // 提取title标签内容
            const titleMatch = data.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              resolve({ title: titleMatch[1].trim() });
            } else {
              resolve({ title: null });
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('[GetSiteInfo] 获取网站信息失败:', error);
          resolve({ title: null });
        });
        
        req.end();
      });
    } catch (error) {
      console.error('[GetSiteInfo] 处理网站信息失败:', error);
      return { title: null };
    }
  });

  // 处理数据存储位置选择
  ipcMain.handle('app:set-data-location', async (event, location) => {
    try {
      console.log('[IPC] 接收到数据存储位置选择:', location);
      
      // 根据选择的位置确定数据路径
      let dataPath: string;
      if (location === 'appdata') {
        dataPath = app.getPath('userData');
        console.log('[IPC] 使用 AppData 目录:', dataPath);
      } else if (location === 'current') {
        dataPath = path.join(__dirname, '../../data');
        console.log('[IPC] 使用当前目录:', dataPath);
      } else {
        dataPath = path.join(__dirname, '../../data');
        console.log('[IPC] 使用默认目录:', dataPath);
      }
      
      // 确保数据目录存在
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
        console.log('[IPC] 创建数据目录:', dataPath);
      }
      
      // 保存数据路径到设置
      settingsStore.set('dataPath', location);
      settingsStore.set('hasInitialized', true);
      
      console.log('[IPC] 数据存储位置设置完成:', location);
      return { success: true, dataPath };
    } catch (error) {
      console.error('[IPC] 设置数据存储位置失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 备份相关 IPC handlers
  if (backupManager) {
    ipcMain.handle('backup:create', async (event, type) => {
      try {
        const backupId = await backupManager.createBackup(type || 'manual');
        return { success: true, backupId };
      } catch (error) {
        console.error('[IPC] 创建备份失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('backup:restore', async (event, backupId) => {
      try {
        await backupManager.restoreBackup(backupId);
        return { success: true };
      } catch (error) {
        console.error('[IPC] 恢复备份失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('backup:cleanup', async (event) => {
      try {
        await backupManager.cleanupBackups();
        return { success: true };
      } catch (error) {
        console.error('[IPC] 清理备份失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('backup:getBackups', async (event) => {
      try {
        const backups = backupManager.getBackups();
        return { success: true, backups };
      } catch (error) {
        console.error('[IPC] 获取备份列表失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('backup:setAutoBackupInterval', (event, interval) => {
      try {
        backupManager.setAutoBackupInterval(interval);
        settingsStore.set('autoBackupInterval', interval);
        return { success: true };
      } catch (error) {
        console.error('[IPC] 设置自动备份间隔失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });
  }

  // 日志相关 IPC handlers
  if (logger) {
    ipcMain.handle('logger:clearLogs', async (event) => {
      try {
        await logger.clearLogs();
        logger.info('日志已清理');
        return { success: true };
      } catch (error) {
        console.error('[IPC] 清理日志失败:', error);
        logger.error('清理日志失败', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('logger:setAutoCleanupDays', (event, days) => {
      try {
        logger.setAutoCleanupDays(days);
        settingsStore.set('logAutoCleanupDays', days);
        logger.info('设置日志自动清理天数', { days });
        return { success: true };
      } catch (error) {
        console.error('[IPC] 设置日志自动清理天数失败:', error);
        logger.error('设置日志自动清理天数失败', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('logger:getLogs', async (event) => {
      try {
        const logs = logger.getLogs();
        return { success: true, logs };
      } catch (error) {
        console.error('[IPC] 获取日志失败:', error);
        logger.error('获取日志失败', error);
        return { success: false, error: (error as Error).message };
      }
    });
  }
}