import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import BoxFloatApp from './BoxFloatApp.tsx'
import './styles.css'

const LOG = '[box-float]'

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

  return <BoxFloatApp />
}

try {
  console.log(`${LOG} Step1 模块执行`, {
    href: window.location.href,
    search: window.location.search,
    hasRoot: !!document.getElementById('root'),
  })

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    const msg = `${LOG} Step1 失败: 找不到 #root`
    console.error(msg)
    document.body.innerHTML = `<pre style="padding:12px;font-size:12px;color:#c00">${msg}</pre>`
  } else {
    console.log(`${LOG} Step2 开始 createRoot / render`)
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RootApp />
      </React.StrictMode>,
    )
    console.log(`${LOG} Step3 createRoot.render 已调用（子组件 effect 稍后异步执行）`)
  }
} catch (e) {
  const err = e instanceof Error ? e.message : String(e)
  console.error(`${LOG} FATAL 启动异常`, e)
  document.body.innerHTML = `<pre style="padding:12px;font-size:12px;color:#c00;white-space:pre-wrap">[box-float] FATAL\n${err}\n\n打开开发者工具查看完整堆栈。</pre>`
}
