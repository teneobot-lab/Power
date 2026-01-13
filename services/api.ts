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
): Promise<{ success: boolean; message?: string }> => {
  try {
    const isGas = baseUrl.includes('script.google.com');
    // GAS uses single endpoint, Node uses /api/sync
    const url = isGas ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/sync`;

    const payload = JSON.stringify({ type, data });
    
    const response = await fetch(url, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': isGas ? 'text/plain' : 'application/json' 
      }
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`Sync HTTP Error: ${response.status}`, errorText);
        return { success: false, message: `Server error: ${response.status}` };
    }

    const json = await response.json();
    return { 
        success: json.status === 'success', 
        message: json.message || 'Unknown server response'
    };
  } catch (error: any) {
    console.error(`Error syncing ${type}:`, error);
    
    // Friendly error message for Mixed Content
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
         if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
             return { success: false, message: 'Blocked: Cannot access HTTP server from HTTPS site (Mixed Content).' };
         }
         return { success: false, message: 'Connection refused. Is the server running?' };
    }
    
    return { success: false, message: error.message || 'Network error' };
  }
};