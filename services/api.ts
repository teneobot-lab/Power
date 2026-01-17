
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

/**
 * Membangun URL API yang benar berdasarkan input pengaturan user
 */
const buildUrl = (baseUrl: string, path: string): string => {
    if (!baseUrl) return path;
    const isGas = baseUrl.includes('script.google.com');
    if (isGas) return baseUrl;

    const cleanBase = baseUrl.replace(/\/$/, '');
    
    // Jika user menginput path relatif (seperti '/' atau '/api'), gunakan proxy.
    // Jika user menginput URL lengkap (http://...), tambahkan /api jika belum ada.
    if (cleanBase.startsWith('http')) {
        const hasApiPrefix = cleanBase.endsWith('/api') || cleanBase.includes('/api/');
        if (!hasApiPrefix) {
            return `${cleanBase}/api${path}`;
        }
        return `${cleanBase}${path}`;
    } else if (cleanBase === '' || cleanBase === '/') {
        return `/api${path}`;
    } else if (cleanBase === '/api') {
        return `/api${path}`;
    }
    
    return `${cleanBase}${path}`;
};

export const fetchBackendData = async (baseUrl: string): Promise<FullState | null> => {
  try {
    const url = buildUrl(baseUrl, '/data');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 503) {
        console.warn("⚠️ Server online, tapi MySQL Offline.");
        return null;
    }

    if (!response.ok) return null;
    const json: ApiResponse<FullState> = await response.json();
    return (json.status === 'success' && json.data) ? json.data : null;
  } catch (error: any) {
    return null;
  }
};

export const loginUser = async (baseUrl: string, username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
        const url = buildUrl(baseUrl, '/login');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const json = await response.json();
        if (response.ok && json.status === 'success') {
            return { success: true, user: json.data };
        } else {
            return { success: false, message: json.message || 'Login Gagal' };
        }
    } catch (error: any) {
        return { success: false, message: 'Gagal terhubung ke server backend.' };
    }
};

export const syncBackendData = async (
  baseUrl: string, 
  type: 'inventory' | 'transactions' | 'suppliers' | 'users' | 'settings' | 'reject_inventory' | 'rejects', 
  data: any
): Promise<{ success: boolean; message?: string }> => {
  if (!baseUrl) return { success: false, message: 'URL Backend belum diatur.' };
  
  try {
    const url = buildUrl(baseUrl, '/sync');
    const isGas = baseUrl.includes('script.google.com');

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': isGas ? 'text/plain' : 'application/json' }
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, message: errJson.message || `Server Error (${response.status})` };
    }
    
    const json = await response.json();
    return { success: json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: 'Masalah Jaringan: ' + error.message };
  }
};

/**
 * Tes koneksi mendalam (Deep Ping)
 */
export const checkServerConnection = async (baseUrl: string): Promise<{ 
  online: boolean; 
  message: string; 
  dbStatus?: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'; 
}> => {
  if (!baseUrl) return { online: false, message: 'URL tidak valid.' };

  // Keamanan Mixed Content
  if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
      return { 
          online: false, 
          message: 'Peringatan Keamanan: Browser memblokir HTTP karena site ini HTTPS. Gunakan path "/api" (Proxy).' 
      };
  }

  try {
    const url = buildUrl(baseUrl, '/health');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); 

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.status === 503) {
        return { online: true, message: 'Backend Aktif, tapi MySQL Offline.', dbStatus: 'DISCONNECTED' };
    }

    if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'online') {
            return { 
                online: true, 
                message: 'Terhubung ke Backend & MySQL.', 
                dbStatus: data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED'
            };
        }
        return { online: true, message: 'Server merespon (Format Unknown).', dbStatus: 'UNKNOWN' };
    } else {
        return { online: false, message: `Error HTTP ${response.status}: Server bermasalah.` };
    }
  } catch (error: any) {
    return { 
      online: false, 
      message: error.name === 'AbortError' ? 'Timeout: Server terlalu lambat merespon.' : 'Server tidak dapat dijangkau (CORS/Down).' 
    };
  }
};
