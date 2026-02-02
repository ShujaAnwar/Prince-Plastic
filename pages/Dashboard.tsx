
import React, { useMemo } from 'react';
import StatsCard from '../components/StatsCard';
import { db } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

type ProcessStatus = 'active' | 'completed' | 'idle' | 'error';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ProcessIndicator: React.FC<{ label: string; status: ProcessStatus; count: number; icon: string }> = ({ label, status, count, icon }) => {
  const statusStyles = {
    active: {
      dot: 'bg-yellow-400 animate-blink',
      text: 'text-yellow-600 font-black',
      label: 'In Progress',
      glow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]'
    },
    completed: {
      dot: 'bg-green-500',
      text: 'text-green-600 font-bold',
      label: 'Completed',
      glow: ''
    },
    error: {
      dot: 'bg-red-500 animate-pulse',
      text: 'text-red-600 font-black',
      label: 'Attention!',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]'
    },
    idle: {
      dot: 'bg-slate-300',
      text: 'text-slate-400 font-medium',
      label: 'Standby',
      glow: ''
    }
  };

  const current = statusStyles[status];

  return (
    <div className={`flex flex-col items-center p-5 bg-white rounded-3xl border-2 transition-all duration-500 relative overflow-hidden group ${status === 'active' ? 'border-yellow-200 ' + current.glow : status === 'error' ? 'border-red-200 ' + current.glow : 'border-slate-50'}`}>
      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${current.dot}`}></div>
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 text-center">{label}</p>
      <div className="mt-2 flex items-center space-x-1">
        <span className={`text-[11px] font-black ${count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
          {count} BATCHES
        </span>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const rawStock = db.getRawMaterialStock();
  const finishedStock = db.getFinishedGoodsStock();
  const batches = db.getBatches();
  const sales = db.getSales();
  const masterSizes = db.getSizes();
  const financial = db.getFinancialSummary();
  const config = db.getSystemConfig();
  
  const totalRawWeight = useMemo(() => rawStock.reduce((acc, curr) => acc + curr.availableQty, 0), [rawStock]);
  const totalFinishedWeight = useMemo(() => finishedStock.reduce((acc, curr) => acc + curr.weightKg, 0), [finishedStock]);
  
  const totalOutstanding = financial.totalReceivables;
  
  const stageWastage = useMemo(() => {
    const completed = batches.filter(b => b.status === 'Completed');
    if (completed.length === 0) return { sealing: config.sealingWastage, cutting: config.neckCuttingWastage, total: 20 };
    
    return {
      sealing: config.sealingWastage,
      cutting: config.neckCuttingWastage,
      total: (completed.reduce((acc, curr) => acc + curr.wastagePercentage, 0) / completed.length).toFixed(1)
    };
  }, [batches, config]);

  const topSizes = useMemo(() => {
    const sizeMap: Record<string, number> = {};
    sales.forEach(s => {
      sizeMap[s.sizeId] = (sizeMap[s.sizeId] || 0) + s.weightKg;
    });
    return Object.entries(sizeMap)
      .map(([id, weight]) => ({ label: masterSizes.find(s => s.id === id)?.label || 'Unknown', weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }, [sales, masterSizes]);

  const alerts = useMemo(() => {
    const list = [];
    if (totalRawWeight < 200) list.push({ type: 'Raw Material', msg: 'Total Raw Stock critical' });
    finishedStock.forEach(s => {
        if (s.weightKg < 50) list.push({ type: 'Finished Goods', msg: `Low weight: ${s.label}` });
    });
    return list;
  }, [totalRawWeight, finishedStock]);

  const counts = useMemo(() => {
    return {
      mixing: rawStock.length > 0 ? 1 : 0,
      sealing: batches.filter(b => b.status === 'Sealing').length,
      cutting: batches.filter(b => b.status === 'Cutting').length,
      finished: batches.filter(b => b.status === 'Completed' && b.date === new Date().toISOString().split('T')[0]).length
    };
  }, [batches, rawStock]);

  const productionData = batches.filter(b => b.status === 'Completed').slice(-7).map(b => ({
    name: b.batchNo,
    input: b.totalInputKg,
    output: b.totalOutputKg,
    wastage: b.totalWastageKg
  }));

  const stockDistribution = finishedStock.map(s => ({
    name: s.label,
    value: s.weightKg
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Prince Plastic Dashboard</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Weight-Based Inventory Management (PKR)</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center space-x-2 text-xs font-black text-blue-600 shadow-sm">
             <span className="animate-blink">●</span>
             <span>KG LIVE FEED</span>
           </div>
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Manufacturing Pipeline</h3>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-blink"></div>
                <span>Work In Progress</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ProcessIndicator label="Mixing Unit" icon="🥣" status={counts.mixing > 0 ? 'idle' : 'idle'} count={counts.mixing} />
            <ProcessIndicator label="Sealing (3%)" icon="✂️" status={counts.sealing > 0 ? 'active' : 'idle'} count={counts.sealing} />
            <ProcessIndicator label="Neck Cutting (17%)" icon="🛍️" status={counts.cutting > 0 ? 'active' : 'idle'} count={counts.cutting} />
            <ProcessIndicator label="Finished Today" icon="⚖️" status={counts.finished > 0 ? 'completed' : 'idle'} count={counts.finished} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Raw Material (KG)" 
          value={`${totalRawWeight.toLocaleString()} KG`} 
          icon="📦" 
          color={totalRawWeight < 100 ? 'red' : 'blue'}
          trend={totalRawWeight < 500 ? 'REORDER' : 'OK'}
          subtitle="Inventory"
        />
        <StatsCard 
          title="Finished Stock (KG)" 
          value={`${totalFinishedWeight.toFixed(1)} KG`} 
          icon="🛍️" 
          color="green"
          trend="Usable"
          subtitle="Total Weight"
        />
        <StatsCard 
          title="Receivables" 
          value={formatPKR(totalOutstanding)} 
          icon="💰" 
          color="purple"
          trend="Outstanding"
          subtitle="A/R (PKR)"
        />
        <StatsCard 
          title="Avg Wastage %" 
          value={`${stageWastage.total}%`} 
          icon="♻️" 
          color={parseFloat(stageWastage.total.toString()) > 22 ? 'red' : 'orange'}
          trend="Cumulative"
          subtitle="Process"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">Efficiency Trend (Last 7 Batches)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}} 
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar dataKey="output" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Finished KG" barSize={20} />
                  <Bar dataKey="wastage" fill="#ef4444" radius={[6, 6, 0, 0]} name="Wastage KG" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">Stock KG Distribution</h3>
              <div className="h-64">
                 {stockDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={stockDistribution}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={90}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                          >
                             {stockDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">No Stock Recorded</div>
                 )}
              </div>
           </div>

           <div className="bg-red-500 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">System Inventory Alerts</h3>
              <div className="space-y-4">
                 {alerts.length === 0 ? (
                    <div className="flex items-center space-x-3 bg-white/10 p-4 rounded-2xl border border-white/10">
                       <span className="text-xl">✅</span>
                       <span className="text-xs font-black uppercase tracking-widest">Stock Levels Optimal</span>
                    </div>
                 ) : (
                    alerts.slice(0, 3).map((a, i) => (
                       <div key={i} className="flex items-center space-x-3 bg-white/20 p-4 rounded-2xl border border-white/20 animate-pulse">
                          <span className="text-xl">⚠️</span>
                          <div className="min-w-0">
                             <p className="text-[9px] font-black uppercase opacity-60">{a.type}</p>
                             <p className="text-xs font-black truncate">{a.msg}</p>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
