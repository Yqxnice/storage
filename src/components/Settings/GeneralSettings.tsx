import React, { useState } from 'react';
import { useStore } from '../../store';
import { CustomModal, showMessage, CustomRadio, RadioGroup } from '../common';
import CustomSelect from '../common/CustomSelect';
import { tauriIPC } from '../../utils/tauri-ipc';
import { getThemeColors } from '../../utils/theme';

interface BackupSelectModalProps {
  visible: boolean;
  backups: string[];
  selectedBackup: string;
  onSelect: (backup: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

const BackupSelectModal: React.FC<BackupSelectModalProps> = ({
  visible,
  backups,
  selectedBackup,
  onSelect,
  onOk,
  onCancel,
}) => {
  return (
    <CustomModal
      title="选择要恢复的备份文件"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="恢复"
      cancelText="取消"
    >
      <RadioGroup
        value={selectedBackup}
        onChange={(e) => {
          onSelect(e.target.value);
        }}
        options={backups.map((backup) => ({
          label: backup,
          value: backup,
        }))}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}
      />
    </CustomModal>
  );
};

const GeneralSettings: React.FC = () => {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupsList, setBackupsList] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
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
    scanHiddenFiles,
    setScanHiddenFiles,
    createBackup,
    restoreBackup,
    cleanupBackups,
    clearLogs,
    clearAllData,
    resetSettings,
    theme,
    activeBoxId,
    setActiveBox,
    addItem,
    addBox,
    boxes,
    items,
  } = useStore();
  
  const handleSettingToggle = (
    _setting: string,
    currentValue: boolean,
    setter: (value: boolean) => void,
  ) => {
    const newValue = !currentValue;
    setter(newValue);
  };

  const handleClearStorageData = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定要清除所有收纳盒数据吗？此操作将保留设置，不会关闭应用。',
      '确认清除收纳盒数据'
    );
    if (confirmed) {
      clearAllData('storage');
      showMessage.success('收纳盒数据已清除');
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定要清除全部数据（包括设置）吗？此操作将重置所有设置，应用将重新启动。',
      '确认清除全部数据'
    );
    if (confirmed) {
      clearAllData('all');
      showMessage.success('数据已清除');
    }
  };

  const handleResetSettings = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定要重置所有设置吗？这将恢复到默认配置。',
      '确认重置设置'
    );
    if (confirmed) {
      await resetSettings();
      showMessage.success('设置已重置');
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const backups = await tauriIPC.backup.getBackups();
      if (backups && backups.length > 0) {
        backups.sort((a, b) => b.localeCompare(a));
        setBackupsList(backups);
        setSelectedBackup(backups[0]);
        setShowBackupModal(true);
      } else {
        showMessage.warning('没有找到备份文件');
      }
    } catch (error) {

      showMessage.error('获取备份列表失败');
    }
  };

  const handleBackupRestore = () => {
    restoreBackup(selectedBackup);
    setShowBackupModal(false);
  };

  const handleCleanupBackups = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定要删除所有备份文件吗？此操作不可恢复。',
      '确认清理备份'
    );
    if (confirmed) {
      cleanupBackups();
      showMessage.success('备份已清理');
    }
  };

  const handleClearLogs = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定要删除所有日志文件吗？',
      '确认清理日志'
    );
    if (confirmed) {
      clearLogs();
      showMessage.success('日志已清理');
    }
  };

  const handleManualScan = async () => {
    let currentBoxId = activeBoxId;
    
    // 如果没有收纳盒，自动创建一个"桌面收纳盒"
    if (!currentBoxId && boxes.length === 0) {
      console.log('没有收纳盒，自动创建桌面收纳盒');
      const newBoxId = addBox('桌面收纳盒');
      currentBoxId = newBoxId;
      setActiveBox(newBoxId);
    } else if (!currentBoxId) {
      // 如果有收纳盒但没有选中，选中第一个
      currentBoxId = boxes[0]?.id;
    }
    
    if (!currentBoxId) {
      showMessage.warning('请先创建或选择一个收纳盒');
      return;
    }

    try {
      setIsScanning(true);
      console.log('开始手动扫描桌面...');
      
      const desktopFiles = await tauriIPC.scanDesktopFiles(scanHiddenFiles);
      console.log('扫描结果:', desktopFiles);
      
      if (desktopFiles && Array.isArray(desktopFiles) && desktopFiles.length > 0) {
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const file of desktopFiles as any[]) {
          const fileExists = items.some(
            (item) => item.boxId === currentBoxId && item.path === file.path
          );
          
          if (fileExists) {
            skippedCount++;
            console.log(`跳过文件 ${file.name}: 已存在于收纳盒中`);
            continue;
          }
          
          await addItem({
            name: file.name,
            category: file.category || 'desktop',
            type: file.type,
            path: file.path,
            boxId: currentBoxId,
            clickCount: 0,
            size: file.size
          });
          addedCount++;
        }
        
        showMessage.success(`扫描完成！添加了 ${addedCount} 个项目${skippedCount > 0 ? `，跳过了 ${skippedCount} 个已存在的项目` : ''}`);
      } else {
        showMessage.info('没有找到新的桌面文件');
      }
    } catch (_error) {
      console.error('扫描失败:', _error);
      showMessage.error('扫描桌面文件失败');
    } finally {
      setIsScanning(false);
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
            }}
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">扫描隐藏文件</div>
            <div className="page-row-desc">
              初始化扫描时包含隐藏文件
            </div>
          </div>
          <div
            className={`page-toggle ${scanHiddenFiles ? "on" : ""}`}
            onClick={() =>
              handleSettingToggle(
                "scanHiddenFiles",
                scanHiddenFiles,
                setScanHiddenFiles,
              )
            }
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">手动扫描桌面</div>
            <div className="page-row-desc">
              扫描当前桌面并添加到当前收纳盒
            </div>
          </div>
          <button
            className="page-btn"
            onClick={handleManualScan}
            disabled={isScanning}
          >
            {isScanning ? '扫描中...' : '立即扫描'}
          </button>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">危险操作</div>
            <div className="page-row-desc">重置设置或清除数据</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="page-btn danger"
              onClick={handleResetSettings}
              style={{ flex: 1 }}
            >
              重置设置
            </button>
            <button
              className="page-btn danger"
              onClick={() => handleClearStorageData()}
              style={{ flex: 1 }}
            >
              清除收纳盒
            </button>
            <button
              className="page-btn danger"
              onClick={() => handleClearAllData()}
              style={{ flex: 1 }}
            >
              清除全部
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">自动备份</div>
            <div className="page-row-desc">定期自动创建系统备份</div>
          </div>
          <CustomSelect
            value={autoBackupInterval}
            onChange={(value) => setAutoBackupInterval(value)}
            options={[
              { value: 'never', label: '从不自动备份' },
              { value: '5min', label: '每5分钟' },
              { value: '10min', label: '每10分钟' },
              { value: '30min', label: '每30分钟' },
              { value: '1hour', label: '每小时' }
            ]}
          />
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">备份管理</div>
            <div className="page-row-desc">创建手动备份或恢复数据</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="page-btn"
              style={{ flex: 1 }}
              onClick={handleRestoreBackup}
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

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">清理备份</div>
            <div className="page-row-desc">删除所有备份文件</div>
          </div>
          <button
            className="page-btn danger"
            onClick={handleCleanupBackups}
          >
            清理备份
          </button>
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">备份说明</div>
            <div className="page-row-desc">
              仅备份收纳盒等组件状态、布局等信息，永久性文件操作不会进行备份，请谨慎对待删除等操作。自动节点与手动节点相互独立，可以自由选择恢复的节点。
            </div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">自动清除</div>
            <div className="page-row-desc">自动清理指定天数前的日志</div>
          </div>
          <CustomSelect
            value={logAutoCleanupDays}
            onChange={(value) => setLogAutoCleanupDays(value)}
            options={[
              { value: '1', label: '自动清除1天前的日志' },
              { value: '2', label: '自动清除2天前的日志' },
              { value: '3', label: '自动清除3天前的日志' },
              { value: '7', label: '自动清除7天前的日志' },
              { value: '30', label: '自动清除30天前的日志' }
            ]}
          />
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">清理日志</div>
            <div className="page-row-desc">删除所有日志文件</div>
          </div>
          <button
            className="page-btn danger"
            onClick={handleClearLogs}
          >
            清除日志
          </button>
        </div>
      </div>
      <BackupSelectModal
        visible={showBackupModal}
        backups={backupsList}
        selectedBackup={selectedBackup}
        onSelect={setSelectedBackup}
        onOk={handleBackupRestore}
        onCancel={() => setShowBackupModal(false)}
      />
    </div>
  );
};

export default GeneralSettings;