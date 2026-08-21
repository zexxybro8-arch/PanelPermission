import React, { useState, useEffect } from 'react';
import { 
  Key, Users, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, 
  Clock, Search, Filter, RefreshCw, Copy, Check, Eye, X, ChevronRight, 
  Sparkles, Lock, Shield
} from 'lucide-react';
import { GeneratedKeyRecord, AdminUser, Customer } from '../../types';
import { apiClient } from '../../services/apiClient';
import { appStore } from '../../store/appStore';
import { cyberAudio } from '../../utils/cyberAudio';

interface AdminUsersKeysTabProps {
  onRefreshParent?: () => void;
}

interface UserKeySummary {
  userId: string;
  username: string;
  customerId: string;
  totalGenerated: number;
  totalVerified: number;
  activeKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  lastGeneratedAt: string | null;
  lastVerifiedAt: string | null;
  keys: GeneratedKeyRecord[];
}

export const AdminUsersKeysTab: React.FC<AdminUsersKeysTabProps> = ({ onRefreshParent }) => {
  const [allKeys, setAllKeys] = useState<GeneratedKeyRecord[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GENERATED' | 'VERIFIED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // User Details Modal
  const [selectedUserSummary, setSelectedUserSummary] = useState<UserKeySummary | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [keysRes, usersRes, customersRes] = await Promise.all([
        apiClient.getGeneratedKeys(),
        apiClient.getUsers(),
        apiClient.getCustomers(),
      ]);
      setAllKeys(keysRes || []);
      setUsers(usersRes || []);
      setCustomers(customersRes?.customers || []);
    } catch (err) {
      console.warn('Failed to load Admin Users Keys data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const unsubscribe = appStore.subscribe(() => {
      // Re-fetch or sync state when store changes
      const updatedKeys = appStore.getGeneratedKeys();
      setAllKeys(updatedKeys || []);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    cyberAudio.playClick(1400);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleKeyStatus = async (keyRecord: GeneratedKeyRecord) => {
    const nextStatus = keyRecord.status === 'active' ? 'revoked' : 'active';
    cyberAudio.playClick(900);
    
    // Mutate record in state and persist via store
    keyRecord.status = nextStatus;
    await appStore.syncDocToFirestore('generatedKeys', keyRecord.id, keyRecord);
    
    // Refresh local state
    fetchAllData();
    if (selectedUserSummary) {
      const updatedKeys = selectedUserSummary.keys.map(k => k.id === keyRecord.id ? { ...k, status: nextStatus as any } : k);
      setSelectedUserSummary({ ...selectedUserSummary, keys: updatedKeys });
    }
  };

  // Build aggregated user summary records
  const userSummariesMap = new Map<string, UserKeySummary>();

  // 1. Seed map with registered customers
  customers.forEach(c => {
    const uid = c.customer_id || c.id || c.username;
    if (!userSummariesMap.has(uid.toLowerCase())) {
      userSummariesMap.set(uid.toLowerCase(), {
        userId: c.id || uid,
        username: c.username || uid,
        customerId: c.customer_id || uid,
        totalGenerated: 0,
        totalVerified: 0,
        activeKeys: 0,
        expiredKeys: 0,
        revokedKeys: 0,
        lastGeneratedAt: null,
        lastVerifiedAt: null,
        keys: [],
      });
    }
  });

  // 2. Seed map with admin users
  users.forEach(u => {
    const custId = (u as any).customer_id || u.id || u.username;
    const uid = custId;
    if (!userSummariesMap.has(uid.toLowerCase())) {
      userSummariesMap.set(uid.toLowerCase(), {
        userId: u.id || uid,
        username: u.username || uid,
        customerId: custId,
        totalGenerated: 0,
        totalVerified: 0,
        activeKeys: 0,
        expiredKeys: 0,
        revokedKeys: 0,
        lastGeneratedAt: null,
        lastVerifiedAt: null,
        keys: [],
      });
    }
  });

  // 3. Populate and compute metrics from all stored key records
  allKeys.forEach(k => {
    const uidKey = (k.userId || k.username || '').toLowerCase();
    let summary = userSummariesMap.get(uidKey);

    if (!summary) {
      summary = {
        userId: k.userId || k.username,
        username: k.username || k.userId,
        customerId: k.userId || k.username,
        totalGenerated: 0,
        totalVerified: 0,
        activeKeys: 0,
        expiredKeys: 0,
        revokedKeys: 0,
        lastGeneratedAt: null,
        lastVerifiedAt: null,
        keys: [],
      };
      userSummariesMap.set(uidKey, summary);
    }

    summary.keys.push(k);
    summary.totalGenerated += 1;

    if (k.verified === true) {
      summary.totalVerified += 1;
      if (!summary.lastVerifiedAt || new Date(k.verifiedAt || k.lastVerifiedAt || 0) > new Date(summary.lastVerifiedAt)) {
        summary.lastVerifiedAt = k.verifiedAt || k.lastVerifiedAt || null;
      }
    }

    const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
    if (k.status === 'revoked') {
      summary.revokedKeys += 1;
    } else if (isExpired || k.status === 'expired') {
      summary.expiredKeys += 1;
    } else {
      summary.activeKeys += 1;
    }

    if (!summary.lastGeneratedAt || new Date(k.createdAt) > new Date(summary.lastGeneratedAt)) {
      summary.lastGeneratedAt = k.createdAt;
    }
  });

  const userSummariesList = Array.from(userSummariesMap.values());

  // Dashboard Stats Calculations
  const totalUsers = userSummariesList.length;
  const totalKeysGenerated = allKeys.length;
  const totalKeysVerified = allKeys.filter(k => k.verified === true).length;
  const totalActiveKeys = allKeys.filter(k => k.status === 'active' && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length;
  const totalExpiredKeys = allKeys.filter(k => k.status === 'expired' || (k.expiresAt && new Date(k.expiresAt) <= new Date() && k.status !== 'revoked')).length;
  const totalRevokedKeys = allKeys.filter(k => k.status === 'revoked').length;

  // Filter & Search User Summaries
  const filteredUsers = userSummariesList.filter(u => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      u.username.toLowerCase().includes(query) || 
      u.customerId.toLowerCase().includes(query) ||
      u.keys.some(k => (k.panelName || '').toLowerCase().includes(query) || (k.generatedId || '').toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (statusFilter === 'GENERATED') return u.totalGenerated > 0;
    if (statusFilter === 'VERIFIED') return u.totalVerified > 0;
    if (statusFilter === 'ACTIVE') return u.activeKeys > 0;
    if (statusFilter === 'EXPIRED') return u.expiredKeys > 0;
    if (statusFilter === 'REVOKED') return u.revokedKeys > 0;

    return true;
  }).sort((a, b) => {
    const getTs = (u: UserKeySummary) => u.lastGeneratedAt ? new Date(u.lastGeneratedAt).getTime() : 0;
    if (sortOrder === 'NEWEST') {
      return getTs(b) - getTs(a);
    }
    return getTs(a) - getTs(b);
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_18px_rgba(0,242,254,0.25)]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base text-white tracking-wider uppercase">
                USERS KEYS MONITOR
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                ADMIN AUDIT
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400">
              Centralized monitoring of generated access credentials, verification metrics, &amp; user audit logs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick(1000);
            fetchAllData();
            if (onRefreshParent) onRefreshParent();
          }}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono-code text-cyan-300 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH AUDIT</span>
        </button>
      </div>

      {/* DASHBOARD SUMMARY CARDS (6 METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 font-mono-code">
        {/* TOTAL USERS */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-1 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL USERS
          </span>
          <div className="font-display font-black text-2xl text-white">
            {totalUsers}
          </div>
          <span className="text-[9px] text-cyan-400/80 block">REGISTERED ACCOUNTS</span>
        </div>

        {/* TOTAL KEYS GENERATED */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-1 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            KEYS GENERATED
          </span>
          <div className="font-display font-black text-2xl text-cyan-300">
            {totalKeysGenerated}
          </div>
          <span className="text-[9px] text-cyan-400/80 block">TOTAL PROVISIONED</span>
        </div>

        {/* TOTAL KEYS VERIFIED */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-1 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            KEYS VERIFIED
          </span>
          <div className="font-display font-black text-2xl text-emerald-300">
            {totalKeysVerified}
          </div>
          <span className="text-[9px] text-emerald-400/80 block">CONFIRMED ACCESS</span>
        </div>

        {/* ACTIVE KEYS */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-1 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
            ACTIVE KEYS
          </span>
          <div className="font-display font-black text-2xl text-cyan-200">
            {totalActiveKeys}
          </div>
          <span className="text-[9px] text-cyan-400/80 block">VALID &amp; ONLINE</span>
        </div>

        {/* EXPIRED KEYS */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            EXPIRED KEYS
          </span>
          <div className="font-display font-black text-2xl text-amber-300">
            {totalExpiredKeys}
          </div>
          <span className="text-[9px] text-amber-400/80 block">DURATION PASSED</span>
        </div>

        {/* REVOKED KEYS */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20 space-y-1 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
            REVOKED KEYS
          </span>
          <div className="font-display font-black text-2xl text-rose-300">
            {totalRevokedKeys}
          </div>
          <span className="text-[9px] text-rose-400/80 block">ACCESS TERMINATED</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono-code">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Username, User ID, or Panel Name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/60 text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'GENERATED', 'VERIFIED', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                cyberAudio.playClick(1200);
                setStatusFilter(filter);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === filter
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold">SORT:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-cyan-300 outline-none cursor-pointer"
          >
            <option value="NEWEST">NEWEST ACTIVITY</option>
            <option value="OLDEST">OLDEST ACTIVITY</option>
          </select>
        </div>
      </div>

      {/* USER LIST OVERVIEW TABLE */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider">
              USER KEYS OVERVIEW ({filteredUsers.length} USERS)
            </h3>
          </div>
          <span className="text-[10px] font-mono-code text-slate-500 uppercase">
            CLICK ANY USER TO VIEW FULL ACCESS HISTORY
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <span className="text-xs font-mono-code text-slate-400 block">Loading User Keys Audit...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Key className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-display font-bold text-sm text-slate-300">No Records Match Filters</p>
            <p className="text-xs font-mono-code text-slate-500">Try clearing your search query or selecting a different status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-code text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800/80 text-[10px] text-slate-400 uppercase font-bold">
                  <th className="p-3.5 pl-4">USER / CUSTOMER</th>
                  <th className="p-3.5 text-center">GENERATED</th>
                  <th className="p-3.5 text-center">VERIFIED</th>
                  <th className="p-3.5 text-center">ACTIVE</th>
                  <th className="p-3.5 text-center">EXPIRED</th>
                  <th className="p-3.5 text-center">REVOKED</th>
                  <th className="p-3.5">LAST GENERATED</th>
                  <th className="p-3.5">LAST VERIFIED</th>
                  <th className="p-3.5 pr-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.userId}
                    onClick={() => {
                      cyberAudio.playClick(1000);
                      setSelectedUserSummary(u);
                    }}
                    className="hover:bg-slate-900/80 transition-colors group cursor-pointer"
                  >
                    {/* User / Customer */}
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors block truncate">
                            {u.username}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            ID: {u.customerId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Generated */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-bold">
                        {u.totalGenerated}
                      </span>
                    </td>

                    {/* Total Verified */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
                        {u.totalVerified}
                      </span>
                    </td>

                    {/* Active Keys */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-200 border border-cyan-500/20">
                        {u.activeKeys}
                      </span>
                    </td>

                    {/* Expired Keys */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/20">
                        {u.expiredKeys}
                      </span>
                    </td>

                    {/* Revoked Keys */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-500/20">
                        {u.revokedKeys}
                      </span>
                    </td>

                    {/* Last Generated Date */}
                    <td className="p-3.5 text-slate-300 text-[11px]">
                      {u.lastGeneratedAt ? (
                        <span>{new Date(u.lastGeneratedAt).toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>

                    {/* Last Verified Date */}
                    <td className="p-3.5 text-slate-300 text-[11px]">
                      {u.lastVerifiedAt ? (
                        <span className="text-emerald-300 font-bold">{new Date(u.lastVerifiedAt).toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">Never</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 pr-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cyberAudio.playClick(1000);
                          setSelectedUserSummary(u);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW KEYS</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* USER DETAILS MODAL (FULL KEY HISTORY) */}
      {selectedUserSummary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedUserSummary(null)}
            className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-3xl rounded-3xl bg-slate-950 border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.3)] space-y-6 my-auto max-h-[90dvh] overflow-y-auto overflow-x-hidden z-10 font-mono-code">
            {/* Top Cyan Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-lg shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                  {selectedUserSummary.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-white uppercase">
                      {selectedUserSummary.username}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                      ID: {selectedUserSummary.customerId}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    COMPLETE ACCESS CREDENTIALS HISTORY AUDIT
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserSummary(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Pills in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">TOTAL GENERATED</span>
                <span className="font-bold text-cyan-300 text-sm">{selectedUserSummary.totalGenerated}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
                <span className="text-[9px] text-emerald-400 block uppercase font-bold">VERIFIED</span>
                <span className="font-bold text-emerald-300 text-sm">{selectedUserSummary.totalVerified}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/30">
                <span className="text-[9px] text-cyan-400 block uppercase font-bold">ACTIVE</span>
                <span className="font-bold text-cyan-200 text-sm">{selectedUserSummary.activeKeys}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30">
                <span className="text-[9px] text-amber-400 block uppercase font-bold">EXPIRED</span>
                <span className="font-bold text-amber-300 text-sm">{selectedUserSummary.expiredKeys}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-rose-500/30 col-span-2 sm:col-span-1">
                <span className="text-[9px] text-rose-400 block uppercase font-bold">REVOKED</span>
                <span className="font-bold text-rose-300 text-sm">{selectedUserSummary.revokedKeys}</span>
              </div>
            </div>

            {/* Generated Keys List */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  GENERATED KEYS RECORDS ({selectedUserSummary.keys.length})
                </span>
                <span className="text-[10px] text-slate-500">NEWEST ACTIVITY FIRST</span>
              </div>

              {selectedUserSummary.keys.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
                  <Key className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">No generated keys on record for this user.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[55dvh] overflow-y-auto pr-1">
                  {selectedUserSummary.keys
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((k) => {
                      const idVal = k.generatedId || k.credentials?.id || k.key;
                      const passVal = k.generatedPassword || k.credentials?.password || '';
                      const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();

                      return (
                        <div
                          key={k.id}
                          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 text-left relative"
                        >
                          {/* Top Row: Panel Info + Status & Verified Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                                <Shield className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-display font-bold text-xs text-white">
                                  {k.panelName || 'AEGIS PANEL'}
                                </h5>
                                <span className="text-[10px] text-cyan-400/80 block">
                                  PANEL ID: {k.panelId} | DURATION: {k.duration || '30 DAYS'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* VERIFICATION BADGE */}
                              {k.verified ? (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  VERIFIED ✓
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-slate-500" />
                                  NOT VERIFIED
                                </span>
                              )}

                              {/* STATUS BADGE */}
                              {k.status === 'revoked' ? (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                                  REVOKED
                                </span>
                              ) : isExpired ? (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                                  EXPIRED
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Credentials Grid: Access ID & Access Password */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Access ID */}
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] text-slate-500 block uppercase font-bold">ACCESS ID</span>
                                <span className="font-bold text-cyan-300 text-xs break-all block select-all">
                                  {idVal}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(idVal, `id-${k.id}`)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors shrink-0"
                              >
                                {copiedField === `id-${k.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Access Password */}
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] text-slate-500 block uppercase font-bold">ACCESS PASSWORD</span>
                                <span className="font-bold text-white text-xs break-all block select-all">
                                  {passVal}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(passVal, `pass-${k.id}`)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors shrink-0"
                              >
                                {copiedField === `pass-${k.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Timestamps & Admin Action Toggle */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                            <div className="space-y-0.5">
                              <div>
                                <span>GENERATED: </span>
                                <span className="text-slate-300 font-bold">{new Date(k.createdAt).toLocaleString()}</span>
                              </div>
                              {k.verified && (k.verifiedAt || k.lastVerifiedAt) && (
                                <div className="text-emerald-400">
                                  <span>VERIFIED AT: </span>
                                  <span className="font-bold">{new Date(k.verifiedAt || k.lastVerifiedAt!).toLocaleString()}</span>
                                </div>
                              )}
                              <div>
                                <span>EXPIRATION: </span>
                                <span className="text-slate-300 font-bold">
                                  {k.expiresAt ? new Date(k.expiresAt).toLocaleString() : 'LIFETIME'}
                                </span>
                              </div>
                            </div>

                            {/* Admin Revoke/Activate Control */}
                            <button
                              type="button"
                              onClick={() => handleToggleKeyStatus(k)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
                                k.status === 'revoked'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900'
                              }`}
                            >
                              {k.status === 'revoked' ? 'REINSTATE ACCESS' : 'REVOKE ACCESS'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserSummary(null)}
                className="w-full py-3 px-6 rounded-xl font-display font-bold tracking-widest text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>CLOSE AUDIT DETAILS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
