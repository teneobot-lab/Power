
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from '../types';
import { generateId } from './utils/storageUtils';
import { checkServerConnection } from './services/api';
import { Save, Shield, Plus, Edit2, Trash2, X, Settings, MonitorPlay, Globe, Loader2, Wifi, Youtube, Video, Link, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Clock, Database } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'media' | 'cloud'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'partial'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async (type: 'vps' | 'gas') => {
      const url = type === 'vps' ? tempSettings.vpsApiUrl : tempSettings.viteGasUrl;
      if (!url) {
          setConnectionStatus('failed');
          setConnectionMsg('URL tidak boleh kosong.');
          return;
      }
      setConnectionStatus('checking');
      const result = await checkServerConnection(url);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const handleManualSync = async () => {
      if (!onFullSyncToSheets) return;
      setIsSyncing(true);
      try {
          await onFullSyncToSheets();
      } catch (e) {
          console.error("Sync error in panel:", e);
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Database className="w-4 h-4" /> 
            <span>Pengaturan Server</span>
          </button>
          <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <FileSpreadsheet className="w-4 h-4" /> 
            <span>Integrasi Sheets</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Shield className="w-4 h-4" /> 
            <span>Manajemen Akses</span>
          </button>
          <button onClick={() => setActiveTab('media')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'media' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <MonitorPlay className="w-4 h-4" /> 
            <span>Media Center</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                 <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                   <Globe className="w-6 h-6 text-blue-500" /> 
                   Endpoint Configuration (VPS)
                 </h2>
                 <p className="text-slate-500 text-sm mb-6">Masukkan URL API VPS untuk database MySQL.</p>
                 
                 <div className="space-y-8">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Backend VPS URL</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                          <input type="text" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" placeholder="http://ip-vps:3000" value={tempSettings.vpsApiUrl} onChange={(e) => setTempSettings({...tempSettings, vpsApiUrl: e.target.value})} />
                          <button onClick={() => handleTestConnection('vps')} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2">
                             {connectionStatus === 'checking' && activeTab === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                             Tes VPS
                          </button>
                      </div>
                      {connectionMsg && activeTab === 'settings' && (
                        <div className={`mt-3 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                            {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {connectionMsg}
                        </div>
                      )}
                    </div>
                    <div className="pt-6 border-t flex items-center gap-4">
                       <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95">
                          <Save className="w-4 h-4" /> Simpan Konfigurasi VPS
                       </button>
                       {isSaved && activeTab === 'settings' && <span className="text-emerald-600 text-sm font-bold animate-pulse"><CheckCircle2 className="inline w-4 h-4 mr-1" /> Tersimpan</span>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                            <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> 
                            Integrasi Google Sheets
                        </h2>
                    </div>
                    <p className="text-slate-500 text-sm mb-8">Konfigurasi URL Google Apps Script (GAS) untuk backup data ke Spreadsheet.</p>

                    <div className="mb-10 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                         <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">GAS Deployment URL</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="url" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono" placeholder="https://script.google.com/macros/s/.../exec" value={tempSettings.viteGasUrl} onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} />
                                <button onClick={() => handleTestConnection('gas')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2">
                                    {connectionStatus === 'checking' && activeTab === 'cloud' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                                    Tes URL GAS
                                </button>
                            </div>
                         </div>
                         
                         {tempSettings.viteGasUrl && !tempSettings.viteGasUrl.includes('script.google.com') && (
                             <div className="flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase tracking-tight">
                                <AlertCircle className="w-3 h-3" /> URL GAS tidak valid (Harus dari script.google.com)
                             </div>
                         )}

                        {connectionMsg && activeTab === 'cloud' && (
                            <div className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {connectionMsg}
                            </div>
                        )}

                        <div className="pt-2 border-t flex items-center gap-4">
                            <button onClick={handleSaveSettings} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md">
                                Simpan URL GAS
                            </button>
                            {isSaved && activeTab === 'cloud' && <span className="text-emerald-600 text-[10px] font-bold animate-pulse uppercase"><CheckCircle2 className="inline w-3 h-3 mr-1" /> Berhasil Disimpan</span>}
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                                <RefreshCw className={`w-6 h-6 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">Sinkronisasi Total ke Spreadsheet</h4>
                                <p className="text-xs text-slate-500 mt-1">Mengirim seluruh database ke Spreadsheet sesuai kolom yang sudah diratakan (flattened).</p>
                                
                                <div className="mt-6 flex items-center gap-4">
                                    <button 
                                        onClick={handleManualSync}
                                        disabled={isSyncing || !tempSettings.viteGasUrl.includes('script.google.com')}
                                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Sync Sekarang
                                    </button>
                                    
                                    {tempSettings.lastSheetSync && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <Clock className="w-3 h-3" />
                                            Last Sync: {new Date(tempSettings.lastSheetSync).toLocaleString('id-ID')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Manajemen Pengguna</h2>
                  <button onClick={() => setIsUserModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700">Tambah User</button>
               </div>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingUser(user); setUserFormData(user); setIsUserModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200">
                <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-3">
                    <MonitorPlay className="w-7 h-7 text-rose-500" /> Media Center
                </h2>
                <p className="text-slate-500 text-sm italic">Fitur Media Center sedang dalam pengembangan.</p>
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
            <form onSubmit={(e) => {
                 e.preventDefault();
                 const newUser: User = { 
                     id: editingUser ? editingUser.id : generateId(), 
                     name: userFormData.name || '', 
                     username: userFormData.username || '', 
                     role: (userFormData.role as UserRole) || 'staff', 
                     status: (userFormData.status as 'active' | 'inactive') || 'active', 
                 };
                 if (editingUser) onUpdateUser(newUser); else onAddUser(newUser);
                 setIsUserModalOpen(false);
            }} className="p-8 space-y-5">
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} /></div>
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
