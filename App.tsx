
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, UserRole, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage } from './utils/storageUtils';
import { fetchBackendData, syncBackendData, syncFullToSheets } from './services/api';
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
import { LayoutDashboard, Package, Bot, Boxes, ArrowRightLeft, History, RefreshCw, Save as SaveIcon, Cloud, CloudOff, X, Users, ShieldCheck, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]); // NEW: Reject Master Data
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); 
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

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

  const applyCloudData = useCallback((cloudData: any, sourceUrl: string) => {
      setItems(cloudData.inventory || []);
      setTransactions(cloudData.transactions || []);
      setRejectItems(cloudData.reject_inventory || []);
      setRejectLogs(cloudData.rejects || []);
      setSuppliers(cloudData.suppliers || []);
      setUsers(cloudData.users || []);
      setSettings(prev => ({ ...prev, ...cloudData.settings, viteGasUrl: sourceUrl }));
      if (cloudData.tablePrefs) setTablePrefs(prev => ({ ...prev, ...cloudData.tablePrefs }));
      setIsCloudConnected(true);
      setLastSyncError(null);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let localSettings = loadFromStorage('smartstock_settings', DEFAULT_SETTINGS);
      setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
      setTransactions(loadFromStorage('smartstock_transactions', []));
      setRejectItems(loadFromStorage('smartstock_reject_inventory', []));
      setRejectLogs(loadFromStorage('smartstock_rejects', []));
      setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
      setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
      setTablePrefs(loadFromStorage('smartstock_table_prefs', DEFAULT_TABLE_PREFS));
      setSettings(localSettings);

      if (localSettings.viteGasUrl && localSettings.viteGasUrl !== '/') {
         try {
            const cloudData = await fetchBackendData(localSettings.viteGasUrl);
            if (cloudData) applyCloudData(cloudData, localSettings.viteGasUrl);
         } catch(e: any) {
            setIsCloudConnected(false);
            setLastSyncError(e.message || "Connection failed");
         }
      }
    } catch (error) {
      showToast('Gagal memuat data lokal', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, applyCloudData]);

  useEffect(() => { loadData(); }, [loadData]);

  const isMounted = useRef(false);
  useEffect(() => { if (!isLoading) isMounted.current = true; }, [isLoading]);

  const syncToCloud = async (type: string, data: any) => {
    if (settings.viteGasUrl && isMounted.current && isCloudConnected) {
        setIsSaving(true);
        const result = await syncBackendData(settings.viteGasUrl, type as any, data);
        setIsSaving(false);
        if (!result.success) {
            setIsCloudConnected(false);
            setLastSyncError(result.message || "Sync error");
        }
    }
  };

  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_inventory', debouncedItems); syncToCloud('inventory', debouncedItems); } }, [debouncedItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_transactions', debouncedTransactions); syncToCloud('transactions', debouncedTransactions); } }, [debouncedTransactions]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_reject_inventory', debouncedRejectItems); syncToCloud('reject_inventory', debouncedRejectItems); } }, [debouncedRejectItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_rejects', debouncedRejectLogs); syncToCloud('rejects', debouncedRejectLogs); } }, [debouncedRejectLogs]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_suppliers', debouncedSuppliers); syncToCloud('suppliers', debouncedSuppliers); } }, [debouncedSuppliers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_users', debouncedUsers); syncToCloud('users', debouncedUsers); } }, [debouncedUsers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_settings', debouncedSettings); if (debouncedSettings.viteGasUrl) syncToCloud('settings', debouncedSettings); } }, [debouncedSettings]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_table_prefs', debouncedTablePrefs); syncToCloud('table_prefs', debouncedTablePrefs); } }, [debouncedTablePrefs]);

  const toggleColumn = (module: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [module]: prev[module].map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    }));
  };

  const handleFullSyncToSheets = async (): Promise<boolean> => {
    if (!settings.viteGasUrl) return false;
    try {
      const fullData = {
        inventory: items,
        transactions: transactions,
        rejectItems: rejectItems,
        rejectLogs: rejectLogs,
        suppliers: suppliers,
        users: users,
        settings: settings
      };
      const result = await syncFullToSheets(settings.viteGasUrl, fullData as any);
      if (result.success) {
        showToast('Sync Google Sheets Berhasil!', 'success');
        setSettings(prev => ({ ...prev, lastSheetSync: new Date().toISOString() }));
        return true;
      }
      return false;
    } catch (e) { return false; }
  };

  const addItem = (item: InventoryItem) => { setItems(prev => [...prev, item]); showToast(`${item.name} ditambahkan ke Inventory`, 'success'); };
  const updateItem = (updatedItem: InventoryItem) => { setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item)); showToast(`${updatedItem.name} diperbarui`, 'success'); };
  const deleteItem = (id: string) => { setItems(prev => prev.filter(item => item.id !== id)); showToast('Barang dihapus dari Inventory', 'warning'); };

  const processTransaction = (transaction: Transaction) => {
    try {
        const updatedInventory = calculateStockChange(items, transaction, false);
        setTransactions(prev => [transaction, ...prev]);
        setItems(updatedInventory);
        showToast(`Transaksi ${transaction.type} diproses`, 'success');
    } catch (e: any) { showToast(e.message || 'Transaksi gagal', 'error'); }
  };

  const processReject = (log: RejectLog) => {
    setRejectLogs(prev => [log, ...prev]);
    showToast(`Reject record disimpan ke Reject Database`, 'success');
  };

  const setRejectMasterData = (newList: RejectItem[]) => {
    setRejectItems(newList);
    showToast(`Reject Master Data diperbarui`, 'success');
  };

  const calculateStockChange = (currentItems: InventoryItem[], tx: Transaction, isRevert: boolean = false): InventoryItem[] => {
    const newItems = [...currentItems];
    tx.items.forEach(txItem => {
      const index = newItems.findIndex(i => i.id === txItem.itemId);
      if (index !== -1) {
        const currentQty = newItems[index].quantity;
        const change = txItem.totalBaseQuantity;
        let finalChange = 0;
        if (tx.type === 'IN') finalChange = isRevert ? -change : change;
        else finalChange = isRevert ? change : -change; 
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
          <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><Boxes className="w-6 h-6" /></div><span className="text-xl font-bold tracking-tight">SmartStock</span></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button onClick={() => setCurrentView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5" /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => setCurrentView(AppView.INVENTORY)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.INVENTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Package className="w-5 h-5" /><span className="font-medium">Inventory Master</span></button>
          <button onClick={() => setCurrentView(AppView.TRANSACTIONS)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.TRANSACTIONS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><ArrowRightLeft className="w-5 h-5" /><span className="font-medium">Transaksi</span></button>
          <button onClick={() => setCurrentView(AppView.REJECT)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.REJECT ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-slate-800 text-rose-400'}`}><AlertCircle className="w-5 h-5" /><span className="font-medium">Reject Modul</span></button>
          <button onClick={() => setCurrentView(AppView.HISTORY)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.HISTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><History className="w-5 h-5" /><span className="font-medium">Riwayat Log</span></button>
          <button onClick={() => setCurrentView(AppView.SUPPLIERS)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.SUPPLIERS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /><span className="font-medium">Suppliers</span></button>
          <button onClick={() => setCurrentView(AppView.AI_ASSISTANT)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.AI_ASSISTANT ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Bot className="w-5 h-5" /><span className="font-medium">AI Assistant</span></button>
          
          {currentUser.role === 'admin' && (
             <div className="pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => setCurrentView(AppView.ADMIN)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.ADMIN ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><ShieldCheck className="w-5 h-5" /><span className="font-medium">Admin Panel</span></button>
             </div>
          )}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="hidden md:flex justify-between items-center p-8 pb-4 shrink-0 bg-slate-50 z-20">
            <div><h1 className="text-2xl font-bold text-slate-900">Gudang SmartStock</h1><p className="text-slate-500 text-sm mt-1">Sistem Manajemen Inventori Real-time</p></div>
            <div className="flex items-center gap-3">
                {settings.viteGasUrl && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}{isCloudConnected ? 'Cloud Active' : 'Offline'}
                    </div>
                )}
                {isSaving && <div className="flex items-center gap-1.5 text-xs text-slate-400 animate-pulse"><SaveIcon className="w-3 h-3" />Syncing...</div>}
                <button onClick={loadData} className="p-2 text-slate-500 hover:text-blue-600 rounded-full"><RefreshCw className="w-5 h-5" /></button>
            </div>
        </header>
        <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
            {currentView === AppView.DASHBOARD && <Dashboard items={items} />}
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
                    rejectMasterData={rejectItems} rejectLogs={rejectLogs} onProcessReject={processReject} onUpdateRejectMaster={setRejectMasterData}
                    userRole={currentUser.role} columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} 
                />
            )}
            {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
            {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={() => {}} onDeleteSupplier={() => {}} userRole={currentUser.role} columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
            {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
            {currentView === AppView.ADMIN && <AdminPanel settings={settings} onUpdateSettings={setSettings} users={users} onAddUser={() => {}} onUpdateUser={() => {}} onDeleteUser={() => {}} onFullSyncToSheets={handleFullSyncToSheets} />}
        </div>
      </div>
    </div>
  );
};

export default App;
