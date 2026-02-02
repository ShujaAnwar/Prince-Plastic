
import React from 'react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
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

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400">PRINCE PLASTIC</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Manufacturing ERP</p>
      </div>
      <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
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
  );
};

export default Sidebar;
