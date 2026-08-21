import React, { useState } from 'react';
import { 
  FileText, Search, ShieldCheck, AlertCircle, 
  AlertTriangle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { AdminActivityLog } from '../../types';

interface AdminLogsTabProps {
  logs?: AdminActivityLog[];
  onRefresh: () => void;
}

export const AdminLogsTab: React.FC<AdminLogsTabProps> = ({
  logs = [],
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filteredLogs = safeLogs.filter((l) => {
    if (!l) return false;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (l.action || '').toLowerCase().includes(searchLower) ||
      (l.details || '').toLowerCase().includes(searchLower) ||
      (l.adminId || '').toLowerCase().includes(searchLower) ||
      (l.targetResource || '').toLowerCase().includes(searchLower);

    const matchesAction = filterAction === 'ALL' || (l.action && l.action.startsWith(filterAction));
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit actions, operators, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
          >
            <option value="ALL">ALL AUDIT ACTIONS</option>
            <option value="PRICE">PRICING CHANGES</option>
            <option value="MODULE">MODULE EDITS</option>
            <option value="USER">OPERATOR MUTATIONS</option>
            <option value="LICENSE">LICENSE GRANTS</option>
            <option value="ORDER">ORDER UPDATES</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>SYNC AUDIT LOGS</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] tracking-wider">
                <th className="p-4">TIMESTAMP</th>
                <th className="p-4">ACTION &amp; ACTOR</th>
                <th className="p-4">TARGET RESOURCE</th>
                <th className="p-4">RESULT</th>
                <th className="p-4">AUDIT PAYLOAD &amp; DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No activity logs recorded matching filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="p-4">
                      <div>
                        <span className="font-bold text-cyan-300 block">{log.action}</span>
                        <span className="text-[10px] text-slate-500">By: {log.adminId}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-mono-code">
                        {log.targetResource}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : log.result === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>

                    <td className="p-4 text-slate-300 max-w-md">
                      <p className="line-clamp-2">{log.details}</p>
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
