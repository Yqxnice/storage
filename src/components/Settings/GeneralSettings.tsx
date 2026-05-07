import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { CustomModal, showMessage,RadioGroup } from '../common';
import CustomSelect from '../common/CustomSelect';
import { tauriIPC } from '../../utils/tauri-ipc';
import { STORAGE_TYPES } from '../../constants';
import StoragePathModal from './StoragePathModal';

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
  const [showStoragePathModal, setShowStoragePathModal] = useState(false);
  const [currentDataPath, setCurrentDataPath] = useState('');
  const [isLoadingPath, setIsLoadingPath] = useState(true);
  const [isPortable, setIsPortable] = useState(false);

  useEffect(() => {
    const loadCurrentPath = async () => {
      try {
        const portable = await tauriIPC.invoke<boolean>('is_portable_mode', {}).catch(() => false);
        setIsPortable(portable);
        
        if (portable) {
          const path = await tauriIPC.store.get({ key: 'dataPath', storeType: STORAGE_TYPES.SETTINGS }) as string | null;
          if (path) {
            if (path === 'appdata') {
              const appdataPath = await tauriIPC.app.getPath('appData') as string;
              setCurrentDataPath(`${appdataPath}\\storage`);
            } else if (path === 'current') {
              const exePath = await tauriIPC.app.getPath('exe') as string;
              const dirPath = exePath.substring(0, exePath.lastIndexOf('\\'));
              setCurrentDataPath(`${dirPath}\\storage`);
            } else {
              setCurrentDataPath(path);
            }
          } else {
            const exePath = await tauriIPC.app.getPath('exe') as string;
            const dirPath = exePath.substring(0, exePath.lastIndexOf('\\'));
            setCurrentDataPath(`${dirPath}\\storage`);
          }
        }
      } catch (error) {
        console.error('获取当前存储路径失败:', error);
        try {
          const exePath = await tauriIPC.app.getPath('exe') as string;
          const dirPath = exePath.substring(0, exePath.lastIndexOf('\\'));
          setCurrentDataPath(`${dirPath}\\storage`);
        } catch {
          setCurrentDataPath('无法获取路径');
        }
      } finally {
        setIsLoadingPath(false);
      }
    };
    loadCurrentPath();
  }, []);

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
    activeBoxId,
    setActiveBox,
    addItem,
    addBox,
    boxes,
    items,
  } = useStore();

  const handleChangeStoragePath = async (newPath: string, migrateData: boolean) => {
    try {
      const oldPath = await tauriIPC.store.get({ key: 'dataPath', storeType: STORAGE_TYPES.SETTINGS }) as string | null;

      let oldFullPath = '';
      if (oldPath === 'appdata') {
        const appdataPath = await tauriIPC.app.getPath('appData') as string;
        oldFullPath = `${appdataPath}\\storage`;
      } else if (oldPath === 'current') {
        const exePath = await tauriIPC.app.getPath('exe') as string;
        const dirPath = exePath.substring(0, exePath.lastIndexOf('\\'));
        oldFullPath = `${dirPath}\\storage`;
      } else {
        oldFullPath = oldPath || '';
      }

      if (migrateData) {
        const oldDataExists = await tauriIPC.invoke<boolean>('fs_exists', { path: oldFullPath });
        if (oldDataExists) {
          await tauriIPC.invoke('fs_copy_dir', { from: oldFullPath, to: newPath });
          await tauriIPC.invoke('fs_remove_dir', { path: oldFullPath });
        }
        await tauriIPC.store.set({ key: 'dataPath', value: newPath, storeType: STORAGE_TYPES.SETTINGS });
      } else {
        await tauriIPC.invoke('fs_mkdir', { path: newPath, options: { recursive: true } });

        await tauriIPC.store.clear(STORAGE_TYPES.STORAGE);

        await tauriIPC.store.set({ key: 'hasInitialized', value: true, storeType: STORAGE_TYPES.SETTINGS });
        await tauriIPC.store.set({ key: 'hasShownWelcome', value: true, storeType: STORAGE_TYPES.SETTINGS });
        await tauriIPC.store.set({ key: 'dataPath', value: newPath, storeType: STORAGE_TYPES.SETTINGS });

        if (oldFullPath) {
          const oldDataExists = await tauriIPC.invoke<boolean>('fs_exists', { path: oldFullPath });
          if (oldDataExists) {
            await tauriIPC.invoke('fs_remove_dir', { path: oldFullPath });
          }
        }
      }

      await tauriIPC.invoke('app_restart');
    } catch (error) {
      console.error('更改存储路径失败:', error);
      showMessage.error('更改存储路径失败，请重试');
    }
  };

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
      '确定清除所有收纳盒数据？设置将保留。',
      '清除收纳盒数据'
    );
    if (confirmed) {
      clearAllData('storage');
      showMessage.success('收纳盒数据已清除');
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定清除全部数据？包括设置，应用将重启。',
      '清除全部数据'
    );
    if (confirmed) {
      clearAllData('all');
      showMessage.success('数据已清除');
    }
  };

  const handleResetSettings = async () => {
    const confirmed = await tauriIPC.dialog.confirm(
      '确定重置所有设置？将恢复默认配置。',
      '重置设置'
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
    
    if (!currentBoxId && boxes.length === 0) {
      const newBoxId = addBox('桌面收纳盒');
      currentBoxId = newBoxId;
      setActiveBox(newBoxId);
    } else if (!currentBoxId) {
      currentBoxId = boxes[0]?.id;
    }
    
    if (!currentBoxId) {
      showMessage.warning('请先创建或选择一个收纳盒');
      return;
    }

    try {
      setIsScanning(true);
      
      const desktopFiles = await tauriIPC.scanDesktopFiles(scanHiddenFiles);
      
      if (desktopFiles && Array.isArray(desktopFiles) && desktopFiles.length > 0) {
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const file of desktopFiles as any[]) {
          const fileExists = items.some(
            (item) => item.boxId === currentBoxId && item.path === file.path
          );
          
          if (fileExists) {
            skippedCount++;
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
            <div className="page-row-name">开机自启</div>
            <div className="page-row-desc">系统启动时自动运行</div>
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
            <div className="page-row-name">启动时最小化</div>
            <div className="page-row-desc">启动后隐藏主窗口</div>
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
            <div className="page-row-name">关闭时最小化</div>
            <div className="page-row-desc">点击关闭保持后台运行</div>
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
            <div className="page-row-name">自动扫描桌面</div>
            <div className="page-row-desc">检测新文件并提示收纳</div>
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
            <div className="page-row-desc">路径不存在时自动处理</div>
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
            <div className="page-row-name">按点击排序</div>
            <div className="page-row-desc">按使用频率自动排序</div>
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
            <div className="page-row-desc">扫描时包含隐藏文件</div>
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
            <div className="page-row-desc">扫描桌面并添加到收纳盒</div>
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

      {isPortable && (
        <div className="page-card">
          <div className="page-row">
            <div className="page-row-label">
              <div className="page-row-name">存储路径</div>
              <div className="page-row-desc">数据文件的存储位置</div>
            </div>
            <button
              className="page-btn"
              onClick={() => setShowStoragePathModal(true)}
            >
              更改路径
            </button>
          </div>
          <div className="page-row">
            <div className="page-row-label" style={{ width: '100%' }}>
              <div className="page-row-desc" style={{ fontSize: '12px', color: 'var(--txt2)', wordBreak: 'break-all' }}>
                当前路径: {isLoadingPath ? '加载中...' : (currentDataPath || '未设置')}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">危险操作</div>
            <div className="page-row-desc">重置或清除数据</div>
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
            <div className="page-row-desc">定期创建系统备份</div>
          </div>
          <CustomSelect
            value={autoBackupInterval}
            onChange={(value) => setAutoBackupInterval(value)}
            options={[
              { value: 'never', label: '从不备份' },
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
            <div className="page-row-desc">创建或恢复备份</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="page-btn"
              style={{ flex: 1 }}
              onClick={handleRestoreBackup}
            >
              恢复备份
            </button>
            <button
              className="page-btn"
              style={{ flex: 1 }}
              onClick={createBackup}
            >
              创建备份
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
              仅备份收纳盒状态和布局信息，文件操作不备份。自动与手动备份独立。
            </div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">日志清理</div>
            <div className="page-row-desc">自动清理指定天数前的日志</div>
          </div>
          <CustomSelect
            value={logAutoCleanupDays}
            onChange={(value) => setLogAutoCleanupDays(value)}
            options={[
              { value: '1', label: '1天前' },
              { value: '2', label: '2天前' },
              { value: '3', label: '3天前' },
              { value: '7', label: '7天前' },
              { value: '30', label: '30天前' }
            ]}
          />
        </div>

        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name danger">清除日志</div>
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
      {isPortable && (
        <StoragePathModal
          visible={showStoragePathModal}
          currentPath={currentDataPath}
          onClose={() => setShowStoragePathModal(false)}
          onConfirm={handleChangeStoragePath}
        />
      )}
    </div>
  );
};

export default GeneralSettings;