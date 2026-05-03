import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize } from '@tauri-apps/api/window'
import { listen, emit } from '@tauri-apps/api/event'
import { IoChevronDown, IoChevronUp } from 'react-icons/io5'
import type { Item, Box } from '../store'
import { tauriIPC } from '../utils/tauri-ipc'
import {
  bindOrphanFloatToNewBox,
  buildBoxFloatUrl,
  closeFloatWindowAndClear,
  persistBoxDisplayName,
  persistOrphanFloatTitle,
} from '../utils/box-float-actions'
import { BOXFLOAT_ORPHAN_MENU_BOX_ID, compactFloatWindowId, floatMenuLabelFromFloatWindowId } from '../utils/box-float-labels'
import { openBoxFloatMenuWindow } from '../utils/box-float-menu-window'
import { BOX_FLOAT_ITEMS_RELOAD } from '../utils/box-float-notify'
import { logDebug, logInfo, logError } from '../utils/logger'
import { formatFileSize } from '../utils/helpers'

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
    isOrphan: q.get('orphan') === '1',
  }
}

async function loadItemsForBox(boxId: string): Promise<Item[]> {
  const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
  if (!raw || typeof raw !== 'object' || !('items' in raw)) {
    return []
  }
  const items = (raw as { items: Item[] }).items
  if (!Array.isArray(items)) {
    return []
  }
  return items.filter((item) => item.boxId === boxId)
}

// 图标缓存 - 优化版
const iconCache = new Map<string, string | null>()
const pendingIconRequests = new Map<string, Promise<string | null>>()
// 图标加载超时机制
const ICON_LOAD_TIMEOUT = 5000

const FileIcon: React.FC<{ item: Item }> = React.memo(({ item }) => {
  const [icon, setIcon] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let timeoutId: number | null = null
    
    const loadIcon = async () => {
      if (item.category !== 'desktop' || !item.path) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      // 检查缓存
      if (iconCache.has(item.path)) {
        if (isMounted) {
          setIcon(iconCache.get(item.path) ?? null)
          setLoading(false)
        }
        return
      }

      // 检查是否已有请求在进行
      if (pendingIconRequests.has(item.path)) {
        const existingRequest = pendingIconRequests.get(item.path)!
        const result = await existingRequest
        if (isMounted) {
          setIcon(result)
          setLoading(false)
        }
        return
      }

      const requestPromise = (async () => {
        try {
          const iconData = await tauriIPC.getFileIcon(item.path, 32)
          const result = iconData && iconData !== 'default-icon' ? iconData : null
          iconCache.set(item.path, result)
          return result
        } catch (error) {
          logError('获取文件图标失败:', error)
          return null
        }
      })()

      pendingIconRequests.set(item.path, requestPromise)

      // 添加超时机制
      const timeoutPromise = new Promise<string | null>((resolve) => {
        timeoutId = window.setTimeout(() => {
          logDebug('图标加载超时，使用默认图标')
          resolve(null)
        }, ICON_LOAD_TIMEOUT)
      })

      const result = await Promise.race([requestPromise, timeoutPromise])
      pendingIconRequests.delete(item.path)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (isMounted) {
        setIcon(result)
        setLoading(false)
      }
    }

    loadIcon()
    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [item.path, item.category])

  const finalIcon = item.category === 'web' && item.icon ? item.icon : icon

  if (finalIcon) {
    return (
      <div className="item-icon-container">
        <img src={finalIcon} alt="" className="item-icon" />
      </div>
    )
  }

  if (item.category === 'web') {
    return (
      <div className="item-icon-container">
        <span className="default-icon">🔗</span>
      </div>
    )
  }

  switch (item.type) {
    case 'folder':
      return (
        <div className="item-icon-container">
          <span className="default-icon">📁</span>
        </div>
      )
    case 'icon':
      return (
        <div className="item-icon-container">
          <span className="default-icon">🔗</span>
        </div>
      )
    default:
      return (
        <div className="item-icon-container">
          <span className="default-icon">{loading ? '…' : '📄'}</span>
        </div>
      )
  }
})

const IconList: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={active ? 'bf-icon-active' : ''}>
    <path
      fill="currentColor"
      d="M2 3.5h12v1H2zm0 4h12v1H2zm0 4h8v1H2z"
    />
  </svg>
)

