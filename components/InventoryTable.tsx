import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { CATEGORIES } from '../constants';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Filter, Edit2, Trash2, AlertCircle, X, Layers, Eye, Columns } from 'lucide-react';
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  
  // Multi-Unit Management State
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
      setFormData({
        category: CATEGORIES[0],
        quantity: 0,
        minLevel: 5,
        unitPrice: 0,
        location: '',
        name: '',
        sku: '',
        baseUnit: 'Pcs'
      });
      setAlternativeUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    const ratio = Number(newUnitRatio);
    if (isNaN(ratio) || ratio <= 1) {
        setFormError("Conversion ratio must be greater than 1.");
        return;
    }
    if (alternativeUnits.some(u => u.name.toLowerCase() === newUnitName.toLowerCase())) {
        setFormError("Unit name already exists.");
        return;
    }

    setAlternativeUnits([...alternativeUnits, { name: newUnitName, ratio }]);
    setNewUnitName('');
    setNewUnitRatio('');
    setFormError(null);
  };

  const handleRemoveUnit = (index: number) => {
    const newUnits = [...alternativeUnits];
    newUnits.splice(index, 1);
    setAlternativeUnits(newUnits);
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
        setFormError("Item name is required.");
        return false;
    }
    if (!formData.sku?.trim()) {
        setFormError("SKU is required.");
        return false;
    }
    if ((formData.quantity || 0) < 0) {
        setFormError("Quantity cannot be negative.");
        return false;
    }
    if ((formData.unitPrice || 0) < 0) {
        setFormError("Price cannot be negative.");
        return false;
    }
    if (!formData.baseUnit?.trim()) {
        setFormError("Base unit is required.");
        return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return; // Guard against viewers submitting

    setFormError(null);

    if (!validateForm()) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : generateId(),
      name: formData.name || '',
      sku: formData.sku || '',
      category: formData.category || CATEGORIES[0],
      quantity: Number(formData.quantity) || 0,
      baseUnit: formData.baseUnit || 'Pcs',
      alternativeUnits: alternativeUnits,
      minLevel: Number(formData.minLevel) || 0,
      unitPrice: Number(formData.unitPrice) || 0,
      location: formData.location || '',
      lastUpdated: new Date().toISOString()
    };

    if (editingItem) {
      onUpdateItem(newItem);
    } else {
      onAddItem(newItem);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search items, SKU..." 
            className="bg-transparent outline-none text-sm w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {/* Column Toggle */}
          <div className="relative" ref={columnMenuRef}>
             <button
               onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
               className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 text-sm h-full"
               title="Customize Columns"
             >
               <Columns className="w-4 h-4" />
             </button>
             {isColumnMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                   <div className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 mb-1">Visible Columns</div>
                   {columns.map(col => (
                     <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                       <input 
                         type="checkbox"
                         checked={col.visible}
                         onChange={() => onToggleColumn(col.id)}
                         className="rounded text-blue-600 focus:ring-blue-500"
                       />
                       {col.label}
                     </label>
                   ))}
                </div>
             )}
          </div>

          <div className="relative">
            <select 
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-full w-full sm:w-auto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Filter className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {canEdit && (
            <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap justify-center"
            >
                <Plus className="w-4 h-4" />
                Add Item
            </button>
          )}
        </div>
      </div>

      {/* Table Container with Freeze Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isVisible('name') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Item Name</th>}
                {isVisible('category') && <th className="px-6 py-4 bg-slate-50">Category</th>}
                {isVisible('quantity') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Stock Level</th>}
                {isVisible('price') && <th className="px-4 py-3 sm:px-6 sm:py-4 text-right bg-slate-50">Price</th>}
                {isVisible('location') && <th className="px-6 py-4 text-center bg-slate-50">Location</th>}
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-right bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const isLowStock = item.quantity <= item.minLevel;
                // Find largest unit for display
                const largestUnit = item.alternativeUnits && item.alternativeUnits.length > 0
                    ? [...item.alternativeUnits].sort((a,b) => b.ratio - a.ratio)[0] 
                    : null;
                
                const displayQty = largestUnit 
                    ? `${Math.floor(item.quantity / largestUnit.ratio)} ${largestUnit.name} + ${item.quantity % largestUnit.ratio} ${item.baseUnit}`
                    : `${item.quantity} ${item.baseUnit}`;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {isVisible('name') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            <span className="text-xs text-slate-400">SKU: {item.sku}</span>
                        </div>
                        </td>
                    )}
                    {isVisible('category') && (
                        <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {item.category}
                        </span>
                        </td>
                    )}
                    {isVisible('quantity') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                                {item.quantity} {item.baseUnit}
                                </span>
                                {isLowStock && (
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                )}
                            </div>
                            {largestUnit && (
                                <span className="text-xs text-slate-500">
                                    ≈ {displayQty}
                                </span>
                            )}
                        </div>
                        </td>
                    )}
                    {isVisible('price') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right font-medium text-slate-600">
                        ${item.unitPrice.toFixed(2)}
                        </td>
                    )}
                    {isVisible('location') && (
                        <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {item.location}
                        </td>
                    )}
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                            <>
                                <button 
                                onClick={() => handleOpenModal(item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => {
                                    if(window.confirm(`Are you sure you want to delete ${item.name}?`)) {
                                    onDeleteItem(item.id);
                                    }
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <button 
                              onClick={() => handleOpenModal(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={columns.filter(c => c.visible).length + 1} className="px-6 py-12 text-center text-slate-400">
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">
                  {editingItem ? (canEdit ? 'Edit Item' : 'Item Details') : 'Add New Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {formError}
                  </div>
              )}
              {/* Fieldset used to disable inputs for viewers */}
              <fieldset disabled={!canEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                    <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.sku || ''}
                        onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    </div>
                    
                    {/* Advanced Unit Config Section */}
                    <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-slate-700 uppercase">Unit Measurement</h4>
                    </div>
                    
                    {/* Base Unit & Qty */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Base Unit (Smallest)</label>
                            <input 
                            type="text"
                            required
                            placeholder="e.g. Pcs, Kg"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                            value={formData.baseUnit || ''}
                            onChange={e => setFormData({...formData, baseUnit: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Current Stock ({formData.baseUnit || 'Base'})</label>
                            <input 
                            type="number" 
                            min="0"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    {/* Alternative Units List */}
                    <div className="space-y-2 mb-3">
                        <label className="block text-xs font-medium text-slate-600">Alternative Units (e.g. Box, Carton)</label>
                        {alternativeUnits.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-md text-sm">
                                <span className="font-medium text-slate-800">1 {u.name}</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-slate-600">{u.ratio} {formData.baseUnit || 'Base'}</span>
                                {canEdit && (
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveUnit(idx)}
                                        className="ml-auto text-slate-400 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {alternativeUnits.length === 0 && (
                            <div className="text-xs text-slate-400 italic">No alternative units defined.</div>
                        )}
                    </div>

                    {/* Add New Unit */}
                    {canEdit && (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase mb-0.5">Unit Name</label>
                                <input 
                                type="text"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                                placeholder="e.g. Box"
                                />
                            </div>
                            <div className="w-24">
                                <label className="block text-[10px] text-slate-500 uppercase mb-0.5">Ratio</label>
                                <input 
                                type="number"
                                min="2"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newUnitRatio}
                                onChange={e => setNewUnitRatio(e.target.value)}
                                placeholder="Qty"
                                />
                            </div>
                            <button
                            type="button"
                            onClick={handleAddUnit}
                            className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-700 h-[34px]"
                            >
                            Add
                            </button>
                        </div>
                    )}
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Level</label>
                    <input 
                        type="number" 
                        min="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.minLevel}
                        onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price ($)</label>
                    <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.unitPrice}
                        onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})}
                    />
                    </div>
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        value={formData.location || ''}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                    </div>
                </div>
              </fieldset>
              
              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 pb-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Close
                </button>
                {canEdit && (
                    <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"
                    >
                    {editingItem ? 'Save Changes' : 'Create Item'}
                    </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;