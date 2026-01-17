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
import { LayoutDashboard, Package, Bot, Eye, EyeOff, ArrowRightLeft, History, RefreshCw, Save as SaveIcon, Cloud, CloudOff, Users, ShieldCheck, AlertCircle, Menu, PanelLeftClose, PanelLeftOpen, LogOut, Terminal, User as UserIcon, Bell } from 'lucide-react';

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
    w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group
    ${currentView === view 
      ? 'sidebar-item-active text-white' 
      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
  `;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Sidebar - Premium SaaS Look */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-r border-white/5 flex flex-col shadow-2xl transform transition-all duration-500 ease-in-out md:relative md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-[280px] md:opacity-100'}
        w-[280px]`}
      >
        <div className="h-28 flex items-center px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Terminal className="w-5 h-5 text-white" />
             </div>
             <div>
                <span className="block text-sm font-extrabold tracking-tight text-white uppercase">Steel Core</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">v4.0.2 System</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto flex flex-col custom-scrollbar">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.DASHBOARD)}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">Dashboard</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.INVENTORY); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.INVENTORY)}>
            <Package className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">Inventory</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.TRANSACTIONS); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.TRANSACTIONS)}>
            <ArrowRightLeft className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">Transactions</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.REJECT); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.REJECT)}>
            <AlertCircle className="w-5 h-5 text-rose-500/80" />
            <span className="font-bold text-xs uppercase tracking-wider">Rejects</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.HISTORY); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.HISTORY)}>
            <History className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">History Log</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.SUPPLIERS); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.SUPPLIERS)}>
            <Users className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">Suppliers</span>
          </button>
          <button onClick={() => { setCurrentView(AppView.AI_ASSISTANT); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.AI_ASSISTANT)}>
            <Bot className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider">AI Agent</span>
          </button>
          
          <div className="pt-4 mt-2 border-t border-white/5">
            {currentUser.role === 'admin' && (
              <button onClick={() => { setCurrentView(AppView.ADMIN); setIsMobileMenuOpen(false); }} className={navItemClass(AppView.ADMIN)}>
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Admin</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
               <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
               <p className="text-[11px] font-bold text-white truncate">{currentUser.name}</p>
               <p className="text-[9px] text-slate-500 uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-rose-500/10 text-rose-400 group">
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-wider">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-6 md:px-10 flex-shrink-0 z-40 bg-[#020617]/50 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5"><Menu className="w-6 h-6" /></button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all">
                  {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
                <div className="flex flex-col">
                  <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    {currentView.charAt(0) + currentView.slice(1).toLowerCase()}
                  </h1>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                  ${isCloudConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                    {isCloudConnected ? 'Cloud Active' : 'Disconnected'}
                </div>
                <button onClick={() => loadData()} className="p-2.5 text-slate-400 hover:text-blue-400 bg-white/5 border border-white/5 rounded-xl transition-all">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-slate-400 hover:text-white bg-white/5 border border-white/5 rounded-xl transition-all relative">
                   <Bell className="w-5 h-5" />
                   <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-hidden p-6 md:p-10 relative">
            <div className="h-full w-full overflow-y-auto custom-scrollbar view-transition">
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