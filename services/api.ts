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
    
    // Logic URL construction:
    // If baseUrl is '/', we want '/api/data' (Relative path for Proxy)
    // If baseUrl is 'http://...', we want 'http://.../api/data'
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = isGas ? baseUrl : `${cleanBase}/api/data`;

    console.log(`📡 Fetching data from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 404) {
         console.error(`❌ 404 Not Found at: ${url}`);
         throw new Error(`Server endpoint not found (404). Please check if backend server is running and routes are defined.`);
    }

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json: ApiResponse<FullState> = await response.json();
    
    if (json.status === 'success' && json.data) {
      console.log("✅ Backend connection successful");
      return json.data;
    } else {
      console.error("❌ Backend Error (Logic):", json.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Network/Connection Error:", error);
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
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = isGas ? baseUrl : `${cleanBase}/api/sync`;

    console.log(`💾 Syncing ${type} to: ${url}`);

    const payload = JSON.stringify({ type, data });
    
    const response = await fetch(url, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': isGas ? 'text/plain' : 'application/json' 
      }
    });

    if (response.status === 404) {
        return { success: false, message: 'Server endpoint (sync) not found (404).' };
    }

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
    
    // Friendly error message for Mixed Content or Connection Refused
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
         if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
             return { success: false, message: 'BLOCKED: Browser blocked HTTP connection. Please set URL to "/" in Admin Panel.' };
         }
         return { success: false, message: 'Connection refused. Is the server running? Check VPS Firewall.' };
    }
    
    return { success: false, message: error.message || 'Network error' };
  }
};