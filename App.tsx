
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RawMaterials from './pages/RawMaterials';
import Production from './pages/Production';
import Reports from './pages/Reports';
import Parties from './pages/Parties';
import Sales from './pages/Sales';
import FinishedGoods from './pages/FinishedGoods';
import ControlPanel from './pages/ControlPanel';
import { db } from './db';

const App: React.FC = () => {
  const [currentView, setView] = useState('dashboard');

  useEffect(() => {
    const suppliers = db.getSuppliers();
    if (suppliers.length === 0) {
      // Initialize Parties
      db.saveSupplier({ id: 's1', name: 'Global Polymers', contactPerson: 'John Doe', phone: '123-456-7890', email: 'john@polymers.com', address: 'Plot 42, Industrial Zone', openingBalance: 0, status: 'active' });
      db.saveSupplier({ id: 's2', name: 'ColorTech Ind', contactPerson: 'Jane Smith', phone: '987-654-3210', email: 'sales@colortech.com', address: 'Block B, Karachi', openingBalance: 0, status: 'active' });
      
      db.saveCustomer({ id: 'c1', name: 'Super Shoppe Retail', contactPerson: 'Ali Khan', phone: '555-0199', email: 'ali@supershoppe.pk', address: 'Shop 12, Main Market', openingBalance: 0, status: 'active' });
      db.saveCustomer({ id: 'c2', name: 'City Mart', contactPerson: 'Omar Aziz', phone: '555-0188', email: 'omar@citymart.pk', address: 'Commercial Area A', openingBalance: 0, status: 'active' });

      const today = new Date().toISOString().split('T')[0];

      db.saveRawMaterial({
        id: 'r1',
        materialName: 'HDPE Virgin Dana',
        type: 'Polythene Dana',
        color: 'Natural',
        quantityKg: 500,
        remainingQtyKg: 500,
        ratePerKg: 135,
        totalCost: 67500,
        supplierId: 's1',
        invoiceNo: 'INV-001',
        date: today
      });
      
      db.saveSize('15x20 Standard', 20, 5);
      db.saveSize('10x15 Small', 15, 8);
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'raw_materials': return <RawMaterials />;
      case 'production': return <Production />;
      case 'reports': return <Reports />;
      case 'ledgers': return <Parties />;
      case 'finished_goods': return <FinishedGoods />;
      case 'sales': return <Sales />;
      case 'control_panel': return <ControlPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView={currentView} setView={setView} />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 flex justify-between items-center no-print">
          <div>
            <h1 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{currentView.replace('_', ' ')}</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Prince Plastic Manufacturing System</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-white border border-slate-100 px-4 py-2 rounded-xl text-slate-700 shadow-sm">
              <span className="text-xl">📅</span>
              <span className="font-bold text-sm">{new Date().toDateString()}</span>
            </div>
          </div>
        </header>

        <div className="animate-fade-in transition-all duration-300">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
