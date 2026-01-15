
import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from '../types';
import { generateId } from '../utils/storageUtils';
import { checkServerConnection } from '../services/api';
import { Save, User as UserIcon, Settings, Shield, Plus, Edit2, Trash2, X, Link, Check, MonitorPlay, Youtube, Video, AlertTriangle, CloudLightning, ArrowLeft, Play, ListVideo, Search, Globe, FileSpreadsheet, Loader2, Wifi, WifiOff, Activity } from 'lucide-react';

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
  
  // Connection Test State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

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
  
  const handleTestConnection = async () => {
      if (!tempSettings.viteGasUrl) {
          setConnectionStatus('failed');
          setConnectionMsg('URL belum diisi');
          return;
      }
      
      setConnectionStatus('checking');
      const result = await checkServerConnection(tempSettings.viteGasUrl);
      
      if (result.online) {
          setConnectionStatus('success');
          setConnectionMsg(result.message);
      } else {
          setConnectionStatus('failed');
          setConnectionMsg(result.message);
      }
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
    if (!extraction) { setMediaError("URL tidak valid. Dukungan: YouTube, TikTok (web link)."); return; }
    if (extraction.type !== activePlatform) { setMediaError(`Mode saat ini adalah ${activePlatform}, tapi tautan yang dimasukkan adalah ${extraction.type}.`); return; }
    const newMedia: MediaItem = { id: generateId(), type: extraction.type, url: mediaUrl, embedId: extraction.id, title: mediaTitle, addedAt: new Date().toISOString() };
    const updatedMediaItems = [...(tempSettings.mediaItems || []), newMedia];
    setTempSettings(prev => ({ ...prev, mediaItems: updatedMediaItems }));
    onUpdateSettings({ ...tempSettings, mediaItems: updatedMediaItems });
    setMediaUrl(''); setMediaTitle(''); setShowAddMedia(false); setCurrentVideo(newMedia);
  };

  const openUserModal = (user?: User) => {
    if (user) { setEditingUser(user); setUserFormData(user); } 
    else { setEditingUser(null); setUserFormData({ name: '', email: '', role: 'staff', status: 'active' }); }
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) return;
    const newUser: User = { id: editingUser ? editingUser.id : generateId(), name: userFormData.name || '', email: userFormData.email || '', role: (userFormData.role as UserRole) || 'staff', status: (userFormData.status as 'active' | 'inactive') || 'active', lastLogin: editingUser ? editingUser.lastLogin : undefined };
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
                            <input 
                                type="url" 
                                className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
                                placeholder="http://103.xxx.xxx.xxx:3000" 
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
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm border ${
                                connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                connectionStatus === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                             {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                              connectionStatus === 'success' ? <Wifi className="w-4 h-4" /> : 
                              connectionStatus === 'failed' ? <WifiOff className="w-4 h-4" /> :
                              <Activity className="w-4 h-4" />
                             }
                             {connectionStatus === 'checking' ? 'Mengecek...' : 
                              connectionStatus === 'success' ? 'Terhubung' : 
                              connectionStatus === 'failed' ? 'Gagal' : 'Tes Koneksi'
                             }
                          </button>
                      </div>
                      {connectionMsg && (
                          <p className={`text-xs mt-2 font-medium ${connectionStatus === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {connectionStatus === 'success' ? '✅ ' : '❌ '} {connectionMsg}
                          </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-2">
                          Masukkan URL VPS Anda (contoh: <code>http://IP_ADDRESS:3000</code>). Pastikan port 3000 sudah dibuka di VPS.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Gemini & YouTube API Key (Opsional)</label>
                      <input type="password" className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" placeholder="AIzaSy..." value={tempSettings.youtubeApiKey || ''} onChange={(e) => setTempSettings({...tempSettings, youtubeApiKey: e.target.value})} />
                    </div>

                    <div className="pt-4 border-t flex items-center gap-4">
                       <button onClick={handleSaveSettings} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all"><Save className="w-4 h-4" /> Simpan Konfigurasi</button>
                       {isSaved && <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in"><Check className="w-4 h-4" /> Berhasil disimpan!</span>}
                    </div>
                 </div>
              </div>

              {/* Google Sheets Integration Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Google Sheets Integration</h3>
                            <p className="text-xs text-slate-500">Manual synchronization for reporting and backup.</p>
                        </div>
                    </div>
                    {settings.lastSheetSync && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            LAST SYNC: {new Date(settings.lastSheetSync).toLocaleString()}
                        </span>
                    )}
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Push all your inventory, transactions, and supplier data to the connected Google Spreadsheet. 
                        This is useful for generating custom reports or keeping an offline backup.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleFullSync}
                        disabled={isSyncing || !settings.viteGasUrl}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Syncing Data...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-5 h-5" />
                                Sync All Data to Sheets
                            </>
                        )}
                    </button>
                    {!settings.viteGasUrl && (
                        <div className="flex items-center gap-2 text-rose-500 text-xs font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Please configure Cloud URL first
                        </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-slate-500" /> User Terdaftar</h2>
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
                           <td className="px-6 py-4"><div className="font-medium text-slate-900">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>{user.role}</span></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{user.status}</span></td>
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => openUserModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="h-[600px] flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-xl text-white">
                {activePlatform === 'none' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <h2 className="text-2xl font-bold mb-8">Pilih Hiburan</h2>
                        <div className="flex gap-8">
                            <button onClick={() => setActivePlatform('youtube')} className="p-8 bg-red-600/10 hover:bg-red-600 rounded-2xl border border-red-500/20 transition-all flex flex-col items-center gap-4"><Youtube className="w-12 h-12" /> <span className="font-bold">YouTube</span></button>
                            <button onClick={() => setActivePlatform('tiktok')} className="p-8 bg-slate-800 hover:bg-black rounded-2xl border border-slate-700 transition-all flex flex-col items-center gap-4"><Video className="w-12 h-12" /> <span className="font-bold">TikTok</span></button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-800">
                             <div className="flex items-center gap-3">
                                 <button onClick={() => setActivePlatform('none')} className="p-1 hover:bg-white/10 rounded"><ArrowLeft className="w-5 h-5" /></button>
                                 <span className="font-bold uppercase tracking-widest">{activePlatform}</span>
                             </div>
                             <button onClick={() => setShowAddMedia(true)} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                             <div className="w-64 border-r border-white/5 overflow-y-auto p-4 space-y-2">
                                 <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Playlist</h3>
                                 {tempSettings.mediaItems.filter(m => m.type === activePlatform).map(m => (
                                     <button key={m.id} onClick={() => setCurrentVideo(m)} className={`w-full text-left p-2 rounded text-xs truncate hover:bg-white/5 ${currentVideo?.id === m.id ? 'bg-white/10 font-bold' : ''}`}>{m.title}</button>
                                 ))}
                             </div>
                             <div className="flex-1 bg-black relative">
                                 {showAddMedia && (
                                     <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-8">
                                         <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm space-y-4">
                                             <h3 className="font-bold">Tambah Video</h3>
                                             <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="URL Video" className="w-full bg-slate-700 p-2 rounded outline-none border border-slate-600 focus:border-blue-500" />
                                             <input value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} placeholder="Judul" className="w-full bg-slate-700 p-2 rounded outline-none border border-slate-600 focus:border-blue-500" />
                                             {mediaError && <p className="text-xs text-rose-400">{mediaError}</p>}
                                             <div className="flex gap-2"><button onClick={() => setShowAddMedia(false)} className="flex-1 py-2 text-slate-400">Batal</button><button onClick={handleAddMedia} className="flex-1 py-2 bg-blue-600 rounded font-bold">Simpan</button></div>
                                         </div>
                                     </div>
                                 )}
                                 {currentVideo ? (
                                     <iframe src={activePlatform === 'youtube' ? `https://www.youtube.com/embed/${currentVideo.embedId}?autoplay=1` : `https://www.tiktok.com/embed/v2/${currentVideo.embedId}`} className="w-full h-full" allowFullScreen />
                                 ) : <div className="w-full h-full flex items-center justify-center text-slate-700 italic">Pilih video dari playlist</div>}
                             </div>
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-slate-800">{editingUser ? 'Edit User' : 'User Baru'}</h3>
               <button onClick={() => setIsUserModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
               <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label><input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
               <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input required type="email" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select className="w-full px-3 py-2 border rounded-lg outline-none" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}><option value="staff">Staff</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select className="w-full px-3 py-2 border rounded-lg outline-none" value={userFormData.status} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
               </div>
               <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600">Batal</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">Simpan User</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
