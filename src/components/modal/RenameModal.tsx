import React, { useState, useEffect, useRef } from 'react';
import { CustomModal, CustomInput, CustomButton } from '../common';

interface RenameModalProps {
  visible: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  initialName: string;
}

const RenameModal: React.FC<RenameModalProps> = ({ visible, onClose, onRename, initialName }) => {
  const [newName, setNewName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setNewName(initialName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [visible, initialName]);

  const handleRename = () => {
    if (!newName.trim()) {
      onClose();
      return;
    }
    
    onRename(newName);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    }
  };

  return (
    <CustomModal
      open={visible}
      onCancel={handleCancel}
      onOk={handleRename}
      title="重命名"
      okText="确定"
      cancelText="取消"
      width={300}
      centered
    >
      <CustomInput
        ref={inputRef}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="请输入名称"
      />
    </CustomModal>
  );
};

export default RenameModal;