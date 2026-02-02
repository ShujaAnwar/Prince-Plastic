
import React, { useState } from 'react';
import { db } from '../db';
import { SystemConfig, Supplier, Customer, EntityStatus } from '../types';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sizes' | 'vendors' | 'customers' | 'types' | 'colors' | 'wastage' | 'audit'>('sizes');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Supplier | Customer | null>(null);
  
  const [newValue, setNewValue] = useState('');
  const [newWeight, setNewWeight] = useState(20);
  const [newRolls, setNewRolls] = useState(4);
  
  const sizes = db.getSizes();
  const types = db.getMaterialTypes();
  const colors = db.getColors();
  const logs = db.getAuditLogs();
  const config = db.getSystemConfig();
  const vendors = db.getSuppliers();
  const customers = db.getCustomers();

  const [partyForm, setPartyForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: 0,
    status: 'active' as EntityStatus
  });

  const handleOpenPartyModal = (party?: Supplier | Customer) => {
    if (party) {
      setEditingParty(party);
      setPartyForm({
        name: party.name,
        contactPerson: party.contactPerson,
        phone: party.phone,
        email: party.email,
        address: party.address,
        openingBalance: party.openingBalance,
        status: party.status
      });
    } else {
      setEditingParty(null);
      setPartyForm({
        name: '', contactPerson: '', phone: '', email: '', address: '', openingBalance: 0, status: 'active'
      });
    }
    setShowPartyModal(true);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'vendors') {
      if (editingParty) db.updateSupplier({ ...editingParty, ...partyForm } as Supplier);
      else db.saveSupplier({ id: crypto.randomUUID(), ...partyForm } as Supplier);
    } else {
      if (editingParty) db.updateCustomer({ ...editingParty, ...partyForm } as Customer);
      else db.saveCustomer({ id: crypto.randomUUID(), ...partyForm } as Customer);
    }
    setShowPartyModal(false);
  };

  const handleAddSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    db.saveSize(newValue, newWeight, newRolls);
    setNewValue('');
    setNewWeight(20);
    setNewRolls(4);
  };

  const updateWastage = (field: keyof SystemConfig, value: number) => {
    db.updateSystemConfig({ ...config, [field]: value });
  };

  const handleBulkUpdateWeight = () => {
    if (window.confirm("Are you sure you want to set ALL shopper sizes to 20kg per roll?")) {
      db.setAllSizesTo20kg();
      alert("All roll weights updated to 20kg.");
      window.location.reload(); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
        <h2 className="text-3xl font-black uppercase tracking-widest relative z-10">Control Panel</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 relative z-10">Manufacturing Master Data & Registry Management</p>
      </div>

      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm max-w-full overflow-x-auto custom-scrollbar">
        {[
          { id: 'sizes', label: 'Roll Specs', icon: '📏' },
          { id: 'vendors', label: 'Vendors', icon: '🏭' },
          { id: 'customers', label: 'Customers', icon: '🛍️' },
          { id: 'types', label: 'Mat Categories', icon: '🧬' },
          { id: 'colors', label: 'Colors', icon: '🎨' },
          { id: 'wastage', label: 'Wastage', icon: '♻️' },
          { id: 'audit', label: 'Audit', icon: '📜' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
        <div className="lg:col-span-12 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[500px]">
          
          {/* SIZES MANAGEMENT */}
          {activeTab === 'sizes' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Roll Specs & Sizing</h3>
                <button onClick={handleBulkUpdateWeight} className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Reset All to 20KG</button>
              </div>
              <form onSubmit={handleAddSize} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Size Label</label>
                   <input required type="text" placeholder="e.g. 12x15" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newValue} onChange={e => setNewValue(e.target.value)} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Avg KG/Roll</label>
                   <input required type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newWeight} onChange={e => setNewWeight(parseFloat(e.target.value))} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Default Rolls</label>
                   <input required type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newRolls} onChange={e => setNewRolls(parseInt(e.target.value))} />
                </div>
                <div className="flex items-end">
                   <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100">+ Add Mapping</button>
                </div>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {sizes.map(s => (
                  <div key={s.id} className="p-6 bg-white rounded-2xl border-2 border-slate-50 flex justify-between items-center group shadow-sm hover:border-blue-100 transition-all">
                    <div>
                       <span className="font-black text-slate-800 text-lg block">{s.label}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.fixedRollCount} Rolls @ {s.weightPerRollKg} KG</span>
                    </div>
                    <button onClick={() => db.deleteSize(s.id)} className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VENDORS & CUSTOMERS */}
          {(activeTab === 'vendors' || activeTab === 'customers') && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">{activeTab === 'vendors' ? 'Vendor Management' : 'Customer Registry'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage master {activeTab} data for accounting and production</p>
                </div>
                <button onClick={() => handleOpenPartyModal()} className="px-6 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100">+ Register {activeTab === 'vendors' ? 'Vendor' : 'Customer'}</button>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-5">Entity Details</th>
                      <th className="p-5">Contact Person</th>
                      <th className="p-5">Contact Info</th>
                      <th className="p-5 text-right">Opening Bal. (₨)</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeTab === 'vendors' ? vendors : customers).map(party => (
                      <tr key={party.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                           <div className="font-black text-slate-800 uppercase text-sm">{party.name}</div>
                           <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{party.address || 'No address provided'}</div>
                        </td>
                        <td className="p-5 font-bold text-slate-600 uppercase">{party.contactPerson || 'N/A'}</td>
                        <td className="p-5">
                           <div className="font-bold text-slate-800">{party.phone || 'N/A'}</div>
                           <div className="text-[10px] text-slate-400 lowercase">{party.email || 'No email'}</div>
                        </td>
                        <td className="p-5 text-right font-black text-blue-600">{formatPKR(party.openingBalance)}</td>
                        <td className="p-5 text-center">
                           <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${party.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                             {party.status}
                           </span>
                        </td>
                        <td className="p-5 text-center space-x-2">
                           <button onClick={() => handleOpenPartyModal(party)} className="p-2 text-slate-300 hover:text-blue-600">✏️</button>
                           <button 
                             onClick={() => {
                               if (window.confirm(`Are you sure? Parties with transactions will be deactivated instead of deleted.`)) {
                                 activeTab === 'vendors' ? db.deleteSupplier(party.id) : db.deleteCustomer(party.id);
                               }
                             }} 
                             className="p-2 text-slate-300 hover:text-red-500"
                           >🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WASTAGE & AUDIT (Simplified for brevity as already in baseline) */}
          {activeTab === 'wastage' && (
             <div className="space-y-8 max-w-2xl">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Process Settings</h3>
               <div className="grid grid-cols-2 gap-8">
                  <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100">
                    <label className="block text-[10px] font-black text-orange-600 uppercase mb-4 tracking-widest">Sealing (Target 3%)</label>
                    <input type="number" className="w-full bg-white p-4 rounded-2xl text-4xl font-black text-orange-700 outline-none" value={config.sealingWastage} onChange={e => updateWastage('sealingWastage', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="p-8 bg-red-50 rounded-3xl border border-red-100">
                    <label className="block text-[10px] font-black text-red-600 uppercase mb-4 tracking-widest">Cutting (Target 17%)</label>
                    <input type="number" className="w-full bg-white p-4 rounded-2xl text-4xl font-black text-red-700 outline-none" value={config.neckCuttingWastage} onChange={e => updateWastage('neckCuttingWastage', parseFloat(e.target.value) || 0)} />
                  </div>
               </div>
             </div>
          )}
          
          {activeTab === 'audit' && (
             <div className="space-y-6">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">System Audit Log</h3>
               <div className="overflow-hidden rounded-3xl border border-slate-100">
                 <table className="w-full text-left text-[10px]">
                   <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                     <tr><th className="p-4">Time</th><th className="p-4">Action</th><th className="p-4">Details</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {logs.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50">
                         <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                         <td className="p-4 font-black text-slate-800 uppercase">{log.action}</td>
                         <td className="p-4 text-slate-500">{log.details}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* PARTY MODAL */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{editingParty ? 'Update' : 'Register New'} {activeTab === 'vendors' ? 'Vendor' : 'Customer'}</h3>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Master entity registry form</p>
               </div>
               <button onClick={() => setShowPartyModal(false)} className="text-5xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveParty} className="p-10 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company / Business Name</label>
                    <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-800 outline-none focus:border-blue-500" value={partyForm.name} onChange={e => setPartyForm({...partyForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Person</label>
                    <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-600 outline-none focus:border-blue-500" value={partyForm.contactPerson} onChange={e => setPartyForm({...partyForm, contactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                    <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-600 outline-none focus:border-blue-500" value={partyForm.phone} onChange={e => setPartyForm({...partyForm, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                    <input type="email" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-600 outline-none focus:border-blue-500" value={partyForm.email} onChange={e => setPartyForm({...partyForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Balance (₨)</label>
                    <input required type="number" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-blue-600 outline-none focus:border-blue-500" value={partyForm.openingBalance || ''} onChange={e => setPartyForm({...partyForm, openingBalance: parseFloat(e.target.value)})} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Physical Address</label>
                    <textarea className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-600 outline-none focus:border-blue-500 h-24" value={partyForm.address} onChange={e => setPartyForm({...partyForm, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Status</label>
                    <select className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-800 outline-none focus:border-blue-500" value={partyForm.status} onChange={e => setPartyForm({...partyForm, status: e.target.value as any})}>
                       <option value="active">Active</option>
                       <option value="inactive">Inactive</option>
                    </select>
                  </div>
               </div>
               <div className="pt-8 border-t border-slate-50 flex justify-end space-x-4">
                  <button type="button" onClick={() => setShowPartyModal(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Discard</button>
                  <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100">Finalize Registry</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
