
import React, { useState } from 'react';
import { db } from '../db';
import { Supplier, Customer, PartyType, LedgerEntry } from '../types';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Parties: React.FC = () => {
  const [activeType, setActiveType] = useState<PartyType>(PartyType.SUPPLIER);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Supplier | Customer | null>(null);
  const [selectedLedgerPartyId, setSelectedLedgerPartyId] = useState<string | null>(null);
  
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const list = activeType === PartyType.SUPPLIER ? suppliers : customers;
  const ledger = db.getLedger();

  const [formData, setFormData] = useState({ name: '', contact: '', openingBalance: 0 });
  const [paymentData, setPaymentData] = useState({ amount: 0, reference: '', date: new Date().toISOString().split('T')[0] });

  const handleEdit = (party: Supplier | Customer) => {
    setEditingParty(party);
    // Fix: Using phone as contact property does not exist on Supplier/Customer
    setFormData({ name: party.name, contact: party.phone, openingBalance: party.openingBalance });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParty) {
      if (activeType === PartyType.SUPPLIER) {
        // Fix: Map formData.contact to phone and ensure interface compatibility
        db.updateSupplier({ ...editingParty, ...formData, phone: formData.contact } as Supplier);
      } else {
        // Fix: Map formData.contact to phone and ensure interface compatibility
        db.updateCustomer({ ...editingParty, ...formData, phone: formData.contact } as Customer);
      }
    } else {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      if (activeType === PartyType.SUPPLIER) {
        // Fix: Map formData.contact to phone and provide default values for missing required interface properties
        db.saveSupplier({ id, name: formData.name, openingBalance: formData.openingBalance, phone: formData.contact, contactPerson: '', email: '', address: '', status: 'active' } as Supplier);
      } else {
        // Fix: Map formData.contact to phone and provide default values for missing required interface properties
        db.saveCustomer({ id, name: formData.name, openingBalance: formData.openingBalance, phone: formData.contact, contactPerson: '', email: '', address: '', status: 'active' } as Customer);
      }
    }
    setShowModal(false);
    setEditingParty(null);
    setFormData({ name: '', contact: '', openingBalance: 0 });
  };

  const handlePostPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerPartyId) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    const entry: LedgerEntry = {
      id,
      partyType: activeType,
      partyId: selectedLedgerPartyId,
      debit: activeType === PartyType.SUPPLIER ? paymentData.amount : 0,
      credit: activeType === PartyType.CUSTOMER ? paymentData.amount : 0,
      balance: 0,
      reference: `Payment: ${paymentData.reference}`,
      date: paymentData.date
    };
    db.saveLedgerEntry(entry);
    setShowPaymentModal(false);
    setPaymentData({ amount: 0, reference: '', date: new Date().toISOString().split('T')[0] });
  };

  const getPartyLedger = (partyId: string) => {
    const entries = ledger.filter(l => l.partyId === partyId);
    let runningBalance = list.find(p => p.id === partyId)?.openingBalance || 0;
    
    return entries.map(entry => {
      if (activeType === PartyType.CUSTOMER) {
        runningBalance = runningBalance + entry.debit - entry.credit;
      } else {
        runningBalance = runningBalance + entry.credit - entry.debit;
      }
      return { ...entry, runningBalance };
    });
  };

  const selectedParty = list.find(p => p.id === selectedLedgerPartyId);
  const partyLedgerEntries = selectedLedgerPartyId ? getPartyLedger(selectedLedgerPartyId) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">Advanced Ledger Center (PKR)</h2>
          <div className="bg-white rounded-lg p-1 border flex">
             <button onClick={() => { setActiveType(PartyType.SUPPLIER); setSelectedLedgerPartyId(null); }}
              className={`px-4 py-1 rounded-md text-[10px] font-black uppercase transition ${activeType === PartyType.SUPPLIER ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
             >Suppliers</button>
             <button onClick={() => { setActiveType(PartyType.CUSTOMER); setSelectedLedgerPartyId(null); }}
              className={`px-4 py-1 rounded-md text-[10px] font-black uppercase transition ${activeType === PartyType.CUSTOMER ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
             >Customers</button>
          </div>
        </div>
        <button onClick={() => { setEditingParty(null); setShowModal(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition font-black uppercase tracking-widest shadow-lg shadow-blue-100"
        >
          + Add {activeType === PartyType.SUPPLIER ? 'Vendor' : 'Customer'}
        </button>
      </div>

      {!selectedLedgerPartyId ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b">
                <th className="p-4">Party Details</th>
                <th className="p-4 text-right">Opening Bal.</th>
                <th className="p-4 text-right">Net Position (₨)</th>
                <th className="p-4 text-right">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic opacity-40">No records found</td></tr>
              ) : (
                list.map(party => {
                  const pLedger = getPartyLedger(party.id);
                  const closingBal = pLedger.length > 0 ? pLedger[pLedger.length - 1].runningBalance : party.openingBalance;
                  return (
                    <tr key={party.id} className="hover:bg-slate-50 transition group">
                      <td className="p-4">
                         <div className="font-black text-slate-800 uppercase text-xs">{party.name}</div>
                         {/* Fix: Using phone property as contact does not exist on Supplier/Customer */}
                         <div className="text-[10px] text-slate-400 font-bold">{party.phone}</div>
                      </td>
                      <td className="p-4 text-right text-slate-500 font-bold">₨ {party.openingBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="p-4 text-right font-black text-blue-600">{formatPKR(closingBal)}</td>
                      <td className="p-4 text-right">
                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${closingBal > 0 ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                           {closingBal > 0 ? 'Outstanding' : 'Cleared'}
                         </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => setSelectedLedgerPartyId(party.id)} className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Open Ledger</button>
                        <button onClick={() => handleEdit(party)} className="p-2 text-slate-300 hover:text-blue-600">✏️</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex justify-between items-center shadow-xl">
             <div className="space-y-2">
                <button onClick={() => setSelectedLedgerPartyId(null)} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center group">
                  <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Return to List
                </button>
                <h3 className="text-4xl font-black tracking-tighter">{selectedParty?.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Statement of Account (PKR) - {activeType}</p>
             </div>
             <div className="text-right flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Final Balance Due</p>
                <p className="text-5xl font-black text-blue-400">{formatPKR(partyLedgerEntries[partyLedgerEntries.length - 1]?.runningBalance || selectedParty?.openingBalance || 0)}</p>
                <button onClick={() => setShowPaymentModal(true)} className="mt-6 px-8 py-3 bg-white text-slate-900 font-black uppercase tracking-[0.2em] rounded-2xl text-[10px] hover:bg-blue-500 hover:text-white transition-all">Record Payment</button>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b">
                      <th className="p-5">Date</th>
                      <th className="p-5">Reference</th>
                      <th className="p-5 text-right">Debit (-)</th>
                      <th className="p-5 text-right">Credit (+)</th>
                      <th className="p-5 text-right bg-slate-50/50">Balance (₨)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                   <tr className="bg-slate-50/30">
                      <td className="p-5 text-slate-400 italic">Historical</td>
                      <td className="p-5 font-black text-slate-400 uppercase text-[9px]">Opening Balance Allocation</td>
                      <td className="p-5 text-right">-</td>
                      <td className="p-5 text-right">-</td>
                      <td className="p-5 text-right font-black bg-slate-50/50">{formatPKR(selectedParty?.openingBalance || 0)}</td>
                   </tr>
                   {partyLedgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5 text-slate-400">{entry.date}</td>
                         <td className="p-5">
                            <div className="font-black text-slate-800">{entry.reference}</div>
                         </td>
                         <td className="p-5 text-right text-red-500">{entry.debit > 0 ? formatPKR(entry.debit) : '-'}</td>
                         <td className="p-5 text-right text-green-600">{entry.credit > 0 ? formatPKR(entry.credit) : '-'}</td>
                         <td className="p-5 text-right font-black text-blue-600 bg-slate-50/50">{formatPKR(entry.runningBalance)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-widest">{editingParty ? 'Edit' : 'Add New'} {activeType}</h3>
              <button onClick={() => setShowModal(false)} className="text-4xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Company Name</label>
                <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Info</label>
                <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.contact}
                  onChange={e => setFormData({...formData, contact: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Opening Balance (₨)</label>
                <input required type="number" step="0.01" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-black text-blue-600" value={formData.openingBalance || ''}
                  onChange={e => setFormData({...formData, openingBalance: parseFloat(e.target.value)})} />
              </div>
              <div className="pt-8 flex justify-end">
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition">
                  {editingParty ? 'Update Registration' : 'Register Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-widest">Record Payment (PKR)</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-4xl">&times;</button>
            </div>
            <form onSubmit={handlePostPayment} className="p-10 space-y-6">
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Party Name</p>
                  <p className="text-sm font-black text-blue-900">{selectedParty?.name}</p>
               </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Payment Amount (₨)</label>
                <input required type="number" step="0.01" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-black text-blue-600 text-2xl" value={paymentData.amount || ''}
                  onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cheque / Slip / Ref</label>
                <input required type="text" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold" value={paymentData.reference}
                  onChange={e => setPaymentData({...paymentData, reference: e.target.value})} placeholder="e.g. Bank Transfer 5029" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Transaction Date</label>
                <input required type="date" className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold" value={paymentData.date}
                  onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
              </div>
              <div className="pt-8">
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition">
                  Confirm Ledger Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;
