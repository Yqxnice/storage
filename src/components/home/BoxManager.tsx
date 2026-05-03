import React, { useState } from 'react';
import { useStore, type Box } from '../../store';
import ContextMenu from '../common/ContextMenu';
import BottomNav from '../common/BottomNav';
import { showMessage } from '../common';
import { createBlankOrphanFloatWindow } from '../../utils/box-float-actions';

interface BoxManagerProps {
  onAddBox?: () => void;
  onNavClick?: (nav: 'home' | 'stats' | 'help' | 'settings') => void;
  activeNav?: string;
}

const BoxManager: React.FC<BoxManagerProps> = ({ onAddBox, onNavClick, activeNav }) => {
  const { boxes, activeBoxId, setActiveBox, addBox, reorderBoxes } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [draggedBox, setDraggedBox] = useState<Box | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddBox = () => {
    if (!newBoxName.trim()) {
      setIsAdding(false);
      return;
    }
    addBox(newBoxName);
    setNewBoxName('');
    setIsAdding(false);
    onAddBox?.();
  };

  const handleDragStart = (e: React.DragEvent, box: Box) => {
    console.log('[拖拽] 开始拖拽收纳盒:', box.name, box.id);
    e.dataTransfer.setData('text/plain', box.id);
    setDraggedBox(box);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    console.log('[拖拽] 拖拽经过收纳盒索引:', index);
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDropItem = (e: React.DragEvent, dropIndex: number) => {
    console.log('[拖拽] 放置收纳盒到索引:', dropIndex);
    e.preventDefault();
    
    const draggedBoxId = e.dataTransfer.getData('text/plain');
    const draggedIndex = boxes.findIndex(box => box.id === draggedBoxId);
    
    console.log('[拖拽] 拖拽的收纳盒ID:', draggedBoxId, '原索引:', draggedIndex, '目标索引:', dropIndex);
    
    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      console.log('[拖拽] 开始重新排序收纳盒');
      reorderBoxes(draggedIndex, dropIndex);
    }
    
    setDraggedBox(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    console.log('[拖拽] 拖拽结束');
    setDraggedBox(null);
    setDragOverIndex(null);
  };

  return (
    <div className="side">
      <div className="side-top">
        <span className="side-label">收纳库</span>
        <div className="side-top-actions">
          <button
            type="button"
            className="side-float-btn"
            onClick={() => {
              void createBlankOrphanFloatWindow()
                .then(() => {
                  showMessage.success('已打开新的空白悬浮窗（Welcome）');
                })
                .catch((e) => {
                  showMessage.error(e instanceof Error ? e.message : String(e));
                });
            }}
          >
            空白悬浮窗
          </button>
          <button type="button" className="new-lib" onClick={() => setIsAdding(true)} >
            +
          </button>
        </div>
      </div>

      {isAdding && (
        <div style={{ padding: '0 8px 8px' }}>
          <input
            type="text"
            value={newBoxName}
            onChange={(e) => setNewBoxName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddBox();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewBoxName('');
              }
            }}
            onBlur={handleAddBox}
            placeholder="输入库名称"
            autoFocus
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '0.5px solid var(--accent)',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              background: 'var(--accent-bg)',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      <div className="lib-list">
        {boxes.map((box, index) => (
          <ContextMenu
            key={box.id}
            type="box"
            data={box}
          >
            <div
              className={`lib-item ${activeBoxId === box.id ? 'active' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${draggedBox?.id === box.id ? 'dragging' : ''}`}
              onClick={() => setActiveBox(box.id)}
              onDragStart={(e) => handleDragStart(e, box)}
              onDragOver={(e) => handleDragOverItem(e, index)}
              onDrop={(e) => handleDropItem(e, index)}
              onDragEnd={handleDragEnd}
              draggable
            >
              <span className="lib-ico">📁</span>
              <div className="lib-name">{box.name}</div>
              {activeBoxId === box.id && (
                <div className="lib-dot" style={{ background: 'var(--accent)' }}></div>
              )}
            </div>
          </ContextMenu>
        ))}
      </div>

      <BottomNav activeNav={activeNav} onNavClick={onNavClick} />
    </div>
  );
};

export default BoxManager;