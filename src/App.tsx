import { useEffect, useState } from 'react';
// Fix import issue
import Home from './page/Home'
import Settings from './page/Settings'
import TitleBar from './components/common/TitleBar'
import DataPathSelector from './components/DataPathSelector'
import WelcomeModal from './components/WelcomeModal'
import { useStore, type Box, type Item, type SettingsState } from './store'
import { applyTheme } from './utils/theme'
import './styles/app.css'

interface SettingsData {
  hasInitialized?: boolean;
  dataPath?: string;
  hasShownWelcome?: boolean;
  theme?: string;
}

function App() {
  const { boxes, activeBoxId, setActiveBox, syncStorageFromElectronStore, syncSettingsFromElectronStore, theme, setTheme, timeThemeEnabled, addItem, addBox } = useStore()
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home')
  const [showDataPathSelector, setShowDataPathSelector] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        let retries = 10;
        while (retries > 0 && (!window.electron || !window.electron.store)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }

        if (window.electron && window.electron.store) {
          // 检查是否已经初始化
          const settingsData = await window.electron.store.get({ key: 'settings', storeType: 'settings' }) as SettingsData;
          const hasInit = settingsData?.hasInitialized || false;
          const dataPath = settingsData?.dataPath || null;
          const hasShownWelcome = settingsData?.hasShownWelcome || false;
          
          // 如果没有显示过欢迎弹窗，显示欢迎弹窗
          if (!hasShownWelcome) {
            setShowWelcomeModal(true);
          } else if (!hasInit && !dataPath) {
            // 如果没有初始化且没有数据路径，显示路径选择对话框
            setShowDataPathSelector(true);
          } else {
            // 已经初始化，同步数据
            await syncAppData();
          }
          
          // 初始化主题
          const savedTheme = settingsData?.theme || 'blue';
          setTheme(savedTheme);
          applyTheme(savedTheme);
        } else {
          // 应用默认主题
          applyTheme('blue');
        }
      } catch (error) {
        console.error('[App] 初始化失败:', error);
        // 应用默认主题
        applyTheme('blue');
      }
    };
    
    const syncAppData = async () => {
      try {
        if (window.electron && window.electron.store) {
          const storageData = await window.electron.store.get({ key: 'storage', storeType: 'storage' });
          if (storageData && typeof storageData === 'object' && 'boxes' in storageData) {
            syncStorageFromElectronStore(storageData as { boxes: Box[]; items: Item[]; activeBoxId: string | null });
          }

          const settingsData = await window.electron.store.get({ key: 'settings', storeType: 'settings' });
          if (settingsData && typeof settingsData === 'object') {
            syncSettingsFromElectronStore(settingsData as Partial<SettingsState>);
          }
        }
      } catch (error) {
        console.error('[App] 同步 electron-store 数据失败:', error);
      }
    };
    
    initApp();
  }, [setTheme, syncStorageFromElectronStore, syncSettingsFromElectronStore]);

  // 当主题变化时应用主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 时间主题自动更新
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timeThemeEnabled) {
      // 每小时检查一次时间，自动切换主题
      intervalId = setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const isDay = hour >= 6 && hour < 18;
        const currentTheme = isDay ? 'blue' : 'dark';

        if (theme !== currentTheme) {
          setTheme(currentTheme);
        }
      }, 60 * 60 * 1000); // 每小时检查一次
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timeThemeEnabled, theme, setTheme]);

  // 监听 file:added 事件
  useEffect(() => {
    const handleFileAdded = (event: CustomEvent) => {
      const fileInfo = event.detail;
      console.log('[App] 收到 file:added 事件:', fileInfo);
      
      if (fileInfo && activeBoxId) {
        console.log('[App] 添加文件到活动收纳盒:', activeBoxId);
        addItem({
          name: fileInfo.name,
          category: fileInfo.category,
          type: fileInfo.type,
          path: fileInfo.path,
          boxId: activeBoxId,
          clickCount: 0
        });
      } else if (!activeBoxId) {
        console.warn('[App] 没有活动的收纳盒，正在创建默认收纳盒');
        // 创建默认收纳盒
        addBox('默认收纳盒');
        // 等待收纳盒创建完成后，使用新创建的收纳盒作为活动收纳盒
        setTimeout(() => {
          if (boxes.length > 0) {
            const newBox = boxes[boxes.length - 1];
            setActiveBox(newBox.id);
            // 重新添加文件到新创建的收纳盒
            if (fileInfo) {
              addItem({
                name: fileInfo.name,
                category: fileInfo.category,
                type: fileInfo.type,
                path: fileInfo.path,
                boxId: newBox.id,
                clickCount: 0
              });
            }
          }
        }, 100);
      }
    };

    window.addEventListener('file:added', handleFileAdded as any);
    
    return () => {
      window.removeEventListener('file:added', handleFileAdded as any);
    };
  }, [activeBoxId, addItem]);

  useEffect(() => {
    if (boxes.length > 0 && !activeBoxId) {
      setActiveBox(boxes[0].id);
    }
  }, [boxes, activeBoxId, setActiveBox]);

  const handleNavClick = (nav: 'home' | 'stats' | 'help' | 'settings') => {
    if (nav === 'settings') {
      setCurrentPage('settings');
    } else {
      setCurrentPage('home');
    }
  };

  // 处理欢迎弹窗同意
  const handleWelcomeAgree = async () => {
    try {
      if (window.electron && window.electron.store) {
        // 标记为已显示欢迎弹窗
        await window.electron.store.set({ key: 'hasShownWelcome', value: true, storeType: 'settings' });
        
        setShowWelcomeModal(false);
        
        // 检查是否需要显示数据路径选择对话框
        const settingsData = await window.electron.store.get({ key: 'settings', storeType: 'settings' });
        const hasInit = (settingsData as any)?.hasInitialized || false;
        const dataPath = (settingsData as any)?.dataPath || null;
        
        if (!hasInit && !dataPath) {
          setShowDataPathSelector(true);
        }
      }
    } catch (error) {
      console.error('[App] 保存欢迎状态失败:', error);
    }
  };

  // 处理数据路径选择
  const handleDataPathSelect = async (storageLocation: string) => {
    try {
      if (window.electron && window.electron.store) {
        // 保存存储位置
        await window.electron.store.set({ key: 'dataPath', value: storageLocation, storeType: 'settings' });
        // 标记为已初始化
        await window.electron.store.set({ key: 'hasInitialized', value: true, storeType: 'settings' });
        
        setShowDataPathSelector(false);
        
        // 重新同步数据
        const syncAppData = async () => {
          try {
            const storageData = await window.electron.store.get({ key: 'storage', storeType: 'storage' });
            if (storageData && typeof storageData === 'object' && 'boxes' in storageData) {
              syncStorageFromElectronStore(storageData as { boxes: Box[]; items: Item[]; activeBoxId: string | null });
            }

            const settingsData = await window.electron.store.get({ key: 'settings', storeType: 'settings' });
            if (settingsData && typeof settingsData === 'object') {
              syncSettingsFromElectronStore(settingsData as Partial<SettingsState>);
            }
          } catch (error) {
            console.error('[App] 同步 electron-store 数据失败:', error);
          }
        };
        
        await syncAppData();
      }
    } catch (error) {
      console.error('[App] 保存数据路径失败:', error);
    }
  };

  return (
    <div className="shell">
      <TitleBar title="桌面收纳" />
      {currentPage === 'home' ? (
        <Home activeNav="home" onNavClick={handleNavClick} />
      ) : (
        <Settings activeNav="settings" onNavClick={handleNavClick} />
      )}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onAgree={handleWelcomeAgree}
      />
      <DataPathSelector
        visible={showDataPathSelector}
        onClose={() => setShowDataPathSelector(false)}
        onConfirm={handleDataPathSelect}
      />
    </div>
  );
}

export default App