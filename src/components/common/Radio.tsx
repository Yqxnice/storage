import React, { useState, Children, isValidElement, cloneElement } from 'react';

interface RadioProps {
  value: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Radio: React.FC<RadioProps> = ({
  value,
  checked,
  onChange,
  disabled = false,
  children,
  style,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <label
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="radio"
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '16px',
            height: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: `2px solid ${checked ? 'var(--accent)' : (isHovered ? 'var(--accent)' : 'var(--border)')}`,
            backgroundColor: checked ? 'var(--accent)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
        >
          {checked && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#fff'
            }} />
          )}
        </div>
      </div>
      {children && (
        <span style={{
          fontSize: '13px',
          color: 'var(--txt)',
          lineHeight: 1.5
        }}>
          {children}
        </span>
      )}
    </label>
  );
};

interface RadioGroupProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  children,
  style,
  className,
  direction = 'vertical'
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: direction === 'horizontal' ? '16px' : '8px',
    ...style
  };

  if (options) {
    return (
      <div className={className} style={containerStyle}>
        {options.map(option => (
          <Radio
            key={option.value}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={onChange}
          >
            {option.label}
          </Radio>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return cloneElement(child as React.ReactElement<any>, {
            checked: value === child.props.value,
            onChange
          });
        }
        return child;
      })}
    </div>
  );
};

export default Radio;
