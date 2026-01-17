import React, { useMemo } from 'react';
import { InventoryItem, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, TrendingUp, AlertCircle, DollarSign, Activity, Clock, ChevronRight } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  const stats = useMemo(() => ({
    totalItems: items.length,
    totalValue: items.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unitPrice || 0)), 0),
    alerts: items.filter(i => i.status !== 'inactive' && (i.minLevel || 0) > 0 && (i.quantity || 0) <= (i.minLevel || 0)).length,
    activeBrands: new Set(items.map(i => i.category)).size
  }), [items]);

  const recentItems = useMemo(() => [...items].sort((a,b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 3), [items]);
  const recentTransactions = useMemo(() => transactions.slice(0, 3), [transactions]);

  const StatCard = ({ title, value, label, color, icon: Icon }: any) => (
    <div className={`p-6 rounded-[2rem] glass-card flex flex-col justify-between h-44 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-${color}-500/20 transition-all`}></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-${color}-400`}>
          <Icon size={18} />
        </div>
        <span className="text-xs font-semibold text-slate-400">{title}</span>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>
        <p className={`text-[10px] font-bold text-${color}-400 mt-1 flex items-center gap-1`}>
          <TrendingUp size={12} /> {label}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {['Overviews', 'Inventory', 'Reports', 'Settings'].map((t, i) => (
            <button key={t} className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${i === 0 ? 'bg-teal-500/10 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Inventory" value={stats.totalItems} label="+2.0% Last month" color="teal" icon={Package} />
        <StatCard title="Active Categories" value={stats.activeBrands} label="+1.0% Last month" color="purple" icon={Activity} />
        <StatCard title="Low Stock Alerts" value={stats.alerts} label="+4.0% Last month" color="orange" icon={AlertCircle} />
        <StatCard title="Total Valuation" value={`Rp ${Math.round(stats.totalValue / 1000000)}M`} label="+12% Last month" color="pink" icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="glass-card rounded-[2rem] p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-6 flex justify-between items-center">
            Recent Inventory <ChevronRight size={14} className="text-slate-500" />
          </h3>
          <div className="space-y-4">
            {recentItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">{item.name}</span>
                  <span className="text-[10px] text-slate-500">{item.sku}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.status === 'inactive' ? 'bg-slate-800 text-slate-500' : 'bg-teal-500/10 text-teal-400'}`}>
                  {item.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-6 flex justify-between items-center">
            Recent Transactions <ChevronRight size={14} className="text-slate-500" />
          </h3>
          <div className="space-y-4">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">{tx.items.length} Items</span>
                  <span className="text-[10px] text-slate-500">{tx.date}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tx.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {tx.type === 'IN' ? 'Inbound' : 'Outbound'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-6 flex justify-between items-center">
            Stock Distribution <Clock size={14} className="text-slate-500" />
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items.slice(0, 5)}>
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                  {items.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2dd4bf' : '#a855f7'} />
                  ))}
                </Bar>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;