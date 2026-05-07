import React, { useState } from 'react';
import { CustomModal, CustomRadio, RadioGroup, CustomButton } from '../common';

interface StoragePathModalProps {
  visible: boolean;
  currentPath: string;
  onClose: () => void;
  onConfirm: (newPath: string, migrateData: boolean) => void;
}

const StoragePathModal: React.FC<StoragePathModalProps> = ({
  visible,
  currentPath,
  onClose,
  onConfirm,
}) => {
  const [newPath, setNewPath] = useState('');
  const [migrateData, setMigrateData] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSelectPath = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        title: "选择新的存储目录",
      });
      if (selected && typeof selected === 'string') {
        setNewPath(selected);
      }
    } catch (error) {
      console.error('选择目录失败:', error);
    }
  };

  const handleConfirm = async () => {
    if (!newPath || newPath.trim() === '') {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(newPath, migrateData);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewPath('');
    setMigrateData(true);
    onClose();
  };

  return (
    <CustomModal
      title="更改存储路径"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={520}
      closable={false}
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--txt2)', marginBottom: '8px' }}>
            当前存储路径
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--txt)',
            wordBreak: 'break-all'
          }}>
            {currentPath || '未知'}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--txt2)', marginBottom: '8px' }}>
            新存储路径
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '13px',
              color: newPath ? 'var(--txt)' : 'var(--txt2)',
              wordBreak: 'break-all',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {newPath || '请选择新的存储目录'}
            </div>
            <CustomButton
              onClick={handleSelectPath}
              style={{ borderRadius: '6px', padding: '0 16px' }}
            >
              浏览
            </CustomButton>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--txt)', marginBottom: '12px', fontWeight: 500 }}>
            数据迁移选项
          </div>
          <RadioGroup
            value={migrateData ? 'migrate' : 'no-migrate'}
            onChange={(e) => setMigrateData(e.target.value === 'migrate')}
            direction="vertical"
          >
            <CustomRadio value="migrate" style={{ marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--txt)' }}>迁移数据</span>
                <span style={{ fontSize: '12px', color: 'var(--txt2)', marginLeft: '8px' }}>
                  将现有数据迁移到新路径，然后删除原文件夹并重启应用
                </span>
              </div>
            </CustomRadio>
            <CustomRadio value="no-migrate">
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--txt)' }}>不迁移数据</span>
                <span style={{ fontSize: '12px', color: 'var(--txt2)', marginLeft: '8px' }}>
                  直接使用新路径，删除原文件夹并重启应用（数据将丢失）
                </span>
              </div>
            </CustomRadio>
          </RadioGroup>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: '#fff7e6',
          border: '1px solid #ffe082',
          borderRadius: '6px',
        }}>
          <div style={{ fontSize: '12px', color: '#fa8c16', lineHeight: 1.6 }}>
            <strong>⚠️ 注意：</strong>更改存储路径后需要重启应用才能生效。请确保在操作前已备份重要数据。
            {!migrateData && (
              <div style={{ marginTop: '8px' }}>
                <strong>⚠️ 警告：</strong>选择"不迁移数据"将导致所有现有收纳盒数据丢失！
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <CustomButton
            onClick={handleCancel}
            style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
          >
            取消
          </CustomButton>
          <CustomButton
            type="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={!newPath || loading}
            style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
          >
            确定更改
          </CustomButton>
        </div>
      </div>
    </CustomModal>
  );
};

export default StoragePathModal;