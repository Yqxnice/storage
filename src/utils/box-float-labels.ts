/** 无主悬浮窗菜单 URL 中的占位 boxId（非真实收纳盒 id） */
export const BOXFLOAT_ORPHAN_MENU_BOX_ID = '__orphan__'

/** UUID 压缩为仅用于 Tauri webview label 的片段 - 取前6位无连接符格式 */
export function compactFloatWindowId(floatWindowId: string): string {
  // 移除所有连接符，然后取前6位
  const noHyphens = floatWindowId.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, '')
  return noHyphens.substring(0, 6)
}

export function floatLabelFromFloatWindowId(floatWindowId: string): string {
  return `box_float_${compactFloatWindowId(floatWindowId)}`
}

export function floatMenuLabelFromFloatWindowId(floatWindowId: string): string {
  return `box_float_menu_${compactFloatWindowId(floatWindowId)}`
}

/** 生成6位无连接符的 floatWindowId */
export function generateShortFloatWindowId(): string {
  const uuid = crypto.randomUUID()
  return compactFloatWindowId(uuid)
}
