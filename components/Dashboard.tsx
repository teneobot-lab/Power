import React, { useMemo } from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp, ShieldCheck, Box, Activity } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

const COLORS = ['#6D5DF6', '#22D3EE', '#F97316', '#3b82f6', '#818cf8', '#a855f7'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F172A] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="font-bold text-slate-100 mb-1 text-xs uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-[#22D3EE]">
          Units: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.status !== 'inactive' && (i.minLevel || 0) > 0 && (i.quantity || 0) <= (i.minLevel || 0)).length;
    const totalValue = items.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unitPrice || 0)), 0);
    const totalStockCount = items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    return { totalItems, lowStockCount, totalValue, totalStockCount };
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(item => {
      counts[item.category || 'Other'] = (counts[item.category || 'Other'] || 0) + (item.quantity || 0);
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const outboundData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.filter(t => t.type === 'OUT').forEach(t => {
      t.items.forEach(item => { counts[item.itemName] = (counts[item.itemName] || 0) + (item.totalBaseQuantity || 0); });
    });
    return Object.entries(counts).map(([name, qty]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '..' : name,
      quantity: qty
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [transactions]);

  const StatCard = ({ title, value, icon: Icon, gradient, label }: any) => (
    <div className="glass-panel p-8 rounded-[2rem] relative overflow-hidden group border border-white/5">
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 bg-${gradient}`}></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-white mb-1 leading-none">{value}</h3>
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-2">
            <Activity className="w-3 h-3 text-[#22D3EE]" /> {label}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-${gradient}-500 to-${gradient}-700 group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inventory Valuation" value={`$${Math.round(stats.totalValue).toLocaleString()}`} icon={DollarSign} gradient="indigo" label="+8.4% vs last period" />
            <StatCard title="Total Asset Units" value={stats.totalStockCount} icon={Package} color="cyan" gradient="cyan" label="Units currently in custody" />
            <StatCard title="Critical Stock Nodes" value={stats.lowStockCount} icon={AlertTriangle} gradient="rose" label={stats.lowStockCount > 0 ? "Replenishment required" : "Levels operational"} />
            <StatCard title="Active SKU Clusters" value={stats.totalItems} icon={TrendingUp} gradient="purple" label="+12 created this month" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-8 rounded-[2rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-4 h-4 text-[#22D3EE]" />
                        Velocity Monitor (Outbound)
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    {outboundData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={outboundData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.02)" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                            <Bar dataKey="quantity" radius={[0, 8, 8, 0]} barSize={24}>
                                {outboundData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] italic opacity-40">Awaiting Movement Data</div>
                    )}
                </div>
            </div>

            <div className="glass-panel p-8 rounded-[2rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <Box className="w-4 h-4 text-[#6D5DF6]" />
                        Asset Segments
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} itemStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;