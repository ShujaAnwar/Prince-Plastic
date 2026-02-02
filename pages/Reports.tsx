
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';

type ReportType = 'executive' | 'materials' | 'vendor_ledger' | 'customer_ledger' | 'production' | 'inventory' | 'sales_profit' | 'wastage';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('executive');
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0] 
  });
  const [selectedParty, setSelectedParty] = useState<string>('');

  // Data Fetching
  const batches = db.getBatches();
  const rawMaterials = db.getRawMaterials();
  const sales = db.getSales();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const ledger = db.getLedger();
  const fgStock = db.getFinishedGoodsStock();
  const masterSizes = db.getSizes();

  // Filtered Data
  const filteredBatches = useMemo(() => batches.filter(b => b.date >= dateRange.start && b.date <= dateRange.end), [batches, dateRange]);
  const filteredSales = useMemo(() => sales.filter(s => s.date >= dateRange.start && s.date <= dateRange.end), [sales, dateRange]);
  const filteredMaterials = useMemo(() => rawMaterials.filter(m => m.date >= dateRange.start && m.date <= dateRange.end), [rawMaterials, dateRange]);

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Executive Level Report
  const ExecutiveDashboard = () => {
    const rawValuation = useMemo(() => db.getRawMaterialStock().reduce((a, b) => a + (b.availableQty * b.avgRate), 0), []);
    const fgValuation = useMemo(() => fgStock.reduce((a, b) => a + (b.weightKg * b.costPricePerKg), 0), [fgStock]);
    const totalSales = useMemo(() => filteredSales.reduce((a, b) => a + b.totalAmount, 0), [filteredSales]);
    const receivables = db.getFinancialSummary().totalReceivables;
    const payables = db.getFinancialSummary().totalPayables;

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assets (Stock)</p>
            <p className="text-2xl font-black text-blue-600">{formatPKR(rawValuation + fgValuation)}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Sales</p>
            <p className="text-2xl font-black text-green-600">{formatPKR(totalSales)}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receivables</p>
            <p className="text-2xl font-black text-orange-600">{formatPKR(receivables)}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payables</p>
            <p className="text-2xl font-black text-red-600">{formatPKR(payables)}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center shadow-2xl">
          <div className="mb-6 md:mb-0">
            <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Net Financial Position</h3>
            <p className="text-5xl font-black tracking-tighter">{formatPKR(receivables + rawValuation + fgValuation - payables)}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Includes Cash Equivalent Stocks & Ledger Balances</p>
          </div>
          <div className="flex space-x-8 text-right">
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Rolls Produced</p>
                <p className="text-2xl font-black">{filteredBatches.reduce((a,b)=>a+b.rollManifest.length, 0)} Units</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Average Efficiency</p>
                <p className="text-2xl font-black text-green-400">{(100 - (filteredBatches.reduce((a,b)=>a+b.wastagePercentage, 0) / (filteredBatches.length || 1))).toFixed(1)}%</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. Raw Material Advanced Report
  const RawMaterialIntelligence = () => {
    const report = useMemo(() => {
      const stats: Record<string, any> = {};
      rawMaterials.forEach(m => {
        const key = `${m.materialName}-${m.color}`;
        if (!stats[key]) stats[key] = { name: m.materialName, color: m.color, vendor: suppliers.find(s=>s.id===m.supplierId)?.name || 'Direct', opening: 0, inward: 0, used: 0, closing: 0, rate: m.ratePerKg };
        stats[key].inward += m.quantityKg;
        stats[key].closing += m.remainingQtyKg;
      });
      filteredBatches.forEach(b => {
        b.consumedMaterials.forEach(c => {
          const key = `${c.materialName}-${c.color}`;
          if (stats[key]) stats[key].used += c.quantityUsed;
        });
      });
      return Object.values(stats);
    }, [filteredBatches, rawMaterials, suppliers]);

    return (
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
              <th className="p-5">Material (Lot Info)</th>
              <th className="p-5">Primary Vendor</th>
              <th className="p-5 text-right">Total Inward (KG)</th>
              <th className="p-5 text-right">Total Consumed (KG)</th>
              <th className="p-5 text-right">Current Stock (KG)</th>
              <th className="p-5 text-right">Avg Rate (₨)</th>
              <th className="p-5 text-right">Valuation (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.map((item: any, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-5">
                   <div className="font-black text-slate-800">{item.name}</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase">{item.color}</div>
                </td>
                <td className="p-5 font-bold text-slate-600">{item.vendor}</td>
                <td className="p-5 text-right font-bold text-slate-400">{item.inward.toFixed(1)}</td>
                <td className="p-5 text-right font-black text-blue-600">{item.used.toFixed(1)}</td>
                <td className="p-5 text-right font-black text-green-600">{item.closing.toFixed(1)}</td>
                <td className="p-5 text-right text-slate-400">₨ {item.rate.toFixed(2)}</td>
                <td className="p-5 text-right font-black text-slate-800">{formatPKR(item.closing * item.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 3 & 4. Ledger Reports
  const LedgerReport = ({ type }: { type: 'Supplier' | 'Customer' }) => {
    const parties = type === 'Supplier' ? suppliers : customers;
    const activeParty = parties.find(p => p.id === selectedParty);
    const entries = ledger.filter(l => l.partyId === selectedParty && l.date >= dateRange.start && l.date <= dateRange.end);
    
    let runningBalance = activeParty?.openingBalance || 0;
    // Calculate running balance up to start date (optional, for enterprise would be better)
    
    return (
      <div className="space-y-6">
        <div className="no-print flex space-x-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <select 
             className="flex-1 border-2 border-slate-100 p-3 rounded-xl font-black outline-none focus:border-blue-500 uppercase text-xs"
             value={selectedParty}
             onChange={e => setSelectedParty(e.target.value)}
           >
             <option value="">-- Select {type} Party --</option>
             {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
        </div>

        {activeParty && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{activeParty.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] mt-1">{type} Ledger Statement</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Current Balance</p>
                  <p className="text-3xl font-black text-blue-600">{formatPKR(ledger.filter(l => l.partyId === selectedParty).reduce((a,b)=> a + (type === 'Supplier' ? (b.credit - b.debit) : (b.debit - b.credit)), activeParty.openingBalance))}</p>
               </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                    <th className="p-4">Date</th>
                    <th className="p-4">Reference / Narration</th>
                    <th className="p-4 text-right">Debit (-)</th>
                    <th className="p-4 text-right">Credit (+)</th>
                    <th className="p-4 text-right">Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/50">
                    <td className="p-4 italic text-slate-400">Prior</td>
                    <td className="p-4 font-black text-slate-500 uppercase">Opening Balance</td>
                    <td className="p-4 text-right">-</td>
                    <td className="p-4 text-right">-</td>
                    <td className="p-4 text-right font-black text-slate-800">{formatPKR(activeParty.openingBalance)}</td>
                  </tr>
                  {entries.map(entry => {
                    const diff = type === 'Supplier' ? (entry.credit - entry.debit) : (entry.debit - entry.credit);
                    runningBalance += diff;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-400">{entry.date}</td>
                        <td className="p-4 font-bold text-slate-700">{entry.reference}</td>
                        <td className="p-4 text-right text-red-500">{entry.debit > 0 ? formatPKR(entry.debit) : '-'}</td>
                        <td className="p-4 text-right text-green-600">{entry.credit > 0 ? formatPKR(entry.credit) : '-'}</td>
                        <td className="p-4 text-right font-black text-blue-600">{formatPKR(runningBalance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 5. Production Analytics
  const ProductionAnalytics = () => {
     return (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Output (Period)</p>
                 <p className="text-4xl font-black text-slate-800">{filteredBatches.reduce((a,b)=>a+b.totalOutputKg, 0).toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span></p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wastage Volume</p>
                 <p className="text-4xl font-black text-red-500">{filteredBatches.reduce((a,b)=>a+b.totalWastageKg, 0).toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span></p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg Cost / KG (₨)</p>
                 <p className="text-4xl font-black text-blue-600">₨ {(filteredBatches.reduce((a,b)=>a+b.costPerKg, 0) / (filteredBatches.length || 1)).toFixed(2)}</p>
              </div>
           </div>
           <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                   <th className="p-5">Batch #</th>
                   <th className="p-5">Roll Breakdown</th>
                   <th className="p-5 text-right">Input (KG)</th>
                   <th className="p-5 text-right">Output (KG)</th>
                   <th className="p-5 text-right">Wastage (KG)</th>
                   <th className="p-5 text-right">Batch Cost (₨)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map(batch => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className="p-5">
                         <div className="font-black text-slate-800">{batch.batchNo}</div>
                         <div className="text-[9px] text-slate-400 font-bold">{batch.date}</div>
                      </td>
                      <td className="p-5 text-slate-500 font-bold uppercase text-[9px]">{batch.rollManifest.length} Rolls Produced</td>
                      <td className="p-5 text-right font-bold text-slate-400">{batch.totalInputKg.toFixed(1)}</td>
                      <td className="p-5 text-right font-black text-blue-600">{batch.totalOutputKg.toFixed(1)}</td>
                      <td className="p-5 text-right font-bold text-red-400">{batch.totalWastageKg.toFixed(1)}</td>
                      <td className="p-5 text-right font-black text-slate-800">{formatPKR(batch.totalBatchCost)}</td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
     );
  };

  // 6. Finished Goods Stock
  const InventoryReport = () => {
     return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
           <table className="w-full text-left text-xs">
              <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                    <th className="p-5">Product / Size Mapping</th>
                    <th className="p-5 text-right">Available Weight (KG)</th>
                    <th className="p-5 text-right">Avg Unit Cost (₨)</th>
                    <th className="p-5 text-right">Inventory Valuation (₨)</th>
                    <th className="p-5 text-right">Target Value (SRP)</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {fgStock.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                       <td className="p-5">
                          <div className="font-black text-slate-800 text-sm">{item.label}</div>
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Finished Store</p>
                       </td>
                       <td className="p-5 text-right font-black text-slate-700">{item.weightKg.toFixed(2)} KG</td>
                       <td className="p-5 text-right font-bold text-slate-400">₨ {item.costPricePerKg.toFixed(2)}</td>
                       <td className="p-5 text-right font-black text-blue-600">{formatPKR(item.weightKg * item.costPricePerKg)}</td>
                       <td className="p-5 text-right font-black text-green-600">{formatPKR(item.weightKg * item.sellingPricePerKg)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     );
  };

  // 7. Sales & Profitability
  const SalesProfitReport = () => {
     const totalSales = filteredSales.reduce((a,b)=>a+b.totalAmount, 0);
     const totalCost = filteredSales.reduce((a,b)=>{
        const cost = fgStock.find(f=>f.sizeId === b.sizeId)?.costPricePerKg || 0;
        return a + (b.weightKg * cost);
     }, 0);

     return (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Sales Margin</p>
                 <h4 className="text-4xl font-black text-slate-800">{formatPKR(totalSales - totalCost)}</h4>
                 <p className="text-xs font-black text-green-500 uppercase tracking-widest mt-2">{((totalSales - totalCost) / (totalSales || 1) * 100).toFixed(1)}% Profitability Index</p>
              </div>
              <div className="text-right flex space-x-10">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Gross Revenue</p>
                    <p className="text-xl font-black">{formatPKR(totalSales)}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">COGS (Period)</p>
                    <p className="text-xl font-black text-red-500">{formatPKR(totalCost)}</p>
                 </div>
              </div>
           </div>
           <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                   <th className="p-5">Invoice</th>
                   <th className="p-5">Size</th>
                   <th className="p-5 text-right">Sold KG</th>
                   <th className="p-5 text-right">Sold Rate (₨)</th>
                   <th className="p-5 text-right">Revenue (₨)</th>
                   <th className="p-5 text-right">Est. Profit (₨)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredSales.map(sale => {
                     const cost = fgStock.find(f=>f.sizeId === sale.sizeId)?.costPricePerKg || 0;
                     const profit = (sale.rate - cost) * sale.weightKg;
                     return (
                        <tr key={sale.id} className="hover:bg-slate-50">
                           <td className="p-5 font-black text-slate-800">{sale.invoiceNo}</td>
                           <td className="p-5 font-bold text-slate-400 uppercase">{masterSizes.find(s=>s.id===sale.sizeId)?.label}</td>
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

  // 8. Wastage Variance
  const WastageEfficiencyReport = () => {
     return (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100">
                 <p className="text-[10px] font-black text-orange-600 uppercase mb-2">Total Sealing Wastage (3% Target)</p>
                 <p className="text-4xl font-black text-orange-700">{filteredBatches.reduce((a,b)=>a+(b.totalInputKg * 0.03), 0).toFixed(1)} KG</p>
              </div>
              <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                 <p className="text-[10px] font-black text-red-600 uppercase mb-2">Total Cutting Wastage (17% Target)</p>
                 <p className="text-4xl font-black text-red-700">{filteredBatches.reduce((a,b)=>a+(b.totalInputKg * 0.17), 0).toFixed(1)} KG</p>
              </div>
           </div>
           <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-xs">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                   <th className="p-5">Batch ID</th>
                   <th className="p-5 text-right">Actual Waste (KG)</th>
                   <th className="p-5 text-right">Total Waste %</th>
                   <th className="p-5 text-right">Variance from Std</th>
                   <th className="p-5 text-right">Process Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map(b => (
                     <tr key={b.id}>
                        <td className="p-5 font-black">{b.batchNo}</td>
                        <td className="p-5 text-right font-black text-red-500">{b.totalWastageKg.toFixed(1)} KG</td>
                        <td className="p-5 text-right font-black">{b.wastagePercentage.toFixed(1)}%</td>
                        <td className="p-5 text-right font-bold text-slate-400">{(b.wastagePercentage - 20).toFixed(1)}%</td>
                        <td className="p-5 text-right">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${b.wastagePercentage > 21 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {b.wastagePercentage > 21 ? 'Poor Efficiency' : 'Efficient'}
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

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER CONTROLS */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-40 backdrop-blur-md bg-white/90">
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto custom-scrollbar max-w-full">
          {[
            { id: 'executive', label: 'Dashboard', icon: '💎' },
            { id: 'materials', label: 'Material Intel', icon: '📦' },
            { id: 'vendor_ledger', label: 'A/P Ledger', icon: '🧾' },
            { id: 'customer_ledger', label: 'A/R Ledger', icon: '📈' },
            { id: 'production', label: 'Production', icon: '⚙️' },
            { id: 'inventory', label: 'Stock Status', icon: '🛍️' },
            { id: 'sales_profit', label: 'Profitability', icon: '💰' },
            { id: 'wastage', label: 'Wastage', icon: '♻️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveReport(tab.id as any); setSelectedParty(''); }}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center space-x-2 ${activeReport === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
           <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-[10px] font-black outline-none uppercase" />
              <span className="text-slate-300">→</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-[10px] font-black outline-none uppercase" />
           </div>
           <div className="flex space-x-2">
              <button onClick={() => handleExportCSV(batches, 'Master_Batch_Export')} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors" title="Export CSV">📊</button>
              <button onClick={() => window.print()} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200" title="Download PDF">🖨️</button>
           </div>
        </div>
      </div>

      {/* PRINT HEADER (ONLY FOR PDF/PRINT) */}
      <div className="print-only hidden mb-8 border-b-[8px] border-slate-900 pb-10">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">PRINCE PLASTIC</h1>
               <p className="text-lg font-bold text-blue-600 mt-2 uppercase tracking-[0.4em]">Manufacturing Enterprise Suite</p>
               <div className="mt-8 space-y-1 text-xs font-black uppercase text-slate-500">
                  <p>System Report ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  <p>Generated: {new Date().toLocaleString()}</p>
                  <p>Period: {dateRange.start} → {dateRange.end}</p>
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl inline-block">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Report Classification</p>
                  <p className="text-xl font-black uppercase">{activeReport.replace('_', ' ')}</p>
               </div>
            </div>
         </div>
      </div>

      {/* REPORT CONTENT */}
      <div className="animate-fade-in">
         {activeReport === 'executive' && <ExecutiveDashboard />}
         {activeReport === 'materials' && <RawMaterialIntelligence />}
         {activeReport === 'vendor_ledger' && <LedgerReport type="Supplier" />}
         {activeReport === 'customer_ledger' && <LedgerReport type="Customer" />}
         {activeReport === 'production' && <ProductionAnalytics />}
         {activeReport === 'inventory' && <InventoryReport />}
         {activeReport === 'sales_profit' && <SalesProfitReport />}
         {activeReport === 'wastage' && <WastageEfficiencyReport />}
      </div>

      {/* PRINT FOOTER */}
      <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 italic pb-10">
         <p>© Prince Plastic Manufacturing System</p>
         <p>Currency: PKR (Pakistani Rupees)</p>
         <p>Page 1 of 1</p>
      </div>
    </div>
  );
};

export default Reports;
