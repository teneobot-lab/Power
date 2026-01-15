
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RejectItem, RejectLog, RejectItemDetail, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Calendar, Plus, Trash2, Search, Package, X, AlertCircle, AlertTriangle, FileText, ArrowRight, ClipboardList, Download, FileSpreadsheet, Keyboard, Database, ClipboardCheck, History, Copy, Edit3, Save } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import * as XLSX from 'xlsx';

interface RejectManagerProps {
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  onProcessReject: (log: RejectLog) => void;
  onUpdateRejectLog: (log: RejectLog) => void;
  onDeleteRejectLog: (id: string) => void;
  onUpdateRejectMaster: (newList: RejectItem[]) => void;
  userRole: UserRole;
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const RejectManager: React.FC<RejectManagerProps> = ({ 
  rejectMasterData, rejectLogs, onProcessReject, onUpdateRejectLog, onDeleteRejectLog, onUpdateRejectMaster, userRole, columns, onToggleColumn 
}) => {
  const canEdit = userRole === 'admin' || userRole === 'staff';
  
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'master'>('new');
  
  // New Reject Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<RejectItemDetail[]>([]);
  const [rejectReason, setRejectReason] = useState('Damaged');

  // Edit Log State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RejectLog | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCartItems, setEditCartItems] = useState<RejectItemDetail[]>([]);

  // Master Data Tab State
  const [masterSearch, setMasterSearch] = useState('');

  // Item Selection State (Input Log)
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  // Item Selection State (Edit Modal)
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const debouncedEditSearchQuery = useDebounce(editSearchQuery, 300);
  const [editSelectedItem, setEditSelectedItem] = useState<RejectItem | null>(null);
  const [editSelectedUnit, setEditSelectedUnit] = useState<string>('');
  const [editConversionRatio, setEditConversionRatio] = useState<number>(1);
  const [editQuantityInput, setEditQuantityInput] = useState<number | undefined>(undefined);
  const [editRejectReason, setEditRejectReason] = useState('Damaged');
  const [isEditAutocompleteOpen, setIsEditAutocompleteOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);
  const masterImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
      if (editSearchRef.current && !editSearchRef.current.contains(event.target as Node)) setIsEditAutocompleteOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter Master Data for Main Form
  const filteredRejectMaster = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    return rejectMasterData.filter(item => 
      item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ).slice(0, 8); 
  }, [debouncedSearchQuery, rejectMasterData]);

   // Filter Master Data for Edit Modal
   const filteredEditRejectMaster = useMemo(() => {
    if (!debouncedEditSearchQuery) return [];
    return rejectMasterData.filter(item => 
      item.name.toLowerCase().includes(debouncedEditSearchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(debouncedEditSearchQuery.toLowerCase())
    ).slice(0, 8); 
  }, [debouncedEditSearchQuery, rejectMasterData]);

  // Handlers for Main Form
  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setConversionRatio(1);
    setIsAutocompleteOpen(false);
  };

  const handleUnitChange = (unitName: string) => {
    setSelectedUnit(unitName);
    if (selectedItem?.baseUnit === unitName) {
        setConversionRatio(1);
    } else if (selectedItem?.unit2 === unitName) {
        setConversionRatio(selectedItem.ratio2 || 1);
    } else if (selectedItem?.unit3 === unitName) {
        setConversionRatio(selectedItem.ratio3 || 1);
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem || !quantityInput) return;
    
    const requestedBase = quantityInput * conversionRatio;
    const newItem: RejectItemDetail = {
      itemId: selectedItem.id, 
      itemName: selectedItem.name, 
      sku: selectedItem.sku,
      baseUnit: selectedItem.baseUnit,
      quantity: quantityInput, 
      unit: selectedUnit, 
      ratio: conversionRatio, 
      totalBaseQuantity: requestedBase,
      reason: rejectReason,
      unit2: selectedItem.unit2,
      ratio2: selectedItem.ratio2,
      unit3: selectedItem.unit3,
      ratio3: selectedItem.ratio3,
    };

    setCartItems([...cartItems, newItem]);
    setSelectedItem(null); 
    setSearchQuery(''); 
    setQuantityInput(undefined); 
  };

  const handleSubmitReject = () => {
    if (cartItems.length === 0) return;
    onProcessReject({
      id: generateId(), 
      date, 
      items: cartItems, 
      notes, 
      timestamp: new Date().toISOString()
    });
    setCartItems([]); 
    setNotes('');
  };

  // Handlers for Edit Modal
  const openEditModal = (log: RejectLog) => {
    setEditingLog(log);
    setEditDate(log.date);
    setEditNotes(log.notes);
    setEditCartItems([...log.items]);
    setIsEditModalOpen(true);
    // Reset add item inputs in modal
    setEditSearchQuery('');
    setEditSelectedItem(null);
    setEditQuantityInput(undefined);
  };

  const handleEditSelectItem = (item: RejectItem) => {
    setEditSelectedItem(item);
    setEditSearchQuery(item.name);
    setEditSelectedUnit(item.baseUnit);
    setEditConversionRatio(1);
    setIsEditAutocompleteOpen(false);
  };

  const handleEditUnitChange = (unitName: string) => {
    setEditSelectedUnit(unitName);
    if (editSelectedItem?.baseUnit === unitName) {
        setEditConversionRatio(1);
    } else if (editSelectedItem?.unit2 === unitName) {
        setEditConversionRatio(editSelectedItem.ratio2 || 1);
    } else if (editSelectedItem?.unit3 === unitName) {
        setEditConversionRatio(editSelectedItem.ratio3 || 1);
    }
  };

  const handleAddToEditCart = () => {
    if (!editSelectedItem || !editQuantityInput) return;
    const requestedBase = editQuantityInput * editConversionRatio;
    const newItem: RejectItemDetail = {
      itemId: editSelectedItem.id, 
      itemName: editSelectedItem.name, 
      sku: editSelectedItem.sku, 
      baseUnit: editSelectedItem.baseUnit, 
      quantity: editQuantityInput, 
      unit: editSelectedUnit, 
      ratio: editConversionRatio, 
      totalBaseQuantity: requestedBase, 
      reason: editRejectReason,
      unit2: editSelectedItem.unit2, ratio2: editSelectedItem.ratio2,
      unit3: editSelectedItem.unit3, ratio3: editSelectedItem.ratio3
    };
    setEditCartItems([...editCartItems, newItem]);
    setEditSelectedItem(null);
    setEditSearchQuery('');
    setEditQuantityInput(undefined);
  };

  const handleSaveEdit = () => {
    if (!editingLog) return;
    const updatedLog: RejectLog = {
      ...editingLog,
      date: editDate,
      notes: editNotes,
      items: editCartItems,
    };
    onUpdateRejectLog(updatedLog);
    setIsEditModalOpen(false);
  };

  const handleDeleteLog = (id: string) => {
      if (confirm("Hapus log reject ini secara permanen?")) {
          onDeleteRejectLog(id);
      }
  };

  const handleCopyToClipboard = (log: RejectLog) => {
      const header = `Data Reject KKL (${log.date})`;
      const body = log.items.map(item => `• ${item.itemName} - ${item.quantity} ${item.unit} (${item.reason})`).join('\n');
      const textToCopy = `${header}\n${body}`;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
          alert("Data berhasil disalin ke clipboard!");
      }).catch(err => {
          console.error("Gagal menyalin: ", err);
      });
  };

  const handleDownloadTemplate = () => {
    const data = [
      ['ID BARANG', 'NAMA BARANG', 'BASE UNIT', 'UNIT2', 'CONVERSION UNIT2', 'UNIT3', 'CONVERSION UNIT3'],
      ['BRW-000566', 'ABON AYAM', 'KG', 'GR', 1000, '', ''],
      ['BRW-000833', 'AIR GULA', 'KG', 'GR', 1000, '', ''],
      ['BRW-000842', 'BAKSO AYAM', 'PRS', 'PCS', 3, '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RejectMasterData');
    XLSX.writeFile(wb, 'SmartStock_Reject_Master_Template.xlsx');
  };

  const handleImportMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        
        const newRejectMaster: RejectItem[] = sheetData.map(row => ({
            id: generateId(),
            sku: String(row['ID BARANG'] || row['SKU'] || ''),
            name: String(row['NAMA BARANG'] || row['Item Name'] || ''),
            baseUnit: String(row['BASE UNIT'] || row['Base Unit'] || 'Pcs'),
            unit2: row['UNIT2'] ? String(row['UNIT2']) : undefined,
            ratio2: row['CONVERSION UNIT2'] ? Number(row['CONVERSION UNIT2']) : undefined,
            unit3: row['UNIT3'] ? String(row['UNIT3']) : undefined,
            ratio3: row['CONVERSION UNIT3'] ? Number(row['CONVERSION UNIT3']) : undefined,
            lastUpdated: new Date().toISOString()
        }));
        
        onUpdateRejectMaster([...rejectMasterData, ...newRejectMaster]);
      } catch (err) {
        alert("Gagal mengimpor master data reject. Pastikan format kolom sesuai.");
      }
      if (masterImportRef.current) masterImportRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const sortedLogs = useMemo(() => {
    return [...rejectLogs].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  }, [rejectLogs]);

  const reasonSuggestions = ['Damaged', 'Expired', 'Factory Error', 'Return From Customer', 'Scrap', 'Lost', 'QC Failed', 'Salah Kirim'];

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex justify-between items-end border-b border-slate-200">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('new')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'new' ? 'border-b-2 border-rose-600 text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <ClipboardCheck className="w-4 h-4" /> Entry Reject Log
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'history' ? 'border-b-2 border-rose-600 text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <History className="w-4 h-4" /> Riwayat Log
          </button>
          <button onClick={() => setActiveTab('master')} className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'master' ? 'border-b-2 border-rose-600 text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <Database className="w-4 h-4" /> Reject Master Data
          </button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-100 p-2 rounded-lg"><AlertCircle className="w-5 h-5 text-rose-600" /></div>
                            <h2 className="font-bold text-slate-800">Database Entry (Reject Module)</h2>
                        </div>
                        <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">Independent Records - No Stock Impact</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tanggal Log</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori / Alasan</label>
                            <div className="relative group">
                                <Keyboard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                <input list="reason-opts" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Tulis alasan..." className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-rose-500" />
                                <datalist id="reason-opts">{reasonSuggestions.map(r => <option key={r} value={r} />)}</datalist>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-6 relative" ref={searchRef}>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Cari Barang (Reject Master)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={searchQuery} 
                                        onFocus={() => setIsAutocompleteOpen(true)} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        placeholder="Cari SKU atau Nama di Reject Master..." 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" 
                                    />
                                </div>
                                {isAutocompleteOpen && filteredRejectMaster.length > 0 && searchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-[60] max-h-48 overflow-auto">
                                        {filteredRejectMaster.map(item => (
                                            <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left px-4 py-3 border-b last:border-0 hover:bg-slate-50">
                                                <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} | Base: {item.baseUnit}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Unit</label>
                                <select 
                                    disabled={!selectedItem}
                                    className="w-full px-2 py-2 border rounded-lg text-xs bg-white disabled:bg-slate-100"
                                    value={selectedUnit}
                                    onChange={e => handleUnitChange(e.target.value)}
                                >
                                    {selectedItem && (
                                        <>
                                            <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                                            {selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2}</option>}
                                            {selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3}</option>}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Qty</label>
                                <input type="number" disabled={!selectedItem} value={quantityInput ?? ''} onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={handleAddToCart} disabled={!selectedItem || !quantityInput} className="w-full py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 disabled:bg-slate-200 transition-all">Add Log</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tighter">Draft Reject Entries</h3>
                        <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{cartItems.length} RECORD</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[300px]">
                        {cartItems.map((it, idx) => (
                            <div key={idx} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm flex justify-between items-center group">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-slate-800 uppercase truncate">{it.itemName}</div>
                                    <div className="text-[10px] text-rose-500 font-bold uppercase">{it.quantity} {it.unit} • {it.reason}</div>
                                </div>
                                <button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t bg-slate-50 space-y-3">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tambahkan catatan database..." className="w-full p-3 border rounded-lg text-xs resize-none h-20 outline-none focus:ring-2 focus:ring-rose-500 bg-white" />
                        <button onClick={handleSubmitReject} disabled={cartItems.length === 0} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:bg-slate-200 shadow-lg shadow-rose-200 transition-all">COMMIT TO DATABASE</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="sticky top-0 bg-slate-50 border-b z-10 shadow-sm">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Rincian</th>
                            <th className="px-6 py-4">Catatan</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedLogs.length > 0 ? sortedLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">{log.date}</td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-slate-800">{log.items.length} Barang</div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[250px]">{log.items.map(i => i.itemName).join(', ')}</div>
                                </td>
                                <td className="px-6 py-4 text-xs italic text-slate-400 truncate max-w-[200px]">{log.notes || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleCopyToClipboard(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy to Clipboard">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openEditModal(log)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit / Detail">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        {canEdit && <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 className="w-4 h-4" /></button>}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-30">Database history is empty</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'master' && (
          <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={masterSearch} onChange={e => setMasterSearch(e.target.value)} placeholder="Cari Master Data Reject..." className="bg-white border rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-80" />
                  </div>
                  <div className="flex gap-2">
                      <input type="file" accept=".xlsx, .xls" className="hidden" ref={masterImportRef} onChange={handleImportMaster} />
                      <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border rounded-lg hover:bg-slate-50 transition-colors"><Download className="w-3.5 h-3.5" /> Template Excel</button>
                      <button onClick={() => masterImportRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"><FileSpreadsheet className="w-3.5 h-3.5" /> Import Reject Master</button>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="overflow-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left text-sm min-w-[800px]">
                          <thead className="sticky top-0 bg-slate-50 border-b z-10 shadow-sm">
                              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  <th className="px-6 py-4">ID BARANG (SKU)</th>
                                  <th className="px-6 py-4">NAMA BARANG</th>
                                  <th className="px-6 py-4">UNIT DASAR</th>
                                  <th className="px-6 py-4">MULTI-UNIT CONVERSION</th>
                                  <th className="px-6 py-4 text-right">AKSI</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {rejectMasterData.filter(i => i.name.toLowerCase().includes(masterSearch.toLowerCase()) || i.sku.toLowerCase().includes(masterSearch.toLowerCase())).length > 0 ? (
                                  rejectMasterData.filter(i => i.name.toLowerCase().includes(masterSearch.toLowerCase()) || i.sku.toLowerCase().includes(masterSearch.toLowerCase())).map(item => (
                                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-500">{item.sku}</td>
                                          <td className="px-6 py-4 font-bold text-slate-800 uppercase text-xs">{item.name}</td>
                                          <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{item.baseUnit}</td>
                                          <td className="px-6 py-4">
                                              <div className="flex flex-col gap-1">
                                                  {item.unit2 && <span className="text-[9px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border">1 {item.unit2} = {item.ratio2} {item.baseUnit}</span>}
                                                  {item.unit3 && <span className="text-[9px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border">1 {item.unit3} = {item.ratio3} {item.baseUnit}</span>}
                                                  {!item.unit2 && !item.unit3 && <span className="text-[9px] text-slate-300 italic">No alternative units</span>}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => onUpdateRejectMaster(rejectMasterData.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-medium">Belum ada Master Data khusus Reject.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingLog && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Edit Reject Log</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Tanggal</label>
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" disabled={!canEdit} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Catatan</label>
                            <input value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" disabled={!canEdit} />
                        </div>
                     </div>

                     {/* Add New Item Section in Edit Modal */}
                     {canEdit && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Tambah Barang ke Log Ini</h4>
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-5 relative" ref={editSearchRef}>
                                    <input 
                                        type="text" 
                                        value={editSearchQuery} 
                                        onFocus={() => setIsEditAutocompleteOpen(true)} 
                                        onChange={(e) => setEditSearchQuery(e.target.value)} 
                                        placeholder="Cari Barang..." 
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" 
                                    />
                                    {isEditAutocompleteOpen && filteredEditRejectMaster.length > 0 && editSearchQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-[60] max-h-48 overflow-auto">
                                            {filteredEditRejectMaster.map(item => (
                                                <button key={item.id} onClick={() => handleEditSelectItem(item)} className="w-full text-left px-4 py-3 border-b last:border-0 hover:bg-slate-50">
                                                    <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                     <select 
                                        disabled={!editSelectedItem}
                                        className="w-full px-2 py-2 border rounded-lg text-xs bg-white disabled:bg-slate-100"
                                        value={editSelectedUnit}
                                        onChange={e => handleEditUnitChange(e.target.value)}
                                     >
                                         {editSelectedItem && (
                                            <>
                                                <option value={editSelectedItem.baseUnit}>{editSelectedItem.baseUnit}</option>
                                                {editSelectedItem.unit2 && <option value={editSelectedItem.unit2}>{editSelectedItem.unit2}</option>}
                                                {editSelectedItem.unit3 && <option value={editSelectedItem.unit3}>{editSelectedItem.unit3}</option>}
                                            </>
                                         )}
                                     </select>
                                </div>
                                <div className="md:col-span-2">
                                     <input type="number" disabled={!editSelectedItem} value={editQuantityInput ?? ''} onChange={e => setEditQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Qty" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <input list="edit-reason-opts" value={editRejectReason} onChange={e => setEditRejectReason(e.target.value)} placeholder="Alasan" className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-rose-500" />
                                    <datalist id="edit-reason-opts">{reasonSuggestions.map(r => <option key={r} value={r} />)}</datalist>
                                </div>
                                <div className="md:col-span-1">
                                    <button onClick={handleAddToEditCart} disabled={!editSelectedItem || !editQuantityInput} className="w-full py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 disabled:bg-slate-200 transition-all"><Plus className="w-4 h-4 mx-auto" /></button>
                                </div>
                           </div>
                        </div>
                     )}

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Daftar Barang</label>
                        {editCartItems.map((it, idx) => (
                             <div key={idx} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-800 uppercase truncate">{it.itemName}</div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">Reason: {it.reason}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canEdit ? (
                                        <>
                                            <input 
                                                type="number" 
                                                className="w-16 border border-rose-200 rounded-lg text-center py-1.5 font-bold bg-rose-50 text-rose-700 outline-none focus:ring-2 focus:ring-rose-500" 
                                                value={it.quantity} 
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    const updated = [...editCartItems];
                                                    updated[idx] = { ...updated[idx], quantity: val, totalBaseQuantity: val * (it.ratio || 1) };
                                                    setEditCartItems(updated);
                                                }} 
                                            />
                                            <span className="font-bold text-slate-500">{it.unit}</span>
                                            <button onClick={() => setEditCartItems(editCartItems.filter((_, i) => i !== idx))} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 ml-2"><Trash2 className="w-3 h-3" /></button>
                                        </>
                                    ) : (
                                        <span className="font-bold px-3 py-1.5 bg-slate-100 rounded-lg">{it.quantity} {it.unit}</span>
                                    )}
                                </div>
                             </div>
                        ))}
                     </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all">Tutup</button>
                    {canEdit && <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-rose-600 text-white font-bold hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center gap-2"><Save className="w-4 h-4" /> Simpan Perubahan</button>}
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default RejectManager;
