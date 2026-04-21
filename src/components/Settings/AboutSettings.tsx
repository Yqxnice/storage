import React, { useState, useEffect } from 'react';

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
  showUpdateModal,
  setShowUpdateModal,
  updateMsg,
  setUpdateMsg,
  updateAvailable,
  setUpdateAvailable,
  isDownloading,
  setIsDownloading,
  updateReady,
  setUpdateReady,
}) => {
  // 打开应用时监听更新
  useEffect(() => {
    // 发现新版本 → 弹窗询问是否下载
    window.electron?.updater?.onUpdateFound(() => {
      setUpdateAvailable(true);
      setUpdateMsg("发现新版本，是否立即下载？");
      setShowUpdateModal(true);
      setIsDownloading(false);
      setUpdateReady(false);
      setChecking(false);
    });

    // 下载完成 → 可安装
    window.electron?.updater?.onUpdateReady(() => {
      setIsDownloading(false);
      setUpdateMsg("更新包已下载完成，是否立即安装？");
      setUpdateReady(true);
      setChecking(false);
    });

    // 没有更新
    window.electron?.updater?.onUpdateNotFound(() => {
      if (!updateAvailable && !isDownloading) {
        setUpdateMsg("当前已是最新版本");
        setShowUpdateModal(true);
        setChecking(false);
      }
    });

    // 错误处理
    window.electron?.updater?.onUpdateError((error: string) => {
      setUpdateMsg(`更新失败: ${error}`);
      setIsDownloading(false);
      setChecking(false);
    });

    return () => {
      window.electron?.updater?.off("update-found");
      window.electron?.updater?.off("update-ready");
      window.electron?.updater?.off("update-not-found");
      window.electron?.updater?.off("update-error");
    };
  }, [updateAvailable, isDownloading, setChecking, setShowUpdateModal, setUpdateMsg, setUpdateAvailable, setIsDownloading, setUpdateReady]);

  // 确认下载更新
  const handleConfirmDownload = async () => {
    setIsDownloading(true);
    setUpdateMsg("正在下载更新包…");
    setUpdateAvailable(false);

    try {
      await window.electron?.updater?.checkUpdates();
    } catch (error) {
      setUpdateMsg(`下载失败: ${error}`);
      setIsDownloading(false);
    }
  };

  // 手动检查更新（关于页面按钮）
  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateAvailable(false);
    setUpdateReady(false);
    setIsDownloading(false);
    setUpdateMsg("正在检查更新…");
    setShowUpdateModal(true);

    try {
      await window.electron?.updater?.checkUpdates();
    } catch (error) {
      setUpdateMsg(`检查更新失败: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  // 安装并重启
  const handleInstall = () => {
    window.electron?.updater?.installUpdate();
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowUpdateModal(false);
    setUpdateAvailable(false);
    setIsDownloading(false);
    setUpdateReady(false);
    setChecking(false);
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