import React, { useState } from 'react';
import { CustomModal, CustomRadio, RadioGroup, CustomButton } from './common';
import { tauriIPC } from '../utils/tauri-ipc';

interface DataPathSelectorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

const DataPathSelector: React.FC<DataPathSelectorProps> = ({ visible, onClose: _onClose, onConfirm }) => {
  const [selectedPath, setSelectedPath] = useState('current');
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
    tauriIPC.window.close();
  };

  const renderFooter = () => (
    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
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
        style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
      >
        确定
      </CustomButton>
    </div>
  );

  return (
    <CustomModal
      title="选择存储位置"
      open={visible}
      footer={renderFooter()}
      width={480}
      closable={false}
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
          请选择数据存储位置。
        </p>

        <RadioGroup
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          direction="vertical"
        >
          <CustomRadio value="current" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--txt)' }}>当前目录</span>
              <span style={{ fontSize: '12px', color: 'var(--txt2)', marginTop: '2px' }}>
                数据存放在应用目录，适合便携使用
              </span>
            </div>
          </CustomRadio>
          <CustomRadio value="appdata">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--txt)' }}>AppData</span>
              <span style={{ fontSize: '12px', color: 'var(--txt2)', marginTop: '2px' }}>
                数据存放在用户 AppData 文件夹
              </span>
            </div>
          </CustomRadio>
        </RadioGroup>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--txt)' }}>💡 提示</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--txt2)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <span style={{ color: 'var(--txt)' }}>当前目录：</span>
              适合便携使用，可将应用复制到其他设备。
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: 'var(--txt)' }}>AppData：</span>
              适合一般使用，数据随用户账户保存。
            </p>
          </div>
          <p style={{ margin: '12px 0 0 0', color: '#ff4d4f', fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠</span>
            <span>点击取消将关闭应用</span>
          </p>
        </div>
      </div>
    </CustomModal>
  );
};

export default DataPathSelector;