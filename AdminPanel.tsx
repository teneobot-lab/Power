
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from './types';
import { generateId } from './utils/storageUtils';
import { Save, Shield, Plus, Edit2, Trash2, X, Settings, MonitorPlay, Globe, Loader2, CloudLightning, Check, AlertTriangle, FileSpreadsheet, Youtube, Video, ArrowLeft } from 'lucide-react';

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
  users, onAddUser, onUpdateUser, onDeleteUser,
  onFullSyncToSheets
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'media'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [activePlatform, setActivePlatform] = useState<'none' | 'youtube' | 'tiktok'>('none');
  const [currentVideo, setCurrentVideo] = useState<MediaItem | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showAddMedia, setShowAddMedia] = useState(false);

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleFullSync = async () => {
    if (!onFullSyncToSheets) return;
    setIsSyncing(true);
    await onFullSyncToSheets();
    setIsSyncing(false);
  };

  const handleUseVercelProxy = () => { setTempSettings(prev => ({ ...prev, viteGasUrl: '/' })); };

  const extractVideoId = (url: string): { type: 'youtube' | 'tiktok', id: string } | null => {
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) return { type: 'youtube', id: ytMatch[1] };
    const ttRegex = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
    const ttMatch = url.match(ttRegex);
    if (ttMatch && ttMatch[1]) return { type: 'tiktok', id: ttMatch[1] };
    return null;
  };

  const handleAddMedia = () => {
    setMediaError(null);
    if (!mediaUrl.trim() || !mediaTitle.trim()) { setMediaError("URL dan Judul wajib diisi."); return; }
    const extraction = extractVideoId(mediaUrl);
    if (!extraction) { setMediaError("URL tidak valid."); return; }
    if (extraction.type !== activePlatform) { setMediaError(`Platform mismatch.`); return; }
    const newMedia: MediaItem = { id: generateId(), type: extraction.type, url: mediaUrl, embedId: extraction.id, title: mediaTitle, addedAt: new Date().toISOString() };
    const updatedMediaItems = [...(tempSettings.mediaItems || []), newMedia];
    setTempSettings(prev => ({ ...prev, mediaItems: updatedMediaItems }));
    onUpdateSettings({ ...tempSettings, mediaItems: updatedMediaItems });
    setMediaUrl(''); setMediaTitle(''); setShowAddMedia(false); setCurrentVideo(newMedia);
  };

  const openUserModal = (user?: User) => {
    if (user) { 
        setEditingUser(user); 
        setUserFormData({ ...user }); 
    } 
    else { 
        setEditingUser(null); 
        setUserFormData({ name: '', username: '', password: '', role: 'staff', status: 'active' }); 
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
        password: userFormData.password || '', // Password included
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
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><Settings className="w-4 h-4" /> Pengaturan Sistem</button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><Shield className="w-4 h-4" /> Manajemen User</button>
          <button onClick={() => setActiveTab('media')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'media' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><MonitorPlay className="w-4 h-4" /> Media Center</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-500" /> Konfigurasi Server</h2>
                 <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Backend / VPS URL</label>
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="url" className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" placeholder="http://ip-vps:3000" value={tempSettings.viteGasUrl} onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} />
                          </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t flex items-center gap-4">
                       <button onClick={handleSaveSettings} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all"><Save className="w-4 h-4" /> Simpan Konfigurasi</button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-slate-500" /> Manajemen User</h2>
                  <button onClick={() => openUserModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"><Plus className="w-4 h-4" /> Tambah User</button>
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50">
                       <tr className="border-b text-xs font-semibold text-slate-500 uppercase">
                         <th className="px-6 py-4">User</th>
                         <th className="px-6 py-4">Role</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Aksi</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{user.name}</div>
                                <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                           </td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>{user.role}</span></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{user.status}</span></td>
                           <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2">
                                   <button onClick={() => openUserModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                   <button onClick={() => onDeleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                               </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}

          {activeTab === 'media' && (
             <div className="p-12 text-center text-slate-400 font-medium italic">Modul Hiburan dalam pengembangan.</div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-slate-800">{editingUser ? 'Edit User' : 'User Baru'}</h3>
               <button onClick={() => setIsUserModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                   <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                        <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} />
                   </div>
                   <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                        <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
                   </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                    <select className="w-full px-3 py-2 border rounded-lg outline-none text-sm" value={userFormData.role || 'staff'} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select className="w-full px-3 py-2 border rounded-lg outline-none text-sm" value={userFormData.status || 'active'} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                  </div>
               </div>
               <div className="pt-4 flex justify-end gap-3 border-t">
                   <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium">Batal</button>
                   <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all">Simpan User</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
