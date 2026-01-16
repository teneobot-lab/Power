
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

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 503) {
        console.warn("⚠️ Database is down (503), but server is alive.");
        return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        return null;
    }

    if (!response.ok) return null;

    const json: ApiResponse<FullState> = await response.json();
    return (json.status === 'success' && json.data) ? json.data : null;
  } catch (error: any) {
    console.warn("⚠️ Network Error:", error.message);
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

    if (!response.ok) return { success: false, message: `Server error: ${response.status}` };
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error' };
  }
};

/**
 * Enhanced Server Connection Check
 */
export const checkServerConnection = async (baseUrl: string): Promise<{ 
  online: boolean; 
  message: string; 
  dbStatus?: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'; 
  latency?: number 
}> => {
  try {
    const start = Date.now();
    const cleanBase = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    
    if (baseUrl.includes('script.google.com')) {
        return { online: true, message: 'Google Apps Script detected', dbStatus: 'UNKNOWN', latency: Date.now() - start };
    }
    
    // Gunakan endpoint data untuk cek status DB sekaligus
    const url = baseUrl === '/' ? '/api/data' : `${cleanBase}/api/data`; 
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    
    const latency = Date.now() - start;

    if (response.status === 502 || response.status === 504) {
        return { online: false, message: 'Gateway Error: VPS Port 3000 mungkin tertutup.' };
    }
    
    if (response.status === 503) {
        return { online: true, message: 'Server Aktif, tapi MySQL terputus.', dbStatus: 'DISCONNECTED', latency };
    }

    if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             return { online: true, message: 'Semua sistem normal.', dbStatus: 'CONNECTED', latency };
        }
        return { online: true, message: 'Server merespon, tapi bukan data valid (HTML).', dbStatus: 'UNKNOWN', latency };
    } else {
        return { online: false, message: `Server merespon error: ${response.status}` };
    }
  } catch (error: any) {
    return { 
      online: false, 
      message: error.name === 'AbortError' ? 'Koneksi Timeout (Server lambat)' : 'Server tidak dapat dijangkau.' 
    };
  }
};
