
import React from 'react';
import { db } from '../db';

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FinishedGoods: React.FC = () => {
  const stock = db.getFinishedGoodsStock();
  const masterSizes = db.getSizes();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Finished Goods Inventory (PKR)</h2>
        <div className="bg-white border rounded-lg px-4 py-2 text-sm text-slate-500 flex items-center space-x-2">
          <span>Active Sizes:</span>
          <span className="font-bold text-blue-600">{stock.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {masterSizes.map(sizeObj => {
          const item = stock.find(s => s.sizeId === sizeObj.id);
          const weight = item?.weightKg || 0;
          return (
            <div key={sizeObj.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase">{sizeObj.label}</span>
                <span className="text-2xl">⚖️</span>
              </div>
              <p className="text-3xl font-black text-slate-800 mb-1">{weight.toLocaleString(undefined, {minimumFractionDigits: 1})} KG</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Available Stock</p>
              <div className="mt-4 pt-4 border-t flex justify-between text-[10px] font-bold text-slate-400">
                <span>Cost: ₨ {item?.costPricePerKg.toLocaleString(undefined, {maximumFractionDigits: 2})}/KG</span>
                <span className="text-green-600 font-black">₨ {((item?.sellingPricePerKg || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})} SL</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Stock Ledger (₨)</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black">
              <th className="p-4">Shopper Size</th>
              <th className="p-4 text-right">Available Weight (KG)</th>
              <th className="p-4 text-right">Cost Rate / KG</th>
              <th className="p-4 text-right">Stock Valuation (₨)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stock.map((item) => (
              <tr key={item.sizeId} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{item.label}</td>
                <td className="p-4 text-right font-black text-blue-600">{item.weightKg.toFixed(2)} KG</td>
                <td className="p-4 text-right text-slate-400">₨ {item.costPricePerKg.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="p-4 text-right font-bold text-green-600">{formatPKR(item.weightKg * item.costPricePerKg)}</td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">Inventory is currently empty.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinishedGoods;
