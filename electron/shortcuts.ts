import { globalShortcut, ipcMain, app } from 'electron';
import Store from 'electron-store';
import { getMainWindow, showMainWindow, hideMainWindow, toggleMainWindowVisibility } from './window';

// 为 windows-shortcuts 模块设置全局 __dirname
export function setupGlobalDirname(__dirname: string): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__dirname = __dirname;
  } else if (typeof global !== 'undefined') {
    (global as any).__dirname = __dirname;
  } else if (typeof window !== 'undefined') {
    (window as any).__dirname = __dirname;
  }
}

// 验证快捷键格式
function validateShortcut(shortcut: string): boolean {
  if (!shortcut) return false;
  
  const parts = shortcut.split('+');
  if (parts.length < 2) return false; // 至少需要一个修饰键和一个普通键
  
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  
  // 验证修饰键
  const validModifiers = ['Ctrl', 'Shift', 'Alt', 'Meta'];
  for (const mod of modifiers) {
    if (!validModifiers.includes(mod)) return false;
  }
  
  // 验证修饰键不重复
  const uniqueModifiers = [...new Set(modifiers)];
  if (uniqueModifiers.length !== modifiers.length) return false;
  
  // 验证普通键
  const invalidKeys = ['Control', 'Shift', 'Alt', 'Meta'];
  if (invalidKeys.includes(key)) return false;
  
  return true;
}

// 注册全局快捷键
export function registerGlobalShortcut(settingsStore: Store): void {
  try {
    const shortcuts = settingsStore.get('shortcuts', { toggleApp: 'Ctrl+Shift+Space' });
    console.log('[Shortcut] 从store读取的shortcuts:', shortcuts);
    let toggleAppShortcut = shortcuts.toggleApp || 'Ctrl+Shift+Space';

    // 验证快捷键格式
    if (!validateShortcut(toggleAppShortcut)) {
      console.warn('[Shortcut] 无效的快捷键格式:', toggleAppShortcut);
      toggleAppShortcut = 'Ctrl+Shift+Space';
      console.log('[Shortcut] 使用默认快捷键:', toggleAppShortcut);
      // 保存默认快捷键回store
      settingsStore.set('shortcuts', { toggleApp: toggleAppShortcut });
    }

    console.log('[Shortcut] 注册快捷键:', toggleAppShortcut);

    // 先取消所有快捷键
    globalShortcut.unregisterAll();
    console.log('[Shortcut] 已注销所有快捷键');

    // 注册新的快捷键
    const ret = globalShortcut.register(toggleAppShortcut, () => {
      console.log('[Shortcut] 快捷键触发');
      toggleMainWindowVisibility();
    });

    if (!ret) {
      console.log('[Shortcut] 快捷键注册失败');
    } else {
      console.log(`[Shortcut] 快捷键注册成功: ${toggleAppShortcut}`);
    }
  } catch (error) {
    console.error('[Shortcut] 注册快捷键时出错:', error);
    // 使用默认快捷键作为后备
    console.log('[Shortcut] 使用默认快捷键: Ctrl+Shift+Space');
    globalShortcut.unregisterAll();
    const ret = globalShortcut.register('Ctrl+Shift+Space', () => {
      console.log('[Shortcut] 默认快捷键触发');
      toggleMainWindowVisibility();
    });
    if (ret) {
      console.log('[Shortcut] 默认快捷键注册成功');
    }
  }
}

// 监听设置变化，重新注册快捷键
export function registerShortcutChangeListener(settingsStore: Store): void {
  console.log('[Shortcut] 注册settings:changed事件监听器');
  ipcMain.on('settings:changed', () => {
    console.log('[Shortcut] 收到settings:changed事件，重新注册快捷键');
    registerGlobalShortcut(settingsStore);
  });
}

// 注销所有快捷键
export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  console.log('[Shortcut] 所有快捷键已注销');
}

// 在应用退出时注销快捷键
export function setupShortcutCleanup(): void {
  app.on('will-quit', () => {
    unregisterAllShortcuts();
  });
}
