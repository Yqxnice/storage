import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { showMessage } from '../common';
import { CustomInput } from '../common';
import { CustomCard, CustomTooltip } from '../common';
import { tauriIPC } from '../../utils/tauri-ipc';
import { getThemeColors } from '../../utils/theme';

const ShortcutsSettings: React.FC = () => {
  const { shortcuts, setShortcuts, theme } = useStore();
  const [shortcutValue, setShortcutValue] = useState(shortcuts.toggleApp || "Ctrl+Shift+Space");
  const [recording, setRecording] = useState(false);
  const shortcutInputRef = useRef<HTMLInputElement>(null);
  
  // 获取当前主题的颜色
  const themeColors = getThemeColors(theme);

  // 验证快捷键格式
  const validateShortcut = useCallback((shortcut: string): boolean => {
    if (!shortcut) return false;
    
    const parts = shortcut.split('+');
    if (parts.length < 2) return false;
    
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];
    
    const validModifiers = ['Ctrl', 'Shift', 'Alt', 'Meta', 'Win'];
    for (const mod of modifiers) {
      if (!validModifiers.includes(mod)) return false;
    }
    
    const uniqueModifiers = [...new Set(modifiers)];
    if (uniqueModifiers.length !== modifiers.length) return false;
    
    const invalidKeys = ['Control', 'Shift', 'Alt', 'Meta', 'Win'];
    if (invalidKeys.includes(key)) return false;
    
    return true;
  }, []);

  const handleToggleAppChange = useCallback((newShortcut: string) => {
    // 验证快捷键格式
    const isValidShortcut = validateShortcut(newShortcut);
    if (!isValidShortcut) {
      showMessage.warning('无效的快捷键格式');
      return;
    }
    
    // 先注销旧快捷键
    if (shortcuts.toggleApp) {
      tauriIPC.shortcut.unregister(shortcuts.toggleApp).then((success) => {
        if (success) {

        } else {

        }
      });
    }
    
    setShortcutValue(newShortcut);
    // 直接创建新的 shortcuts 对象，不依赖于当前的 shortcuts 状态
    const updatedShortcuts = { toggleApp: newShortcut };
    
    // 同步更新状态并异步保存
    setShortcuts(updatedShortcuts);
    showMessage.success('快捷键已保存');
    
    // 注册全局快捷键
    tauriIPC.shortcut.register(newShortcut).then((success) => {
      if (success) {
        showMessage.success('全局快捷键已生效');
      } else {
        showMessage.warning('全局快捷键注册失败');
      }
    }).catch((error) => {

      showMessage.error('注册快捷键失败');
    });
  }, [shortcuts.toggleApp, setShortcuts, validateShortcut]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recording) return;
    
    e.preventDefault();
    e.stopPropagation();

    const key = e.key;
    
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Meta');

    if (modifiers.length === 0) {
      return;
    }

    // 去重修饰键
    const uniqueModifiers = [...new Set(modifiers)];
    
    const formattedModifiers = uniqueModifiers.map(k => {
      if (k === 'Control') return 'Ctrl';
      if (k === 'Meta') return 'Win';
      return k;
    });

    let formattedKey = key;
    if (key.length === 1) {
      formattedKey = key.toUpperCase();
    } else if (key === ' ') {
      formattedKey = 'Space';
    } else if (key.startsWith('Arrow')) {
      formattedKey = key.replace('Arrow', '');
    }

    const formatted = [...formattedModifiers, formattedKey].join('+');
    
    if (validateShortcut(formatted)) {
      handleToggleAppChange(formatted);
      setRecording(false);
    } else {
      showMessage.warning('无效的快捷键格式');
    }
  }, [recording, handleToggleAppChange, validateShortcut]);

  useEffect(() => {
    if (recording) {
      window.addEventListener('keydown', handleKeyDown, { once: false });
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [recording, handleKeyDown]);

  const handleClick = () => {
    setRecording(true);
    showMessage.info('请按下快捷键组合（如 Ctrl+Shift+Space）');
  };

  return (
    <div className="page-section" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '24px', color: themeColors.txt, fontSize: '18px', fontWeight: 600 }}>快捷键设置</h2>

      <CustomCard
        style={{
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          backgroundColor: themeColors.card,
          borderColor: themeColors.border
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <h3 style={{ marginBottom: '8px', color: themeColors.txt, fontSize: '16px', fontWeight: 500 }}>
              显示/隐藏应用
            </h3>
            <p style={{ marginBottom: '0', color: themeColors.txt2, fontSize: '14px' }}>
              全局快捷键，调出桌面收纳
            </p>
          </div>

          <div style={{ minWidth: '200px' }}>
            <CustomTooltip title={recording ? "正在录制..." : "点击开始录制快捷键"}>
              <CustomInput
                value={shortcutValue}
                placeholder="点击输入框后按下快捷键"
                readOnly
                onClick={handleClick}
                style={{
                  cursor: 'pointer',
                  backgroundColor: recording ? themeColors.accentBg : themeColors.surface,
                  borderColor: recording ? themeColors.accentBorder : undefined,
                  color: themeColors.txt,
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              />
            </CustomTooltip>
          </div>
        </div>
      </CustomCard>

      <CustomCard
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          backgroundColor: themeColors.card,
          borderColor: themeColors.border
        }}
      >
        <h3 style={{ marginBottom: '16px', color: themeColors.txt, fontSize: '16px', fontWeight: 500 }}>
          快捷键示例
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px',
            backgroundColor: themeColors.surface,
            borderRadius: '4px',
            border: `1px solid ${themeColors.border}`
          }}>
            <span style={{ color: themeColors.txt }}>常用组合键</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="shortcut-tag">Ctrl+Shift+Space</span>
              <span className="shortcut-tag">Ctrl+Alt+D</span>
              <span className="shortcut-tag">Win+E</span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px',
            backgroundColor: themeColors.surface,
            borderRadius: '4px',
            border: `1px solid ${themeColors.border}`
          }}>
            <span style={{ color: themeColors.txt }}>修饰键说明</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="modifier-tag">Ctrl</span>
              <span className="modifier-tag">Shift</span>
              <span className="modifier-tag">Alt</span>
              <span className="modifier-tag">Win</span>
            </div>
          </div>
        </div>
      </CustomCard>

      <style>
        {`
        .shortcut-tag {
          background: ${themeColors.accentBg};
          color: ${themeColors.accent};
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .modifier-tag {
          background: ${themeColors.surface};
          color: ${themeColors.txt2};
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          border: 1px solid ${themeColors.border};
        }
        `}
      </style>
    </div>
  );
};

export default ShortcutsSettings;