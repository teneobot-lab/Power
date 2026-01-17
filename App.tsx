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
import { LayoutDashboard, Package, Bot, Eye, EyeOff, ArrowRightLeft, History, RefreshCw, Save as SaveIcon, Cloud, CloudOff, Users, ShieldCheck, AlertCircle, Menu, PanelLeftClose, PanelLeftOpen, LogOut, Terminal, User as UserIcon } from 'lucide-react';

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
  const [connErrorMessage, setConnErrorMessage] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      const nextBlink = Math.random() * 4000 + 2000;
      setTimeout(triggerBlink, nextBlink);
    };
    const initialTimer = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(initialTimer);
  }, []);

  const debouncedItems = useDebounce(items, 1500);
  const debouncedTransactions = useDebounce(transactions, 1500);
  const debouncedRejectItems = useDebounce(rejectItems, 1500);
  const debouncedRejectLogs = useDebounce(rejectLogs, 1500);
  const debouncedSuppliers = useDebounce(suppliers, 1500);
  const debouncedUsers = useDebounce(users, 1500);
  const debouncedSettings = useDebounce(settings, 1500);
  const debouncedTablePrefs = useDebounce(tablePrefs, 1500);

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
        setConnErrorMessage(conn.message);
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
            showToast('Koneksi Sinkron: MySQL Data Loaded', 'success');
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

  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      loadData(newSettings);
  };

  const isMounted = useRef(false);
  useEffect(() => { if (!isLoading) isMounted.current = true; }, [isLoading]);

  const syncToCloud = async (type: string, data: any) => {
    if (isMounted.current && isCloudConnected && dbStatus === 'CONNECTED') {
      setIsSaving(true);
      await syncBackendData(settings.vpsApiUrl, type, data);
      setIsSaving(false);
    }
  };

  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_inventory', debouncedItems); syncToCloud('inventory', debouncedItems); } }, [debouncedItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_transactions', debouncedTransactions); syncToCloud('transactions', debouncedTransactions); } }, [debouncedTransactions]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_reject_inventory', debouncedRejectItems); syncToCloud('reject_inventory', debouncedRejectItems); } }, [debouncedRejectItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_rejects', debouncedRejectLogs); syncToCloud('rejects', debouncedRejectLogs); } }, [debouncedRejectLogs]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_suppliers', debouncedSuppliers); syncToCloud('suppliers', debouncedSuppliers); } }, [debouncedSuppliers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_users', debouncedUsers); syncToCloud('users', debouncedUsers); } }, [debouncedUsers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_settings', debouncedSettings); if (isCloudConnected) syncToCloud('settings', debouncedSettings); } }, [debouncedSettings]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_table_prefs', debouncedTablePrefs); } }, [debouncedTablePrefs]);

  const toggleColumn = (module: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [module]: prev[module].map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    }));
  };

  if (!currentUser) {
      return (
          <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LoginPage users={users} onLogin={handleLogin} isLoadingData={isLoading} settings={settings} onUpdateSettings={handleUpdateSettings} />
          </>
      );
  }

  const navItemClass = (view: AppView) => `
    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
    ${currentView === view 
      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
  `;

  const iconClass = "w-5 h-5 glow-icon";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-2xl transform transition-all duration-500 ease-in-out md:relative md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-72 md:opacity-100'}
        w-72`}
      >
        <div className="h-40 flex flex-col items-center justify-center relative border-b border-slate-800/50 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent"></div>
          <div className="relative z-10 p-3 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner group cursor-pointer">
            {isBlinking 
              ? <EyeOff className="w-10 h-10 text-blue-500/50 animate-pulse glow-icon" /> 
              : <Eye className="w-10 h-10 text-blue-400 glow-icon group-hover:scale-110 transition-transform" />
            }
          </div>
          <div className="mt-3 text-center">
            <span className="block text-sm font-bold tracking-[0.2em] text-blue-500 uppercase">Power</span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-medium">Inventory Systems</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto flex flex-col custom-scrollbar">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.DASHBOARD)}>
            <LayoutDashboard className={iconClass} />
            <span className="font-bold text-sm tracking-wide">Dashboard</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.INVENTORY); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.INVENTORY)}>
            <Package className={iconClass} />
            <span className="font-bold text-sm tracking-wide">Inventory</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.TRANSACTIONS); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.TRANSACTIONS)}>
            <ArrowRightLeft className={iconClass} />
            <span className="font-bold text-sm tracking-wide">Transaksi</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.REJECT); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.REJECT)}>
            <AlertCircle className={`${iconClass} text-rose-500/70`} />
            <span className="font-bold text-sm tracking-wide">Reject</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.HISTORY); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.HISTORY)}>
            <History className={iconClass} />
            <span className="font-bold text-sm tracking-wide">Riwayat</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.SUPPLIERS); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.SUPPLIERS)}>
            <Users className={iconClass} />
            <span className="font-bold text-sm tracking-wide">Suppliers</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.AI_ASSISTANT); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.AI_ASSISTANT)}>
            <Bot className={`${iconClass} text-emerald-400`} />
            <span className="font-bold text-sm tracking-wide">AI Agent</span>
          </button>
          
          <div className="pt-4 mt-2 border-t border-slate-800/50">
            {currentUser.role === 'admin' && (
              <button onClick={() => { setCurrentView(AppView.ADMIN); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.ADMIN)}>
                <ShieldCheck className={`${iconClass} text-indigo-400`} />
                <span className="font-bold text-sm tracking-wide">Admin Access</span>
              </button>
            )}
          </div>
        </nav>

        {/* User Profile Footer Section */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
               <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-100 uppercase truncate leading-tight tracking-tight">{currentUser.name}</p>
              <p className="text-[10px] text-blue-500/80 font-bold lowercase truncate mt-0.5 tracking-wider">@{currentUser.username}</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-rose-500/10 text-rose-400 group">
            <LogOut className={`${iconClass} group-hover:translate-x-1 transition-transform`} />
            <span className="font-bold text-sm tracking-wide uppercase">Keluar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex justify-between items-center p-6 md:px-10 md:py-8 shrink-0 bg-slate-950/50 backdrop-blur-md z-40 border-b border-slate-900">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800"><Menu className="w-6 h-6" /></button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2.5 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-all shadow-lg active:scale-90">
                  {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl md:text-3xl font-black text-slate-100 tracking-tighter uppercase flex items-center gap-3">
                    <Terminal className="w-6 h-6 text-blue-500 glow-icon hidden sm:block" />
                    Power Inventory
                  </h1>
                  <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">Steel-Core Warehouse Control</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div 
                  title={connErrorMessage}
                  className={`hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-help
                    ${isCloudConnected 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : (dbStatus === 'DISCONNECTED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}
                  `}
                >
                    {isCloudConnected ? <Cloud className="w-4 h-4 glow-icon" /> : <CloudOff className="w-4 h-4" />}
                    {isCloudConnected ? 'Sync Active' : (dbStatus === 'DISCONNECTED' ? 'MySQL Down' : 'Offline Mode')}
                </div>
                {isSaving && <div className="text-[10px] text-blue-400 animate-pulse font-black uppercase tracking-tighter flex items-center gap-2"><SaveIcon className="w-3.5 h-3.5" /> Syncing...</div>}
                <button onClick={() => loadData()} className="p-3 text-slate-400 hover:text-blue-400 bg-slate-900 border border-slate-800 rounded-xl transition-all shadow-xl active:rotate-180 duration-500">
                  <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-hidden px-6 md:px-10 pb-6 relative">
            <div className="h-full w-full overflow-y-auto custom-scrollbar pr-1">
                {currentView === AppView.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
                {currentView === AppView.INVENTORY && <InventoryTable items={items} onAddItem={(it) => setItems([...items, it])} onBatchAdd={(batch) => setItems([...items, ...batch])} onUpdateItem={(upd) => setItems(items.map(i => i.id === upd.id ? upd : i))} onDeleteItem={(id) => setItems(items.filter(i => i.id !== id))} userRole={currentUser.role} columns={tablePrefs.inventory} onToggleColumn={(id) => toggleColumn('inventory', id)} />}
                {currentView === AppView.TRANSACTIONS && <TransactionManager inventory={items} transactions={transactions} onProcessTransaction={(tx) => { setTransactions([tx, ...transactions]); showToast('Transaction Confirmed', 'success'); }} onUpdateTransaction={(tx) => setTransactions(transactions.map(t => t.id === tx.id ? tx : t))} onDeleteTransaction={(id) => setTransactions(transactions.filter(t => t.id !== id))} userRole={currentUser.role} columns={tablePrefs.transactions} onToggleColumn={(id) => toggleColumn('transactions', id)} />}
                {currentView === AppView.REJECT && <RejectManager rejectMasterData={rejectItems} rejectLogs={rejectLogs} onProcessReject={(log) => setRejectLogs([log, ...rejectLogs])} onUpdateRejectLog={(log) => setRejectLogs(rejectLogs.map(l => l.id === log.id ? log : l))} onDeleteRejectLog={(id) => setRejectLogs(rejectLogs.filter(l => l.id !== id))} onUpdateRejectMaster={setRejectItems} userRole={currentUser.role} columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} />}
                {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
                {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={(s) => setSuppliers(suppliers.map(sup => sup.id === s.id ? s : sup))} onDeleteSupplier={(id) => setSuppliers(suppliers.filter(s => s.id !== id))} userRole={currentUser.role} columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
                {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
                {currentView === AppView.ADMIN && currentUser.role === 'admin' && (
                    <AdminPanel 
                        settings={settings} 
                        onUpdateSettings={handleUpdateSettings} 
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