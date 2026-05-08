import React, { useCallback } from 'react';
import { useStore } from '../../store';
import type { BoxGroup } from '../../types';
import ContextMenu from '../common/ContextMenu';
import { useSortable } from '../../hooks';
import { showMessage } from '../common/Message';

interface GroupItemProps {
  group: BoxGroup;
  boxes: { id: string; name: string; color?: string; itemCount: number }[];
  activeBoxId: string | null;
  onBoxClick: (boxId: string) => void;
}

const GroupItem: React.FC<GroupItemProps> = ({ group, boxes, activeBoxId, onBoxClick }) => {
  const { toggleGroupCollapse, updateGroup, deleteGroup, moveBoxToGroup } = useStore();

  const handleGroupClick = () => {
    toggleGroupCollapse(group.id);
  };

  const handleRename = (newName: string) => {
    updateGroup(group.id, { name: newName });
  };

  const handleDelete = () => {
    deleteGroup(group.id);
  };

  const handleMoveBox = useCallback((boxId: string, fromGroupId: string | null, toGroupId: string | null) => {
    console.group('GroupItem handleMoveBox');
    console.log('参数:', { boxId, fromGroupId, toGroupId, currentGroup: group.id });
    
    if (boxId) {
      try {
        console.log('✅ 调用 moveBoxToGroup，目标分组:', group.id);
        moveBoxToGroup(boxId, group.id);
      } catch (error) {
        showMessage.error(error instanceof Error ? error.message : '移动收纳盒失败');
      }
    } else {
      console.log('❌ boxId 为空');
    }
    
    console.groupEnd();
  }, [group.id, moveBoxToGroup]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log('[GroupItem] handleReorder:', fromIndex, toIndex);
    // 分组内排序逻辑暂时不需要处理，目前只需要支持拖入拖出
  }, []);

  const { containerRef } = useSortable({
    onReorder: handleReorder,
    onMoveBox: handleMoveBox,
    draggable: '.lib-item',
    groupId: group.id,
  });

  const menuItems = [
    { label: '重命名', onClick: () => {
      const newName = prompt('请输入新的分组名称:', group.name);
      if (newName && newName.trim()) {
        handleRename(newName.trim());
      }
    }},
    { label: '删除分组', onClick: handleDelete, danger: true }
  ];

  return (
    <div 
      className={`group-item ${group.collapsed ? 'collapsed' : ''}`}
      data-group-id={group.id}
    >
      <ContextMenu type="group" data={group} items={menuItems}>
        <div 
          className="group-header"
          onClick={handleGroupClick}
        >
          <span className="group-arrow">
            {group.collapsed ? '▶' : '▼'}
          </span>
          <span className="group-name">{group.name}</span>
          <span className="group-count">{boxes.length}</span>
        </div>
      </ContextMenu>
      
      {!group.collapsed && (
        <div 
          ref={containerRef} 
          className="group-boxes"
          key={`group-${group.id}-${boxes.map(b => b.id).join('-')}`}
        >
          {boxes.map(box => (
            <ContextMenu key={box.id} type="box" data={{ ...box, id: box.id }}>
              <div
                className={`lib-item ${activeBoxId === box.id ? 'active' : ''}`}
                onClick={() => onBoxClick(box.id)}
                data-box-id={box.id}
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
    </div>
  );
};

export default GroupItem;