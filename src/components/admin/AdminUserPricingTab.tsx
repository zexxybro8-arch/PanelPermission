import React, { useState, useEffect } from 'react';
import { 
  DollarSign, User, ShieldAlert, Check, RefreshCw, 
  RotateCcw, Sparkles, AlertCircle, ArrowRight, Tag
} from 'lucide-react';
import { AdminUser, UserCustomPricing, AdminRuntimePlan } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminUserPricingTabProps {
  users: AdminUser[];
  onPricingUpdated?: () => void;
}

export const AdminUserPricingTab: React.FC<AdminUserPricingTabProps> = ({
  users,
  onPricingUpdated,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'USER_10025');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global Plans & Current User Pricing State
  const [globalPlans, setGlobalPlans] = useState<AdminRuntimePlan[]>([]);
  const [customPricing, setCustomPricing] = useState<UserCustomPricing | null>(null);

  // Form input prices
  const [p15, setP15] = useState<number>(120);
  const [p20, setP20] = useState<number>(135);
  const [p30, setP30] = useState<number>(150);
  const [pPerm, setPPerm] = useState<number>(200);

  // Load plans & custom pricing for selected user
  const loadUserPricing = async (userId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const [pricingData, plansData] = await Promise.all([
        apiClient.getUserPricingDetails(userId),
        apiClient.getRuntimePlans(),
      ]);

      setGlobalPlans(plansData);
      setCustomPricing(pricingData.customPricing);

      const default15 = plansData.find((p) => p.id === 'plan-15')?.defaultPrice || 120;
      const default20 = plansData.find((p) => p.id === 'plan-20')?.defaultPrice || 135;
      const default30 = plansData.find((p) => p.id === 'plan-30')?.defaultPrice || 150;
      const defaultPerm = plansData.find((p) => p.id === 'plan-perm')?.defaultPrice || 200;

      if (pricingData.customPricing) {
        setP15(pricingData.customPricing.plan15Price);
        setP20(pricingData.customPricing.plan20Price);
        setP30(pricingData.customPricing.plan30Price);
        setPPerm(pricingData.customPricing.planPermPrice);
      } else {
        setP15(default15);
        setP20(default20);
        setP30(default30);
        setPPerm(defaultPerm);
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to load user pricing') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadUserPricing(selectedUserId);
    }
  }, [selectedUserId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiClient.saveCustomPricing(selectedUserId, {
        plan15Price: Number(p15),
        plan20Price: Number(p20),
        plan30Price: Number(p30),
        planPermPrice: Number(pPerm),
      });
      setCustomPricing(updated);
      setMessage({ type: 'success', text: `CUSTOM PRICING SAVED FOR ${selectedUserId}!` });
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to save custom pricing') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.resetCustomPricing(selectedUserId);
      setCustomPricing(null);
      
      const default15 = globalPlans.find((p) => p.id === 'plan-15')?.defaultPrice || 120;
      const default20 = globalPlans.find((p) => p.id === 'plan-20')?.defaultPrice || 135;
      const default30 = globalPlans.find((p) => p.id === 'plan-30')?.defaultPrice || 150;
      const defaultPerm = globalPlans.find((p) => p.id === 'plan-perm')?.defaultPrice || 200;

      setP15(default15);
      setP20(default20);
      setP30(default30);
      setPPerm(defaultPerm);

      setMessage({ type: 'success', text: `PRICING RESET TO GLOBAL DEFAULTS FOR ${selectedUserId}` });
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to reset pricing') });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserObj = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Individual Pricing Feature */}
      <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base text-white tracking-wider">
                INDIVIDUAL USER PRICING ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                DYNAMIC OVERRIDES
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-300 mt-0.5">
              Set customized price tiers for individual operators. When configured, the user portal will automatically display and validate these exact prices.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout: User Selector (Left) & Pricing Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Operator Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-code font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                SELECT OPERATOR
              </span>
              <span className="text-[10px] font-mono-code text-slate-500">
                {users.length} REGISTERED
              </span>
            </div>

            <input
              type="text"
              placeholder="Search User ID / Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
            />

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400/80 shadow-[0_0_15px_rgba(0,242,254,0.15)] text-white'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-code font-bold text-xs">{u.username}</span>
                        {u.role === 'admin' && (
                          <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono-code text-slate-500 block">{u.id}</span>
                    </div>

                    <div className="text-right">
                      {u.hasCustomPricing ? (
                        <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          CUSTOM
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono-code px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Editor & Live Comparison (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-6 relative overflow-hidden">
            {/* Top Header of Editor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code text-slate-400">CONFIGURING PRICING FOR:</span>
                  <span className="font-display font-extrabold text-lg text-white">
                    {selectedUserObj?.username || selectedUserId}
                  </span>
                  <span className="text-xs font-mono-code text-cyan-400">({selectedUserId})</span>
                </div>
                <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                  Clearance Level {selectedUserObj?.clearanceLevel || 3} • Region: {selectedUserObj?.nodeRegion || 'Asia-SE'}
                </p>
              </div>

              <div>
                {customPricing ? (
                  <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono-code font-bold text-cyan-300">
                      CUSTOM OVERRIDE ACTIVE
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-xs font-mono-code text-slate-400">
                      GLOBAL DEFAULT CATALOGUE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notification alert */}
            {message && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono-code flex items-center gap-2.5 ${
                  message.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}
              >
                {message.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* 4 Pricing Plan Input Fields */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 15 Days Runtime */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      15 DAYS RUNTIME
                    </label>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      Default: ₹120
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-mono-code">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={p15}
                      onChange={(e) => setP15(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                    />
                  </div>
                </div>

                {/* 20 Days Runtime */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      20 DAYS RUNTIME
                    </label>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      Default: ₹135
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-mono-code">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={p20}
                      onChange={(e) => setP20(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                    />
                  </div>
                </div>

                {/* 30 Days Runtime */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      30 DAYS RUNTIME
                    </label>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      Default: ₹150
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-mono-code">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={p30}
                      onChange={(e) => setP30(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                    />
                  </div>
                </div>

                {/* Permanent Runtime */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      PERMANENT RUNTIME
                    </label>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      Default: ₹200
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-mono-code">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pPerm}
                      onChange={(e) => setPPerm(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: SAVE PRICING & RESET TO DEFAULT */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                {customPricing && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    disabled={saving || loading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET TO DEFAULT</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Check className="w-4 h-4 text-slate-950" />
                  )}
                  <span>SAVE PRICING FOR {selectedUserObj?.username || selectedUserId}</span>
                </button>
              </div>
            </form>

            {/* Live Visual Simulation Preview */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
              <span className="text-[11px] font-mono-code font-bold text-slate-400 tracking-wider block">
                PORTAL PREVIEW — WHAT {selectedUserObj?.username || selectedUserId} WILL SEE IN MODAL:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono-code text-slate-400 block">15 DAYS</span>
                  <span className="font-display font-bold text-sm text-cyan-300">₹{p15}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono-code text-slate-400 block">20 DAYS</span>
                  <span className="font-display font-bold text-sm text-cyan-300">₹{p20}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono-code text-slate-400 block">30 DAYS</span>
                  <span className="font-display font-bold text-sm text-cyan-300">₹{p30}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono-code text-slate-400 block">PERMANENT</span>
                  <span className="font-display font-bold text-sm text-amber-300">₹{pPerm}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
