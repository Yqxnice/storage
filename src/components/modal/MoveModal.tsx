import React from 'react';
import { type Box } from '../../store';
import { CustomModal } from '../common';

interface MoveModalProps {
  visible: boolean;
  onClose: () => void;
  onMove: (targetBoxId: string) => void;
  boxes: Box[];
  currentBoxId: string | null;
}

const MoveModal: React.FC<MoveModalProps> = ({ visible, onClose, onMove, boxes, currentBoxId }) => {
  const filteredBoxes = boxes.filter(box => box.id !== currentBoxId);

  const handleMove = (targetBoxId: string) => {
    onMove(targetBoxId);
    onClose();
  };

  return (
    <CustomModal
      open={visible}
      onCancel={onClose}
      title="移动到收纳盒"
      footer={null}
      width={300}
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
        {filteredBoxes.map(box => (
          <button
            key={box.id}
            onClick={() => handleMove(box.id)}
            style={{
              textAlign: 'left',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: 'var(--txt)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.1s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {box.name} ({box.itemCount || 0} 个文件)
          </button>
        ))}
        {filteredBoxes.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--txt3)', padding: '20px', fontSize: '12px' }}>
            没有其他收纳盒
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default MoveModal;