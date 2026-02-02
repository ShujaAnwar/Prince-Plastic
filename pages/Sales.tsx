
import React, { useState } from 'react';
import { db } from '../db';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Sales: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const customers = db.getCustomers();
  const sales = db.getSales();
  const finishedStock = db.getFinishedGoodsStock();
  const masterSizes = db.getSizes();

  const [formData, setFormData] = useState({
    customerId: '',
    sizeId: masterSizes[0]?.id || '',
    weightKg: 0,
    rate: 0,
    invoiceNo: `INV-S-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stockItem = finishedStock.find(s => s.sizeId === formData.sizeId);
    if (!stockItem || stockItem.weightKg < formData.weightKg) {
      const sizeLabel = masterSizes.find(s => s.id === formData.sizeId)?.label || 'Selected size';
      alert(`Insufficient stock for ${sizeLabel}. Available: ${stockItem?.weightKg.toFixed(2) || 0} KG`);
      return;
    }

    const totalAmount = formData.weightKg * formData.rate;
    db.saveSale({
      id: crypto.randomUUID(),
      ...formData,
      totalAmount
    });

    setShowModal(false);
    setFormData({
      customerId: '',
      sizeId: masterSizes[0]?.id || '',
      weightKg: 0,
      rate: 0,
      invoiceNo: `INV-S-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Sales & Invoicing (PKR)</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition font-black uppercase tracking-widest"
        >
          + Create KG Invoice
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Sales History (₨)</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b">
              <th className="p-4">Invoice</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Item</th>
              <th className="p-4 text-right">Weight (KG)</th>
              <th className="p-4 text-right">Rate / KG</th>
              <th className="p-4 text-right">Total Amount (₨)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.slice().reverse().map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-600">{sale.invoiceNo}</td>
                <td className="p-4 text-slate-400">{sale.date}</td>
                <td className="p-4 font-bold text-slate-800">{customers.find(c => c.id === sale.customerId)?.name || 'N/A'}</td>
                <td className="p-4">
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">
                    {masterSizes.find(sz => sz.id === sale.sizeId)?.label || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-right font-black">{sale.weightKg.toFixed(2)} KG</td>
                <td className="p-4 text-right text-slate-400">₨ {sale.rate.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="p-4 text-right font-black text-blue-600">{formatPKR(sale.totalAmount)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-slate-400 italic">No sales recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">New Sales Invoice (PKR)</h3>
                <p className="text-xs text-slate-400 mt-1">Direct weight-based shopper billing</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Select Customer</label>
                  <select required className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500"
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value="">Choose...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Invoice No</label>
                  <input type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-slate-400 bg-slate-50 outline-none"
                    value={formData.invoiceNo} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Shopper Size</label>
                  <select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500"
                    value={formData.sizeId}
                    onChange={e => setFormData({...formData, sizeId: e.target.value})}>
                    {masterSizes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Weight (KG)</label>
                  <input required type="number" step="0.01" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-blue-600 outline-none"
                    value={formData.weightKg || ''}
                    onChange={e => setFormData({...formData, weightKg: parseFloat(e.target.value)})}/>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rate / KG (₨)</label>
                  <input required type="number" step="0.01" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-blue-600 outline-none"
                    value={formData.rate || ''}
                    onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})}/>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payable Total (₨)</p>
                  <p className="text-3xl font-black text-blue-600">{formatPKR(formData.weightKg * formData.rate)}</p>
                </div>
                <div className="space-x-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-400 font-bold hover:bg-slate-100 rounded-xl">Discard</button>
                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200">
                    Generate Invoice
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

export default Sales;
