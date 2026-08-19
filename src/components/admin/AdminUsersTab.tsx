import React, { useState } from 'react';
import { 
  Users, Search, UserPlus, Shield, Key, Power, 
  RotateCcw, DollarSign, Check, X, AlertTriangle, RefreshCw,
  Copy, Sparkles, Trash2, ShieldCheck, Eye, EyeOff, Boxes,
  Sliders
} from 'lucide-react';
import { AdminUser, CyberModule } from '../../types';
import { apiClient } from '../../services/apiClient';

interface AdminUsersTabProps {
  users: AdminUser[];
  onRefresh: () => void;
  onSelectUserForPricing: (userId: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onRefresh,
  onSelectUserForPricing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New user form state
  const [authorisedId, setAuthorisedId] = useState('');
  const [passKey, setPassKey] = useState('');
  const [accountStatus, setAccountStatus] = useState<'active' | 'disabled'>('active');
  const [clearanceLevel, setClearanceLevel] = useState(3);
  const [email, setEmail] = useState('');
  const [nodeRegion, setNodeRegion] = useState('Asia-SE');
  
  // Optional Custom Pricing during creation
  const [enableCustomPricing, setEnableCustomPricing] = useState(false);
  const [price15, setPrice15] = useState(120);
  const [price20, setPrice20] = useState(135);
  const [price30, setPrice30] = useState(150);
  const [pricePerm, setPricePerm] = useState(200);

  // Optional Initial Module License during creation
  const [initialModuleId, setInitialModuleId] = useState<string>('');
  const [initialPlanId, setInitialPlanId] = useState<string>('plan-30');
  const [initialDuration, setInitialDuration] = useState<number>(30);

  const [formError, setFormError] = useState('');

  // Created credentials modal display (for copying)
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    authorisedId: string;
    passKey: string;
  } | null>(null);