const IconGrid: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={active ? 'bf-icon-active' : ''}>
    <path
      fill="currentColor"
      d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z"
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
  const [items, setItems] = useState<Item[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
   const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [menuOpen, setMenuOpen] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
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
  const draggedItemId = useRef<string | null>(null)
  const isDraggingOut = useRef(false)

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
    editingTitleRef.current = editingTitle
  }, [editingTitle])

  useEffect(() => {
    const name = titleName || '收纳盒'
    void getCurrentWebviewWindow().setTitle(name).catch((error) => {
      logError('设置窗口标题失败:', error)
    })
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
      const unlisten = await listen('box-float-storage-updated', () => {
        if (cancelled || editingTitleRef.current) return;
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
  }, [reloadTitleFromStorage])

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
    if (!boxId || isOrphan) return
    void refreshItems(boxId)
  }, [boxId, isOrphan, refreshItems])

  useEffect(() => {
    if (!boxId || isOrphan) return;
    
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen<{ boxId: string }>(BOX_FLOAT_ITEMS_RELOAD, (e) => {
        if (cancelled) return;
        if (e.payload?.boxId === boxId) {
          void refreshItems(boxId);
        }
      });
      
      if (cancelled) {
        unlisten();
        return;
      } else {
        unlistenFn = unlisten;
      }
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
    if (!boxId || isOrphan) return
    const onFocus = () => {
      void refreshItems(boxId)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [boxId, isOrphan, refreshItems])

  useEffect(() => {
    if (!boxId || isOrphan) return;
    
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen<{ paths: string[] }>('tauri://drag-drop', (e) => {
        if (cancelled) return;
        logDebug('拖放事件触发');
        const paths = (e.payload as { paths?: string[] })?.paths;
        if (paths && paths.length > 0) {
          logInfo('检测到拖入文件，立即添加到收纳盒');
          
          // 检测现有项目，避免重复添加
          const existingPaths = new Set(items.map((item) => item.path));
          const newPaths = paths.filter((path) => !existingPaths.has(path));
          
          if (newPaths.length === 0) {
            logInfo('所有文件已存在，跳过添加');
            // 还是要同步到后台，确保其他窗口也有
            void tauriIPC.dragFiles(paths, boxId);
            return;
          }
          
          // 只添加新文件
          const newItems: Item[] = newPaths.map((path) => {
            // 从路径中提取文件名
            const pathParts = path.split(/[/\\]/);
            const fileName = pathParts.filter(Boolean).pop() || path;
            
            // 从文件名猜测类型（简单判断）
            const isFolder = !fileName.includes('.') && fileName.length > 0;
            const itemType = isFolder ? 'folder' : 'file';
            
            return {
              id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
              name: fileName,
              category: 'desktop',
              type: itemType,
              path: path,
              boxId: boxId,
              addedAt: Date.now(),
              clickCount: 0
            };
          });
          
          // 立即添加到状态
          setItems((prev) => [...prev, ...newItems]);
          
          // 异步同步到存储（还是发送所有路径，确保一致性）
          void tauriIPC.dragFiles(paths, boxId);
        }
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
  }, [boxId, isOrphan, items])

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
    if (isOrphan || !boxId) return;
    
    let unlistenFn: (() => void) | Promise<(() => void)> | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const unlisten = await listen('tauri://drag-leave', () => {
        if (cancelled) return;
        if (draggedItemId.current) {
          logDebug('检测到项目拖出窗口');
          isDraggingOut.current = true;
        }
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
  }, [boxId, isOrphan])

  /** 独立菜单小窗 → 主窗 */
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
        // ACL 或未在 Tauri 内运行
      }
    }, 280)
    return () => window.clearTimeout(id)
  }, [contentExpanded])

  useEffect(() => {
    if (contentExpanded || !floatWindowId) return
    void (async () => {
      try {
        const label = floatMenuLabelFromFloatWindowId(floatWindowId)
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
        const existingMenu = await WebviewWindow.getByLabel(label)
        if (existingMenu) {
          await existingMenu.close()
          setMenuOpen(false)
        }
      } catch {
        // 忽略错误
      }
    })()
  }, [contentExpanded, floatWindowId])

  const toggleMoreMenu = async () => {
    if (!floatWindowId || !moreBtnRef.current) return
    const menuBoxId = isOrphan ? BOXFLOAT_ORPHAN_MENU_BOX_ID : boxId
    if (!menuBoxId) return
    
    // 如果菜单已经是打开状态，关闭它
    if (menuOpen) {
      try {
        const label = floatMenuLabelFromFloatWindowId(floatWindowId)
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
        const existingMenu = await WebviewWindow.getByLabel(label)
        if (existingMenu) {
          await existingMenu.close()
        }
        setMenuOpen(false)
      } catch {
        // 忽略关闭错误
        setMenuOpen(false)
      }
      return
    }
    
    // 菜单未打开，打开它
    try {
      await openBoxFloatMenuWindow({
        floatWindowId,
        boxId: menuBoxId,
        anchorEl: moreBtnRef.current,
      })
      setMenuOpen(true)
    } catch (e) {
      logError('打开菜单窗失败:', e)
      setMenuOpen(false)
    }
  }

  const toggleContentExpanded = () => {
    void (async () => {
      if (contentExpanded) {
        try {
            const win = getCurrentWebviewWindow()
            const inner = await win.innerSize()
            const sf = await win.scaleFactor()
            lastExpandedLogicalH.current = Math.max(Math.round(inner.height / sf), 120)
          } catch (error) {
            logError('获取窗口尺寸失败:', error)
          }
      }
      setContentExpanded((v) => !v)
    })()
  }

  const removeFileExtension = (name: string, type?: string) => {
    if (type === 'folder') return name
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex > 0) {
      return name.substring(0, lastDotIndex)
    }
    return name
  }

  const handleItemClick = (item: Item) => {
    const itemPath = item.category === 'web' ? item.url : item.path
    if (itemPath) {
      tauriIPC.openItem(itemPath).catch((error) => {
        logError('打开项目失败:', error)
      })
    }
  }

  const deleteItemFromStorage = useCallback(async (itemId: string) => {
    logDebug('[拖拽删除] 开始执行删除操作，项目ID:', itemId)
    if (!boxId) {
      logDebug('[拖拽删除] boxId为空，取消删除')
      return
    }
    try {
      logDebug('[拖拽删除] 从存储加载数据...')
      const raw = await tauriIPC.store.get({ key: 'storage', storeType: 'storage' })
      if (!raw || typeof raw !== 'object') {
        logDebug('[拖拽删除] 存储数据无效')
        return
      }
      
      const storage = raw as { items: Item[] }
      logDebug('[拖拽删除] 当前项目总数:', storage.items.length)
      const itemToDelete = storage.items.find(item => item.id === itemId)
      logDebug('[拖拽删除] 准备删除的项目:', itemToDelete)
      
      const newItems = storage.items.filter(item => item.id !== itemId)
      logDebug('[拖拽删除] 删除后剩余项目数:', newItems.length)
      
      await tauriIPC.store.set({
        key: 'storage',
        value: { ...storage, items: newItems },
        storeType: 'storage'
      })
      logDebug('[拖拽删除] 存储更新成功')
      
      await emit('box-float-storage-updated', {})
      await emit(BOX_FLOAT_ITEMS_RELOAD, { boxId })
      setItems(newItems.filter(item => item.boxId === boxId))
      logDebug('[拖拽删除] 界面更新成功')
    } catch (err) {
      logError('[拖拽删除] 异常错误:', err)
    }
  }, [boxId])

  const handleDragStart = (item: Item, e: React.MouseEvent) => {
    logDebug('[拖拽事件] onMouseDown - 鼠标按下')
    logDebug('[拖拽事件] 鼠标按键:', e.button, '位置:', { x: e.clientX, y: e.clientY })
    logDebug('[拖拽事件] 被拖拽项目:', {
      id: item.id,
      name: item.name,
      type: item.type,
      path: item.path,
      boxId: item.boxId
    })
    draggedItemId.current = item.id
    isDraggingOut.current = false
    setIsDragging(true)
    setDraggingItemId(item.id)
    logDebug('[拖拽事件] 拖拽状态已初始化 - draggedItemId:', draggedItemId.current, 'isDraggingOut:', isDraggingOut.current)
  }

  const handleDragEnd = (e: React.MouseEvent) => {
    logDebug('[拖拽事件] onMouseUp - 鼠标释放')
    logDebug('[拖拽事件] 释放时状态 - draggedItemId:', draggedItemId.current, 'isDraggingOut:', isDraggingOut.current)
    logDebug('[拖拽事件] 释放时鼠标位置:', { x: e.clientX, y: e.clientY })
    
    if (isDraggingOut.current && draggedItemId.current) {
      logDebug('[拖拽事件] ✅ 符合删除条件 - 项目已拖出窗口，准备删除')
      void deleteItemFromStorage(draggedItemId.current)
    } else {
      logDebug('[拖拽事件] ❌ 不符合删除条件 -',
        !draggedItemId.current ? '没有被拖拽的项目' : '项目未拖出窗口')
    }
    
    logDebug('[拖拽事件] 清理拖拽状态')
    draggedItemId.current = null
    isDraggingOut.current = false
    setIsDragging(false)
    setDraggingItemId(null)
  }

  const handleDragLeave = (item: Item) => {
    logDebug('[拖拽事件] onMouseLeave - 鼠标离开项目元素')
    logDebug('[拖拽事件] 当前拖拽状态 - draggedItemId:', draggedItemId.current, '离开项目ID:', item.id)
    
    if (draggedItemId.current === item.id) {
      logDebug('[拖拽事件] 标记项目为拖出状态')
      isDraggingOut.current = true
    } else {
      logDebug('[拖拽事件] 离开的不是当前拖拽项目，忽略')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeaveMain = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
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

  return (
    <div className={`bf-root ${contentExpanded ? 'bf-root--expanded' : 'bf-root--collapsed'}`}>
      <header 
        className="bf-header" 
        ref={headerRef} 
        data-tauri-drag-region 
        data-dragging={isDragging}
        onDoubleClick={(e) => e.preventDefault()}
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
            onClick={() => void toggleMoreMenu()}
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
            {contentExpanded ? <IoChevronUp size={18} /> : <IoChevronDown size={18} />}
          </button>
        </div>
        <div className={`bf-delete-confirm ${showDeleteConfirm ? 'bf-delete-confirm--visible' : ''}`}>
          <span className="bf-delete-confirm-text">确定关闭此悬浮窗？收纳盒与其中文件不会被删除。</span>
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
          <main className="bf-main" data-drag-over={dragOver} onDragOver={handleDragOver} onDragLeave={handleDragLeaveMain} onDrop={handleDrop}>
            {isOrphan && (
              <div className="bf-empty bf-hints">
                <p>空白悬浮窗 · 拖入桌面文件或快捷方式到此处</p>
                <p>将自动创建收纳盒并与此窗绑定</p>
              </div>
            )}
            {!isOrphan && !boxId && (
              <div className="bf-empty">
                <p>缺少收纳盒参数，请从主窗口打开悬浮窗。</p>
              </div>
            )}
            {!isOrphan && boxId && loadError && (
              <div className="bf-empty">
                <p>加载失败：{loadError}</p>
              </div>
            )}
            {!isOrphan && boxId && !loadError && items.length === 0 && (
              <div className="bf-empty bf-hints">
                <p>拖动来放置文件或移出文件</p>
                <p>
                  按住 <kbd className="bf-kbd">Ctrl</kbd> 来复制文件
                </p>
                <p>
                  按下 <kbd className="bf-kbd">L</kbd> 来设置编组
                </p>
                <p>
                  编组后可按住 <kbd className="bf-kbd">Ctrl</kbd> 临时解除编组
                </p>
              </div>
            )}
            {!isOrphan && boxId && !loadError && items.length > 0 && viewMode === 'list' && (
              <div className="items-list">
                {items.map((item) => (
                  <div 
                key={item.id} 
                className="item-row" 
                draggable
                data-dragging-item={draggingItemId === item.id}
                onClick={() => {
                  logDebug('[拖拽事件] onClick - 点击项目:', item.name)
                  handleItemClick(item)
                }}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    handleDragStart(item, e)
                  }
                }}
                onMouseUp={(e) => {
                  handleDragEnd(e)
                }}
                onMouseLeave={() => {
                  handleDragLeave(item)
                }}
                onDragStart={(e) => {
                  logDebug('[拖拽事件] onDragStart - 原生拖拽开始')
                  logDebug('[拖拽事件] 原生拖拽事件:', {
                    dataTransferTypes: e.dataTransfer.types,
                    effectAllowed: e.dataTransfer.effectAllowed
                  })
                }}
                onDragEnd={(e) => {
                  logDebug('[拖拽事件] onDragEnd - 原生拖拽结束')
                  logDebug('[拖拽事件] 原生拖拽结束事件:', {
                    dropEffect: e.dataTransfer.dropEffect
                  })
                }}
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
              <div className="items-grid">
                {items.map((item) => (
                  <div 
                  key={item.id} 
                  className="item-cell" 
                  draggable
                  data-dragging-item={draggingItemId === item.id}
                  onClick={() => {
                    logDebug('[拖拽事件] onClick - 点击项目:', item.name)
                    handleItemClick(item)
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      handleDragStart(item, e)
                    }
                  }}
                  onMouseUp={(e) => {
                    handleDragEnd(e)
                  }}
                  onMouseLeave={() => {
                    handleDragLeave(item)
                  }}
                  onDragStart={(e) => {
                    logDebug('[拖拽事件] onDragStart - 原生拖拽开始')
                    logDebug('[拖拽事件] 原生拖拽事件:', {
                      dataTransferTypes: e.dataTransfer.types,
                      effectAllowed: e.dataTransfer.effectAllowed
                    })
                  }}
                  onDragEnd={(e) => {
                    logDebug('[拖拽事件] onDragEnd - 原生拖拽结束')
                    logDebug('[拖拽事件] 原生拖拽结束事件:', {
                      dropEffect: e.dataTransfer.dropEffect
                    })
                  }}
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
