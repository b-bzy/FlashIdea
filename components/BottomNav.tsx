
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BottomNavProps {
  activeTab?: 'note' | 'studio';
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: 'note', icon: 'bolt', label: '闪念速记', path: '/' },
    { id: 'studio', icon: 'auto_fix_high', label: '工作室', path: '/studio' },
  ];

  const getActiveTab = () => {
    if (currentPath === '/studio') return 'studio';
    return 'note';
  };

  const active = activeTab || getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-[#1c2626]/95 backdrop-blur-md border-t border-gray-100 dark:border-white/5 px-6 pt-3 pb-8 flex items-center z-50">
      {tabs.map((tab) => (
        <Link 
          key={tab.id}
          to={tab.path} 
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${active === tab.id ? 'text-primary' : 'text-[#6b7e80]'}`}
        >
          <span className={`material-symbols-outlined ${active === tab.id ? 'font-bold' : ''}`}>
            {tab.icon}
          </span>
          <span className="text-[10px] font-medium">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
