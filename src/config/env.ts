// 环境变量配置

import { APP_INFO } from '../constants';

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_DEBUG: boolean;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME || APP_INFO.NAME,
  appVersion: import.meta.env.VITE_APP_VERSION || APP_INFO.VERSION,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
} as const;
