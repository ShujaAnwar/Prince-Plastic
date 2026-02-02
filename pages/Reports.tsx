
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
    materialType: '',
    sizeId: ''
  });

  const batches = db.getBatches();
  const rawMaterials = db.getRawMaterials();
  const sales = db.getSales();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const ledger = db.getLedger();
  const fgStock = db.getFinishedGoodsStock();
  const masterSizes = db.getSizes();
  const materialTypes = db.getMaterialTypes();

  // Filtered Data Sets for sub-reports
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

  // --- REPORT COMPONENTS ---

  const ReportHub = () => {
    const cards = [
      { id: 'materials', title: 'Materials Intel', icon: '📦', desc: 'Inward, usage & valuation' },
      { id: 'production', title: 'Production Logs', icon: '⚙️', desc: 'Batch efficiency & wastage' },
      { id: 'inventory', title: 'Finished Goods', icon: '🛍️', desc: 'Size-wise stock & value' },
      { id: 'sales', title: 'Sales & Profit', icon: '📈', desc: 'Revenue & margin analysis' },
      { id: 'vendors', title: 'Vendor Ledger', icon: '🧾', desc: 'Payables & purchase history' },
      { id: 'customers', title: 'Customer Ledger', icon: '🤝', desc: 'Receivables & aging' },
      { id: 'finance', title: 'Finance Snapshot', icon: '💰', desc: 'Management summary' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in no-print">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => setCurrentView(card.id as ReportView)}
            className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left group"
          >
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {card.icon}
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2">{card.title}</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">{card.desc}</p>
          </button>
        ))}
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
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">₨</div>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Net Financial Worth</p>
             <h4 className="text-4xl font-black">{formatPKR(receivables + rawVal + fgVal - payables)}</h4>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Sales</p>
             <h4 className="text-3xl font-black text-green-600">{formatPKR(totalSales)}</h4>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Stock Asset</p>
             <h4 className="text-3xl font-black text-blue-600">{formatPKR(rawVal + fgVal)}</h4>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
           <table className="w-full text-left text-xs">
              <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                    <th className="p-5">Accounting Metric</th>
                    <th className="p-5 text-right">Debit Value (Receivables/Asset)</th>
                    <th className="p-5 text-right">Credit Value (Payables/Liab)</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 <tr>
                    <td className="p-5 font-bold uppercase">Customer Receivables</td>
                    <td className="p-5 text-right font-black text-green-600">{formatPKR(receivables)}</td>
                    <td className="p-5 text-right">-</td>
                 </tr>
                 <tr>
                    <td className="p-5 font-bold uppercase">Vendor Payables</td>
                    <td className="p-5 text-right">-</td>
                    <td className="p-5 text-right font-black text-red-600">{formatPKR(payables)}</td>
                 </tr>
                 <tr>
                    <td className="p-5 font-bold uppercase">Raw Material Inventory</td>
                    <td className="p-5 text-right font-black text-blue-600">{formatPKR(rawVal)}</td>
                    <td className="p-5 text-right">-</td>
                 </tr>
                 <tr>
                    <td className="p-5 font-bold uppercase">Finished Stock Valuation</td>
                    <td className="p-5 text-right font-black text-blue-600">{formatPKR(fgVal)}</td>
                    <td className="p-5 text-right">-</td>
                 </tr>
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  const CustomerAgingReport = () => {
    const agingData = customers.map(c => {
      const pLedger = ledger.filter(l => l.partyId === c.id);
      let balance = c.openingBalance;
      let d30 = 0, d60 = 0, d90 = 0;
      
      const now = new Date();
      pLedger.forEach(e => {
        balance += (e.debit - e.credit);
        const entryDate = new Date(e.date);
        const diffDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24));
        if (e.debit > e.credit) {
          if (diffDays > 60) d90 += (e.debit - e.credit);
          else if (diffDays > 30) d60 += (e.debit - e.credit);
          else d30 += (e.debit - e.credit);
        }
      });

      return { name: c.name, balance, d30, d60, d90 };
    }).filter(c => c.balance > 0);

    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
              <th className="p-4">Customer Entity</th>
              <th className="p-4 text-right">0-30 Days</th>
              <th className="p-4 text-right">31-60 Days</th>
              <th className="p-4 text-right">60+ Days</th>
              <th className="p-4 text-right bg-blue-50">Total Outstanding (₨)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agingData.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-black text-slate-800 uppercase">{c.name}</td>
                <td className="p-4 text-right text-slate-500">{formatPKR(c.d30)}</td>
                <td className="p-4 text-right text-orange-400 font-bold">{formatPKR(c.d60)}</td>
                <td className="p-4 text-right text-red-500 font-black">{formatPKR(c.d90)}</td>
                <td className="p-4 text-right font-black text-blue-600 bg-blue-50/30">{formatPKR(c.balance)}</td>
              </tr>
            ))}
            {agingData.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-slate-300 italic">No outstanding receivables found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const MaterialsReport = () => {
    const report = useMemo(() => {
      const stats: Record<string, any> = {};
      
      // Calculate Opening Balances (Stock before startDate)
      rawMaterials.forEach(m => {
        const key = `${m.materialName}-${m.color}`;
        if (!stats[key]) stats[key] = { name: m.materialName, color: m.color, opening: 0, inward: 0, used: 0, rate: m.ratePerKg };
        
        if (m.date < filters.startDate) {
           stats[key].opening += m.quantityKg;
        } else if (m.date <= filters.endDate) {
           stats[key].inward += m.quantityKg;
        }
      });
      
      // Subtract usage before startDate from Opening
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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
              <th className="p-5">Material (Lot)</th>
              <th className="p-5 text-right">Opening (KG)</th>
              <th className="p-5 text-right">Inward (KG)</th>
              <th className="p-5 text-right">Consumed (KG)</th>
              <th className="p-5 text-right text-blue-600">Closing (KG)</th>
              <th className="p-5 text-right">Valuation (₨)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.map((item: any, i) => {
              const closing = (item.opening + item.inward - item.used);
              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5">
                    <div className="font-black text-slate-800 uppercase">{item.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{item.color}</div>
                  </td>
                  <td className="p-5 text-right text-slate-400">{item.opening.toFixed(1)}</td>
                  <td className="p-5 text-right font-bold text-green-600">+{item.inward.toFixed(1)}</td>
                  <td className="p-5 text-right font-bold text-red-500">-{item.used.toFixed(1)}</td>
                  <td className="p-5 text-right font-black text-blue-600 bg-blue-50/20">{closing.toFixed(1)}</td>
                  <td className="p-5 text-right font-black text-slate-800">{formatPKR(closing * item.rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const ProductionSummaryReport = () => {
    return (
       <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Batch Efficiency (Output Ratio)</p>
                <div className="h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredBatches.slice(-10)}>
                         <XAxis dataKey="batchNo" tick={{fontSize: 8, fontWeight: 'bold'}} />
                         <Tooltip />
                         <Bar dataKey="totalOutputKg" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Wastage Volume (KG)</p>
                <div className="h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={filteredBatches.slice(-10).map(b => ({name: b.batchNo, value: b.totalWastageKg}))} innerRadius={40} outerRadius={60} dataKey="value">
                            {filteredBatches.map((_, i) => <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i%4]} />)}
                         </Pie>
                         <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                      <th className="p-5">Batch ID</th>
                      <th className="p-5 text-right">Input (KG)</th>
                      <th className="p-5 text-right text-blue-600">Net Output (KG)</th>
                      <th className="p-5 text-right text-red-500">Waste (KG)</th>
                      <th className="p-5 text-right">Batch Unit Cost (₨)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredBatches.slice().reverse().map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                         <td className="p-5">
                            <div className="font-black text-slate-800">{b.batchNo}</div>
                            <p className="text-[9px] font-bold text-slate-400">{b.date}</p>
                         </td>
                         <td className="p-5 text-right font-bold text-slate-400">{b.totalInputKg.toFixed(1)}</td>
                         <td className="p-5 text-right font-black text-blue-600">{b.totalOutputKg.toFixed(1)}</td>
                         <td className="p-5 text-right font-black text-red-500">{b.totalWastageKg.toFixed(1)} ({b.wastagePercentage.toFixed(1)}%)</td>
                         <td className="p-5 text-right font-black text-slate-800">₨ {b.costPerKg.toFixed(2)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  const InventoryReportView = () => {
    return (
       <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
             {fgStock.slice(0, 4).map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                   <p className="text-xl font-black text-blue-600">{item.weightKg.toFixed(1)} KG</p>
                   {item.weightKg < 50 && <p className="text-[8px] font-black text-red-500 uppercase mt-2 animate-pulse">Low Stock Alert</p>}
                </div>
             ))}
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                      <th className="p-5">Size Description</th>
                      <th className="p-5 text-right">Available weight (KG)</th>
                      <th className="p-5 text-right">Inventory Valuation (PKR)</th>
                      <th className="p-5 text-right">Projected Sales Value (PKR)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {fgStock.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5 font-black text-slate-800 uppercase text-sm">{item.label}</td>
                         <td className="p-5 text-right font-black text-blue-600">{item.weightKg.toFixed(1)} KG</td>
                         <td className="p-5 text-right font-black text-slate-800">{formatPKR(item.weightKg * item.costPricePerKg)}</td>
                         <td className="p-5 text-right font-black text-green-600">{formatPKR(item.weightKg * item.sellingPricePerKg)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  const LedgerListView = ({ type }: { type: 'Supplier' | 'Customer' }) => {
     const parties = type === 'Supplier' ? suppliers : customers;
     return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
           <table className="w-full text-left text-xs">
              <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                    <th className="p-5">Party Name</th>
                    <th className="p-5 text-right">Opening Bal.</th>
                    <th className="p-5 text-right">Period Transactions</th>
                    <th className="p-5 text-right text-blue-600">Closing Balance (₨)</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {parties.map(p => {
                    const op = db.getPartyBalanceAtDate(p.id, filters.startDate, type);
                    const periodEntries = ledger.filter(l => l.partyId === p.id && l.date >= filters.startDate && l.date <= filters.endDate);
                    let periodDiff = 0;
                    periodEntries.forEach(e => {
                       if (type === 'Customer') periodDiff += (e.debit - e.credit);
                       else periodDiff += (e.credit - e.debit);
                    });
                    const closing = op + periodDiff;
                    return (
                       <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-5 font-black text-slate-800 uppercase">{p.name}</td>
                          <td className="p-5 text-right text-slate-400">{formatPKR(op)}</td>
                          <td className={`p-5 text-right font-bold ${periodDiff > 0 ? 'text-blue-500' : 'text-slate-400'}`}>{periodDiff > 0 ? '+' : ''}{formatPKR(periodDiff)}</td>
                          <td className={`p-5 text-right font-black ${closing > 0 ? 'text-red-500' : 'text-green-600'}`}>{formatPKR(closing)}</td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>
     );
  };

  const SalesReportView = () => {
    const totalSales = filteredSales.reduce((a, b) => a + b.totalAmount, 0);
    const totalCost = filteredSales.reduce((a, b) => {
       const cost = fgStock.find(f => f.sizeId === b.sizeId)?.costPricePerKg || 0;
       return a + (b.weightKg * cost);
    }, 0);

    return (
       <div className="space-y-6">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center no-print">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Profit Index</p>
                <h3 className="text-4xl font-black text-green-600">{formatPKR(totalSales - totalCost)}</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Margin Percentage: {(((totalSales - totalCost) / (totalSales || 1)) * 100).toFixed(1)}%</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Weight Sold</p>
                <h3 className="text-3xl font-black text-slate-800">{filteredSales.reduce((a,b)=>a+b.weightKg,0).toFixed(1)} KG</h3>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                      <th className="p-5">Invoice Details</th>
                      <th className="p-5 text-right">Sold KG</th>
                      <th className="p-5 text-right">Rate / KG</th>
                      <th className="p-5 text-right">Revenue (₨)</th>
                      <th className="p-5 text-right">Profit (₨)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredSales.map(sale => {
                      const cost = fgStock.find(f => f.sizeId === sale.sizeId)?.costPricePerKg || 0;
                      const profit = (sale.rate - cost) * sale.weightKg;
                      return (
                         <tr key={sale.id} className="hover:bg-slate-50">
                            <td className="p-5">
                               <div className="font-black text-slate-800">{sale.invoiceNo}</div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase">{customers.find(c=>c.id===sale.customerId)?.name}</p>
                            </td>
                            <td className="p-5 text-right font-black text-slate-700">{sale.weightKg.toFixed(1)}</td>
                            <td className="p-5 text-right text-slate-400">₨ {sale.rate.toFixed(2)}</td>
                            <td className="p-5 text-right font-black text-blue-600">{formatPKR(sale.totalAmount)}</td>
                            <td className="p-5 text-right font-black text-green-600">{formatPKR(profit)}</td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* UNIVERSAL COMPACT FILTER BAR */}
      <div className="no-print bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-40 backdrop-blur-md bg-white/90">
        <div className="flex flex-col md:flex-row items-center gap-4">
           {currentView !== 'hub' && (
             <button 
               onClick={() => setCurrentView('hub')} 
               className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all text-xs font-black shadow-lg shadow-slate-200"
             >🏠 Hub</button>
           )}
           <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex flex-col">
                 <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Start Date</label>
                 <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col">
                 <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">End Date</label>
                 <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col">
                 <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Filter Party</label>
                 <select value={filters.partyId} onChange={e => setFilters({...filters, partyId: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500">
                    <option value="">All Entities</option>
                    {[...suppliers, ...customers].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
              <div className="flex flex-col">
                 <label className="text-[8px] font-black text-slate-400 uppercase ml-2 mb-1">Filter Size</label>
                 <select value={filters.sizeId} onChange={e => setFilters({...filters, sizeId: e.target.value})} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black outline-none focus:border-blue-500">
                    <option value="">All Sizes</option>
                    {masterSizes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                 </select>
              </div>
              <div className="flex items-end">
                 <button onClick={handlePrint} className="w-full bg-blue-600 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Print Report</button>
              </div>
           </div>
        </div>
      </div>

      {/* SMART PRINT HEADER (PDF Optimized) */}
      <div className="print-only hidden border-b-[8px] border-slate-900 pb-10">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">PRINCE PLASTIC</h1>
               <p className="text-lg font-bold text-blue-600 mt-2 uppercase tracking-[0.4em]">Advanced ERP Audit Statement</p>
               <div className="mt-8 space-y-1 text-xs font-black uppercase text-slate-400">
                  <p>Period: {filters.startDate} → {filters.endDate}</p>
                  <p>Generation: {new Date().toLocaleString()}</p>
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl inline-block">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Classification</p>
                  <p className="text-xl font-black uppercase">{currentView.replace('_', ' ')} Report</p>
               </div>
            </div>
         </div>
      </div>

      {/* REPORT CONTENT VIEWER */}
      <div className="animate-fade-in transition-all duration-500">
        {currentView === 'hub' && <ReportHub />}
        {currentView === 'materials' && <MaterialsReport />}
        {currentView === 'production' && <ProductionSummaryReport />}
        {currentView === 'inventory' && <InventoryReportView />}
        {currentView === 'sales' && <SalesReportView />}
        {currentView === 'customers' && <CustomerAgingReport />}
        {currentView === 'vendors' && <LedgerListView type="Supplier" />}
        {currentView === 'finance' && <FinanceSnapshot />}
      </div>

      {/* FOOTER */}
      <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] italic">
         <p>© Prince Plastic Manufacturing System</p>
         <p>Currency: PKR | Automated System Generation</p>
         <p className="no-print">Page: 1/1</p>
      </div>
    </div>
  );
};

export default Reports;
