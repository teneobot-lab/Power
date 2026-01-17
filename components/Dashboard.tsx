import React, { useMemo } from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp, ShieldCheck, Box } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

const COLORS = ['#2563eb', '#3b82f6', '#6366f1', '#818cf8', '#475569', '#1e293b'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    return (
      <div className="bg-slate-900/90 backdrop-blur-md p-3 border border-slate-800 rounded-xl shadow-2xl">
        <p className="font-bold text-slate-100 mb-1 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-sm text-blue-400 font-black">
          Keluar: {data.quantity}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.minLevel > 0 && i.quantity <= i.minLevel).length;
    const totalValue = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const totalStockCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
    return { totalItems, lowStockCount, totalValue, totalStockCount };
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter(i => i.minLevel > 0 && i.quantity <= i.minLevel)
      .sort((a, b) => (a.quantity / a.minLevel) - (b.quantity / b.minLevel));
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.filter(t => t.type === 'OUT').forEach(t => {
      t.items.forEach(item => { counts[item.itemName] = (counts[item.itemName] || 0) + item.quantityInput; });
    });
    return Object.entries(counts).map(([name, qty]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '..' : name,
      quantity: qty
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [transactions]);

  const StatCard = ({ title, value, icon: Icon, colorClass, iconColor }: any) => (
    <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
          <h3 className={`text-2xl font-black tracking-tight ${colorClass}`}>{value}</h3>
        </div>
        <div className={`p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform ${iconColor}`}>
          <Icon className="w-6 h-6 glow-icon" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inventory Valuation" value={`Rp ${stats.totalValue.toLocaleString('id-ID')}`} icon={DollarSign} colorClass="text-slate-100" iconColor="text-blue-500" />
            <StatCard title="Total Asset Units" value={stats.totalStockCount} icon={Package} colorClass="text-slate-100" iconColor="text-emerald-500" />
            <StatCard title="Critical Alerts" value={stats.lowStockCount} icon={AlertTriangle} colorClass={stats.lowStockCount > 0 ? "text-rose-500" : "text-slate-100"} iconColor={stats.lowStockCount > 0 ? "text-rose-500" : "text-slate-600"} />
            <StatCard title="Catalog Depth" value={stats.totalItems} icon={TrendingUp} colorClass="text-slate-100" iconColor="text-indigo-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-blue-500" /> Velocity: Top Outbound Flows
                </h3>
                <div className="h-[300px] w-full">
                    {topItemsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItemsData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            <Bar dataKey="quantity" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest italic">No flow data recorded</div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                   <Box className="w-4 h-4 text-indigo-500" /> Segment Allocation
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} itemStyle={{ fontSize: '10px' }} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="lg:col-span-3 bg-slate-900/60 p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 glow-icon" />
                        Critical Depletion Protocol
                    </h3>
                </div>
                {lowStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {lowStockItems.map(item => (
                            <div key={item.id} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-rose-500/50 transition-all shadow-inner">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-100 uppercase truncate leading-tight">{item.name}</p>
                                      <p className="text-[10px] text-slate-600 font-mono tracking-tighter mt-1">{item.sku}</p>
                                  </div>
                                  <span className="text-rose-500 font-black text-sm">{item.quantity}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full" 
                                        style={{ width: `${Math.min(100, (item.quantity / item.minLevel) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                   <span>Availability: {((item.quantity/item.minLevel)*100).toFixed(0)}%</span>
                                   <span>Threshold: {item.minLevel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-600 opacity-30">
                        <ShieldCheck className="w-16 h-16 mb-4" strokeWidth={1} />
                        <p className="text-xs font-black tracking-widest uppercase italic">All asset levels nominal</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;