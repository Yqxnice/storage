import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import BoxFloatApp from './BoxFloatApp.tsx'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import './styles.css'

// 添加防闪烁机制的包装组件
function RootApp() {
  useEffect(() => {
    const showWindowAndContent = async () => {
      try {
        const appWindow = getCurrentWebviewWindow()
        
        // 先显示窗口
        await appWindow.show()
        await appWindow.setFocus()
        
        // 然后显示内容
        const root = document.getElementById('root')
        if (root) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              root.classList.add('loaded')
            })
          })
        }
      } catch (e) {
        console.error('显示窗口失败:', e)
        // 降级方案
        const root = document.getElementById('root')
        if (root) {
          root.classList.add('loaded')
        }
      }
    }

    showWindowAndContent()
  }, [])

  return <BoxFloatApp />
}

try {
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    const msg = '找不到 #root'
    console.error(msg)
    document.body.innerHTML = `<pre style="padding:12px;font-size:12px;color:#c00">${msg}</pre>`
  } else {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RootApp />
      </React.StrictMode>,
    )
  }
} catch (e) {
  const err = e instanceof Error ? e.message : String(e)
  console.error('启动异常', e)
  document.body.innerHTML = `<pre style="padding:12px;font-size:12px;color:#c00;white-space:pre-wrap">FATAL\n${err}\n\n打开开发者工具查看完整堆栈。</pre>`
}
