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
        if (!cleanUsername || !cleanPassword) throw new Error('Input Required');
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
            else throw new Error('Access Denied: Invalid Key');
        } else throw new Error('Entity Unknown');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-6 right-6 p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
        >
            <Settings className="w-5 h-5 glow-icon" />
        </button>

        <div className="text-center mb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-900 rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-6 transform rotate-3 hover:rotate-0 transition-all duration-500 group border border-blue-400/20">
                <ShieldCheck className="w-12 h-12 text-white glow-icon group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Power Control</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Integrated Intelligence Layer</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div className="group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-2 transition-colors group-focus-within:text-blue-500">Node Identifier</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-700 text-sm font-bold"
                    placeholder="Enter Username"
                />
            </div>

            <div className="group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-2 transition-colors group-focus-within:text-blue-500">Access Cipher</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-700 text-sm font-bold"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
            >
                {isAnimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 glow-icon" /> Initialize Connection</>}
            </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-800 text-center flex flex-col items-center gap-4">
             <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                 <Terminal className="w-3.5 h-3.5 text-blue-500 glow-icon" />
                 Protocol: <span className="text-slate-300">ADMINISTRATOR</span>
             </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                    <h3 className="font-black text-white flex items-center gap-2 uppercase text-sm tracking-widest"><Settings className="w-5 h-5 text-blue-500" /> Neural Link Config</h3>
                    <button onClick={() => setIsConfigOpen(false)} className="p-2 hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Uplink URL</label>
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-blue-400 outline-none focus:ring-2 focus:ring-blue-600 font-mono" value={tempVpsUrl} onChange={(e) => setTempVpsUrl(e.target.value)} />
                    </div>
                    <button onClick={async () => {
                        setConnectionStatus('checking');
                        const r = await checkServerConnection(tempVpsUrl);
                        setConnectionStatus(r.online ? 'success' : 'failed');
                    }} className="w-full py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95">
                        {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        Diagnostic Test
                    </button>
                    <div className="pt-4 flex justify-end">
                        <button onClick={() => {
                            if (onUpdateSettings && settings) onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
                            setIsConfigOpen(false);
                        }} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/20">
                            <Save className="w-4 h-4" /> Finalize Config
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