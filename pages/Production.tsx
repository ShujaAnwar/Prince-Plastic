
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db';
import { ConsumedMaterial, RawMaterialEntry, ProductionBatch, RollRequirement } from '../types';

interface SizeGroupManifest {
  sizeId: string;
  label: string;
  fixedCount: number;
  weightPerRollKg: number;
}

const formatPKR = (val: number) => {
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Production: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mixing' | 'sealing' | 'cutting'>('mixing');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [batches, setBatches] = useState<ProductionBatch[]>(db.getBatches());
  
  const allRawStock = db.getRawMaterials().filter(m => m.remainingQtyKg > 0);
  const masterSizes = db.getSizes();
  const suppliers = db.getSuppliers();

  const refreshBatches = () => {
    setBatches(db.getBatches());
  };

  useEffect(() => {
    refreshBatches();
  }, [activeTab]);

  const batchesInSealing = useMemo(() => batches.filter(b => b.status === 'Sealing'), [batches]);
  const batchesInCutting = useMemo(() => batches.filter(b => b.status === 'Cutting'), [batches]);

  const [selectedLots, setSelectedLots] = useState<ConsumedMaterial[]>([]);
  const [manifestGroups, setManifestGroups] = useState<SizeGroupManifest[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredMaterials = useMemo(() => {
    return allRawStock.filter(m => 
      m.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.color.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allRawStock, searchTerm]);

  const danaMaterials = filteredMaterials.filter(m => m.type.toLowerCase().includes('dana') || m.type.toLowerCase().includes('polythene'));
  const colorMaterials = filteredMaterials.filter(m => m.type.toLowerCase().includes('color'));
  const chemicalMaterials = filteredMaterials.filter(m => m.type.toLowerCase().includes('chemical'));
  const otherMaterials = filteredMaterials.filter(m => 
    !danaMaterials.includes(m) && !colorMaterials.includes(m) && !chemicalMaterials.includes(m)
  );

  const totalManifestWeight = useMemo(() => 
    manifestGroups.reduce((acc, curr) => acc + (curr.fixedCount * curr.weightPerRollKg), 0)
  , [manifestGroups]);

  const totalIngredientsWeight = useMemo(() => selectedLots.reduce((acc, curr) => acc + curr.quantityUsed, 0), [selectedLots]);
  const finalIngredientsCost = useMemo(() => selectedLots.reduce((acc, curr) => acc + (curr.quantityUsed * curr.rate), 0), [selectedLots]);
  const batchCostPerKg = totalIngredientsWeight > 0 ? finalIngredientsCost / totalIngredientsWeight : 0;
  const balanceRemaining = totalManifestWeight - totalIngredientsWeight;

  const handleAddLot = (lot: RawMaterialEntry) => {
    if (selectedLots.find(l => l.entryId === lot.id)) return;
    const suggestedQty = balanceRemaining > 0 ? Math.min(balanceRemaining, lot.remainingQtyKg) : 0;
    
    setSelectedLots([...selectedLots, {
      entryId: lot.id,
      materialName: lot.materialName,
      color: lot.color,
      quantityUsed: parseFloat(suggestedQty.toFixed(2)),
      rate: lot.ratePerKg
    }]);
  };

  const updateLotQuantity = (entryId: string, qty: number) => {
    const lotInfo = allRawStock.find(l => l.id === entryId);
    if (!lotInfo) return;
    
    if (qty > lotInfo.remainingQtyKg) {
      alert("Entered quantity exceeds available raw material stock.");
      return;
    }

    if (qty < 0 || isNaN(qty)) {
      alert("Invalid input! Please enter a valid positive quantity.");
      return;
    }
    
    setSelectedLots(selectedLots.map(l => l.entryId === entryId ? { ...l, quantityUsed: qty } : l));
  };

  const handleAddSizeToManifest = (sizeId: string) => {
    if (!sizeId) return;
    if (manifestGroups.find(g => g.sizeId === sizeId)) return;
    const size = masterSizes.find(s => s.id === sizeId);
    if (!size) return;
    setManifestGroups([...manifestGroups, {
      sizeId: size.id,
      label: size.label,
      fixedCount: size.fixedRollCount,
      weightPerRollKg: size.weightPerRollKg
    }]);
  };

  const createBatch = () => {
    if (selectedLots.length === 0 || totalIngredientsWeight <= 0) {
      alert("No available raw material selected for production.");
      return;
    }

    if (manifestGroups.length === 0) {
      alert("Please define the Roll Size Manifest first.");
      return;
    }

    if (Math.abs(balanceRemaining) > 0.1) {
      alert(`Mixing Balance Mismatch: Current mix is ${totalIngredientsWeight.toFixed(2)} KG but target is ${totalManifestWeight.toFixed(2)} KG.`);
      return;
    }

    const individualRolls: RollRequirement[] = [];
    manifestGroups.forEach(group => {
      for (let i = 0; i < group.fixedCount; i++) {
        individualRolls.push({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
          sizeId: group.sizeId,
          weightKg: group.weightPerRollKg
        });
      }
    });

    const batch: ProductionBatch = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
      batchNo: `B-${Date.now().toString().slice(-6)}`,
      date,
      consumedMaterials: selectedLots.filter(l => l.quantityUsed > 0),
      rollManifest: individualRolls,
      totalInputKg: totalIngredientsWeight,
      totalOutputKg: totalIngredientsWeight,
      totalWastageKg: 0,
      wastagePercentage: 0,
      costPerKg: batchCostPerKg,
      totalBatchCost: finalIngredientsCost,
      status: 'Sealing'
    };

    db.saveBatch(batch);
    setSelectedLots([]);
    setManifestGroups([]);
    refreshBatches();
    setActiveTab('sealing');
    alert(`Batch ${batch.batchNo} processed. Materials deducted from stock.`);
  };

  const advanceStage = (batchId: string, label: string) => {
    db.advanceBatchStage(batchId);
    refreshBatches();
    if (label === 'Sealing') setActiveTab('cutting');
  };

  const MaterialCard: React.FC<{ lot: RawMaterialEntry }> = ({ lot }) => {
    const vendor = suppliers.find(s => s.id === lot.supplierId)?.name || 'Direct Import';
    const lotValue = lot.remainingQtyKg * lot.ratePerKg;
    
    return (
      <div 
        onClick={() => handleAddLot(lot)}
        className="p-4 bg-white rounded-2xl border-2 border-slate-50 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xl group relative overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 right-0 p-1 bg-blue-50 text-blue-600 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-black px-1 uppercase tracking-tighter">Add to Mixer</span>
        </div>
        <div className="flex justify-between items-start mb-1">
          <h5 className="font-black text-slate-800 text-xs truncate pr-4">{lot.materialName}</h5>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ${lot.type.toLowerCase().includes('color') ? 'bg-orange-100 text-orange-600' : lot.type.toLowerCase().includes('chemical') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            {lot.color}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 font-bold uppercase truncate mb-3">Type: {lot.type} | Party: {vendor}</p>
        
        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-slate-50">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available Stock</p>
            <p className="text-xs font-black text-blue-600">{lot.remainingQtyKg.toFixed(1)} KG</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rate (₨)</p>
            <p className="text-xs font-black text-slate-700">₨ {lot.ratePerKg.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
          <div className="col-span-2 pt-1 border-t border-slate-50 mt-1">
             <div className="flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-slate-400 uppercase">Total Lot Value</span>
                <span className="text-[10px] font-black text-slate-800">{formatPKR(lotValue)}</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm max-w-2xl">
        {[
          { id: 'mixing', label: '1. Mixing & Rolling', icon: '🥣' },
          { id: 'sealing', label: '2. Sealing (3%)', icon: '✂️' },
          { id: 'cutting', label: '3. Neck Cutting (17%)', icon: '🛍️' }
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

      {activeTab === 'mixing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          <div className="lg:col-span-3 flex flex-col space-y-4 h-[calc(100vh-220px)] sticky top-4">
            <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-col h-full overflow-hidden">
              <div className="mb-4">
                <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">Master Lot Inventory</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search available stock..." 
                    className="w-full bg-slate-800 border border-slate-700 p-3 pl-10 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute left-3.5 top-3.5 text-slate-500">🔍</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                {danaMaterials.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 flex items-center">
                       <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span> Dana / Polythene
                    </h4>
                    <div className="space-y-3">{danaMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {colorMaterials.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 flex items-center">
                       <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span> Colors
                    </h4>
                    <div className="space-y-3">{colorMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {chemicalMaterials.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 flex items-center">
                       <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span> Chemicals
                    </h4>
                    <div className="space-y-3">{chemicalMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {otherMaterials.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 flex items-center">
                       <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-2"></span> Other Stock
                    </h4>
                    <div className="space-y-3">{otherMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {filteredMaterials.length === 0 && (
                   <div className="py-20 text-center opacity-30 italic text-xs text-white uppercase tracking-widest">Stock Empty</div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-8 pb-20">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center space-x-2">
                <span className="p-2 bg-blue-50 rounded-lg text-blue-500">🥣</span>
                <span>Step 1: Production Ingredient Mixer (₨)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedLots.length === 0 ? (
                  <div className="col-span-2 py-16 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50 flex flex-col items-center">
                    <span className="text-4xl mb-4 opacity-30">📦</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-xs mx-auto">
                      Select material lots from the inventory sidebar to begin mixing.
                    </p>
                  </div>
                ) : (
                  selectedLots.map(lot => (
                    <div key={lot.entryId} className="flex flex-col p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors relative shadow-sm">
                      <button onClick={() => setSelectedLots(selectedLots.filter(l => l.entryId !== lot.entryId))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 text-xl font-bold p-1">
                        &times;
                      </button>
                      <div className="mb-4">
                        <p className="font-black text-slate-800 text-sm truncate pr-8">{lot.materialName}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category Contribution</p>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-2 shrink-0">
                           <input 
                             type="number" step="0.01" 
                             className="w-24 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-center font-black text-blue-600 text-sm outline-none focus:border-blue-500 shadow-inner" 
                             value={lot.quantityUsed || ''} 
                             placeholder="0.00"
                             onChange={e => updateLotQuantity(lot.entryId, parseFloat(e.target.value) || 0)} 
                           />
                           <span className="text-[10px] font-black text-slate-400 uppercase">KG</span>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase">Lot Rate</p>
                           <p className="text-sm font-black text-slate-700">₨ {lot.rate.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-8 flex justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mixed weight</p>
                  <p className="text-4xl font-black text-blue-400">{totalIngredientsWeight.toFixed(2)} KG</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Cost (₨)</p>
                  <p className="text-2xl font-black text-slate-200">{formatPKR(finalIngredientsCost)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center space-x-2">
                <span className="p-2 bg-purple-50 rounded-lg text-purple-500">📏</span>
                <span>Step 2: Roll Size Manifest (Target Define)</span>
              </h3>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8 flex items-end gap-4 shadow-inner">
                 <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Select Shopper Size Mapping</label>
                    <select 
                      className="w-full border-2 border-slate-200 p-4 rounded-2xl font-black text-sm outline-none focus:border-purple-500 bg-white appearance-none"
                      onChange={e => handleAddSizeToManifest(e.target.value)}
                      value=""
                    >
                      <option value="">-- Add Size Requirement --</option>
                      {masterSizes.map(s => <option key={s.id} value={s.id}>{s.label} ({s.fixedRollCount} Rolls)</option>)}
                    </select>
                 </div>
                 <div className="p-4 bg-purple-600 text-white rounded-2xl flex flex-col items-center justify-center min-w-[140px] shadow-lg">
                    <span className="text-[9px] font-black uppercase opacity-70">Manifest Sum</span>
                    <span className="text-2xl font-black">{totalManifestWeight.toFixed(1)} KG</span>
                 </div>
              </div>

              {manifestGroups.length > 0 && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-100">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                             <th className="p-5">Size</th>
                             <th className="p-5 text-center">Qty</th>
                             <th className="p-5 text-center">KG/Roll</th>
                             <th className="p-5 text-right">Total</th>
                             <th className="p-5 text-right pr-10">Act</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {manifestGroups.map((group) => (
                             <tr key={group.sizeId}>
                                <td className="p-5 font-black text-slate-800 uppercase text-xs">{group.label}</td>
                                <td className="p-5 text-center font-bold text-slate-400">{group.fixedCount}</td>
                                <td className="p-5">
                                   <input 
                                     type="number" step="0.01" 
                                     className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-blue-600 outline-none"
                                     value={group.weightPerRollKg}
                                     onChange={(e) => {
                                       const val = parseFloat(e.target.value) || 0;
                                       setManifestGroups(manifestGroups.map(g => g.sizeId === group.sizeId ? { ...g, weightPerRollKg: val } : g));
                                     }}
                                   />
                                </td>
                                <td className="p-5 text-right font-black text-slate-700">{(group.fixedCount * group.weightPerRollKg).toFixed(1)} KG</td>
                                <td className="p-5 text-right pr-10">
                                   <button onClick={() => setManifestGroups(manifestGroups.filter(g => g.sizeId !== group.sizeId))} className="text-red-300 hover:text-red-500 transition-colors">🗑️</button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-12 flex flex-col items-center border-t pt-8">
                 <button 
                  onClick={createBatch}
                  className="px-24 py-7 bg-blue-600 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl hover:bg-blue-700 transition-all text-sm"
                 >
                   Finalize Mixing & Deduct Stock
                 </button>
                 <p className="mt-4 text-[10px] font-black text-slate-300 uppercase italic">Stock levels update instantly upon clicking</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sealing' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {batchesInSealing.length === 0 ? (
            <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-slate-300 uppercase font-black text-xs tracking-[0.3em]">No batches awaiting sealing</div>
          ) : (
            batchesInSealing.map(batch => (
              <div key={batch.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-md">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl">✂️</div>
                      <div>
                         <p className="text-2xl font-black text-slate-800 tracking-tight">{batch.batchNo}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight: {batch.totalOutputKg.toFixed(1)} KG</p>
                      </div>
                   </div>
                   <button onClick={() => advanceStage(batch.id, 'Sealing')} className="px-12 py-5 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-orange-600 transition-all text-xs">
                     Finish Sealing (3%)
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'cutting' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {batchesInCutting.length === 0 ? (
            <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-slate-300 uppercase font-black text-xs tracking-[0.3em]">No batches awaiting cutting</div>
          ) : (
            batchesInCutting.map(batch => (
              <div key={batch.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-md">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">🛍️</div>
                      <div>
                         <p className="text-2xl font-black text-slate-800 tracking-tight">{batch.batchNo}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight: {batch.totalOutputKg.toFixed(1)} KG</p>
                      </div>
                   </div>
                   <button onClick={() => advanceStage(batch.id, 'Neck Cutting')} className="px-12 py-5 bg-green-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-green-700 transition-all text-xs">
                     Finish Cutting (17%)
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Production;
