import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';
import { app } from 'electron';

export interface BackupItem {
  id: string;
  name: string;
  timestamp: number;
  type: 'auto' | 'manual';
  data: any;
}

export class BackupManager {
  private backupDir: string;
  private storageStore: Store;
  private autoBackupInterval: NodeJS.Timeout | null = null;

  constructor(dataPath: string, storageStore: Store) {
    this.backupDir = path.join(dataPath, 'backups');
    this.storageStore = storageStore;
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('[Backup] Created backup directory:', this.backupDir);
    }
  }

  async createBackup(type: 'auto' | 'manual' = 'manual'): Promise<string> {
    try {
      const storageData = this.storageStore.store;
      
      const backup: BackupItem = {
        id: this.generateBackupId(),
        name: type === 'auto' ? `自动备份 ${new Date().toLocaleString()}` : `手动备份 ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        type,
        data: storageData
      };

      const backupFilePath = path.join(this.backupDir, `${backup.id}.json`);
      fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));

      console.log('[Backup] Created backup:', backup.name, 'at', backupFilePath);
      return backup.id;
    } catch (error) {
      console.error('[Backup] Failed to create backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    try {
      let backupFilePath: string;
      
      if (backupId === 'latest') {
        // Get the latest backup
        const backups = this.getBackups();
        if (backups.length === 0) {
          throw new Error('No backups available');
        }
        const latestBackup = backups.sort((a, b) => b.timestamp - a.timestamp)[0];
        backupFilePath = path.join(this.backupDir, `${latestBackup.id}.json`);
      } else {
        backupFilePath = path.join(this.backupDir, `${backupId}.json`);
      }

      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Backup file not found');
      }

      const backupContent = fs.readFileSync(backupFilePath, 'utf8');
      const backup: BackupItem = JSON.parse(backupContent);

      // Restore the backup data
      this.storageStore.set(backup.data);
      console.log('[Backup] Restored backup:', backup.name);
    } catch (error) {
      console.error('[Backup] Failed to restore backup:', error);
      throw error;
    }
  }

  async cleanupBackups(): Promise<void> {
    try {
      const backupFiles = fs.readdirSync(this.backupDir);
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        fs.unlinkSync(filePath);
      }

      console.log('[Backup] Cleaned up all backups');
    } catch (error) {
      console.error('[Backup] Failed to cleanup backups:', error);
      throw error;
    }
  }

  getBackups(): BackupItem[] {
    try {
      const backupFiles = fs.readdirSync(this.backupDir);
      const backups: BackupItem[] = [];

      for (const file of backupFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.backupDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          try {
            const backup = JSON.parse(content) as BackupItem;
            backups.push(backup);
          } catch (parseError) {
            console.warn('[Backup] Failed to parse backup file:', file, parseError);
          }
        }
      }

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[Backup] Failed to get backups:', error);
      return [];
    }
  }

  setAutoBackupInterval(interval: string): void {
    // Clear existing interval
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }

    // Set new interval
    const intervalMs = this.getIntervalMs(interval);
    if (intervalMs > 0) {
      this.autoBackupInterval = setInterval(async () => {
        try {
          await this.createBackup('auto');
        } catch (error) {
          console.error('[Backup] Auto backup failed:', error);
        }
      }, intervalMs);
      console.log('[Backup] Set auto backup interval:', interval);
    } else {
      console.log('[Backup] Auto backup disabled');
    }
  }

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '5min':
        return 5 * 60 * 1000;
      case '10min':
        return 10 * 60 * 1000;
      case '30min':
        return 30 * 60 * 1000;
      case '1hour':
        return 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private generateBackupId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  dispose(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
  }
}
