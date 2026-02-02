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

  const filteredBatches = useMemo(() => batches.filter(b => 
    b.date >= filters.startDate && 
    b.date <= filters.endDate
  ), [batches, filters]);

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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
              <th className="p-5">Material (Lot)</th>
              <th className="p-5 text-right">Opening (KG)</th>
              <th className="p-5 text-right">Inward (KG)</th>
              <th className="p-5 text-right">Used (KG)</th>
              <th className="p-5 text-right bg-blue-50/30 text-blue-600">Closing (KG)</th>
              <th className="p-5 text-right">Valuation (₨)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.map((item: any, i) => {
              const closing = item.opening + item.inward - item.used;
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-5 font-black uppercase text-slate-800">{item.name} <span className="text-[10px] text-slate-400">({item.color})</span></td>
                  <td className="p-5 text-right text-slate-400">{item.opening.toFixed(1)}</td>
                  <td className="p-5 text-right text-green-600 font-bold">+{item.inward.toFixed(1)}</td>
                  <td className="p-5 text-right text-red-500 font-bold">-{item.used.toFixed(1)}</td>
                  <td className="p-5 text-right font-black text-blue-600 bg-blue-50/10">{closing.toFixed(1)}</td>
                  <td className="p-5 text-right font-black">{formatPKR(closing * item.rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Assets Valuation</p>
             <h4 className="text-4xl font-black">{formatPKR(rawVal + fgVal + receivables)}</h4>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receivables (A/R)</p>
             <h4 className="text-3xl font-black text-green-600">{formatPKR(receivables)}</h4>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payables (A/P)</p>
             <h4 className="text-3xl font-black text-red-600">{formatPKR(payables)}</h4>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-slate-50 text-xs font-black uppercase text-slate-500">Inventory & P&L Snapshot</div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100 font-bold uppercase">
              <tr><td className="p-5">Gross Sales (Period)</td><td className="p-5 text-right font-black text-green-600">{formatPKR(totalSales)}</td></tr>
              <tr><td className="p-5">Raw Stock Asset</td><td className="p-5 text-right font-black">{formatPKR(rawVal)}</td></tr>
              <tr><td className="p-5">Finished Stock Asset</td><td className="p-5 text-right font-black">{formatPKR(fgVal)}</td></tr>
              <tr className="bg-slate-50 font-black"><td className="p-5">Net Working Capital</td><td className="p-5 text-right text-blue-600 text-lg">{formatPKR(receivables + rawVal + fgVal - payables)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const InventoryReportView = () => {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
              <th className="p-5">Shopper Size</th>
              <th className="p-5 text-right">Stock weight (KG)</th>
              <th className="p-5 text-right">Avg Cost / KG</th>
              <th className="p-5 text-right">Valuation (PKR)</th>
              <th className="p-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fgStock.map((item, i) => (
              <tr key={i}>
                <td className="p-5 font-black text-slate-800 uppercase">{item.label}</td>
                <td className="p-5 text-right font-black text-blue-600">{item.weightKg.toFixed(1)} KG</td>
                <td className="p-5 text-right text-slate-400">₨ {item.costPricePerKg.toFixed(2)}</td>
                <td className="p-5 text-right font-black">{formatPKR(item.weightKg * item.costPricePerKg)}</td>
                <td className="p-5 text-right">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.weightKg < 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {item.weightKg < 50 ? 'Low Stock' : 'Healthy'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const HubView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in no-print">
      {[
        { id: 'materials', title: 'Materials', icon: '📦', desc: 'Stock inward & usage' },
        { id: 'production', title: 'Production', icon: '⚙️', desc: 'Batch & Wastage' },
        { id: 'inventory', title: 'Inventory', icon: '🛍️', desc: 'Finished products' },
        { id: 'sales', title: 'Sales', icon: '📈', desc: 'Revenue & Margin' },
        { id: 'vendors', title: 'Vendors', icon: '🧾', desc: 'A/P Ledger' },
        { id: 'customers', title: 'Customers', icon: '🤝', desc: 'A/R Ledger' },
        { id: 'finance', title: 'Finance', icon: '💰', desc: 'Management P&L' }
      ].map(card => (
        <button key={card.id} onClick={() => setCurrentView(card.id as any)} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left group">
          <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{card.icon}</div>
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{card.title}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">{card.desc}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* UNIVERSAL FILTER BAR */}
      <div className="no-print bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-40 backdrop-blur-md bg-white/90">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {currentView !== 'hub' && (
            <button onClick={() => setCurrentView('hub')} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all text-xs font-black">🏠 HUB</button>
          )}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Start Date</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">End Date</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Party / Entity</label>
              <select value={filters.partyId} onChange={e => setFilters({...filters, partyId: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500">
                <option value="">All Parties</option>
                {[...suppliers, ...customers].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handlePrint} className="w-full bg-blue-600 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100">Download PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="print-only hidden border-b-[8px] border-slate-900 pb-8 mb-8">
        <h1 className="text-5xl font-black uppercase tracking-tighter">PRINCE PLASTIC ERP</h1>
        <div className="flex justify-between mt-4">
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Enterprise Statement: {currentView.toUpperCase()}</p>
          <p className="text-xs font-black uppercase">Period: {filters.startDate} → {filters.endDate}</p>
        </div>
      </div>

      {/* RENDERER */}
      <div className="pb-10">
        {currentView === 'hub' && <HubView />}
        {currentView === 'materials' && <MaterialsReport />}
        {currentView === 'inventory' && <InventoryReportView />}
        {currentView === 'finance' && <FinanceSnapshot />}
        {currentView === 'production' && <div className="p-20 text-center opacity-30 italic">Production Detailed Logs - Compact View</div>}
        {currentView === 'sales' && <div className="p-20 text-center opacity-30 italic">Sales Performance - Compact View</div>}
        {currentView === 'vendors' && <div className="p-20 text-center opacity-30 italic">A/P Master Ledger - Compact View</div>}
        {currentView === 'customers' && <div className="p-20 text-center opacity-30 italic">A/R Master Ledger - Compact View</div>}
      </div>

      {/* PRINT FOOTER */}
      <div className="print-only hidden mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] italic">
         <p>© Prince Plastic Manufacturing System</p>
         <p>Currency: PKR | Audit-Ready System Generation</p>
      </div>
    </div>
  );
};

export default Reports;