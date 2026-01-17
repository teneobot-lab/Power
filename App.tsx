import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
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
import LoginPage from './components/LoginPage';
import ToastContainer from './components/Toast';
import { LayoutDashboard, Package, Bot, ArrowRightLeft, History, RefreshCw, Users, ShieldCheck, AlertCircle, Menu, PanelLeftClose, PanelLeftOpen, LogOut, Terminal, User as UserIcon, Bell, Search } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'>('UNKNOWN');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const debouncedItems = useDebounce(items, 1500);

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
    const vpsUrl = activeSettings.vpsApiUrl;
    
    if (!customSettings) {
        setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
        setTransactions(loadFromStorage('smartstock_transactions', []));
        setRejectItems(loadFromStorage('smartstock_reject_inventory', []));
        setRejectLogs(loadFromStorage('smartstock_rejects', []));
        setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
        setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
        setSettings(activeSettings);
    }

    if (vpsUrl && vpsUrl !== '') {
      try {
        const conn = await checkServerConnection(vpsUrl);
        setDbStatus((conn.dbStatus as any) || 'UNKNOWN');
        const fullyOnline = conn.online && conn.dbStatus === 'CONNECTED';
        setIsCloudConnected(fullyOnline);

        if (fullyOnline) {
          const cloudData = await fetchBackendData(vpsUrl).catch(() => null);
          if (cloudData) {
            if (cloudData.inventory) setItems(cloudData.inventory);
            if (cloudData.transactions) setTransactions(cloudData.transactions);
            if (cloudData.users && cloudData.users.length > 0) setUsers(cloudData.users);
            if (cloudData.reject_inventory) setRejectItems(cloudData.reject_inventory);
            if (cloudData.rejects) setRejectLogs(cloudData.rejects);
            if (cloudData.suppliers) setSuppliers(cloudData.suppliers);
            showToast('Sync Successful', 'success');
          }
        }
      } catch (error: any) {
        setIsCloudConnected(false);
        setDbStatus('DISCONNECTED');
      }
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('smartstock_session_user');
    if (savedSession) {
        try { setCurrentUser(JSON.parse(savedSession)); } catch (e) {}
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('smartstock_session_user', JSON.stringify(user));
    showToast(`Welcome, ${user.name}`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('smartstock_session_user');
    showToast('Signed out', 'info');
  };

  const toggleColumn = (module: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [module]: prev[module].map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    }));
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} isLoadingData={isLoading} settings={settings} onUpdateSettings={setSettings} />;

  const NavItem = ({ view, label, icon: Icon }: { view: AppView, label: string, icon: any }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-4 px-6 py-3.5 transition-all duration-300 group
        ${currentView === view 
          ? 'sidebar-item-active text-white bg-white/5 shadow-inner' 
          : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5'}`}
    >
      <Icon size={18} className={`${currentView === view ? 'text-[#6D5DF6]' : 'text-[#6B7280] group-hover:text-[#9CA3AF]'}`} />
      <span className="text-[13px] font-semibold tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#E5E7EB] overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Sidebar */}
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
                <span className="block text-sm font-black text-white tracking-tighter uppercase leading-none">Steel Core</span>
                <span className="block text-[10px] text-[#6B7280] font-bold uppercase tracking-[0.2em] mt-0.5">Enterprise v4</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 mt-4 space-y-1">
          <NavItem view={AppView.DASHBOARD} label="Overview" icon={LayoutDashboard} />
          <NavItem view={AppView.INVENTORY} label="Inventory Nodes" icon={Package} />
          <NavItem view={AppView.TRANSACTIONS} label="Movement Logs" icon={ArrowRightLeft} />
          <NavItem view={AppView.REJECT} label="Rejection Points" icon={AlertCircle} />
          <NavItem view={AppView.HISTORY} label="Ledger History" icon={History} />
          <NavItem view={AppView.SUPPLIERS} label="Supply Nodes" icon={Users} />
          <NavItem view={AppView.AI_ASSISTANT} label="Gemini Core" icon={Bot} />
          {currentUser.role === 'admin' && <NavItem view={AppView.ADMIN} label="System Control" icon={ShieldCheck} />}
        </nav>

        <div className="p-6 border-t border-white/5 mt-auto bg-[#0B0F14]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#6D5DF6]/20 flex items-center justify-center">
               <UserIcon size={18} className="text-[#6D5DF6]" />
            </div>
            <div className="min-w-0">
               <p className="text-[11px] font-bold text-white truncate leading-none">{currentUser.name}</p>
               <p className="text-[9px] text-[#6B7280] uppercase font-black tracking-widest mt-1.5">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-rose-500/10 text-rose-500 group">
            <LogOut size={18} />
            <span className="text-[12px] font-bold tracking-wider">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F14]">
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#0B0F14]/50 backdrop-blur-md z-40">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-[#9CA3AF] hover:text-white bg-white/5 rounded-xl border border-white/5">
                  <Menu size={20} />
                </button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 text-[#9CA3AF] hover:text-white bg-white/5 rounded-xl border border-white/5">
                  {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
                <div className="flex flex-col">
                  <h1 className="text-xl font-extrabold text-white tracking-tight uppercase font-heading">
                    {currentView.charAt(0) + currentView.slice(1).toLowerCase().replace('_', ' ')}
                  </h1>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                  ${isCloudConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
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
                {currentView === AppView.INVENTORY && <InventoryTable items={items} onAddItem={(it) => setItems([...items, it])} onUpdateItem={(upd) => setItems(items.map(i => i.id === upd.id ? upd : i))} onDeleteItem={(id) => setItems(items.filter(i => i.id !== id))} userRole={currentUser.role} columns={tablePrefs.inventory} onToggleColumn={(id) => toggleColumn('inventory', id)} />}
                {currentView === AppView.TRANSACTIONS && <TransactionManager inventory={items} transactions={transactions} onProcessTransaction={(tx) => { setTransactions([tx, ...transactions]); showToast('Validated', 'success'); }} onUpdateTransaction={(tx) => setTransactions(transactions.map(t => t.id === tx.id ? tx : t))} onDeleteTransaction={(id) => setTransactions(transactions.filter(t => t.id !== id))} userRole={currentUser.role} columns={tablePrefs.transactions} onToggleColumn={(id) => toggleColumn('transactions', id)} />}
                {currentView === AppView.REJECT && <RejectManager rejectMasterData={rejectItems} rejectLogs={rejectLogs} onProcessReject={(log) => setRejectLogs([log, ...rejectLogs])} onUpdateRejectLog={(log) => setRejectLogs(rejectLogs.map(l => l.id === log.id ? log : l))} onDeleteRejectLog={(id) => setRejectLogs(rejectLogs.filter(l => l.id !== id))} onUpdateRejectMaster={setRejectItems} userRole={currentUser.role} columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} />}
                {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
                {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={(s) => setSuppliers(suppliers.map(sup => sup.id === s.id ? s : sup))} onDeleteSupplier={(id) => setSuppliers(suppliers.filter(s => s.id !== id))} userRole={currentUser.role} columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
                {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
                {currentView === AppView.ADMIN && currentUser.role === 'admin' && (
                    <AdminPanel 
                        settings={settings} 
                        onUpdateSettings={(s) => { setSettings(s); loadData(s); }} 
                        users={users} 
                        onAddUser={(u) => setUsers([...users, u])} 
                        onUpdateUser={(u) => setUsers(users.map(usr => usr.id === u.id ? u : usr))} 
                        onDeleteUser={(id) => setUsers(users.filter(u => u.id !== id))} 
                    />
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;