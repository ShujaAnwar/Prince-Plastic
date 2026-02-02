
import { 
  Supplier, Customer, RawMaterialEntry, RawMaterialStock, 
  ProductionBatch, Sale, LedgerEntry, MasterSize, MasterColor, MasterMaterialType, SystemConfig, AuditLog
} from './types';

const STORAGE_KEYS = {
  SUPPLIERS: 'pp_suppliers',
  CUSTOMERS: 'pp_customers',
  RAW_MATERIALS: 'pp_raw_materials',
  BATCHES: 'pp_batches',
  SALES: 'pp_sales',
  LEDGER: 'pp_ledger',
  MASTER_SIZES: 'pp_master_sizes',
  MASTER_COLORS: 'pp_master_colors',
  MASTER_TYPES: 'pp_master_types',
  SYSTEM_CONFIG: 'pp_system_config',
  AUDIT_LOGS: 'pp_audit_logs'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const set = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const db = {
  // Master Data
  getSuppliers: () => get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []),
  saveSupplier: (s: Supplier) => {
    set(STORAGE_KEYS.SUPPLIERS, [...db.getSuppliers(), s]);
    db.addAuditLog('Setup', `Added Vendor: ${s.name}`);
  },
  updateSupplier: (s: Supplier) => {
    set(STORAGE_KEYS.SUPPLIERS, db.getSuppliers().map(item => item.id === s.id ? s : item));
    db.addAuditLog('Update', `Updated Vendor: ${s.name}`);
  },
  deleteSupplier: (id: string) => {
    const purchases = db.getRawMaterials().filter(m => m.supplierId === id);
    const supplier = db.getSuppliers().find(s => s.id === id);
    if (purchases.length > 0) {
      // If transactions exist, just deactivate
      const s = db.getSuppliers().map(item => item.id === id ? { ...item, status: 'inactive' } : item);
      set(STORAGE_KEYS.SUPPLIERS, s);
      db.addAuditLog('Update', `Deactivated Vendor (Transactions Exist): ${supplier?.name}`);
    } else {
      set(STORAGE_KEYS.SUPPLIERS, db.getSuppliers().filter(item => item.id !== id));
      db.addAuditLog('Delete', `Deleted Vendor: ${supplier?.name}`);
    }
  },
  
  getCustomers: () => get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []),
  saveCustomer: (c: Customer) => {
    set(STORAGE_KEYS.CUSTOMERS, [...db.getCustomers(), c]);
    db.addAuditLog('Setup', `Added Customer: ${c.name}`);
  },
  updateCustomer: (c: Customer) => {
    set(STORAGE_KEYS.CUSTOMERS, db.getCustomers().map(item => item.id === c.id ? c : item));
    db.addAuditLog('Update', `Updated Customer: ${c.name}`);
  },
  deleteCustomer: (id: string) => {
    const sales = db.getSales().filter(s => s.customerId === id);
    const customer = db.getCustomers().find(c => c.id === id);
    if (sales.length > 0) {
      const c = db.getCustomers().map(item => item.id === id ? { ...item, status: 'inactive' } : item);
      set(STORAGE_KEYS.CUSTOMERS, c);
      db.addAuditLog('Update', `Deactivated Customer (Transactions Exist): ${customer?.name}`);
    } else {
      set(STORAGE_KEYS.CUSTOMERS, db.getCustomers().filter(item => item.id !== id));
      db.addAuditLog('Delete', `Deleted Customer: ${customer?.name}`);
    }
  },

  getSizes: () => get<MasterSize[]>(STORAGE_KEYS.MASTER_SIZES, []),
  saveSize: (label: string, weight: number, rolls: number) => {
    const s: MasterSize = { id: Math.random().toString(36).substr(2, 9), label, weightPerRollKg: weight, fixedRollCount: rolls, rollsRequired: rolls, status: 'active' };
    set(STORAGE_KEYS.MASTER_SIZES, [...db.getSizes(), s]);
  },
  updateSize: (id: string, weight: number, rolls: number) => {
    set(STORAGE_KEYS.MASTER_SIZES, db.getSizes().map(s => s.id === id ? { ...s, weightPerRollKg: weight, fixedRollCount: rolls } : s));
  },
  deleteSize: (id: string) => set(STORAGE_KEYS.MASTER_SIZES, db.getSizes().filter(s => s.id !== id)),
  setAllSizesTo20kg: () => set(STORAGE_KEYS.MASTER_SIZES, db.getSizes().map(s => ({ ...s, weightPerRollKg: 20 }))),

  getColors: () => get<MasterColor[]>(STORAGE_KEYS.MASTER_COLORS, []),
  saveColor: (name: string) => set(STORAGE_KEYS.MASTER_COLORS, [...db.getColors(), { id: Math.random().toString(36).substr(2, 9), name, status: 'active' }]),

  getMaterialTypes: () => get<MasterMaterialType[]>(STORAGE_KEYS.MASTER_TYPES, [
    { id: '1', name: 'Polythene Dana', status: 'active' },
    { id: '2', name: 'Color', status: 'active' },
    { id: '3', name: 'Chemical', status: 'active' }
  ]),
  saveMaterialType: (name: string) => set(STORAGE_KEYS.MASTER_TYPES, [...db.getMaterialTypes(), { id: Math.random().toString(36).substr(2, 9), name, status: 'active' }]),

  // Raw Materials
  getRawMaterials: () => get<RawMaterialEntry[]>(STORAGE_KEYS.RAW_MATERIALS, []),
  saveRawMaterial: (entry: RawMaterialEntry) => {
    const entries = db.getRawMaterials();
    set(STORAGE_KEYS.RAW_MATERIALS, [...entries, entry]);
    db.saveLedgerEntry({
      id: Math.random().toString(36).substr(2, 9),
      partyType: 'Supplier',
      partyId: entry.supplierId,
      debit: 0,
      credit: entry.totalCost,
      balance: 0,
      reference: `Purchase: ${entry.materialName} (Inv: ${entry.invoiceNo})`,
      date: entry.date
    });
  },
  updateRawMaterial: (entry: RawMaterialEntry) => set(STORAGE_KEYS.RAW_MATERIALS, db.getRawMaterials().map(e => e.id === entry.id ? entry : e)),
  deleteRawMaterial: (id: string) => {
    const entries = db.getRawMaterials();
    const entry = entries.find(e => e.id === id);
    if (entry) {
       set(STORAGE_KEYS.RAW_MATERIALS, entries.filter(e => e.id !== id));
       set(STORAGE_KEYS.LEDGER, db.getLedger().filter(l => !(l.partyId === entry.supplierId && l.reference.includes(entry.invoiceNo))));
    }
  },

  getRawMaterialStock: () => {
    const entries = db.getRawMaterials();
    const stockMap: Record<string, { qty: number, totalCost: number }> = {};
    entries.forEach(e => {
      const key = `${e.materialName}-${e.color}`;
      if (!stockMap[key]) stockMap[key] = { qty: 0, totalCost: 0 };
      stockMap[key].qty += e.remainingQtyKg;
      stockMap[key].totalCost += (e.remainingQtyKg * e.ratePerKg);
    });
    return Object.entries(stockMap).map(([key, data]) => {
      const [name, color] = key.split('-');
      return { materialName: name, color, availableQty: data.qty, avgRate: data.qty > 0 ? data.totalCost / data.qty : 0 };
    });
  },

  // Production
  getBatches: () => get<ProductionBatch[]>(STORAGE_KEYS.BATCHES, []),
  saveBatch: (batch: ProductionBatch) => {
    set(STORAGE_KEYS.BATCHES, [...db.getBatches(), batch]);
    const raw = db.getRawMaterials();
    batch.consumedMaterials.forEach(cons => {
      const entry = raw.find(r => r.id === cons.entryId);
      if (entry) entry.remainingQtyKg -= cons.quantityUsed;
    });
    set(STORAGE_KEYS.RAW_MATERIALS, raw);
    db.addAuditLog('Production', `Created Batch ${batch.batchNo} (${batch.totalInputKg} KG)`);
  },
  advanceBatchStage: (id: string) => {
    const batches = db.getBatches();
    const batch = batches.find(b => b.id === id);
    if (!batch) return;

    const config = db.getSystemConfig();
    if (batch.status === 'Sealing') {
      batch.status = 'Cutting';
      const loss = batch.totalOutputKg * (config.sealingWastage / 100);
      batch.totalWastageKg += loss;
      batch.totalOutputKg -= loss;
    } else if (batch.status === 'Cutting') {
      batch.status = 'Completed';
      const loss = batch.totalOutputKg * (config.neckCuttingWastage / 100);
      batch.totalWastageKg += loss;
      batch.totalOutputKg -= loss;
      batch.wastagePercentage = (batch.totalWastageKg / batch.totalInputKg) * 100;
    }
    set(STORAGE_KEYS.BATCHES, batches);
  },

  // Finished Goods
  getFinishedGoodsStock: () => {
    const batches = db.getBatches().filter(b => b.status === 'Completed');
    const sales = db.getSales();
    const sizes = db.getSizes();
    
    return sizes.map(size => {
      let weight = 0;
      let totalCost = 0;
      let count = 0;

      batches.forEach(b => {
        const sizeWeight = b.rollManifest.filter(r => r.sizeId === size.id).reduce((a, b) => a + b.weightKg, 0);
        const outputRatio = b.totalOutputKg / b.totalInputKg;
        const netWeight = sizeWeight * outputRatio;
        weight += netWeight;
        totalCost += (netWeight * b.costPerKg);
        if (netWeight > 0) count++;
      });

      sales.filter(s => s.sizeId === size.id).forEach(s => {
        weight -= s.weightKg;
      });

      return {
        sizeId: size.id,
        label: size.label,
        weightKg: Math.max(0, weight),
        costPricePerKg: count > 0 ? totalCost / (weight + sales.filter(s => s.sizeId === size.id).reduce((a,b)=>a+b.weightKg, 0)) : 0,
        sellingPricePerKg: (totalCost / (weight + 0.00001)) * 1.2
      };
    });
  },

  // Sales
  getSales: () => get<Sale[]>(STORAGE_KEYS.SALES, []),
  saveSale: (sale: Sale) => {
    set(STORAGE_KEYS.SALES, [...db.getSales(), sale]);
    db.saveLedgerEntry({
      id: Math.random().toString(36).substr(2, 9),
      partyType: 'Customer',
      partyId: sale.customerId,
      debit: sale.totalAmount,
      credit: 0,
      balance: 0,
      reference: `Invoice: ${sale.invoiceNo} (${sale.weightKg} KG)`,
      date: sale.date
    });
  },

  // Ledgers
  getLedger: () => get<LedgerEntry[]>(STORAGE_KEYS.LEDGER, []),
  saveLedgerEntry: (entry: LedgerEntry) => set(STORAGE_KEYS.LEDGER, [...db.getLedger(), entry]),
  
  // Historical balance helper
  getPartyBalanceAtDate: (partyId: string, date: string, partyType: 'Supplier' | 'Customer'): number => {
    const parties = partyType === 'Supplier' ? db.getSuppliers() : db.getCustomers();
    const party = parties.find(p => p.id === partyId);
    if (!party) return 0;
    
    const entries = db.getLedger().filter(l => l.partyId === partyId && l.date < date);
    let balance = party.openingBalance;
    entries.forEach(e => {
      if (partyType === 'Customer') balance += (e.debit - e.credit);
      else balance += (e.credit - e.debit);
    });
    return balance;
  },

  // Financial Summary
  getFinancialSummary: () => {
    const customers = db.getCustomers();
    const suppliers = db.getSuppliers();
    const ledger = db.getLedger();

    let totalReceivables = 0;
    customers.forEach(c => {
      let bal = c.openingBalance;
      ledger.filter(l => l.partyId === c.id).forEach(e => bal += (e.debit - e.credit));
      totalReceivables += bal;
    });

    let totalPayables = 0;
    suppliers.forEach(s => {
      let bal = s.openingBalance;
      ledger.filter(l => l.partyId === s.id).forEach(e => bal += (e.credit - e.debit));
      totalPayables += bal;
    });

    return { totalReceivables, totalPayables };
  },

  // Config & Logs
  getSystemConfig: () => get<SystemConfig>(STORAGE_KEYS.SYSTEM_CONFIG, { sealingWastage: 3, neckCuttingWastage: 17 }),
  updateSystemConfig: (c: SystemConfig) => set(STORAGE_KEYS.SYSTEM_CONFIG, c),
  getAuditLogs: () => get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []),
  addAuditLog: (action: string, details: string) => {
    const log: AuditLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), user: 'Admin', action, details };
    set(STORAGE_KEYS.AUDIT_LOGS, [log, ...db.getAuditLogs()].slice(0, 100));
  }
};
