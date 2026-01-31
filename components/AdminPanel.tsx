import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, FileSpreadsheet, RefreshCw, Database, Loader2, Wifi, CheckCircle2 } from 'lucide-react';
import { checkServerConnection } from '../services/api';

interface AdminPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: any[];
  onAddUser: any;
  onUpdateUser: any;
  onDeleteUser: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ settings, onUpdateSettings }) => {
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTest = async () => {
      setConnectionStatus('checking');
      const result = await checkServerConnection(tempSettings.viteGasUrl);
      setConnectionStatus(result.online ? 'success' : 'failed');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="glass-panel rounded-[2.5rem] p-10 border border-white/5">
         <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-[#6D5DF6]/10 rounded-2xl border border-[#6D5DF6]/20">
              <Database className="w-8 h-8 text-[#6D5DF6]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase font-heading">Core Uplink</h2>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-[0.2em] mt-1">Google AppScript Integration Protocol</p>
            </div>
         </div>

         <div className="space-y-10">
            <div className="group">
              <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-4 ml-1">Deployment URL (Web App Exec)</label>
              <div className="flex flex-col gap-4">
                  <input 
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl text-sm font-mono transition-all" 
                      placeholder="https://script.google.com/macros/s/.../exec" 
                      value={tempSettings.viteGasUrl} 
                      onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} 
                  />
                  <button onClick={handleTest} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-3 transition-all">
                     {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin text-[#6D5DF6]" /> : <Wifi className="w-4 h-4" />}
                     Diagnostic Ping
                  </button>
              </div>
              {connectionStatus === 'failed' && <p className="mt-3 text-rose-500 text-[10px] font-bold uppercase tracking-widest ml-1">Error: Connection Refused / Timeout</p>}
              {connectionStatus === 'success' && <p className="mt-3 text-emerald-500 text-[10px] font-bold uppercase tracking-widest ml-1">Verified: Cloud Node Responsive</p>}
            </div>

            <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex items-start gap-5">
               <FileSpreadsheet className="w-6 h-6 text-[#6D5DF6] mt-1" />
               <div>
                  <h4 className="font-bold text-white text-sm">Google Sheets Synchronization</h4>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                    Data will be automatically projected into your private Google Sheet. 
                    This enables multi-device persistence and cloud reporting without external servers.
                  </p>
               </div>
            </div>
            
            <div className="pt-10 border-t border-white/5 flex items-center gap-6">
               <button onClick={handleSaveSettings} className="px-10 py-4 bg-[#6D5DF6] hover:bg-[#5B4EDB] text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all active:scale-95">
                  <Save className="w-4 h-4" /> Save Configuration
               </button>
               {isSaved && <span className="text-[#22D3EE] text-[10px] font-black uppercase tracking-widest animate-pulse"><CheckCircle2 className="inline w-3.5 h-3.5 mr-2" /> Link Established</span>}
            </div>
         </div>
      </div>

      <div className="p-10 border border-white/5 rounded-[2.5rem] bg-rose-500/5 flex items-center gap-6">
         <RefreshCw className="w-8 h-8 text-rose-500/50" />
         <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Resync Protocol</h4>
            <p className="text-[11px] text-[#6B7280] mt-1">Manual synchronization should be triggered if the Local Store drifts from the Cloud Ledger.</p>
         </div>
      </div>
    </div>
  );
};

export default AdminPanel;
