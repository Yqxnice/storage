import { invoke } from '@tauri-apps/api/core'

export const BOX_FLOAT_ITEMS_RELOAD = 'box-float-items-reload'

export async function emitBoxFloatItemsReload(boxId: string): Promise<void> {
  try {
    await invoke('emit_float_items_reload', { boxId })
  } catch (error) {
    console.error('Failed to emit float items reload event:', error)
  }
}
