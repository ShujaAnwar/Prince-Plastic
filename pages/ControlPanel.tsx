
import React, { useState } from 'react';
import { db } from '../db';
import { SystemConfig } from '../types';

const ControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sizes' | 'types' | 'colors' | 'wastage' | 'audit'>('sizes');
  const [newValue, setNewValue] = useState('');
  const [newWeight, setNewWeight] = useState(20);
  const [newRolls, setNewRolls] = useState(4);
  
  const sizes = db.getSizes();
  const types = db.getMaterialTypes();
  const colors = db.getColors();
  const logs = db.getAuditLogs();
  const config = db.getSystemConfig();

  const handleAddSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    db.saveSize(newValue, newWeight, newRolls);
    setNewValue('');
    setNewWeight(20);
    setNewRolls(4);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    db.saveMaterialType(newValue);
    setNewValue('');
  };

  const handleAddColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    db.saveColor(newValue);
    setNewValue('');
  };

  const updateWastage = (field: keyof SystemConfig, value: number) => {
    db.updateSystemConfig({ ...config, [field]: value });
  };

  const updateSizeRolls = (id: string, rolls: number) => {
    const size = sizes.find(s => s.id === id);
    if (size) {
      db.updateSize(id, size.weightPerRollKg, rolls);
    }
  };

  const handleBulkUpdateWeight = () => {
    if (window.confirm("Are you sure you want to set ALL shopper sizes to 20kg per roll?")) {
      db.setAllSizesTo20kg();
      alert("All roll weights updated to 20kg.");
      // Force refresh (this is a simple way, though state management would be better)
      window.location.reload(); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 mb-8">
        <h2 className="text-3xl font-black uppercase tracking-widest">Control Panel</h2>
        <p className="text-blue-100 font-medium">Master Data & System Configuration Management</p>
      </div>

      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm max-w-4xl overflow-x-auto custom-scrollbar">
        {[
          { id: 'sizes', label: 'Roll Sizes & Mapping', icon: '📏' },
          { id: 'types', label: 'Material Types', icon: '🧬' },
          { id: 'colors', label: 'Colors', icon: '🎨' },
          { id: 'wastage', label: 'Wastage Config', icon: '♻️' },
          { id: 'audit', label: 'Audit Trail', icon: '📜' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[500px]">
          {activeTab === 'sizes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Roll Sizing & Global Mapping</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Define how many rolls are produced for each shopper size by default.</p>
                </div>
                <button 
                  onClick={handleBulkUpdateWeight}
                  className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  Set All to 20KG
                </button>
              </div>
              
              <form onSubmit={handleAddSize} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-inner">
                <div className="col-span-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Size Label</label>
                   <input 
                    type="text" placeholder="e.g. 15x20" 
                    className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 bg-white"
                    value={newValue} onChange={e => setNewValue(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Avg KG/Roll</label>
                   <input 
                    type="number" 
                    className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 bg-white"
                    value={newWeight} onChange={e => setNewWeight(parseFloat(e.target.value))}
                  />
                </div>
                <div className="col-span-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Rolls Per Size</label>
                   <input 
                    type="number" 
                    className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 bg-white"
                    value={newRolls} onChange={e => setNewRolls(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                   <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100">+ Add Mapping</button>
                </div>
              </form>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {sizes.map(s => (
                  <div key={s.id} className="p-6 bg-white rounded-2xl border-2 border-slate-50 flex justify-between items-center group shadow-sm hover:border-blue-100 transition-all">
                    <div className="flex-1 min-w-0">
                       <span className="font-black text-slate-800 text-lg block">{s.label}</span>
                       <div className="flex items-center space-x-4 mt-2">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-slate-400 uppercase">Requirement</span>
                             <div className="flex items-center space-x-1">
                                <input 
                                  type="number" 
                                  className="w-14 text-center text-xs font-black text-blue-600 bg-blue-50 rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                                  value={s.fixedRollCount} 
                                  onChange={(e) => updateSizeRolls(s.id, parseInt(e.target.value) || 1)}
                                />
                                <span className="text-[10px] font-black text-slate-500 uppercase">Rolls</span>
                             </div>
                          </div>
                          <div className="w-px h-6 bg-slate-100"></div>
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-slate-400 uppercase">Std. Weight</span>
                             <span className="text-xs font-black text-slate-600">{s.weightPerRollKg} KG</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => { try { db.deleteSize(s.id); } catch(e:any){alert(e.message)} }} className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                      <span className="text-lg">🗑️</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'types' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">Material Categories</h3>
              <form onSubmit={handleAddType} className="flex space-x-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <input 
                  type="text" placeholder="e.g. Recycled Dana" 
                  className="flex-1 border-2 border-slate-100 p-3 rounded-xl font-bold outline-none focus:border-blue-500"
                  value={newValue} onChange={e => setNewValue(e.target.value)}
                />
                <button className="px-8 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition text-xs uppercase tracking-widest">+ Add Type</button>
              </form>
              <div className="grid grid-cols-2 gap-3 mt-8">
                {types.map(t => (
                  <div key={t.id} className="p-4 bg-white rounded-2xl border-2 border-slate-50 font-black text-slate-700 text-xs uppercase tracking-wider flex items-center shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400 mr-3"></span>
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">Color Palette</h3>
              <form onSubmit={handleAddColor} className="flex space-x-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <input 
                  type="text" placeholder="e.g. Magenta" 
                  className="flex-1 border-2 border-slate-100 p-3 rounded-xl font-bold outline-none focus:border-blue-500"
                  value={newValue} onChange={e => setNewValue(e.target.value)}
                />
                <button className="px-8 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition text-xs uppercase tracking-widest">+ Add Color</button>
              </form>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {colors.map(c => (
                  <div key={c.id} className="p-4 bg-white rounded-2xl border-2 border-slate-50 text-center font-black text-slate-700 uppercase tracking-widest text-[10px] shadow-sm hover:border-blue-200 transition-colors">{c.name}</div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wastage' && (
            <div className="space-y-8">
              <h3 className="text-xl font-black text-slate-800">Process Wastage Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 shadow-sm">
                  <label className="block text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Sealing Process Wastage (%)</label>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="number" 
                      className="w-full bg-white border-2 border-orange-200 p-4 rounded-2xl text-3xl font-black text-orange-700 outline-none shadow-inner"
                      value={config.sealingWastage}
                      onChange={e => updateWastage('sealingWastage', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-3xl font-black text-orange-300">%</span>
                  </div>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100 shadow-sm">
                  <label className="block text-xs font-black text-red-600 uppercase tracking-widest mb-4">Neck Cutting Wastage (%)</label>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="number" 
                      className="w-full bg-white border-2 border-red-200 p-4 rounded-2xl text-3xl font-black text-red-700 outline-none shadow-inner"
                      value={config.neckCuttingWastage}
                      onChange={e => updateWastage('neckCuttingWastage', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-3xl font-black text-red-300">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">System Audit Trail</h3>
              <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Time</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-4 font-black text-slate-700">{log.action}</td>
                        <td className="p-4 text-slate-500">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
          <h4 className="font-black uppercase tracking-widest text-blue-400 mb-8 border-b border-slate-800 pb-4 flex items-center">
            <span className="mr-3 text-xl">🛡️</span>
            Admin Control Rules
          </h4>
          <ul className="space-y-6 text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-wide">
            <li className="flex items-start space-x-4 group">
              <span className="text-blue-500 bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">01</span>
              <span>Roll counts per size are strictly enforced. Adding a size to production will auto-generate the mapped quantity.</span>
            </li>
            <li className="flex items-start space-x-4 group">
              <span className="text-blue-500 bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">02</span>
              <span>Process wastage (3% & 17%) is applied sequentially to track weight loss from Mixer to Finished Store.</span>
            </li>
            <li className="flex items-start space-x-4 group">
              <span className="text-blue-500 bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">03</span>
              <span>Material consumption (Dana/Color/Chem) is deducted in real-time based on the Final Mixer Load.</span>
            </li>
            <li className="flex items-start space-x-4 group">
              <span className="text-blue-500 bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">04</span>
              <span>Audit logs capture all master data changes for quality assurance and traceability.</span>
            </li>
          </ul>
          
          <div className="mt-12 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl">
             <p className="text-[10px] font-black text-blue-400 mb-2 tracking-widest">SYSTEM STATUS</p>
             <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-blink"></div>
                <span className="text-xs font-bold">ALL CONFIGURATIONS ACTIVE</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
