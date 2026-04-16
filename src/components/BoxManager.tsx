import React, { useState } from 'react';
import { List, Input, Empty, Typography } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store';
import ContextMenu from './ContextMenu';

const { Title } = Typography;

interface SortableBoxProps {
  box: import('../store').Box;
  isActive: boolean;
  setActive: (id: string) => void;
}

const SortableBox: React.FC<SortableBoxProps> = ({ box, isActive, setActive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: box.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <List.Item
        onClick={() => setActive(box.id)}
        style={{
          cursor: 'grab',
          padding: '12px 16px',
          background: isActive ? '#e6f4ff' : 'transparent',
          borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        onMouseEnter={(e) => {
          const deleteBtn = e.currentTarget.querySelector('.delete-btn');
          if (deleteBtn) (deleteBtn as HTMLElement).style.display = 'flex';
        }}
        onMouseLeave={(e) => {
          const deleteBtn = e.currentTarget.querySelector('.delete-btn');
          if (deleteBtn) (deleteBtn as HTMLElement).style.display = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <FolderOutlined style={{ color: isActive ? '#1677ff' : '#8c8c8c' }} />
          <span style={{
            fontSize: '14px',
            color: isActive ? '#1677ff' : '#333'
          }}>{box.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            color: '#8c8c8c',
            background: '#f0f0f0',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>{box.itemCount}</span>
        </div>
      </List.Item>
    </div>
  );
};

const BoxManager: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');

  const { boxes, activeBoxId, addBox, setActiveBox, reorderBoxes } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = boxes.findIndex((box) => box.id === active.id);
      const newIndex = boxes.findIndex((box) => box.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderBoxes(oldIndex, newIndex);
      }
    }
  };

  const handleAddBox = () => {
    if (!newBoxName.trim()) {
      return;
    }
    addBox(newBoxName);
    setNewBoxName('');
    setIsAdding(false);
  };



  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={5} style={{ margin: 0 }}>收纳盒</Title>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            border: '1px solid #d9d9d9',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <PlusOutlined />
        </button>
      </div>

      {isAdding && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            value={newBoxName}
            onChange={(e) => setNewBoxName(e.target.value)}
            onPressEnter={handleAddBox}
            placeholder="请输入收纳盒名称"
            autoFocus
            size="small"
            onBlur={() => {
              if (newBoxName.trim()) {
                handleAddBox()
              } else {
                setIsAdding(false)
              }
            }}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          {boxes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无收纳盒"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <SortableContext items={boxes.map(box => box.id)} strategy={verticalListSortingStrategy}>
              {boxes.map((box) => (
                <ContextMenu key={box.id} type="box" data={box}>
                  <SortableBox
                    box={box}
                    isActive={activeBoxId === box.id}
                    setActive={setActiveBox}
                  />
                </ContextMenu>
              ))}
            </SortableContext>
          )}
        </div>
      </DndContext>
    </div>
  );
};

export default BoxManager;
