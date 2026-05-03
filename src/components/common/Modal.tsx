import React, { useEffect, useRef } from 'react';
import { CustomButton } from './';

interface CustomModalProps {
  open: boolean;
  onCancel?: () => void;
  onOk?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: { loading?: boolean; disabled?: boolean; danger?: boolean };
  width?: number | string;
  centered?: boolean;
  closable?: boolean;
  mask?: { closable?: boolean };
}

const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onCancel,
  onOk,
  title,
  children,
  footer,
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  width = 500,
  centered = true,
  closable = true,
  mask = { closable: true }
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onCancel) {
        onCancel();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        open &&
        mask.closable &&
        onCancel
      ) {
        onCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, mask.closable, onCancel]);

  const handleOkClick = () => {
    if (!okButtonProps?.loading && onOk) {
      onOk();
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (!open) return null;

  const renderFooter = () => {
    if (footer !== undefined) {
      return footer;
    }

    return (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {cancelText && (
          <CustomButton onClick={handleCancelClick}>
            {cancelText}
          </CustomButton>
        )}
        {okText && (
          <CustomButton
            type="primary"
            onClick={handleOkClick}
            loading={okButtonProps?.loading}
            disabled={okButtonProps?.disabled}
            danger={okButtonProps?.danger}
          >
            {okText}
          </CustomButton>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px 0'
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: width,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--txt)'
          }}>
            {title}
          </h3>
          {closable && (
            <button
              onClick={handleCancelClick}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--txt2)',
                padding: 0,
                lineHeight: 1,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          )}
        </div>
        <div
          style={{
            padding: '24px',
            overflow: 'auto',
            flex: 1
          }}
        >
          {children}
        </div>
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)'
          }}
        >
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
