import React, { useEffect } from 'react';
import { tauriIPC } from "../../utils/tauri-ipc";

interface AboutSettingsProps {
  checking: boolean;
  setChecking: (value: boolean) => void;
  showUpdateModal: boolean;
  setShowUpdateModal: (value: boolean) => void;
  updateMsg: string;
  setUpdateMsg: (value: string) => void;
  updateAvailable: boolean;
  setUpdateAvailable: (value: boolean) => void;
  isDownloading: boolean;
  setIsDownloading: (value: boolean) => void;
  updateReady: boolean;
  setUpdateReady: (value: boolean) => void;
}

const AboutSettings: React.FC<AboutSettingsProps> = ({
  checking,
  setChecking,
  setShowUpdateModal,
  setUpdateMsg,
  setUpdateAvailable,
  setIsDownloading,
  setUpdateReady,
}) => {
  // 打开应用时监听更新
  useEffect(() => {
    // 发现新版本 → 弹窗询问是否下载
    try {
      tauriIPC.updater.onUpdateFound(() => {
        setUpdateAvailable(true);
        setUpdateMsg("发现新版本，是否立即下载？");
        setShowUpdateModal(true);
        setIsDownloading(false);
        setUpdateReady(false);
        setChecking(false);
      });
    } catch (error) {
      // 忽略未实现的方法
    }

    // 下载完成 → 可安装
    try {
      tauriIPC.updater.onUpdateReady(() => {
        setIsDownloading(false);
        setUpdateMsg("更新包已下载完成，是否立即安装？");
        setUpdateReady(true);
        setChecking(false);
      });
    } catch (error) {
      // 忽略未实现的方法
    }

    // 没有更新
    try {
      tauriIPC.updater.onUpdateNotFound(() => {
        if (!updateAvailable && !isDownloading) {
          setUpdateMsg("当前已是最新版本");
          setShowUpdateModal(true);
          setChecking(false);
        }
      });
    } catch (error) {
      // 忽略未实现的方法
    }

    // 错误处理
    try {
      tauriIPC.updater.onUpdateError((error: string) => {
        setUpdateMsg(`更新失败: ${error}`);
        setIsDownloading(false);
        setChecking(false);
      });
    } catch (error) {
      // 忽略未实现的方法
    }

    return () => {
      try {
        tauriIPC.updater.off("update-found");
        tauriIPC.updater.off("update-ready");
        tauriIPC.updater.off("update-not-found");
        tauriIPC.updater.off("update-error");
      } catch (error) {
        // 忽略未实现的方法
      }
    };
  }, [setChecking, setShowUpdateModal, setUpdateMsg, setUpdateAvailable, setIsDownloading, setUpdateReady]);

  // 手动检查更新（关于页面按钮）
  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateMsg("正在检查更新…");
    setShowUpdateModal(true);

    try {
      await tauriIPC.updater.checkUpdates();
    } catch (error) {
      setUpdateMsg(`检查更新失败: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-section">
      <div className="page-section-title">关于</div>

      <div className="about-card">
        <div className="about-header">
          <div className="about-logo">📁</div>
          <div className="about-header-info">
            <div className="about-name">桌面收纳</div>
            <div className="about-version">版本 1.0.0</div>
            <div className="about-tagline">虚拟映射 · 不移动原始文件</div>
          </div>
        </div>

        <div className="about-info-grid">
          <div className="about-info-item">
            <div className="about-info-label">作者</div>
            <div className="about-info-value">桌面收纳团队</div>
          </div>
          <div className="about-info-item">
            <div className="about-info-label">联系方式</div>
            <div className="about-info-value">support@desktoporganizer.com</div>
          </div>
        </div>

        <div className="about-actions">
          <button
            className="check-update-btn"
            onClick={handleCheckUpdate}
            disabled={checking}
          >
            {checking ? "检查中…" : "检查更新"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;