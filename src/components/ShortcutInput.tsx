import React, { useState, useCallback, useEffect } from 'react';
import { showMessage } from './common';
import CustomInput from './common/CustomInput';

interface ShortcutInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ShortcutInput: React.FC<ShortcutInputProps> = ({ value, onChange, placeholder = '按下快捷键' }) => {
  const [recording, setRecording] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 获取按下的键（不包含修饰键）
    const key = e.key;
    
    // 跳过独立的修饰键按下（如只按下 Ctrl、Shift、Alt 而没有其他键）
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return;
    }

    // 构建修饰键列表
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Meta');

    // 如果没有修饰键，至少需要一个普通键
    if (modifiers.length === 0) {
      return;
    }

    // 格式化修饰键
    const formattedModifiers = modifiers.map(k => {
      if (k === 'Control') return 'Ctrl';
      if (k === 'Meta') return 'Win';
      return k;
    });

    // 格式化普通键
    let formattedKey = key;
    if (key.length === 1) {
      formattedKey = key.toUpperCase();
    } else if (key === ' ') {
      formattedKey = 'Space';
    } else if (key.startsWith('Arrow')) {
      formattedKey = key.replace('Arrow', '');
    }

    const formatted = [...formattedModifiers, formattedKey].join('+');
    onChange(formatted);
    setRecording(false);
    showMessage.success(`快捷键已设置为: ${formatted}`);
  }, [onChange]);

  const handleClick = () => {
    setRecording(true);
    showMessage.info('请按下快捷键组合（如 Ctrl+Shift+Space）');
  };

  useEffect(() => {
    if (recording) {
      window.addEventListener('keydown', handleKeyDown, { once: false });
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [recording, handleKeyDown]);

  return (
    <CustomInput
      value={value}
      placeholder={placeholder}
      onClick={handleClick}
      readOnly
      style={{ 
        cursor: 'pointer',
        backgroundColor: recording ? '#e6f7ff' : undefined,
        borderColor: recording ? '#1890ff' : undefined
      }}
    />
  );
};

export default ShortcutInput;