import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit } from '@tauri-apps/api/event'
import type { Box, Item, OrphanBoxFloat } from '../store'
import { useStorageStore } from '../store'
import { tauriIPC } from './tauri-ipc'
import { floatLabelFromFloatWindowId, BOXFLOAT_ORPHAN_MENU_BOX_ID, generateShortFloatWindowId, compactFloatWindowId } from './box-float-labels'
import { closeBoxFloatMenuWindow, preloadBoxFloatMenuForFloat } from './box-float-menu-window'
import { emitBoxFloatItemsReload } from './box-float-notify'
import { logError } from './logger'

const VITE_DEV_PORT = 3000

export function buildBoxFloatUrl(boxId: string, floatWindowId: string, boxName: string): string {
  const params = new URLSearchParams({
    boxId,
    floatWindowId: compactFloatWindowId(floatWindowId),
    boxName: boxName || '收纳盒',
  })
  const qs = params.toString()
  if (import.meta.env.DEV) {
    return `http://localhost:${VITE_DEV_PORT}/box-float.html?${qs}`
  }
  return `box-float.html?${qs}`
}

export function buildOrphanBoxFloatUrl(floatWindowId: string, boxName: string): string {
  const params = new URLSearchParams({
    orphan: '1',
    floatWindowId: compactFloatWindowId(floatWindowId),
    boxName: boxName || 'Welcome',
  })
  const qs = params.toString()
  if (import.meta.env.DEV) {
    return `http://localhost:${VITE_DEV_PORT}/box-float.html?${qs}`
  }
  return `box-float.html?${qs}`
}

function basenameFs(p: string): string {
  const s = p.replace(/\\/g, '/')
  const i = s.lastIndexOf('/')
  return i >= 0 ? s.slice(i + 1) : s
}

function stripExtension(name: string, kind: string): string {
  if (kind === 'folder') return name
  const dot = name.lastIndexOf('.')
  if (dot > 0) return name.slice(0, dot)
  return name
}

/** 写入磁盘并广播，供主窗口与其它 Webview 同步「收纳盒 ↔ 悬浮窗 id」 */
export async function persistBoxFloatMeta(boxId: string, floatWindowId: string | null): Promise<void> {
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object' || !('boxes' in raw)) {
    return
  }
  const payload = raw as {
    boxes: Box[]
    items: Item[]
    activeBoxId: string | null
    orphanBoxFloats?: OrphanBoxFloat[]
  }
  const orphanBoxFloats = Array.isArray(payload.orphanBoxFloats) ? payload.orphanBoxFloats : []
  const newBoxes = payload.boxes.map((b) => {
    if (b.id !== boxId) return b
    if (floatWindowId == null) {
      const { floatWindowId: _drop, ...rest } = b
      return rest as Box
    }
    return { ...b, floatWindowId }
  })
  await tauriIPC.store.set({
    key: 'storage',
    value: {
      boxes: newBoxes,
      items: payload.items,
      activeBoxId: payload.activeBoxId,
      orphanBoxFloats,
    },
    storeType: 'storage',
  })
  await emit('box-float-meta-changed', { boxId, floatWindowId })
}

async function waitWebviewCreated(win: WebviewWindow): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ms = 20_000
    const t = window.setTimeout(() => {
      reject(new Error(`收纳盒悬浮窗创建超时（${ms}ms）`))
    }, ms)
    const done = () => window.clearTimeout(t)
    win.once('tauri://created', () => {
      done()
      resolve()
    })
    win.once('tauri://error', (e) => {
      done()
      reject(
        new Error(
          `收纳盒悬浮窗创建失败: ${typeof e === 'object' && e !== null && 'payload' in e ? JSON.stringify((e as { payload: unknown }).payload) : String(e)}`,
        ),
      )
    })
  })
}

interface CreateWebviewOptions {
  label: string
  url: string
  title: string
  floatWindowId: string
  boxId?: string
}

async function createWebview(options: CreateWebviewOptions): Promise<void> {
  const { label, url, title, floatWindowId, boxId } = options
  
  const win = new WebviewWindow(label, {
    url,
    title,
    width: 300,
    height: 440,
    minWidth: 260,
    minHeight: 52,
    maxWidth: 500,
    maxHeight: 600,
    resizable: true,
    maximizable: false,
    minimizable: false,
    closable: false,
    alwaysOnTop: !import.meta.env.DEV,
    transparent: true,
    backgroundColor: '#ffffff',
    decorations: false,
    shadow: true,
    skipTaskbar: true,
    center: true,
    visible: false,
  })
  
  preloadBoxFloatMenuForFloat(floatWindowId, boxId, label).catch(() => {})
  
  await waitWebviewCreated(win)
}

