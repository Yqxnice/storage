import React, { useState } from 'react';
import { useStore } from "../store";
import { FaCog, FaKey, FaInfoCircle, FaListUl } from 'react-icons/fa';
import BottomNav from "../components/common/BottomNav";
import GeneralSettings from "../components/Settings/GeneralSettings";
import ShortcutsSettings from "../components/Settings/ShortcutsSettings";
import AboutSettings from "../components/Settings/AboutSettings";
import ThemeSettings from "../components/Settings/ThemeSettings";
import { tauriIPC } from "../utils/tauri-ipc";

type NavItem = "general" | "theme" | "shortcuts" | "about";

interface SettingsProps {
  onNavClick?: (nav: "home" | "settings" | "stats" | "help") => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavClick }) => {
  const { theme, setTheme } = useStore();
  const [activeNav, setActiveNav] = useState<NavItem>("general");

  // 更新相关状态
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 确认下载更新
  const handleConfirmDownload = async () => {
    setIsDownloading(true);
    setUpdateMsg("正在下载更新包…");
    setUpdateAvailable(false);

    try {
      await tauriIPC.updater.checkUpdates();
    } catch (error) {
      setUpdateMsg(`下载失败: ${error}`);
      setIsDownloading(false);
    }
  };

  // 安装并重启
  const handleInstall = () => {
    tauriIPC.updater.installUpdate();
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowUpdateModal(false);
    setUpdateAvailable(false);
    setIsDownloading(false);
    setUpdateReady(false);
    setChecking(false);
  };

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

          {activeNav === "shortcuts" && (
            <ShortcutsSettings />
          )}

          {activeNav === "about" && (
            <AboutSettings 
              checking={checking}
              setChecking={setChecking}
              showUpdateModal={showUpdateModal}
              setShowUpdateModal={setShowUpdateModal}
              updateMsg={updateMsg}
              setUpdateMsg={setUpdateMsg}
              updateAvailable={updateAvailable}
              setUpdateAvailable={setUpdateAvailable}
              isDownloading={isDownloading}
              setIsDownloading={setIsDownloading}
              updateReady={updateReady}
              setUpdateReady={setUpdateReady}
            />
          )}
        </div>
      </div>

      {/* 更新弹窗 */}
      {showUpdateModal && (
        <div className="update-modal-overlay">
          <div className="update-modal">
            <h3>应用更新</h3>
            <p className="update-modal-message">{updateMsg}</p>

            <div className="update-modal-buttons">
              {/* 发现新版本，询问是否下载 */}
              {updateAvailable && !isDownloading && (
                <>
                  <button
                    className="update-modal-btn"
                    onClick={handleCloseModal}
                  >
                    取消
                  </button>
                  <button
                    className="update-modal-btn primary"
                    onClick={handleConfirmDownload}
                  >
                    下载
                  </button>
                </>
              )}

              {/* 正在下载 */}
              {isDownloading && !updateReady && (
                <button className="update-modal-btn" onClick={handleCloseModal}>
                  后台下载
                </button>
              )}

              {/* 下载完成，询问是否安装 */}
              {updateReady && (
                <>
                  <button
                    className="update-modal-btn"
                    onClick={handleCloseModal}
                  >
                    稍后再说
                  </button>
                  <button
                    className="update-modal-btn primary"
                    onClick={handleInstall}
                  >
                    立即重启更新
                  </button>
                </>
              )}

              {/* 检查更新或错误状态，显示关闭按钮 */}
              {!updateAvailable && !isDownloading && !updateReady && (
                <button className="update-modal-btn" onClick={handleCloseModal}>
                  确定
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
