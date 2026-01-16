
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from '../types';
import { generateId } from '../utils/storageUtils';
import { checkServerConnection } from '../services/api';
import { Save, User as UserIcon, Settings, Shield, Plus, Edit2, Trash2, X, Globe, Loader2, Wifi, WifiOff, Activity, Database, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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
  users, onAddUser, onUpdateUser, onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'media'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  
  // Connection Test State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'partial'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN' | undefined>(undefined);

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
      if (!tempSettings.viteGasUrl) {
          setConnectionStatus('failed');
          setConnectionMsg('Silakan isi URL VPS terlebih dahulu.');
          return;
      }
      
      setConnectionStatus('checking');
      setLatency(undefined);
      setDbStatus(undefined);

      const result = await checkServerConnection(tempSettings.viteGasUrl);
      
      if (result.online) {
          if (result.dbStatus === 'DISCONNECTED') {
             setConnectionStatus('partial');
          } else {
             setConnectionStatus('success');
          }
          setConnectionMsg(result.message);
          setLatency(result.latency);
          setDbStatus(result.dbStatus);
      } else {
          setConnectionStatus('failed');
          setConnectionMsg(result.message);
      }
  };

  const openUserModal = (user?: User) => {
    if (user) { 
        setEditingUser(user); 
        setUserFormData(user); 
    } 
    else { 
        setEditingUser(null); 
        setUserFormData({ name: '', username: '', role: 'staff', status: 'active' }); 
    }
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.username) return;
    
    const newUser: User = { 
        id: editingUser ? editingUser.id : generateId(), 
        name: userFormData.name || '', 
        username: userFormData.username || '', 
        role: (userFormData.role as UserRole) || 'staff', 
        status: (userFormData.status as 'active' | 'inactive') || 'active', 
        lastLogin: editingUser ? editingUser.lastLogin : undefined 
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
            <Settings className="w-4 h-4" /> 
            <span>Pengaturan Server</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Shield className="w-4 h-4" /> 
            <span>Manajemen Akses</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                 <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
                   <Globe className="w-6 h-6 text-blue-500" /> 
                   Endpoint Configuration
                 </h2>
                 
                 <div className="space-y-8">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Backend / VPS URL</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1 group">
                            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                              type="url" 
                              className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-slate-50/50 focus:bg-white transition-all" 
                              placeholder="http://ip-vps:3000" 
                              value={tempSettings.viteGasUrl} 
                              onChange={(e) => { 
                                setTempSettings({...tempSettings, viteGasUrl: e.target.value}); 
                                setConnectionStatus('idle'); 
                              }} 
                            />
                          </div>
                          <button 
                            onClick={handleTestConnection} 
                            disabled={connectionStatus === 'checking'} 
                            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
                              connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              connectionStatus === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                             {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                             Tes Koneksi
                          </button>
                      </div>
                    </div>

                    {/* Enhanced Status Dashboard */}
                    {connectionStatus !== 'idle' && (
                      <div className={`p-6 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                        connectionStatus === 'success' ? 'bg-emerald-50/50 border-emerald-100' :
                        connectionStatus === 'partial' ? 'bg-amber-50/50 border-amber-100' :
                        'bg-rose-50/50 border-rose-100'
                      }`}>
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                               <div className={`p-3 rounded-full ${
                                 connectionStatus === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                 connectionStatus === 'partial' ? 'bg-amber-100 text-amber-600' :
                                 'bg-rose-100 text-rose-600'
                               }`}>
                                  {connectionStatus === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-800 mb-1">{connectionStatus === 'success' ? 'Koneksi Berhasil' : connectionStatus === 'partial' ? 'Terhubung Sebagian' : 'Koneksi Gagal'}</h4>
                                  <p className="text-sm text-slate-600 leading-relaxed">{connectionMsg}</p>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:flex md:gap-8 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-8">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Latency
                                  </span>
                                  <span className={`text-lg font-black ${latency && latency < 200 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {latency ? `${latency}ms` : '--'}
                                  </span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                    <Database className="w-3 h-3" /> MySQL DB
                                  </span>
                                  <span className={`text-sm font-black uppercase ${dbStatus === 'CONNECTED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {dbStatus || 'UNKNOWN'}
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="pt-6 border-t flex items-center gap-4">
                       <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95">
                         <Save className="w-4 h-4" /> 
                         Simpan & Aktifkan Cloud
                       </button>
                       {isSaved && <span className="text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-left-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Tersimpan</span>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" /> 
                    Manajemen Pengguna
                  </h2>
                  <button onClick={() => openUserModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> 
                    Tambah User
                  </button>
               </div>
               
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b">
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <th className="px-6 py-4">Informasi User</th>
                         <th className="px-6 py-4">Role</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Aksi</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{user.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">@{user.username}</div>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {user.role}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {user.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-1">
                                   <button onClick={() => openUserModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                   <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                               </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal (Keep same but consistent styling) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-slate-800 uppercase tracking-tight">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all shadow-sm"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-8 space-y-5">
               <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                   <input required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
               </div>
               <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                   <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</label>
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-sm appearance-none bg-slate-50/50" value={userFormData.role || 'staff'} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-sm appearance-none bg-slate-50/50" value={userFormData.status || 'active'} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
               </div>
               <div className="pt-6 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                 <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">Simpan User</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
