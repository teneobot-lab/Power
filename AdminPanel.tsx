
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from './types';
import { generateId } from './utils/storageUtils';
import { checkServerConnection } from './services/api';
import { Save, Shield, Plus, Edit2, Trash2, X, Settings, MonitorPlay, Globe, Loader2, Wifi, Youtube, Video, Link, CheckCircle2, AlertCircle } from 'lucide-react';

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
  
  // Media States
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [mediaType, setMediaType] = useState<'youtube' | 'tiktok'>('youtube');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Connection Test State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'partial'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
      if (!tempSettings.viteGasUrl) return;
      setConnectionStatus('checking');
      const result = await checkServerConnection(tempSettings.viteGasUrl);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const extractVideoId = (url: string, type: 'youtube' | 'tiktok') => {
    if (type === 'youtube') {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    } else {
      const match = url.match(/video\/(\d+)/);
      return match ? match[1] : null;
    }
  };

  const handleAddMedia = () => {
    setMediaError(null);
    if (!mediaUrl || !mediaTitle) {
      setMediaError("URL dan Judul wajib diisi.");
      return;
    }

    const embedId = extractVideoId(mediaUrl, mediaType);
    if (!embedId) {
      setMediaError("URL Video tidak valid.");
      return;
    }

    const newItem: MediaItem = {
      id: generateId(),
      type: mediaType,
      url: mediaUrl,
      embedId: embedId,
      title: mediaTitle,
      addedAt: new Date().toISOString()
    };

    const updatedMedia = [...(tempSettings.mediaItems || []), newItem];
    const newSettings = { ...tempSettings, mediaItems: updatedMedia };
    setTempSettings(newSettings);
    onUpdateSettings(newSettings);
    
    setMediaUrl('');
    setMediaTitle('');
    setShowAddMedia(false);
  };

  const handleDeleteMedia = (id: string) => {
    const updatedMedia = (tempSettings.mediaItems || []).filter(m => m.id !== id);
    const newSettings = { ...tempSettings, mediaItems: updatedMedia };
    setTempSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const openUserModal = (user?: User) => {
    if (user) { setEditingUser(user); setUserFormData(user); } 
    else { setEditingUser(null); setUserFormData({ name: '', username: '', role: 'staff', status: 'active' }); }
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
          <button onClick={() => setActiveTab('media')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'media' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <MonitorPlay className="w-4 h-4" /> 
            <span>Media Center</span>
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
                          <input type="url" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" placeholder="http://ip-vps:3000" value={tempSettings.viteGasUrl} onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} />
                          <button onClick={handleTestConnection} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800">Tes Koneksi</button>
                      </div>
                    </div>
                    <div className="pt-6 border-t flex items-center gap-4">
                       <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg">Simpan & Aktifkan Cloud</button>
                       {isSaved && <span className="text-emerald-600 text-sm font-bold animate-pulse"><CheckCircle2 className="inline w-4 h-4 mr-1" /> Tersimpan</span>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Manajemen Pengguna</h2>
                  <button onClick={() => openUserModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700">Tambah User</button>
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
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => openUserModal(user)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><MonitorPlay className="w-6 h-6 text-rose-500" /> Manajemen Konten Media</h2>
                    <button onClick={() => setShowAddMedia(!showAddMedia)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 hover:bg-rose-700"><Plus className="w-4 h-4" /> Tambah Video</button>
                  </div>

                  {showAddMedia && (
                    <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Platform</label>
                          <div className="flex bg-white p-1 rounded-xl border">
                            <button onClick={() => setMediaType('youtube')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${mediaType === 'youtube' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}><Youtube className="w-4 h-4" /> YouTube</button>
                            <button onClick={() => setMediaType('tiktok')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${mediaType === 'tiktok' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}><Video className="w-4 h-4" /> TikTok</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Judul Konten</label>
                          <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm outline-none" placeholder="Contoh: Tutorial Warehouse" value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">URL Video</label>
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input type="url" className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none" placeholder="https://..." value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                        </div>
                      </div>
                      {mediaError && <div className="text-rose-600 text-[10px] font-bold mb-4 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {mediaError}</div>}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddMedia(false)} className="px-4 py-2 text-slate-500 font-bold text-xs">Batal</button>
                        <button onClick={handleAddMedia} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700">Simpan ke Daftar</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(tempSettings.mediaItems || []).map(item => (
                      <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-all">
                        <div className="aspect-video bg-slate-200 relative flex items-center justify-center overflow-hidden">
                           {item.type === 'youtube' ? (
                             <img src={`https://img.youtube.com/vi/${item.embedId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80" />
                           ) : (
                             <div className="flex flex-col items-center gap-2"><Video className="w-8 h-8 text-slate-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">TikTok Preview</span></div>
                           )}
                           <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded-lg flex items-center gap-1.5">
                             {/* Fix: Wrap conditional JSX expression in curly braces to prevent syntax errors */}
                             {item.type === 'youtube' ? <Youtube className="w-3 h-3 text-rose-500" /> : <Video className="w-3 h-3 text-white" />} 
                             <span className="text-[9px] font-bold text-white uppercase">{item.type}</span>
                           </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{item.url}</p>
                          </div>
                          <div className="mt-4 flex justify-end"><button onClick={() => handleDeleteMedia(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></div>
                        </div>
                      </div>
                    ))}
                    {(tempSettings.mediaItems || []).length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400 italic">Belum ada konten media yang ditambahkan.</div>
                    )}
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
            <form onSubmit={handleUserSubmit} className="p-8 space-y-5">
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
