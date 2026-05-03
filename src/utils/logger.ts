/**
 * 统一的日志工具
 * 用于控制日志输出级别，避免内容溢出
 */

/**
 * 日志级别定义
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * 当前日志级别
 * 可根据需要调整，例如：
 * - 开发环境: INFO 或 DEBUG
 * - 生产环境: ERROR
 */
const CURRENT_LOG_LEVEL = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

/**
 * 是否启用控制台输出
 */
const ENABLE_CONSOLE = import.meta.env.DEV;

/**
 * 输出日志
 * @param level 日志级别
 * @param args 日志内容
 */
export function logMessage(level: LogLevel, ...args: any[]): void {
  const levelNum = LOG_LEVELS[level];
  if (levelNum >= CURRENT_LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    if (ENABLE_CONSOLE) {
      console.log(`[${timestamp}] [${level}]`, ...args);
    }
  }
}

/**
 * 快捷方法 - 调试日志
 */
export function logDebug(...args: any[]): void {
  logMessage('DEBUG', ...args);
}

/**
 * 快捷方法 - 信息日志
 */
export function logInfo(...args: any[]): void {
  logMessage('INFO', ...args);
}

/**
 * 快捷方法 - 警告日志
 */
export function logWarn(...args: any[]): void {
  logMessage('WARN', ...args);
}

/**
 * 快捷方法 - 错误日志
 */
export function logError(...args: any[]): void {
  logMessage('ERROR', ...args);
}
