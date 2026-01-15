import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItemDetail, TransactionType, UserRole, Supplier, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Calendar, Plus, Save, Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Package, Check, X, Edit3, AlertCircle, ShieldAlert, FileText, Camera, ImageIcon, Columns, Maximize2, AlertTriangle } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface TransactionManagerProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  onProcessTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  userRole: UserRole;
  suppliers?: Supplier[];
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  inventory, transactions, onProcessTransaction, onUpdateTransaction, userRole, suppliers = [], columns, onToggleColumn 
}) => {
  const canEdit = userRole === 'admin' || userRole === 'staff';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { if (!canEdit) setActiveTab('history'); }, [canEdit]);
  
  // --- New Transaction Form State ---
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('IN');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<TransactionItemDetail[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [riNumber, setRiNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- Item Selection State ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  // --- Validation State ---
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- Edit Modal State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<TransactionType>('IN');
  const [editNotes, setEditNotes] = useState('');
  const [editCartItems, setEditCartItems] = useState<TransactionItemDetail[]>([]);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editPoNumber, setEditPoNumber] = useState('');
  const [editRiNumber, setEditRiNumber] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
      if (editSearchRef.current && !editSearchRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) setIsColumnMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time stock validation check
  useEffect(() => {
    if (type === 'OUT' && selectedItem && quantityInput) {
      // Check total requested in cart for this item already
      const alreadyInCart = cartItems
        .filter(it => it.itemId === selectedItem.id)
        .reduce((sum, current) => sum + current.totalBaseQuantity, 0);
      
      const totalRequested = alreadyInCart + quantityInput;

      if (totalRequested > selectedItem.quantity) {
        setValidationError(`Stok tidak mencukupi. Tersedia: ${selectedItem.quantity} ${selectedItem.baseUnit}`);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [quantityInput, selectedItem, type, cartItems]);

  const filteredInventory = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    return inventory.filter(item => 
      item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ).slice(0, 8); 
  }, [debouncedSearchQuery, inventory]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setIsAutocompleteOpen(false);
    setValidationError(null);
  };

  const handleAddToCart = (targetCart: 'new' | 'edit') => {
    if (!selectedItem || !quantityInput) return;
    
    // Final check for OUT transactions
    if (type === 'OUT') {
        const alreadyInCart = (targetCart === 'new' ? cartItems : editCartItems)
            .filter(it => it.itemId === selectedItem.id)
            .reduce((sum, current) => sum + current.totalBaseQuantity, 0);
        
        if (alreadyInCart + quantityInput > selectedItem.quantity) {
            alert(`Gagal: Total pengambilan (${alreadyInCart + quantityInput}) melebihi stok yang ada (${selectedItem.quantity}).`);
            return;
        }
    }

    const newItem: TransactionItemDetail = {
      itemId: selectedItem.id, itemName: selectedItem.name, quantityInput, selectedUnit, conversionRatio: 1, totalBaseQuantity: quantityInput
    };
    if (targetCart === 'new') setCartItems([...cartItems, newItem]);
    else setEditCartItems([...editCartItems, newItem]);
    setSelectedItem(null); setSearchQuery(''); setQuantityInput(undefined); setValidationError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newBase64s = await Promise.all(files.map((file: File) => {
        return new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }));
      if (target === 'new') setPhotos(prev => [...prev, ...newBase64s]);
      else setEditPhotos(prev => [...prev, ...newBase64s]);
    }
  };

  const handleSubmitTransaction = () => {
    if (cartItems.length === 0) return;
    onProcessTransaction({
      id: generateId(), date, type, items: cartItems, notes, timestamp: new Date().toISOString(),
      ...(type === 'IN' ? { supplierName, poNumber, riNumber, photos } : {})
    });
    setCartItems([]); setNotes(''); setPhotos([]); setSupplierName(''); setPoNumber(''); setRiNumber('');
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditDate(tx.date); setEditType(tx.type); setEditNotes(tx.notes || '');
    setEditCartItems([...tx.items]);
    setEditSupplierName(tx.supplierName || '');
    setEditPoNumber(tx.poNumber || '');
    setEditRiNumber(tx.riNumber || '');
    setEditPhotos(tx.photos || []);
    setIsEditModalOpen(true);
  };

  const updateEditItemQty = (index: number, newQty: number) => {
    const updated = [...editCartItems];
    const itemInInv = inventory.find(i => i.id === updated[index].itemId);
    
    // If it's an OUT transaction, validate against inventory
    if (editType === 'OUT' && itemInInv) {
        // Note: For existing transactions, validating might be tricky since 
        // the original stock level already changed. 
        // Simple validation against current stock + original transaction amount if we wanted to be precise.
    }
    
    updated[index] = { ...updated[index], quantityInput: newQty, totalBaseQuantity: newQty * (updated[index].conversionRatio || 1) };
    setEditCartItems(updated);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;
    const updatedTx: Transaction = {
      ...editingTransaction,
      date: editDate,
      type: editType,
      items: editCartItems,
      notes: editNotes,
      supplierName: editSupplierName,
      poNumber: editPoNumber,
      riNumber: editRiNumber,
      photos: editPhotos,
    };
    onUpdateTransaction(updatedTx);
    setIsEditModalOpen(false);
  };

  const renderItemInput = (target: 'new' | 'edit', containerRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 relative" ref={containerRef}>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pencarian Barang</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    value={searchQuery} 
                    onFocus={() => setIsAutocompleteOpen(true)} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="Ketik nama atau SKU..." 
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              {isAutocompleteOpen && filteredInventory.length > 0 && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-[60] max-h-48 overflow-auto border-slate-200">
                    {filteredInventory.map(item => (
                        <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                            <div className="text-sm font-medium text-slate-800">{item.name}</div>
                            <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">SKU: {item.sku}</span>
                                <span className="text-[10px] text-blue-600 font-bold">Stok: {item.quantity} {item.baseUnit}</span>
                            </div>
                        </button>
                    ))}
                  </div>
              )}
          </div>
          <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Jumlah {selectedItem && type === 'OUT' && <span className="text-blue-600 lowercase font-normal ml-1">(Tersedia: {selectedItem.quantity})</span>}
              </label>
              <input 
                type="number" 
                placeholder="Qty" 
                value={quantityInput ?? ''} 
                onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} 
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none transition-all ${validationError ? 'border-rose-300 ring-rose-100 bg-rose-50 text-rose-700 focus:ring-rose-500' : 'focus:ring-blue-500'}`} 
              />
          </div>
          <div className="md:col-span-3">
            <button 
                onClick={() => handleAddToCart(target)} 
                disabled={!selectedItem || !quantityInput || !!validationError}
                className={`w-full py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-[0.98] ${!selectedItem || !quantityInput || !!validationError ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
                Tambah Ke List
            </button>
          </div>
        </div>
        {validationError && (
            <div className="flex items-center gap-2 text-rose-600 text-[11px] font-bold bg-rose-100/50 p-2 rounded-lg animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-3 h-3" />
                {validationError}
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end border-b border-slate-200">
        <div className="flex space-x-4">
          {canEdit && <button onClick={() => { setActiveTab('new'); setValidationError(null); }} className={`pb-3 px-2 text-sm font-medium transition-all ${activeTab === 'new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Input Transaksi</button>}
          <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 text-sm font-medium transition-all ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Riwayat Log</button>
        </div>
        
        {activeTab === 'history' && (
          <div className="relative pb-3" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm" title="Kolom">
              <Columns className="w-4 h-4 text-slate-600" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 mb-1">Kolom Tabel</div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Tanggal</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Jenis Transaksi</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg h-[38px]">
                      <button onClick={() => { setType('IN'); setValidationError(null); }} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${type === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>BARANG MASUK</button>
                      <button onClick={() => { setType('OUT'); setValidationError(null); }} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${type === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>BARANG KELUAR</button>
                    </div>
                  </div>
                </div>
                {type === 'IN' && (
                  <div className="space-y-4 mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100 animate-in slide-in-from-top-2">
                    <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" placeholder="Nama Supplier / Pemasok" />
                    <div className="grid grid-cols-2 gap-4">
                      <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" placeholder="No. Purchase Order (PO)" />
                      <input value={riNumber} onChange={e => setRiNumber(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" placeholder="No. Surat Jalan (SJ)" />
                    </div>
                  </div>
                )}
                {renderItemInput('new', searchRef)}
                <div className="mt-6">
                    <label className="block text-sm font-medium mb-2 text-slate-700">Lampiran Foto (Opsional)</label>
                    <div className="flex flex-wrap gap-2">
                         {photos.map((p, i) => (
                             <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
                                 <img src={p} className="w-full h-full object-cover" />
                                 <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                             </div>
                         ))}
                         <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-all group">
                            <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                            <span className="text-[10px] text-slate-400 mt-1 font-bold group-hover:text-blue-500 uppercase tracking-tighter">Upload</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'new')} />
                         </label>
                    </div>
                </div>
              </div>
           </div>
           <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border p-4 space-y-4 flex flex-col h-full shadow-sm">
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-blue-600" /> Item di Keranjang</h3>
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{cartItems.length} ITEMS</span>
                    </div>
                    {cartItems.length > 0 ? (
                        <div className="space-y-2">
                            {cartItems.map((it, i) => (
                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center animate-in slide-in-from-right-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-bold text-slate-900 truncate uppercase">{it.itemName}</div>
                                        <div className="text-[10px] text-slate-500 font-medium">Jumlah: {it.quantityInput} {it.selectedUnit}</div>
                                    </div>
                                    <button onClick={() => setCartItems(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                            <Package className="w-12 h-12 mb-2 opacity-10" />
                            <p className="text-xs italic font-medium">Belum ada item ditambahkan</p>
                        </div>
                    )}
                </div>
                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan untuk transaksi ini..." className="w-full p-3 border rounded-lg text-xs resize-none h-20 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50/50" />
                    <button onClick={handleSubmitTransaction} disabled={cartItems.length === 0} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]">SUBMIT TRANSAKSI</button>
                </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
           <div className="overflow-auto flex-1 custom-scrollbar">
               <table className="w-full text-left text-sm min-w-[600px]">
                 <thead className="sticky top-0 bg-slate-50 z-10 border-b shadow-sm">
                   <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                     {isVisible('date') && <th className="px-6 py-4">Tanggal</th>}
                     {isVisible('type') && <th className="px-6 py-4">Tipe</th>}
                     {isVisible('details') && <th className="px-6 py-4">Rincian</th>}
                     {isVisible('docs') && <th className="px-6 py-4">Dokumen</th>}
                     {isVisible('notes') && <th className="px-6 py-4">Catatan</th>}
                     <th className="px-6 py-4 text-right">Aksi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 group transition-colors">
                            {isVisible('date') && <td className="px-6 py-4 font-medium text-slate-600">{tx.date}</td>}
                            {isVisible('type') && <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>{tx.type === 'IN' ? 'Masuk' : 'Keluar'}</span></td>}
                            {isVisible('details') && <td className="px-6 py-4 text-xs font-semibold text-slate-700">{tx.items.length} Barang {tx.supplierName && <span className="text-slate-400 font-normal">({tx.supplierName})</span>}</td>}
                            {isVisible('docs') && <td className="px-6 py-4 text-xs flex items-center gap-1 font-bold text-slate-500">{tx.photos?.length || 0} <ImageIcon className="w-3.5 h-3.5 text-slate-400" /></td>}
                            {isVisible('notes') && <td className="px-6 py-4 max-w-[150px] truncate italic text-slate-400">{tx.notes || '-'}</td>}
                            <td className="px-6 py-4 text-right"><button onClick={() => openEditModal(tx)} className="text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded-lg transition-all">{canEdit ? 'Edit' : 'Detail'}</button></td>
                        </tr>
                    ))}
                 </tbody>
               </table>
           </div>
        </div>
      )}

      {isEditModalOpen && editingTransaction && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">{canEdit ? 'Ubah Transaksi' : 'Detail Transaksi'}</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Tanggal Transaksi</label>
                            <input type="date" disabled={!canEdit} value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                        </div>
                        {editingTransaction.type === 'IN' && (
                            <div className="p-4 bg-emerald-50 rounded-xl space-y-3 border border-emerald-100">
                                <label className="text-[10px] font-bold text-emerald-600 block uppercase">Informasi Kedatangan</label>
                                <input disabled={!canEdit} value={editSupplierName} onChange={e => setEditSupplierName(e.target.value)} placeholder="Nama Supplier" className="w-full border border-emerald-200 rounded-lg p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input disabled={!canEdit} value={editPoNumber} onChange={e => setEditPoNumber(e.target.value)} placeholder="Nomor PO" className="w-full border border-emerald-200 rounded-lg p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
                                    <input disabled={!canEdit} value={editRiNumber} onChange={e => setEditRiNumber(e.target.value)} placeholder="Nomor SJ" className="w-full border border-emerald-200 rounded-lg p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Catatan Tambahan</label>
                            <textarea disabled={!canEdit} value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl flex flex-col border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-3">Daftar Barang Transaksi</label>
                        <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                           {editCartItems.map((it, i) => (
                             <div key={i} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                               <div className="min-w-0 flex-1">
                                 <div className="font-bold text-slate-800 uppercase truncate">{it.itemName}</div>
                                 <div className="text-[9px] text-slate-400 mt-0.5">ID: {it.itemId}</div>
                               </div>
                               <div className="flex items-center gap-2">
                                  {canEdit ? (
                                    <input type="number" className="w-16 border border-blue-200 rounded-lg text-center py-1.5 font-bold bg-blue-50 text-blue-700 outline-none focus:ring-2 focus:ring-blue-500" value={it.quantityInput} onChange={e => updateEditItemQty(i, Number(e.target.value))} />
                                  ) : <span className="font-bold px-3 py-1.5 bg-slate-100 rounded-lg">{it.quantityInput}</span>}
                                  <span className="text-slate-500 font-bold uppercase">{it.selectedUnit}</span>
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Lampiran & Preview Foto</label>
                        {canEdit && (
                            <label className="text-[10px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-all">
                                <Plus className="w-3 h-3" /> Tambah Lampiran
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'edit')} />
                            </label>
                        )}
                     </div>
                     <div className="flex gap-2 flex-wrap bg-slate-100/50 p-3 rounded-xl min-h-[100px] border border-slate-200 border-dashed">
                        {editPhotos.map((p, i) => (
                          <div key={i} className="relative w-20 h-20 group flex-shrink-0">
                            <img src={p} className="w-full h-full object-cover rounded-lg border border-white bg-white shadow-sm" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity rounded-lg">
                              <button onClick={() => setPreviewPhoto(p)} className="p-1.5 bg-white rounded-lg shadow text-slate-800 hover:scale-110 transition-transform"><Maximize2 className="w-3 h-3" /></button>
                              {canEdit && <button onClick={() => setEditPhotos(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 bg-red-500 rounded-lg shadow text-white hover:scale-110 transition-transform"><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          </div>
                        ))}
                        {editPhotos.length === 0 && <div className="flex flex-col items-center justify-center w-full text-slate-300 italic py-4">
                            <ImageIcon className="w-6 h-6 opacity-20 mb-1" />
                            <span className="text-[10px]">Belum ada lampiran visual</span>
                        </div>}
                     </div>
                  </div>
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all">BATAL</button>
                {canEdit && <button onClick={handleSaveEdit} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">SIMPAN PERUBAHAN</button>}
              </div>
           </div>
         </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300" onClick={() => setPreviewPhoto(null)}>
           <div className="relative max-w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white hover:text-red-400 bg-white/10 p-2 rounded-full transition-all"><X className="w-8 h-8" /></button>
               <img src={previewPhoto} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" />
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;