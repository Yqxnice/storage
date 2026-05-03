import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaCheck } from 'react-icons/fa';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择',
  style,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  // 计算所有选项中的最大文本宽度
  const maxTextWidth = useMemo(() => {
    let maxWidth = 0;
    const tempSpan = document.createElement('span');
    tempSpan.style.position = 'absolute';
    tempSpan.style.left = '-9999px';
    tempSpan.style.top = '0';
    tempSpan.style.fontSize = '13px';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontFamily = getComputedStyle(document.documentElement).fontFamily || 'Segoe UI, system-ui, sans-serif';
    tempSpan.style.boxSizing = 'border-box';
    tempSpan.style.padding = '0';
    tempSpan.style.margin = '0';
    
    options.forEach(option => {
      tempSpan.textContent = option.label;
      document.body.appendChild(tempSpan);
      maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
      document.body.removeChild(tempSpan);
    });
    
    // 同时计算 placeholder 的宽度
    tempSpan.textContent = placeholder;
    document.body.appendChild(tempSpan);
    maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
    document.body.removeChild(tempSpan);
    
    return maxWidth;
  }, [options, placeholder]);

  // 计算选择框宽度：文本宽度 + 下拉箭头空间 + 边距，不限制最大宽度
  const selectWidth = useMemo(() => {
    const minWidth = 120;
    const textWidth = maxTextWidth;
    const extraSpace = 70;
    const calculatedWidth = textWidth + extraSpace;
    return Math.max(minWidth, calculatedWidth);
  }, [maxTextWidth]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const selectRect = selectRef.current?.getBoundingClientRect();
      
      // 设置下拉框宽度与选择框一致
      dropdown.style.width = `${selectWidth}px`;
      
      if (selectRect) {
        const dropdownHeight = dropdown.offsetHeight;
        const spaceBelow = window.innerHeight - selectRect.bottom - 10;
        const spaceAbove = selectRect.top - 10;
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          dropdown.style.top = 'auto';
          dropdown.style.bottom = `${window.innerHeight - selectRect.top + 5}px`;
          dropdown.style.left = `${selectRect.left}px`;
        }
      }
    }
  }, [isOpen, selectWidth]);

  return (
    <>
      <div
        ref={selectRef}
        onClick={handleToggle}
        style={{
          position: 'relative',
          width: style?.width || `${selectWidth}px`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          ...style
        }}
      >
        <div
          style={{
            width: '100%',
            padding: '8px 45px 8px 12px', // 增加右边距，从32px增加到45px
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '13px',
            color: value ? 'var(--txt)' : 'var(--txt3)',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.2s',
            opacity: disabled ? 0.5 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {displayLabel}
        </div>
        <div
          style={{
            position: 'absolute',
            right: '12px', // 稍微调整箭头位置
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s',
            color: 'var(--txt2)',
            fontSize: '10px',
            pointerEvents: 'none'
          }}
        >
          ▼
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: selectRef.current?.getBoundingClientRect().left,
            top: selectRef.current?.getBoundingClientRect().bottom + 5,
            zIndex: 10000,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            maxHeight: '250px',
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                color: 'var(--txt)',
                backgroundColor: option.value === value ? 'var(--accentBg)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.backgroundColor = 'var(--bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <FaCheck style={{ color: 'var(--accent)', fontSize: '12px', flexShrink: 0, marginLeft: '8px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default CustomSelect;