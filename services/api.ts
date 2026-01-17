
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
    const cleanBase = (baseUrl === '/' || baseUrl === '/api') ? '/api' : baseUrl.replace(/\/$/, '');
    const url = baseUrl.includes('script.google.com') ? baseUrl : `${cleanBase}/data`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 503) {
        console.warn("⚠️ Database is down (503), but server is alive.");
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

export const loginUser = async (baseUrl: string, username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
        const cleanBase = (baseUrl === '/' || baseUrl === '/api') ? '/api' : baseUrl.replace(/\/$/, '');
        const url = `${cleanBase}/login`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const json = await response.json();

        if (response.ok && json.status === 'success') {
            return { success: true, user: json.data };
        } else {
            return { success: false, message: json.message || 'Login gagal' };
        }
    } catch (error: any) {
        return { success: false, message: 'Gagal terhubung ke server (Network Error)' };
    }
};

export const syncBackendData = async (
  baseUrl: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings' | 'reject_inventory' | 'rejects', 
  data: any
): Promise<{ success: boolean; message?: string }> => {
  if (!baseUrl) return { success: false, message: 'URL tujuan tidak ditemukan.' };
  
  try {
    const isGas = baseUrl.includes('script.google.com');
    const cleanBase = (baseUrl === '/' || baseUrl === '/api') ? '/api' : baseUrl.replace(/\/$/, '');
    const url = isGas ? baseUrl : `${cleanBase}/sync`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': isGas ? 'text/plain' : 'application/json' }
    });

    if (!response.ok) {
        return { success: false, message: `Server error: ${response.status} ${response.statusText}` };
    }
    
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error (Cek URL atau koneksi).' };
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
  if (!baseUrl) return { online: false, message: 'URL tidak boleh kosong.' };

  // Safety check for Mixed Content (HTTPS calling HTTP)
  if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
      return { 
          online: false, 
          message: 'Browser memblokir HTTP karena site ini HTTPS. Gunakan path "/api" (Proxy).' 
      };
  }

  try {
    const start = Date.now();
    const isGas = baseUrl.includes('script.google.com');
    
    if (isGas) {
        return { online: true, message: 'Format URL Google Apps Script valid.', dbStatus: 'UNKNOWN', latency: Date.now() - start };
    }

    // Determine the health check URL
    // If baseUrl is "/" or "/api", we want to check the server health endpoint via the proxy
    let url = '';
    if (baseUrl === '/' || baseUrl === '/api') {
        url = '/api/health';
    } else {
        url = baseUrl.endsWith('/') ? `${baseUrl}api/health` : `${baseUrl}/api/health`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    
    const latency = Date.now() - start;

    if (response.status === 502 || response.status === 504) {
        return { online: false, message: 'VPS Offline atau Port tertutup.' };
    }
    
    if (response.status === 503) {
        return { online: true, message: 'Server Aktif, Database MySQL Terputus.', dbStatus: 'DISCONNECTED', latency };
    }

    if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'online') {
            return { 
                online: true, 
                message: 'Koneksi ke VPS & Database normal.', 
                dbStatus: data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED', 
                latency 
            };
        }
        return { online: true, message: 'Server merespon (Path OK).', dbStatus: 'UNKNOWN', latency };
    } else {
        return { online: false, message: `Server error: ${response.status}` };
    }
  } catch (error: any) {
    return { 
      online: false, 
      message: error.name === 'AbortError' ? 'Koneksi Timeout (Lambat).' : 'Server tidak dapat dijangkau.' 
    };
  }
};
