import React, { useState } from 'react';
import { useStore } from "../store";
import { FaCog, FaKey, FaInfoCircle, FaListUl, FaTags, FaEye } from 'react-icons/fa';
import BottomNav from "../components/common/BottomNav";
import GeneralSettings from "../components/Settings/GeneralSettings";
import ShortcutsSettings from "../components/Settings/ShortcutsSettings";
import AboutSettings from "../components/Settings/AboutSettings";
import ThemeSettings from "../components/Settings/ThemeSettings";
import AutoRuleManager from "../components/AutoRuleManager";
import { FileWatchSettings } from "../components/Settings/FileWatchSettings";

type NavItem = "general" | "theme" | "autoRule" | "shortcuts" | "fileWatch" | "about";

interface SettingsProps {
  onNavClick?: (nav: "home" | "settings" | "stats" | "help") => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavClick }) => {
  const { theme, setTheme } = useStore();
  const [activeNav, setActiveNav] = useState<NavItem>("general");

  const handleNavClick = (nav: "home" | "settings" | "stats" | "help") => {
    if (nav === "home") {
      onNavClick?.("home");
    } else if (nav === "settings") {
      setActiveNav("general");
    } else {
      onNavClick?.(nav);
    }
  };

  const navItems: { key: NavItem; label: string; icon: React.ReactNode }[] = [
    { key: "general", label: "通用设置", icon: <FaCog /> },
    { key: "theme", label: "主题设置", icon: <FaListUl /> },
    { key: "autoRule", label: "自动归类", icon: <FaTags /> },
    { key: "fileWatch", label: "文件监控", icon: <FaEye /> },
    { key: "shortcuts", label: "快捷键", icon: <FaKey /> },
    { key: "about", label: "关于", icon: <FaInfoCircle /> },
  ];

  return (
    <div className="app-page">
      <div className="app-sidebar">
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`sidebar-nav-item ${activeNav === item.key ? "active" : ""}`}
              onClick={() => setActiveNav(item.key)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </div>
          ))}
        </div>
        <BottomNav
          activeNav="settings"
          onNavClick={handleNavClick}
          showHome={true}
          showSettings={false}
          showStats={true}
          showHelp={true}
        />
      </div>

      <div className="app-main">
        <div className="page-content">
          {activeNav === "general" && (
            <GeneralSettings />
          )}

          {activeNav === "theme" && (
            <ThemeSettings theme={theme} setTheme={setTheme} />
          )}

          {activeNav === "autoRule" && (
            <AutoRuleManager />
          )}

          {activeNav === "fileWatch" && (
            <FileWatchSettings />
          )}

          {activeNav === "shortcuts" && (
            <ShortcutsSettings />
          )}

          {activeNav === "about" && (
            <AboutSettings />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
