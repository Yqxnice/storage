import { useState, useEffect } from 'react'

const win = () => window.electron

function TitleBarWin({ title = '桌面收纳' }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    win()?.window.onMaximizeChange((maximized: boolean) => setIsMaximized(maximized))
    win()?.window.isMaximized().then(setIsMaximized)
  }, [])

  return (
    <div style={styles.winBar}>
      <div style={styles.winLeft}>
        <span style={styles.winAppIcon}>🗂️</span>
        <span style={styles.winTitle}>{title}</span>
      </div>

      <div style={styles.winControls}>
        <WinButton onClick={() => win()?.window.minimize()} title="最小化">
          <IconMinimize />
        </WinButton>

        <WinButton onClick={() => win()?.window.toggleMaximize()} title={isMaximized ? '向下还原' : '最大化'}>
          {isMaximized ? <IconRestore /> : <IconMaximize />}
        </WinButton>

        <WinButton onClick={() => win()?.window.close()} title="关闭" danger>
          <IconClose />
        </WinButton>
      </div>
    </div>
  )
}

function WinButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  const [hovered, setHovered] = useState(false)

  const btnStyle = {
    ...styles.winBtn,
    ...(hovered
      ? danger
        ? styles.winBtnCloseHover
        : styles.winBtnHover
      : {}),
  }

  return (
    <button
      style={btnStyle}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}

function TitleBarMac({ title = '桌面收纳' }: { title?: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={styles.macBar}>
      <div
        style={styles.macDots}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <MacDot color="#ff5f57" hovered={hovered} onClick={() => win()?.window.close()}>
          <svg viewBox="0 0 10 10" width="6" height="6">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#900" strokeWidth="1.5" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="#900" strokeWidth="1.5" />
          </svg>
        </MacDot>
        <MacDot color="#ffbd2e" hovered={hovered} onClick={() => win()?.window.minimize()}>
          <svg viewBox="0 0 10 10" width="6" height="6">
            <line x1="2" y1="5" x2="8" y2="5" stroke="#7a5000" strokeWidth="1.5" />
          </svg>
        </MacDot>
        <MacDot color="#28c840" hovered={hovered} onClick={() => win()?.window.toggleMaximize()}>
          <svg viewBox="0 0 10 10" width="6" height="6">
            <polyline points="3,7 7,3 3,3" fill="none" stroke="#0a5c00" strokeWidth="1.5" />
            <line x1="7" y1="3" x2="7" y2="7" stroke="#0a5c00" strokeWidth="1.5" />
          </svg>
        </MacDot>
      </div>

      <span style={styles.macTitle}>{title}</span>
    </div>
  )
}

function MacDot({ color, hovered, onClick, children }: { color: string; hovered: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button style={{ ...styles.macDot, background: color }} onClick={onClick} tabIndex={-1}>
      <span style={{ opacity: hovered ? 1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </span>
    </button>
  )
}

export default function TitleBar(props: { title?: string }) {
  const platform = window.electron?.platform ?? 'win32'
  return platform === 'darwin'
    ? <TitleBarMac {...props} />
    : <TitleBarWin {...props} />
}

function IconMinimize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 1" fill="currentColor">
      <rect width="10" height="1" />
    </svg>
  )
}

function IconMaximize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  )
}

function IconRestore() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="0.5" width="7.5" height="7.5" />
      <polyline points="0.5,2.5 0.5,9.5 7.5,9.5" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
      <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" />
      <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  winBar: {
    height: 38,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 14,
    borderBottom: '0.5px solid var(--border)',
    background: 'var(--surface)',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    flexShrink: 0,
  },
  winLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  winAppIcon: {
    fontSize: 14,
  },
  winTitle: {
    fontSize: 12,
    color: 'var(--txt3)',
    fontWeight: 500,
  },
  winControls: {
    marginLeft: 'auto',
    display: 'flex',
    height: '100%',
    WebkitAppRegion: 'no-drag',
  },
  winBtn: {
    width: 46,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: 'var(--txt3)',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
    WebkitAppRegion: 'no-drag',
    outline: 'none',
  },
  winBtnHover: {
    background: 'var(--bg)',
    color: 'var(--txt)',
  },
  winBtnCloseHover: {
    background: 'var(--red)',
    color: '#ffffff',
  },
  macBar: {
    height: 38,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 14,
    borderBottom: '0.5px solid var(--border)',
    background: 'var(--surface)',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    flexShrink: 0,
    position: 'relative',
  },
  macDots: {
    display: 'flex',
    gap: 7,
    WebkitAppRegion: 'no-drag',
  },
  macDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitAppRegion: 'no-drag',
    transition: 'opacity 0.1s',
    outline: 'none',
  },
  macTitle: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    color: '#b0b7c3',
    fontWeight: 500,
    pointerEvents: 'none',
  },
}