import React, { useState } from 'react';
import { Dropdown, Modal, Input, Button, message } from 'antd';
import type { MenuProps } from 'antd';
import { EditOutlined, DeleteOutlined, FolderOpenOutlined, SwapOutlined } from '@ant-design/icons';
import { useStore } from '../store';

interface ContextMenuProps {
  type: 'box' | 'item';
  data: {
    id: string;
    name: string;
    path?: string;
    boxId?: string;
    itemCount?: number;
  };
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ type, data, children }) => {
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  
  const { updateBox, deleteBox, removeItem, moveItem, boxes } = useStore();

  // 处理重命名
  const handleRename = () => {
    if (!newName.trim()) {
      message.warning('名称不能为空');
      return;
    }
    
    if (type === 'box') {
      updateBox(data.id, newName);
      message.success('收纳盒重命名成功');
    } else {
      message.info('文件重命名功能开发中');
    }
    
    setRenameModalVisible(false);
    setNewName('');
  };

  // 处理删除
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: type === 'box' 
        ? `确定要删除收纳盒"${data.name}"吗？其中的文件将被移除。`
        : `确定要移除文件"${data.name}"吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        if (type === 'box') {
          deleteBox(data.id);
          message.success('收纳盒已删除');
        } else {
          removeItem(data.id);
          message.success('文件已移除');
        }
      },
    });
  };

  // 处理打开文件
  const handleOpen = () => {
    if (type === 'item' && data.path) {
      window.electron.ipcRenderer.send('open-item', data);
      message.success('正在打开文件');
    }
  };

  // 处理移动
  const handleMove = (targetBoxId: string) => {
    if (type === 'item') {
      moveItem(data.id, targetBoxId);
      message.success('文件已移动');
      setMoveModalVisible(false);
    }
  };

  // 收纳盒菜单项
  const boxMenuItems: MenuProps['items'] = [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: () => {
        setNewName(data.name);
        setRenameModalVisible(true);
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      danger: true,
      label: '删除',
      onClick: handleDelete,
    },
  ];

  // 文件项菜单项
  const itemMenuItems: MenuProps['items'] = [
    {
      key: 'open',
      icon: <FolderOpenOutlined />,
      label: '打开文件',
      onClick: handleOpen,
    },
    {
      key: 'move',
      icon: <SwapOutlined />,
      label: '移动到',
      onClick: () => setMoveModalVisible(true),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      danger: true,
      label: '移除',
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <Dropdown 
        menu={{ items: type === 'box' ? boxMenuItems : itemMenuItems }}
        trigger={['contextMenu']}
      >
        <div onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}>
          {children}
        </div>
      </Dropdown>

      {/* 重命名对话框 */}
      <Modal
        title="重命名"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setNewName('');
        }}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleRename}
          placeholder="请输入名称"
          autoFocus
        />
      </Modal>

      {/* 移动对话框 */}
      <Modal
        title="移动到收纳盒"
        open={moveModalVisible}
        onCancel={() => setMoveModalVisible(false)}
        footer={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {boxes
            .filter(box => box.id !== data.boxId)
            .map(box => (
              <Button
                key={box.id}
                onClick={() => handleMove(box.id)}
                style={{ textAlign: 'left' }}
              >
                {box.name} ({box.itemCount} 个文件)
              </Button>
            ))
          }
          {boxes.filter(box => box.id !== data.boxId).length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              没有其他收纳盒
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ContextMenu;
