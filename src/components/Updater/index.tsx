import React, { useState, useEffect, useRef } from 'react';
import { Updater, UpdateInfo, UpdateProgress } from '../../utils/updater';
import { showMessage } from '../common';
import { HiRefresh, HiDownload, HiCheck, HiX } from 'react-icons/hi';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
}

type UpdateStage = 'checking' | 'available' | 'downloading' | 'installing' | 'completed' | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, onClose }) => {
  const [stage, setStage] = useState<UpdateStage>('checking');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress>({ total: 100, current: 0, percent: 0 });
  const updaterRef = useRef<Updater>(Updater.getInstance());

  useEffect(() => {
    if (visible) {
      checkUpdate();
    }
  }, [visible]);

  const checkUpdate = async () => {
    setStage('checking');
    try {
      const update = await updaterRef.current.checkForUpdate();
      if (update) {
        setUpdateInfo(update);
        setStage('available');
      } else {
        showMessage.info('当前已是最新版本');
        onClose();
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      setStage('error');
    }
  };

  const startDownload = async () => {
    setStage('downloading');
    updaterRef.current.setOnProgress(setProgress);
    updaterRef.current.setOnStatusChange(setStage);
    
    try {
      const success = await updaterRef.current.downloadAndInstall();
      if (success) {
        setStage('completed');
      }
    } catch (error) {
      console.error('更新失败:', error);
      setStage('error');
    }
  };

  const restartApp = async () => {
    await updaterRef.current.restartApp();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">软件更新</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {stage === 'checking' && (
          <div className="text-center py-8">
            <HiRefresh className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">正在检查更新...</p>
          </div>
        )}

        {stage === 'available' && updateInfo && (
          <div>
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-gray-800">发现新版本: {updateInfo.version}</h4>
              {updateInfo.date && (
                <p className="text-sm text-gray-500 mb-3">发布日期: {updateInfo.date}</p>
              )}
              <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{updateInfo.body || '暂无更新日志'}</pre>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={onClose} 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
              >
                稍后
              </button>
              <button 
                onClick={startDownload} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <HiDownload className="inline w-4 h-4 mr-1" />
                下载更新
              </button>
            </div>
          </div>
        )}

        {stage === 'downloading' && (
          <div>
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-gray-800">正在下载更新...</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{progress.percent}%</p>
            </div>
          </div>
        )}

        {stage === 'installing' && (
          <div className="text-center py-8">
            <HiRefresh className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">正在安装更新...</p>
          </div>
        )}

        {stage === 'completed' && (
          <div>
            <div className="text-center py-6 mb-4">
              <HiCheck className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <h4 className="font-medium text-gray-800">更新完成</h4>
              <p className="text-gray-600 text-sm">请重启应用以完成更新</p>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={restartApp} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                立即重启
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div>
            <div className="text-center py-6 mb-4">
              <HiX className="w-12 h-12 mx-auto text-red-500 mb-3" />
              <h4 className="font-medium text-gray-800">更新失败</h4>
              <p className="text-gray-600 text-sm">请稍后重试或手动下载</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={onClose} 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
              >
                关闭
              </button>
              <button 
                onClick={checkUpdate} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
