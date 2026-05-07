import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize } from '@tauri-apps/api/window'
import { listen, emit } from '@tauri-apps/api/event'
import type { Item, Box } from '../store'
import { tauriIPC } from '../utils/tauri-ipc'
import {
  bindOrphanFloatToNewBox,
  buildBoxFloatUrl,
  closeFloatWindowAndClear,
  persistBoxDisplayName,
  persistOrphanFloatTitle,
} from '../utils/box-float-actions'
import { BOXFLOAT_ORPHAN_MENU_BOX_ID, compactFloatWindowId } from '../utils/box-float-labels'
import { openBoxFloatMenuWindow, closeBoxFloatMenuWindow, tryCloseBoxFloatMenuWindow } from '../utils/box-float-menu-window'
import { BOX_FLOAT_ITEMS_RELOAD } from '../utils/box-float-notify'
import { logDebug, logInfo, logError } from '../utils/logger'
import { formatFileSize } from '../utils/helpers'
import { useSortable } from '../hooks'

const IconChevronUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
)

const IconChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)

const MENU_ACTION = 'box-float-menu-action'
const MENU_CLOSED = 'box-float-menu-did-close'

type MenuActionPayload =
  | { action: 'set-view'; mode: 'list' | 'grid' }
  | { action: 'delete-float'; boxId: string; floatWindowId: string }

function readParams(): {
  boxId: string | null
  floatWindowId: string | null
  boxName: string
  isOrphan: boolean
} {
  const q = new URLSearchParams(window.location.search)
  const rawFloatWindowId = q.get('floatWindowId')?.trim()
  return {
    boxId: q.get('boxId')?.trim() || null,
    floatWindowId: rawFloatWindowId ? compactFloatWindowId(rawFloatWindowId) : null,
    boxName: q.get('boxName')?.trim() || '',
    isOrphan: q.get('isOrphan') === 'true',
  }
}

const FileIcon: React.FC<{ item: Item }> = ({ item }) => {
  if (item.category === 'web' && item.icon) {
    return (
      <div className="item-ico" style={{ background: 'var(--accent-bg)' }}>
        <img src={item.icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
      </div>
    )
  }

  if (item.category === 'web') {
    return (
      <div className="item-ico" style={{ background: 'var(--accent-bg)' }}>
        🔗
      </div>
    )
  }

  switch (item.type) {
    case 'folder':
      return (
        <div className="item-ico" style={{ background: 'var(--green-bg)' }}>
          📁
        </div>
      )
    case 'icon':
      return (
        <div className="item-ico" style={{ background: 'var(--accent-bg)' }}>
          🔗
        </div>
      )
    default:
      return (
        <div className="item-ico" style={{ background: 'var(--amber-bg)' }}>
          📄
        </div>
      )
  }
}

const IconGrid: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={active ? 'bf-icon-active' : ''}>
    <path
      fill="currentColor"
      d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z"
    />
  </svg>
)

const IconList: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={active ? 'bf-icon-active' : ''}>
    <path
      fill="currentColor"
      d="M2 2h12v2H2zm0 4h12v2H2zm0 4h12v2H2zm0 4h12v2H2z"
    />
  </svg>
)

