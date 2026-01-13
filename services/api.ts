import { InventoryItem, Transaction, Supplier, User, AppSettings } from "../types";

// Standard JSON response wrapper from GAS
interface GasResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

interface FullState {
  inventory: InventoryItem[];
  transactions: Transaction[];
  suppliers: Supplier[];
  users: User[];
  settings: Partial<AppSettings>;
}

export const fetchBackendData = async (url: string): Promise<FullState | null> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });
    
    const json: GasResponse<FullState> = await response.json();
    
    if (json.status === 'success' && json.data) {
      return json.data;
    } else {
      console.error("GAS Error:", json.message);
      return null;
    }
  } catch (error) {
    console.error("Network Error fetching backend:", error);
    return null;
  }
};

export const syncBackendData = async (
  url: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings', 
  data: any
): Promise<boolean> => {
  try {
    // GAS requires text/plain to avoid CORS preflight options request issues in some envs,
    // but we use standard POST here.
    const payload = JSON.stringify({ type, data });
    
    const response = await fetch(url, {
      method: 'POST',
      body: payload,
      // mode: 'no-cors' // Do NOT use no-cors if you want to read the response.
      // GAS Web Apps deployed as "Anyone" support CORS if handled correctly.
    });

    const json = await response.json();
    return json.status === 'success';
  } catch (error) {
    console.error(`Error syncing ${type}:`, error);
    return false;
  }
};