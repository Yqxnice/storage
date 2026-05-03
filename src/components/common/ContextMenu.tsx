import React, { useState, useRef, useEffect } from 'react';
import { useStore, type Box, type Item } from '../../store';
import { tauriIPC } from '../../utils/tauri-ipc';
import { openNewBoxFloatWindow, reopenBoxFloatWindow } from '../../utils/box-float-actions';
import RenameModal from '../modal/RenameModal';
import MoveModal from '../modal/MoveModal';

interface ContextMenuProps {
  type: 'box' | 'item';
  data: Box | Item;
  children: React.ReactNode;
}

/* 设计系统变量 */
const menuStyles = {
  menu: {
    position: 'fixed' as const,
    left: 0,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
    padding: '4px 0',
    zIndex: 99999,
    minWidth: '170px',
    overflow: 'hidden',
    animation: 'slideIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  } as const,
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    color: '#1c1c1e',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  } as const,
  itemHover: {
    backgroundColor: 'rgba(246, 247, 249, 0.95)',
  } as const,
  itemDanger: {
    color: '#ff3b30',
  } as const,
  itemDangerHover: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  } as const,
  separator: {
    height: '1px',
    margin: '4px 12px',
    background: 'linear-gradient(to right, transparent, rgba(0, 0, 0, 0.08), transparent)',
  } as const,
};

/* 添加动画关键帧 */
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;
document.head.appendChild(styleSheet);

const ContextMenu: React.FC<ContextMenuProps> = ({ type, data, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const { updateBox, deleteBox, removeItem, moveItem, boxes } = useStore();

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  // 调整菜单位置以避免超出屏幕
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      const bottomMargin = 30; // 底部安全区域
      const sideMargin = 10; // 侧边安全区域
      
      let adjustedX = position.x;
      let adjustedY = position.y;
      
      // 检查右边距
      if (adjustedX + menuWidth > screenWidth - sideMargin) {
        adjustedX = screenWidth - menuWidth - sideMargin;
      }
      
      // 检查左边距
      if (adjustedX < sideMargin) {
        adjustedX = sideMargin;
      }
      
      // 检查下边距
      if (adjustedY + menuHeight > screenHeight - bottomMargin) {
        adjustedY = screenHeight - menuHeight - bottomMargin;
      }
      
      // 检查上边距
      if (adjustedY < sideMargin) {
        adjustedY = sideMargin;
      }
      
      // 只有位置改变时才更新
      if (adjustedX !== position.x || adjustedY !== position.y) {
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [isOpen]);

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理重命名
  const handleRename = (newName: string) => {
    if (!newName.trim()) {
      return;
    }
    
    if (type === 'box') {
      updateBox(data.id, newName);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    const message = type === 'box' 
      ? `确定要删除收纳盒"${data.name}"吗？其中的文件将被移除。`
      : `确定要移除文件"${data.name}"吗？`;
    
    const confirmed = await tauriIPC.dialog.confirm(message, "确认删除");
    if (confirmed) {
      if (type === 'box') {
        deleteBox(data.id);
      } else {
        removeItem(data.id);
      }
      setIsOpen(false);
    }
  };

  // 处理打开文件
  const handleOpen = () => {
    if (type === 'item' && 'path' in data && data.path) {
      tauriIPC.openItem(data.path)
        .catch((error) => {
          console.error('打开文件失败:', error);
        });
      setIsOpen(false);
    }
  };

  // 处理在资源管理器打开
  const handleOpenInExplorer = () => {
    if (type === 'item' && 'path' in data && data.path) {
      try {
        // Windows: 用 explorer /select,path 选中文件
        tauriIPC.invoke('open_in_explorer', { path: data.path });
      } catch (error) {
        console.error('在资源管理器中打开失败，尝试打开父目录:', error);
        // 如果没有实现，尝试用 open 打开父目录
        const path = data.path;
        // 修复：正确获取父目录
        const lastSep = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
        const parentDir = lastSep > 0 ? path.substring(0, lastSep) : path;
        if (parentDir) {
          tauriIPC.openItem(parentDir);
        }
      }
      setIsOpen(false);
    }
  };

  // 处理移动
  const handleMove = (targetBoxId: string) => {
    if (type === 'item' && 'id' in data) {
      moveItem(data.id, targetBoxId);
      setMoveModalVisible(false);
      setIsOpen(false);
    }
  };

  // 构建菜单项列表
  const renderMenuItems = () => {
    const items: Array<{
      id: number;
      content: React.ReactNode;
      onClick: () => void;
      isDanger?: boolean;
    }> = [];
    let idCounter = 0;

    // 只有 item 有打开相关选项
    if (type === 'item' && 'path' in data) {
      items.push({
        id: idCounter++,
        content: '打开',
        onClick: handleOpen,
      });
      items.push({
        id: idCounter++,
        content: '在资源管理器打开',
        onClick: handleOpenInExplorer,
      });
    }

    // 只有 box 有重命名和悬浮窗选项
    if (type === 'box') {
      items.push({
        id: idCounter++,
        content: '重命名',
        onClick: () => {
          setRenameModalVisible(true);
          setIsOpen(false);
        },
      });
      items.push({
        id: idCounter++,
        content: (data as Box).floatWindowId ? '打开悬浮窗' : '创建悬浮窗',
        onClick: async () => {
          const box = data as Box;
          try {
            if (box.floatWindowId) {
              await reopenBoxFloatWindow(box.id, box.name, box.floatWindowId);
            } else {
              await openNewBoxFloatWindow(box.id, box.name);
            }
          } catch (err) {
            console.error('打开/创建悬浮窗失败:', err);
          }
          setIsOpen(false);
        },
      });
    }

    // 只有 item 有移动选项
    if (type === 'item') {
      items.push({
        id: idCounter++,
        content: '移动到',
        onClick: () => {
          setMoveModalVisible(true);
          setIsOpen(false);
        },
      });
    }

    return { items, deleteId: idCounter };
  };

  const { items: menuItems, deleteId } = renderMenuItems();

  return (
    <>
      <div className="allow-right-click" onContextMenu={handleContextMenu}>
        {children}
      </div>

      {/* 右键菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            ...menuStyles.menu,
            left: position.x,
            top: position.y,
          }}
        >
          {menuItems.map((item) => (
            <div
              key={item.id}
              style={{
                ...menuStyles.item,
                ...(item.isDanger ? menuStyles.itemDanger : {}),
                ...(hoveredIndex === item.id ? (item.isDanger ? menuStyles.itemDangerHover : menuStyles.itemHover) : {}),
              }}
              onMouseEnter={() => setHoveredIndex(item.id)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={item.onClick}
            >
              {item.content}
            </div>
          ))}

          {/* 分隔线 */}
          <div style={menuStyles.separator} />

          <div
            style={{
              ...menuStyles.item,
              ...menuStyles.itemDanger,
              ...(hoveredIndex === deleteId ? menuStyles.itemDangerHover : {}),
            }}
            onMouseEnter={() => setHoveredIndex(deleteId)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={handleDelete}
          >
            {type === 'box' ? '删除' : '移除'}
          </div>
        </div>
      )}

      {/* 重命名对话框 */}
      <RenameModal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        onRename={handleRename}
        initialName={data.name}
      />

      {/* 移动对话框 */}
      <MoveModal
        visible={moveModalVisible}
        onClose={() => setMoveModalVisible(false)}
        onMove={handleMove}
        boxes={boxes}
        currentBoxId={'boxId' in data ? data.boxId : null}
      />
    </>
  );
};

export default ContextMenu;