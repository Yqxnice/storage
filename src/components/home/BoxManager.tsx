import React, { useState } from 'react';
import { useStore, type Box } from '../../store';
import ContextMenu from '../common/ContextMenu';
import BottomNav from '../common/BottomNav';

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
    e.dataTransfer.setData('text/plain', box.id);
    setDraggedBox(box);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDropItem = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const draggedBoxId = e.dataTransfer.getData('text/plain');
    const draggedIndex = boxes.findIndex(box => box.id === draggedBoxId);
    
    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      reorderBoxes(draggedIndex, dropIndex);
    }
    
    setDraggedBox(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedBox(null);
    setDragOverIndex(null);
  };

  return (
    <div className="side">
      <div className="side-top">
        <span className="side-label">收纳库</span>
        <button className="new-lib" onClick={() => setIsAdding(true)}>+</button>
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