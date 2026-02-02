
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
      db.saveSupplier({ id: 's1', name: 'Global Polymers', contact: '123-456-7890', openingBalance: 0 });
      db.saveSupplier({ id: 's2', name: 'ColorTech Ind', contact: '987-654-3210', openingBalance: 0 });
      
      db.saveCustomer({ id: 'c1', name: 'Super Shoppe Retail', contact: '555-0199', openingBalance: 0 });
      db.saveCustomer({ id: 'c2', name: 'City Mart', contact: '555-0188', openingBalance: 0 });

      const types = db.getMaterialTypes();
      const colors = db.getColors();
      const today = new Date().toISOString().split('T')[0];

      // Initial raw material entry
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

      // --- ADDING 3 NEW TEST ENTRIES ---
      
      // Test Entry 1: Polythene Dana
      db.saveRawMaterial({
        id: 't1',
        materialName: 'LDPE Recycled Dana',
        type: 'Polythene Dana',
        color: 'Blue',
        quantityKg: 1000,
        remainingQtyKg: 1000,
        ratePerKg: 110,
        totalCost: 110000,
        supplierId: 's1',
        invoiceNo: 'TEST-INV-101',
        date: today
      });

      // Test Entry 2: Color
      db.saveRawMaterial({
        id: 't2',
        materialName: 'Premium Red Masterbatch',
        type: 'Color',
        color: 'Red',
        quantityKg: 50,
        remainingQtyKg: 50,
        ratePerKg: 280,
        totalCost: 14000,
        supplierId: 's2',
        invoiceNo: 'TEST-INV-102',
        date: today
      });

      // Test Entry 3: Chemical
      db.saveRawMaterial({
        id: 't3',
        materialName: 'Stabilizer Grade X',
        type: 'Chemical',
        color: 'Natural',
        quantityKg: 100,
        remainingQtyKg: 100,
        ratePerKg: 195,
        totalCost: 19500,
        supplierId: 's1',
        invoiceNo: 'TEST-INV-103',
        date: today
      });
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
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{currentView.replace('_', ' ')}</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Prince Plastic Manufacturing System</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative group cursor-pointer">
              <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>
              <button className="p-2.5 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-blue-500 transition">🔔</button>
            </div>
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
