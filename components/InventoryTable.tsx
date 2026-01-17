import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Edit2, Trash2, X, Eye, Columns, Download, FileSpreadsheet, Box, Power, AlertTriangle, Layers, MapPin, FileUp, FileDown } from 'lucide-react';
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
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const importFileRef = useRef<HTMLInputElement>(null);

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

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ 
        category: '', location: '', name: '', sku: '', baseUnit: 'Pcs', status: 'active', quantity: 0, unitPrice: 0, minLevel: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const data = [
      ['SKU', 'Nama Barang', 'Kategori', 'Stok', 'Unit Dasar', 'Harga Satuan', 'Level Minimum', 'Lokasi'],
      ['SKU-001', 'Contoh Barang', 'Elektronik', 10, 'Pcs', 50000, 5, 'Gudang A'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Inventory');
    XLSX.writeFile(wb, 'Template_Inventory_Power.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        
        const newItems: InventoryItem[] = data.map(row => ({
          id: generateId(),
          sku: String(row['SKU'] || ''),
          name: String(row['Nama Barang'] || ''),
          category: String(row['Kategori'] || 'Umum'),
          quantity: Number(row['Stok'] || 0),
          baseUnit: String(row['Unit Dasar'] || 'Pcs'),
          unitPrice: Number(row['Harga Satuan'] || 0),
          minLevel: Number(row['Level Minimum'] || 0),
          location: String(row['Lokasi'] || ''),
          status: 'active',
          lastUpdated: new Date().toISOString()
        }));

        if (onBatchAdd) onBatchAdd(newItems);
        else newItems.forEach(item => onAddItem(item));
        
        alert(`${newItems.length} data berhasil diimpor.`);
      } catch (err) {
        alert("Gagal mengimpor file Excel. Pastikan format kolom sesuai template.");
      }
    };
    reader.readAsBinaryString(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600";
  const labelClass = "block text-xs font-semibold text-slate-400 mb-2 ml-1";

  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-3 rounded-2xl border border-slate-800 w-full sm:w-auto shadow-inner">
          <Search className="w-5 h-5 text-slate-400 glow-icon" />
          <input type="text" placeholder="Cari aset atau SKU..." className="bg-transparent outline-none text-sm w-full sm:w-64 text-slate-200 placeholder:text-slate-600 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto flex-wrap justify-end">
          <select className="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl shadow-lg text-xs font-bold" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">Semua Kategori</option>
            {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl p-1 shadow-lg">
             <button onClick={handleDownloadTemplate} className="p-2.5 text-slate-400 hover:text-blue-400 transition-colors" title="Unduh Template Excel">
                <FileDown className="w-5 h-5" />
             </button>
             <div className="w-px h-6 bg-slate-800 mx-1"></div>
             <label className="p-2.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer" title="Impor Data Excel">
                <FileUp className="w-5 h-5" />
                <input type="file" ref={importFileRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
             </label>
          </div>

          <div className="relative">
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"><Columns className="w-5 h-5 text-blue-400 glow-icon" /></button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] p-3 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                <p className="text-xs font-bold text-slate-500 px-2 mb-2">Visibilitas Kolom</p>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500" />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Tambah Aset
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900/30 rounded-3xl shadow-2xl border border-slate-900 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md">
              <tr className="border-b border-slate-800 text-xs font-bold text-slate-500">
                {isVisible('name') && <th className="px-8 py-5">Nama Barang</th>}
                {isVisible('category') && <th className="px-8 py-5">Kategori</th>}
                {isVisible('quantity') && <th className="px-8 py-5 text-center">Stok</th>}
                {isVisible('price') && <th className="px-8 py-5 text-right">Harga Satuan</th>}
                {isVisible('location') && <th className="px-8 py-5 text-center">Lokasi</th>}
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              {filteredItems.map(item => {
                const isAlert = (item.minLevel || 0) > 0 && (item.quantity || 0) <= (item.minLevel || 0);
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`hover:bg-blue-500/5 transition-all duration-300 group ${isInactive ? 'opacity-40 grayscale' : ''} ${isAlert ? 'bg-rose-500/5' : ''}`}>
                    {isVisible('name') && (
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-100 tracking-tight">
                                {item.name} 
                                {isAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 glow-icon" />}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku}</span>
                          </div>
                        </td>
                    )}
                    {isVisible('category') && (<td className="px-8 py-5"><span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700/50">{item.category}</span></td>)}
                    {isVisible('quantity') && (
                      <td className="px-8 py-5 text-center">
                        <span className={`text-sm font-bold ${isAlert ? 'text-rose-400' : 'text-blue-400'}`}>{item.quantity || 0}</span> 
                        <span className="ml-1 text-[10px] text-slate-500 font-semibold">{item.baseUnit}</span>
                      </td>
                    )}
                    {isVisible('price') && (<td className="px-8 py-5 text-right text-xs font-bold text-slate-300">Rp {(item.unitPrice || 0).toLocaleString('id-ID')}</td>)}
                    {isVisible('location') && <td className="px-8 py-5 text-center"><div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400"><MapPin className="w-3 h-3 text-blue-500" /> {item.location || 'N/A'}</div></td>}
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all" title="Edit Data"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Hapus Data"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-600 opacity-50">
                <Box className="w-16 h-16 mb-4" strokeWidth={1} />
                <p className="text-sm font-semibold italic">Tidak ada data aset yang ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-800 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 tracking-tight">{editingItem ? 'Perbarui Data Aset' : 'Tambah Aset Baru'}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">Sistem Manajemen Inventaris Power</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className={labelClass}>Kode SKU</label>
                              <input className={inputClass} value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Contoh: SKU-101" />
                          </div>
                          <div>
                              <label className={labelClass}>Nama Barang</label>
                              <input className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Masukkan nama barang..." />
                          </div>
                      </div>

                      <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl space-y-6">
                          <h4 className="text-[10px] font-bold text-blue-500 flex items-center gap-2"><Layers className="w-4 h-4 glow-icon" /> Konfigurasi Stok</h4>
                          <div className="grid grid-cols-2 gap-6">
                              <div>
                                  <label className={labelClass}>Unit Satuan</label>
                                  <input className={inputClass} value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="Contoh: Pcs, Kg, Box" />
                              </div>
                              <div>
                                  <label className={labelClass}>Jumlah Stok</label>
                                  <input type="number" className={inputClass} value={formData.quantity ?? 0} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pb-6">
                          <div>
                              <label className={labelClass}>Harga Satuan (Rp)</label>
                              <input type="number" className={inputClass} value={formData.unitPrice ?? 0} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className={labelClass}>Stok Minimum (Alert)</label>
                              <input type="number" className={inputClass} value={formData.minLevel ?? 0} onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="pt-8 border-t border-slate-800 flex justify-end gap-4">
                          <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 font-bold text-xs hover:text-slate-200">Batal</button>
                          <button onClick={() => {
                              const item: any = { ...formData, id: editingItem?.id || generateId(), lastUpdated: new Date().toISOString() };
                              if (editingItem) onUpdateItem(item); else onAddItem(item);
                              setIsModalOpen(false);
                          }} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Simpan Perubahan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryTable;