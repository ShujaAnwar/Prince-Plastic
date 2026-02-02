
export type EntityStatus = 'active' | 'deleted';
export type RollStatus = 'Ready for Sealing' | 'Sealed' | 'Finished';
export type BatchStatus = 'Mixing' | 'Sealing' | 'Cutting' | 'Completed';

export enum PartyType {
  SUPPLIER = 'Supplier',
  CUSTOMER = 'Customer'
}

export interface MasterSize {
  id: string;
  label: string;
  weightPerRollKg: number; 
  fixedRollCount: number; 
  rollsRequired: number; 
  status: EntityStatus;
}

export interface MasterColor {
  id: string;
  name: string;
  status: EntityStatus;
}

export interface MasterMaterialType {
  id: string;
  name: string;
  status: EntityStatus;
}

export interface SystemConfig {
  sealingWastage: number;
  neckCuttingWastage: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  openingBalance: number;
  status?: EntityStatus;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  openingBalance: number;
  status?: EntityStatus;
}

export interface ConsumedMaterial {
  entryId: string;
  materialName: string;
  color: string;
  quantityUsed: number;
  rate: number;
}

export interface RawMaterialEntry {
  id: string;
  materialName: string;
  type: string;
  color: string;
  quantityKg: number;
  remainingQtyKg: number;
  ratePerKg: number;
  totalCost: number;
  supplierId: string;
  invoiceNo: string;
  date: string;
  status?: EntityStatus;
}

export interface RawMaterialStock {
  materialName: string;
  color: string;
  availableQty: number;
  avgRate: number;
}

export interface RollRequirement {
  id: string;
  sizeId: string;
  weightKg: number;
}

export interface ProductionBatch {
  id: string;
  batchNo: string;
  date: string;
  consumedMaterials: ConsumedMaterial[];
  rollManifest: RollRequirement[]; 
  totalInputKg: number;
  totalOutputKg: number;
  totalWastageKg: number;
  wastagePercentage: number;
  costPerKg: number;
  totalBatchCost: number;
  status: BatchStatus;
}

export interface Roll {
  id: string;
  batchId: string;
  rollNo: string;
  sizeId: string;
  weightKg: number;
  costPerKg: number;
  status: RollStatus;
}

export interface ShopperProduction {
  id: string;
  batchId: string;
  sizeId: string;
  weightProducedKg: number; 
  wastageKg: number;
  wastagePercentage: number;
  costPerKg: number; 
  date: string;
}

export interface FinishedGoods {
  sizeId: string;
  label: string;
  weightKg: number; 
  costPricePerKg: number; 
  sellingPricePerKg: number;
}

export interface Sale {
  id: string;
  customerId: string;
  sizeId: string;
  weightKg: number; 
  rate: number; 
  totalAmount: number;
  invoiceNo: string;
  date: string;
}

export interface LedgerEntry {
  id: string;
  partyType: 'Supplier' | 'Customer';
  partyId: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  date: string;
}
