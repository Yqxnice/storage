import { useEffect } from 'react';
import { Layout, theme } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import BoxManager from './components/BoxManager'
import ItemList from './components/ItemList'
import { useStore } from './store'
import './App.css'

const { Header, Content, Sider } = Layout;

function App() {
  const { addItem, activeBoxId, viewMode, setViewMode, boxes, setActiveBox } = useStore()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 自动激活第一个收纳盒
  useEffect(() => {
    console.log('[App] 检查收纳盒状态:', { boxesLength: boxes.length, activeBoxId })
    if (boxes.length > 0 && !activeBoxId) {
      setActiveBox(boxes[0].id)
      console.log('[App] 自动激活第一个收纳盒:', boxes[0].name)
    }
  }, [boxes, activeBoxId, setActiveBox])

  useEffect(() => {
    console.log('[App] 添加 file:added 事件监听器')
    const handleFileAdded = (e: Event) => {
      console.log('[App] 收到 file:added 事件:', e)
      const customEvent = e as CustomEvent<{
        name: string;
        type: 'file' | 'folder' | 'icon';
        path: string;
        addedAt: number;
      }>
      const fileInfo = customEvent.detail
      console.log('[App] 事件详情:', fileInfo)
      console.log('[App] activeBoxId:', activeBoxId)

      if (activeBoxId) {
        console.log('[App] 调用 addItem:', {
          name: fileInfo.name,
          type: fileInfo.type,
          path: fileInfo.path,
          boxId: activeBoxId,
          tags: []
        })
        addItem({
          name: fileInfo.name,
          type: fileInfo.type,
          path: fileInfo.path,
          boxId: activeBoxId,
          tags: []
        })
      } else {
        console.warn('[App] 没有激活的收纳盒，无法添加文件')
      }
    }

    window.addEventListener('file:added', handleFileAdded)
    console.log('[App] file:added 事件监听器已添加')
    return () => {
      window.removeEventListener('file:added', handleFileAdded)
      console.log('[App] file:added 事件监听器已移除')
    }
  }, [addItem, activeBoxId])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} style={{ background: colorBgContainer }}>
        <BoxManager />
      </Sider>
      <Layout>
        <Header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: colorBgContainer,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>桌面收纳</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('large')}
              style={{
                padding: '6px 12px',
                border: viewMode === 'large' ? '1px solid #1677ff' : '1px solid #d9d9d9',
                borderRadius: '6px',
                background: viewMode === 'large' ? '#1677ff' : 'white',
                color: viewMode === 'large' ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <AppstoreAddOutlined /> 大图
            </button>
            <button
              onClick={() => setViewMode('small')}
              style={{
                padding: '6px 12px',
                border: viewMode === 'small' ? '1px solid #1677ff' : '1px solid #d9d9d9',
                borderRadius: '6px',
                background: viewMode === 'small' ? '#1677ff' : 'white',
                color: viewMode === 'small' ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <AppstoreOutlined /> 小图
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                border: viewMode === 'list' ? '1px solid #1677ff' : '1px solid #d9d9d9',
                borderRadius: '6px',
                background: viewMode === 'list' ? '#1677ff' : 'white',
                color: viewMode === 'list' ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <UnorderedListOutlined /> 列表
            </button>
          </div>
        </Header>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <div style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
            padding: '24px'
          }}>
            <ItemList />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App