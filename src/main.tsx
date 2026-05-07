import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MessageProvider } from './components/common'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

// 防止白屏的加载显示机制
function RootApp() {
  useEffect(() => {
    // 显示窗口和内容的完整流程
    const showWindowAndContent = async () => {
      try {
        const appWindow = getCurrentWebviewWindow()
        
        // 先显示窗口
        await appWindow.show()
        await appWindow.setFocus()
        
        // 然后显示内容，确保DOM完全渲染
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
        // 降级方案：直接显示内容
        const root = document.getElementById('root')
        if (root) {
          root.classList.add('loaded')
        }
      }
    }

    // 执行显示流程
    showWindowAndContent()
  }, [])

  return (
    <StrictMode>
      <MessageProvider>
        <App />
      </MessageProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<RootApp />)
