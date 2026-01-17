import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Settings, X, Wifi, Save, Loader2, Terminal } from 'lucide-react';
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
        if (!cleanUsername || !cleanPassword) throw new Error('Parameters invalid');
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
            else throw new Error('Authorization rejected: Key mismatch');
        } else throw new Error('Identity node unknown');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Visual FX Layers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#6D5DF6]/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#22D3EE]/5 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      </div>

      <div className="w-full max-w-md bg-[#0F172A]/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-12 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-10 right-10 p-2.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
            <Settings size={20} />
        </button>

        <div className="text-center mb-14">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#6D5DF6] to-[#8B5CF6] rounded-[2rem] mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(109,93,246,0.3)] mb-8 transform rotate-6 hover:rotate-0 transition-all duration-500">
                <Terminal size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase font-manrope">Steel Core</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] leading-none">Global Ledger Interface</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Identity Protocol</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4.5 text-white outline-none focus:ring-2 focus:ring-[#6D5DF6]/50 transition-all placeholder:text-slate-700 text-sm font-bold"
                    placeholder="Enter Username"
                />
            </div>

            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Security Cipher</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4.5 text-white outline-none focus:ring-2 focus:ring-[#6D5DF6]/50 transition-all placeholder:text-slate-700 text-sm font-bold"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-3">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating}
                className="w-full bg-[#6D5DF6] hover:bg-[#5B4EDB] text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4 text-[12px] uppercase tracking-[0.2em] font-manrope"
            >
                {isAnimating ? <Loader2 size={20} className="animate-spin" /> : <><LogIn size={18} /> Establish Link</>}
            </button>
        </form>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
             <div className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black flex items-center justify-center gap-3">
                 <ShieldCheck size={14} className="text-[#6D5DF6]/60" />
                 Encrypted Node Connection
             </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F14]/95 backdrop-blur-2xl p-6">
            <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="font-black text-white uppercase text-[11px] tracking-widest">Network Config</h3>
                    <button onClick={() => setIsConfigOpen(false)} className="p-2.5 hover:bg-white/5 rounded-xl"><X size={20} className="text-slate-500" /></button>
                </div>
                <div className="p-10 space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Relay Endpoint</label>
                        <input className="w-full bg-[#0B0F14] border border-white/10 rounded-2xl px-6 py-4 text-sm text-[#22D3EE] outline-none focus:ring-2 focus:ring-[#6D5DF6]/50 font-mono" value={tempVpsUrl} onChange={(e) => setTempVpsUrl(e.target.value)} />
                    </div>
                    <button onClick={async () => {
                        setConnectionStatus('checking');
                        const r = await checkServerConnection(tempVpsUrl);
                        setConnectionStatus(r.online ? 'success' : 'failed');
                    }} className="w-full py-4 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 flex items-center justify-center gap-3 transition-all">
                        {connectionStatus === 'checking' ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                        Ping Relay
                    </button>
                    <div className="pt-4 flex justify-end">
                        <button onClick={() => {
                            if (onUpdateSettings && settings) onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
                            setIsConfigOpen(false);
                        }} className="px-10 py-4 bg-[#6D5DF6] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5B4EDB] shadow-lg flex items-center gap-3">
                            <Save size={16} /> Save Node
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