export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: unknown) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    invoke: (channel: string, data?: unknown) => Promise<unknown>;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
  };
  getFileIcon: (filePath: string) => Promise<{
    success: boolean;
    icon?: string;
    message?: string;
  }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
