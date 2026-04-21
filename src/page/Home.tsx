import BoxManager from '../components/home/BoxManager'
import ItemList from '../components/home/ItemList'
import { useStore } from '../store'

interface HomeProps {
  onNavClick: (nav: 'home' | 'stats' | 'help' | 'settings') => void;
  activeNav?: string;
}

const Home: React.FC<HomeProps> = ({ onNavClick, activeNav }) => {
  const { boxes, activeBoxId, items } = useStore()

  const activeBox = boxes.find(b => b.id === activeBoxId)

  return (
    <div className="app-page">
      <BoxManager activeNav={activeNav} onNavClick={onNavClick} />

      <div className="app-main">
        <div className="page-header">
          <div className="header-title-row">
            <div className="header-icon" style={{ background: 'var(--accent-bg)' }}>
              {activeBox?.name.charAt(0) || '📁'}
            </div>
            <div>
              <div className="header-title">{activeBox?.name || '未选择收纳盒'}</div>
              <div className="header-desc">虚拟映射 · 不移动原始文件</div>
            </div>
          </div>
          <div className="header-meta">
            <div className="meta-chip">
              <div className="meta-dot"></div>
              {items.filter(i => i.boxId === activeBoxId).length} 个应用已映射
            </div>
          </div>
        </div>

        <ItemList />
      </div>
    </div>
  )
}

export default Home