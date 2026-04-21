import React from 'react';
import { useStore } from '../../store';
import { getThemeOptions, type ThemeKey } from '../../utils/theme';

interface ThemeSettingsProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ theme, setTheme }) => {
  const { timeThemeEnabled, setTimeThemeEnabled } = useStore();

  const handleThemeChange = async (newTheme: ThemeKey) => {
    setTheme(newTheme);
    if (window.electron && window.electron.store) {
      await window.electron.store.set({
        key: 'theme',
        value: newTheme,
        storeType: 'settings',
      });
    }
  };

  const handleTimeThemeToggle = async () => {
    const newValue = !timeThemeEnabled;
    setTimeThemeEnabled(newValue);
    if (window.electron && window.electron.store) {
      await window.electron.store.set({
        key: 'timeThemeEnabled',
        value: newValue,
        storeType: 'settings',
      });
    }
  };

  const themes = getThemeOptions();

  return (
    <div className="page-section">
      <div className="page-section-title">主题设置</div>

      <div className="page-card">
        <div className="page-row page-row-theme">
          <div className="page-row-label">
            <div className="page-row-name">主题颜色</div>
            <div className="page-row-desc">
              选择应用的主题颜色
            </div>
          </div>
          <div className="theme-selector">
            {themes.map((t) => (
              <div
                key={t.key}
                className={`theme-option ${theme === t.key ? 'active' : ''}`}
                onClick={() => handleThemeChange(t.key as ThemeKey)}
                style={{ backgroundColor: t.color }}
                title={t.name}
              >
                {theme === t.key && <span className="theme-check">✓</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">时间主题</div>
            <div className="page-row-desc">
              根据当前时间自动切换主题：白天使用亮色主题，晚上使用深色主题
            </div>
          </div>
          <div
            className={`page-toggle ${timeThemeEnabled ? "on" : ""}`}
            onClick={handleTimeThemeToggle}
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">主题说明</div>
            <div className="page-row-desc">
              每个主题都有独特的颜色方案，包括基础颜色、状态颜色和主题色。
              切换主题时，整个应用的颜色会统一变化。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;