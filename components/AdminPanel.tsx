
import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, UserRole } from '../types';
import { generateId } from '../utils/storageUtils';
import { checkServerConnection } from '../services/api';
import { hashPassword } from '../utils/security';
import { Save, Shield, X, Globe, Loader2, Wifi, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Clock, Database, ServerCrash, FileCode, Terminal, Copy, FileJson, FileText, Cpu, ChevronRight, Play, Trash2, Activity, HardDrive, Power, Edit2, Wrench, Command, Key, MonitorPlay } from 'lucide-react';

interface AdminPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onFullSyncToSheets?: () => Promise<boolean>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  settings, onUpdateSettings, 
  users, onAddUser, onUpdateUser, onDeleteUser, onFullSyncToSheets
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'cloud' | 'migration' | 'terminal'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'partial'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  // Terminal State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "> Connected to SmartStock Linux Shell...",
    "> WARNING: You have root/sudo access depending on server config.",
    "> Use 'npm install', 'ls', 'whoami', 'git pull' etc.",
    "> Interactive commands (nano, vim, password prompts) NOT supported."
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isExecutingCmd, setIsExecutingCmd] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTempSettings(settings); }, [settings]);
  
  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs, activeTab]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    addTerminalLog("Settings saved successfully.");
  };

  const handleTestConnection = async (type: 'vps' | 'gas') => {
      const url = type === 'vps' ? tempSettings.vpsApiUrl : tempSettings.viteGasUrl;
      addTerminalLog(`Initiating connection test to ${type.toUpperCase()}...`);
      
      if (!url) {
          setConnectionStatus('failed');
          setConnectionMsg('URL tidak boleh kosong.');
          addTerminalLog(`Error: ${type.toUpperCase()} URL is empty.`);
          return;
      }
      setConnectionStatus('checking');
      const result = await checkServerConnection(url);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
      addTerminalLog(`Result: ${result.message} (Latency: ${result.latency || 'N/A'}ms)`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kode berhasil disalin!");
  };

  const addTerminalLog = (msg: string) => {
      // Handle multiline output from shell
      const lines = msg.split('\n');
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const newLogs = lines.map(line => line.trim() === '' ? '' : `[${timestamp}] ${line}`);
      setTerminalLogs(prev => [...prev, ...newLogs]);
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!terminalInput.trim()) return;
      
      const cmd = terminalInput.trim();
      setTerminalLogs(prev => [...prev, `$ ${cmd}`]);
      setTerminalInput('');
      setIsExecutingCmd(true);

      if (cmd.toLowerCase() === 'clear') {
          setTerminalLogs(["> Console cleared."]);
          setIsExecutingCmd(false);
          return;
      }

      try {
          const cleanBase = tempSettings.vpsApiUrl === '/' ? '' : tempSettings.vpsApiUrl.replace(/\/$/, '');
          const response = await fetch(`${cleanBase}/api/terminal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmd })
          });

          if (!response.ok) {
              if (response.status === 404) {
                  addTerminalLog(`EXECUTION ERROR: Endpoint 404.`);
                  throw new Error("Terminal endpoint missing (404).");
              }
              throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          if (data.output) {
              addTerminalLog(data.output);
          } else {
              addTerminalLog("No output returned.");
          }
      } catch (error: any) {
          addTerminalLog(`ERROR: ${error.message}`);
      } finally {
          setIsExecutingCmd(false);
      }
  };

  // --- SAVE USER HANDLER ---
  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalPassword = userFormData.password;

      // Logic: Hash password if provided
      if (userFormData.password && userFormData.password.trim() !== '') {
          finalPassword = await hashPassword(userFormData.password);
      } else if (editingUser) {
          finalPassword = editingUser.password;
      } else {
          finalPassword = await hashPassword('123456');
      }

      const newUser: User = { 
          id: editingUser ? editingUser.id : generateId(), 
          name: userFormData.name || '', 
          username: userFormData.username || '', 
          role: (userFormData.role as UserRole) || 'staff', 
          status: (userFormData.status as 'active' | 'inactive') || 'active', 
          password: finalPassword
      };

      if (editingUser) onUpdateUser(newUser); else onAddUser(newUser);
      setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Globe className="w-4 h-4" /> 
            <span>Pengaturan Server</span>
          </button>
          <button onClick={() => setActiveTab('terminal')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'terminal' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Terminal className="w-4 h-4" /> 
            <span>Linux Terminal</span>
          </button>
          <button onClick={() => setActiveTab('migration')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'migration' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <ServerCrash className="w-4 h-4" /> 
            <span>Setup & Migrasi</span>
          </button>
          <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <FileSpreadsheet className="w-4 h-4" /> 
            <span>Integrasi Sheets</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Shield className="w-4 h-4" /> 
            <span>Manajemen Akses</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                 <Database className="w-6 h-6 text-blue-500" /> 
                 VPS Configuration
               </h2>
               <p className="text-slate-500 text-sm mb-8 italic">Pastikan VPS Anda sudah menjalankan API Backend sebelum mengetes koneksi.</p>
               <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Backend API URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-slate-50" 
                            placeholder="http://ip-vps:3000 atau /" 
                            value={tempSettings.vpsApiUrl} 
                            onChange={(e) => setTempSettings({...tempSettings, vpsApiUrl: e.target.value})} 
                        />
                        <button onClick={() => handleTestConnection('vps')} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2">
                           {connectionStatus === 'checking' && activeTab === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                           Tes VPS
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        Gunakan <code className="bg-slate-100 px-1 rounded font-mono text-slate-600">/</code> jika aplikasi satu domain dengan backend (Proxy).
                    </p>
                    {connectionMsg && activeTab === 'settings' && (
                      <div className={`mt-3 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {connectionMsg}
                      </div>
                    )}
                  </div>
                  <div className="pt-6 border-t flex items-center gap-4">
                     <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-4 h-4" /> Simpan Pengaturan
                     </button>
                     {isSaved && activeTab === 'settings' && <span className="text-emerald-600 text-sm font-bold animate-pulse"><CheckCircle2 className="inline w-4 h-4 mr-1" /> Tersimpan</span>}
                  </div>
               </div>
            </div>
          )}
          
          {/* ... Other Tabs Content ... */}
          
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in duration-300">
               <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500" /> Manajemen Akses</h2>
               <div className="overflow-hidden border border-slate-100 rounded-xl">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b">
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4"><div className="font-bold text-slate-900">{user.name}</div><div className="text-[11px] text-slate-500">@{user.username}</div></td>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{user.role}</span></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{user.status}</span></td>
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingUser(user); setUserFormData({ ...user, password: '' }); setIsUserModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   <div className="p-4 border-t bg-slate-50">
                        <button onClick={() => { setEditingUser(null); setUserFormData({}); setIsUserModalOpen(true); }} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700">Tambah User Baru</button>
                   </div>
               </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-slate-800 uppercase tracking-tight">{editingUser ? 'Edit User' : 'Tambah User'}</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-white rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-5">
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} /></div>
               
               <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                       Password {editingUser ? '(Kosongkan jika tidak ingin mengubah)' : '(Wajib)'}
                   </label>
                   <input 
                       type="password"
                       className="w-full px-4 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                       placeholder={editingUser ? "••••••••" : "Masukkan password baru"}
                       value={userFormData.password || ''}
                       onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                       required={!editingUser} 
                   />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Role</label><select className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.role || 'staff'} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label><select className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.status || 'active'} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
               </div>
               <div className="pt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Batal</button><button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
