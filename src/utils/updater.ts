import { check, install, DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { logInfo, logError } from './logger';

export interface UpdateInfo {
  version: string;
  body: string;
  date: string;
  downloadUrl: string;
}

export interface UpdateProgress {
  total: number;
  current: number;
  percent: number;
}

export class Updater {
  private static instance: Updater;
  private onProgress: (progress: UpdateProgress) => void = () => {};
  private onStatusChange: (status: 'checking' | 'available' | 'downloading' | 'installing' | 'completed' | 'error') => void = () => {};

  public static getInstance(): Updater {
    if (!Updater.instance) {
      Updater.instance = new Updater();
    }
    return Updater.instance;
  }

  public setOnProgress(callback: (progress: UpdateProgress) => void) {
    this.onProgress = callback;
  }

  public setOnStatusChange(callback: (status: 'checking' | 'available' | 'downloading' | 'installing' | 'completed' | 'error') => void) {
    this.onStatusChange = callback;
  }

  public async checkForUpdate(): Promise<UpdateInfo | null> {
    try {
      logInfo('正在检查更新...');
      this.onStatusChange('checking');
      
      const update = await check();
      if (!update) {
        logInfo('当前已是最新版本');
        return null;
      }

      logInfo(`发现新版本: ${update.version}`);
      this.onStatusChange('available');

      return {
        version: update.version,
        body: update.body || '',
        date: update.date,
        downloadUrl: '',
      };
    } catch (error) {
      logError('检查更新失败:', error);
      this.onStatusChange('error');
      return null;
    }
  }

  public async downloadAndInstall(): Promise<boolean> {
    try {
      logInfo('开始下载更新...');
      this.onStatusChange('downloading');

      const update = await check();
      if (!update) {
        logInfo('没有可用的更新');
        return false;
      }

      const downloader = await update.downloadAndInstall();
      
      let currentLen = 0;
      downloader.onDownloadProgress((event: DownloadEvent) => {
        if (event.event === 'Progress') {
          currentLen += event.data;
          const total = event.total;
          const percent = Math.round((currentLen / total) * 100);
          
          logInfo(`下载进度: ${percent}%`);
          this.onProgress({
            total,
            current: currentLen,
            percent,
          });
        }
      });

      await downloader;
      logInfo('更新下载和安装完成');
      this.onStatusChange('completed');
      return true;
    } catch (error) {
      logError('更新失败:', error);
      this.onStatusChange('error');
      return false;
    }
  }

  public async restartApp(): Promise<void> {
    try {
      logInfo('正在重启应用...');
      await relaunch();
    } catch (error) {
      logError('重启失败:', error);
    }
  }
}
