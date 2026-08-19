import React from 'react';
import { 
  Users, DollarSign, ShoppingCart, Key, ShieldCheck, 
  Activity, Clock, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { AdminOverviewStats, AdminOrder, AdminActivityLog } from '../../types';

interface AdminOverviewTabProps {
  stats: AdminOverviewStats | null;
  recentOrders: AdminOrder[];
  recentLogs: AdminActivityLog[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  recentOrders,
  recentLogs,
  loading,
  onRefresh,
  onNavigateTab,
}) => {
  if (loading && !stats) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400 font-mono-code">
        <RefreshCw className="w-7 h-7 animate-spin" />
        <span>SYNCHRONIZING DATABASE TELEMETRY...</span>
      </div>
    );
  }

  const statCards = [
    {
      id: 'users',
      label: 'TOTAL OPERATORS',
      value: stats?.totalUsers || 0,
      subValue: `${stats?.activeUsers || 0} ACTIVE`,
      icon: Users,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgColor: 'bg-cyan-950/20',
      tab: 'users',
    },
    {
      id: 'revenue',
      label: 'TOTAL REVENUE',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      subValue: `${stats?.completedOrders || 0} SETTLED ORDERS`,
      icon: DollarSign,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-950/20',
      tab: 'orders',
    },
    {
      id: 'orders',
      label: 'PENDING ORDERS',
      value: stats?.pendingOrders || 0,
      subValue: `${stats?.totalOrders || 0} TOTAL ORDERS`,
      icon: ShoppingCart,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-950/20',
      tab: 'orders',
    },
    {
      id: 'licenses',
      label: 'ACTIVE LICENSES',
      value: stats?.activeLicenses || 0,
      subValue: `${stats?.expiredLicenses || 0} EXPIRED`,
      icon: Key,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/30',
      bgColor: 'bg-sky-950/20',
      tab: 'licenses',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-bold text-white">GATEWAY CORE TELEMETRY</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE PRODUCTION
              </span>
            </div>
            <span className="text-xs font-mono-code text-slate-400">
              Database synchronized • Post-Quantum Kyber-1024 encryption active
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-cyan-300 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH METRICS</span>
        </button>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigateTab(card.tab)}
              className={`p-5 rounded-2xl border ${card.borderColor} ${card.bgColor} backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono-code text-slate-400 tracking-wider">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                  {card.value}
                </div>
                <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                  <span>{card.subValue}</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Recent Orders & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Section */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-bold text-sm tracking-wider text-white">
                RECENT ORDERS / PAYMENTS
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-mono-code text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              VIEW ALL →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.length === 0 ? (
              <p className="text-xs font-mono-code text-slate-500 py-6 text-center">
                No orders recorded yet.
              </p>
            ) : (
              recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono-code"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{ord.id}</span>
                      <span className="text-slate-400">• {ord.username}</span>
                    </div>
                    <span className="text-[11px] text-cyan-400 block">{ord.moduleName} — {ord.planName}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-white block">₹{ord.finalPrice}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        ord.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : ord.paymentStatus === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {ord.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Admin Audit Log Snippet */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-bold text-sm tracking-wider text-white">
                RECENT ADMIN AUDIT TRAILS
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs font-mono-code text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              FULL LOGS →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length === 0 ? (
              <p className="text-xs font-mono-code text-slate-500 py-6 text-center">
                No activity logs recorded.
              </p>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs font-mono-code"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300 font-bold">{log.action}</span>
                      <span className="text-[10px] text-slate-500">by {log.adminId}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{log.details}</p>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
