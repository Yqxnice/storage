import React, { useState } from 'react';
import { useStore } from '../../store';

const GeneralSettings: React.FC = () => {
  const {
    sortByClickCount,
    setSortByClickCount,
    startOnBoot,
    setStartOnBoot,
    startMinimized,
    setStartMinimized,
    minimizeOnClose,
    setMinimizeOnClose,
    autoScanDesktop,
    setAutoScanDesktop,
    handleInvalidMappings,
    setHandleInvalidMappings,
    autoBackupInterval,
    setAutoBackupInterval,
    logAutoCleanupDays,
    setLogAutoCleanupDays,
    createBackup,
    restoreBackup,
    cleanupBackups,
    clearLogs,
    clearAllData,
    resetSettings,
  } = useStore();

  const handleSettingToggle = async (
    setting: string,
    currentValue: boolean,
    setter: (value: boolean) => void,
  ) => {
    const newValue = !currentValue;

    setter(newValue);

    if (window.electron && window.electron.store) {
      try {
        await window.electron.store.set({
          key: setting,
          value: newValue,
          storeType: "settings",
        });
        console.log(`[Settings] 保存设置成功: ${setting} = ${newValue}`);
      } catch (error) {
        console.error(`[Settings] 保存设置失败: ${setting}`, error);
      }
    } else {
      console.warn("[Settings] window.electron.store 不可用");
    }
  };

  const handleClearData = () => {
    if (
      window.confirm(
        "确定要清除所有映射数据吗？这将删除所有虚拟映射记录，但不会影响原始文件。",
      )
    ) {
      clearAllData();
      window.alert("映射数据已清除");
    }
  };

  const handleResetSettings = () => {
    if (window.confirm("确定要重置所有设置吗？这将恢复到默认配置。")) {
      resetSettings();
      window.alert("设置已重置");
    }
  };

  return (
    <div className="page-section">
      <div className="page-section-title">通用设置</div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">开机自启动</div>
            <div className="page-row-desc">
              系统启动时自动运行桌面收纳
            </div>
          </div>
          <div
            className={`page-toggle ${startOnBoot ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "startOnBoot",
                startOnBoot,
                setStartOnBoot,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">启动时最小化到托盘</div>
            <div className="page-row-desc">启动后不显示主窗口</div>
          </div>
          <div
            className={`page-toggle ${startMinimized ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "startMinimized",
                startMinimized,
                setStartMinimized,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">关闭时最小化到托盘</div>
            <div className="page-row-desc">
              点击关闭按钮时保持后台运行
            </div>
          </div>
          <div
            className={`page-toggle ${minimizeOnClose ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "minimizeOnClose",
                minimizeOnClose,
                setMinimizeOnClose,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">自动扫描桌面变更</div>
            <div className="page-row-desc">
              检测到新的桌面项目时提示收纳
            </div>
          </div>
          <div
            className={`page-toggle ${autoScanDesktop ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "autoScanDesktop",
                autoScanDesktop,
                setAutoScanDesktop,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">失效映射处理</div>
            <div className="page-row-desc">
              原始路径不存在时自动处理
            </div>
          </div>
          <div
            className={`page-toggle ${handleInvalidMappings ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "handleInvalidMappings",
                handleInvalidMappings,
                setHandleInvalidMappings,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">按点击次数排序</div>
            <div className="page-row-desc">
              按文件的点击次数自动排序，下次打开或快捷键呼出时生效
            </div>
          </div>
          <div
            className={`page-toggle ${sortByClickCount ? "on" : ""}`}
            onClick={() => {
              setSortByClickCount(!sortByClickCount);
              if (window.electron && window.electron.store) {
                window.electron.store.set({
                  key: 'sortByClickCount',
                  value: !sortByClickCount,
                  storeType: 'settings',
                });
              }
            }}
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>


      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">
              清除所有映射数据
            </div>
            <div className="page-row-desc">
              仅清除虚拟映射记录，不影响原始文件
            </div>
          </div>
          <button
            className="page-btn danger"
            onClick={handleClearData}
          >
            清除数据
          </button>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">重置所有设置</div>
            <div className="page-row-desc">恢复到默认配置</div>
          </div>
          <button
            className="page-btn danger"
            onClick={handleResetSettings}
          >
            重置
          </button>
        </div>
      </div>

      <div className="page-card">
        <div className="page-section-title" style={{ marginBottom: '16px' }}>备份系统</div>
        
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">自动备份</div>
            <div className="page-row-desc">定期自动创建系统备份</div>
          </div>
          <select 
            className="page-select"
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            value={autoBackupInterval}
            onChange={(e) => setAutoBackupInterval(e.target.value)}
          >
            <option value="never">从不自动备份</option>
            <option value="5min">每5分钟</option>
            <option value="10min">每10分钟</option>
            <option value="30min">每30分钟</option>
            <option value="1hour">每小时</option>
          </select>
        </div>

        <div className="page-row" style={{ marginTop: '16px' }}>
          <div className="page-row-label">
            <div className="page-row-name">备份管理</div>
            <div className="page-row-desc">创建手动备份或恢复数据</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="page-btn"
              style={{ flex: 1 }}
              onClick={() => {
                // 这里可以打开一个备份选择对话框
                // 暂时使用示例 backupId
                restoreBackup('latest');
              }}
            >
              恢复
            </button>
            <button
              className="page-btn"
              style={{ flex: 1 }}
              onClick={createBackup}
            >
              创建手动节点
            </button>
          </div>
        </div>

        <div className="page-row" style={{ marginTop: '16px' }}>
          <div className="page-row-label">
            <div className="page-row-name danger">清理备份</div>
            <div className="page-row-desc">删除所有备份文件</div>
          </div>
          <button
            className="page-btn danger"
            onClick={cleanupBackups}
          >
            清理备份
          </button>
        </div>

        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>仅备份收纳盒等组件状态、布局等信息，永久性文件操作不会进行备份，请谨慎对待删除等操作。</p>
          <p style={{ margin: '0' }}>自动节点与手动节点相互独立，可以自由选择恢复的节点。</p>
        </div>
      </div>

      <div className="page-card">
        <div className="page-section-title" style={{ marginBottom: '16px' }}>日志系统</div>
        
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">自动清除</div>
            <div className="page-row-desc">自动清理指定天数前的日志</div>
          </div>
          <select 
            className="page-select"
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            value={logAutoCleanupDays}
            onChange={(e) => setLogAutoCleanupDays(e.target.value)}
          >
            <option value="1">自动清除1天前的日志</option>
            <option value="2">自动清除2天前的日志</option>
            <option value="3">自动清除3天前的日志</option>
            <option value="7">自动清除7天前的日志</option>
            <option value="30">自动清除30天前的日志</option>
          </select>
        </div>

        <div className="page-row" style={{ marginTop: '16px' }}>
          <div className="page-row-label">
            <div className="page-row-name danger">清理日志</div>
            <div className="page-row-desc">删除所有日志文件</div>
          </div>
          <button
            className="page-btn danger"
            onClick={clearLogs}
          >
            清除日志
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;