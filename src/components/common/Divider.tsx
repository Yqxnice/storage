import React from 'react';

interface DividerProps {
  orientation?: 'left' | 'center' | 'right';
  type?: 'horizontal' | 'vertical';
  dashed?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({
  orientation = 'center',
  type = 'horizontal',
  dashed = false,
  children,
  style,
  className
}) => {
  if (type === 'vertical') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-block',
          width: '1px',
          height: '100%',
          backgroundColor: 'var(--border)',
          margin: '0 8px',
          verticalAlign: 'middle',
          ...style
        }}
      />
    );
  }

  if (!children) {
    return (
      <div
        className={className}
        style={{
          borderTop: dashed ? `1px dashed var(--border)` : `1px solid var(--border)`,
          margin: '16px 0',
          ...style
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: '16px 0',
        ...style
      }}
    >
      <div style={{
        flex: 1,
        borderTop: dashed ? `1px dashed var(--border)` : `1px solid var(--border)`
      }} />
      <div
        style={{
          padding: '0 16px',
          color: 'var(--txt2)',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          ...(
            orientation === 'left' ? { marginLeft: '16px', order: 2 } :
            orientation === 'right' ? { marginRight: '16px', order: 0 } :
            {}
          )
        }}
      >
        {children}
      </div>
      <div style={{
        flex: 1,
        borderTop: dashed ? `1px dashed var(--border)` : `1px solid var(--border)`
      }} />
    </div>
  );
};

export default Divider;