async function createWebviewForFloat(
  boxId: string,
  boxName: string,
  floatWindowId: string,
): Promise<void> {
  const label = floatLabelFromFloatWindowId(floatWindowId)
  const url = buildBoxFloatUrl(boxId, floatWindowId, boxName)
  
  await createWebview({
    label,
    url,
    title: boxName,
    floatWindowId,
    boxId,
  })
}

async function createWebviewForOrphanFloat(floatWindowId: string, title: string): Promise<void> {
  const label = floatLabelFromFloatWindowId(floatWindowId)
  const url = buildOrphanBoxFloatUrl(floatWindowId, title)
  
  await createWebview({
    label,
    url,
    title: title || 'Welcome',
    floatWindowId,
  })
}

/** 主窗口：新建悬浮窗 id、写入状态与磁盘并打开 */
export async function openNewBoxFloatWindow(boxId: string, boxName: string): Promise<void> {
  const floatWindowId = generateShortFloatWindowId()
  useStorageStore.getState().setBoxFloatWindowId(boxId, floatWindowId)
  try {
    await persistBoxFloatMeta(boxId, floatWindowId)
    await createWebviewForFloat(boxId, boxName, floatWindowId)
  } catch (e) {
    useStorageStore.getState().setBoxFloatWindowId(boxId, null)
    await persistBoxFloatMeta(boxId, null)
    throw e
  }
}

/**
 * 主窗口：创建无主收纳盒悬浮窗（标题默认 Welcome，不预建收纳盒）。
 * 可多次调用：每次新的 `floatWindowId`（6位格式），标题可相同。
 */
export async function createBlankOrphanFloatWindow(): Promise<void> {
  const floatWindowId = generateShortFloatWindowId()
  useStorageStore.getState().addOrphanBoxFloat({ floatWindowId, title: 'Welcome' })
  try {
    await createWebviewForOrphanFloat(floatWindowId, 'Welcome')
  } catch (e) {
    useStorageStore.getState().removeOrphanBoxFloat(floatWindowId)
    throw e
  }
}

/** 启动后恢复磁盘里记录的无主悬浮窗（进程重启后 Webview 已不存在则重建） */
export async function restoreOrphanBoxFloatWindows(): Promise<void> {
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object') return
  const orphans = (raw as { orphanBoxFloats?: OrphanBoxFloat[] }).orphanBoxFloats
  if (!Array.isArray(orphans) || orphans.length === 0) return
  for (const o of orphans) {
    if (!o?.floatWindowId) continue
    const label = floatLabelFromFloatWindowId(o.floatWindowId)
    const existing = await WebviewWindow.getByLabel(label)
    if (existing) continue
    try {
      await createWebviewForOrphanFloat(o.floatWindowId, o.title || 'Welcome')
    } catch {
      // 忽略单窗失败，避免阻塞其它恢复
    }
  }
}

/** 无主悬浮窗首次拖入文件：新建收纳盒、绑定 floatWindowId、写入条目并通知主窗 */
export async function bindOrphanFloatToNewBox(
  floatWindowId: string,
  paths: string[],
): Promise<{ newBoxId: string; newBoxName: string }> {
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object' || !('boxes' in raw)) {
    throw new Error('无法读取存储')
  }
  const payload = raw as {
    boxes: Box[]
    items: Item[]
    activeBoxId: string | null
    orphanBoxFloats?: OrphanBoxFloat[]
  }
  const boxes = Array.isArray(payload.boxes) ? payload.boxes : []
  const items = Array.isArray(payload.items) ? payload.items : []
  const orphans = Array.isArray(payload.orphanBoxFloats) ? payload.orphanBoxFloats : []
  const nextOrphans = orphans.filter((o) => o.floatWindowId !== floatWindowId)

  const newBoxId = crypto.randomUUID().replace(/-/g, '').substring(0, 6)
  const firstPath = paths[0]
  const firstBase = firstPath ? basenameFs(firstPath) : '新收纳盒'
  let firstKind = 'file'
  if (firstPath) {
    firstKind = await tauriIPC.pathItemKind(firstPath)
  }
  const newBoxName = stripExtension(firstBase, firstKind) || '新收纳盒'

  const newBox: Box = {
    id: newBoxId,
    name: newBoxName,
    itemCount: 0,
    createdAt: Date.now(),
    floatWindowId,
  }

  const newItems: Item[] = [...items]
  for (const path of paths) {
    const name = basenameFs(path)
    const kind = await tauriIPC.pathItemKind(path)
    const dup = newItems.some((i) => i.path === path && i.boxId === newBoxId)
    if (dup) continue
    newItems.push({
      id: crypto.randomUUID().replace(/-/g, '').substring(0, 6),
      name,
      category: 'desktop',
      type: kind === 'folder' ? 'folder' : 'file',
      path,
      boxId: newBoxId,
      addedAt: Date.now(),
      clickCount: 0,
    })
  }

  const count = newItems.filter((i) => i.boxId === newBoxId).length
  newBox.itemCount = count

  await tauriIPC.store.set({
    key: 'storage',
    value: {
      boxes: [...boxes, newBox],
      items: newItems,
      activeBoxId: payload.activeBoxId,
      orphanBoxFloats: nextOrphans,
    },
    storeType: 'storage',
  })

  await emit('box-float-meta-changed', { boxId: newBoxId, floatWindowId })
  await emit('box-float-storage-updated')
  emitBoxFloatItemsReload(newBoxId)

  return { newBoxId, newBoxName: newBox.name }
}

