
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage } from './utils/storageUtils';
import { fetchBackendData, syncBackendData } from './services/api';
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
import { LayoutDashboard, Package, Bot, Boxes, ArrowRightLeft, History, RefreshCw, Save as SaveIcon, Cloud, CloudOff, Users, ShieldCheck, AlertCircle, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  const [currentUser] = useState<User>(INITIAL_USERS[0]); 
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Muat lokal dulu agar cepat
      const localSettings = loadFromStorage('smartstock_settings', DEFAULT_SETTINGS);
      setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
      setTransactions(loadFromStorage('smartstock_transactions', []));
      setRejectItems(loadFromStorage('smartstock_reject_inventory', []));
      setRejectLogs(loadFromStorage('smartstock_rejects', []));
      setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
      setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
      setSettings(localSettings);

      // Ambil data dari VPS jika ada URL (termasuk '/')
      if (localSettings.viteGasUrl) {
        try {
          const cloudData = await fetchBackendData(localSettings.viteGasUrl);
          if (cloudData) {
            setItems(cloudData.inventory || []);
            setTransactions(cloudData.transactions || []);
            setRejectItems(cloudData.reject_inventory || []);
            setRejectLogs(cloudData.rejects || []);
            setSuppliers(cloudData.suppliers || []);
            setUsers(cloudData.users || []);
            setSettings(prev => ({ ...prev, ...cloudData.settings }));
            setIsCloudConnected(true);
            showToast('Cloud data sinkron', 'success');
          } else {
            // Jika fetch mengembalikan null (error/HTML), tetap di mode lokal
            setIsCloudConnected(false);
          }
        } catch (e) {
          setIsCloudConnected(false);
        }
      }
    } catch (error) {
      showToast('Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const isMounted = useRef(false);
  useEffect(() => { if (!isLoading) isMounted.current = true; }, [isLoading]);

  const syncToCloud = async (type: string, data: any) => {
    if (isMounted.current && isCloudConnected && settings.viteGasUrl) {
      setIsSaving(true);
      await syncBackendData(settings.viteGasUrl, type as any, data);
      setIsSaving(false);
    }
  };

  // Simpan Lokal & Cloud
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

  const addItem = (item: InventoryItem) => { setItems(prev => [...prev, item]); showToast(`${item.name} ditambahkan`, 'success'); };
  const updateItem = (updatedItem: InventoryItem) => { setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item)); showToast(`${updatedItem.name} diperbarui`, 'success'); };
  const deleteItem = (id: string) => { setItems(prev => prev.filter(item => item.id !== id)); showToast('Barang dihapus', 'warning'); };

  const processTransaction = (transaction: Transaction) => {
    try {
        const updatedInventory = calculateStockChange(items, transaction);
        setTransactions(prev => [transaction, ...prev]);
        setItems(updatedInventory);
        showToast(`Transaksi ${transaction.type} diproses`, 'success');
    } catch (e: any) { showToast('Transaksi gagal', 'error'); }
  };

  const calculateStockChange = (currentItems: InventoryItem[], tx: Transaction): InventoryItem[] => {
    const newItems = [...currentItems];
    tx.items.forEach(txItem => {
      const index = newItems.findIndex(i => i.id === txItem.itemId);
      if (index !== -1) {
        const currentQty = newItems[index].quantity;
        const change = txItem.totalBaseQuantity;
        const finalChange = tx.type === 'IN' ? change : -change; 
        newItems[index] = { ...newItems[index], quantity: Math.max(0, currentQty + finalChange), lastUpdated: new Date().toISOString() };
      }
    });
    return newItems;
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><Boxes className="w-6 h-6" /></div><span className="text-xl font-bold tracking-tight uppercase">Power Stock</span></div>
          {/* Mobile close button */}
          <button className="md:hidden p-2 hover:bg-slate-800 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5" /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setCurrentView(AppView.INVENTORY); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.INVENTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Package className="w-5 h-5" /><span className="font-medium">Inventory</span></button>
          <button onClick={() => { setCurrentView(AppView.TRANSACTIONS); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.TRANSACTIONS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><ArrowRightLeft className="w-5 h-5" /><span className="font-medium">Transaksi</span></button>
          <button onClick={() => { setCurrentView(AppView.REJECT); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.REJECT ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-slate-800 text-rose-400'}`}><AlertCircle className="w-5 h-5" /><span className="font-medium">Reject Modul</span></button>
          <button onClick={() => { setCurrentView(AppView.HISTORY); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.HISTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><History className="w-5 h-5" /><span className="font-medium">Riwayat</span></button>
          <button onClick={() => { setCurrentView(AppView.SUPPLIERS); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.SUPPLIERS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /><span className="font-medium">Suppliers</span></button>
          <button onClick={() => { setCurrentView(AppView.AI_ASSISTANT); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.AI_ASSISTANT ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Bot className="w-5 h-5" /><span className="font-medium">AI Agent</span></button>
          
          {currentUser.role === 'admin' && (
             <div className="pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => { setCurrentView(AppView.ADMIN); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.ADMIN ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><ShieldCheck className="w-5 h-5" /><span className="font-medium">Admin Panel</span></button>
             </div>
          )}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="flex justify-between items-center p-4 md:p-8 pb-4 shrink-0 bg-slate-50 z-20">
            <div className="flex items-center gap-4">
                {/* Mobile menu trigger */}
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu className="w-6 h-6" /></button>
                <div><h1 className="text-xl md:text-2xl font-bold text-slate-900">POWER INVENTORY</h1><p className="text-slate-500 text-xs md:text-sm mt-1">Sistem Manajemen Gudang (VPS + Cloud Enabled)</p></div>
            </div>
            <div className="flex items-center gap-3">
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                    {isCloudConnected ? 'Cloud Active' : 'Local Mode'}
                </div>
                {isSaving && <div className="text-[10px] text-slate-400 animate-pulse flex items-center gap-1"><SaveIcon className="w-3 h-3" /> Saving...</div>}
                <button onClick={loadData} className="p-2 text-slate-500 hover:text-blue-600 rounded-full"><RefreshCw className="w-5 h-5" /></button>
            </div>
        </header>
        <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
            {currentView === AppView.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
            {currentView === AppView.INVENTORY && (
                <InventoryTable 
                  items={items} onAddItem={addItem} onUpdateItem={updateItem} onDeleteItem={deleteItem} 
                  userRole={currentUser.role} columns={tablePrefs.inventory} onToggleColumn={(id) => toggleColumn('inventory', id)} 
                />
            )}
            {currentView === AppView.TRANSACTIONS && (
                <TransactionManager 
                  inventory={items} transactions={transactions} onProcessTransaction={processTransaction} onUpdateTransaction={() => {}} 
                  userRole={currentUser.role} columns={tablePrefs.transactions} onToggleColumn={(id) => toggleColumn('transactions', id)}
                />
            )}
            {currentView === AppView.REJECT && (
                <RejectManager 
                    rejectMasterData={rejectItems} rejectLogs={rejectLogs} 
                    onProcessReject={(log) => setRejectLogs(prev => [log, ...prev])} 
                    onUpdateRejectLog={(updatedLog) => setRejectLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l))}
                    onDeleteRejectLog={(id) => setRejectLogs(prev => prev.filter(l => l.id !== id))}
                    onUpdateRejectMaster={setRejectItems}
                    userRole={currentUser.role} columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} 
                />
            )}
            {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
            {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={() => {}} onDeleteSupplier={() => {}} userRole={currentUser.role} columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
            {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
            {currentView === AppView.ADMIN && <AdminPanel settings={settings} onUpdateSettings={setSettings} users={users} onAddUser={() => {}} onUpdateUser={() => {}} onDeleteUser={() => {}} />}
        </div>
      </div>
    </div>
  );
};

export default App;
