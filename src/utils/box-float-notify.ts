import { emit } from '@tauri-apps/api/event'

export const BOX_FLOAT_ITEMS_RELOAD = 'box-float-items-reload'

export function emitBoxFloatItemsReload(boxId: string): void {
  void emit(BOX_FLOAT_ITEMS_RELOAD, { boxId })
}
