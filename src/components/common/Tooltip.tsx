import React, { useState } from 'react';

interface TooltipProps {
  title: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  placement = 'top'
}) => {
  const [visible, setVisible] = useState(false);

  const getPlacementStyles = () => {
    switch (placement) {
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' };
      default:
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
    }
  };

  return (
    <div
      style={{ display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && title && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10000,
            ...getPlacementStyles(),
            padding: '6px 12px',
            backgroundColor: 'var(--txt)',
            color: 'var(--surface)',
            fontSize: '12px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
