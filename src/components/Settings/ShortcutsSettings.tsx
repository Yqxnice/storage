import React, { useState, useRef } from 'react';
import { useStore } from '../../store';

const ShortcutsSettings: React.FC = () => {
  const { shortcuts, setShortcuts } = useStore();
  const [shortcutValue, setShortcutValue] = useState(shortcuts.toggleApp || "Ctrl+Shift+Space");
  const [isRecording, setIsRecording] = useState(false);
  const shortcutInputRef = useRef<HTMLInputElement>(null);

  const handleToggleAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newShortcut = e.target.value;
    console.log('Shortcut changed:', newShortcut);
    
    // 验证快捷键格式
    const isValidShortcut = validateShortcut(newShortcut);
    if (!isValidShortcut) {
      console.warn('无效的快捷键格式:', newShortcut);
      return;
    }
    
    setShortcutValue(newShortcut);
    const updatedShortcuts = { ...shortcuts, toggleApp: newShortcut };
    console.log('Updated shortcuts:', updatedShortcuts);
    setShortcuts(updatedShortcuts);
    if (window.electron && window.electron.store) {
      window.electron.store.set({
        key: "shortcuts",
        value: updatedShortcuts,
        storeType: "settings",
      });
      console.log('Shortcut saved to store');
      if (window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send("settings:changed");
        console.log('Settings changed event sent');
      }
    }
  };

  // 验证快捷键格式
  const validateShortcut = (shortcut: string): boolean => {
    if (!shortcut) return false;
    
    const parts = shortcut.split('+');
    if (parts.length < 2) return false; // 至少需要一个修饰键和一个普通键
    
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];
    
    // 验证修饰键
    const validModifiers = ['Ctrl', 'Shift', 'Alt', 'Meta'];
    for (const mod of modifiers) {
      if (!validModifiers.includes(mod)) return false;
    }
    
    // 验证修饰键不重复
    const uniqueModifiers = [...new Set(modifiers)];
    if (uniqueModifiers.length !== modifiers.length) return false;
    
    // 验证普通键
    const invalidKeys = ['Control', 'Shift', 'Alt', 'Meta'];
    if (invalidKeys.includes(key)) return false;
    
    return true;
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Meta');
    
    const key = e.key.replace('Control', 'Ctrl').replace(' ', 'Space');
    
    if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      // 确保至少有一个修饰键
      if (modifiers.length === 0) {
        console.warn('快捷键必须包含至少一个修饰键（Ctrl/Shift/Alt/Meta）');
        return;
      }
      
      // 确保修饰键不重复
      const uniqueModifiers = [...new Set(modifiers)];
      if (uniqueModifiers.length !== modifiers.length) {
        console.warn('快捷键不能包含重复的修饰键');
        return;
      }
      
      const shortcut = [...uniqueModifiers, key].join('+');
      
      // 验证快捷键格式
      if (!validateShortcut(shortcut)) {
        console.warn('无效的快捷键格式:', shortcut);
        return;
      }
      
      setShortcutValue(shortcut);
      
      const updatedShortcuts = { ...shortcuts, toggleApp: shortcut };
      setShortcuts(updatedShortcuts);
      
      if (window.electron && window.electron.store) {
        window.electron.store.set({
          key: "shortcuts",
          value: updatedShortcuts,
          storeType: "settings",
        });
        if (window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send("settings:changed");
        }
      }
      
      // 自动取消聚焦
      shortcutInputRef.current?.blur();
    }
  };

  return (
    <div className="page-section">
      <div className="page-section-title">快捷键设置</div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">显示/隐藏应用</div>
            <div className="page-row-desc">
              全局快捷键，调出桌面收纳
            </div>
          </div>
          <input
            ref={shortcutInputRef}
            type="text"
            className="page-input"
            value={shortcutValue}
            onChange={handleToggleAppChange}
            onKeyDown={handleShortcutKeyDown}
            placeholder="按下组合键设置快捷键"
          />
        </div>
      </div>
    </div>
  );
};

export default ShortcutsSettings;