import React, { useState } from 'react';
import { CustomModal, CustomRadio, RadioGroup } from './common';

interface DataPathSelectorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

const DataPathSelector: React.FC<DataPathSelectorProps> = ({ visible, onClose, onConfirm }) => {
  const [selectedPath, setSelectedPath] = useState('appdata');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      onConfirm(selectedPath);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedPath('appdata');
    onClose();
  };

  return (
    <CustomModal
      title="您的数据选择"
      open={visible}
      onOk={handleConfirm}
      onCancel={handleCancel}
      okText="继续"
      cancelText="取消"
      okButtonProps={{ loading }}
      width={500}
      closable={false}
    >
      <div style={{ padding: '10px 0' }}>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--txt)' }}>
          请选择桌面收纳存储用户数据的位置。
        </p>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--txt)' }}>
          您可以稍后在设置中查看用户数据或清除(或重新选择)。
        </p>

        <RadioGroup
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          direction="vertical"
        >
          <CustomRadio value="appdata">AppData</CustomRadio>
          <CustomRadio value="current">当前目录</CustomRadio>
        </RadioGroup>

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <p style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--txt)' }}>
            <strong>AppData：</strong> 数据将存放在与用户关联的 AppData 文件夹中，对数据互通更友好，适合一般使用场景。
          </p>
          <p style={{ fontSize: '14px', color: 'var(--txt)' }}>
            <strong>当前目录：</strong> 数据将存放在应用当前目录中，适合便携式使用体验。
          </p>
        </div>
      </div>
    </CustomModal>
  );
};

export default DataPathSelector;