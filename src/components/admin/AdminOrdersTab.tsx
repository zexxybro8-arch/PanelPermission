import React, { useState } from 'react';
import { 
  ShoppingCart, Search, Filter, CheckCircle2, Clock, 
  XCircle, AlertCircle, RefreshCw, ArrowUpRight
} from 'lucide-react';
import { AdminOrder } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminOrdersTabProps {
  orders: AdminOrder[];
  onRefresh: () => void;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.transactionRef.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || ord.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to update order status'));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, Operator, Txn Ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH ORDERS</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] tracking-wider">
                <th className="p-4">ORDER ID &amp; OPERATOR</th>
                <th className="p-4">MODULE &amp; PLAN</th>
                <th className="p-4">FINAL PRICE</th>
                <th className="p-4">TRANSACTION REF</th>
                <th className="p-4">PAYMENT STATUS</th>
                <th className="p-4">RUNTIME EXPIRY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No orders found matching filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-white text-sm block">{ord.id}</span>
                        <span className="text-[11px] text-slate-400">
                          {ord.username} • {new Date(ord.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-cyan-300 block">{ord.moduleName}</span>
                        <span className="text-[10px] text-slate-400">{ord.planName}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-extrabold text-sm text-white">
                        ₹{ord.finalPrice}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="text-[11px] text-slate-400 font-mono-code block">
                        {ord.transactionRef}
                      </span>
                      <span className="text-[9px] text-slate-500">UPI QR GATEWAY</span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          disabled={updatingOrderId === ord.id}
                          value={ord.paymentStatus}
                          onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer ${
                            ord.paymentStatus === 'PAID'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : ord.paymentStatus === 'PENDING'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                              : 'bg-rose-950 text-rose-300 border-rose-500/50'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="PAID">PAID</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                        {updatingOrderId === ord.id && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-[11px] text-slate-300">
                        {ord.runtimeExpiry
                          ? new Date(ord.runtimeExpiry).toLocaleDateString()
                          : ord.paymentStatus === 'PAID'
                          ? 'PERMANENT (LIFETIME)'
                          : 'Awaiting Settlement'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
