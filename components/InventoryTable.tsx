import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Edit2, Trash2, X, Columns, AlertTriangle, Layers, MapPin, Power, PowerOff, Filter, MoreVertical, LayoutGrid, List } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

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
    } else {
      setEditingItem(null);
      setFormData({ status: 'active', baseUnit: 'Units', category: 'General', quantity: 0, unitPrice: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const item: any = {
      ...formData,
      id: editingItem?.id || generateId(),
      lastUpdated: new Date().toISOString(),
    };
    if (editingItem) onUpdateItem(item); else onAddItem(item);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5 w-full md:w-96 focus-within:border-[#6D5DF6]/50 transition-all">
          <Search size={18} className="text-[#6B7280]" />
          <input 
            type="text" 
            placeholder="Search enterprise assets..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full text-[#E5E7EB] placeholder-[#6B7280] font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="p-3 bg-white/5 border border-white/5 rounded-xl text-[#9CA3AF] hover:text-white transition-all"><Filter size={18} /></button>
          <div className="h-6 w-px bg-white/5 mx-2 hidden md:block"></div>
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#6D5DF6] hover:bg-[#5B4EDB] text-white px-8 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/10 active:scale-95 transition-all">
            <Plus size={16} /> New Asset Node
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0F172A]/90 backdrop-blur-md">
              <tr className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] border-b border-white/5">
                {isVisible('name') && <th className="px-10 py-6">Asset Specification</th>}
                {isVisible('category') && <th className="px-10 py-6">Segment</th>}
                {isVisible('quantity') && <th className="px-10 py-6">In-Stock Quota</th>}
                {isVisible('price') && <th className="px-10 py-6 text-right">Unit Val</th>}
                <th className="px-10 py-6 text-right">Node Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredItems.map(item => {
                const isAlert = (item.minLevel || 0) > 0 && (item.quantity || 0) <= (item.minLevel || 0);
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`group hover:bg-white/[0.02] transition-all duration-300 ${isInactive ? 'opacity-30 grayscale' : ''}`}>
                    {isVisible('name') && (
                      <td className="px-10 py-7">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#E5E7EB] flex items-center gap-2.5">
                            {item.name} {isAlert && <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] shadow-[0_0_8px_#F97316] animate-pulse" />}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest mt-1.5 leading-none">{item.sku}</span>
                        </div>
                      </td>
                    )}
                    {isVisible('category') && <td className="px-10 py-7"><span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{item.category}</span></td>}
                    {isVisible('quantity') && (
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-sm font-black ${isAlert ? 'text-[#F97316]' : 'text-[#22D3EE]'}`}>{item.quantity}</span>
                          <span className="text-[9px] text-[#6B7280] font-black uppercase tracking-widest mt-0.5">{item.baseUnit}</span>
                        </div>
                      </td>
                    )}
                    {isVisible('price') && <td className="px-10 py-7 text-right text-sm font-bold text-[#9CA3AF] tracking-tight">${item.unitPrice?.toLocaleString()}</td>}
                    <td className="px-10 py-7 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-x-2">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-[#6B7280] hover:text-[#6D5DF6] hover:bg-[#6D5DF6]/10 rounded-xl transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="p-2 text-[#6B7280] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={14} /></button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F14]/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="glass-panel rounded-[3rem] w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{editingItem ? 'Update Asset Node' : 'Initialize New Node'}</h3>
                <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-[0.3em] mt-2 leading-none">Global Ledger Interface</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/5 rounded-full text-[#6B7280] hover:rotate-90 transition-all duration-500"><X size={28} /></button>
            </div>
            
            <div className="p-12 overflow-y-auto custom-scrollbar space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Serial SKU</label>
                  <input className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-[#6D5DF6]/30 outline-none transition-all font-mono" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="SKU-CORE-000" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Asset Alias</label>
                  <input className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-[#6D5DF6]/30 outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Quantum Cluster" />
                </div>
              </div>

              <div className="p-10 bg-white/[0.03] border border-white/5 rounded-[2.5rem] space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-[#6D5DF6] flex items-center gap-3 uppercase tracking-widest"><Layers size={14} /> Capacity Specification</h4>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Base Metric</label>
                    <input className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-[#6D5DF6]/30" value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="Units" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-3 ml-1">Initial Quota</label>
                    <input type="number" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-[#6D5DF6]/30" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-white/5 flex justify-end gap-6">
                <button onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-[#6B7280] font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">Discard</button>
                <button onClick={handleSave} className="px-12 py-4 bg-[#6D5DF6] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all">Synchronize Node</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;