import React, { useState, useEffect } from 'react';
import { Empty, Card, Typography } from 'antd';
import { FileOutlined, FolderOutlined, LinkOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore, type Item } from '../store';
import ContextMenu from './ContextMenu';

const { Text } = Typography;

interface SortableItemProps {
  item: Item;
  size?: 'large' | 'small' | 'list';
}

const SortableItem: React.FC<SortableItemProps> = ({ item, size }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ContextMenu type="item" data={item}>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card
          hoverable
          style={{
            height: size === 'large' ? '180px' : '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'grab',
          }}
          bodyStyle={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '16px'
          }}
        >
          <FileIcon item={item} size={size === 'large' ? 'large' : 'small'} />
          <Text
            ellipsis
            style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#333',
              width: '100%'
            }}
            title={item.name}
          >
            {item.name}
          </Text>
        </Card>
      </div>
    </ContextMenu>
  );
};

interface FileIconProps {
  item: Item;
  size?: 'large' | 'small' | 'list';
}

const FileIcon: React.FC<FileIconProps> = ({ item, size = 'large' }) => {
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    if (item.path && (item.type === 'file' || item.type === 'icon')) {
      console.log('[FileIcon] 正在获取图标:', item.path, item.type);
      window.electron.getFileIcon(item.path).then((result: unknown) => {
        const iconResult = result as { success: boolean; icon?: string; message?: string };
        console.log('[FileIcon] 获取结果:', result);
        if (iconResult.success && iconResult.icon) {
          setIcon(iconResult.icon);
        } else {
          console.warn('[FileIcon] 获取图标失败:', iconResult.message);
        }
      }).catch(err => {
        console.error('[FileIcon] 获取文件图标异常:', err);
      });
    }
  }, [item.path, item.type]);

  const iconSize = size === 'large' ? 64 : size === 'small' ? 40 : 24;

  if (icon) {
    return <img src={icon} alt="" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />;
  }

  switch (item.type) {
    case 'folder':
      return <FolderOutlined style={{ fontSize: iconSize, color: '#faad14' }} />;
    case 'icon':
      return <LinkOutlined style={{ fontSize: iconSize, color: '#1890ff' }} />;
    default:
      return <FileOutlined style={{ fontSize: iconSize, color: '#8c8c8c' }} />;
  }
};

const ItemList: React.FC = () => {
  const { items, activeBoxId, viewMode, reorderItems } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const filteredItems = items.filter(item => item.boxId === activeBoxId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
      const newIndex = filteredItems.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderItems(oldIndex, newIndex);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  if (viewMode === 'list') {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            border: isDragOver ? '2px dashed #1677ff' : '2px dashed #d9d9d9',
            borderRadius: '8px',
            padding: isDragOver ? '24px' : '0',
            minHeight: '400px',
            transition: 'all 0.2s',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {filteredItems.length === 0 ? (
            <Empty
              description={isDragOver ? '释放鼠标添加文件' : '将文件拖放到此处'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: '80px' }}
            />
          ) : (
            <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredItems.map(item => (
                  <ContextMenu key={item.id} type="item" data={item}>
                    <Card
                      size="small"
                      hoverable
                      style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                      bodyStyle={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', width: '100%' }}
                    >
                      <FileIcon item={item} size="list" />
                      <Text ellipsis style={{ flex: 1 }}>{item.name}</Text>
                    </Card>
                  </ContextMenu>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          border: isDragOver ? '2px dashed #1677ff' : '2px dashed #d9d9d9',
          borderRadius: '8px',
          padding: isDragOver ? '24px' : '0',
          minHeight: '400px',
          display: 'grid',
          gridTemplateColumns: viewMode === 'large'
            ? 'repeat(auto-fill, minmax(160px, 1fr))'
            : 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: viewMode === 'large' ? '20px' : '16px',
          transition: 'all 0.2s',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredItems.length === 0 ? (
          <Empty
            description={isDragOver ? '释放鼠标添加文件' : '将文件拖放到此处'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ gridColumn: '1 / -1', marginTop: '80px' }}
          />
        ) : (
          <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {filteredItems.map(item => (
              <SortableItem key={item.id} item={item} size={viewMode === 'large' ? 'large' : 'small'} />
            ))}
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
};

export default ItemList;
