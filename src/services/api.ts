import { InventoryItem, Transaction, Supplier, User, AppSettings } from "../types";

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
    // Force clean URL handling
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = `${cleanBase}/api/data`;

    console.log(`📡 Fetching data from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    // Check if Nginx returned the HTML 404 page instead of JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("Server Error: Received HTML instead of JSON. Nginx API configuration might be missing.");
    }

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json: ApiResponse<FullState> = await response.json();
    
    if (json.status === 'success' && json.data) {
      return json.data;
    } else {
      console.error("❌ Backend Logic Error:", json.message);
      return null;
    }
  } catch (error: any) {
    console.error("❌ Network Request Failed:", error);
    throw error;
  }
};

export const syncBackendData = async (
  baseUrl: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings', 
  data: any
): Promise<{ success: boolean; message?: string }> => {
  try {
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = `${cleanBase}/api/sync`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': 'application/json' }
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        return { success: false, message: "Server Misconfiguration: API route not found (HTML response)." };
    }

    if (!response.ok) {
        return { success: false, message: `Server error: ${response.status}` };
    }

    const json = await response.json();
    return { 
        success: json.status === 'success', 
        message: json.message || 'Unknown server response'
    };
  } catch (error: any) {
    console.error(`Error syncing ${type}:`, error);
    return { success: false, message: error.message || 'Network error' };
  }
};