  // Reset pass key modal state
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [resetGeneratedKey, setResetGeneratedKey] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Copy feedback states
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassKey, setCopiedPassKey] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const generateRandomCredentials = async () => {
    try {
      const data = await apiClient.generateCredentials();
      setAuthorisedId(data.authorisedId);
      setPassKey(data.passKey);
    } catch {
      // Fallback local crypto generator
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let id = 'USR-';
      for (let i = 0; i < 5; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
      const chunk = (len: number) => {
        let s = '';
        for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
        return s;
      };
      setAuthorisedId(id);
      setPassKey(`AEGIS-${chunk(4)}-${chunk(4)}`);
    }
  };

  const handleOpenAddModal = () => {
    generateRandomCredentials();
    setEnableCustomPricing(false);
    setInitialModuleId('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.accountStatus === 'active' ? 'disabled' : 'active';
    setActionLoading(`status-${user.id}`);
    try {
      await apiClient.updateUserStatus(user.id, nextStatus);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetSessions = async (user: AdminUser) => {
    if (!window.confirm(`Force terminate all active sessions for ${user.username}?`)) return;
    setActionLoading(`reset-${user.id}`);
    try {
      const count = await apiClient.resetUserSessions(user.id);
      alert(`Terminated ${count} active session(s) for ${user.username}.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reset sessions');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`PERMANENTLY DELETE user ${user.username}? All active licenses, pricing overrides, and sessions will be permanently purged.`)) return;
    setActionLoading(`delete-${user.id}`);
    try {
      await apiClient.deleteUser(user.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenResetKeyModal = async (user: AdminUser) => {
    setResetModalUser(user);
    setResetSuccessMessage('');
    try {
      const data = await apiClient.generateCredentials();
      setResetGeneratedKey(data.passKey);
    } catch {
      setResetGeneratedKey(`AEGIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    }
  };

  const handleExecuteResetPassKey = async () => {
    if (!resetModalUser) return;
    setActionLoading(`reset-key-${resetModalUser.id}`);
    try {
      const res = await apiClient.resetUserPassword(resetModalUser.id, resetGeneratedKey);
      setResetSuccessMessage(`Pass Key successfully updated to: ${res.newPassKey}`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reset pass key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetId = authorisedId.trim().toUpperCase();
    const targetPass = passKey.trim();

    if (!targetId || !targetPass) {
      setFormError('Authorised ID and Pass Key are required');
      return;
    }

    try {
      const result = await apiClient.createUser({
        authorisedId: targetId,
        username: targetId,
        passKey: targetPass,
        password: targetPass,
        clearanceLevel: Number(clearanceLevel),
        email: email || undefined,
        nodeRegion,
        accountStatus,
        customPricing: enableCustomPricing ? {
          plan15Price: Number(price15),
          plan20Price: Number(price20),
          plan30Price: Number(price30),
          planPermPrice: Number(pricePerm),
        } : undefined,
        initialModuleId: initialModuleId || undefined,
        initialPlanId: initialPlanId || undefined,
        initialDurationDays: initialDuration,
      });

      setIsAddModalOpen(false);
      setCreatedCredentialsModal({
        authorisedId: result.createdCredentials.authorisedId,
        passKey: result.createdCredentials.passKey,
      });
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account');
    }
  };

  const handleCopy = (text: string, type: 'id' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPassKey(true);
      setTimeout(() => setCopiedPassKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Authorised ID, Name, or Node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 text-slate-950 font-display font-extrabold text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-[1.02] transition-all"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>CREATE NEW USER</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] tracking-wider">
                <th className="p-4">AUTHORISED ACCOUNT ID</th>
                <th className="p-4">ROLE &amp; CLEARANCE</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">ACTIVE LICENSES</th>
                <th className="p-4">CUSTOM PRICING</th>
                <th className="p-4 text-right">ADMIN ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No authorized operators found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm tracking-wider font-mono-code">
                            {u.username}
                          </span>
                          <span className="text-[10px] text-slate-500">({u.id})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {u.email || `${u.username.toLowerCase()}@aegis-defense.internal`}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Level {u.clearanceLevel} • {u.nodeRegion}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          u.accountStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.accountStatus === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {u.accountStatus.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-white">
                        {u.licenseCount || 0} Modules Active
                      </span>
                    </td>

                    <td className="p-4">
                      {u.hasCustomPricing ? (
                        <button
                          type="button"
                          onClick={() => onSelectUserForPricing(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold flex items-center gap-1 hover:bg-cyan-900 transition-colors cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>CUSTOM PRICING ACTIVE</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectUserForPricing(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-[10px] hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                        >
                          GLOBAL CATALOGUE (SET)
                        </button>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reset Pass Key */}
                        <button
                          type="button"
                          onClick={() => handleOpenResetKeyModal(u)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer"
                          title="Reset Pass Key"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {/* Enable / Disable Status */}
                        <button
                          type="button"
                          disabled={actionLoading === `status-${u.id}`}
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            u.accountStatus === 'active'
                              ? 'bg-slate-900 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/50'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                          }`}
                          title={u.accountStatus === 'active' ? 'Disable Account' : 'Enable Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Sessions */}
                        <button
                          type="button"
                          disabled={actionLoading === `reset-${u.id}`}
                          onClick={() => handleResetSessions(u)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
                          title="Revoke active sessions"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Direct Pricing Link */}
                        <button
                          type="button"
                          onClick={() => onSelectUserForPricing(u.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer"
                          title="Configure Individual Pricing"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            disabled={actionLoading === `delete-${u.id}`}
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition-all cursor-pointer"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    CREATE AUTHORISED ACCOUNT
                  </h3>
                  <p className="text-[11px] font-mono-code text-cyan-400/80">
                    GENERATE SECURE CREDENTIALS FOR CUSTOMER
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Generate Credentials Helper Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                <span className="text-[11px] font-mono-code text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Auto-generate cryptographic ID &amp; key:
                </span>
                <button
                  type="button"
                  onClick={generateRandomCredentials}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono-code font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>GENERATE CREDENTIALS</span>
                </button>
              </div>

              {/* Authorised Account ID */}
              <div>
                <label className="text-[11px] font-mono-code font-bold text-slate-300 block mb-1">
                  AUTHORISED ACCOUNT ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USR-8F42K"
                  value={authorisedId}
                  onChange={(e) => setAuthorisedId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono-code font-bold text-cyan-300 focus:border-cyan-400 outline-none uppercase tracking-wider"
                />
              </div>

              {/* Generated Pass Key */}
              <div>
                <label className="text-[11px] font-mono-code font-bold text-slate-300 block mb-1">
                  SECURE PASS KEY
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AEGIS-9X7M-K42P"
                  value={passKey}
                  onChange={(e) => setPassKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono-code text-emerald-300 focus:border-cyan-400 outline-none tracking-wider"
                />
                <span className="text-[10px] font-mono-code text-slate-400 mt-1 block">
                  * Pass Key will be hashed with HMAC-SHA256 and salt on server.
                </span>
              </div>

              {/* Status & Clearance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    ACCOUNT STATUS
                  </label>
                  <select
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="active">Active (Access Granted)</option>
                    <option value="disabled">Disabled (Locked)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    CLEARANCE LEVEL
                  </label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value={1}>Level 1 (Basic)</option>
                    <option value={2}>Level 2 (Operator)</option>
                    <option value={3}>Level 3 (Standard)</option>
                    <option value={4}>Level 4 (Elevated)</option>
                    <option value={5}>Level 5 (Admin / Root)</option>
                  </select>
                </div>
              </div>

              {/* Custom Pricing Accordion */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCustomPricing}
                      onChange={(e) => setEnableCustomPricing(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>CONFIGURE INDIVIDUAL PRICING OVERRIDE</span>
                  </label>
                </div>

                {enableCustomPricing && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
                    <div>
                      <label className="text-[10px] text-slate-400 block">15D PRICE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={price15}
                        onChange={(e) => setPrice15(Number(e.target.value))}
                        className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">20D PRICE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={price20}
                        onChange={(e) => setPrice20(Number(e.target.value))}
                        className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">30D PRICE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={price30}
                        onChange={(e) => setPrice30(Number(e.target.value))}
                        className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">PERM PRICE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricePerm}
                        onChange={(e) => setPricePerm(Number(e.target.value))}
                        className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white font-bold text-center"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Initial License Assignment */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                  OPTIONAL INITIAL MODULE RUNTIME LICENSE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={initialModuleId}
                      onChange={(e) => setInitialModuleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                    >
                      <option value="">No Initial Module</option>
                      <option value="bala-mod-xyz">BALA MOD XYZ</option>
                      <option value="angry-mod">ANGRY MOD</option>
                      <option value="rapid-core">RAPID CORE</option>
                      <option value="zero-trace">ZERO TRACE</option>
                      <option value="dripclint">DRIPCLINT</option>
                      <option value="xyz-cheats">XYZ CHEATS</option>
                      <option value="silent-cheats">SILENT CHEATS</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={initialDuration}
                      disabled={!initialModuleId}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setInitialDuration(val);
                        setInitialPlanId(val === -1 ? 'plan-perm' : val === 15 ? 'plan-15' : val === 20 ? 'plan-20' : 'plan-30');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none disabled:opacity-50"
                    >
                      <option value={15}>15 Days Runtime</option>
                      <option value={20}>20 Days Runtime</option>
                      <option value={30}>30 Days Runtime</option>
                      <option value={-1}>Permanent Runtime</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 text-slate-950 font-display font-extrabold text-xs tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.4)] cursor-pointer"
                >
                  CREATE &amp; GET CREDENTIALS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-CREATION CREDENTIALS POPUP MODAL WITH COPY BUTTONS */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-7 border border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.3)] bg-slate-950 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />
            
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-white tracking-wider">
                AUTHORISED ACCOUNT CREATED
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Provide these credentials to your customer for panel access.
              </p>
            </div>

            <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              {/* Authorised ID */}
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block mb-1">
                  ENTER AUTHORISED ID
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-700">
                  <span className="font-mono-code font-bold text-sm text-cyan-300 tracking-wider">
                    {createdCredentialsModal.authorisedId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentialsModal.authorisedId, 'id')}
                    className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-mono-code flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'COPIED' : 'COPY ID'}</span>
                  </button>
                </div>
              </div>

              {/* Pass Key */}
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block mb-1">
                  ENTER VALID PASS KEY
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-700">
                  <span className="font-mono-code font-bold text-sm text-emerald-300 tracking-wider">
                    {createdCredentialsModal.passKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentialsModal.passKey, 'pass')}
                    className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs font-mono-code flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPassKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPassKey ? 'COPIED' : 'COPY PASS KEY'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-display font-extrabold text-xs tracking-wider cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                DONE &amp; CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASS KEY MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/40 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  RESET PASS KEY FOR {resetModalUser.username}
                </h3>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccessMessage ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono-code space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>PASS KEY RESET SUCCESSFUL</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-700">
                    <span className="font-bold text-sm text-emerald-300">{resetGeneratedKey}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(resetGeneratedKey, 'pass')}
                      className="px-2.5 py-1 rounded bg-emerald-900 text-emerald-200 text-xs font-mono-code flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPassKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPassKey ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Existing user sessions have been terminated. Give this key to the customer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono-code text-xs font-bold"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    NEW PASS KEY
                  </label>
                  <input
                    type="text"
                    value={resetGeneratedKey}
                    onChange={(e) => setResetGeneratedKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-emerald-300 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteResetPassKey}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs"
                  >
                    APPLY NEW PASS KEY
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
