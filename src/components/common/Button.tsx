import React, { useState } from 'react';

interface CustomButtonProps {
  children: React.ReactNode;
  type?: 'primary' | 'default' | 'dashed' | 'danger' | 'link';
  htmlType?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  block?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  type = 'default',
  htmlType = 'button',
  size = 'middle',
  disabled = false,
  loading = false,
  icon,
  danger = false,
  onClick,
  style,
  className,
  block = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: 'var(--spacing-xs) var(--spacing-md)', fontSize: 'var(--font-size-sm)' };
      case 'large':
        return { padding: 'var(--spacing-md) var(--spacing-xl)', fontSize: 'var(--font-size-lg)' };
      default:
        return { padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: 'var(--font-size-base)' };
    }
  };

  const getTypeStyles = () => {
    const isDisabled = disabled || loading;
    
    if (type === 'primary' || danger) {
      return {
        backgroundColor: isDisabled ? 'var(--txt3)' : (danger ? '#ff4d4f' : 'var(--accent)'),
        borderColor: isDisabled ? 'var(--txt3)' : (danger ? '#ff4d4f' : 'var(--accent)'),
        color: '#fff',
        hoverBg: isDisabled ? 'var(--txt3)' : (danger ? '#ff7875' : 'var(--accent)'),
        activeBg: isDisabled ? 'var(--txt3)' : (danger ? '#d93637' : 'var(--accent)')
      };
    }
    
    if (type === 'dashed') {
      return {
        backgroundColor: 'transparent',
        borderColor: isDisabled ? 'var(--txt3)' : 'var(--border)',
        borderStyle: 'dashed',
        color: isDisabled ? 'var(--txt3)' : 'var(--txt)',
        hoverBg: isDisabled ? 'transparent' : 'var(--bg)',
        activeBg: isDisabled ? 'transparent' : 'var(--border)'
      };
    }

    if (type === 'link') {
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: isDisabled ? 'var(--txt3)' : 'var(--accent)',
        hoverBg: 'transparent',
        activeBg: 'transparent'
      };
    }

    return {
      backgroundColor: isDisabled ? 'var(--bg)' : (isHovered ? 'var(--bg)' : 'var(--surface)'),
      borderColor: isDisabled ? 'var(--txt3)' : 'var(--border)',
      color: isDisabled ? 'var(--txt3)' : 'var(--txt)',
      hoverBg: isDisabled ? 'var(--bg)' : 'var(--bg)',
      activeBg: isDisabled ? 'var(--bg)' : 'var(--border)'
    };
  };

  const sizeStyles = getSizeStyles();
  const typeStyles = getTypeStyles();

  return (
    <button
      type={htmlType}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        display: block ? 'block' : 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm)',
        ...sizeStyles,
        backgroundColor: isActive ? typeStyles.activeBg : (isHovered ? typeStyles.hoverBg : typeStyles.backgroundColor),
        border: `${typeStyles.borderStyle || 'solid'} 1px ${typeStyles.borderColor}`,
        borderRadius: 'var(--radius-sm)',
        color: typeStyles.color,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontWeight: 'var(--font-weight-medium)',
        transition: 'all var(--transition-normal) var(--ease-out)',
        opacity: loading ? 0.7 : 1,
        width: block ? '100%' : 'auto',
        ...style
      }}
    >
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      )}
      {!loading && icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
};

export default CustomButton;
