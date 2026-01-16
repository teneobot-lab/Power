
import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types';
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, RotateCcw, Settings, X, Wifi, Save, CheckCircle2, Loader2, Key } from 'lucide-react';
import { verifyPassword } from '../utils/security';
import { checkServerConnection } from '../services/api';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  isLoadingData: boolean;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, isLoadingData, settings, onUpdateSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Server Config State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempVpsUrl, setTempVpsUrl] = useState(settings?.vpsApiUrl || '/');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');
  const [cryptoWarning, setCryptoWarning] = useState(false);

  useEffect(() => {
    // Check for Secure Context (HTTPS or Localhost) because Web Crypto API requires it
    if (typeof crypto !== 'undefined' && typeof crypto.subtle === 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setCryptoWarning(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAnimating(true);

    try {
        if (!username.trim()) throw new Error('Username wajib diisi');
        if (!password.trim()) throw new Error('Password wajib diisi');

        // Cari user berdasarkan username
        const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (foundUser) {
            if (foundUser.status === 'inactive') {
                 throw new Error('Akun ini telah dinonaktifkan. Hubungi Admin.');
            } 
            
            // Verifikasi Hash Password
            try {
                const isValid = await verifyPassword(password, foundUser.password || '');
                if (isValid) {
                    onLogin(foundUser);
                } else {
                    throw new Error('Password yang Anda masukkan salah.');
                }
            } catch (hashError: any) {
                console.error("Hash error:", hashError);
                if (hashError.message && hashError.message.includes("subtle")) {
                    throw new Error("Browser Anda memblokir fitur login di koneksi HTTP (Tidak Aman). Gunakan HTTPS atau Localhost.");
                }
                throw hashError;
            }
        } else {
             if (users.length === 0) {
                 throw new Error('Database user kosong/belum termuat. Coba refresh atau cek koneksi server.');
             }
             throw new Error('Username tidak ditemukan.');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  const handleFactoryReset = () => {
    if (confirm("Reset Data Lokal? Ini akan menghapus pengaturan yang tersimpan di browser dan kembali ke default (Proxy Mode).")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const handleTestConnection = async () => {
      setConnectionStatus('checking');
      const result = await checkServerConnection(tempVpsUrl);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const handleSaveConfig = () => {
      if (onUpdateSettings && settings) {
          onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
          alert("Pengaturan server disimpan. Aplikasi akan mencoba menghubungkan ulang...");
          setIsConfigOpen(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Konfigurasi Server"
        >
            <Settings className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Power Inventory</h1>
            <p className="text-slate-400 text-sm">Masuk menggunakan Akun Anda</p>
        </div>

        {cryptoWarning && (
            <div className="mb-6 bg-amber-500/20 border border-amber-500/30 p-4 rounded-xl flex gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-200">
                    <strong>Peringatan Keamanan:</strong> Anda mengakses via HTTP (Tidak Aman). Login mungkin gagal karena browser memblokir fitur enkripsi password. Harap gunakan <strong>HTTPS</strong> atau akses via <strong>localhost</strong>.
                </p>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Username</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-600"
                    placeholder="Masukkan username"
                    disabled={isAnimating}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-600"
                        placeholder="••••••••"
                        disabled={isAnimating}
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating || isLoadingData}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnimating || isLoadingData ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        <LogIn className="w-5 h-5" />
                        Masuk Aplikasi
                    </>
                )}
            </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400 mb-4">
                <Key className="w-3 h-3" />
                Default: <strong>admin</strong> / <strong>admin22</strong>
             </div>
             
             <button 
                type="button"
                onClick={handleFactoryReset}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-rose-400 transition-colors mx-auto"
             >
                <RotateCcw className="w-3 h-3" />
                Reset Data Lokal
             </button>
        </div>
      </div>

      {/* Server Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Konfigurasi Server</h3>
                    <button onClick={() => setIsConfigOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-400 mb-2">
                        Masukkan URL API VPS atau gunakan tanda <code>/</code> untuk koneksi otomatis (Proxy).
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">VPS API URL</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                                placeholder="http://ip-vps:3000 atau /"
                                value={tempVpsUrl}
                                onChange={(e) => setTempVpsUrl(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                            Tips: Masukkan <code className="text-white font-mono bg-slate-800 px-1 rounded">/</code> jika aplikasi di-hosting satu domain dengan backend atau menggunakan Proxy Mode.
                        </p>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleTestConnection} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center justify-center gap-2 border border-slate-700">
                            {connectionStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                            Tes Koneksi
                        </button>
                    </div>

                    {connectionMsg && (
                        <div className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {connectionMsg}
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-slate-400 text-xs font-bold hover:text-white">Batal</button>
                        <button onClick={handleSaveConfig} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Save className="w-3 h-3" /> Simpan & Hubungkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// Helper for AlertTriangle icon which was missing in original imports
const AlertTriangle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

export default LoginPage;
