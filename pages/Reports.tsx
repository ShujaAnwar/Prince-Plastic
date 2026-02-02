
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, PieChart, Pie
} from 'recharts';

type ReportView = 'hub' | 'materials' | 'production' | 'inventory' | 'sales' | 'vendors' | 'customers' | 'finance';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Reports: React.FC = () => {
  const [currentView, setCurrentView] = useState<ReportView>('hub');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    partyId: '',
    sizeId: ''
  });

  // DB Data
  const batches = db.getBatches();
  const rawMaterials = db.getRawMaterials();
  const sales = db.getSales();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const ledger = db.getLedger();
  const fgStock = db.getFinishedGoodsStock();
  const masterSizes = db.getSizes();

  // Filtered Data
  const filteredSales = useMemo(() => sales.filter(s => 
    s.date >= filters.startDate && 
    s.date <= filters.endDate &&
    (filters.partyId === '' || s.customerId === filters.partyId) &&
    (filters.sizeId === '' || s.sizeId === filters.sizeId)
  ), [sales, filters]);

  const handlePrint = () => window.print();

  // --- SUB-REPORTS ---

  const MaterialsReport = () => {
    const report = useMemo(() => {
      const stats: Record<string, any> = {};
      rawMaterials.forEach(m => {
        const key = `${m.materialName}-${m.color}`;
        if (!stats[key]) stats[key] = { name: m.materialName, color: m.color, opening: 0, inward: 0, used: 0, rate: m.ratePerKg };
        if (m.date < filters.startDate) stats[key].opening += m.quantityKg;
        else if (m.date <= filters.endDate) stats[key].inward += m.quantityKg;
      });
      batches.forEach(b => {
        b.consumedMaterials.forEach(c => {
          const key = `${c.materialName}-${c.color}`;
          if (stats[key]) {
            if (b.date < filters.startDate) stats[key].opening -= c.quantityUsed;
            else if (b.date <= filters.endDate) stats[key].used += c.quantityUsed;
          }
        });
      });
      return Object.values(stats);
    }, [batches, rawMaterials, filters]);

    return (
      <div className="bg-white rounded-[2rem] md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] md:text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                <th className="p-3 md:p-5">Material</th>
                <th className="p-3 md:p-5 text-right hidden sm:table-cell">Opening</th>
                <th className="p-3 md:p-5 text-right">Inward</th>
                <th className="p-3 md:p-5 text-right">Used</th>
                <th className="p-3 md:p-5 text-right bg-blue-50/30 text-blue-600">Closing</th>
                <th className="p-3 md:p-5 text-right hidden md:table-cell">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map((item: any, i) => {
                const closing = item.opening + item.inward - item.used;
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 md:p-5 font-black uppercase text-slate-800">
                      {item.name} 
                      <span className="block text-[8px] text-slate-400 font-bold">{item.color}</span>
                    </td>
                    <td className="p-3 md:p-5 text-right text-slate-400 hidden sm:table-cell">{item.opening.toFixed(1)}</td>
                    <td className="p-3 md:p-5 text-right text-green-600 font-bold">+{item.inward.toFixed(1)}</td>
                    <td className="p-3 md:p-5 text-right text-red-500 font-bold">-{item.used.toFixed(1)}</td>
                    <td className="p-3 md:p-5 text-right font-black text-blue-600 bg-blue-50/10">{closing.toFixed(1)}</td>
                    <td className="p-3 md:p-5 text-right font-black hidden md:table-cell">{formatPKR(closing * item.rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FinanceSnapshot = () => {
    const receivables = customers.reduce((acc, c) => {
      let bal = c.openingBalance;
      ledger.filter(l => l.partyId === c.id).forEach(e => bal += (e.debit - e.credit));
      return acc + bal;
    }, 0);
    const payables = suppliers.reduce((acc, s) => {
      let bal = s.openingBalance;
      ledger.filter(l => l.partyId === s.id).forEach(e => bal += (e.credit - e.debit));
      return acc + bal;
    }, 0);
    const rawVal = db.getRawMaterialStock().reduce((a, b) => a + (b.availableQty * b.avgRate), 0);
    const fgVal = fgStock.reduce((a, b) => a + (b.weightKg * b.costPricePerKg), 0);
    const totalSales = filteredSales.reduce((a, b) => a + b.totalAmount, 0);

    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] text-white shadow-xl">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Assets</p>
             <h4 className="text-2xl md:text-4xl font-black">{formatPKR(rawVal + fgVal + receivables)}</h4>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A/R (Receivables)</p>
             <h4 className="text-xl md:text-3xl font-black text-green-600">{formatPKR(receivables)}</h4>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A/P (Payables)</p>
             <h4 className="text-xl md:text-3xl font-black text-red-600">{formatPKR(payables)}</h4>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] md:rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b bg-slate-50 text-[10px] font-black uppercase text-slate-500">Inventory & P&L Snapshot</div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100 font-bold uppercase">
              <tr><td className="p-4 md:p-5">Gross Sales</td><td className="p-4 md:p-5 text-right font-black text-green-600">{formatPKR(totalSales)}</td></tr>
              <tr><td className="p-4 md:p-5">Raw Stock</td><td className="p-4 md:p-5 text-right font-black">{formatPKR(rawVal)}</td></tr>
              <tr><td className="p-4 md:p-5">Finished Stock</td><td className="p-4 md:p-5 text-right font-black">{formatPKR(fgVal)}</td></tr>
              <tr className="bg-slate-50 font-black"><td className="p-4 md:p-5">Working Capital</td><td className="p-4 md:p-5 text-right text-blue-600 text-sm md:text-lg">{formatPKR(receivables + rawVal + fgVal - payables)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const InventoryReportView = () => {
    return (
      <div className="bg-white rounded-[2rem] md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] md:text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                <th className="p-4 md:p-5">Shopper Size</th>
                <th className="p-4 md:p-5 text-right">KG Stock</th>
                <th className="p-4 md:p-5 text-right hidden sm:table-cell">Cost / KG</th>
                <th className="p-4 md:p-5 text-right">Valuation</th>
                <th className="p-4 md:p-5 text-right hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fgStock.map((item, i) => (
                <tr key={i}>
                  <td className="p-4 md:p-5 font-black text-slate-800 uppercase">{item.label}</td>
                  <td className="p-4 md:p-5 text-right font-black text-blue-600">{item.weightKg.toFixed(1)} KG</td>
                  <td className="p-4 md:p-5 text-right text-slate-400 hidden sm:table-cell">₨ {item.costPricePerKg.toFixed(2)}</td>
                  <td className="p-4 md:p-5 text-right font-black">{formatPKR(item.weightKg * item.costPricePerKg)}</td>
                  <td className="p-4 md:p-5 text-right hidden md:table-cell">
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${item.weightKg < 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {item.weightKg < 50 ? 'Low' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const HubView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in no-print pb-20">
      {[
        { id: 'materials', title: 'Materials', icon: '📦', desc: 'Stock inward & usage' },
        { id: 'production', title: 'Production', icon: '⚙️', desc: 'Batch & Wastage' },
        { id: 'inventory', title: 'Inventory', icon: '🛍️', desc: 'Finished products' },
        { id: 'sales', title: 'Sales', icon: '📈', desc: 'Revenue & Margin' },
        { id: 'vendors', title: 'Vendors', icon: '🧾', desc: 'A/P Ledger' },
        { id: 'customers', title: 'Customers', icon: '🤝', desc: 'A/R Ledger' },
        { id: 'finance', title: 'Finance', icon: '💰', desc: 'Management P&L' }
      ].map(card => (
        <button key={card.id} onClick={() => setCurrentView(card.id as any)} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left group">
          <div className="text-2xl md:text-3xl mb-3 md:mb-4 group-hover:scale-110 transition-transform">{card.icon}</div>
          <h3 className="font-black text-slate-800 text-[11px] md:text-sm uppercase tracking-widest">{card.title}</h3>
          <p className="text-[9px] text-slate-400 font-bold mt-1 leading-relaxed">{card.desc}</p>
        </button>
      ))}
    </div>
  );

  const FilterControls = () => (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex flex-col">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Start Date</label>
        <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
      </div>
      <div className="flex flex-col">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">End Date</label>
        <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
      </div>
      <div className="flex flex-col">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Party / Entity</label>
        <select value={filters.partyId} onChange={e => setFilters({...filters, partyId: e.target.value})} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] font-black outline-none focus:border-blue-500">
          <option value="">All Parties</option>
          {[...suppliers, ...customers].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button onClick={handlePrint} className="w-full bg-blue-600 text-white p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100">Download PDF</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      
      {/* UNIVERSAL FILTER BAR - Desktop / Tablet */}
      <div className="hidden sm:block no-print bg-white p-5 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-40 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4">
          {currentView !== 'hub' && (
            <button onClick={() => setCurrentView('hub')} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all text-[10px] font-black">🏠 HUB</button>
          )}
          <FilterControls />
        </div>
      </div>

      {/* Mobile Sticky Header with Filter Button */}
      <div className="sm:hidden no-print flex items-center justify-between gap-3 sticky top-0 z-40 py-2">
        {currentView !== 'hub' && (
          <button onClick={() => setCurrentView('hub')} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black shadow-lg">HUB</button>
        )}
        <button 
          onClick={() => setShowFilters(true)}
          className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm"
        >
          ⚙️ Filter Reports
        </button>
      </div>

      {/* Mobile Slide-up Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] sm:hidden no-print">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-8 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-xs font-black uppercase tracking-widest">Report Filters</h4>
               <button onClick={() => setShowFilters(false)} className="text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <FilterControls />
              <button onClick={() => setShowFilters(false)} className="w-full py-4 bg-slate-100 text-slate-900 rounded-xl font-black uppercase text-[10px] mt-4">Apply & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT HEADER */}
      <div className="print-only hidden border-b-[8px] border-slate-900 pb-8 mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">PRINCE PLASTIC ERP</h1>
        <div className="flex justify-between mt-4">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Statement: {currentView.toUpperCase()}</p>
          <p className="text-[10px] font-black uppercase">Period: {filters.startDate} → {filters.endDate}</p>
        </div>
      </div>

      {/* RENDERER */}
      <div className="min-h-[400px]">
        {currentView === 'hub' && <HubView />}
        {currentView === 'materials' && <MaterialsReport />}
        {currentView === 'inventory' && <InventoryReportView />}
        {currentView === 'finance' && <FinanceSnapshot />}
        {currentView !== 'hub' && !['materials', 'inventory', 'finance'].includes(currentView) && (
           <div className="p-20 text-center opacity-30 italic text-xs uppercase font-black tracking-widest">
             {currentView.replace('_', ' ')} Module - Optimized Card View Coming Soon
           </div>
        )}
      </div>

      {/* PRINT FOOTER */}
      <div className="print-only hidden mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] italic">
         <p>© Prince Plastic Manufacturing System</p>
         <p>Currency: PKR | Audit-Ready</p>
      </div>
    </div>
  );
};

export default Reports;
