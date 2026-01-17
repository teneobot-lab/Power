
import { InventoryItem, Transaction, Supplier, User, AppSettings, RejectLog, RejectItem } from "../types";

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

const buildUrl = (baseUrl: string, path: string): string => {
    if (!baseUrl) return path;
    const isGas = baseUrl.includes('script.google.com');
    if (isGas) return baseUrl;

    const cleanBase = baseUrl.replace(/\/$/, '');
    
    if (cleanBase.startsWith('http')) {
        const hasApiPrefix = cleanBase.endsWith('/api') || cleanBase.includes('/api/');
        return hasApiPrefix ? `${cleanBase}${path}` : `${cleanBase}/api${path}`;
    } else {
        const normalized = cleanBase === '' || cleanBase === '/' ? '/api' : (cleanBase.startsWith('/') ? cleanBase : `/${cleanBase}`);
        return `${normalized}${path}`;
    }
};

export const fetchBackendData = async (baseUrl: string): Promise<any> => {
  try {
    const url = buildUrl(baseUrl, '/data');
    const response = await fetch(url);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Server Error' }));
        throw new Error(err.message || `Error ${response.status}`);
    }
    const json = await response.json();
    return json.data;
  } catch (error: any) {
    console.error("Fetch failed:", error.message);
    throw error;
  }
};

export const loginUser = async (baseUrl: string, username: string, password: string): Promise<any> => {
    try {
        const url = buildUrl(baseUrl, '/login');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const json = await response.json();
        return { success: response.ok && json.status === 'success', ...json };
    } catch (error: any) {
        return { success: false, message: 'Gagal terhubung ke backend.' };
    }
};

export const syncBackendData = async (baseUrl: string, type: string, data: any): Promise<any> => {
  try {
    const url = buildUrl(baseUrl, '/sync');
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await response.json();
    return { success: response.ok && json.status === 'success', message: json.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const checkServerConnection = async (baseUrl: string): Promise<{ online: boolean; message: string; dbStatus?: string }> => {
  if (!baseUrl) return { online: false, message: 'URL Kosong' };

  if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
      return { 
          online: false, 
          message: 'DIBLOKIR BROWSER: Gunakan "/api" (Proxy) karena site ini HTTPS sedangkan VPS menggunakan HTTP.' 
      };
  }

  try {
    const url = buildUrl(baseUrl, '/health');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);

    if (response.status === 503) {
        const data = await response.json();
        return { online: true, dbStatus: 'DISCONNECTED', message: `Server Aktif, tapi MySQL Error: ${data.message}` };
    }

    if (response.ok) {
        const data = await response.json();
        return { 
            online: true, 
            dbStatus: data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
            message: data.database === 'connected' ? 'Koneksi Sempurna: Server & Database OK' : 'Database MySQL Offline'
        };
    }
    return { online: false, message: `Server Merespon Error: ${response.status}` };
  } catch (e: any) {
    return { online: false, message: 'VPS Tidak Dapat Dijangkau (Server Mati atau Salah Port).' };
  }
};
