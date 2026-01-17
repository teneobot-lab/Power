import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItemDetail, TransactionType, UserRole, Supplier, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Calendar, Plus, Save, Trash2, ArrowRightLeft, Search, Package, X, Edit3, AlertTriangle, Layers, PlusCircle, MinusCircle, Eye, Columns } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface TransactionManagerProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  onProcessTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  userRole: UserRole;
  suppliers?: Supplier[];
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  inventory, transactions, onProcessTransaction, onUpdateTransaction, onDeleteTransaction, userRole, columns, onToggleColumn 
}) => {
  const canEdit = userRole !== 'viewer';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  
  useEffect(() => { if (!canEdit) setActiveTab('history'); }, [canEdit]);
  
  // --- New Transaction Form State ---
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('IN');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<TransactionItemDetail[]>([]);
  const [supplierName, setSupplierName] = useState('');

  // --- Item Selection State ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200); 
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const filteredInventory = useMemo(() => {
    if (!debouncedSearch) return [];
    return inventory.filter(i => 
      i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).slice(0, 5);
  }, [debouncedSearch, inventory]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setConversionRatio(1);
    setIsAutocompleteOpen(false);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !quantityInput) return;
    
    const calculatedBase = quantityInput * conversionRatio;
    const newItem: TransactionItemDetail = {
      itemId: selectedItem.id, 
      itemName: selectedItem.name, 
      quantityInput, 
      selectedUnit, 
      conversionRatio, 
      totalBaseQuantity: calculatedBase
    };

    setCartItems([...cartItems, newItem]);
    setSelectedItem(null); 
    setSearchQuery(''); 
    setQuantityInput(undefined); 
    searchInputRef.current?.focus();
  };

  const handleSubmitTransaction = () => {
    if (cartItems.length === 0) return;
    onProcessTransaction({
      id: generateId(), date, type, items: cartItems, notes, timestamp: new Date().toISOString(),
      supplierName
    });
    setCartItems([]); setNotes(''); setSupplierName('');
  };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end border-b border-white/5">
        <div className="flex space-x-6">
          {canEdit && <button onClick={() => setActiveTab('new')} className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'new' ? 'border-b-2 border-[#6D5DF6] text-white' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>Movement Entry</button>}
          <button onClick={() => setActiveTab('history')} className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'history' ? 'border-b-2 border-[#6D5DF6] text-white' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>Log Ledger</button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto pb-4 custom-scrollbar">
           <div className="lg:col-span-2 space-y-8">
              <div className="glass-panel p-8 rounded-[2rem]">
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div>
                    <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3">Cycle Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-5 py-3 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3 text-center">Movement Vector</label>
                    <div className="flex bg-white/5 p-1 rounded-xl h-[52px] gap-1">
                      <button onClick={() => setType('IN')} className={`flex-1 flex items-center justify-center rounded-lg transition-all ${type === 'IN' ? 'bg-[#6D5DF6] text-white shadow-lg font-black uppercase text-[10px] tracking-widest' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>
                        <PlusCircle size={18} className="mr-2" /> Inbound
                      </button>
                      <button onClick={() => setType('OUT')} className={`flex-1 flex items-center justify-center rounded-lg transition-all ${type === 'OUT' ? 'bg-[#F97316] text-white shadow-lg font-black uppercase text-[10px] tracking-widest' : 'text-[#6B7280] hover:text-[#9CA3AF]'}`}>
                        <MinusCircle size={18} className="mr-2" /> Outbound
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-6 relative">
                          <label className="block text-[10px] font-black text-[#6B7280] mb-3 uppercase tracking-widest">Query Asset Node</label>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                            <input ref={searchInputRef} type="text" value={searchQuery} onFocus={() => setIsAutocompleteOpen(true)} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SKU / Name..." className="w-full pl-12 pr-4 py-3 rounded-xl text-sm" autoComplete="off" />
                          </div>
                          {isAutocompleteOpen && filteredInventory.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden">
                                {filteredInventory.map((item, idx) => (
                                    <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left px-5 py-4 hover:bg-white/5 border-b border-white/[0.03] last:border-0 transition-colors">
                                        <div className="font-bold text-sm text-white">{item.name}</div>
                                        <div className="text-[10px] text-[#6B7280] font-mono mt-1">SKU: {item.sku} | STOCK: {item.quantity}</div>
                                    </button>
                                ))}
                              </div>
                          )}
                      </div>
                      <div className="col-span-6 md:col-span-3">
                          <label className="block text-[10px] font-black text-[#6B7280] mb-3 uppercase tracking-widest">Quota</label>
                          <input ref={qtyInputRef} type="number" placeholder="0" value={quantityInput ?? ''} onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full px-5 py-3 rounded-xl text-sm" />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <button onClick={handleAddToCart} disabled={!selectedItem || !quantityInput} className="w-full py-3 bg-[#6D5DF6] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/10 disabled:opacity-30 transition-all">Add to Cart</button>
                      </div>
                    </div>
                </div>
              </div>
           </div>

           <div className="lg:col-span-1">
              <div className="glass-panel rounded-[2rem] p-6 space-y-6 flex flex-col h-full">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-[#E5E7EB] text-xs uppercase tracking-widest flex items-center gap-3"><Package size={16} className="text-[#6D5DF6]" /> Node Manifest</h3>
                    <span className="bg-[#6D5DF6]/10 text-[#6D5DF6] text-[10px] px-3 py-1 rounded-full font-black tracking-widest border border-[#6D5DF6]/20">{cartItems.length} UNITS</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {cartItems.map((it, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group animate-in slide-in-from-right-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-black text-white truncate uppercase leading-tight">{it.itemName}</div>
                                <div className="text-[10px] font-bold text-[#6B7280] mt-1">VOL: {it.quantityInput} {it.selectedUnit}</div>
                            </div>
                            <button onClick={() => setCartItems(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-[#6B7280] hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    {cartItems.length === 0 && <div className="py-20 text-center text-[#6B7280] text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Manifest Empty</div>}
                </div>
                
                <div className="pt-6 border-t border-white/5 space-y-4">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Entry notes..." className="w-full p-5 rounded-2xl text-xs resize-none h-24 outline-none" />
                    <button onClick={handleSubmitTransaction} disabled={cartItems.length === 0} className="w-full py-4 bg-[#6D5DF6] text-white rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-[#5B4EDB] transition-all active:scale-95">SYNCHRONIZE LEDGER</button>
                </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="glass-panel rounded-[2rem] flex-1 overflow-hidden flex flex-col border border-white/5">
           <div className="overflow-auto flex-1 custom-scrollbar">
               <table className="w-full text-left text-sm">
                 <thead className="sticky top-0 bg-[#0F172A]/90 backdrop-blur-md z-10 border-b border-white/5">
                   <tr className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">
                     <th className="px-10 py-6">Date</th>
                     <th className="px-10 py-6">Vector</th>
                     <th className="px-10 py-6">Payload</th>
                     <th className="px-10 py-6 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.03]">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] group transition-colors">
                            <td className="px-10 py-7 font-bold text-[#9CA3AF] text-xs">{tx.date}</td>
                            <td className="px-10 py-7">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tx.type === 'IN' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20' : 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20'}`}>
                                {tx.type === 'IN' ? 'Inbound' : 'Outbound'}
                              </span>
                            </td>
                            <td className="px-10 py-7 text-xs font-bold text-[#E5E7EB]">{tx.items.length} Node(s)</td>
                            <td className="px-10 py-7 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button className="p-2 text-[#6B7280] hover:text-[#6D5DF6] transition-all"><Eye size={18} /></button>
                                <button onClick={() => onDeleteTransaction(tx.id)} className="p-2 text-[#6B7280] hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                              </div>
                            </td>
                        </tr>
                    ))}
                 </tbody>
               </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;