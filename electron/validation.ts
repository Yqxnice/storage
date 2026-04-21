import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';

// 扫描桌面文件和文件夹
export async function scanDesktop(): Promise<Array<{
  name: string;
  category: 'desktop' | 'web';
  type?: 'file' | 'folder' | 'icon';
  path: string;
  addedAt: number;
}>> {
  const desktopPath = app.getPath('desktop');
  const items: Array<{
    name: string;
    category: 'desktop' | 'web';
    type?: 'file' | 'folder' | 'icon';
    path: string;
    addedAt: number;
  }> = [];

  try {
    const files = fs.readdirSync(desktopPath);

    for (const file of files) {
      // 跳过隐藏文件和系统文件
      if (file.startsWith('.') || file === 'desktop.ini') {
        continue;
      }

      const filePath = path.join(desktopPath, file);

      try {
        const stat = fs.statSync(filePath);

        // 只收集快捷方式、文件夹和可执行文件
        if (file.endsWith('.lnk') || file.endsWith('.exe') || stat.isDirectory()) {
          const originalName = file;
          const name = processFileName(originalName);

          let type: 'file' | 'folder' | 'icon' = 'file';
          if (file.endsWith('.lnk')) {
            type = 'icon';
          } else if (!path.extname(file)) {
            type = 'folder';
          }

          items.push({
            name,
            category: 'desktop',
            type,
            path: filePath,
            addedAt: Date.now()
          });
        }
      } catch (err) {
        console.warn(`[Validation] 无法访问文件: ${filePath}`, err);
      }
    }

    console.log(`[Validation] 扫描到 ${items.length} 个桌面项目`);
  } catch (err) {
    console.error('[Validation] 扫描桌面失败:', err);
  }

  return items;
}

// 智能处理文件名
function processFileName(fileName: string): string {
  let processedName = fileName;

  const commonExtensions = ['.lnk', '.exe', '.bat', '.cmd', '.msi', '.app', '.dmg'];

  for (const ext of commonExtensions) {
    if (processedName.toLowerCase().endsWith(ext.toLowerCase())) {
      processedName = processedName.substring(0, processedName.length - ext.length);
      break;
    }
  }

  const separators = ['-', '_', '.'];
  for (const sep of separators) {
    const index = processedName.indexOf(sep);
    if (index > 0) {
      processedName = processedName.substring(0, index);
      break;
    }
  }

  return processedName.trim();
}

// 生成唯一 ID
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 6);
  }
  // 回退方案
  return Math.random().toString(36).substring(2, 8);
}

// 验证存储中的文件是否存在，不存在则自动删除
export async function validateStoredFiles(storageStore: Store): Promise<void> {
  const storageData = storageStore.store as {
    items: Array<{ id: string; path: string; boxId: string }>;
    boxes: Array<{ id: string; name: string; itemCount: number }>;
  } | undefined;

  if (!storageData || !storageData.items) {
    return;
  }

  console.log('[Validation] 开始检查存储中的文件有效性...');
  const invalidItems: string[] = [];

  for (const item of storageData.items) {
    if (!item.path) {
      invalidItems.push(item.id);
      continue;
    }

    const exists = fs.existsSync(item.path);
    if (!exists) {
      console.log(`[Validation] 文件不存在，已删除: ${item.path}`);
      invalidItems.push(item.id);
    }
  }

  if (invalidItems.length > 0) {
    // 移除不存在的文件
    const validItems = storageData.items.filter((item) => !invalidItems.includes(item.id));

    // 更新收纳盒的文件数量
    const updatedBoxes = storageData.boxes.map((box) => ({
      ...box,
      itemCount: validItems.filter((item) => item.boxId === box.id).length
    }));

    // 保存更新后的数据
    storageStore.set({ ...storageData, items: validItems, boxes: updatedBoxes });
    console.log(`[Validation] 已删除 ${invalidItems.length} 个失效文件`);
  } else {
    console.log('[Validation] 所有文件都有效');
  }
}

// 初始化首次启动
export async function initializeFirstLaunch(
  settingsStore: Store,
  storageStore: Store
): Promise<void> {
  const hasInitialized = settingsStore.get('hasInitialized') as boolean;

  if (!hasInitialized) {
    console.log('[Init] 首次启动，正在初始化...');

    // 扫描桌面
    const desktopItems = await scanDesktop();

    // 创建初始收纳数据
    const boxId = generateId();
    const initialStorageData = {
      boxes: [
        {
          id: boxId,
          name: '桌面文件',
          itemCount: desktopItems.length,
          createdAt: Date.now()
        }
      ],
      items: desktopItems.map((item, index) => ({
        ...item,
        id: generateId(),
        boxId: boxId,
        clickCount: 0
      })),
      activeBoxId: boxId
    };

    // 保存初始收纳数据
    storageStore.set(initialStorageData);

    // 标记已初始化
    settingsStore.set('hasInitialized', true);

    console.log(`[Init] 初始化完成，已添加 ${desktopItems.length} 个桌面项目`);
    console.log('[Init] 收纳盒:', initialStorageData.boxes[0].name, '- 文件数:', initialStorageData.boxes[0].itemCount);
  } else {
    console.log('[Init] 非首次启动，跳过初始化');
    // 非首次启动时验证文件有效性
    await validateStoredFiles(storageStore);
  }
}
