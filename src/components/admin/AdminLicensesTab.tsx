import React, { useState } from 'react';
import { 
  Key, Plus, ShieldCheck, ShieldAlert, Clock, 
  RotateCcw, Sparkles, X, Check, RefreshCw
} from 'lucide-react';
import { AdminLicense, AdminUser, CyberModule } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminLicensesTabProps {
  licenses: AdminLicense[];
  users: AdminUser[];
  modules: CyberModule[];
  onRefresh: () => void;
}

export const AdminLicensesTab: React.FC<AdminLicensesTabProps> = ({
  licenses,
  users,
  modules,
  onRefresh,
}) => {
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [extendingLicense, setExtendingLicense] = useState<AdminLicense | null>(null);
  const [extraDaysInput, setExtraDaysInput] = useState(30);
  const [saving, setSaving] = useState(false);

  // New Grant Form
  const [grantUserId, setGrantUserId] = useState(users[0]?.id || '');
  const [grantModuleId, setGrantModuleId] = useState(modules[0]?.id || '');
  const [grantDuration, setGrantDuration] = useState(30);

  const handleGrantLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.createLicense({
        userId: grantUserId,
        moduleId: grantModuleId,
        durationDays: Number(grantDuration),
      });
      setIsGrantModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to grant license'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLicenseStatus = async (lic: AdminLicense) => {
    const nextStatus = lic.status === 'active' ? 'revoked' : 'active';
    try {
      await apiClient.updateLicenseStatus(lic.id, nextStatus);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to update license status'));
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingLicense) return;
    setSaving(true);
    try {
      await apiClient.extendLicense(extendingLicense.id, Number(extraDaysInput));
      setExtendingLicense(null);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to extend license'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white tracking-wider">
              RUNTIME LICENSES &amp; ACCESS CONTROL
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Directly assign, extend, or revoke runtime access permits across operator nodes
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsGrantModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.25)] hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>ASSIGN NEW LICENSE</span>
        </button>
      </div>

      {/* Licenses Table */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] tracking-wider">
                <th className="p-4">LICENSE ID &amp; OPERATOR</th>
                <th className="p-4">MODULE TARGET</th>
                <th className="p-4">DURATION / TYPE</th>
                <th className="p-4">EXPIRATION TIMESTAMP</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No active licenses provisioned.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-white block">{lic.id}</span>
                        <span className="text-[11px] text-slate-400">
                          {lic.username} ({lic.userId})
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-cyan-300 text-sm">{lic.moduleName}</span>
                    </td>

                    <td className="p-4">
                      {lic.isPermanent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          PERMANENT LIFETIME
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">
                          {lic.durationDays} Days Permit
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="text-[11px] text-slate-300">
                        {lic.expiresAt
                          ? new Date(lic.expiresAt).toLocaleDateString()
                          : 'NON-EXPIRING'}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          lic.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${lic.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {lic.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Extend / Modify Duration */}
                        <button
                          type="button"
                          onClick={() => {
                            setExtendingLicense(lic);
                            setExtraDaysInput(30);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Clock className="w-3 h-3" />
                          <span>EXTEND</span>
                        </button>

                        {/* Revoke / Restore */}
                        <button
                          type="button"
                          onClick={() => handleToggleLicenseStatus(lic)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                            lic.status === 'active'
                              ? 'bg-slate-900 text-rose-400 border-slate-700 hover:bg-rose-950/60'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          }`}
                        >
                          {lic.status === 'active' ? 'REVOKE' : 'RESTORE'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant License Modal */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  MANUALLY ASSIGN LICENSE
                </h3>
              </div>
              <button onClick={() => setIsGrantModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantLicense} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  TARGET OPERATOR
                </label>
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  TARGET MODULE
                </label>
                <select
                  value={grantModuleId}
                  onChange={(e) => setGrantModuleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (v{m.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  RUNTIME DURATION
                </label>
                <select
                  value={grantDuration}
                  onChange={(e) => setGrantDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                >
                  <option value={15}>15 Days Runtime</option>
                  <option value={20}>20 Days Runtime</option>
                  <option value={30}>30 Days Runtime</option>
                  <option value={-1}>Permanent Runtime (Lifetime Non-expiring)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider"
                >
                  ASSIGN PERMIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend License Modal */}
      {extendingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  EXTEND RUNTIME
                </h3>
              </div>
              <button onClick={() => setExtendingLicense(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono-code text-slate-300">
              Extending permit for <span className="text-cyan-300 font-bold">{extendingLicense.username}</span> on <span className="text-white font-bold">{extendingLicense.moduleName}</span>.
            </p>

            <form onSubmit={handleExtendSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  DURATION ADJUSTMENT
                </label>
                <select
                  value={extraDaysInput}
                  onChange={(e) => setExtraDaysInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                >
                  <option value={15}>+15 Days Extension</option>
                  <option value={30}>+30 Days Extension</option>
                  <option value={60}>+60 Days Extension</option>
                  <option value={-1}>Upgrade to Permanent (Lifetime)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtendingLicense(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider"
                >
                  SAVE EXTENSION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
