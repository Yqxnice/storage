import React from 'react';
import { useStore, type BoxGroup } from '../../store';
import ContextMenu from '../common/ContextMenu';

interface GroupItemProps {
  group: BoxGroup;
  boxes: { id: string; name: string; color?: string; itemCount: number }[];
  activeBoxId: string | null;
  onBoxClick: (boxId: string) => void;
}

const GroupItem: React.FC<GroupItemProps> = ({ group, boxes, activeBoxId, onBoxClick }) => {
  const { toggleGroupCollapse, updateGroup, deleteGroup } = useStore();

  const handleGroupClick = () => {
    toggleGroupCollapse(group.id);
  };

  const handleRename = (newName: string) => {
    updateGroup(group.id, { name: newName });
  };

  const handleDelete = () => {
    deleteGroup(group.id);
  };

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
    <div className={`group-item ${group.collapsed ? 'collapsed' : ''}`}>
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
      
      {!group.collapsed && boxes.length > 0 && (
        <div className="group-boxes">
          {boxes.map(box => (
            <ContextMenu key={box.id} type="box" data={{ ...box, id: box.id }}>
              <div
                className={`lib-item ${activeBoxId === box.id ? 'active' : ''}`}
                onClick={() => onBoxClick(box.id)}
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