import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, UserRole } from '../types';
import { generateId, saveToStorage, loadFromStorage } from '../utils/storageUtils';
import { checkServerConnection } from '../services/api';
import { hashPassword } from '../utils/security';
import { Save, Shield, X, Globe, Loader2, Wifi, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Clock, Database, Trash2, Edit2, Wrench, Download, Upload, RotateCcw, Terminal } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'cloud' | 'migration'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async (type: 'vps' | 'gas') => {
      const url = type === 'vps' ? tempSettings.vpsApiUrl : tempSettings.viteGasUrl;
      if (!url || url === '/') {
          setConnectionStatus('failed');
          setConnectionMsg('URL required for diagnostic.');
          return;
      }
      setConnectionStatus('checking');
      const result = await checkServerConnection(url);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const NavButton = ({ tab, icon: Icon, label, color }: any) => (
    <button 
      onClick={() => setActiveTab(tab)} 
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300
        ${activeTab === tab 
          ? `bg-${color}-500/10 text-${color}-400 border border-${color}-500/20 shadow-lg shadow-${color}-500/5` 
          : 'text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/5 border border-transparent'}`}
    >
      <Icon size={18} /> 
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full overflow-hidden animate-in fade-in duration-500">
      {/* Navigation Sidebar */}
      <div className="w-full md:w-72 flex flex-col gap-3 flex-shrink-0">
        <NavButton tab="settings" icon={Globe} label="Node Relay" color="indigo" />
        <NavButton tab="cloud" icon={FileSpreadsheet} label="Cloud Uplink" color="emerald" />
        <NavButton tab="users" icon={Shield} label="Access Nodes" color="purple" />
        <NavButton tab="migration" icon={Wrench} label="Core Utils" color="orange" />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
        {activeTab === 'settings' && (
          <div className="glass-panel rounded-[2.5rem] p-10 border border-white/5">
             <div className="flex items-center gap-5 mb-10">
               <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                 <Database className="w-7 h-7 text-indigo-400" />
               </div>
               <div>
                 <h2 className="text-xl font-black text-white tracking-tight uppercase font-heading">Node Configuration</h2>
                 <p className="text-[#6B7280] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Backend relay protocol parameters</p>
               </div>
             </div>
             
             <div className="space-y-10">
                <div className="group">
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-4 ml-1">Relay API Endpoint</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                          type="text" 
                          className="flex-1 px-6 py-4 rounded-2xl text-sm font-mono" 
                          placeholder="http://core-relay:3000" 
                          value={tempSettings.vpsApiUrl} 
                          onChange={(e) => setTempSettings({...tempSettings, vpsApiUrl: e.target.value})} 
                      />
                      <button onClick={() => handleTestConnection('vps')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-3 transition-all">
                         {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Wifi className="w-4 h-4 text-indigo-400" />}
                         Diagnostic
                      </button>
                  </div>
                </div>
                
                <div className="pt-10 border-t border-white/5 flex items-center gap-6">
                   <button onClick={handleSaveSettings} className="px-10 py-4 bg-[#6D5DF6] hover:bg-[#5B4EDB] text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all">
                      <Save className="w-4 h-4" /> Finalize Config
                   </button>
                   {isSaved && <span className="text-[#22D3EE] text-[10px] font-black uppercase tracking-widest animate-pulse"><CheckCircle2 className="inline w-3.5 h-3.5 mr-2" /> Sync Successful</span>}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-panel rounded-[2.5rem] p-10 border border-white/5">
             <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                      <Shield className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase font-heading">Access Directory</h2>
                      <p className="text-[#6B7280] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Identity node management</p>
                    </div>
                 </div>
                 <button onClick={() => { setEditingUser(null); setUserFormData({}); setIsUserModalOpen(true); }} className="px-8 py-3.5 bg-[#6D5DF6] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5B4EDB] shadow-lg shadow-indigo-500/10 transition-all">Register Node</button>
             </div>
             
             <div className="overflow-hidden border border-white/5 rounded-2xl">
                 <table className="w-full text-left">
                   <thead className="bg-white/5 border-b border-white/5">
                     <tr className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em]">
                       <th className="px-8 py-5">Identifier</th>
                       <th className="px-8 py-5">Clearance</th>
                       <th className="px-8 py-5">Status</th>
                       <th className="px-8 py-5 text-right">Admin</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.03]">
                     {users.map(user => (
                       <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6">
                            <div className="font-bold text-[#E5E7EB] text-sm">{user.name}</div>
                            <div className="text-[10px] text-[#6B7280] font-mono mt-1">@{user.username}</div>
                         </td>
                         <td className="px-8 py-6">
                           <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#9CA3AF]">{user.role}</span>
                         </td>
                         <td className="px-8 py-6">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                             {user.status}
                           </span>
                         </td>
                         <td className="px-8 py-6 text-right">
                           <div className="flex justify-end gap-1">
                             <button onClick={() => { setEditingUser(user); setUserFormData({ ...user, password: '' }); setIsUserModalOpen(true); }} className="p-2 text-[#6B7280] hover:text-[#6D5DF6] transition-all"><Edit2 size={16} /></button>
                             <button onClick={() => onDeleteUser(user.id)} className="p-2 text-[#6B7280] hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
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
      
      {/* Modal - Polished */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F14]/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="glass-panel rounded-[3rem] w-full max-w-md overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
               <h3 className="font-black text-white uppercase text-xs tracking-[0.2em]">{editingUser ? 'Refine Node' : 'Initialize Node'}</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="p-3 hover:bg-white/5 rounded-full transition-all hover:rotate-90"><X size={24} className="text-[#6B7280]" /></button>
            </div>
            <form onSubmit={async (e) => {
                 e.preventDefault();
                 const pass = userFormData.password?.trim() ? await hashPassword(userFormData.password) : (editingUser?.password || await hashPassword('123456'));
                 const newUser: User = { 
                     id: editingUser ? editingUser.id : generateId(), 
                     name: userFormData.name || '', username: userFormData.username || '', 
                     role: (userFormData.role as UserRole) || 'staff', status: (userFormData.status as 'active' | 'inactive') || 'active', 
                     password: pass
                 };
                 if (editingUser) onUpdateUser(newUser); else onAddUser(newUser);
                 setIsUserModalOpen(false);
            }} className="p-10 space-y-8">
               <div><label className="block text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Node Alias</label><input required className="w-full px-6 py-4 rounded-xl text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
               <div><label className="block text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Identity Protocol</label><input required className="w-full px-6 py-4 rounded-xl text-sm font-mono" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} /></div>
               <div><label className="block text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Security Cipher</label><input type="password" className="w-full px-6 py-4 rounded-xl text-sm" placeholder="••••••••" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required={!editingUser} /></div>
               <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Clearance</label><select className="w-full px-6 py-4 rounded-xl text-sm" value={userFormData.role || 'staff'} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
                  <div><label className="block text-[9px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">State</label><select className="w-full px-6 py-4 rounded-xl text-sm" value={userFormData.status || 'active'} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
               </div>
               <div className="pt-8 flex justify-end gap-4"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-4 text-[#6B7280] font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Discard</button><button type="submit" className="px-10 py-4 bg-[#6D5DF6] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95">Commit Access</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;