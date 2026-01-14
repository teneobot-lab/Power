import React, { useMemo } from 'react';
import { InventoryItem } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

// Custom Tooltip Component for Bar Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // This contains the full item data we passed
    const item: InventoryItem = data.fullItem;
    
    // Logic to calculate breakdowns for tooltip
    let breakdown = `${item.quantity} ${item.baseUnit}`;
    if (item.alternativeUnits && item.alternativeUnits.length > 0) {
        // Find largest unit
        const largest = [...item.alternativeUnits].sort((a,b) => b.ratio - a.ratio)[0];
        const majorQty = Math.floor(item.quantity / largest.ratio);
        const minorQty = item.quantity % largest.ratio;
        
        if (majorQty > 0) {
            breakdown = `${majorQty} ${largest.name}${minorQty > 0 ? ` + ${minorQty} ${item.baseUnit}` : ''}`;
        }
    }

    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-sm text-blue-600 font-medium">
          Total: {item.quantity} {item.baseUnit}
        </p>
        {item.alternativeUnits && item.alternativeUnits.length > 0 && (
           <p className="text-xs text-slate-500 mt-1 pt-1 border-t border-slate-100">
             ≈ {breakdown}
           </p>
        )}
      </div>
    );
  }

  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.quantity <= i.minLevel).length;
    const totalValue = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const totalStockCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

    return { totalItems, lowStockCount, totalValue, totalStockCount };
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topItemsData = useMemo(() => {
    return [...items]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(item => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        quantity: item.quantity,
        fullItem: item // Pass full item for custom tooltip processing
      }));
  }, [items]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Total Value</p>
                    <h3 className="text-2xl font-bold text-slate-900">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Total Units</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.totalStockCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                    <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
                    <h3 className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.lowStockCount}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${stats.lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <AlertTriangle className={`w-6 h-6 ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Unique SKUs</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.totalItems}</h3>
                    </div>
                    <div className="p-3 bg-violet-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-violet-600" />
                    </div>
                </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Stock Levels */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Items by Quantity</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItemsData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                        <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Inventory by Category</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        >
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;