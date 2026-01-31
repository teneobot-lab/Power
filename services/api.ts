
import { InventoryItem, Transaction, Supplier, User, AppSettings, RejectLog, RejectItem } from "../types";

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

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        console.warn(`⚠️ Backend Issue at ${url}. Received HTML instead of JSON.`);
        if (response.status === 502) {
            console.error("❌ Error 502: Vercel tidak bisa menghubungi VPS. Cek Firewall (Port 3000) atau pastikan Server Backend menyala.");
        }
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
        if (response.status === 502) {
            return { success: false, message: "Error 502: VPS Mati atau Port 3000 tertutup Firewall." };
        }
        return { success: false, message: "Server API not found (HTML response)." };
    }

    if (!response.ok) return { success: false, message: `Server error: ${response.status}` };
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error' };
  }
};

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
 * Checks if the backend server is reachable with detail.
 */
export const checkServerConnection = async (baseUrl: string): Promise<{ online: boolean; message: string; dbStatus?: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'; latency?: number }> => {
  try {
    const start = Date.now();
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    
    // Jika GAS
    if (baseUrl.includes('script.google.com')) return { online: true, message: 'Google Apps Script URL detected' };
    
    // Cek endpoint API Data (karena ini yang diproxy Vercel)
    const url = baseUrl === '/' ? '/api/data' : `${cleanBase}/api/data`; 
    
    console.log("Checking connection to:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout

    // Request hanya HEAD atau GET simple jika backend support, tapi disini kita pakai GET data
    // karena backend kita cek DB saat GET /api/data
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    
    const latency = Date.now() - start;

    // Cek 502 Bad Gateway (Server Mati / Proxy Gagal)
    if (response.status === 502) {
        return { online: false, message: 'Error 502: VPS Port 3000 tertutup atau Server mati.' };
    }
    
    // Cek 503 Service Unavailable (Middleware checkDb di backend)
    if (response.status === 503) {
        return { online: true, message: 'Server Online, tapi Database Gagal', dbStatus: 'DISCONNECTED', latency };
    }

    if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             return { online: true, message: `Terhubung (${latency}ms)`, dbStatus: 'CONNECTED', latency };
        }
        return { online: true, message: `Server Online (HTML Resp)`, dbStatus: 'UNKNOWN', latency };
    } else {
        return { online: false, message: `Server Error: ${response.status}` };
    }
  } catch (error: any) {
    return { online: false, message: error.name === 'AbortError' ? 'Koneksi Timeout' : 'Tidak dapat terhubung' };
  }
};
