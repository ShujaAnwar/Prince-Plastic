
import React, { useState } from 'react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'raw_materials', label: 'Raw Materials', icon: '📦' },
    { id: 'production', label: 'Production', icon: '⚙️' },
    { id: 'finished_goods', label: 'Inventory', icon: '🛍️' },
    { id: 'sales', label: 'Sales & Invoicing', icon: '💰' },
    { id: 'ledgers', label: 'Party Ledgers', icon: '📖' },
    { id: 'control_panel', label: 'Control Panel', icon: '🛠️' },
    { id: 'reports', label: 'AI Reports', icon: '✨' },
  ];

  const handleNav = (id: string) => {
    setView(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header & Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-6 z-[60] no-print">
        <h1 className="text-lg font-black text-blue-400">PRINCE PLASTIC</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white bg-slate-800 rounded-lg"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[55] no-print"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col z-[56] shadow-xl transition-transform duration-300 no-print
        ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 lg:translate-x-0 lg:w-64'}
      `}>
        <div className="p-6 border-b border-slate-800 hidden lg:block">
          <h1 className="text-xl font-bold text-blue-400">PRINCE PLASTIC</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Manufacturing ERP</p>
        </div>
        
        {/* Mobile top spacer */}
        <div className="h-16 lg:hidden" />

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-slate-800/50 border-t border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">A</div>
            <div>
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs text-slate-400">Manufacturing Mgr</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
