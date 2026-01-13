import React, { useState, useEffect } from 'react';
import { User, AppSettings, UserRole, MediaItem } from '../types';
import { generateId } from '../utils/storageUtils';
import { Save, User as UserIcon, Settings, Shield, Plus, Edit2, Trash2, X, Key, Link, Check, MonitorPlay, Youtube, Video, ExternalLink, ArrowLeft, Play, ListVideo, Search } from 'lucide-react';

interface AdminPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  settings, onUpdateSettings, 
  users, onAddUser, onUpdateUser, onDeleteUser 
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'media'>('settings');
  
  // Settings State
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});

  // Media Management State
  const [activePlatform, setActivePlatform] = useState<'none' | 'youtube' | 'tiktok'>('none');
  const [currentVideo, setCurrentVideo] = useState<MediaItem | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showAddMedia, setShowAddMedia] = useState(false);

  // Sync settings when props change
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  // --- Settings Handlers ---
  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Media Handlers ---
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
    if (!mediaUrl.trim() || !mediaTitle.trim()) {
        setMediaError("URL and Title are required.");
        return;
    }

    const extraction = extractVideoId(mediaUrl);
    if (!extraction) {
        setMediaError("Invalid URL. Supported: YouTube, TikTok (web link).");
        return;
    }

    if (extraction.type !== activePlatform) {
        setMediaError(`Current mode is ${activePlatform}, but you entered a ${extraction.type} link.`);
        return;
    }

    const newMedia: MediaItem = {
        id: generateId(),
        type: extraction.type,
        url: mediaUrl,
        embedId: extraction.id,
        title: mediaTitle,
        addedAt: new Date().toISOString()
    };

    const updatedMediaItems = [...(tempSettings.mediaItems || []), newMedia];
    setTempSettings(prev => ({ ...prev, mediaItems: updatedMediaItems }));
    onUpdateSettings({ ...tempSettings, mediaItems: updatedMediaItems });
    
    setMediaUrl('');
    setMediaTitle('');
    setShowAddMedia(false);
    setCurrentVideo(newMedia); // Auto play new video
  };

  const handleDeleteMedia = (id: string) => {
    if(!window.confirm("Remove this video from playlist?")) return;
    const updatedMediaItems = (tempSettings.mediaItems || []).filter(m => m.id !== id);
    setTempSettings(prev => ({ ...prev, mediaItems: updatedMediaItems }));
    onUpdateSettings({ ...tempSettings, mediaItems: updatedMediaItems });
    
    if (currentVideo?.id === id) {
        setCurrentVideo(null);
    }
  };

  const getPlaylist = (platform: 'youtube' | 'tiktok') => {
      return (tempSettings.mediaItems || []).filter(item => item.type === platform);
  };

  const enterPlatform = (platform: 'youtube' | 'tiktok') => {
      setActivePlatform(platform);
      const playlist = getPlaylist(platform);
      if (playlist.length > 0) {
          setCurrentVideo(playlist[0]);
      } else {
          setCurrentVideo(null);
      }
  };

  // --- User Handlers ---
  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData(user);
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        role: 'staff',
        status: 'active'
      });
    }
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) return;

    const newUser: User = {
      id: editingUser ? editingUser.id : generateId(),
      name: userFormData.name || '',
      email: userFormData.email || '',
      role: (userFormData.role as UserRole) || 'staff',
      status: (userFormData.status as 'active' | 'inactive') || 'active',
      lastLogin: editingUser ? editingUser.lastLogin : undefined
    };

    if (editingUser) {
      onUpdateUser(newUser);
    } else {
      onAddUser(newUser);
    }
    setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Settings className="w-4 h-4" />
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Shield className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'media' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <MonitorPlay className="w-4 h-4" />
            Media Center
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-slate-500" />
                 Application Configuration
               </h2>

               <div className="space-y-6">
                  {/* Google Gemini */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="password"
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        placeholder="AIzaSy..."
                        value={tempSettings.geminiApiKey}
                        onChange={(e) => setTempSettings({...tempSettings, geminiApiKey: e.target.value})}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Required for AI Assistant. Get your key at <a href="https://aistudio.google.com/" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>.
                    </p>
                  </div>

                  {/* YouTube API */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">YouTube Data API Key</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Youtube className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="password"
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        placeholder="AIzaSy... (Optional)"
                        value={tempSettings.youtubeApiKey || ''}
                        onChange={(e) => setTempSettings({...tempSettings, youtubeApiKey: e.target.value})}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Optional: Enables enhanced search features for the internal YouTube player.
                    </p>
                  </div>

                  {/* TikTok Config */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">TikTok Client Key / Config</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Video className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        placeholder="Client ID or Session Config"
                        value={tempSettings.tiktokConfig || ''}
                        onChange={(e) => setTempSettings({...tempSettings, tiktokConfig: e.target.value})}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Optional: Configuration for custom TikTok feed integrations.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vite / Backend Gas URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Link className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="https://script.google.com/..."
                        value={tempSettings.viteGasUrl}
                        onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Endpoint for backend synchronization (Google Apps Script or similar).
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                     <button
                       onClick={handleSaveSettings}
                       className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all"
                     >
                       <Save className="w-4 h-4" />
                       Save Configuration
                     </button>
                     {isSaved && (
                       <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                         <Check className="w-4 h-4" /> Saved successfully!
                       </span>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4 h-full flex flex-col">
               <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-500" />
                    System Users
                  </h2>
                  <button
                    onClick={() => openUserModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add User
                  </button>
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                 <div className="overflow-auto flex-1 custom-scrollbar">
                   <table className="w-full text-left border-collapse min-w-[600px]">
                     <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                       <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                         <th className="px-6 py-4 bg-slate-50">User</th>
                         <th className="px-6 py-4 bg-slate-50">Role</th>
                         <th className="px-6 py-4 bg-slate-50">Status</th>
                         <th className="px-6 py-4 text-right bg-slate-50">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                 {user.name.charAt(0)}
                               </div>
                               <div>
                                 <div className="font-medium text-slate-900">{user.name}</div>
                                 <div className="text-xs text-slate-500">{user.email}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>
                               {user.role}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                               {user.status}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex justify-end gap-2">
                               <button onClick={() => openUserModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                 <Edit2 className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => {
                                   if(window.confirm('Delete user?')) onDeleteUser(user.id);
                                 }} 
                                 className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="h-[600px] flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-xl text-white">
                {activePlatform === 'none' ? (
                    /* --- Platform Selector (Home Screen) --- */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
                        <h2 className="text-3xl font-bold mb-8 text-center">Choose Entertainment App</h2>
                        <div className="flex flex-col sm:flex-row gap-8 w-full max-w-2xl justify-center">
                            {/* YouTube Card */}
                            <button 
                                onClick={() => enterPlatform('youtube')}
                                className="group flex-1 flex flex-col items-center justify-center p-8 bg-white/5 hover:bg-red-600 rounded-2xl border border-white/10 hover:border-red-500 transition-all duration-300 transform hover:scale-105"
                            >
                                <div className="bg-red-600 group-hover:bg-white p-6 rounded-full mb-4 transition-colors shadow-lg">
                                    <Youtube className="w-12 h-12 text-white group-hover:text-red-600" />
                                </div>
                                <h3 className="text-2xl font-bold">YouTube</h3>
                                <p className="text-white/50 text-sm mt-2">Music, Tutorials & News</p>
                            </button>

                            {/* TikTok Card */}
                            <button 
                                onClick={() => enterPlatform('tiktok')}
                                className="group flex-1 flex flex-col items-center justify-center p-8 bg-white/5 hover:bg-black rounded-2xl border border-white/10 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-105"
                            >
                                <div className="bg-black group-hover:bg-white p-6 rounded-full mb-4 transition-colors shadow-lg border border-white/10">
                                    <Video className="w-12 h-12 text-white group-hover:text-black" />
                                </div>
                                <h3 className="text-2xl font-bold">TikTok</h3>
                                <p className="text-white/50 text-sm mt-2">Viral Videos & Trends</p>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* --- Player Interface --- */
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
                        {/* Player Header - App Style */}
                        <div className={`p-4 flex items-center justify-between border-b border-white/10 shadow-md z-10 ${activePlatform === 'youtube' ? 'bg-[#282828]' : 'bg-[#121212]'}`}>
                             <div className="flex items-center gap-3">
                                 <button onClick={() => setActivePlatform('none')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                     <ArrowLeft className="w-5 h-5 text-white" />
                                 </button>
                                 <div className="flex items-center gap-3">
                                     {activePlatform === 'youtube' ? (
                                         <div className="flex items-center gap-1">
                                            <div className="bg-red-600 text-white p-1 rounded">
                                                <Youtube className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold tracking-tighter text-lg">YouTube</span>
                                         </div>
                                     ) : (
                                         <div className="flex items-center gap-1">
                                            <Video className="w-6 h-6 text-cyan-400" />
                                            <span className="font-bold tracking-tighter text-lg">TikTok</span>
                                         </div>
                                     )}
                                 </div>
                             </div>
                             
                             {/* Fake Search Bar for "App" Feel */}
                             <div className="hidden md:flex flex-1 max-w-md mx-6">
                                <div className="relative w-full">
                                    <input 
                                        type="text" 
                                        placeholder="Search" 
                                        className="w-full bg-[#121212] border border-[#303030] rounded-full py-1.5 pl-4 pr-10 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                                        disabled // Visual only for now, functional search would require complex API
                                    />
                                    <button className="absolute right-0 top-0 h-full px-3 bg-[#303030] rounded-r-full border border-l-0 border-[#303030] flex items-center justify-center">
                                        <Search className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                             </div>

                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setShowAddMedia(!showAddMedia)} 
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                                    title="Add Video Link"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                             </div>
                        </div>

                        {/* Player Body */}
                        <div className="flex-1 flex overflow-hidden bg-[#0f0f0f]">
                             {/* Playlist Sidebar - Dark Mode */}
                             <div className="w-72 bg-[#0f0f0f] border-r border-white/5 flex flex-col hidden md:flex">
                                 <div className="p-4 border-b border-white/5">
                                    <h3 className="font-bold text-sm text-white mb-1">My Playlist</h3>
                                    <p className="text-xs text-gray-400">Saved Videos</p>
                                 </div>
                                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                                     {getPlaylist(activePlatform).map((item, idx) => (
                                         <button 
                                            key={item.id}
                                            onClick={() => setCurrentVideo(item)}
                                            className={`w-full text-left p-3 hover:bg-white/10 transition-colors flex gap-3 group ${currentVideo?.id === item.id ? 'bg-white/10' : ''}`}
                                         >
                                             <div className="relative w-24 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                                 {/* Thumbnail Placeholder */}
                                                 <img 
                                                    src={item.type === 'youtube' 
                                                        ? `https://img.youtube.com/vi/${item.embedId}/mqdefault.jpg` 
                                                        : 'https://placehold.co/100x60/000000/FFF?text=TikTok'
                                                    } 
                                                    alt="" 
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                                                 />
                                                 <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded text-white">Live</div>
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                 <div className="font-semibold text-sm text-white line-clamp-2 leading-tight mb-1">{item.title}</div>
                                                 <div className="text-xs text-gray-400">{new Date(item.addedAt).toLocaleDateString()}</div>
                                             </div>
                                         </button>
                                     ))}
                                     {getPlaylist(activePlatform).length === 0 && (
                                         <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center">
                                             <ListVideo className="w-8 h-8 mb-2 opacity-50" />
                                             <span>Playlist empty</span>
                                         </div>
                                     )}
                                 </div>
                             </div>

                             {/* Main Video Stage */}
                             <div className="flex-1 bg-black relative flex flex-col justify-center items-center">
                                 {showAddMedia && (
                                     <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-30 animate-in fade-in slide-in-from-top-4">
                                         <div className="bg-[#282828] p-4 rounded-xl shadow-2xl border border-white/10 mx-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-bold text-white">Add to {activePlatform === 'youtube' ? 'YouTube' : 'TikTok'} Library</h4>
                                                <button onClick={() => setShowAddMedia(false)}><X className="w-4 h-4 text-gray-400" /></button>
                                            </div>
                                            <div className="space-y-3">
                                                <input 
                                                    autoFocus
                                                    className="w-full bg-[#121212] border border-[#3e3e3e] rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
                                                    placeholder="Paste URL here..."
                                                    value={mediaUrl}
                                                    onChange={(e) => setMediaUrl(e.target.value)}
                                                />
                                                <input 
                                                    className="w-full bg-[#121212] border border-[#3e3e3e] rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
                                                    placeholder="Video Title..."
                                                    value={mediaTitle}
                                                    onChange={(e) => setMediaTitle(e.target.value)}
                                                />
                                                {mediaError && <p className="text-xs text-red-400">{mediaError}</p>}
                                                <button 
                                                    onClick={handleAddMedia}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium mt-1"
                                                >
                                                    Add Video
                                                </button>
                                            </div>
                                         </div>
                                     </div>
                                 )}

                                 {currentVideo ? (
                                    <>
                                        <div className="w-full h-full relative group">
                                            {activePlatform === 'youtube' ? (
                                                <iframe 
                                                    src={`https://www.youtube.com/embed/${currentVideo.embedId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`} 
                                                    className="w-full h-full"
                                                    title={currentVideo.title}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    sandbox="allow-scripts allow-same-origin allow-presentation"
                                                    allowFullScreen
                                                ></iframe>
                                            ) : (
                                                <iframe 
                                                    src={`https://www.tiktok.com/embed/v2/${currentVideo.embedId}`}
                                                    className="w-full h-full"
                                                    title={currentVideo.title}
                                                    sandbox="allow-scripts allow-same-origin allow-presentation"
                                                    allowFullScreen
                                                ></iframe>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                            <div className="pointer-events-auto">
                                                <h2 className="text-white font-bold text-xl drop-shadow-md">{currentVideo.title}</h2>
                                                <p className="text-white/70 text-sm">Now Playing • Added {new Date(currentVideo.addedAt).toLocaleDateString()}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteMedia(currentVideo.id)}
                                                className="pointer-events-auto p-2.5 bg-white/10 hover:bg-red-600 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
                                                title="Remove from library"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                 ) : (
                                     <div className="text-center text-gray-500 flex flex-col items-center">
                                         <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Play className="w-10 h-10 ml-1 opacity-50" />
                                         </div>
                                         <p className="text-lg font-medium text-gray-400">Select a video to play</p>
                                         <p className="text-sm text-gray-600 mt-1">Or click + to add new content</p>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">{editingUser ? 'Edit User' : 'New User'}</h3>
               <button onClick={() => setIsUserModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                 <input
                   required
                   type="text"
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                   value={userFormData.name}
                   onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                 <input
                   required
                   type="email"
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                   value={userFormData.email}
                   onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={userFormData.role}
                      onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={userFormData.status}
                      onChange={e => setUserFormData({...userFormData, status: e.target.value as 'active' | 'inactive'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
               </div>
               <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save User</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;