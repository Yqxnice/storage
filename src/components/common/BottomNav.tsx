import React from 'react';
import { AiOutlineHome, AiOutlineSetting, AiOutlinePieChart, AiOutlineEdit } from 'react-icons/ai';

interface BottomNavProps {
  activeNav?: string;
  onNavClick?: (nav: 'home' | 'settings' | 'stats' | 'help') => void;
  showHome?: boolean;
  showSettings?: boolean;
  showStats?: boolean;
  showHelp?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
  onNavClick,
  showHome = true,
  showSettings = true,
  showStats = true,
  showHelp = true
}) => {
  const allNavItems = [
     { key: 'home', icon: <AiOutlineHome />, show: showHome },
     { key: 'settings', icon: <AiOutlineSetting />, show: showSettings },
     { key: 'stats', icon: <AiOutlinePieChart />, show: showStats },
     { key: 'help', icon: <AiOutlineEdit />, show: showHelp },
  ];

  const visibleItems = allNavItems.filter(item => item.show);
  const placeholderCount = 4 - visibleItems.length;
  const placeholderItems = Array(placeholderCount).fill(null).map((_, index) => ({ key: `placeholder-${index}`, icon: null, show: false }));
  const navItems = [...visibleItems, ...placeholderItems];

  return (
    <div className="side-bottom">
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`nav-item-h ${item.show ? '' : 'nav-item-h-placeholder'}`}
          onClick={() => item.show && onNavClick?.(item.key as 'home' | 'settings' | 'stats' | 'help')}
          style={item.show ? {} : { pointerEvents: 'none' }}
        >
          {item.show ? item.icon : null}
        </div>
      ))}
    </div>
  );
};

export default BottomNav;