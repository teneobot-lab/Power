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
        <p className="font-bold text-[#E5E7EB] mb-1 text-[10px] uppercase tracking-widest">{label}</p>
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

  const StatCard = ({ title, value, icon: Icon, gradient, label }: any) => (
    <div className="glass-panel p-8 rounded-[2rem] relative overflow-hidden group">
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-700 bg-${gradient === 'purple' ? '[#6D5DF6]' : gradient === 'cyan' ? '[#22D3EE]' : gradient === 'orange' ? '[#F97316]' : '[#6366f1]'}`}></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-white mb-1 leading-none">{value}</h3>
          <p className="text-[10px] font-bold text-[#9CA3AF] flex items-center gap-1.5 mt-2">
            <Activity className="w-3 h-3 text-[#22D3EE]" /> {label}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-${gradient === 'purple' ? '[#6D5DF6]' : gradient === 'cyan' ? '[#22D3EE]' : gradient === 'orange' ? '[#F97316]' : '[#6366f1]'} to-${gradient === 'purple' ? '[#8B5CF6]' : gradient === 'cyan' ? '[#06B6D4]' : gradient === 'orange' ? '[#FB923C]' : '[#4f46e5]'} group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inventory Valuation" value={`$${Math.round(stats.totalValue).toLocaleString()}`} icon={DollarSign} gradient="blue" label="+4.2% vs last cycle" />
            <StatCard title="Active Custody Units" value={stats.totalStockCount} icon={Package} gradient="cyan" label="Stable occupancy" />
            <StatCard title="Critical Thresholds" value={stats.lowStockCount} icon={AlertTriangle} gradient="orange" label={stats.lowStockCount > 0 ? "Action Required" : "Nodes healthy"} />
            <StatCard title="Asset SKU Clusters" value={stats.totalItems} icon={TrendingUp} gradient="purple" label="+12 new entries" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-8 rounded-[2rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-[#9CA3AF] uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-4 h-4 text-[#22D3EE] glow-cyan" />
                        Network Throughput
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={items.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280', fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280', fontWeight: 600}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                        <Bar dataKey="quantity" radius={[6, 6, 0, 0]} barSize={32}>
                            {items.slice(0, 8).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar> barSize={24} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-[2rem]">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-sm font-black text-[#9CA3AF] uppercase tracking-widest flex items-center gap-3">
                        <Box className="w-4 h-4 text-[#6D5DF6] glow-purple" />
                        Segment Allocation
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