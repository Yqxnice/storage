import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'outlined' | 'filled' | 'borderless';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  className,
  variant = 'outlined'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: 'var(--bg)',
          border: 'none'
        };
      case 'borderless':
        return {
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none'
        };
      default:
        return {
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)'
        };
    }
  };

  return (
    <div
      className={className}
      style={{
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        ...getVariantStyles(),
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Card;
