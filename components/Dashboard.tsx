import React, { useMemo } from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp, ShieldCheck, Box, Layers, Activity } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#818cf8', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/90 backdrop-blur-xl p-4 border border-white/5 rounded-2xl shadow-2xl">
        <p className="font-bold text-slate-100 mb-2 text-xs uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-blue-400">
          Flow: {payload[0].value} units
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

  const lowStockItems = useMemo(() => {
    return items.filter(i => i.status !== 'inactive' && (i.minLevel || 0) > 0 && (i.quantity || 0) <= (i.minLevel || 0))
      .sort((a, b) => ((a.quantity || 0) / (a.minLevel || 1)) - ((b.quantity || 0) / (b.minLevel || 1)));
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(item => {
      counts[item.category || 'Other'] = (counts[item.category || 'Other'] || 0) + (item.quantity || 0);
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.filter(t => t.type === 'OUT').forEach(t => {
      t.items.forEach(item => { counts[item.itemName] = (counts[item.itemName] || 0) + (item.quantityInput || 0); });
    });
    return Object.entries(counts).map(([name, qty]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '..' : name,
      quantity: qty
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [transactions]);

  const StatCard = ({ title, value, icon: Icon, color, label }: any) => (
    <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-${color}-500/20 transition-all duration-700`}></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-white mb-1">{value}</h3>
          <p className={`text-[10px] font-bold text-${color}-400 flex items-center gap-1`}>
            <Activity className="w-3 h-3" /> {label}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-500 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inventory Valuation" value={`$${(stats.totalValue || 0).toLocaleString()}`} icon={DollarSign} color="blue" label="+12.5% vs last week" />
            <StatCard title="Asset Units" value={stats.totalStockCount} icon={Package} color="indigo" label="Stable occupancy" />
            <StatCard title="Stock Critical" value={stats.lowStockCount} icon={AlertTriangle} color={stats.lowStockCount > 0 ? "rose" : "emerald"} label={stats.lowStockCount > 0 ? "Attention required" : "All levels healthy"} />
            <StatCard title="Active SKU's" value={stats.totalItems} icon={TrendingUp} color="purple" label="+4 new this month" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-500 glow-blue" />
                        Outbound Velocity
                    </h3>
                </div>
                <div className="h-[320px] w-full">
                    {topItemsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItemsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                            <Bar dataKey="quantity" radius={[0, 8, 8, 0]} barSize={28}>
                                {topItemsData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic opacity-40">No activity data found</div>
                    )}
                </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <Box className="w-5 h-5 text-purple-500 glow-purple" />
                        Category Mix
                    </h3>
                </div>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={10}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', color: '#f1f5f9' }} itemStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="lg:col-span-3 glass-panel p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 glow-rose" />
                        Critical Replenishment Protocol
                    </h3>
                </div>
                {lowStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {lowStockItems.map(item => (
                            <div key={item.id} className="p-6 bg-white/5 border border-white/5 rounded-3xl group hover:border-rose-500/40 transition-all duration-300">
                                <div className="flex justify-between items-start mb-6">
                                  <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-100 truncate leading-tight mb-1">{item.name}</p>
                                      <p className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">{item.sku}</p>
                                  </div>
                                  <div className="bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                    <span className="text-rose-500 font-black text-xs">{item.quantity}</span>
                                  </div>
                                </div>
                                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-3">
                                    <div 
                                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full" 
                                        style={{ width: `${Math.min(100, ((item.quantity || 0) / (item.minLevel || 1)) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                   <span>Availability: {(((item.quantity || 0) / (item.minLevel || 1)) * 100).toFixed(0)}%</span>
                                   <span>Limit: {item.minLevel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-600 opacity-20">
                        <ShieldCheck className="w-20 h-20 mb-6" strokeWidth={1} />
                        <p className="text-xs font-black tracking-widest uppercase italic">All inventory points operating within safe parameters</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;