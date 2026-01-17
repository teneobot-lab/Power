import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage } from './utils/storageUtils';
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
import { LayoutDashboard, Package, Bot, ArrowRightLeft, History, Users, ShieldCheck, AlertCircle, LogOut, Search, Bell, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
    setTransactions(loadFromStorage('smartstock_transactions', []));
    setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
    setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
    const savedUser = sessionStorage.getItem('smartstock_session_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('smartstock_session_user', JSON.stringify(user));
  };

  const navItem = (view: AppView, label: string, Icon: any) => (
    <button 
      onClick={() => setCurrentView(view)} 
      className={`w-full flex items-center gap-4 px-6 py-3.5 text-[13px] font-semibold transition-all duration-300 ${currentView === view ? 'sidebar-active text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} isLoadingData={isLoading} />;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(t => t.filter(x => x.id !== id))} />
      
      <aside className="w-64 border-r border-slate-800/50 bg-[#020617]/50 backdrop-blur-xl flex flex-col flex-shrink-0">
        <div className="p-8 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Package size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white tracking-widest uppercase">Affiliate</span>
            <span className="text-[10px] text-teal-500 font-bold uppercase tracking-[0.2em] -mt-1">Partnership</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItem(AppView.DASHBOARD, "Dashboard", LayoutDashboard)}
          {navItem(AppView.INVENTORY, "Inventory", Package)}
          {navItem(AppView.TRANSACTIONS, "Transactions", ArrowRightLeft)}
          {navItem(AppView.REJECT, "Rejects", AlertCircle)}
          {navItem(AppView.HISTORY, "History Log", History)}
          {navItem(AppView.SUPPLIERS, "Suppliers", Users)}
          {navItem(AppView.AI_ASSISTANT, "AI Assistant", Bot)}
          {currentUser.role === 'admin' && navItem(AppView.ADMIN, "Admin Panel", ShieldCheck)}
        </nav>

        <div className="p-6">
          <button onClick={() => { setCurrentUser(null); sessionStorage.removeItem('smartstock_session_user'); }} className="flex items-center gap-3 text-slate-500 hover:text-rose-400 text-sm font-bold transition-all group">
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" /> 
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/20">
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-800/30">
          <div className="flex items-center gap-4 bg-slate-900/40 px-5 py-2 rounded-2xl border border-slate-800 w-80">
            <Search size={16} className="text-slate-500" />
            <input type="text" placeholder="Search dashboard..." className="bg-transparent outline-none text-xs w-full text-slate-300" />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-white transition-all">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#020617]"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right flex flex-col">
                <span className="text-xs font-bold text-white leading-none">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{currentUser.username}@power.com</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                <UserIcon size={20} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {currentView === AppView.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
          {currentView === AppView.INVENTORY && <InventoryTable items={items} onAddItem={(i) => setItems([...items, i])} onUpdateItem={(u) => setItems(items.map(x => x.id === u.id ? u : x))} onDeleteItem={(id) => setItems(items.filter(x => x.id !== id))} userRole={currentUser.role} columns={tablePrefs.inventory} onToggleColumn={() => {}} />}
          {currentView === AppView.TRANSACTIONS && <TransactionManager inventory={items} transactions={transactions} onProcessTransaction={(tx) => setTransactions([tx, ...transactions])} onUpdateTransaction={(tx) => setTransactions(transactions.map(t => t.id === tx.id ? tx : t))} onDeleteTransaction={(id) => setTransactions(transactions.filter(t => t.id !== id))} userRole={currentUser.role} columns={tablePrefs.transactions} onToggleColumn={() => {}} />}
          {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
          {/* View lainnya dapat dipetakan di sini */}
        </div>
      </main>
    </div>
  );
};

export default App;