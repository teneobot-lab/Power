
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Filter, Edit2, Trash2, AlertCircle, X, Eye, Columns, Download, FileSpreadsheet, Box, Power, AlertTriangle, HelpCircle } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import * as XLSX from 'xlsx';

interface InventoryTableProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onBatchAdd?: (items: InventoryItem[]) => void; 
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  userRole: UserRole;
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, onAddItem, onBatchAdd, onUpdateItem, onDeleteItem, userRole, columns, onToggleColumn 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [alternativeUnits, setAlternativeUnits] = useState<UnitDefinition[]>([]);

  const canEdit = userRole === 'admin' || userRole === 'staff';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;

  const dynamicCategories = useMemo(() => {
    const cats = items.map(item => item.category).filter(c => c && c.trim() !== '');
    return Array.from(new Set(cats)).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const term = debouncedSearchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
  }, [items, debouncedSearchTerm, categoryFilter]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const handleDelete = (item: InventoryItem) => {
    if (window.confirm(`Hapus permanen barang "${item.name}" dari sistem?`)) onDeleteItem(item.id);
  };

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAlternativeUnits(item.alternativeUnits || []);
    } else {
      setEditingItem(null);
      setFormData({ category: '', quantity: 0, minLevel: 0, unitPrice: 0, location: '', name: '', sku: '', baseUnit: 'Pcs', status: 'active' });
      setAlternativeUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = (item: InventoryItem) => {
    const newStatus = item.status === 'inactive' ? 'active' : 'inactive';
    onUpdateItem({ ...item, status: newStatus, lastUpdated: new Date().toISOString() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : generateId(),
      name: formData.name || '',
      sku: formData.sku || '',
      category: formData.category || 'Lainnya', 
      quantity: Number(formData.quantity) || 0,
      baseUnit: formData.baseUnit || 'Pcs',
      alternativeUnits: alternativeUnits,
      minLevel: Number(formData.minLevel) || 0,
      unitPrice: Number(formData.unitPrice) || 0,
      location: formData.location || '',
      lastUpdated: new Date().toISOString(),
      status: formData.status || 'active'
    };
    if (editingItem) onUpdateItem(newItem);
    else onAddItem(newItem);
    setIsModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const data = [
      ['ID BARANG', 'NAMA BARANG', 'BASE UNIT', 'UNIT2', 'CONVERSION UNIT2', 'UNIT3', 'CONVERSION UNIT3'],
      ['BRW-000566', 'ABON AYAM', 'KG', 'GR', 1000, '', ''],
      ['BRW-000833', 'AIR GULA', 'KG', 'GR', 1000, '', ''],
      ['BRW-000088', 'AIR MINERAL NESTLE 600ML', 'BTL', '', '', '', ''],
      ['BRW-000842', 'BAKSO AYAM', 'PRS', 'PCS', 3, '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MasterDataInventory');
    XLSX.writeFile(wb, 'Inventory_Master_Template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        
        const newItems: InventoryItem[] = data.map((row: any) => {
          const altUnits: UnitDefinition[] = [];
          
          if (row['UNIT2'] && row['CONVERSION UNIT2']) {
            altUnits.push({ name: String(row['UNIT2']), ratio: Number(row['CONVERSION UNIT2']) });
          }
          if (row['UNIT3'] && row['CONVERSION UNIT3']) {
            altUnits.push({ name: String(row['UNIT3']), ratio: Number(row['CONVERSION UNIT3']) });
          }

          return {
            id: generateId(),
            sku: String(row['ID BARANG'] || `SKU-${generateId().slice(0,5)}`),
            name: String(row['NAMA BARANG'] || 'Item Baru'),
            baseUnit: String(row['BASE UNIT'] || 'Pcs'),
            alternativeUnits: altUnits,
            category: 'Master Import',
            quantity: 0,
            minLevel: 0,
            unitPrice: 0,
            location: '',
            lastUpdated: new Date().toISOString(),
            status: 'active'
          };
        });
        
        if (onBatchAdd) onBatchAdd(newItems);
      } catch (error) { 
        console.error(error);
        alert("Gagal membaca file Excel. Pastikan format kolom sesuai: ID BARANG, NAMA BARANG, BASE UNIT, UNIT2, CONVERSION UNIT2, UNIT3, CONVERSION UNIT3"); 
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const addAltUnit = () => {
    setAlternativeUnits([...alternativeUnits, { name: '', ratio: 1 }]);
  };

  const removeAltUnit = (idx: number) => {
    setAlternativeUnits(alternativeUnits.filter((_, i) => i !== idx));
  };

  const updateAltUnit = (idx: number, field: keyof UnitDefinition, val: string | number) => {
    const updated = [...alternativeUnits];
    updated[idx] = { ...updated[idx], [field]: val };
    setAlternativeUnits(updated);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Cari barang atau SKU..." className="bg-transparent outline-none text-sm w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end items-center">
          <div className="relative">
            <select className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg shadow-sm text-sm h-[38px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">Semua Kategori</option>
              {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Filter className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm h-[38px]" title="Sembunyikan/Munculkan Kolom">
              <Columns className="w-5 h-5 text-slate-600" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 mb-1">Visibilitas Kolom</div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {canEdit && (
            <>
               <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
               <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[38px]">
                  <button onClick={handleDownloadTemplate} className="px-3 py-2 text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center gap-2 text-sm"><Download className="w-4 h-4 text-blue-600" /> <span className="hidden sm:inline">Template Master</span></button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Import Master Data</span></button>
               </div>
               <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm h-[38px]"><Plus className="w-4 h-4" /> Tambah Barang</button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                {isVisible('name') && <th className="px-6 py-4 bg-slate-50">Nama Barang</th>}
                {isVisible('category') && <th className="px-6 py-4 bg-slate-50">Kategori</th>}
                {isVisible('quantity') && <th className="px-6 py-4 bg-slate-50 text-center">Stok</th>}
                {isVisible('price') && <th className="px-6 py-4 text-right bg-slate-50">Harga (Rp)</th>}
                {isVisible('location') && <th className="px-6 py-4 text-center bg-slate-50">Lokasi</th>}
                <th className="px-6 py-4 text-right bg-slate-50">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const isAlertItem = (item.minLevel || 0) > 0 && item.quantity <= item.minLevel;
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? 'bg-slate-100/60 opacity-60 grayscale-[0.5]' : ''} ${isAlertItem && !isInactive ? 'bg-amber-50/30' : ''}`}>
                    {isVisible('name') && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isInactive ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</span> 
                              {isInactive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 border border-slate-300 uppercase tracking-tight">
                                  Nonaktif
                                </span>
                              )}
                              {isAlertItem && !isInactive && <span title="Stok Rendah!"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">ID: {item.sku}</span>
                          </div>
                        </td>
                    )}
                    {isVisible('category') && (<td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-slate-50 text-slate-400' : 'bg-slate-100 text-slate-800'}`}>{item.category}</span></td>)}
                    {isVisible('quantity') && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-semibold ${isInactive ? 'text-slate-400' : (isAlertItem ? 'text-amber-600' : 'text-slate-700')}`}>
                            {item.quantity} {item.baseUnit}
                          </span>
                          {item.alternativeUnits && item.alternativeUnits.length > 0 && (
                              <div className="text-[10px] text-slate-400 flex flex-wrap justify-center gap-1 mt-0.5">
                                  {item.alternativeUnits.map((u, i) => (
                                      <span key={i} className={`px-1 rounded border border-slate-100 whitespace-nowrap ${isInactive ? 'bg-slate-50' : 'bg-white'}`}>1 {u.name} = {u.ratio} {item.baseUnit}</span>
                                  ))}
                              </div>
                          )}
                        </div>
                      </td>
                    )}
                    {isVisible('price') && (<td className="px-6 py-4 text-right font-medium text-slate-400">{formatCurrency(item.unitPrice)}</td>)}
                    {isVisible('location') && <td className="px-6 py-4 text-center text-sm text-slate-400">{item.location || '-'}</td>}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                            <>
                                <button onClick={() => handleToggleStatus(item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title={isInactive ? "Aktifkan" : "Nonaktifkan"}><Power className="w-4 h-4" /></button>
                                <button 
                                  disabled={isInactive} 
                                  onClick={() => handleOpenModal(item)} 
                                  className={`p-2 rounded-full transition-colors ${isInactive ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} 
                                  title={isInactive ? "Aktifkan untuk mengedit" : "Edit"}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  disabled={isInactive} 
                                  onClick={() => handleDelete(item)} 
                                  className={`p-2 rounded-full transition-colors ${isInactive ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} 
                                  title={isInactive ? "Aktifkan untuk menghapus" : "Hapus"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        ) : <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" title="Detail"><Eye className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Tidak ada barang ditemukan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 uppercase tracking-tight">{editingItem ? (canEdit ? 'Ubah Master Barang' : 'Detail Master Barang') : 'Tambah Master Barang Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Barang</label>
                              <input required disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ID Barang (SKU)</label>
                              <input required disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-50" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                          </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                          <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2"><Box className="w-4 h-4" /> Satuan & Konversi Master</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase">Unit Dasar (Base Unit)</label>
                                  <input required disabled={!canEdit} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" placeholder="misal: Pcs, Kg, Sak" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase">Update Stok Fisik ({formData.baseUnit || 'Unit Dasar'})</label>
                                  <input required type="number" disabled={!canEdit} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Alternatif / Multi-Unit</label>
                                  {canEdit && (
                                      <button type="button" onClick={addAltUnit} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"><Plus className="w-3 h-3" /> Tambah Unit</button>
                                  )}
                              </div>
                              {alternativeUnits.map((u, i) => (
                                  <div key={i} className="flex gap-2 items-end animate-in slide-in-from-left-2">
                                      <div className="flex-1">
                                          <input disabled={!canEdit} className="w-full px-3 py-1.5 border rounded-lg text-xs" placeholder="Nama Unit (misal: Box)" value={u.name} onChange={e => updateAltUnit(i, 'name', e.target.value)} />
                                      </div>
                                      <div className="w-32">
                                          <div className="relative">
                                              <input type="number" disabled={!canEdit} className="w-full pl-3 pr-8 py-1.5 border rounded-lg text-xs" placeholder="Rasio" value={u.ratio} onChange={e => updateAltUnit(i, 'ratio', Number(e.target.value))} />
                                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">{formData.baseUnit}</span>
                                          </div>
                                      </div>
                                      {canEdit && <button type="button" onClick={() => removeAltUnit(i)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori</label>
                              <input disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-50" list="categories" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                              <datalist id="categories">{dynamicCategories.map(c => <option key={c} value={c} />)}</datalist>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Lokasi Rak</label>
                              <input disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-50" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Harga Satuan (Rp)</label>
                              <input type="number" disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-50" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase text-amber-600">Reorder Point</label>
                              <input type="number" disabled={!canEdit} className="w-full px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm text-amber-700 disabled:bg-slate-50" value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="pt-6 border-t flex justify-end gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                          {canEdit && <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider text-xs">Simpan Master</button>}
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryTable;