/** 悬浮窗内：修改收纳盒名称并写盘（主窗通过 box-float-storage-updated 同步） */
export async function persistBoxDisplayName(boxId: string, name: string): Promise<void> {
  const trimmed = name.trim() || '未命名'
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object' || !('boxes' in raw)) {
    return
  }
  const payload = raw as {
    boxes: Box[]
    items: Item[]
    activeBoxId: string | null
    orphanBoxFloats?: OrphanBoxFloat[]
  }
  const orphanBoxFloats = Array.isArray(payload.orphanBoxFloats) ? payload.orphanBoxFloats : []
  const newBoxes = payload.boxes.map((b) => (b.id === boxId ? { ...b, name: trimmed } : b))
  await tauriIPC.store.set({
    key: 'storage',
    value: {
      boxes: newBoxes,
      items: payload.items,
      activeBoxId: payload.activeBoxId,
      orphanBoxFloats,
    },
    storeType: 'storage',
  })
  await emit('box-float-storage-updated')
}

/** 悬浮窗内：修改无主悬浮窗标题并写盘（仅 orphanBoxFloats[].title） */
export async function persistOrphanFloatTitle(floatWindowId: string, title: string): Promise<void> {
  const trimmed = title.trim() || 'Welcome'
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object' || !('boxes' in raw)) {
    return
  }
  const payload = raw as {
    boxes: Box[]
    items: Item[]
    activeBoxId: string | null
    orphanBoxFloats?: OrphanBoxFloat[]
  }
  const orphans = Array.isArray(payload.orphanBoxFloats) ? payload.orphanBoxFloats : []
  const next = orphans.map((o) =>
    o.floatWindowId === floatWindowId ? { ...o, title: trimmed } : o,
  )
  await tauriIPC.store.set({
    key: 'storage',
    value: {
      boxes: payload.boxes,
      items: payload.items,
      activeBoxId: payload.activeBoxId,
      orphanBoxFloats: next,
    },
    storeType: 'storage',
  })
  await emit('box-float-storage-updated')
}

/** 主窗口：已有 id 时聚焦；若窗口已丢则清 id 并重新创建 */
export async function reopenBoxFloatWindow(boxId: string, boxName: string, floatWindowId: string): Promise<void> {
  const label = floatLabelFromFloatWindowId(floatWindowId)
  const existing = await WebviewWindow.getByLabel(label)
  if (existing) {
    await existing.show()
    await existing.setFocus()
    return
  }
  await persistBoxFloatMeta(boxId, null)
  useStorageStore.getState().setBoxFloatWindowId(boxId, null)
  await openNewBoxFloatWindow(boxId, boxName)
}

/**
 * 悬浮窗内：关闭本窗口。
 * - 已绑定收纳盒：清除该盒的 floatWindowId（不删收纳盒）
 * - 无主悬浮窗：从 orphan 列表移除
 */
export async function closeFloatWindowAndClear(menuOrUrlBoxId: string): Promise<void> {
  const q = new URLSearchParams(window.location.search)
  const fid = q.get('floatWindowId')?.trim()
  const urlOrphan = q.get('orphan') === '1'
  const win = getCurrentWebviewWindow()

  try {
    if (fid) {
      await closeBoxFloatMenuWindow(fid)
    }

    if (urlOrphan || menuOrUrlBoxId === BOXFLOAT_ORPHAN_MENU_BOX_ID) {
      if (fid) {
        useStorageStore.getState().removeOrphanBoxFloat(fid)
      }
    } else if (menuOrUrlBoxId && menuOrUrlBoxId !== BOXFLOAT_ORPHAN_MENU_BOX_ID) {
      await persistBoxFloatMeta(menuOrUrlBoxId, null)
    }

    // 立即关闭窗口，不等待
    win.close().catch(() => {})
    
    // 确保进程被清理
    setTimeout(() => {
      try {
        win.close().catch(() => {})
      } catch {}
    }, 100)
  } catch (e) {
    logError('关闭窗口时出错:', e)
    // 即使出错也要尝试关闭
    win.close().catch(() => {})
  }
}
