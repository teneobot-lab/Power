import { InventoryItem, Transaction, Supplier, User, AppSettings } from "../types";

// Standard JSON response wrapper
interface ApiResponse<T> {
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

export const fetchBackendData = async (baseUrl: string): Promise<FullState | null> => {
  try {
    // Determine endpoint based on whether it's GAS or Node VPS
    // GAS usually ends in /exec, Node usually defines /api/data
    const isGas = baseUrl.includes('script.google.com');
    const url = isGas ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/data`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json: ApiResponse<FullState> = await response.json();
    
    if (json.status === 'success' && json.data) {
      return json.data;
    } else {
      console.error("Backend Error:", json.message);
      return null;
    }
  } catch (error) {
    console.error("Network Error fetching backend:", error);
    return null;
  }
};

export const syncBackendData = async (
  baseUrl: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings', 
  data: any
): Promise<boolean> => {
  try {
    const isGas = baseUrl.includes('script.google.com');
    // GAS uses single endpoint, Node uses /api/sync
    const url = isGas ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/sync`;

    const payload = JSON.stringify({ type, data });
    
    const response = await fetch(url, {
      method: 'POST',
      body: payload,
      headers: {
        // GAS sometimes prefers text/plain to avoid preflight CORS, 
        // but Node/Express needs application/json to parse body correctly.
        'Content-Type': isGas ? 'text/plain' : 'application/json' 
      }
    });

    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return false;
    }

    const json = await response.json();
    return json.status === 'success';
  } catch (error) {
    console.error(`Error syncing ${type}:`, error);
    return false;
  }
};