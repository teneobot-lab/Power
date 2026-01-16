
import React, { useState } from 'react';
import { User } from '../types';
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { verifyPassword } from '../utils/security';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  isLoadingData: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, isLoadingData }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

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
            // Note: Jika password di database masih plain text (legacy), validasi ini mungkin gagal.
            // Namun untuk sistem baru kita asumsikan sudah hash.
            const isValid = await verifyPassword(password, foundUser.password || '');
            
            if (isValid) {
                // Login successful
                onLogin(foundUser);
            } else {
                 throw new Error('Password yang Anda masukkan salah.');
            }
        } else {
             throw new Error('Username tidak ditemukan.');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Power Inventory</h1>
            <p className="text-slate-400 text-sm">Masuk menggunakan Akun Anda</p>
        </div>

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

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-500 text-xs">
                SmartStock System v2.0 &copy; 2024
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
