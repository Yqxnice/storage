import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { tauriIPC } from '../../utils/tauri-ipc';
import { showMessage } from '../common';

export const FileWatchSettings = () => {
  const {
    fileWatchEnabled,
    fileWatchPaths,
    fileWatchIgnorePatterns,
    fileWatchDebounceDelay,
    setFileWatchEnabled,
    setFileWatchPaths,
    setFileWatchIgnorePatterns,
    setFileWatchDebounceDelay,
  } = useStore();

  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'stopping'>('idle');
  const [newPath, setNewPath] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [debounceInput, setDebounceInput] = useState(fileWatchDebounceDelay.toString());

  useEffect(() => {
    const checkStatus = async () => {
      const watchStatus = await tauriIPC.fileWatch.getStatus();
      if (watchStatus?.is_watching) {
        setStatus('running');
      } else {
        setStatus('idle');
      }
    };
    checkStatus();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      setStatus('starting');
      try {
        await setFileWatchEnabled(true);
        setStatus('running');
        showMessage.success('文件监控已启动');
      } catch (error) {
        setStatus('idle');
        showMessage.error('启动文件监控失败: ' + error);
      }
    } else {
      setStatus('stopping');
      try {
        await setFileWatchEnabled(false);
        setStatus('idle');
        showMessage.success('文件监控已停止');
      } catch (error) {
        setStatus('running');
        showMessage.error('停止文件监控失败: ' + error);
      }
    }
  };

  const handleAddPath = async () => {
    if (!newPath.trim()) return;
    
    try {
      await tauriIPC.fileWatch.addPath(newPath.trim());
      const updatedPaths = [...fileWatchPaths, newPath.trim()];
      setFileWatchPaths(updatedPaths);
      setNewPath('');
      showMessage.success('路径已添加');
    } catch (error) {
      showMessage.error('添加路径失败: ' + error);
    }
  };

  const handleRemovePath = async (path: string) => {
    try {
      await tauriIPC.fileWatch.removePath(path);
      const updatedPaths = fileWatchPaths.filter(p => p !== path);
      setFileWatchPaths(updatedPaths);
      showMessage.success('路径已移除');
    } catch (error) {
      showMessage.error('移除路径失败: ' + error);
    }
  };

  const handleAddPattern = () => {
    if (!newPattern.trim()) return;
    
    const updatedPatterns = [...fileWatchIgnorePatterns, newPattern.trim()];
    setFileWatchIgnorePatterns(updatedPatterns);
    setNewPattern('');
  };

  const handleRemovePattern = (pattern: string) => {
    const updatedPatterns = fileWatchIgnorePatterns.filter(p => p !== pattern);
    setFileWatchIgnorePatterns(updatedPatterns);
  };

  const handleDebounceChange = () => {
    const value = parseInt(debounceInput, 10);
    if (!isNaN(value) && value >= 0) {
      setFileWatchDebounceDelay(value);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return '运行中';
      case 'starting': return '启动中';
      case 'stopping': return '停止中';
      default: return '已停止';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'running': return 'status-running';
      case 'starting': return 'status-starting';
      case 'stopping': return 'status-stopping';
      default: return 'status-idle';
    }
  };

  return (
    <div className="page-section">
      <div className="page-section-title">文件监控</div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">启用文件监控</div>
            <div className="page-row-desc">
              实时监控文件变化
              <span className={`status-badge ${getStatusClass()}`} style={{ marginLeft: 8 }}>
                {getStatusText()}
              </span>
            </div>
          </div>
          <div
            className={`page-toggle ${fileWatchEnabled ? "on" : ""}`}
            onClick={() => handleToggle(!fileWatchEnabled)}
            style={{ cursor: status === 'starting' || status === 'stopping' ? 'not-allowed' : 'pointer' }}
          >
            <div className="page-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label" style={{ flex: 1 }}>
            <div className="page-row-name">监控路径</div>
            <div className="page-row-desc">选择要监控的文件夹路径</div>
          </div>
        </div>
        
        {fileWatchPaths.length > 0 && (
          <div className="page-row" style={{ padding: 0 }}>
            <div className="path-list" style={{ width: '100%', padding: '0 14px 12px' }}>
              {fileWatchPaths.map((path, index) => (
                <div key={index} className="file-watch-item">
                  <span className="file-watch-path">{path}</span>
                  <button
                    onClick={() => handleRemovePath(path)}
                    className="file-watch-remove-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="page-row" style={{ paddingTop: fileWatchPaths.length > 0 ? 0 : 12 }}>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="输入要监控的路径"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPath()}
              className="file-watch-input"
            />
            <button
              onClick={handleAddPath}
              disabled={!newPath.trim()}
              className="page-btn"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label" style={{ flex: 1 }}>
            <div className="page-row-name">忽略模式</div>
            <div className="page-row-desc">匹配的文件将被忽略，支持通配符 *</div>
          </div>
        </div>
        
        {fileWatchIgnorePatterns.length > 0 && (
          <div className="page-row" style={{ padding: 0 }}>
            <div className="pattern-list" style={{ width: '100%', padding: '0 14px 12px' }}>
              {fileWatchIgnorePatterns.map((pattern, index) => (
                <div key={index} className="file-watch-item">
                  <span className="file-watch-path">{pattern}</span>
                  <button
                    onClick={() => handleRemovePattern(pattern)}
                    className="file-watch-remove-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="page-row" style={{ paddingTop: fileWatchIgnorePatterns.length > 0 ? 0 : 12 }}>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="输入忽略模式（如 *.tmp）"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPattern()}
              className="file-watch-input"
            />
            <button
              onClick={handleAddPattern}
              disabled={!newPattern.trim()}
              className="page-btn"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-row">
          <div className="page-row-label">
            <div className="page-row-name">防抖延迟</div>
            <div className="page-row-desc">文件变化后延迟处理的时间（毫秒）</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={debounceInput}
              onChange={(e) => setDebounceInput(e.target.value)}
              onBlur={handleDebounceChange}
              min="0"
              max="5000"
              className="page-input"
              style={{ minWidth: 100 }}
            />
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>ms</span>
          </div>
        </div>
        <div className="page-row" style={{ paddingTop: 0 }}>
          <div className="page-row-label">
            <div className="page-row-desc" style={{ marginTop: 0 }}>
              建议值: 300-1000ms，避免频繁触发
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
        }
        
        .status-running {
          background: var(--color-success-light);
          color: var(--color-success-dark);
        }
        
        .status-starting, .status-stopping {
          background: var(--color-warning-light);
          color: var(--color-warning);
        }
        
        .status-idle {
          background: var(--color-gray-100);
          color: var(--color-gray-500);
        }

        .file-watch-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px;
          margin-bottom: 4px;
          background: var(--bg);
          border-radius: 6px;
        }

        .file-watch-path {
          flex: 1;
          font-size: 12px;
          color: var(--txt2);
          word-break: break-all;
        }

        .file-watch-remove-btn {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: none;
          background: var(--color-error-light);
          color: var(--color-error-dark);
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .file-watch-remove-btn:hover {
          background: var(--color-error);
          color: white;
        }

        .file-watch-input {
          flex: 1;
          height: 28px;
          padding: 0 10px;
          background: var(--surface);
          border: 0.5px solid var(--border-lit);
          border-radius: 6px;
          color: var(--txt);
          font-size: 12px;
          outline: none;
        }
      `}</style>
    </div>
  );
};