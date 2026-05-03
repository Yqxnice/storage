import React, { useState } from 'react';

interface CheckboxProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
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
          type="checkbox"
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
            borderRadius: '3px',
            border: `2px solid ${checked || indeterminate ? 'var(--accent)' : (isHovered ? 'var(--accent)' : 'var(--border)')}`,
            backgroundColor: checked || indeterminate ? 'var(--accent)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
        >
          {checked && !indeterminate && (
            <span style={{
              color: '#fff',
              fontSize: '10px',
              fontWeight: 'bold',
              lineHeight: 1
            }}>✓</span>
          )}
          {indeterminate && (
            <span style={{
              width: '8px',
              height: '2px',
              backgroundColor: '#fff',
              borderRadius: '1px'
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

interface CheckboxGroupProps {
  value?: string[];
  onChange?: (checkedValues: string[]) => void;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  value = [],
  onChange,
  options,
  children,
  style,
  className,
  direction = 'vertical'
}) => {
  const [internalValue, setInternalValue] = useState<string[]>(value);

  const handleChange = (checkedValue: string, checked: boolean) => {
    let newValue: string[];
    if (checked) {
      newValue = [...internalValue, checkedValue];
    } else {
      newValue = internalValue.filter(v => v !== checkedValue);
    }
    setInternalValue(newValue);
    onChange?.(newValue);
  };

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
          <Checkbox
            key={option.value}
            checked={internalValue.includes(option.value)}
            disabled={option.disabled}
            onChange={(e) => handleChange(option.value, e.target.checked)}
          >
            {option.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const childValue = (child.props as any).value;
          return React.cloneElement(child as React.ReactElement<any>, {
            checked: internalValue.includes(childValue),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(childValue, e.target.checked)
          });
        }
        return child;
      })}
    </div>
  );
};

export default Checkbox;
