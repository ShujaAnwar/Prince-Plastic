
import React, { useState } from 'react';
import { db } from '../db';
import { RawMaterialEntry } from '../types';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const RawMaterials: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RawMaterialEntry | null>(null);
  
  const suppliers = db.getSuppliers();
  const stock = db.getRawMaterialStock();
  const entries = db.getRawMaterials();
  const colors = db.getColors();
  const types = db.getMaterialTypes();

  const [formData, setFormData] = useState({
    materialName: '',
    type: '',
    color: '',
    quantityKg: 0,
    ratePerKg: 0,
    supplierId: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    if (!editingEntry && types.length > 0 && !formData.type) {
      setFormData(prev => ({ ...prev, type: types[0].name, color: colors[0]?.name || '' }));
    }
  }, [types, colors, editingEntry]);

  const handleEdit = (entry: RawMaterialEntry) => {
    setEditingEntry(entry);
    setFormData({
      materialName: entry.materialName,
      type: entry.type,
      color: entry.color,
      quantityKg: entry.quantityKg,
      ratePerKg: entry.ratePerKg,
      supplierId: entry.supplierId,
      invoiceNo: entry.invoiceNo,
      date: entry.date
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("CAUTION: Deleting this purchase will remove its stock and reverse the supplier ledger entry. Continue?")) return;
    try {
      db.deleteRawMaterial(id);
      alert("Lot removed from inventory.");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const validateInputs = () => {
    if (formData.quantityKg <= 0 || isNaN(formData.quantityKg)) {
      alert("Invalid input! Please enter a valid quantity greater than zero.");
      return false;
    }
    if (formData.ratePerKg <= 0 || isNaN(formData.ratePerKg)) {
      alert("Invalid input! Please enter a valid rate greater than zero.");
      return false;
    }
    if (!formData.supplierId) {
      alert("Please select a supplier.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    try {
      const totalCost = formData.quantityKg * formData.ratePerKg;
      if (editingEntry) {
        db.updateRawMaterial({ ...editingEntry, ...formData, totalCost });
      } else {
        const entry: RawMaterialEntry = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
          ...formData,
          remainingQtyKg: formData.quantityKg,
          totalCost
        };
        db.saveRawMaterial(entry);
      }
      setShowAddModal(false);
      setEditingEntry(null);
      setFormData({
        materialName: '', type: types[0]?.name || '', color: colors[0]?.name || '',
        quantityKg: 0, ratePerKg: 0, supplierId: '', invoiceNo: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Inventory & Purchase Ledger (PKR)</h2>
        <button 
          onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center space-x-2 font-black uppercase tracking-widest shadow-lg shadow-blue-100"
        >
          <span>➕</span>
          <span>Inward Raw Material</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Purchase Records (₨)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b">
                  <th className="p-4">Date</th>
                  <th className="p-4">Material Details</th>
                  <th className="p-4 text-right">Qty (KG)</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4 text-right">Total Amount (₨)</th>
                  <th className="p-4 text-right">Stock Left</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400">No purchase records found</td></tr>
                ) : (
                  entries.slice().reverse().map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 group">
                      <td className="p-4 text-slate-500 whitespace-nowrap font-medium">{entry.date}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{entry.materialName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Type: {entry.type} | Color: {entry.color}</div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-700">{entry.quantityKg.toLocaleString()}</td>
                      <td className="p-4 text-right text-slate-500 font-bold">₨ {entry.ratePerKg.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="p-4 text-right">
                        <span className="font-black text-blue-600">{formatPKR(entry.totalCost)}</span>
                      </td>
                      <td className="p-4 text-right">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${entry.remainingQtyKg === 0 ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-700'}`}>
                           {entry.remainingQtyKg.toLocaleString()} KG
                         </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center space-x-2">
                           <button onClick={() => handleEdit(entry)} className="p-2 text-slate-300 hover:text-blue-600 transition hover:bg-blue-50 rounded-lg">✏️</button>
                           <button onClick={() => handleDelete(entry.id)} className="p-2 text-slate-300 hover:text-red-500 transition hover:bg-red-50 rounded-lg">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 h-fit">
          <div className="bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden text-white">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h3 className="font-black text-blue-400 uppercase text-xs tracking-widest">Global Stock Summary</h3>
            </div>
            <div className="p-6 space-y-4">
              {stock.length === 0 ? (
                <div className="py-10 text-center opacity-40 italic text-xs">Warehouse empty</div>
              ) : (
                stock.map((item) => (
                  <div key={`${item.materialName}-${item.color}`} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all">
                    <div>
                      <p className="font-black text-sm text-slate-100">{item.materialName}</p>
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{item.color}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-400">{item.availableQty.toFixed(1)} <span className="text-xs">KG</span></p>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Val: {formatPKR(item.availableQty * item.avgRate)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4">Inventory Insights</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Total Inventory Value</span>
                   <span className="text-sm font-black text-slate-800">{formatPKR(stock.reduce((a,b) => a + (b.availableQty * b.avgRate), 0))}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Unique Material Lots</span>
                   <span className="text-sm font-black text-slate-800">{entries.filter(e => e.remainingQtyKg > 0).length}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingEntry ? 'Update Purchase Lot' : 'New Inward Entry'}</h3>
                <p className="text-xs text-blue-100 font-bold opacity-70 mt-1">Raw material purchase ledger registration (PKR)</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-4xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Material Name</label>
                  <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 font-bold outline-none" value={formData.materialName}
                    onChange={e => setFormData({...formData, materialName: e.target.value})} placeholder="e.g. PP Dana" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category Type</label>
                  <select required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 appearance-none bg-white" value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}>
                    {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Color</label>
                  <select required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 appearance-none bg-white" value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}>
                    {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Quantity (KG)</label>
                  <input required type="number" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-blue-600 outline-none focus:border-blue-500" value={formData.quantityKg || ''}
                    onChange={e => setFormData({...formData, quantityKg: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rate / KG (₨)</label>
                  <input required type="number" step="0.01" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-blue-600 outline-none focus:border-blue-500" value={formData.ratePerKg || ''}
                    onChange={e => setFormData({...formData, ratePerKg: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selected Supplier</label>
                <select required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 appearance-none bg-white" value={formData.supplierId}
                  onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                  <option value="">-- Choose Party --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Invoice / Ref No</label>
                  <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500" value={formData.invoiceNo}
                    onChange={e => setFormData({...formData, invoiceNo: e.target.value})} placeholder="INV-000" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Inward Date</label>
                  <input required type="date" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500" value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bill Amount (₨)</p>
                  <p className="text-3xl font-black text-blue-600">{formatPKR(formData.quantityKg * formData.ratePerKg)}</p>
                </div>
                <div className="flex space-x-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-2xl transition">Discard</button>
                  <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition">
                    Finalize Entry
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterials;
