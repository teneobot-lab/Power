import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItemDetail, TransactionType, UserRole, Supplier } from '../types';
import { Calendar, Plus, Save, Trash2, ArrowUpRight, ArrowDownLeft, Search, Package, Check, X, Edit3, AlertCircle, ShieldAlert, FileText, Camera, Upload, Image as ImageIcon, Truck } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface TransactionManagerProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  onProcessTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  userRole: UserRole;
  suppliers?: Supplier[];
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  inventory, transactions, onProcessTransaction, onUpdateTransaction, userRole, suppliers = [] 
}) => {
  const canEdit = userRole === 'admin' || userRole === 'staff';
  
  // Force history tab if viewer, otherwise default to new
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  
  useEffect(() => {
    if (!canEdit) {
        setActiveTab('history');
    }
  }, [canEdit]);
  
  // --- New Transaction Form State ---
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('IN');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<TransactionItemDetail[]>([]);
  
  // New Inbound Fields State
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [riNumber, setRiNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- Item Selection State (Shared logic reused in both New & Edit) ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [cartError, setCartError] = useState<string | null>(null);
  
  // --- Edit Modal State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  // Edit Form specific states
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<TransactionType>('IN');
  const [editNotes, setEditNotes] = useState('');
  const [editCartItems, setEditCartItems] = useState<TransactionItemDetail[]>([]);
  
  // Edit Inbound Fields
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editPoNumber, setEditPoNumber] = useState('');
  const [editRiNumber, setEditRiNumber] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);

  // Refs for click outside
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  // Close autocomplete when clicking outside (Main Form)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Enhanced Search Logic: Multi-term flexible matching using Debounced Query
  const filteredInventory = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    const terms = debouncedSearchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    return inventory.filter(item => {
      const searchString = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
      return terms.every(term => searchString.includes(term));
    }).slice(0, 8); 
  }, [debouncedSearchQuery, inventory]);

  // Reset navigation index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearchQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isAutocompleteOpen || filteredInventory.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredInventory.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredInventory.length) {
        handleSelectItem(filteredInventory[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAutocompleteOpen(false);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setIsAutocompleteOpen(false);
    setActiveIndex(-1);
    setCartError(null);
  };

  const handleAddToCart = (targetCart: 'new' | 'edit') => {
    setCartError(null);
    if (!selectedItem) {
        setCartError("Please select an item first.");
        return;
    }
    if (quantityInput <= 0) {
        setCartError("Quantity must be greater than 0.");
        return;
    }

    let ratio = 1;
    if (selectedItem.alternativeUnits && selectedUnit !== selectedItem.baseUnit) {
      const alt = selectedItem.alternativeUnits.find(u => u.name === selectedUnit);
      if (alt) ratio = alt.ratio;
    }
    
    const totalBase = quantityInput * ratio;
    
    // Check stock for OUT transaction (Pre-cart check)
    const currentTxType = targetCart === 'new' ? type : editType;
    if (currentTxType === 'OUT') {
        if (selectedItem.quantity < totalBase) {
            setCartError(`Insufficient stock! Available: ${selectedItem.quantity} ${selectedItem.baseUnit}, Needed: ${totalBase} ${selectedItem.baseUnit}`);
            return;
        }
    }

    const newItem: TransactionItemDetail = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantityInput: quantityInput,
      selectedUnit: selectedUnit,
      conversionRatio: ratio,
      totalBaseQuantity: totalBase
    };

    if (targetCart === 'new') {
      setCartItems([...cartItems, newItem]);
    } else {
      setEditCartItems([...editCartItems, newItem]);
    }
    
    // Reset selection
    setSelectedItem(null);
    setSearchQuery('');
    setQuantityInput(1);
    setSelectedUnit('');
    setIsAutocompleteOpen(false);
  };

  const handleRemoveFromCart = (index: number, targetCart: 'new' | 'edit') => {
    if (targetCart === 'new') {
        const newCart = [...cartItems];
        newCart.splice(index, 1);
        setCartItems(newCart);
    } else {
        const newCart = [...editCartItems];
        newCart.splice(index, 1);
        setEditCartItems(newCart);
    }
  };

  // --- Photo Upload Logic ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newBase64s: string[] = [];

      for (const file of files) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (readerEvent) => {
             resolve(readerEvent.target?.result as string);
          };
        });
        reader.readAsDataURL(file);
        newBase64s.push(await base64Promise);
      }
      
      if (target === 'new') {
        setPhotos(prev => [...prev, ...newBase64s]);
      } else {
        setEditPhotos(prev => [...prev, ...newBase64s]);
      }
    }
  };

  const removePhoto = (index: number, target: 'new' | 'edit') => {
     if (target === 'new') {
        setPhotos(prev => prev.filter((_, i) => i !== index));
     } else {
        setEditPhotos(prev => prev.filter((_, i) => i !== index));
     }
  };

  const handleSubmitTransaction = () => {
    if (cartItems.length === 0) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      date,
      type,
      items: cartItems,
      notes,
      timestamp: new Date().toISOString(),
      // Add optional inbound fields only if type is IN (or if provided)
      ...(type === 'IN' ? {
        supplierName: supplierName || undefined,
        poNumber: poNumber || undefined,
        riNumber: riNumber || undefined,
        photos: photos.length > 0 ? photos : undefined
      } : {})
    };

    onProcessTransaction(transaction);
    
    // Reset form
    setCartItems([]);
    setNotes('');
    setSelectedItem(null);
    setSearchQuery('');
    setSupplierName('');
    setPoNumber('');
    setRiNumber('');
    setPhotos([]);
  };

  // --- Edit Handlers ---
  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditDate(tx.date);
    setEditType(tx.type);
    setEditNotes(tx.notes || '');
    setEditCartItems([...tx.items]);
    
    // Populate Inbound fields
    setEditSupplierName(tx.supplierName || '');
    setEditPoNumber(tx.poNumber || '');
    setEditRiNumber(tx.riNumber || '');
    setEditPhotos(tx.photos || []);

    setSearchQuery('');
    setSelectedItem(null);
    setQuantityInput(1);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction || editCartItems.length === 0) return;

    const updatedTx: Transaction = {
        ...editingTransaction,
        date: editDate,
        type: editType,
        notes: editNotes,
        items: editCartItems,
        // Update Inbound fields
        ...(editType === 'IN' ? {
            supplierName: editSupplierName || undefined,
            poNumber: editPoNumber || undefined,
            riNumber: editRiNumber || undefined,
            photos: editPhotos.length > 0 ? editPhotos : undefined
        } : {
            supplierName: undefined,
            poNumber: undefined,
            riNumber: undefined,
            photos: undefined
        })
    };

    onUpdateTransaction(updatedTx);
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  // Reusable Item Input Section
  const renderItemInput = (target: 'new' | 'edit', containerRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        {cartError && (
            <div className="text-rose-600 text-xs bg-rose-50 border border-rose-200 p-2 rounded flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> {cartError}
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5 relative" ref={containerRef}>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Item Search</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                type="text"
                placeholder="Type SKU or Name..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsAutocompleteOpen(true);
                    if (!e.target.value) setSelectedItem(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsAutocompleteOpen(true)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoComplete="off"
                />
            </div>
            {isAutocompleteOpen && filteredInventory.length > 0 && searchQuery && (
                <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {filteredInventory.map((item, index) => (
                    <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 flex justify-between items-center group transition-colors ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                    <div>
                        <div className={`font-medium text-sm ${index === activeIndex ? 'text-blue-700' : 'text-slate-800'}`}>{item.name}</div>
                        <div className="text-xs text-slate-500">SKU: {item.sku} | Stock: {item.quantity} {item.baseUnit}</div>
                    </div>
                    {index === activeIndex ? (
                        <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                        <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    )}
                    </button>
                ))}
                </div>
            )}
        </div>

        <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Unit</label>
                <select
                disabled={!selectedItem}
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                {selectedItem && (
                    <>
                    <option value={selectedItem.baseUnit}>{selectedItem.baseUnit} (1)</option>
                    {selectedItem.alternativeUnits?.map(u => (
                        <option key={u.name} value={u.name}>{u.name} ({u.ratio})</option>
                    ))}
                    </>
                )}
                </select>
        </div>

        <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Quantity</label>
            <input 
                type="number"
                min="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(Number(e.target.value))}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddToCart(target);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

        <div className="md:col-span-2">
            <button
                onClick={() => handleAddToCart(target)}
                disabled={!selectedItem}
                className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Add
            </button>
        </div>
        </div>
        {selectedItem && (
            <div className="text-xs text-slate-500 flex gap-2">
                <span>Preview Conversion:</span>
                <span className="font-medium text-slate-700">
                {quantityInput} {selectedUnit} = {quantityInput * (selectedUnit === selectedItem.baseUnit ? 1 : selectedItem.alternativeUnits?.find(u => u.name === selectedUnit)?.ratio || 1)} {selectedItem.baseUnit}
                </span>
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      {/* View Only Banner */}
      {!canEdit && (
         <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-3 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
            <div className="text-sm">
                <span className="font-bold">Viewer Mode:</span> You have read-only access to transactions history.
            </div>
         </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 flex-shrink-0">
        {canEdit && (
            <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'new' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
            New Transaction
            </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          History Log
        </button>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
          {/* Left: Input Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Transaction Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setType('IN')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Inbound (Masuk)
                    </button>
                    <button
                      onClick={() => setType('OUT')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Outbound (Keluar)
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Inbound Specific Fields */}
              {type === 'IN' && (
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Inbound Document Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name</label>
                              <input 
                                  type="text"
                                  value={supplierName}
                                  onChange={(e) => setSupplierName(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="Type supplier name..."
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">PO Number (Purchase Order)</label>
                              <input 
                                  type="text"
                                  value={poNumber}
                                  onChange={(e) => setPoNumber(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="e.g. PO-2023-001"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">No. RI / Surat Jalan</label>
                              <input 
                                  type="text"
                                  value={riNumber}
                                  onChange={(e) => setRiNumber(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="e.g. SJ-12345"
                              />
                          </div>
                          
                          {/* Photo Upload */}
                          <div className="col-span-1 md:col-span-2">
                               <label className="block text-xs font-medium text-slate-600 mb-1">Document Photos / Evidence</label>
                               <div className="flex items-center gap-4">
                                   <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-600 transition-colors">
                                       <Camera className="w-4 h-4" />
                                       <span>Upload Photos</span>
                                       <input 
                                           type="file" 
                                           multiple 
                                           accept="image/*"
                                           onChange={(e) => handlePhotoUpload(e, 'new')}
                                           className="hidden"
                                       />
                                   </label>
                                   <div className="flex gap-2 overflow-x-auto pb-1">
                                       {photos.map((p, idx) => (
                                           <div key={idx} className="relative w-10 h-10 flex-shrink-0 group">
                                               <img src={p} alt={`preview-${idx}`} className="w-full h-full object-cover rounded-md border border-slate-200" />
                                               <button 
                                                    onClick={() => removePhoto(idx, 'new')}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                               >
                                                   <X className="w-3 h-3" />
                                               </button>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Autocomplete Item Selection */}
              {renderItemInput('new', searchRef)}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                  placeholder="Reference number, additional details..."
                />
              </div>
            </div>
          </div>

          {/* Right: Cart Summary */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                  <h4 className="font-semibold text-slate-800 flex justify-between items-center">
                    Current Batch
                    <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">{cartItems.length} Items</span>
                  </h4>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-3 custom-scrollbar">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No items added yet.
                    </div>
                  ) : (
                    cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg group border border-transparent hover:border-slate-200 transition-all">
                         <div>
                            <div className="font-medium text-sm text-slate-800">{item.itemName}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.quantityInput} {item.selectedUnit} <span className="text-slate-300 mx-1">|</span> Total: {item.totalBaseQuantity} Base
                            </div>
                         </div>
                         <button 
                           onClick={() => handleRemoveFromCart(idx, 'new')}
                           className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 mt-auto bg-white">
                   <button
                     onClick={handleSubmitTransaction}
                     disabled={cartItems.length === 0}
                     className={`w-full py-3 rounded-lg text-sm font-bold text-white flex justify-center items-center gap-2 transition-all ${cartItems.length === 0 ? 'bg-slate-300 cursor-not-allowed' : type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200'}`}
                   >
                     <Save className="w-4 h-4" />
                     Confirm {type === 'IN' ? 'Inbound' : 'Outbound'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        // History Tab with Freeze Panel
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-1 custom-scrollbar">
             <table className="w-full text-left border-collapse min-w-[800px]">
               <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                 <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                   <th className="px-6 py-4 bg-slate-50">Date</th>
                   <th className="px-6 py-4 bg-slate-50">Type</th>
                   <th className="px-6 py-4 bg-slate-50">Items Count</th>
                   <th className="px-6 py-4 bg-slate-50">Details</th>
                   <th className="px-6 py-4 text-right bg-slate-50">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 text-sm">
                 {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                 ) : (
                    [...transactions].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-medium">{tx.date}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                             {tx.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                             {tx.type}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {tx.items.length} Items ({tx.items.reduce((acc, i) => acc + i.totalBaseQuantity, 0)} Total Base Qty)
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs">
                             <div className="flex flex-col gap-0.5">
                                <span className="truncate">{tx.notes || '-'}</span>
                                {tx.type === 'IN' && (
                                    <span className="text-[10px] text-slate-400 flex flex-col gap-0.5 mt-1">
                                        {tx.supplierName && (
                                            <span className="flex items-center gap-1 font-medium text-slate-600">
                                                <Truck className="w-3 h-3" /> {tx.supplierName}
                                            </span>
                                        )}
                                        <div className="flex gap-1 flex-wrap">
                                            {tx.poNumber && <span className="bg-slate-100 px-1 rounded">PO: {tx.poNumber}</span>}
                                            {tx.riNumber && <span className="bg-slate-100 px-1 rounded">RI: {tx.riNumber}</span>}
                                            {tx.photos && tx.photos.length > 0 && <ImageIcon className="w-3 h-3" />}
                                        </div>
                                    </span>
                                )}
                             </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           {/* Even viewers can 'view' details, so we keep the button but maybe change icon/label if read-only */}
                           <button 
                             onClick={() => openEditModal(tx)}
                             className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center justify-end gap-1"
                           >
                             <Edit3 className="w-3 h-3" /> {canEdit ? 'Edit / View' : 'View Details'}
                           </button>
                        </td>
                      </tr>
                    ))
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Edit Modal - Render conditionally based on active state but controlled by canEdit inside */}
      {isEditModalOpen && editingTransaction && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                     <div className="bg-blue-100 p-2 rounded-lg">
                        <Edit3 className="w-4 h-4 text-blue-600" />
                     </div>
                     <h3 className="font-bold text-slate-800">{canEdit ? 'Edit Transaction' : 'Transaction Details'}</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-6 h-6" />
                  </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
                 {/* Top Controls - Disabled if not editable */}
                 <fieldset disabled={!canEdit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input 
                                type="date" 
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button
                                onClick={() => setEditType('IN')}
                                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${editType === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'} disabled:opacity-70`}
                                >
                                Inbound
                                </button>
                                <button
                                onClick={() => setEditType('OUT')}
                                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${editType === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'} disabled:opacity-70`}
                                >
                                Outbound
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Edit Inbound specific fields */}
                    {editType === 'IN' && (
                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="text-sm font-bold text-slate-700 mb-3">Inbound Details</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name</label>
                                    <input 
                                        type="text"
                                        value={editSupplierName}
                                        onChange={(e) => setEditSupplierName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                        placeholder="Supplier Name..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">PO Number</label>
                                    <input 
                                        type="text"
                                        value={editPoNumber}
                                        onChange={(e) => setEditPoNumber(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">RI / Surat Jalan</label>
                                    <input 
                                        type="text"
                                        value={editRiNumber}
                                        onChange={(e) => setEditRiNumber(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                     <label className="block text-xs font-medium text-slate-600 mb-1">Photos</label>
                                     <div className="flex gap-2 flex-wrap">
                                         {editPhotos.map((p, idx) => (
                                             <div key={idx} className="relative w-16 h-16 group">
                                                 <img src={p} alt="doc" className="w-full h-full object-cover rounded border border-slate-300" />
                                                  {canEdit && (
                                                    <button 
                                                        onClick={() => removePhoto(idx, 'edit')}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                  )}
                                             </div>
                                         ))}
                                         {canEdit && (
                                             <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-slate-400">
                                                 <Upload className="w-4 h-4" />
                                                 <span className="text-[9px] mt-1">Upload</span>
                                                 <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*"
                                                    onChange={(e) => handlePhotoUpload(e, 'edit')}
                                                    className="hidden"
                                                 />
                                             </label>
                                         )}
                                     </div>
                                </div>
                             </div>
                         </div>
                    )}

                    {/* Cart Edit Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            {canEdit && (
                                <>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Add/Edit Items</h4>
                                    {renderItemInput('edit', editSearchRef)}
                                </>
                            )}

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea 
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-100"
                                    rows={2}
                                />
                            </div>
                        </div>
                        
                        <div className="lg:col-span-1 bg-slate-50 rounded-lg border border-slate-200 p-4">
                            <h4 className="font-semibold text-slate-800 mb-3 text-sm flex justify-between">
                                Items in Transaction
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{editCartItems.length}</span>
                            </h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {editCartItems.map((item, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded border border-slate-200 flex justify-between items-start group">
                                        <div>
                                            <div className="font-medium text-sm text-slate-800">{item.itemName}</div>
                                            <div className="text-xs text-slate-500">{item.quantityInput} {item.selectedUnit}</div>
                                        </div>
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleRemoveFromCart(idx, 'edit')}
                                                className="text-slate-400 hover:text-rose-500 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {editCartItems.length === 0 && (
                                    <div className="text-center py-6 text-slate-400 text-xs">No items.</div>
                                )}
                            </div>
                        </div>
                    </div>
                 </fieldset>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white sticky bottom-0 z-10">
                 <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                 >
                    Close
                 </button>
                 {canEdit && (
                    <button
                        onClick={handleSaveEdit}
                        disabled={editCartItems.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes & Update Stock
                    </button>
                 )}
              </div>
           </div>
         </div>
      )}
    </div>
  );
};

export default TransactionManager;