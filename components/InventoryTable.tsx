import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Layers, MapPin, Power, PowerOff, ListPlus, Filter, Download, FileUp } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import * as XLSX from 'xlsx';

interface InventoryTableProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  userRole: UserRole;
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, onAddItem, onUpdateItem, onDeleteItem, userRole, columns, onToggleColumn 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [altUnits, setAltUnits] = useState<UnitDefinition[]>([]);

  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;
  const canEdit = userRole !== 'viewer';

  const filteredItems = useMemo(() => {
    return items.filter(i => 
      i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [items, debouncedSearch]);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAltUnits(item.alternativeUnits || []);
    } else {
      setEditingItem(null);
      setFormData({ status: 'active', baseUnit: 'Pcs', category: 'General' });
      setAltUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = (item: InventoryItem) => {
    onUpdateItem({ ...item, status: item.status === 'inactive' ? 'active' : 'inactive' });
  };

  const handleSave = () => {
    const item: any = {
      ...formData,
      id: editingItem?.id || generateId(),
      alternativeUnits: altUnits,
      lastUpdated: new Date().toISOString(),
      quantity: formData.quantity || 0,
      unitPrice: formData.unitPrice || 0,
      minLevel: formData.minLevel || 0
    };
    if (editingItem) onUpdateItem(item); else onAddItem(item);
    setIsModalOpen(false);
  };

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-slate-700 font-medium";
  const labelClass = "block text-[11px] font-bold text-slate-500 mb-2 ml-1";

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-800 w-full md:w-80">
          <Search size={16} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Search items or sku..." 
            className="bg-transparent outline-none text-xs w-full text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"><Filter size={18} /></button>
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-teal-500/10 active:scale-95 transition-all">
            <Plus size={16} /> Add Inventory
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md">
              <tr className="text-[10px] font-bold text-slate-500 border-b border-slate-800">
                {isVisible('name') && <th className="px-8 py-5">Item Details</th>}
                {isVisible('category') && <th className="px-8 py-5">Category</th>}
                {isVisible('quantity') && <th className="px-8 py-5">Stock Level</th>}
                {isVisible('price') && <th className="px-8 py-5 text-right">Unit Price</th>}
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredItems.map(item => {
                const isCritical = (item.minLevel || 0) > 0 && (item.quantity || 0) <= (item.minLevel || 0);
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`group hover:bg-white/5 transition-all ${isInactive ? 'opacity-40 grayscale contrast-50' : ''}`}>
                    {isVisible('name') && (
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            {item.name} {isCritical && <AlertTriangle size={12} className="text-orange-500" />}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{item.sku}</span>
                        </div>
                      </td>
                    )}
                    {isVisible('category') && <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-800/50 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700/50">{item.category}</span></td>}
                    {isVisible('quantity') && (
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isCritical ? 'text-orange-400' : 'text-teal-400'}`}>{item.quantity}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{item.baseUnit}</span>
                        </div>
                      </td>
                    )}
                    {isVisible('price') && <td className="px-8 py-5 text-right text-xs font-bold text-slate-300">Rp {item.unitPrice?.toLocaleString()}</td>}
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggleStatus(item)} className={`p-2 rounded-xl transition-all ${isInactive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-500/10'}`}>
                          {isInactive ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="glass-card rounded-[2.5rem] w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{editingItem ? 'Update inventory' : 'Add new inventory'}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Item registration portal</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-500"><X size={24} /></button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Sku code</label>
                  <input className={inputClass} value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. SKU-101" />
                </div>
                <div>
                  <label className={labelClass}>Item name</label>
                  <input className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter item name..." />
                </div>
              </div>

              <div className="p-8 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-teal-500 flex items-center gap-2"><Layers size={14} /> Units & stock configuration</h4>
                  <button onClick={() => setAltUnits([...altUnits, { name: '', ratio: 1 }])} className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 bg-teal-500/5 px-3 py-1.5 rounded-lg border border-teal-500/20">
                    <ListPlus size={12} /> Add multi-unit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Base unit</label>
                    <input className={inputClass} value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="e.g. Pcs, Box, Kg" />
                  </div>
                  <div>
                    <label className={labelClass}>Initial stock</label>
                    <input type="number" className={inputClass} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="Enter quantity" />
                  </div>
                </div>
                {altUnits.map((u, i) => (
                  <div key={i} className="flex gap-4 items-end animate-in slide-in-from-top-1">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-600 mb-1 ml-1">Alt unit name</label>
                      <input className={inputClass} value={u.name} onChange={e => { const n = [...altUnits]; n[i].name = e.target.value; setAltUnits(n); }} placeholder="Box" />
                    </div>
                    <div className="w-32">
                      <label className="text-[9px] font-bold text-slate-600 mb-1 ml-1">Ratio to base</label>
                      <input type="number" className={inputClass} value={u.ratio ?? ''} onChange={e => { const n = [...altUnits]; n[i].ratio = Number(e.target.value); setAltUnits(n); }} placeholder="12" />
                    </div>
                    <button onClick={() => setAltUnits(altUnits.filter((_, idx) => idx !== i))} className="mb-0.5 p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Unit price (Rp)</label>
                  <input type="number" className={inputClass} value={formData.unitPrice ?? ''} onChange={e => setFormData({...formData, unitPrice: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className={labelClass}>Minimum alert level</label>
                  <input type="number" className={inputClass} value={formData.minLevel ?? ''} onChange={e => setFormData({...formData, minLevel: e.target.value === '' ? undefined : Number(e.target.value)})} placeholder="e.g. 5" />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800 flex justify-end gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 font-bold text-xs hover:text-slate-300 transition-all">Cancel</button>
                <button onClick={handleSave} className="px-10 py-3 bg-teal-600 text-white rounded-2xl font-bold text-xs shadow-xl shadow-teal-500/10 hover:bg-teal-500 active:scale-95 transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;