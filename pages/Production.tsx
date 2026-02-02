
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
  const [showInventory, setShowInventory] = useState(false);
  
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
    if (window.innerWidth < 1024) setShowInventory(false);
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
          id: crypto.randomUUID(),
          sizeId: group.sizeId,
          weightKg: group.weightPerRollKg
        });
      }
    });

    const batch: ProductionBatch = {
      id: crypto.randomUUID(),
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
        <div className="absolute top-0 right-0 p-1 bg-blue-50 text-blue-600 rounded-bl-xl lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-black px-1 uppercase tracking-tighter">Add to Mixer</span>
        </div>
        <div className="flex justify-between items-start mb-1">
          <h5 className="font-black text-slate-800 text-xs truncate pr-4">{lot.materialName}</h5>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ${lot.type.toLowerCase().includes('color') ? 'bg-orange-100 text-orange-600' : lot.type.toLowerCase().includes('chemical') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            {lot.color}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 font-bold uppercase truncate mb-3">Party: {vendor}</p>
        
        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-slate-50">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Stock</p>
            <p className="text-xs font-black text-blue-600">{lot.remainingQtyKg.toFixed(1)} KG</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rate (₨)</p>
            <p className="text-xs font-black text-slate-700">₨ {lot.ratePerKg.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Mobile Sticky Tab Bar */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm max-w-full overflow-x-auto custom-scrollbar no-print sticky top-0 lg:relative z-20">
        {[
          { id: 'mixing', label: '1. Mixing', icon: '🥣' },
          { id: 'sealing', label: '2. Sealing', icon: '✂️' },
          { id: 'cutting', label: '3. Cutting', icon: '🛍️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-3 md:px-6 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split('.')[1]}</span>
          </button>
        ))}
      </div>

      {activeTab === 'mixing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-fade-in relative">
          
          {/* Mobile Inventory Toggle */}
          <button 
            onClick={() => setShowInventory(!showInventory)}
            className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl z-50 animate-bounce"
          >
            {showInventory ? '✕' : '📦'}
          </button>

          {/* Lot Inventory - Hidden on mobile by default */}
          <div className={`
            lg:col-span-3 lg:block
            ${showInventory ? 'fixed inset-0 z-[100] bg-slate-900 p-6 pt-20' : 'hidden'}
            lg:relative lg:inset-auto lg:p-0 lg:h-[calc(100vh-220px)] lg:sticky lg:top-4
          `}>
            {showInventory && (
              <button 
                onClick={() => setShowInventory(false)}
                className="lg:hidden absolute top-6 right-6 text-white text-3xl"
              >✕</button>
            )}
            <div className="bg-slate-900 p-5 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-col h-full overflow-hidden">
              <div className="mb-4">
                <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">Inventory</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Stock search..." 
                    className="w-full bg-slate-800 border border-slate-700 p-3 pl-10 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute left-3.5 top-3.5 text-slate-500 text-xs">🔍</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {danaMaterials.length > 0 && (
                  <div>
                    <h4 className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center">
                       <span className="w-1 h-1 bg-blue-500 rounded-full mr-1"></span> Dana
                    </h4>
                    <div className="space-y-3">{danaMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {colorMaterials.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-2 flex items-center">
                       <span className="w-1 h-1 bg-orange-500 rounded-full mr-1"></span> Colors
                    </h4>
                    <div className="space-y-3">{colorMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
                {chemicalMaterials.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-2 flex items-center">
                       <span className="w-1 h-1 bg-purple-500 rounded-full mr-1"></span> Chemicals
                    </h4>
                    <div className="space-y-3">{chemicalMaterials.map(m => <MaterialCard key={m.id} lot={m} />)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6 md:space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-widest mb-6 flex items-center space-x-2">
                <span className="p-2 bg-blue-50 rounded-lg text-blue-500">🥣</span>
                <span>Production Mixer</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedLots.length === 0 ? (
                  <div className="col-span-full py-12 md:py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50 flex flex-col items-center">
                    <span className="text-3xl mb-4 opacity-30">📦</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] max-w-[180px] md:max-w-xs mx-auto">
                      Select materials from inventory {window.innerWidth < 1024 ? '(tap the box icon)' : 'sidebar'} to begin mixing.
                    </p>
                  </div>
                ) : (
                  selectedLots.map(lot => (
                    <div key={lot.entryId} className="flex flex-col p-4 bg-slate-50 rounded-[2rem] border border-slate-100 relative shadow-sm">
                      <button onClick={() => setSelectedLots(selectedLots.filter(l => l.entryId !== lot.entryId))} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 text-lg font-bold">
                        ✕
                      </button>
                      <div className="mb-3">
                        <p className="font-black text-slate-800 text-xs truncate pr-6">{lot.materialName}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{lot.color}</p>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                        <input 
                           type="number" step="0.01" 
                           className="w-20 p-2 bg-slate-50 border border-slate-100 rounded-lg text-center font-black text-blue-600 text-xs outline-none focus:border-blue-500" 
                           value={lot.quantityUsed || ''} 
                           onChange={e => updateLotQuantity(lot.entryId, parseFloat(e.target.value) || 0)} 
                        />
                        <div className="text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Amount</p>
                           <p className="text-[10px] font-black text-slate-700">₨ {lot.rate.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 md:mt-8 flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white gap-4">
                <div className="text-center md:text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mixed weight</p>
                  <p className="text-3xl md:text-4xl font-black text-blue-400">{totalIngredientsWeight.toFixed(2)} KG</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Batch Cost (₨)</p>
                  <p className="text-xl md:text-2xl font-black text-slate-200">{formatPKR(finalIngredientsCost)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm relative">
              <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-widest mb-6 flex items-center space-x-2">
                <span className="p-2 bg-purple-50 rounded-lg text-purple-500">📏</span>
                <span>Roll Size Manifest</span>
              </h3>
              <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border border-slate-100 mb-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                 <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Select Target Size Mapping</label>
                    <select 
                      className="w-full border border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm outline-none focus:border-purple-500 bg-white"
                      onChange={e => handleAddSizeToManifest(e.target.value)}
                      value=""
                    >
                      <option value="">-- Add Size --</option>
                      {masterSizes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                 </div>
                 <div className="p-4 bg-purple-600 text-white rounded-xl md:rounded-2xl flex flex-row sm:flex-col items-center justify-between sm:justify-center min-w-[120px]">
                    <span className="text-[8px] md:text-[9px] font-black uppercase opacity-70">Manifest</span>
                    <span className="text-xl md:text-2xl font-black">{totalManifestWeight.toFixed(1)} KG</span>
                 </div>
              </div>

              {manifestGroups.length > 0 && (
                <div className="space-y-3 md:space-y-4">
                  {/* Card view for mobile sizes */}
                  <div className="block lg:hidden space-y-3">
                    {manifestGroups.map(group => (
                       <div key={group.sizeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div>
                             <p className="font-black text-slate-800 text-xs uppercase">{group.label}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{group.fixedCount} Rolls</p>
                          </div>
                          <div className="flex items-center space-x-4">
                             <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase">KG/Roll</p>
                                <input 
                                  type="number" step="0.01" 
                                  className="w-16 p-1 bg-white border border-slate-200 rounded text-center font-black text-blue-600 text-xs outline-none"
                                  value={group.weightPerRollKg}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setManifestGroups(manifestGroups.map(g => g.sizeId === group.sizeId ? { ...g, weightPerRollKg: val } : g));
                                  }}
                                />
                             </div>
                             <button onClick={() => setManifestGroups(manifestGroups.filter(g => g.sizeId !== group.sizeId))} className="text-red-400">✕</button>
                          </div>
                       </div>
                    ))}
                  </div>
                  {/* Table for desktop */}
                  <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-100">
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
                                <td className="p-5 text-center">
                                   <input 
                                     type="number" step="0.01" 
                                     className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-blue-600 outline-none"
                                     value={group.weightPerRollKg}
                                     onChange={(e) => {
                                       const val = parseFloat(e.target.value) || 0;
                                       setManifestGroups(manifestGroups.map(g => g.sizeId === group.sizeId ? { ...g, weightPerRollKg: val } : g));
                                     }}
                                   />
                                </td>
                                <td className="p-5 text-right font-black text-slate-700">{(group.fixedCount * group.weightPerRollKg).toFixed(1)} KG</td>
                                <td className="p-5 text-right pr-10">
                                   <button onClick={() => setManifestGroups(manifestGroups.filter(g => g.sizeId !== group.sizeId))} className="text-red-300 hover:text-red-500">🗑️</button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-8 md:mt-12 flex flex-col items-center border-t pt-8">
                 <button 
                  onClick={createBatch}
                  className="w-full sm:w-auto px-8 md:px-24 py-5 md:py-7 bg-blue-600 text-white font-black uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-2xl md:rounded-3xl shadow-xl hover:bg-blue-700 transition-all text-xs md:text-sm"
                 >
                   Finalize Batch Stock
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'sealing' || activeTab === 'cutting') && (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
          {(activeTab === 'sealing' ? batchesInSealing : batchesInCutting).length === 0 ? (
            <div className="p-20 md:p-32 text-center bg-white rounded-[2.5rem] md:rounded-[4rem] border-2 border-dashed border-slate-100 text-slate-300 uppercase font-black text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em]">
              No batches awaiting {activeTab}
            </div>
          ) : (
            (activeTab === 'sealing' ? batchesInSealing : batchesInCutting).map(batch => (
              <div key={batch.id} className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 shadow-md flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center space-x-4 md:space-x-6">
                  <div className={`w-12 h-12 md:w-16 md:h-16 ${activeTab === 'sealing' ? 'bg-orange-100' : 'bg-green-100'} rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl`}>
                    {activeTab === 'sealing' ? '✂️' : '🛍️'}
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{batch.batchNo}</p>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight: {batch.totalOutputKg.toFixed(1)} KG</p>
                  </div>
                </div>
                <button 
                  onClick={() => advanceStage(batch.id, activeTab === 'sealing' ? 'Sealing' : 'Neck Cutting')} 
                  className={`w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 ${activeTab === 'sealing' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all text-[10px] md:text-xs`}
                >
                  Confirm {activeTab === 'sealing' ? 'Sealing' : 'Cutting'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Production;
