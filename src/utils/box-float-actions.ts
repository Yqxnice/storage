import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit } from '@tauri-apps/api/event'
import type { Box, Item, OrphanBoxFloat } from '../types'
import { useStorageStore } from '../store'
import { tauriIPC } from './tauri-ipc'
import { floatLabelFromFloatWindowId, BOXFLOAT_ORPHAN_MENU_BOX_ID, generateShortFloatWindowId, compactFloatWindowId } from './box-float-labels'
import { closeBoxFloatMenuWindow, preloadBoxFloatMenuForFloat } from './box-float-menu-window'
import { emitBoxFloatItemsReload } from './box-float-notify'
import { logError } from './logger'
import { storageManager } from './storage-manager'

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

export async function persistBoxFloatMeta(boxId: string, floatWindowId: string | null): Promise<void> {
  await storageManager.update({
    type: 'updateBox',
    payload: { id: boxId, updates: { floatWindowId } },
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

export async function restoreOrphanBoxFloatWindows(): Promise<void> {
  await storageManager.init()
  const storageData = storageManager.getState()
  const orphans = storageData.orphanBoxFloats
  
  if (!Array.isArray(orphans) || orphans.length === 0) return
  
  for (const o of orphans) {
    if (!o?.floatWindowId) continue
    const label = floatLabelFromFloatWindowId(o.floatWindowId)
    const existing = await WebviewWindow.getByLabel(label)
    if (existing) continue
    try {
      await createWebviewForOrphanFloat(o.floatWindowId, o.title || 'Welcome')
    } catch {
    }
  }
}

export async function bindOrphanFloatToNewBox(
  floatWindowId: string,
  paths: string[],
): Promise<{ newBoxId: string; newBoxName: string }> {
  await storageManager.init()
  
  const firstPath = paths[0]
  const firstBase = firstPath ? basenameFs(firstPath) : '新收纳盒'
  let firstKind = 'file'
  if (firstPath) {
    firstKind = await tauriIPC.pathItemKind(firstPath)
  }
  const newBoxName = stripExtension(firstBase, firstKind) || '新收纳盒'

  const newBoxId = await storageManager.update({
    type: 'addBox',
    payload: { name: newBoxName, floatWindowId },
  }).then(result => {
    return result.boxes[result.boxes.length - 1].id
  })

  const newItems: Omit<Item, 'id' | 'addedAt'>[] = []
  for (const path of paths) {
    const name = basenameFs(path)
    const kind = await tauriIPC.pathItemKind(path)
    newItems.push({
      name,
      category: 'desktop',
      type: kind === 'folder' ? 'folder' : 'file',
      path,
      boxId: newBoxId,
      clickCount: 0,
    })
  }

  for (const item of newItems) {
    await storageManager.update({
      type: 'addItem',
      payload: item,
    })
  }

  const currentState = storageManager.getState()
  const orphans = currentState.orphanBoxFloats.filter((o) => o.floatWindowId !== floatWindowId)
  await storageManager.update({
    type: 'updateOrphans',
    payload: orphans,
  })

  await emit('box-float-meta-changed', { boxId: newBoxId, floatWindowId })
  await emitBoxFloatItemsReload(newBoxId)

  return { newBoxId, newBoxName }
}

export async function persistBoxDisplayName(boxId: string, name: string): Promise<void> {
  const trimmed = name.trim() || '未命名'
  await storageManager.update({
    type: 'updateBox',
    payload: { id: boxId, updates: { name: trimmed } },
  })
  await emit('box-float-storage-updated')
}

export async function persistOrphanFloatTitle(floatWindowId: string, title: string): Promise<void> {
  const trimmed = title.trim() || 'Welcome'
  const currentState = storageManager.getState()
  const orphans = currentState.orphanBoxFloats.map((o) =>
    o.floatWindowId === floatWindowId ? { ...o, title: trimmed } : o,
  )
  await storageManager.update({
    type: 'updateOrphans',
    payload: orphans,
  })
  await emit('box-float-storage-updated')
}

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

    win.close().catch(() => {})
    
    setTimeout(() => {
      try {
        win.close().catch(() => {})
      } catch {}
    }, 100)
  } catch (e) {
    logError('关闭窗口时出错:', e)
    win.close().catch(() => {})
  }
}