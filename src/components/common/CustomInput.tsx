import React, { useState, useRef, forwardRef } from 'react';

interface CustomInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number' | 'email' | 'url' | 'search';
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  enterButton?: React.ReactNode;
  onSearch?: (value: string) => void;
  loading?: boolean;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  readOnly = false,
  autoFocus = false,
  style,
  className,
  onClick,
  onKeyDown,
  onBlur,
  onFocus,
  prefix,
  suffix,
  enterButton,
  onSearch,
  loading = false,
  ...props
}, ref) => {
  const innerRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value || '');
    }
    onKeyDown?.(e);
  };

  const handleEnterButtonClick = () => {
    if (onSearch) {
      onSearch(value || '');
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: style?.width || '100%',
        ...style
      }}
    >
      {prefix && (
        <div style={{
          position: 'absolute',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--txt2)',
          zIndex: 1
        }}>
          {prefix}
        </div>
      )}

      <input
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        style={{
          width: '100%',
          padding: prefix ? '8px 12px 8px 36px' : '8px 12px',
          paddingRight: suffix || enterButton ? '40px' : '12px',
          backgroundColor: 'var(--surface)',
          border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: enterButton ? '6px 0 0 6px' : '6px',
          fontSize: '13px',
          color: 'var(--txt)',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : readOnly ? 'pointer' : 'text'
        }}
        {...props}
      />

      {suffix && (
        <div style={{
          position: 'absolute',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--txt2)'
        }}>
          {suffix}
        </div>
      )}

      {enterButton && (
        <button
          type="button"
          onClick={handleEnterButtonClick}
          disabled={disabled || loading}
          style={{
            padding: '8px 16px',
            border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            backgroundColor: 'var(--surface)',
            color: 'var(--txt)',
            fontSize: '13px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'var(--bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }
          }}
        >
          {loading ? '加载中...' : enterButton}
        </button>
      )}
    </div>
  );
});

CustomInput.displayName = 'CustomInput';

export default CustomInput;
