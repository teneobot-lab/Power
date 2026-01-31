import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, AppSettings, ToastMessage, ToastType, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage } from './utils/storageUtils';
import { fetchBackendData, syncBackendData, checkServerConnection } from './services/api';
import useDebounce from './hooks/useDebounce';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import AIAssistant from './components/AIAssistant';
import TransactionManager from './components/TransactionManager';
import RejectManager from './components/RejectManager';
import ItemHistory from './components/ItemHistory';
import SupplierManager from './components/SupplierManager';
import AdminPanel from './components/AdminPanel';
import ToastContainer from './components/Toast';
import { LayoutDashboard, Package, Bot, ArrowRightLeft, History, RefreshCw, Users, ShieldCheck, AlertCircle, Menu, PanelLeftClose, PanelLeftOpen, Terminal, Bell, Cloud, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const debouncedItems = useDebounce(items, 2000);
  const debouncedTransactions = useDebounce(transactions, 2000);
  const debouncedRejectLogs = useDebounce(rejectLogs, 2000);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = useCallback(async (customSettings?: AppSettings) => {
    setIsLoading(true);
    const activeSettings = customSettings || loadFromStorage('smartstock_settings', DEFAULT_SETTINGS);
    setSettings(activeSettings);

    // Initial local load to keep UI responsive
    if (!customSettings) {
      setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
      setTransactions(loadFromStorage('smartstock_transactions', []));
      setRejectItems(loadFromStorage('smartstock_reject_inventory', []));
      setRejectLogs(loadFromStorage('smartstock_rejects', []));
      setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
    }

    if (activeSettings.viteGasUrl && activeSettings.viteGasUrl.length > 10) {
      try {
        const conn = await checkServerConnection(activeSettings.viteGasUrl);
        setIsCloudConnected(conn.online);

        if (conn.online) {
          const cloudData = await fetchBackendData(activeSettings.viteGasUrl);
          if (cloudData) {
            if (cloudData.inventory) setItems(cloudData.inventory);
            if (cloudData.transactions) setTransactions(cloudData.transactions);
            if (cloudData.reject_inventory) setRejectItems(cloudData.reject_inventory);
            if (cloudData.rejects) setRejectLogs(cloudData.rejects);
            if (cloudData.suppliers) setSuppliers(cloudData.suppliers);
            showToast('Uplink Synchronized', 'success');
          }
        }
      } catch (e) {
        setIsCloudConnected(false);
      }
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => { loadData(); }, []);

  // Sync to Cloud Logic
  const isMounted = useRef(false);
  useEffect(() => { isMounted.current = true; }, []);

  const syncToCloud = async (type: string, data: any) => {
    if (isMounted.current && isCloudConnected && settings.viteGasUrl) {
      await syncBackendData(settings.viteGasUrl, type, data);
    }
  };

  useEffect(() => { 
    if (isMounted.current) { 
      saveToStorage('smartstock_inventory', debouncedItems); 
      syncToCloud('inventory', debouncedItems); 
    } 
  }, [debouncedItems]);

  useEffect(() => { 
    if (isMounted.current) { 
      saveToStorage('smartstock_transactions', debouncedTransactions); 
      syncToCloud('transactions', debouncedTransactions); 
    } 
  }, [debouncedTransactions]);

  useEffect(() => { 
    if (isMounted.current) { 
      saveToStorage('smartstock_rejects', debouncedRejectLogs); 
      syncToCloud('rejects', debouncedRejectLogs); 
    } 
  }, [debouncedRejectLogs]);

  const toggleColumn = (module: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [module]: prev[module].map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    }));
  };

  const NavItem = ({ view, label, icon: Icon }: { view: AppView, label: string, icon: any }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-4 px-6 py-3.5 transition-all duration-300 group
        ${currentView === view 
          ? 'sidebar-item-active text-white bg-white/5' 
          : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5'}`}
    >
      <Icon size={18} className={`${currentView === view ? 'text-[#6D5DF6]' : 'text-[#6B7280] group-hover:text-[#9CA3AF]'}`} />
      <span className="text-[13px] font-semibold tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#E5E7EB] overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0B0F14] border-r border-white/5 flex flex-col transform transition-all duration-300 md:relative md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 md:w-64'} 
        ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''}`}
      >
        <div className="h-24 flex items-center px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-[#6D5DF6] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Terminal size={22} className="text-white glow-purple" />
             </div>
             <div>
                <span className="block text-sm font-black text-white tracking-tighter uppercase leading-none font-heading">Power OS</span>
                <span className="block text-[10px] text-[#6B7280] font-bold uppercase tracking-[0.2em] mt-0.5">Cloud Ledger</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem view={AppView.DASHBOARD} label="Overview" icon={LayoutDashboard} />
          <NavItem view={AppView.INVENTORY} label="Inventory Nodes" icon={Package} />
          <NavItem view={AppView.TRANSACTIONS} label="Movement Logs" icon={ArrowRightLeft} />
          <NavItem view={AppView.REJECT} label="Rejection Points" icon={AlertCircle} />
          <NavItem view={AppView.HISTORY} label="Ledger History" icon={History} />
          <NavItem view={AppView.SUPPLIERS} label="Supply Nodes" icon={Users} />
          <NavItem view={AppView.AI_ASSISTANT} label="Gemini Core" icon={Bot} />
          <NavItem view={AppView.ADMIN} label="System Control" icon={ShieldCheck} />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F14]">
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#0B0F14]/50 backdrop-blur-md z-40">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-[#9CA3AF] hover:text-white bg-white/5 rounded-xl border border-white/5">
                  <Menu size={20} />
                </button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 text-[#9CA3AF] hover:text-white bg-white/5 rounded-xl border border-white/5">
                  {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
                <h1 className="text-xl font-extrabold text-white tracking-tight uppercase font-heading">
                    {currentView.replace('_', ' ')}
                </h1>
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                  ${isCloudConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                    {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                    {isCloudConnected ? 'Uplink Active' : 'Uplink Failed'}
                </div>
                <button onClick={() => loadData()} className="p-2.5 text-[#9CA3AF] hover:text-[#6D5DF6] bg-white/5 border border-white/5 rounded-xl transition-all">
                  <RefreshCw size={18} />
                </button>
                <button className="p-2.5 text-[#9CA3AF] hover:text-white bg-white/5 border border-white/5 rounded-xl transition-all relative">
                   <Bell size={18} />
                   <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#6D5DF6] rounded-full"></span>
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto h-full view-transition">
                {currentView === AppView.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
                {currentView === AppView.INVENTORY && <InventoryTable items={items} onAddItem={(it) => setItems([...items, it])} onUpdateItem={(upd) => setItems(items.map(i => i.id === upd.id ? upd : i))} onDeleteItem={(id) => setItems(items.filter(i => i.id !== id))} userRole="admin" columns={tablePrefs.inventory} onToggleColumn={(id) => toggleColumn('inventory', id)} />}
                {currentView === AppView.TRANSACTIONS && <TransactionManager inventory={items} transactions={transactions} onProcessTransaction={(tx) => { setTransactions([tx, ...transactions]); showToast('Manifest Logged', 'success'); }} onUpdateTransaction={(tx) => setTransactions(transactions.map(t => t.id === tx.id ? tx : t))} userRole="admin" columns={tablePrefs.transactions} onToggleColumn={(id) => toggleColumn('transactions', id)} />}
                {currentView === AppView.REJECT && <RejectManager rejectMasterData={rejectItems} rejectLogs={rejectLogs} onProcessReject={(log) => setRejectLogs([log, ...rejectLogs])} onUpdateRejectLog={(log) => setRejectLogs(rejectLogs.map(l => l.id === log.id ? log : l))} onDeleteRejectLog={(id) => setRejectLogs(rejectLogs.filter(l => l.id !== id))} onUpdateRejectMaster={setRejectItems} userRole="admin" columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} />}
                {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
                {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={(s) => setSuppliers(suppliers.map(sup => sup.id === s.id ? s : sup))} onDeleteSupplier={(id) => setSuppliers(suppliers.filter(s => s.id !== id))} userRole="admin" columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
                {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
                {currentView === AppView.ADMIN && (
                    <AdminPanel 
                        settings={settings} 
                        onUpdateSettings={(s) => { setSettings(s); loadData(s); }} 
                        users={[]} 
                        onAddUser={() => {}} 
                        onUpdateUser={() => {}} 
                        onDeleteUser={() => {}} 
                    />
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
