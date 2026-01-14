import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { CATEGORIES } from '../constants';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Filter, Edit2, Trash2, AlertCircle, X, Layers, Eye, Columns, Upload, Download, FileSpreadsheet } from 'lucide-react';
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
  const [formError, setFormError] = useState<string | null>(null);

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
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRatio, setNewUnitRatio] = useState<string>('');

  const canEdit = userRole === 'admin' || userRole === 'staff';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const term = debouncedSearchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) || 
                              item.sku.toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
  }, [items, debouncedSearchTerm, categoryFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      { "Name": "Contoh Barang", "SKU": "SKU-001", "Category": "Accessories", "Quantity": 100, "Base Unit": "Pcs", "Min Level": 10, "Price": 15000, "Location": "A-01" }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_SmartStock.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      processImportedData(data);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImportedData = (data: any[]) => {
    if (!onBatchAdd) return;
    const newItems: InventoryItem[] = [];
    let skippedCount = 0;
    data.forEach((row: any) => {
       const name = row['Name'] || row['name'];
       const sku = row['SKU'] || row['sku'];
       const category = row['Category'] || row['category'] || 'Uncategorized';
       const qty = Number(row['Quantity'] || row['quantity'] || 0);
       const baseUnit = row['Base Unit'] || row['baseUnit'] || 'Pcs';
       const minLevel = Number(row['Min Level'] || row['minLevel'] || 0);
       const price = Number(row['Price'] || row['price'] || 0);
       const location = row['Location'] || row['location'] || '';

       if (!name || !sku) return;
       if (items.some(i => i.sku === sku) || newItems.some(i => i.sku === sku)) {
         skippedCount++;
         return;
       }
       newItems.push({
         id: generateId(),
         name: String(name),
         sku: String(sku),
         category: String(category),
         quantity: isNaN(qty) ? 0 : qty,
         baseUnit: String(baseUnit),
         minLevel: isNaN(minLevel) ? 0 : minLevel,
         unitPrice: isNaN(price) ? 0 : price,
         location: String(location),
         lastUpdated: new Date().toISOString(),
         alternativeUnits: []
       });
    });
    if (newItems.length > 0) {
       onBatchAdd(newItems);
       alert(`Berhasil impor ${newItems.length} barang.${skippedCount > 0 ? ` Lewati ${skippedCount} duplikat.` : ''}`);
    } else {
       alert("Tidak ada barang baru yang diimpor.");
    }
  };

  const handleOpenModal = (item?: InventoryItem) => {
    setFormError(null);
    setNewUnitName('');
    setNewUnitRatio('');
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAlternativeUnits(item.alternativeUnits || []);
    } else {
      setEditingItem(null);
      setFormData({ category: '', quantity: 0, minLevel: 5, unitPrice: 0, location: '', name: '', sku: '', baseUnit: 'Pcs' });
      setAlternativeUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    const ratio = Number(newUnitRatio);
    if (isNaN(ratio) || ratio <= 1) {
        setFormError("Rasio konversi harus lebih dari 1.");
        return;
    }
    setAlternativeUnits([...alternativeUnits, { name: newUnitName, ratio }]);
    setNewUnitName('');
    setNewUnitRatio('');
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : generateId(),
      name: formData.name || '',
      sku: formData.sku || '',
      category: formData.category || 'Uncategorized', 
      quantity: Number(formData.quantity) || 0,
      baseUnit: formData.baseUnit || 'Pcs',
      alternativeUnits: alternativeUnits,
      minLevel: Number(formData.minLevel) || 0,
      unitPrice: Number(formData.unitPrice) || 0,
      location: formData.location || '',
      lastUpdated: new Date().toISOString()
    };
    if (editingItem) onUpdateItem(newItem);
    else onAddItem(newItem);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari barang atau SKU..." 
            className="bg-transparent outline-none text-sm w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end items-center">
          {canEdit && (
            <div className="flex gap-2 mr-2">
                <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
                <div className="relative">
                   <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                     <FileSpreadsheet className="w-3.5 h-3.5" /> Impor Excel
                   </button>
                </div>
            </div>
          )}
          <div className="relative" ref={columnMenuRef}>
             <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 text-sm h-full">
               <Columns className="w-4 h-4" />
             </button>
             {isColumnMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2">
                   <div className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 mb-1">Kolom Terlihat</div>
                   {columns.map(col => (
                     <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                       <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-blue-600" />
                       {col.label}
                     </label>
                   ))}
                </div>
             )}
          </div>
          <div className="relative">
            <select className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg shadow-sm text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">Semua Kategori</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Filter className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Tambah Barang
            </button>
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
                {isVisible('quantity') && <th className="px-6 py-4 bg-slate-50">Stok</th>}
                {isVisible('price') && <th className="px-6 py-4 text-right bg-slate-50">Harga (Rp)</th>}
                {isVisible('location') && <th className="px-6 py-4 text-center bg-slate-50">Lokasi</th>}
                <th className="px-6 py-4 text-right bg-slate-50">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const isLowStock = item.quantity <= item.minLevel;
                const largestUnit = item.alternativeUnits && item.alternativeUnits.length > 0 ? [...item.alternativeUnits].sort((a,b) => b.ratio - a.ratio)[0] : null;
                const displayQty = largestUnit ? `${Math.floor(item.quantity / largestUnit.ratio)} ${largestUnit.name} + ${item.quantity % largestUnit.ratio} ${item.baseUnit}` : `${item.quantity} ${item.baseUnit}`;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {isVisible('name') && (
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            <span className="text-xs text-slate-400">SKU: {item.sku}</span>
                        </div>
                        </td>
                    )}
                    {isVisible('category') && (
                        <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{item.category}</span>
                        </td>
                    )}
                    {isVisible('quantity') && (
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>{item.quantity} {item.baseUnit}</span>
                                {isLowStock && <AlertCircle className="w-4 h-4 text-amber-500" />}
                            </div>
                            {largestUnit && <span className="text-xs text-slate-500">≈ {displayQty}</span>}
                        </div>
                        </td>
                    )}
                    {isVisible('price') && (
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    )}
                    {isVisible('location') && <td className="px-6 py-4 text-center text-sm text-slate-500">{item.location}</td>}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                            <>
                                <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => window.confirm(`Hapus ${item.name}?`) && onDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </>
                        ) : <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600"><Eye className="w-4 h-4" /></button>}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">{editingItem ? (canEdit ? 'Edit Barang' : 'Detail Barang') : 'Tambah Barang Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>}
              <fieldset disabled={!canEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Barang</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                    <input type="text" required list="cat-list" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                    <datalist id="cat-list">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-4 rounded-lg border">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Satuan & Stok</label>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Satuan Dasar (Terkecil)</label>
                                <input type="text" required placeholder="Pcs, Kg, dll" className="w-full px-2 py-1.5 border rounded text-sm" value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Jumlah Stok ({formData.baseUnit || 'Unit'})</label>
                                <input type="number" min="0" className="w-full px-2 py-1.5 border rounded text-sm" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Level</label>
                    <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})} />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                    <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                    </div>
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                    </div>
                </div>
              </fieldset>
              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium">Batal</button>
                {canEdit && <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Simpan</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;