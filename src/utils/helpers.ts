// 通用工具函数

export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 6);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function isValidPathOrUrl(path: string): boolean {
  try {
    new URL(path);
    return true;
  } catch {
    const illegalChars = /[<>:"|?*]/;
    if (illegalChars.test(path)) {
      return false;
    }
    const isAbsolutePath = /^[a-zA-Z]:\\|^\\|^\//.test(path);
    const isRelativePath = /^[.\\/].*/.test(path);
    return isAbsolutePath || isRelativePath;
  }
}

export function validateNonEmpty(value: string, msg: string): void {
  if (!value || value.trim() === '') {
    throw new Error(msg);
  }
}

export function validateCommand(command: string): void {
  if (!command || typeof command !== 'string' || command.trim() === '') {
    throw new Error('IPC调用失败：command必须是非空字符串');
  }
}

export function handleError(error: unknown, context: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`${context} 失败: ${errorMessage}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

export function safeJsonStringify(obj: unknown, space?: string | number): string {
  try {
    return JSON.stringify(obj, null, space);
  } catch {
    return '';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
