import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';
import { getMainWindow } from './window';

// 配置 GitHub 更新源
export function configureAutoUpdater(owner: string, repo: string): void {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: owner,
    repo: repo
  });
  console.log('[Updater] 配置更新源:', owner, repo);
}

// 注册自动更新事件监听器
export function registerAutoUpdaterEvents(): void {
  // 错误处理
  autoUpdater.on('error', (err) => {
    console.error('[Updater] 更新错误:', err.message);
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send('update-error', err.message);
  });

  // 检测到有可用更新
  autoUpdater.on('update-available', () => {
    console.log('[Updater] 发现可用更新');
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send('update-found');
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] 没有可用更新');
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send('update-not-found');
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] 更新下载完成');
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send('update-ready');
  });

  console.log('[Updater] 自动更新事件监听器已注册');
}

// 注册自动更新 IPC 处理程序
export function registerAutoUpdaterHandlers(): void {
  // 手动检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      console.log('[Updater] 开始检查更新');
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (e) {
      console.error('[Updater] 检查更新失败:', e);
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  // 安装更新并重启
  ipcMain.handle('install-update', async () => {
    console.log('[Updater] 安装更新并重启');
    autoUpdater.quitAndInstall();
  });
}

// 启动时自动检查更新
export function checkForUpdatesOnStartup(): void {
  setTimeout(() => {
    console.log('[Updater] 启动时自动检查更新');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Updater] 自动检查更新失败:', err);
    });
  }, 2000);
}
