import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo, listen } from '@tauri-apps/api/event'
import { compactFloatWindowId } from '../utils/box-float-labels'
import { logDebug, logError } from '../utils/logger'
import './menu-float-styles.css'

const EVENT_ACTION = 'box-float-menu-action'
const EVENT_CLOSED = 'box-float-menu-did-close'

interface MenuParams {
  parentLabel?: string
  boxId?: string
  floatWindowId?: string
}

function readParamsFromUrl(): MenuParams {
  const q = new URLSearchParams(window.location.search)
  return {
    parentLabel: q.get('parentLabel')?.trim() || undefined,
    boxId: q.get('boxId')?.trim() || undefined,
    floatWindowId: q.get('floatWindowId')?.trim() 
      ? compactFloatWindowId(q.get('floatWindowId')!.trim())
      : undefined,
  }
}

function RootApp() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      // 菜单窗口比较特殊，由外部控制显示，这里只做内容淡入
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.add('loaded')
        })
      })
    }
  }, [])

  return <MenuFloatApp />
}

const MenuFloatApp: React.FC = () => {
  const [params, setParams] = useState<MenuParams>(readParamsFromUrl())
  const isClosing = useRef(false)

  useEffect(() => {
    const unlistenPromise = listen('menu-params-update', (event) => {
      logDebug('收到菜单参数更新:', event.payload)
      setParams(prev => ({
        ...prev,
        ...(event.payload as MenuParams)
      }))
    })

    return () => {
      unlistenPromise.then(unlisten => unlisten?.())
    }
  }, [])

  useEffect(() => {
    let unlistenFn: (() => void) | null = null
    
    const setupListener = async () => {
      unlistenFn = await listen('tauri://window-focused', async () => {
        if (isClosing.current) {
          return
        }
        
        // 注意：tauri://window-focused 事件可能不可靠，
        // 我们主要依赖外部（悬浮窗）来控制菜单的显示/隐藏
      })
    }

    setupListener()

    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [])

  const closeMenu = async () => {
    if (isClosing.current) return
    isClosing.current = true
    
    try {
      logDebug('开始关闭菜单')
      await notifyClosed()
      
      const win = getCurrentWebviewWindow()
      await win.hide()
      logDebug('菜单已隐藏')
    } catch (err) {
      logError('关闭菜单失败:', err)
    } finally {
      setTimeout(() => {
        isClosing.current = false
      }, 300)
    }
  }

  const notifyClosed = async () => {
    if (!params.parentLabel) return
    try {
      await emitTo(params.parentLabel, EVENT_CLOSED)
    } catch {
      // 忽略
    }
  }

  const act = async (payload: { 
    action: 'set-view'
    mode: 'list' | 'grid'
  } | { 
    action: 'delete-float'
    boxId: string
    floatWindowId: string
  }) => {
    if (!params.parentLabel) return
    
    try {
      await emitTo(params.parentLabel, EVENT_ACTION, payload)
    } catch {
      // 忽略
    }
    
    await closeMenu()
  }

  const hasValidParams = params.parentLabel && params.boxId && params.floatWindowId

  if (!hasValidParams) {
    return (
      <div className="bfm-root">
        <div className="bfm-card" style={{ padding: 12, fontSize: 12, color: '#888' }}>
          等待参数...
        </div>
      </div>
    )
  }

  return (
    <div className="bfm-root">
      <div className="bfm-card">
        <div className="bfm-sep" />
        <button 
          type="button" 
          className="bfm-row bfm-row-danger" 
          onClick={() => act({ 
            action: 'delete-float', 
            boxId: params.boxId!, 
            floatWindowId: params.floatWindowId!
          })}
        >
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
    </React.StrictMode>
  )
}
