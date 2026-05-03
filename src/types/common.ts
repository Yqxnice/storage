// 通用类型定义

export interface FileInfo {
  name: string;
  category: string;
  type: string;
  path: string;
  targetBoxId?: string;
}

export interface DialogInputOptions {
  title?: string;
  placeholder?: string;
  value?: string;
}

export interface FsMkdirOptions {
  recursive?: boolean;
}

export type PlatformType = 'win32' | 'darwin' | 'linux';

export type ThemeType = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'dark';