const BoxFloatApp: React.FC = () => {
  const init = readParams()
  const [boxId] = useState<string | null>(init.boxId)
  const [floatWindowId] = useState<string | null>(init.floatWindowId)
  const [isOrphan] = useState(init.isOrphan)
  const [titleName, setTitleName] = useState(
    init.isOrphan ? init.boxName || 'Welcome' : init.boxName || '收纳盒',
  )
  const [boxColor, setBoxColor] = useState<string | undefined>(undefined)
  const [items, setItems] = useState<Item[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [menuOpen, setMenuOpen] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(true)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const editingTitleRef = useRef(false)
  const headerRef = useRef<HTMLElement>(null)
  const lastExpandedLogicalH = useRef(440)
  const lastContentExpanded = useRef<boolean | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteBoxId, setPendingDeleteBoxId] = useState<string | null>(null)

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
    editingTitleRef.current = editingTitle
  }, [editingTitle])

  useEffect(() => {
    const name = titleName || '收纳盒'
    try {
      const window = getCurrentWebviewWindow()
      window.setTitle(name)
    } catch (error) {
      logError('设置窗口标题失败:', error)
    }
  }, [titleName])

  const reloadTitleFromStorage = useCallback(async () => {
    const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
    if (!raw || typeof raw !== 'object') return
    if (isOrphan && floatWindowId) {
      const orphans = (raw as { orphanBoxFloats?: { floatWindowId: string; title: string }[] }).orphanBoxFloats
      const o = Array.isArray(orphans) ? orphans.find((x) => x.floatWindowId === floatWindowId) : undefined
      if (o?.title) setTitleName(o.title)
      return
    }
    if (!boxId) return
    const boxes = (raw as { boxes: Box[] }).boxes
    const b = Array.isArray(boxes) ? boxes.find((x) => x.id === boxId) : undefined
    if (b?.name) setTitleName(b.name)
    if (b?.color !== undefined) setBoxColor(b.color)
  }, [boxId, floatWindowId, isOrphan])

  useEffect(() => {
    if (isOrphan) {
      if (!floatWindowId) return
    } else if (!boxId) {
      return
    }
    let cancelled = false
    void (async () => {
      await reloadTitleFromStorage()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [boxId, isOrphan, floatWindowId, reloadTitleFromStorage])

  useEffect(() => {
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen('box-float-storage-updated', (event) => {
        if (cancelled || editingTitleRef.current) return;
        const payload = event.payload as { boxId?: string };
        if (payload.boxId && payload.boxId !== boxId) return;
        void reloadTitleFromStorage();
      });
      
      if (cancelled) {
        unlisten();
        return;
      }
      unlistenFn = unlisten;
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      } else if (unlistenFn instanceof Promise) {
        unlistenFn.then(fn => fn()).catch(logError);
      }
    };
  }, [boxId, isOrphan, reloadTitleFromStorage])

  useEffect(() => {
    if (!editingTitle) return
    const id = window.requestAnimationFrame(() => {
      const el = titleInputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [editingTitle])

  const loadItemsForBox = async (boxId: string): Promise<Item[]> => {
    const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
    if (!raw || typeof raw !== 'object') return []
    const items = (raw as { items: Item[] }).items || []
    return items.filter((item) => item.boxId === boxId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  const refreshItems = useCallback(async (id: string) => {
    setLoadError(null)
    try {
      const next = await loadItemsForBox(id)
      setItems(next)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLoadError(msg)
      setItems([])
    }
  }, [])

  useEffect(() => {
    if (isOrphan) return
    if (!boxId) return
    refreshItems(boxId)
  }, [boxId, isOrphan, refreshItems])

  useEffect(() => {
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen(BOX_FLOAT_ITEMS_RELOAD, (event) => {
        if (cancelled) return;
        const payload = event.payload as { boxId?: string };
        if (!payload.boxId || payload.boxId !== boxId) return;
        void refreshItems(payload.boxId);
      });

      if (cancelled) {
        unlisten();
        return;
      }
      unlistenFn = unlisten;
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      } else if (unlistenFn instanceof Promise) {
        unlistenFn.then(fn => fn()).catch(logError);
      }
    };
  }, [boxId, isOrphan, refreshItems])

  useEffect(() => {
    if (!isOrphan || !floatWindowId) return;
    
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen<{ paths: string[] }>('tauri://drag-drop', (e) => {
        if (cancelled) return;
        const paths = (e.payload as { paths?: string[] })?.paths;
        if (!paths?.length) {
          return;
        }
        
        logInfo('检测到拖入文件，准备创建新收纳盒');
        void (async () => {
          try {
            const { newBoxId, newBoxName } = await bindOrphanFloatToNewBox(floatWindowId, paths);
            logInfo('绑定成功');
            window.location.replace(buildBoxFloatUrl(newBoxId, floatWindowId, newBoxName));
          } catch (err) {
            logError('绑定收纳盒失败:', err);
          }
        })();
      });
      
      if (cancelled) {
        unlisten();
        return;
      }
      unlistenFn = unlisten;
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      } else if (unlistenFn instanceof Promise) {
        unlistenFn.then(fn => fn()).catch(logError);
      }
    };
  }, [isOrphan, floatWindowId])

  useEffect(() => {
    let unA: (() => void) | Promise<(() => void)> | null = null
    let unC: (() => void) | Promise<(() => void)> | null = null
    let cancelled = false
    
    void (async () => {
      const unlistenA = await listen<MenuActionPayload>(MENU_ACTION, (e) => {
        if (cancelled) return
        const p = e.payload
        if (p.action === 'set-view') {
          setViewMode(p.mode)
          setMenuOpen(false)
          return
        }
        if (p.action === 'delete-float') {
          const isForMe = (p.floatWindowId === floatWindowId)
          if (!isForMe) return
          setPendingDeleteBoxId(p.boxId || BOXFLOAT_ORPHAN_MENU_BOX_ID)
          setShowDeleteConfirm(true)
          setMenuOpen(false)
        }
      })
      if (cancelled) {
        unlistenA()
        return
      }
      unA = unlistenA
      
      const unlistenC = await listen(MENU_CLOSED, () => {
        if (cancelled) return
        setMenuOpen(false)
      })
      if (cancelled) {
        unlistenC()
        return
      }
      unC = unlistenC
    })()
    
    return () => {
      cancelled = true
      if (typeof unA === 'function') unA()
      else if (unA instanceof Promise) unA.then(fn => fn()).catch(logError)
      if (typeof unC === 'function') unC()
      else if (unC instanceof Promise) unC.then(fn => fn()).catch(logError)
    }
  }, [boxId, floatWindowId, isOrphan])

  useEffect(() => {
    if (!menuOpen || !floatWindowId) return
    
    const handleClickOutside = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const moreButton = moreBtnRef.current
      
      if (moreButton && (target === moreButton || moreButton.contains(target))) {
        return
      }
      
      try {
        await closeBoxFloatMenuWindow(floatWindowId)
        setMenuOpen(false)
      } catch (err) {
        logDebug('点击关闭菜单时出错:', err)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpen, floatWindowId])

  useLayoutEffect(() => {
    if (lastContentExpanded.current === null) {
      lastContentExpanded.current = contentExpanded
      return
    }
    if (lastContentExpanded.current === contentExpanded) {
      return
    }
    lastContentExpanded.current = contentExpanded
    const id = window.setTimeout(async () => {
      try {
        const win = getCurrentWebviewWindow()
        const inner = await win.innerSize()
        const sf = await win.scaleFactor()
        const logicalW = Math.max(Math.round(inner.width / sf), 200)
        const headerH = headerRef.current?.offsetHeight ?? 48
        const h = contentExpanded ? Math.max(lastExpandedLogicalH.current, headerH + 160) : headerH
        await win.setSize(new LogicalSize(logicalW, h))
      } catch {
      }
    }, 280)
    return () => window.clearTimeout(id)
  }, [contentExpanded])

  useEffect(() => {
    if (contentExpanded || !floatWindowId) return
    void (async () => {
      await closeBoxFloatMenuWindow(floatWindowId)
      setMenuOpen(false)
    })()
  }, [contentExpanded, floatWindowId])

  const toggleContentExpanded = () => {
    if (!contentExpanded) {
      const win = getCurrentWebviewWindow()
      void (async () => {
        const inner = await win.innerSize()
        const sf = await win.scaleFactor()
        lastExpandedLogicalH.current = Math.max(Math.round(inner.height / sf), 440)
      })()
    }
    setContentExpanded(!contentExpanded)
  }

  const toggleMoreMenu = async () => {
    if (!floatWindowId || !moreBtnRef.current) return
    const menuBoxId = isOrphan ? BOXFLOAT_ORPHAN_MENU_BOX_ID : boxId
    if (!menuBoxId) return
    
    if (menuOpen) {
      const wasClosed = await tryCloseBoxFloatMenuWindow(floatWindowId)
      if (wasClosed) {
        setMenuOpen(false)
      }
      return
    }
    
    try {
      await openBoxFloatMenuWindow({
        floatWindowId,
        boxId: menuBoxId,
        anchorEl: moreBtnRef.current,
      })
      setMenuOpen(true)
    } catch (err) {
      logError('打开菜单失败:', err)
    }
  }

  const handleItemClick = (item: Item) => {
    const itemPath = item.category === 'web' ? item.url : item.path
    if (itemPath) {
      tauriIPC.openItem(itemPath).catch((error) => {
        logError('打开项目失败:', error)
      })
    }
  }

  const removeFileExtension = (name: string, type?: string) => {
    if (type === 'folder') return name
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex > 0) {
      return name.substring(0, lastDotIndex)
    }
    return name
  }

  const displayTitle = titleName.trim() || (isOrphan ? 'Welcome' : '未命名')

  const beginEditTitle = () => {
    setDraftTitle(titleName)
    setEditingTitle(true)
  }

  const cancelEditTitle = () => {
    setEditingTitle(false)
    setDraftTitle('')
  }

  const commitTitle = async () => {
    if (!editingTitleRef.current) return
    const next = draftTitle.trim() || (isOrphan ? 'Welcome' : '未命名')
    if (next === titleName.trim()) {
      setEditingTitle(false)
      setDraftTitle('')
      return
    }
    if (isOrphan && !floatWindowId) {
      setEditingTitle(false)
      setDraftTitle('')
      return
    }
    if (!isOrphan && !boxId) {
      setEditingTitle(false)
      setDraftTitle('')
      return
    }
    setEditingTitle(false)
    setDraftTitle('')
    try {
      if (isOrphan && floatWindowId) {
        await persistOrphanFloatTitle(floatWindowId, next)
      } else if (boxId) {
        await persistBoxDisplayName(boxId, next)
      }
      setTitleName(next)
    } catch (err) {
      logError('保存标题失败:', err)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteBoxId) return
    try {
      await closeFloatWindowAndClear(pendingDeleteBoxId)
    } catch (err) {
      logError('关闭悬浮窗失败:', err)
    } finally {
      setShowDeleteConfirm(false)
      setPendingDeleteBoxId(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setPendingDeleteBoxId(null)
  }

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    logInfo('悬浮窗排序:', { fromIndex, toIndex })
    
    if (!boxId) return
    
    const newItems = [...items]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    
    newItems.forEach((item, index) => {
      if (item.order !== index) {
        item.order = index
      }
    })
    
    setItems(newItems)
    
    try {
      const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
      if (raw && typeof raw === 'object') {
        const storage = { ...raw } as { items: Item[] }
        const otherItems = storage.items?.filter(item => item.boxId !== boxId) || []
        storage.items = [...newItems, ...otherItems]
        await tauriIPC.store.set({ key: 'storage', value: storage, storeType: 'storage' })
        
        await emit(BOX_FLOAT_ITEMS_RELOAD, { boxId })
      }
    } catch (err) {
      logError('保存排序失败:', err)
    }
  }, [items, boxId])

  const { containerRef } = useSortable({
    onReorder: handleReorder,
    enabled: !isOrphan && !!boxId && items.length > 0,
    draggable: '.item-row, .item-cell',
    filter: '',
  })

  return (
    <div className={`bf-root ${contentExpanded ? 'bf-root--expanded' : 'bf-root--collapsed'}`}>
      <header 
        className="bf-header" 
        ref={headerRef} 
        data-tauri-drag-region 
        onDoubleClick={(e) => e.preventDefault()}
        style={boxColor ? { backgroundColor: boxColor } : undefined}
      >
        <div className="bf-header-main">
          <div className="bf-title-row">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                className="bf-title-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => void commitTitle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void commitTitle()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelEditTitle()
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label="编辑标题"
              />
            ) : (
              <span
                role="button"
                tabIndex={0}
                className="bf-title-text bf-title-text--editable"
                onClick={(e) => {
                  e.stopPropagation()
                  beginEditTitle()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    beginEditTitle()
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {displayTitle}
              </span>
            )}
          </div>
        </div>
        <div className="bf-header-tools" data-tauri-drag-region>
          <button
            type="button"
            className="bf-tool bf-tool-on"
            aria-label={viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <IconGrid /> : <IconList />}
          </button>
          <button
            ref={moreBtnRef}
            type="button"
            className="bf-tool"
            aria-label="更多"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              void toggleMoreMenu()
            }}
          >
            ⋯
          </button>
          <button
            type="button"
            className="bf-tool bf-tool-chevron"
            aria-label={contentExpanded ? '收拢内容' : '展开内容'}
            aria-expanded={contentExpanded}
            onClick={toggleContentExpanded}
          >
            {contentExpanded ? <IconChevronUp /> : <IconChevronDown />}
          </button>
        </div>
        <div className={`bf-delete-confirm ${showDeleteConfirm ? 'bf-delete-confirm--visible' : ''}`}>
          <span className="bf-delete-confirm-text">确定关闭悬浮窗？收纳盒与文件不会删除。</span>
          <div className="bf-delete-confirm-actions">
            <button
              type="button"
              className="bf-btn bf-btn-cancel"
              onClick={cancelDelete}
            >
              取消
            </button>
            <button
              type="button"
              className="bf-btn bf-btn-danger"
              onClick={confirmDelete}
            >
              确定
            </button>
          </div>
        </div>
      </header>

      <div className="bf-body">
        <div className="bf-body-inner">
          <main className="bf-main">
            {isOrphan && (
              <div className="bf-empty bf-hints">
                <p>空白悬浮窗 · 拖入文件或快捷方式</p>
                <p>将自动创建收纳盒并绑定</p>
              </div>
            )}
            {!isOrphan && !boxId && (
              <div className="bf-empty">
                <p>缺少收纳盒参数，请从主窗口打开</p>
              </div>
            )}
            {!isOrphan && boxId && loadError && (
              <div className="bf-empty">
                <p>加载失败：{loadError}</p>
              </div>
            )}
            {!isOrphan && boxId && !loadError && items.length === 0 && (
              <div className="bf-empty bf-hints">
                <p>拖放文件到此处添加或移出</p>
                <p>
                  <kbd className="bf-kbd">Ctrl</kbd> + 拖放 复制文件
                </p>
                <p>
                  <kbd className="bf-kbd">L</kbd> 设置编组
                </p>
                <p>
                  编组后按 <kbd className="bf-kbd">Ctrl</kbd> 临时解除
                </p>
              </div>
            )}
            {!isOrphan && boxId && !loadError && items.length > 0 && viewMode === 'list' && (
              <div ref={containerRef} className="items-list">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="item-row"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="item-row-left">
                      <FileIcon item={item} />
                      <span className="item-name">{removeFileExtension(item.name, item.type)}</span>
                    </div>
                    {item.size && <span className="item-size">{formatFileSize(item.size)}</span>}
                  </div>
                ))}
              </div>
            )}
            {!isOrphan && boxId && !loadError && items.length > 0 && viewMode === 'grid' && (
              <div ref={containerRef} className="items-grid">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="item-cell"
                    onClick={() => handleItemClick(item)}
                  >
                    <FileIcon item={item} />
                    <span className="item-cell-name">{removeFileExtension(item.name, item.type)}</span>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default BoxFloatApp
