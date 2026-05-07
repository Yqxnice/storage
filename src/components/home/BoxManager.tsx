import React, { useState, useCallback } from 'react';
import { useStore } from '../../store';
import ContextMenu from '../common/ContextMenu';
import BottomNav from '../common/BottomNav';
import { showMessage } from '../common';
import { createBlankOrphanFloatWindow } from '../../utils/box-float-actions';
import GroupItem from './GroupItem';
import { useSortable } from '../../hooks';

interface BoxManagerProps {
  onAddBox?: () => void;
  onNavClick?: (nav: 'home' | 'stats' | 'help' | 'settings') => void;
  activeNav?: string;
}

const BoxManager: React.FC<BoxManagerProps> = ({ onAddBox, onNavClick, activeNav }) => {
  const { boxes, groups, activeBoxId, setActiveBox, addBox, addGroup, reorderBoxes } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

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

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      setIsAddingGroup(false);
      return;
    }
    addGroup(newGroupName);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const ungroupedBoxes = boxes.filter(box => !box.groupId);

  const getBoxesInGroup = (groupId: string) => {
    return boxes.filter(box => box.groupId === groupId);
  };

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log('[BoxManager] 收纳盒排序:', fromIndex, '->', toIndex);
    reorderBoxes(fromIndex, toIndex);
  }, [reorderBoxes]);

  const { containerRef } = useSortable({
    onReorder: handleReorder,
    enabled: true,
  });

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
            placeholder="输入收纳盒名称"
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
        {groups.length > 0 && (
          <div className="groups-section">
            {groups.map(group => (
              <GroupItem
                key={group.id}
                group={group}
                boxes={getBoxesInGroup(group.id)}
                activeBoxId={activeBoxId}
                onBoxClick={setActiveBox}
              />
            ))}
          </div>
        )}

        {ungroupedBoxes.length > 0 && (
          <div ref={containerRef} className="ungrouped-section">
            {ungroupedBoxes.map((box) => (
              <ContextMenu
                key={box.id}
                type="box"
                data={box}
              >
                <div
                  className={`lib-item ${activeBoxId === box.id ? 'active' : ''}`}
                  onClick={() => setActiveBox(box.id)}
                >
                  <div className="lib-color-dot" style={{ backgroundColor: box.color || '#8e8e93' }}></div>
                  <div className="lib-name">{box.name}</div>
                  {activeBoxId === box.id && (
                    <div className="lib-dot" style={{ background: 'var(--accent)' }}></div>
                  )}
                </div>
              </ContextMenu>
            ))}
          </div>
        )}

        {boxes.length === 0 && groups.length === 0 && (
          <div className="empty-state">
            <p>暂无收纳盒</p>
          </div>
        )}
      </div>

      <div className="side-bottom-actions">
        <button 
          type="button" 
          className="new-group-btn" 
          onClick={() => setIsAddingGroup(true)}
        >
          + 添加分组
        </button>
      </div>

      {isAddingGroup && (
        <div style={{ padding: '0 8px 8px' }}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroup();
              if (e.key === 'Escape') {
                setIsAddingGroup(false);
                setNewGroupName('');
              }
            }}
            onBlur={handleAddGroup}
            placeholder="输入分组名称"
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

      <BottomNav activeNav={activeNav} onNavClick={onNavClick} />
    </div>
  );
};

export default BoxManager;
