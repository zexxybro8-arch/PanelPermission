import React, { useState } from 'react';
import { 
  ShieldAlert, Power, RotateCcw, Laptop, Smartphone, 
  Globe, AlertTriangle, RefreshCw
} from 'lucide-react';
import { AdminSession } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminSessionsTabProps {
  sessions: AdminSession[];
  onRefresh: () => void;
}

export const AdminSessionsTab: React.FC<AdminSessionsTabProps> = ({
  sessions,
  onRefresh,
}) => {
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const handleRevokeSession = async (token: string, username: string) => {
    if (!window.confirm(`Revoke active token for operator ${username}?`)) return;
    setLoadingToken(token);
    try {
      await apiClient.revokeSession(token);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to revoke session'));
    } finally {
      setLoadingToken(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('CRITICAL ACTION: Terminate all other active operator sessions across the cluster?')) return;
    setRevokingAll(true);
    try {
      const count = await apiClient.revokeAllSessions();
      alert(`Successfully invalidated ${count} active sessions.`);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to revoke sessions'));
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white tracking-wider">
              ACTIVE ZERO-TRUST DEVICE SESSIONS
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Live cryptographic device tokens with remote invalidation capabilities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRevokeAll}
            disabled={revokingAll || sessions.length === 0}
            className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-display font-bold text-xs tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>REVOKE ALL SESSIONS</span>
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs font-mono-code text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-900">
            No external active device sessions currently registered.
          </div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-white tracking-wider">
                      {sess.username}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      LVL {sess.clearanceLevel}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-500 block">
                    ID: {sess.userId}
                  </span>
                </div>

                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Active" />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs font-mono-code text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{sess.ipAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{sess.userAgent}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Token: {sess.token.substring(0, 14)}...</span>
                  <span>{new Date(sess.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={loadingToken === sess.token}
                  onClick={() => handleRevokeSession(sess.token, sess.username)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-mono-code flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>TERMINATE SESSION</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
