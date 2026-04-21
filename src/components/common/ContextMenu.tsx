import React, { useState, useRef, useEffect } from 'react';
import { useStore, type Box, type Item } from '../../store';

interface ContextMenuProps {
  type: 'box' | 'item';
  data: Box | Item;
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ type, data, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
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
  const handleRename = () => {
    if (!newName.trim()) {
      setRenameModalVisible(false);
      setNewName('');
      return;
    }
    
    if (type === 'box') {
      updateBox(data.id, newName);
    }
    
    setRenameModalVisible(false);
    setNewName('');
  };

  // 处理删除
  const handleDelete = () => {
    if (confirm(type === 'box' 
      ? `确定要删除收纳盒"${data.name}"吗？其中的文件将被移除。`
      : `确定要移除文件"${data.name}"吗？`)) {
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
      window.electron.ipcRenderer.send('open-item', data);
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

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {/* 右键菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            padding: '6px 0',
            zIndex: 9999,
            minWidth: '120px'
          }}
        >
          {type === 'item' && 'path' in data && (
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--txt)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={handleOpen}
            >
              打开
            </div>
          )}
          
          {type === 'box' && (
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--txt)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                setNewName(data.name);
                setRenameModalVisible(true);
                setIsOpen(false);
              }}
            >
              重命名
            </div>
          )}
          
          {type === 'item' && (
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--txt)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                setMoveModalVisible(true);
                setIsOpen(false);
              }}
            >
              移动到
            </div>
          )}
          
          <div
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--red)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={handleDelete}
          >
            {type === 'box' ? '删除' : '移除'}
          </div>
        </div>
      )}

      {/* 重命名对话框 */}
      {renameModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '10px',
            padding: '20px',
            width: '300px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--txt)' }}>重命名</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setRenameModalVisible(false);
                  setNewName('');
                }
              }}
              onBlur={handleRename}
              placeholder="请输入名称"
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setRenameModalVisible(false);
                  setNewName('');
                }}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--txt)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleRename}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--accent)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动对话框 */}
      {moveModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '10px',
            padding: '20px',
            width: '300px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--txt)' }}>移动到收纳盒</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {boxes
                .filter(box => box.id !== ('boxId' in data ? data.boxId : null))
                .map(box => (
                  <button
                    key={box.id}
                    onClick={() => handleMove(box.id)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: 'var(--txt)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.1s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {box.name} ({box.itemCount} 个文件)
                  </button>
                ))
              }
              {boxes.filter(box => box.id !== ('boxId' in data ? data.boxId : null)).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--txt3)', padding: '20px', fontSize: '12px' }}>
                  没有其他收纳盒
                </div>
              )}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setMoveModalVisible(false)}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--txt)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContextMenu;