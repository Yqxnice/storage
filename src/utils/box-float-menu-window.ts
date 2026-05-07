import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/window'
import { floatLabelFromFloatWindowId, floatMenuLabelFromFloatWindowId, compactFloatWindowId } from './box-float-labels'

const VITE_DEV_PORT = 3000

const MENU_WIDTH = 184
const MENU_HEIGHT = 228

function buildMenuUrl(parentLabel: string, boxId: string, floatWindowId: string): string {
  const params = new URLSearchParams({ parentLabel, boxId, floatWindowId: compactFloatWindowId(floatWindowId) })
  const qs = params.toString()
  if (import.meta.env.DEV) {
    return `http://localhost:${VITE_DEV_PORT}/box-float-menu.html?${qs}`
  }
  return `box-float-menu.html?${qs}`
}

async function waitWebviewCreated(win: WebviewWindow): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ms = 20_000
    const t = window.setTimeout(() => reject(new Error('菜单窗创建超时')), ms)
    const done = () => window.clearTimeout(t)
    win.once('tauri://created', () => {
      done()
      resolve()
    })
    win.once('tauri://error', (e) => {
      done()
      reject(
        new Error(
          typeof e === 'object' && e !== null && 'payload' in e
            ? JSON.stringify((e as { payload: unknown }).payload)
            : String(e),
        ),
      )
    })
  })
}

/**
 * 根据主收纳盒悬浮窗内锚点（⋯ 按钮）在屏幕逻辑坐标下打开菜单小窗。
 */
export async function openBoxFloatMenuWindow(args: {
  floatWindowId: string
  boxId: string
  anchorEl: HTMLElement
}): Promise<void> {
  const parentLabel = floatLabelFromFloatWindowId(args.floatWindowId)
  const menuLabel = floatMenuLabelFromFloatWindowId(args.floatWindowId)
  const rect = args.anchorEl.getBoundingClientRect()
  const win = getCurrentWebviewWindow()
  const innerPos = await win.innerPosition()
  const sf = await win.scaleFactor()
  const innerLeftLogical = innerPos.x / sf
  const innerTopLogical = innerPos.y / sf
  const menuLeftLogical = innerLeftLogical + rect.right - MENU_WIDTH
  const menuTopLogical = innerTopLogical + rect.bottom + 4

  const url = buildMenuUrl(parentLabel, args.boxId, args.floatWindowId)
  const existing = await WebviewWindow.getByLabel(menuLabel)

  // 如果存在现有窗口，尝试复用
  if (existing) {
    try {
      // 设置新位置
      await existing.setPosition(new LogicalPosition(Math.round(menuLeftLogical), Math.round(menuTopLogical)))
      await existing.setSize(new LogicalSize(MENU_WIDTH, MENU_HEIGHT))
      
      // 显示并聚焦
      await existing.show()
      await existing.setFocus()
      
      return
    } catch {
      // 如果复用失败，就关闭窗口然后重新创建
      try {
        await existing.close()
      } catch {
        // 忽略
      }
    }
  }

  // 创建新的菜单窗口
  const created = new WebviewWindow(menuLabel, {
    url,
    parent: parentLabel,
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    x: Math.round(menuLeftLogical),
    y: Math.round(menuTopLogical),
    decorations: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    visible: true,
    focus: true,
    shadow: false,
  })
  // 等待窗口创建完成
  await waitWebviewCreated(created)
}

export async function closeBoxFloatMenuWindow(floatWindowId: string): Promise<void> {
  const label = floatMenuLabelFromFloatWindowId(floatWindowId)
  const w = await WebviewWindow.getByLabel(label)
  if (w) {
    try {
      await w.close()
    } catch {
      // ignore
    }
  }
}

/** 若菜单窗已打开则关闭并返回 true，否则返回 false（由调用方再打开） */
export async function tryCloseBoxFloatMenuWindow(floatWindowId: string): Promise<boolean> {
  const label = floatMenuLabelFromFloatWindowId(floatWindowId)
  const w = await WebviewWindow.getByLabel(label)
  if (!w) return false
  try {
    const vis = await w.isVisible()
    if (!vis) return false
    await w.close()
    return true
  } catch {
    return false
  }
}

/**
 * 预加载菜单（空操作，保留兼容性）
 * @deprecated 此方法已废弃，保留仅用于兼容旧代码
 */
export async function preloadBoxFloatMenus(): Promise<void> {
}

/**
 * 为悬浮窗预加载菜单（空操作，保留兼容性）
 * @deprecated 此方法已废弃，保留仅用于兼容旧代码
 * @param floatWindowId - 悬浮窗 ID
 * @param boxId - 收纳盒 ID（可选）
 * @param parentLabel - 父窗口标签（可选）
 */
export async function preloadBoxFloatMenuForFloat(
  _floatWindowId: string,
  _boxId?: string,
  _parentLabel?: string
): Promise<void> {
}
