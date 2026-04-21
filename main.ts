import { app } from 'electron';
import Store from 'electron-store';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';

// 导入 electron 模块
import {
  // 存储管理
  ensureDataDir,
  createSettingsStore,
  createStorageStore,

  // 窗口管理
  createMainWindow,
  getMainWindow,

  // IPC 处理
  registerWindowControls,
  registerFileHandlers,
  registerStorageHandlers,

  // 快捷键管理
  setupGlobalDirname,
  registerGlobalShortcut,
  registerShortcutChangeListener,
  setupShortcutCleanup,

  // 自动更新
  configureAutoUpdater,
  registerAutoUpdaterEvents,
  registerAutoUpdaterHandlers,
  checkForUpdatesOnStartup,

  // 文件验证
  initializeFirstLaunch,

  // 备份管理
  BackupManager,

  // 日志管理
  Logger
} from './electron';

// 获取 __dirname
function getDirname(): string {
  const __filename = url.fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

// 主函数
async function main() {
  console.log('[Main] 应用启动');
  console.log('[Main] 运行环境:', app.isPackaged ? '生产环境' : '开发环境');
  console.log('[Main] Electron 版本:', process.versions.electron);
  console.log('[Main] Node 版本:', process.versions.node);

  // 设置全局 __dirname（用于 windows-shortcuts 模块）
  const __dirname = getDirname();
  setupGlobalDirname(__dirname);

  // 确保数据目录存在（临时目录，用于首次启动时的设置存储）
  const tempDataPath = ensureDataDir();
  console.log('[Main] 临时数据目录:', tempDataPath);

  // 创建临时设置存储
  const tempSettingsStore = createSettingsStore(tempDataPath);
  
  // 检查是否已经初始化
  const hasInitialized = tempSettingsStore.get('hasInitialized') as boolean;
  const savedDataPath = tempSettingsStore.get('dataPath') as string | null;
  
  // 确定默认数据路径
  let dataPath = savedDataPath || tempDataPath;
  console.log('[Main] 初始数据目录:', dataPath);

  // 注册窗口控制和文件操作 IPC handlers（这些只需要注册一次）
  registerWindowControls();
  registerFileHandlers();
  console.log('[Main] 基础 IPC handlers 注册完成');

  // 配置自动更新
  configureAutoUpdater('你的GitHub用户名', '你的仓库名');
  registerAutoUpdaterEvents();
  registerAutoUpdaterHandlers();
  console.log('[Main] 自动更新配置完成');

  // 应用就绪后执行
  app.on('ready', async () => {
    try {
      console.log('[Main] 应用 ready');

      // 确定最终数据路径
      let finalDataPath = savedDataPath || tempDataPath;
      console.log('[Main] 初始数据目录:', finalDataPath);

      // 确保数据目录存在
      if (!fs.existsSync(finalDataPath)) {
        try {
          fs.mkdirSync(finalDataPath, { recursive: true });
          console.log('[Main] 创建数据目录:', finalDataPath);
        } catch (mkdirError) {
          console.error('[Main] 创建数据目录失败:', mkdirError);
          // 使用临时路径作为备选
          finalDataPath = tempDataPath;
          console.log('[Main] 使用临时路径作为备选:', finalDataPath);
        }
      }

      // 创建存储
      const settingsStore = createSettingsStore(finalDataPath);
      const storageStore = createStorageStore(finalDataPath);
      
      // 创建备份管理器
      const backupManager = new BackupManager(finalDataPath, storageStore);
      
      // 创建日志管理器
      const logger = new Logger(finalDataPath);
      
      // 设置自动备份
      const autoBackupInterval = settingsStore.get('autoBackupInterval') || '10min';
      backupManager.setAutoBackupInterval(autoBackupInterval);
      
      // 设置日志自动清理
      const logAutoCleanupDays = settingsStore.get('logAutoCleanupDays') || '2';
      logger.setAutoCleanupDays(logAutoCleanupDays);
      
      // 记录应用启动
      logger.info('应用启动', {
        version: app.getVersion(),
        platform: process.platform,
        electron: process.versions.electron,
        node: process.versions.node
      });
      
      // 如果有临时设置，迁移到正式存储
      if (tempSettingsStore.get('dataPath')) {
        settingsStore.set('dataPath', tempSettingsStore.get('dataPath'));
      }
      
      console.log('[Main] 存储初始化完成');

      // 注册存储相关 IPC handlers（只注册一次）
      registerStorageHandlers(settingsStore, storageStore, backupManager, logger);
      console.log('[Main] 存储 IPC handlers 注册完成');

      // 创建窗口
      const mainWindow = createMainWindow();
      console.log('[Main] 主窗口创建完成');

      // 注册快捷键
      registerGlobalShortcut(settingsStore);
      registerShortcutChangeListener(settingsStore);
      setupShortcutCleanup();
      console.log('[Main] 快捷键注册完成');

      // 启动时自动检查更新
      checkForUpdatesOnStartup();

      // 检查是否需要初始化
      if (savedDataPath) {
        await initializeFirstLaunch(settingsStore, storageStore);
        console.log('[Main] 已初始化（有保存的路径）');
      } else {
        // 检查是否为便携版（已打包且数据目录在应用程序目录中）
        const isPortable = app.isPackaged && finalDataPath.includes(path.dirname(app.getPath('exe')));
        if (isPortable) {
          console.log('[Main] 便携版：等待用户选择数据路径后再初始化');
        } else {
          // 非便携版：直接初始化
          await initializeFirstLaunch(settingsStore, storageStore);
          console.log('[Main] 非便携版：使用默认路径初始化');
        }
      }
    } catch (error) {
      console.error('[Main] 应用初始化失败:', error);
      // 即使出错也继续运行，使用默认设置
      try {
        const fallbackDataPath = tempDataPath;
        const fallbackSettingsStore = createSettingsStore(fallbackDataPath);
        const fallbackStorageStore = createStorageStore(fallbackDataPath);
        
        // 创建备份管理器
        const fallbackBackupManager = new BackupManager(fallbackDataPath, fallbackStorageStore);
        const autoBackupInterval = fallbackSettingsStore.get('autoBackupInterval') || '10min';
        fallbackBackupManager.setAutoBackupInterval(autoBackupInterval);
        
        // 创建日志管理器
        const fallbackLogger = new Logger(fallbackDataPath);
        const logAutoCleanupDays = fallbackSettingsStore.get('logAutoCleanupDays') || '2';
        fallbackLogger.setAutoCleanupDays(logAutoCleanupDays);
        
        // 记录应用启动（备用模式）
        fallbackLogger.info('应用启动（备用模式）', {
          version: app.getVersion(),
          platform: process.platform
        });
        
        registerStorageHandlers(fallbackSettingsStore, fallbackStorageStore, fallbackBackupManager, fallbackLogger);
        const mainWindow = createMainWindow();
        registerGlobalShortcut(fallbackSettingsStore);
        registerShortcutChangeListener(fallbackSettingsStore);
        setupShortcutCleanup();
        checkForUpdatesOnStartup();
        
        // 检查是否为便携版（已打包且数据目录在应用程序目录中）
        const isPortable = app.isPackaged && fallbackDataPath.includes(path.dirname(app.getPath('exe')));
        if (!isPortable) {
          // 非便携版：直接初始化
          initializeFirstLaunch(fallbackSettingsStore, fallbackStorageStore).catch(err => {
            console.error('[Main] 备用模式初始化失败:', err);
          });
          console.log('[Main] 非便携版：使用默认路径初始化（备用模式）');
        } else {
          console.log('[Main] 便携版：等待用户选择数据路径后再初始化（备用模式）');
        }
        
        console.log('[Main] 应用已使用默认设置启动');
        
      } catch (fallbackError) {
        console.error('[Main] 备用启动也失败:', fallbackError);
        app.quit();
      }
    }
  });

  // 窗口全部关闭
  app.on('window-all-closed', () => {
    console.log('[Main] 所有窗口已关闭');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 应用激活（macOS）
  app.on('activate', () => {
    console.log('[Main] 应用激活');
    if (getMainWindow() === null) {
      createMainWindow();
    }
  });

  console.log('[Main] 主函数执行完成');
}

// 运行主函数
main().catch((err) => {
  console.error('[Main] 应用启动失败:', err);
  app.quit();
});