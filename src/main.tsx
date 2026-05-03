import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MessageProvider } from './components/common'

// 防止白屏的加载显示机制
function RootApp() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      requestAnimationFrame(() => {
        root.classList.add('loaded')
      })
    }
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
