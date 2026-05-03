import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { closeBoxFloatMenuWindow } from './box-float-menu-window'
import { floatLabelFromFloatWindowId } from './box-float-labels'

/** 关闭收纳盒悬浮窗及其菜单子窗（不修改收纳盒数据） */
export async function destroyBoxFloatWebviews(floatWindowId: string): Promise<void> {
  await closeBoxFloatMenuWindow(floatWindowId)
  const label = floatLabelFromFloatWindowId(floatWindowId)
  const w = await WebviewWindow.getByLabel(label)
  if (w) {
    try {
      await w.close()
    } catch {
      // ignore
    }
  }
}
