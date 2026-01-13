export interface UnitDefinition {
  name: string;
  ratio: number; // Conversion ratio relative to base unit (e.g., 1 Box = 12 Pcs, ratio = 12)
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number; // Always stored in Base Unit
  baseUnit: string; // e.g., "Pcs"
  alternativeUnits?: UnitDefinition[]; // e.g., [{name: "Box", ratio: 12}]
  minLevel: number; // Reorder point
  unitPrice: number;
  location: string;
  lastUpdated: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface MediaItem {
  id: string;
  type: 'youtube' | 'tiktok';
  url: string;       // Original URL
  embedId: string;   // Extracted ID for embedding
  title: string;
  addedAt: string;
}

export interface AppSettings {
  geminiApiKey: string;
  viteGasUrl: string;
  youtubeApiKey: string; // New field for YouTube Data API
  tiktokConfig: string;  // New field for TikTok Configuration/Session
  mediaItems: MediaItem[];
}

export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
}

export interface TablePreferences {
  inventory: TableColumn[];
  history: TableColumn[];
  suppliers: TableColumn[];
}

export interface StockAlert {
  id: string;
  itemId: string;
  message: string;
  severity: 'low' | 'critical' | 'info';
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  TRANSACTIONS = 'TRANSACTIONS',
  SUPPLIERS = 'SUPPLIERS',
  ADMIN = 'ADMIN', 
  HISTORY = 'HISTORY',
  AI_ASSISTANT = 'AI_ASSISTANT',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type TransactionType = 'IN' | 'OUT';

export interface TransactionItemDetail {
  itemId: string;
  itemName: string; // Snapshot name
  quantityInput: number;
  selectedUnit: string;
  conversionRatio: number;
  totalBaseQuantity: number; // quantityInput * conversionRatio
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  items: TransactionItemDetail[];
  notes?: string;
  timestamp: string;
  // New Inbound Fields
  supplierName?: string; // Changed from supplierId to supplierName for text input
  poNumber?: string; // Purchase Order
  riNumber?: string; // Receiving Inspection / Receipt Number
  photos?: string[]; // Array of Base64 strings
}

// Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}