import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo, TauriEvent } from '@tauri-apps/api/event'
import { compactFloatWindowId } from '../utils/box-float-labels'
import './menu-float-styles.css'

const EVENT_ACTION = 'box-float-menu-action'
const EVENT_CLOSED = 'box-float-menu-did-close'

function readParams(): { parentLabel: string; boxId: string; floatWindowId: string } {
  const q = new URLSearchParams(window.location.search)
  const rawFloatWindowId = q.get('floatWindowId')?.trim() || ''
  return {
    parentLabel: q.get('parentLabel')?.trim() || '',
    boxId: q.get('boxId')?.trim() || '',
    floatWindowId: rawFloatWindowId ? compactFloatWindowId(rawFloatWindowId) : '',
  }
}

const IconList: React.FC = () => (
  <svg className="bfm-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <path fill="currentColor" d="M2 3.5h12v1H2zm0 4h12v1H2zm0 4h8v1H2z" />
  </svg>
)

const IconGrid: React.FC = () => (
  <svg className="bfm-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <path fill="currentColor" d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z" />
  </svg>
)

// 添加防闪烁机制的包装组件
function RootApp() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      requestAnimationFrame(() => {
        root.classList.add('loaded')
      })
    }
  }, [])

  return <MenuFloatApp />
}

const MenuFloatApp: React.FC = () => {
  const { parentLabel, boxId, floatWindowId } = readParams()
  const blurUnlisten = useRef<(() => void) | null>(null)

  // 全局阻止原生右键菜单
  useEffect(() => {
    const preventDefaultContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventDefaultContextMenu);
    return () => {
      document.removeEventListener('contextmenu', preventDefaultContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!parentLabel) return undefined
    const win = getCurrentWebviewWindow()
    const t = window.setTimeout(() => {
      void (async () => {
        blurUnlisten.current = await win.listen(TauriEvent.WINDOW_BLUR, () => {
          void (async () => {
            try {
              await emitTo(parentLabel, EVENT_CLOSED)
            } catch {
              // ignore
            }
            win.close().catch(() => {})
          })()
        })
      })()
    }, 120)
    return () => {
      window.clearTimeout(t)
      blurUnlisten.current?.()
      blurUnlisten.current = null
    }
  }, [parentLabel])

  const notifyClosed = async () => {
    try {
      await emitTo(parentLabel, EVENT_CLOSED)
    } catch {
      // ignore
    }
  }

  const act = async (payload: { action: 'set-view'; mode: 'list' | 'grid' } | { action: 'delete-float'; boxId: string; floatWindowId: string }) => {
    if (!parentLabel) return
    try {
      // 直接使用固定事件名，通过 emitTo 定向到目标窗口
      await emitTo(parentLabel, EVENT_ACTION, payload)
    } catch {
      // ignore
    }
    await notifyClosed()
    getCurrentWebviewWindow().close().catch(() => {})
  }

  if (!parentLabel || !boxId) {
    return (
      <div className="bfm-root">
        <div className="bfm-card" style={{ padding: 12, fontSize: 12, color: '#888' }}>
          参数无效
        </div>
      </div>
    )
  }

  return (
    <div className="bfm-root">
      <div className="bfm-card">
        <div className="bfm-sep" />
        <button type="button" className="bfm-row bfm-row-danger" onClick={() => void act({ action: 'delete-float', boxId, floatWindowId })}>
          <span className="bfm-trash" aria-hidden />
          <span>删除悬浮窗</span>
        </button>
      </div>
    </div>
  )
}

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootApp />
    </React.StrictMode>,
  )
}
