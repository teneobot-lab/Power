import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Settings, X, Wifi, Save, Loader2, Database, Cloud, Terminal } from 'lucide-react';
import { verifyPassword } from '../utils/security';
import { checkServerConnection, loginUser } from '../services/api';

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
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempVpsUrl, setTempVpsUrl] = useState(settings?.vpsApiUrl || '/');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAnimating(true);
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
        if (!cleanUsername || !cleanPassword) throw new Error('Authentication parameters required');
        const vpsUrl = settings?.vpsApiUrl || '/';
        try {
            const result = await loginUser(vpsUrl, cleanUsername, cleanPassword);
            if (result.success && result.user) {
                onLogin(result.user);
                return;
            }
        } catch (serverErr) {}

        const foundUser = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
        if (foundUser) {
            const isValid = await verifyPassword(cleanPassword, foundUser.password || '');
            if (isValid) onLogin(foundUser);
            else throw new Error('Authorization failed: Node rejected access key');
        } else throw new Error('Unknown identity node');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* SaaS Background FX */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-600/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-600/5 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
      </div>

      <div className="w-full max-w-md bg-[#020617]/40 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.6)] p-12 relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-10 right-10 p-3 text-slate-600 hover:text-white hover:bg-white/5 rounded-full transition-all"
        >
            <Settings className="w-6 h-6" />
        </button>

        <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-10 transform rotate-6 hover:rotate-0 transition-all duration-700">
                <Terminal className="w-12 h-12 text-white glow-blue" />
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase">Power Core</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Supply Chain OS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
            <div className="group">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-blue-500 transition-colors">Credential Key</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0f172a]/60 border border-white/5 rounded-3xl px-6 py-4.5 text-white outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600/30 transition-all placeholder:text-slate-700 text-sm font-bold"
                    placeholder="Identify yourself"
                />
            </div>

            <div className="group">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-blue-500 transition-colors">Secure Cipher</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0f172a]/60 border border-white/5 rounded-3xl px-6 py-4.5 text-white outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600/30 transition-all placeholder:text-slate-700 text-sm font-bold"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-3xl text-[11px] font-bold flex items-center gap-4 animate-pulse">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2.5rem] shadow-2xl shadow-blue-600/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]"
            >
                {isAnimating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><LogIn className="w-5 h-5" /> Open System Link</>}
            </button>
        </form>

        <div className="mt-14 pt-8 border-t border-white/5 text-center">
             <div className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black flex items-center justify-center gap-3">
                 <ShieldCheck className="w-4 h-4 text-blue-500/60" />
                 Encrypted Link: <span className="text-slate-400">ACTIVE-TLS</span>
             </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/95 backdrop-blur-2xl p-6">
            <div className="bg-[#020617] border border-white/5 rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95">
                <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="font-black text-white flex items-center gap-3 uppercase text-xs tracking-widest">Connection Relay</h3>
                    <button onClick={() => setIsConfigOpen(false)} className="p-3 hover:bg-white/5 rounded-full"><X className="w-6 h-6 text-slate-500" /></button>
                </div>
                <div className="p-10 space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-1">Relay Endpoint</label>
                        <input className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-5 py-4 text-sm text-blue-400 outline-none focus:ring-2 focus:ring-blue-600/20 font-mono" value={tempVpsUrl} onChange={(e) => setTempVpsUrl(e.target.value)} />
                    </div>
                    <button onClick={async () => {
                        setConnectionStatus('checking');
                        const r = await checkServerConnection(tempVpsUrl);
                        setConnectionStatus(r.online ? 'success' : 'failed');
                    }} className="w-full py-4 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 flex items-center justify-center gap-3 transition-all">
                        {connectionStatus === 'checking' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                        Run Diagnostic
                    </button>
                    <div className="pt-4 flex justify-end">
                        <button onClick={() => {
                            if (onUpdateSettings && settings) onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
                            setIsConfigOpen(false);
                        }} className="px-10 py-4 bg-blue-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 flex items-center gap-3">
                            <Save className="w-4 h-4" /> Finalize Relay
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;