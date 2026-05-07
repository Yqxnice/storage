import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CustomButton } from './';

export type ModalSize = 'small' | 'middle' | 'large' | 'full';

export interface ModalProps {
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
  size?: ModalSize;
  centered?: boolean;
  closable?: boolean;
  mask?: { closable?: boolean; style?: React.CSSProperties };
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  draggable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  footerStyle?: React.CSSProperties;
  maskStyle?: React.CSSProperties;
  role?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  beforeClose?: (action: 'ok' | 'cancel' | 'mask' | 'esc') => Promise<boolean> | boolean;
}

const sizeMap: Record<ModalSize, number | string> = {
  small: 380,
  middle: 500,
  large: 680,
  full: '90vw'
};

const CustomModal: React.FC<ModalProps> = ({
  open,
  onCancel,
  onOk,
  title,
  children,
  footer,
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  width,
  size = 'middle',
  centered = true,
  closable = true,
  mask = { closable: true },
  maskClosable,
  keyboard = true,
  destroyOnClose = false,
  draggable = false,
  className,
  style,
  bodyStyle,
  headerStyle,
  footerStyle,
  maskStyle,
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
  beforeClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const focusRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(async (action: 'ok' | 'cancel' | 'mask' | 'esc') => {
    if (beforeClose) {
      const canClose = await beforeClose(action);
      if (!canClose) return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (action === 'ok' && onOk) {
        onOk();
      } else if (onCancel) {
        onCancel();
      }
    }, 150);
  }, [beforeClose, onOk, onCancel]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (keyboard && e.key === 'Escape' && open && !isClosing) {
      handleClose('esc');
    }
  }, [keyboard, open, isClosing, handleClose]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    const isMaskClick = modalRef.current && !modalRef.current.contains(target);
    const canCloseByMask = maskClosable !== undefined ? maskClosable : mask.closable;
    
    if (isMaskClick && open && canCloseByMask && !isClosing) {
      handleClose('mask');
    }
  }, [open, mask, maskClosable, isClosing, handleClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);

      setTimeout(() => {
        focusRef.current?.focus();
      }, 16);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleKeyDown, handleClickOutside]);

  useEffect(() => {
    const handleDragStart = (e: MouseEvent) => {
      if (!draggable || !headerRef.current) return;
      const headerRect = headerRef.current.getBoundingClientRect();
      const modalRect = modalRef.current?.getBoundingClientRect();
      
      if (modalRect && e.clientX >= headerRect.left && e.clientX <= headerRect.right &&
          e.clientY >= headerRect.top && e.clientY <= headerRect.bottom) {
        setIsDragging(true);
        // setStartPos({ x: e.clientX, y: e.clientY });
        setStartOffset({ 
          x: e.clientX - modalRect.left, 
          y: e.clientY - modalRect.top 
        });
      }
    };

    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging || !modalRef.current) return;
      const newX = e.clientX - startOffset.x;
      const newY = e.clientY - startOffset.y;
      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (open && draggable) {
      document.addEventListener('mousedown', handleDragStart);
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousedown', handleDragStart);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [open, draggable, isDragging, startOffset]);

  const handleOkClick = () => {
    if (!okButtonProps?.loading) {
      handleClose('ok');
    }
  };

  const handleCancelClick = () => {
    handleClose('cancel');
  };

  if (destroyOnClose && !open) return null;

  const hasHeader = title !== undefined || closable;
  const hasFooter = footer !== undefined || okText !== undefined || cancelText !== undefined;
  const computedWidth = width || sizeMap[size];

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
        padding: '20px 0',
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transition: 'opacity 150ms ease-out, visibility 150ms ease-out',
        pointerEvents: open ? 'auto' : 'none',
        ...maskStyle,
        ...(mask?.style || {})
      }}
    >
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          width: computedWidth,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: open && !isClosing
            ? `translate(${position.x}px, ${position.y}px) scale(1)`
            : `translate(${position.x}px, ${position.y}px) scale(0.95)`,
          opacity: open && !isClosing ? 1 : 0,
          transition: 'transform 150ms ease-out, opacity 150ms ease-out',
          cursor: isDragging ? 'grabbing' : draggable && hasHeader ? 'grab' : 'default',
          ...style
        }}
        className={className}
      >
        {hasHeader && (
          <div
            ref={headerRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              ...headerStyle
            }}
          >
            {title !== undefined && (
              <h3 
                id={ariaLabelledBy}
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--txt)'
                }}
              >
                {title}
              </h3>
            )}
            {closable && (
              <button
                ref={focusRef}
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
                  justifyContent: 'center',
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
        )}

        <div
          style={{
            padding: hasHeader ? '20px 24px' : '24px',
            overflow: 'auto',
            flex: 1,
            ...bodyStyle
          }}
        >
          {children}
        </div>

        {hasFooter && (
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              ...footerStyle
            }}
          >
            {footer !== undefined ? (
              footer
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomModal;