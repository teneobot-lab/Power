
import { InventoryItem, Transaction, Supplier, User, AppSettings, RejectItem, RejectLog } from "../types";

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
  users: User[];
  settings: Partial<AppSettings>;
}

export const fetchBackendData = async (baseUrl: string): Promise<FullState | null> => {
  try {
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = baseUrl.includes('script.google.com') ? baseUrl : `${cleanBase}/api/data`;

    console.log(`📡 Fetching data from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    // Handle HTML response (e.g., 404 Page, Nginx Error, or Proxy Fallback) gracefully
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        console.warn(`⚠️ Backend unreachable at ${url} (Received HTML). Switching to Local Mode.`);
        return null;
    }

    if (!response.ok) {
        console.warn(`⚠️ HTTP Error: ${response.status} ${response.statusText}`);
        return null;
    }

    const json: ApiResponse<FullState> = await response.json();
    return (json.status === 'success' && json.data) ? json.data : null;
  } catch (error: any) {
    console.warn("⚠️ Offline Mode or Network Error:", error.message);
    return null;
  }
};

export const syncBackendData = async (
  baseUrl: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings' | 'rejects', 
  data: any
): Promise<{ success: boolean; message?: string }> => {
  try {
    const isGas = baseUrl.includes('script.google.com');
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = isGas ? baseUrl : `${cleanBase}/api/sync`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': isGas ? 'text/plain' : 'application/json' }
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        return { success: false, message: "Server API not found (HTML response)." };
    }

    if (!response.ok) return { success: false, message: `Server error: ${response.status}` };
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error' };
  }
};

/**
 * Sends all application data to the backend for a full spreadsheet refresh.
 */
export const syncFullToSheets = async (
  baseUrl: string,
  fullData: FullState
): Promise<{ success: boolean; message?: string }> => {
  try {
    const isGas = baseUrl.includes('script.google.com');
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const url = isGas ? baseUrl : `${cleanBase}/api/sync`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type: 'full_sync', data: fullData }),
      headers: { 'Content-Type': isGas ? 'text/plain' : 'application/json' }
    });

    if (!response.ok) return { success: false, message: `Server error: ${response.status}` };
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error' };
  }
};

/**
 * Checks if the backend server is reachable.
 */
export const checkServerConnection = async (baseUrl: string): Promise<{ online: boolean; message: string }> => {
  try {
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    // Jika GAS, kita tidak bisa cek root, jadi return true asumsi user benar
    if (baseUrl.includes('script.google.com')) return { online: true, message: 'Google Apps Script URL detected' };
    
    // Jika Mode Proxy ('/'), kita tidak bisa cek root '/' karena itu adalah halaman Frontend React
    // Jadi kita cek endpoint API sebenarnya
    const url = baseUrl === '/' ? '/api/data' : `${cleanBase}/`; 
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
        // Jika kita hit endpoint data untuk pengecekan
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             return { online: true, message: 'Server Proxy API Online!' };
        }
        return { online: true, message: 'Server Online & Siap!' };
    } else {
        return { online: false, message: `Server Error: ${response.status}` };
    }
  } catch (error: any) {
    return { online: false, message: error.name === 'AbortError' ? 'Koneksi Timeout' : 'Tidak dapat terhubung' };
  }
};
