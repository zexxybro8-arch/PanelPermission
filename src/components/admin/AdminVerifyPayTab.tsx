import React, { useState, useEffect } from 'react';
import { 
  DollarSign, User, ShieldAlert, Check, RefreshCw, 
  RotateCcw, Sparkles, AlertCircle, ArrowRight, Tag,
  Search, Edit3, X, Sliders, ChevronDown, Shield, Boxes, Trash2
} from 'lucide-react';
import { SystemSettingsData, Customer, UserVerificationFee } from '../../types';
import { apiClient } from '../../services/apiClient';
import { appStore } from '../../store/appStore';

interface AdminVerifyPayTabProps {
  settings: SystemSettingsData | null;
  onUpdateSettings: (newSettings: SystemSettingsData) => void;
}

export const AdminVerifyPayTab: React.FC<AdminVerifyPayTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [loading, setLoading] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global Fee state
  const [globalFeeInput, setGlobalFeeInput] = useState<number>(settings?.globalVerificationFee ?? 150);

  // Customer selections & search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customFeeInput, setCustomFeeInput] = useState<string>('150');
  const [customFeeEnabled, setCustomFeeEnabled] = useState<boolean>(true);
  const [userOverrides, setUserOverrides] = useState<UserVerificationFee[]>([]);
  const [overrideSearch, setOverrideSearch] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Dropdown states
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  useEffect(() => {
    if (settings && settings.globalVerificationFee !== undefined) {
      setGlobalFeeInput(settings.globalVerificationFee);
    }
  }, [settings]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const custRes = await apiClient.getCustomers();
      setCustomers(custRes.customers || []);
      
      if (custRes.customers && custRes.customers.length > 0) {
        setSelectedCustomerId(custRes.customers[0].id);
      }

      // Sync active overrides list from store state
      syncOverridesList();
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncOverridesList = () => {
    const rawOverrides = appStore.state.userVerificationFees || {};
    const list = Object.values(rawOverrides);
    setUserOverrides(list);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Also sync whenever store changes
  useEffect(() => {
    syncOverridesList();
  }, [appStore.state.userVerificationFees]);

  const handleUpdateGlobalFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalFeeInput < 0) {
      setMessage({ type: 'error', text: 'VERIFICATION FEE CANNOT BE NEGATIVE' });
      return;
    }
    setSavingGlobal(true);
    setMessage(null);
    try {
      const updated = await apiClient.updateSettings({
        globalVerificationFee: Number(globalFeeInput)
      });
      if (updated.success) {
        onUpdateSettings(updated.settings);
        setMessage({ type: 'success', text: `GLOBAL VERIFICATION FEE SUCCESSFULLY SET TO ₹${globalFeeInput}` });
      } else {
        setMessage({ type: 'error', text: updated.message || 'FAILED TO UPDATE SETTINGS' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'ERROR SAVING CONFIGURATION' });
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleSaveCustomFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setMessage({ type: 'error', text: 'PLEASE SELECT A VALID CUSTOMER ID' });
      return;
    }
    const parsedFee = Number(customFeeInput);
    if (isNaN(parsedFee) || parsedFee < 0) {
      setMessage({ type: 'error', text: 'PLEASE ENTER A VALID REASONABLE CUSTOM FEE AMOUNT' });
      return;
    }

    setSavingCustom(true);
    setMessage(null);
    try {
      const res = await apiClient.saveUserVerificationFee(
        selectedCustomerId,
        parsedFee,
        customFeeEnabled
      );
      if (res.success) {
        setMessage({ type: 'success', text: `SUCCESSFULLY SAVED CUSTOM FEE FOR ${res.fee.username}` });
        syncOverridesList();
        // Clear override input
        setCustomFeeInput('150');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'ERROR SAVING INDIVIDUAL FEE OVERRIDE' });
    } finally {
      setSavingCustom(false);
    }
  };

  const handleRemoveOverride = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this custom override fee and return the user to the Global default fee?')) return;
    try {
      const res = await apiClient.resetUserVerificationFee(userId);
      if (res.success) {
        setMessage({ type: 'success', text: 'REMOVED CUSTOM OVERRIDE FEE SUCCESSFULLY' });
        syncOverridesList();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'ERROR REMOVING OVERRIDE' });
    }
  };

  const handleEditOverride = (override: UserVerificationFee) => {
    setSelectedCustomerId(override.userId);
    setCustomFeeInput(String(override.customFee));
    setCustomFeeEnabled(override.enabled);
    setMessage({ type: 'success', text: `EDITING OVERRIDE FOR ${override.username}` });
  };

  // Filtering
  const filteredCustomers = customers.filter(c => 
    c.username.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredOverrides = userOverrides.filter(o => 
    o.username.toLowerCase().includes(overrideSearch.toLowerCase()) ||
    o.userId.toLowerCase().includes(overrideSearch.toLowerCase())
  );

  const selectedCustObj = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-slate-950/60 border border-cyan-500/10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 p-8 text-cyan-500/5 select-none pointer-events-none">
          <DollarSign className="w-40 h-40" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono-code text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> VERIFYING ENGINES CONTROLLER
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider uppercase">
              VERIFY PAY
            </h1>
            <p className="text-xs text-slate-400 font-mono-code max-w-2xl leading-relaxed">
              Configure system-wide gatekeeping verification transaction charges and individual override structures. This page allows real-time adjustments of fees globally and on a granular, per-user basis.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchInitialData}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-mono-code text-slate-300 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>RE-SYNC FEES</span>
          </button>
        </div>
      </div>

      {/* Message feedback box */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
          message.type === 'success' 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs font-mono-code leading-relaxed">
            <span className="font-bold uppercase tracking-wider block mb-1">
              {message.type === 'success' ? 'SYSTEM ACTION CONFIRMED' : 'GATEWAY EXCEPTION RECORDED'}
            </span>
            {message.text}
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Global config and Add/Edit override */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Global verification fee form */}
          <form onSubmit={handleUpdateGlobalFee} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-white tracking-wider uppercase">
                  GLOBAL VERIFICATION FEE
                </h3>
                <span className="text-[10px] font-mono-code text-slate-500 block">STANDARD CHARGES FOR ALL GENERAL USERS</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono-code text-slate-400 tracking-wider block">
                FEE AMOUNT (₹ INR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  value={globalFeeInput}
                  onChange={(e) => setGlobalFeeInput(parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/50 text-white text-xs font-mono-code transition-colors outline-none"
                  placeholder="e.g. 150"
                />
              </div>
              <p className="text-[9px] font-mono-code text-slate-500 leading-normal">
                This verification fee will be shown instantly on the user's dashboard when "VERIFY ACCESS" popup is initialized, unless they have a customized override rule below.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingGlobal}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingGlobal ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <Check className="w-4 h-4" />}
              <span>UPDATE GLOBAL FEE</span>
            </button>
          </form>

          {/* Section 2: Create/Edit individual override form */}
          <form onSubmit={handleSaveCustomFee} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-white tracking-wider uppercase">
                  INDIVIDUAL USER OVERRIDES
                </h3>
                <span className="text-[10px] font-mono-code text-slate-500 block">CREATE OR EDIT SPECIAL RATES FOR USERS</span>
              </div>
            </div>

            {/* Custom search customer selector */}
            <div className="space-y-2 relative">
              <label className="text-[10px] font-mono-code text-slate-400 tracking-wider block">
                SELECT CUSTOMER PROFILE
              </label>
              
              <div 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono-code text-white cursor-pointer hover:border-slate-700 transition-colors"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
              >
                <span>
                  {selectedCustObj 
                    ? `[${selectedCustObj.customer_id}] ${selectedCustObj.username}` 
                    : 'SELECT AN ACTIVE CUSTOMER'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              {isCustomerDropdownOpen && (
                <div className="absolute z-10 w-full top-full mt-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-2.5 space-y-2 max-h-60 overflow-y-auto">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono-code text-white focus:outline-none focus:border-cyan-500/50"
                      placeholder="Search username or CUST-ID..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="space-y-1">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          className={`px-3 py-2 rounded-lg text-xs font-mono-code cursor-pointer transition-colors ${
                            selectedCustomerId === cust.id 
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                              : 'text-slate-300 hover:bg-slate-900'
                          }`}
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setIsCustomerDropdownOpen(false);
                          }}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{cust.username}</span>
                            <span className="text-[9px] text-slate-500">{cust.customer_id}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Display: {cust.display_name || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-500 py-3 text-center">NO MATCHING CUSTOMERS FOUND</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono-code text-slate-400 tracking-wider block">
                CUSTOM FEE AMOUNT (₹ INR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono-code outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="e.g. 100"
                  value={customFeeInput}
                  onChange={(e) => setCustomFeeInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <input
                type="checkbox"
                id="customFeeEnabled"
                checked={customFeeEnabled}
                onChange={(e) => setCustomFeeEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 border-slate-800 rounded bg-slate-900 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <label htmlFor="customFeeEnabled" className="text-[10px] font-mono-code text-slate-300 cursor-pointer select-none">
                ENABLE INDIVIDUAL CUSTOM FEE OVERRIDE RULE
              </label>
            </div>

            <button
              type="submit"
              disabled={savingCustom || !selectedCustomerId}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingCustom ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Check className="w-4 h-4" />}
              <span>SAVE OVERRIDE FEE</span>
            </button>
          </form>
        </div>

        {/* Right column: Overrides management list table */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white tracking-wider uppercase">
                ACTIVE VERIFICATION FEE OVERRIDES
              </h3>
              <span className="text-[10px] font-mono-code text-slate-500 block">
                CURRENT CUSTOM RULES PERSISTED IN SECURE DATABASE
              </span>
            </div>

            {/* List Search */}
            <div className="relative max-w-xs shrink-0 self-start sm:self-center">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code text-slate-300 focus:outline-none focus:border-cyan-500/50"
                placeholder="Search active overrides..."
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">CUSTOMER USERNAME</th>
                  <th className="py-2.5 px-3">USER ID</th>
                  <th className="py-2.5 px-3">CUSTOM FEE</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredOverrides.length > 0 ? (
                  filteredOverrides.map((override) => (
                    <tr key={override.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{override.username}</td>
                      <td className="py-3 px-3 text-slate-400">{override.userId}</td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-cyan-300">₹{override.customFee}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          override.enabled 
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}>
                          {override.enabled ? 'ACTIVE OVERRIDE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditOverride(override)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 transition-all cursor-pointer"
                          title="Edit Custom Fee"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(override.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
                          title="Remove Custom Fee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      NO CUSTOM VERIFICATION FEE OVERRIDES REGISTERED IN THE DATABASE
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
