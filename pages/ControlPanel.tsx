
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
    if (window.confirm("Are you sure? This updates ALL roll targets to 20kg.")) {
      db.setAllSizesTo20kg();
      window.location.reload(); 
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-3xl text-white shadow-xl shadow-slate-100 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest relative z-10">Registry</h2>
        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] mt-1 relative z-10">Master Data & Management</p>
      </div>

      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar no-print sticky top-0 lg:relative z-20">
        {[
          { id: 'sizes', label: 'Specs', icon: '📏' },
          { id: 'vendors', label: 'Vendors', icon: '🏭' },
          { id: 'customers', label: 'Clients', icon: '🛍️' },
          { id: 'wastage', label: 'Wastage', icon: '♻️' },
          { id: 'audit', label: 'Audit', icon: '📜' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 md:px-6 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-3xl border border-slate-100 shadow-sm min-h-[400px] animate-fade-in">
          
          {/* SIZES MANAGEMENT */}
          {activeTab === 'sizes' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-widest">Roll Specs</h3>
                <button onClick={handleBulkUpdateWeight} className="w-full sm:w-auto px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest">Reset All 20KG</button>
              </div>
              <form onSubmit={handleAddSize} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-5 md:p-6 rounded-[2rem] border-2 border-slate-100">
                <div>
                   <label className="block text-[9px] font-black text-slate-500 uppercase mb-2">Label</label>
                   <input required type="text" placeholder="12x15" className="w-full border border-slate-200 p-3 rounded-xl font-bold text-xs" value={newValue} onChange={e => setNewValue(e.target.value)} />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-500 uppercase mb-2">KG/Roll</label>
                   <input required type="number" className="w-full border border-slate-200 p-3 rounded-xl font-bold text-xs" value={newWeight} onChange={e => setNewWeight(parseFloat(e.target.value))} />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-500 uppercase mb-2">Rolls</label>
                   <input required type="number" className="w-full border border-slate-200 p-3 rounded-xl font-bold text-xs" value={newRolls} onChange={e => setNewRolls(parseInt(e.target.value))} />
                </div>
                <div className="flex items-end">
                   <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] rounded-xl">+ Add Spec</button>
                </div>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {sizes.map(s => (
                  <div key={s.id} className="p-5 bg-white rounded-2xl border-2 border-slate-50 flex justify-between items-center group shadow-sm">
                    <div>
                       <span className="font-black text-slate-800 text-sm block">{s.label}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.fixedRollCount} Rolls @ {s.weightPerRollKg} KG</span>
                    </div>
                    <button onClick={() => db.deleteSize(s.id)} className="text-red-300">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VENDORS & CUSTOMERS */}
          {(activeTab === 'vendors' || activeTab === 'customers') && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{activeTab === 'vendors' ? 'Vendors' : 'Customers'}</h3>
                <button onClick={() => handleOpenPartyModal()} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-blue-100">+ Register {activeTab === 'vendors' ? 'Vendor' : 'Client'}</button>
              </div>

              {/* Mobile Card View for Parties */}
              <div className="block lg:hidden space-y-4">
                {(activeTab === 'vendors' ? vendors : customers).map(party => (
                  <div key={party.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                       <div className="max-w-[70%]">
                          <p className="font-black text-slate-800 uppercase text-xs truncate">{party.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{party.contactPerson || 'No Contact'}</p>
                       </div>
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${party.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>{party.status}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-200 pt-3">
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Opening Bal</p>
                          <p className="text-xs font-black text-blue-600">{formatPKR(party.openingBalance)}</p>
                       </div>
                       <div className="flex space-x-2">
                          <button onClick={() => handleOpenPartyModal(party)} className="p-2 text-slate-400 text-sm">✏️</button>
                          <button onClick={() => activeTab === 'vendors' ? db.deleteSupplier(party.id) : db.deleteCustomer(party.id)} className="p-2 text-red-300 text-sm">🗑️</button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-5">Entity</th>
                      <th className="p-5">Contact</th>
                      <th className="p-5 text-right">Balance</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeTab === 'vendors' ? vendors : customers).map(party => (
                      <tr key={party.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                           <div className="font-black text-slate-800 uppercase text-xs">{party.name}</div>
                           <div className="text-[9px] text-slate-400 truncate max-w-[150px]">{party.address}</div>
                        </td>
                        <td className="p-5 font-bold text-slate-600 uppercase">{party.contactPerson}</td>
                        <td className="p-5 text-right font-black text-blue-600">{formatPKR(party.openingBalance)}</td>
                        <td className="p-5 text-center">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${party.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{party.status}</span>
                        </td>
                        <td className="p-5 text-center">
                           <button onClick={() => handleOpenPartyModal(party)} className="p-2 text-slate-300 hover:text-blue-600">✏️</button>
                           <button onClick={() => activeTab === 'vendors' ? db.deleteSupplier(party.id) : db.deleteCustomer(party.id)} className="p-2 text-slate-300 hover:text-red-500">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'wastage' && (
             <div className="space-y-8 max-w-lg mx-auto">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest text-center">System Targets</h3>
               <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 md:p-8 bg-orange-50 rounded-[2rem] border border-orange-100 flex flex-col items-center">
                    <label className="block text-[10px] font-black text-orange-600 uppercase mb-4">Sealing Limit %</label>
                    <input type="number" className="w-full text-center bg-white p-4 rounded-2xl text-4xl font-black text-orange-700 outline-none" value={config.sealingWastage} onChange={e => updateWastage('sealingWastage', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="p-6 md:p-8 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col items-center">
                    <label className="block text-[10px] font-black text-red-600 uppercase mb-4">Neck Cut Limit %</label>
                    <input type="number" className="w-full text-center bg-white p-4 rounded-2xl text-4xl font-black text-red-700 outline-none" value={config.neckCuttingWastage} onChange={e => updateWastage('neckCuttingWastage', parseFloat(e.target.value) || 0)} />
                  </div>
               </div>
             </div>
          )}
          
          {activeTab === 'audit' && (
             <div className="space-y-4">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Logs</h3>
               <div className="space-y-3">
                  {logs.slice(0, 15).map(log => (
                    <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-800 uppercase">{log.action}</span>
                          <span className="text-[8px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold">{log.details}</p>
                    </div>
                  ))}
               </div>
             </div>
          )}
      </div>

      {/* PARTY MODAL - Mobile Optimized */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] p-0 sm:p-4 no-print">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up sm:animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 bg-blue-600 text-white flex justify-between items-center shrink-0">
               <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">{editingParty ? 'Update' : 'New'} Entity</h3>
               </div>
               <button onClick={() => setShowPartyModal(false)} className="text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveParty} className="p-6 md:p-10 space-y-5 overflow-y-auto custom-scrollbar flex-1">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Business Name</label>
                    <input required type="text" className="w-full border border-slate-200 p-4 rounded-xl font-black text-slate-800 text-sm outline-none" value={partyForm.name} onChange={e => setPartyForm({...partyForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Name</label>
                    <input required type="text" className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-600 text-sm outline-none" value={partyForm.contactPerson} onChange={e => setPartyForm({...partyForm, contactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                    <input required type="text" className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-600 text-sm outline-none" value={partyForm.phone} onChange={e => setPartyForm({...partyForm, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opening (₨)</label>
                    <input required type="number" className="w-full border border-slate-200 p-4 rounded-xl font-black text-blue-600 text-sm outline-none" value={partyForm.openingBalance || ''} onChange={e => setPartyForm({...partyForm, openingBalance: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                    <select className="w-full border border-slate-200 p-4 rounded-xl font-black text-slate-800 text-sm outline-none" value={partyForm.status} onChange={e => setPartyForm({...partyForm, status: e.target.value as any})}>
                       <option value="active">Active</option>
                       <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                    <textarea className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-600 text-xs outline-none h-20" value={partyForm.address} onChange={e => setPartyForm({...partyForm, address: e.target.value})} />
                  </div>
               </div>
               <div className="pt-6 sm:pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setShowPartyModal(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                  <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg">Save Record</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
