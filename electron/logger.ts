import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
}

export class Logger {
  private logDir: string;
  private autoCleanupDays: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dataPath: string) {
    this.logDir = path.join(dataPath, 'logs');
    this.autoCleanupDays = 2; // Default: 2 days
    this.ensureLogDir();
    this.setupAutoCleanup();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log('[Logger] Created log directory:', this.logDir);
    }
  }

  private getLogFilePath(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return path.join(this.logDir, `${dateStr}.log`);
  }

  private setupAutoCleanup(): void {
    // Run cleanup every day at midnight
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
    
    // Run cleanup once on startup
    this.cleanupOldLogs();
  }

  private cleanupOldLogs(): void {
    try {
      const cutoffTime = Date.now() - (this.autoCleanupDays * 24 * 60 * 60 * 1000);
      const logFiles = fs.readdirSync(this.logDir);
      
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            console.log('[Logger] Deleted old log file:', file);
          }
        }
      }
    } catch (error) {
      console.error('[Logger] Error cleaning up old logs:', error);
    }
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details
    };

    const logFilePath = this.getLogFilePath();
    const logLine = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(logFilePath, logLine);
      console.log(`[${level.toUpperCase()}] ${message}`, details);
    } catch (error) {
      console.error('[Logger] Error writing to log file:', error);
    }
  }

  info(message: string, details?: any): void {
    this.log('info', message, details);
  }

  warn(message: string, details?: any): void {
    this.log('warn', message, details);
  }

  error(message: string, details?: any): void {
    this.log('error', message, details);
  }

  debug(message: string, details?: any): void {
    this.log('debug', message, details);
  }

  async clearLogs(): Promise<void> {
    try {
      const logFiles = fs.readdirSync(this.logDir);
      
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          fs.unlinkSync(filePath);
        }
      }

      console.log('[Logger] Cleared all log files');
    } catch (error) {
      console.error('[Logger] Error clearing logs:', error);
      throw error;
    }
  }

  setAutoCleanupDays(days: string | number): void {
    this.autoCleanupDays = parseInt(days.toString(), 10);
    console.log('[Logger] Set auto cleanup days:', this.autoCleanupDays);
    // Run cleanup immediately with new settings
    this.cleanupOldLogs();
  }

  getLogs(): LogEntry[] {
    try {
      const logs: LogEntry[] = [];
      const logFiles = fs.readdirSync(this.logDir);
      
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line) as LogEntry;
              logs.push(entry);
            } catch (parseError) {
              console.warn('[Logger] Failed to parse log line:', line, parseError);
            }
          }
        }
      }

      // Sort by timestamp descending
      return logs.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[Logger] Error getting logs:', error);
      return [];
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
