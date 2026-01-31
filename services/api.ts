import { InventoryItem, Transaction, Supplier, AppSettings, RejectLog, RejectItem } from "../types";

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

interface FullState {
  inventory: InventoryItem[];
  transactions: Transaction[];
  reject_inventory: RejectItem[];
  rejects: RejectLog[];
  suppliers: Supplier[];
  settings: Partial<AppSettings>;
}

/**
 * Fetch all data from Google Apps Script
 */
export const fetchBackendData = async (gasUrl: string): Promise<FullState | null> => {
  if (!gasUrl || gasUrl === '/' || gasUrl.length < 10) return null;
  
  try {
    const response = await fetch(gasUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) return null;

    const json: ApiResponse<FullState> = await response.json();
    return (json.status === 'success' && json.data) ? json.data : null;
  } catch (error) {
    console.warn("⚠️ AppScript Offline/Error:", error);
    return null;
  }
};

/**
 * Sync individual module to Google Apps Script
 */
export const syncBackendData = async (
  gasUrl: string, 
  type: string, 
  data: any
): Promise<{ success: boolean; message?: string }> => {
  if (!gasUrl || gasUrl === '/' || gasUrl.length < 10) return { success: false, message: 'AppScript URL invalid.' };
  
  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': 'text/plain' } // GAS requirement to avoid CORS preflight
    });

    if (!response.ok) return { success: false, message: `Status: ${response.status}` };
    
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error.' };
  }
};

/**
 * Simple connection test for GAS
 */
export const checkServerConnection = async (gasUrl: string): Promise<{ online: boolean; message: string }> => {
  if (!gasUrl || gasUrl === '/' || gasUrl.length < 10) return { online: false, message: 'URL not set.' };

  try {
    const response = await fetch(gasUrl, { method: 'GET' });
    return { online: response.ok, message: response.ok ? 'Link established with Google Cloud.' : 'Service unavailable.' };
  } catch (error) {
    return { online: false, message: 'Connection failed.' };
  }
};
