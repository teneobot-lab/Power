
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, UserRole, TablePreferences } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage } from './utils/storageUtils';
import { fetchBackendData, syncBackendData } from './services/api';
import useDebounce from './hooks/useDebounce';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import AIAssistant from './components/AIAssistant';
import TransactionManager from './components/TransactionManager';
import ItemHistory from './components/ItemHistory';
import SupplierManager from './components/SupplierManager';
import AdminPanel from './components/AdminPanel';
import ToastContainer from './components/Toast';
import { LayoutDashboard, Package, Bot, Boxes, Bell, ArrowRightLeft, History, Users, Settings as SettingsIcon, RefreshCw, Save as SaveIcon, ChevronDown, User as UserIcon, Menu, X, Cloud, CloudOff, PlugZap, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // --- Global State ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  
  // --- Auth State (Simulated) ---
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); 
  
  // --- UI State ---
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false); // Cloud status
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // --- Debounced States for Persistence ---
  const debouncedItems = useDebounce(items, 1500); // Slightly longer delay for network
  const debouncedTransactions = useDebounce(transactions, 1500);
  const debouncedSuppliers = useDebounce(suppliers, 1500);
  const debouncedUsers = useDebounce(users, 1500);
  const debouncedSettings = useDebounce(settings, 1500);
  const debouncedTablePrefs = useDebounce(tablePrefs, 1000);

  // --- Toast Handler ---
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Helper: Apply Cloud Data to State ---
  const applyCloudData = useCallback((cloudData: any, sourceUrl: string) => {
      setItems(cloudData.inventory || []);
      setTransactions(cloudData.transactions || []);
      setSuppliers(cloudData.suppliers || []);
      setUsers(cloudData.users || []);
      
      // Merge settings but keep the working URL
      setSettings(prev => ({
          ...prev,
          ...cloudData.settings,
          viteGasUrl: sourceUrl, 
          mediaItems: (cloudData.settings as any)?.mediaItems || prev.mediaItems
      }));

      setIsCloudConnected(true);
      setLastSyncError(null);
  }, []);

  // --- Initial Load ---
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load Local First (Fast)
      let localSettings = loadFromStorage('smartstock_settings', DEFAULT_SETTINGS);
      
      // Load other local data
      setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
      setTransactions(loadFromStorage('smartstock_transactions', []));
      setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
      setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
      setTablePrefs(loadFromStorage('smartstock_table_prefs', DEFAULT_TABLE_PREFS));
      
      setSettings(localSettings);

      // 2. Try Connecting to Backend
      if (localSettings.viteGasUrl) {
         showToast(`Connecting to ${localSettings.viteGasUrl}...`, "info");
         try {
            const cloudData = await fetchBackendData(localSettings.viteGasUrl);
            if (cloudData) {
                applyCloudData(cloudData, localSettings.viteGasUrl);
                showToast("Data synced with VPS!", "success");
            } else {
                throw new Error("Empty response");
            }
         } catch(e: any) {
            console.warn("Primary connection failed:", e.message);
            
            // AUTO-HEALING: If direct IP failed, try Proxy ('/')
            if (localSettings.viteGasUrl !== '/') {
                showToast("Direct connection failed. Retrying via Proxy...", "warning");
                try {
                    const proxyData = await fetchBackendData('/');
                    if (proxyData) {
                        console.log("✅ Proxy fallback successful!");
                        applyCloudData(proxyData, '/');
                        saveToStorage('smartstock_settings', { ...localSettings, viteGasUrl: '/' }); // Persist fix
                        showToast("Connected via Proxy (Auto-Fixed)", "success");
                        return; // Exit success
                    }
                } catch (proxyErr) {
                    console.error("Proxy fallback also failed:", proxyErr);
                }
            }

            // If all failed
            setIsCloudConnected(false);
            setLastSyncError(e.message || "Connection failed");
            showToast(`Offline Mode: ${e.message}`, "error");
         }
      }
    } catch (error) {
      showToast('Failed to load local data', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [showToast, applyCloudData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Close Mobile Menu on View Change ---
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  // --- Persist Data Effects (Hybrid: Local + Cloud) ---
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isLoading) isMounted.current = true;
  }, [isLoading]);

  // Helper for Cloud Sync
  const syncToCloud = async (type: string, data: any) => {
    // Only sync if we have a URL and we are successfully connected
    if (settings.viteGasUrl && isMounted.current) {
        if (!isCloudConnected) return; // Don't try syncing if we know we are offline

        setIsSaving(true);
        const result = await syncBackendData(settings.viteGasUrl, type as any, data);
        setIsSaving(false);
        
        if (!result.success) {
            // If it was connected but now failed, mark as disconnected
            setIsCloudConnected(false);
            const msg = result.message || "Unknown error";
            setLastSyncError(msg);
            showToast(`Sync Error: ${msg}`, 'error');
        } else {
            setLastSyncError(null);
        }
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
        saveToStorage('smartstock_suppliers', debouncedSuppliers);
        syncToCloud('suppliers', debouncedSuppliers);
    }
  }, [debouncedSuppliers]);

  useEffect(() => {
    if (isMounted.current) {
        saveToStorage('smartstock_users', debouncedUsers);
        syncToCloud('users', debouncedUsers);
    }
  }, [debouncedUsers]);

  useEffect(() => {
    if (isMounted.current) {
        saveToStorage('smartstock_settings', debouncedSettings);
        // Only sync settings if we have a URL, prevent loop if URL is what we are typing
        if (debouncedSettings.viteGasUrl) {
            syncToCloud('settings', debouncedSettings);
        }
    }
  }, [debouncedSettings]);

  useEffect(() => {
    if (isMounted.current) {
        saveToStorage('smartstock_table_prefs', debouncedTablePrefs);
    }
  }, [debouncedTablePrefs]);

  // --- Stock Alert Logic ---
  useEffect(() => {
    const lowStock = items.filter(i => i.quantity <= i.minLevel);
    if (lowStock.length > 0) {
      setNotifications([`${lowStock.length} items are running low on stock!`]);
    } else {
      setNotifications([]);
    }
  }, [items]);

  // --- Global Refresh Handler ---
  const handleRefresh = () => {
    if(window.confirm("Reload data from cloud? Unsaved changes in forms might be lost.")) {
      loadData();
    }
  };

  // --- Force Connect Handler ---
  const handleForceConnect = () => {
      // UPDATED TO NEW IP
      const vpsUrl = 'http://165.22.251.42:3000';
      setSettings(prev => ({ ...prev, viteGasUrl: vpsUrl }));
      saveToStorage('smartstock_settings', { ...settings, viteGasUrl: vpsUrl });
      window.location.reload(); // Hard reload to force fetch
  };

  // --- Reset to Proxy Handler ---
  const handleResetConnection = () => {
      const proxyUrl = '/';
      setSettings(prev => ({ ...prev, viteGasUrl: proxyUrl }));
      saveToStorage('smartstock_settings', { ...settings, viteGasUrl: proxyUrl });
      window.location.reload();
  };

  // --- Role Switcher ---
  const switchUserRole = (role: UserRole) => {
     const mockUser: User = {
        id: `mock-${role}`,
        name: role === 'admin' ? 'John Doe' : role === 'staff' ? 'Alice Smith' : 'Guest Viewer',
        email: `${role}@smartstock.com`,
        role: role,
        status: 'active'
     };
     setCurrentUser(mockUser);
     if (role !== 'admin' && currentView === AppView.ADMIN) {
        setCurrentView(AppView.DASHBOARD);
     }
     showToast(`Switched to ${role.toUpperCase()} view`, 'info');
     setIsMobileMenuOpen(false);
  };

  // --- Column Preference Handler ---
  const updateColumnVisibility = (table: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [table]: prev[table].map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    }));
  };

  // --- CRUD Handlers ---
  const addItem = (item: InventoryItem) => {
    if (items.some(i => i.sku === item.sku)) {
      showToast(`SKU ${item.sku} already exists!`, 'error');
      return;
    }
    setItems(prev => [...prev, item]);
    showToast(`${item.name} added to inventory`, 'success');
  };

  const batchAddItems = (newItems: InventoryItem[]) => {
    setItems(prev => [...prev, ...newItems]);
    showToast(`${newItems.length} items imported successfully!`, 'success');
  };

  const updateItem = (updatedItem: InventoryItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    showToast(`${updatedItem.name} updated`, 'success');
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showToast('Item deleted from inventory', 'warning');
  };

  const addSupplier = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
    showToast('New supplier registered', 'success');
  };

  const updateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    showToast('Supplier details updated', 'success');
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    showToast('Supplier removed', 'warning');
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
    showToast(`User ${user.name} added`, 'success');
  };
  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    showToast('User updated', 'success');
  };
  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast('User removed', 'warning');
  };
  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    showToast('System settings saved', 'success');
  };

  // --- Transaction Logic ---
  const calculateStockChange = (currentItems: InventoryItem[], tx: Transaction, isRevert: boolean = false): InventoryItem[] => {
    const newItems = [...currentItems];
    
    if (!isRevert && tx.type === 'OUT') {
        for (const txItem of tx.items) {
            const item = newItems.find(i => i.id === txItem.itemId);
            if (!item) continue;
            if (item.quantity < txItem.totalBaseQuantity) {
                throw new Error(`Insufficient stock for ${item.name}. Available: ${item.quantity}, Requested: ${txItem.totalBaseQuantity}`);
            }
        }
    }

    tx.items.forEach(txItem => {
      const index = newItems.findIndex(i => i.id === txItem.itemId);
      if (index !== -1) {
        const currentQty = newItems[index].quantity;
        const change = txItem.totalBaseQuantity;
        
        let finalChange = 0;
        if (tx.type === 'IN') {
           finalChange = isRevert ? -change : change;
        } else { // OUT
           finalChange = isRevert ? change : -change;
        }

        const newQty = Math.max(0, currentQty + finalChange);
        newItems[index] = {
          ...newItems[index],
          quantity: newQty,
          lastUpdated: new Date().toISOString()
        };
      }
    });
    return newItems;
  };

  const processTransaction = (transaction: Transaction) => {
    try {
        if (transaction.items.length === 0) throw new Error("Transaction is empty");
        const updatedInventory = calculateStockChange(items, transaction, false);
        setTransactions(prev => [transaction, ...prev]);
        setItems(updatedInventory);
        showToast('Transaction processed successfully', 'success');
    } catch (e: any) {
        showToast(e.message || 'Transaction failed', 'error');
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
    try {
        const originalTx = transactions.find(t => t.id === updatedTx.id);
        if (!originalTx) throw new Error("Original transaction not found");
        let tempItems = calculateStockChange(items, originalTx, true);
        tempItems = calculateStockChange(tempItems, updatedTx, false);
        setItems(tempItems);
        setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
        showToast('Transaction updated and stock adjusted', 'success');
    } catch (e: any) {
        showToast(e.message || 'Update failed', 'error');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading SmartStock...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <Boxes className="w-6 h-6" />
             </div>
             <span className="text-xl font-bold tracking-tight">SmartStock</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setCurrentView(AppView.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(AppView.INVENTORY)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.INVENTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Inventory</span>
            <span className="ml-auto bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full">{items.length}</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.TRANSACTIONS)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.TRANSACTIONS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <ArrowRightLeft className="w-5 h-5" />
            <span className="font-medium">Transactions</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.HISTORY)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.HISTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <History className="w-5 h-5" />
            <span className="font-medium">History Log</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.SUPPLIERS)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.SUPPLIERS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Suppliers</span>
          </button>

          <button 
            onClick={() => setCurrentView(AppView.AI_ASSISTANT)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.AI_ASSISTANT ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Bot className="w-5 h-5" />
            <span className="font-medium">AI Assistant</span>
          </button>

          {currentUser.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-800">
                <button 
                    onClick={() => setCurrentView(AppView.ADMIN)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === AppView.ADMIN ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                    <SettingsIcon className="w-5 h-5" />
                    <span className="font-medium">Admin Panel</span>
                </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
           <div className="group relative">
             <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-white truncate">{currentUser.name}</span>
                    <span className="text-xs text-slate-400 capitalize">{currentUser.role}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
             </button>
             
             <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 text-xs text-slate-500 uppercase font-bold tracking-wider">Switch Role</div>
                <button onClick={() => switchUserRole('admin')} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 text-sm">Admin</button>
                <button onClick={() => switchUserRole('staff')} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 text-sm">Staff</button>
                <button onClick={() => switchUserRole('viewer')} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 text-sm">Viewer</button>
             </div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between flex-shrink-0 z-30">
           <div className="flex items-center gap-2 font-bold text-slate-900">
             <Boxes className="w-6 h-6 text-blue-600" /> 
             <span className="text-lg">SmartStock</span>
           </div>
           <div className="flex items-center gap-3">
               <button className="relative p-2 text-slate-600">
                    <Bell className="w-6 h-6" />
                    {notifications.length > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-50 rounded-full"></span>
                    )}
               </button>
               <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 text-slate-700 bg-slate-100 rounded-lg"
               >
                 <Menu className="w-6 h-6" />
               </button>
           </div>
        </header>

        <header className="hidden md:flex justify-between items-center p-8 pb-4 shrink-0 bg-slate-50 z-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                {currentView === AppView.DASHBOARD && 'Dashboard Overview'}
                {currentView === AppView.INVENTORY && 'Inventory Management'}
                {currentView === AppView.TRANSACTIONS && 'In/Out Transactions'}
                {currentView === AppView.HISTORY && 'Item History Logs'}
                {currentView === AppView.SUPPLIERS && 'Supplier Management'}
                {currentView === AppView.ADMIN && 'System Administration'}
                {currentView === AppView.AI_ASSISTANT && 'AI Insights & Chat'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manage your warehouse efficiently.</p>
            </div>
            
            <div className="flex items-center gap-3">
                {settings.viteGasUrl && (
                    <div 
                        title={lastSyncError || "Synced successfully"}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border cursor-help ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                    >
                        {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                        {isCloudConnected ? 'Cloud Active' : 'Offline'}
                    </div>
                )}
                
                {!isCloudConnected && settings.viteGasUrl !== '/' && (
                    <button 
                        onClick={handleResetConnection}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-full text-xs font-medium hover:bg-slate-300 shadow-sm"
                        title="Reset to local Proxy (default)"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset Conn
                    </button>
                )}

                {!isCloudConnected && settings.viteGasUrl === '/' && (
                    <button 
                        onClick={handleForceConnect}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 shadow-sm"
                        title="Force connect to IP"
                    >
                        <PlugZap className="w-3 h-3" />
                        Connect VPS
                    </button>
                )}

                {isSaving && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm animate-pulse border border-slate-100">
                        <SaveIcon className="w-3 h-3" />
                        Syncing...
                    </div>
                )}
                
                <button 
                onClick={handleRefresh}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-full transition-colors"
                title="Refresh Data"
                >
                <RefreshCw className="w-5 h-5" />
                </button>

                <div className="relative">
                <button className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-full transition-colors relative">
                    <Bell className="w-6 h-6" />
                    {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-50 rounded-full"></span>
                    )}
                </button>
                </div>
            </div>
        </header>

        {notifications.length > 0 && (
            <div className="mx-4 md:mx-8 mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in flex-shrink-0">
                <span className="font-bold">Alert:</span> {notifications[0]}
            </div>
        )}
        
        {lastSyncError && (
             <div className="mx-4 md:mx-8 mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in flex-shrink-0">
                <CloudOff className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold">Sync Error:</span> {lastSyncError}
                <button onClick={handleResetConnection} className="ml-auto text-xs underline hover:text-rose-900">
                    Reset Settings
                </button>
            </div>
        )}

        <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
            <div className="h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentView === AppView.DASHBOARD && <Dashboard items={items} />}
                
                {currentView === AppView.INVENTORY && (
                    <InventoryTable 
                    items={items} 
                    onAddItem={addItem}
                    onBatchAdd={batchAddItems} 
                    onUpdateItem={updateItem} 
                    onDeleteItem={deleteItem}
                    userRole={currentUser.role}
                    columns={tablePrefs.inventory}
                    onToggleColumn={(id) => updateColumnVisibility('inventory', id)}
                    />
                )}

                {currentView === AppView.TRANSACTIONS && (
                    <TransactionManager 
                    inventory={items}
                    transactions={transactions}
                    onProcessTransaction={processTransaction}
                    onUpdateTransaction={updateTransaction}
                    userRole={currentUser.role}
                    suppliers={suppliers}
                    />
                )}

                {currentView === AppView.HISTORY && (
                    <ItemHistory 
                    transactions={transactions} 
                    items={items} 
                    columns={tablePrefs.history}
                    onToggleColumn={(id) => updateColumnVisibility('history', id)}
                    />
                )}

                {currentView === AppView.SUPPLIERS && (
                    <SupplierManager 
                    suppliers={suppliers}
                    onAddSupplier={addSupplier}
                    onUpdateSupplier={updateSupplier}
                    onDeleteSupplier={deleteSupplier}
                    userRole={currentUser.role}
                    columns={tablePrefs.suppliers}
                    onToggleColumn={(id) => updateColumnVisibility('suppliers', id)}
                    />
                )}

                {currentUser.role === 'admin' && (
                    <div className={currentView === AppView.ADMIN ? 'h-full' : 'fixed top-0 left-0 w-px h-px opacity-0 overflow-hidden pointer-events-none'}>
                        <AdminPanel 
                            settings={settings}
                            onUpdateSettings={updateSettings}
                            users={users}
                            onAddUser={addUser}
                            onUpdateUser={updateUser}
                            onDeleteUser={deleteUser}
                        />
                    </div>
                )}
                
                {currentView === AppView.AI_ASSISTANT && (
                    <AIAssistant 
                        items={items} 
                        apiKey={settings.geminiApiKey} 
                    />
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
