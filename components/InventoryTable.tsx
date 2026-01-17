import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Edit2, Trash2, X, Columns, AlertTriangle, Layers, MapPin, FileUp, FileDown, Box, Power, PowerOff, ListPlus, Filter, ChevronDown, MoreHorizontal } from 'lucide-react';
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
  const [altUnits, setAltUnits] = useState<UnitDefinition[]>([]);
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
      setAltUnits(item.alternativeUnits || []);
    } else {
      setEditingItem(null);
      setFormData({ 
        category: 'Accessories', location: 'Main Warehouse', name: '', sku: '', baseUnit: 'Pcs', status: 'active'
      });
      setAltUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = (item: InventoryItem) => {
    const updatedStatus = item.status === 'inactive' ? 'active' : 'inactive';
    onUpdateItem({ ...item, status: updatedStatus as 'active' | 'inactive' });
  };

  const inputClass = "w-full bg-[#0f172a]/60 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 outline-none transition-all";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1";

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-4 bg-white/5 px-5 py-3 rounded-[2rem] border border-white/5 w-full sm:w-auto">
          <Search className="w-5 h-5 text-slate-500" />
          <input type="text" placeholder="Search catalog or SKU..." className="bg-transparent border-none focus:ring-0 text-sm w-full sm:w-64 text-slate-200 placeholder:text-slate-700 font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto flex-wrap justify-end">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select className="bg-white/5 border border-white/5 text-slate-300 py-3 pl-11 pr-10 rounded-2xl text-xs font-black uppercase tracking-widest appearance-none outline-none focus:ring-2 focus:ring-blue-500/20" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          </div>
          
          <div className="flex items-center bg-white/5 border border-white/5 rounded-2xl p-1">
             <button onClick={() => {}} className="p-3 text-slate-500 hover:text-blue-400 transition-colors" title="Export CSV">
                <FileDown className="w-5 h-5" />
             </button>
             <div className="w-px h-6 bg-white/5 mx-1"></div>
             <label className="p-3 text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" title="Import CSV">
                <FileUp className="w-5 h-5" />
                <input type="file" ref={importFileRef} className="hidden" />
             </label>
          </div>

          <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors text-slate-400 relative">
            <Columns className="w-5 h-5" />
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-4 w-60 glass-panel rounded-3xl shadow-2xl z-[60] p-4 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-4">View Columns</p>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-2xl cursor-pointer text-[11px] font-bold text-slate-400 hover:text-white transition-colors">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="w-4 h-4 rounded-lg bg-slate-900 border-white/10 text-blue-600 focus:ring-blue-500" />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </button>

          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl">
              <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {isVisible('name') && <th className="px-10 py-6">Asset Details</th>}
                {isVisible('category') && <th className="px-10 py-6">Segment</th>}
                {isVisible('quantity') && <th className="px-10 py-6 text-center">In-Stock</th>}
                {isVisible('price') && <th className="px-10 py-6 text-right">Unit Value</th>}
                {isVisible('location') && <th className="px-10 py-6 text-center">Zone</th>}
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.map(item => {
                const isAlert = item.status !== 'inactive' && (item.minLevel || 0) > 0 && (item.quantity || 0) <= (item.minLevel || 0);
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`hover:bg-white/[0.03] transition-colors duration-300 group ${isInactive ? 'opacity-30' : ''}`}>
                    {isVisible('name') && (
                        <td className="px-10 py-7">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
                                {item.name} 
                                {isAlert && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>}
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1.5">{item.sku}</span>
                          </div>
                        </td>
                    )}
                    {isVisible('category') && (
                      <td className="px-10 py-7">
                        <span className="px-4 py-1.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/5">
                          {item.category}
                        </span>
                      </td>
                    )}
                    {isVisible('quantity') && (
                      <td className="px-10 py-7 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-base font-black ${isAlert ? 'text-rose-500' : 'text-blue-400'}`}>{item.quantity}</span> 
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{item.baseUnit}</span>
                        </div>
                      </td>
                    )}
                    {isVisible('price') && (
                      <td className="px-10 py-7 text-right">
                        <span className="text-sm font-bold text-slate-300 tracking-tight">${item.unitPrice.toLocaleString()}</span>
                      </td>
                    )}
                    {isVisible('location') && (
                      <td className="px-10 py-7 text-center">
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-blue-500/60" /> 
                          {item.location}
                        </div>
                      </td>
                    )}
                    <td className="px-10 py-7 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-4">
                        <button onClick={() => handleToggleStatus(item)} className={`p-2.5 rounded-xl transition-all ${isInactive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-500/10'}`} title={isInactive ? "Activate" : "Deactivate"}>
                          {isInactive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleOpenModal(item)} className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-slate-600 opacity-20">
                <Box className="w-20 h-20 mb-6" strokeWidth={1} />
                <p className="text-sm font-black uppercase tracking-[0.3em] italic">Zero Records Discovered</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="glass-panel rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
                  <div className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase">{editingItem ? 'Refine Asset Node' : 'Initialize New Asset'}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Asset Core Configuration Management</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-white/5 rounded-[2rem] text-slate-500 transition-all hover:rotate-90"><X className="w-7 h-7" /></button>
                  </div>
                  
                  <div className="p-12 overflow-y-auto custom-scrollbar space-y-10 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                              <label className={labelClass}>Node Identifier (SKU)</label>
                              <input className={inputClass} value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="SKU-XXX-CORE" />
                          </div>
                          <div>
                              <label className={labelClass}>Primary Asset Name</label>
                              <input className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Quantum Server Rack" />
                          </div>
                      </div>

                      <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-8">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-blue-500 flex items-center gap-3 uppercase tracking-[0.3em]"><Layers className="w-4 h-4" /> Capacity & Metrics</h4>
                            <button onClick={() => setAltUnits([...altUnits, { name: '', ratio: 1 }])} className="flex items-center gap-2 text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/20 uppercase tracking-widest">
                              <ListPlus className="w-3 h-3" /> Multi-Unit
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <label className={labelClass}>Base Metric</label>
                                  <input className={inputClass} value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="Units / KG / Packs" />
                              </div>
                              <div>
                                  <label className={labelClass}>Current Quota</label>
                                  <input type="number" className={inputClass} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} placeholder="0" />
                              </div>
                          </div>

                          {altUnits.map((unit, idx) => (
                             <div key={idx} className="flex items-end gap-4 animate-in slide-in-from-top-2">
                               <div className="flex-1">
                                  <label className="text-[9px] font-black text-slate-600 mb-2 block uppercase tracking-widest">Secondary Unit</label>
                                  <input className={inputClass} value={unit.name} onChange={e => { const n = [...altUnits]; n[idx].name = e.target.value; setAltUnits(n); }} placeholder="Box" />
                               </div>
                               <div className="w-40">
                                  <label className="text-[9px] font-black text-slate-600 mb-2 block uppercase tracking-widest">Ratio to Base</label>
                                  <input type="number" className={inputClass} value={unit.ratio} onChange={e => { const n = [...altUnits]; n[idx].ratio = Number(e.target.value); setAltUnits(n); }} />
                               </div>
                               <button onClick={() => setAltUnits(altUnits.filter((_, i) => i !== idx))} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 transition-all mb-0.5">
                                  <Trash2 className="w-5 h-5" />
                               </button>
                             </div>
                          ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-4">
                          <div className="md:col-span-2">
                              <label className={labelClass}>Market Valuation ($)</label>
                              <input type="number" className={inputClass} value={formData.unitPrice ?? ''} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} placeholder="1,200.00" />
                          </div>
                          <div>
                              <label className={labelClass}>Critical Limit</label>
                              <input type="number" className={inputClass} value={formData.minLevel ?? ''} onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})} placeholder="5" />
                          </div>
                      </div>

                      <div className="pt-10 border-t border-white/5 flex justify-end gap-6">
                          <button onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-slate-200 transition-colors">Discard</button>
                          <button onClick={() => {
                              const item: any = { 
                                ...formData, 
                                id: editingItem?.id || generateId(), 
                                alternativeUnits: altUnits,
                                lastUpdated: new Date().toISOString() 
                              };
                              if (editingItem) onUpdateItem(item); else onAddItem(item);
                              setIsModalOpen(false);
                          }} className="px-12 py-4 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">Synchronize Node</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryTable;