import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Check, AlertCircle, Edit3, X, 
  ChevronDown, RefreshCw, UserCheck, Shield, Sparkles, Layers, Boxes, Plus, Trash2, User, RotateCcw, Tag
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { CyberModule, Customer, AdminRuntimePlan, AdminUser, UserCustomPricing, PanelDurationPricing } from '../../types';
import { extractErrorMessage } from '../../utils/errorMessage';
import { appStore } from '../../store/appStore';
import { AdminPanelPricingModal } from './AdminPanelPricingModal';

interface AdminUserPricingTabProps {
  users: AdminUser[];
  onPricingUpdated?: () => void;
}

type SubTab = 'panel' | 'customer' | 'operator';

export const AdminUserPricingTab: React.FC<AdminUserPricingTabProps> = ({
  users,
  onPricingUpdated,
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('panel');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Pricing Collections
  const [modules, setModules] = useState<CyberModule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [globalPlans, setGlobalPlans] = useState<AdminRuntimePlan[]>([]);

  // Search States
  const [panelSearch, setPanelSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // ----------------------------------------------------
  // SUB-TAB 1: PANEL PRICING MODAL
  // ----------------------------------------------------
  const [editingPanel, setEditingPanel] = useState<CyberModule | null>(null);

  // ----------------------------------------------------
  // SUB-TAB 2: CUSTOMER CUSTOM PRICING STATES
  // ----------------------------------------------------
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [custDurationOverrides, setCustDurationOverrides] = useState<Record<string, string>>({});

  // ----------------------------------------------------
  // SUB-TAB 3: ORIGINAL OPERATOR PRICING STATES
  // ----------------------------------------------------
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(users[0]?.id || '');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [opPricing, setOpPricing] = useState<UserCustomPricing | null>(null);
  const [opP15, setOpP15] = useState<number>(120);
  const [opP20, setOpP20] = useState<number>(135);
  const [opP30, setOpP30] = useState<number>(150);
  const [opPPerm, setOpPPerm] = useState<number>(200);

  // Initialize and Fetch necessary data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [custRes, plansRes] = await Promise.all([
        apiClient.getCustomers(),
        apiClient.getRuntimePlans(),
      ]);
      setCustomers(custRes.customers || []);
      setModules(custRes.modules || []);
      setGlobalPlans(plansRes || []);

      if (custRes.customers && custRes.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custRes.customers[0].id);
      }
      if (custRes.modules && custRes.modules.length > 0 && !selectedPanelId) {
        setSelectedPanelId(custRes.modules[0].id);
      }
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync Operator pricing details when selected operator changes
  const loadOperatorPricing = async (userId: string) => {
    if (!userId) return;
    try {
      const pricingData = await apiClient.getUserPricingDetails(userId);
      setOpPricing(pricingData.customPricing);

      const default15 = globalPlans.find((p) => p.id === 'plan-15')?.defaultPrice || 120;
      const default20 = globalPlans.find((p) => p.id === 'plan-20')?.defaultPrice || 135;
      const default30 = globalPlans.find((p) => p.id === 'plan-30')?.defaultPrice || 150;
      const defaultPerm = globalPlans.find((p) => p.id === 'plan-perm')?.defaultPrice || 200;

      if (pricingData.customPricing) {
        setOpP15(pricingData.customPricing.plan15Price);
        setOpP20(pricingData.customPricing.plan20Price);
        setOpP30(pricingData.customPricing.plan30Price);
        setOpPPerm(pricingData.customPricing.planPermPrice);
      } else {
        setOpP15(default15);
        setOpP20(default20);
        setOpP30(default30);
        setOpPPerm(defaultPerm);
      }
    } catch (err) {
      console.warn('Failed to load operator pricing:', err);
    }
  };

  useEffect(() => {
    if (selectedOperatorId && activeSubTab === 'operator') {
      loadOperatorPricing(selectedOperatorId);
    }
  }, [selectedOperatorId, activeSubTab, globalPlans]);

  // Sync Customer override fields when selected customer or panel changes
  useEffect(() => {
    if (selectedCustomerId && selectedPanelId) {
      const savedOverrides = appStore.state.customerPricing?.[selectedCustomerId]?.[selectedPanelId];
      const newInputs: Record<string, string> = {};
      if (savedOverrides) {
        if (savedOverrides.durations) {
          Object.keys(savedOverrides.durations).forEach((key) => {
            const val = savedOverrides.durations?.[key];
            if (val !== undefined && val !== null) {
              newInputs[key] = String(val);
            }
          });
        }
        // Legacy keys
        if (savedOverrides['15Days']) newInputs['dur_15'] = String(savedOverrides['15Days']);
        if (savedOverrides['20Days']) newInputs['dur_20'] = String(savedOverrides['20Days']);
        if (savedOverrides['30Days']) newInputs['dur_30'] = String(savedOverrides['30Days']);
        if (savedOverrides['permanent']) newInputs['dur_perm'] = String(savedOverrides['permanent']);
      }
      setCustDurationOverrides(newInputs);
    }
  }, [selectedCustomerId, selectedPanelId]);

  // Get active panel durations
  const activePanelPricing = selectedPanelId ? appStore.getPanelPricing(selectedPanelId) : null;
  const activePanelDurations: PanelDurationPricing[] = activePanelPricing?.durations || [];

  // Handle Saving Customer-Specific Overrides
  const handleSaveCustomerPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPanelId) return;
    setSaving(true);
    setMessage(null);
    try {
      const currentOverrides = appStore.state.customerPricing?.[selectedCustomerId] || {};
      const durationRecord: Record<string, number> = {};

      activePanelDurations.forEach((d) => {
        const inputVal = custDurationOverrides[d.id];
        if (inputVal !== undefined && inputVal.trim() !== '') {
          const num = Number(inputVal);
          if (!isNaN(num) && num > 0) {
            durationRecord[d.id] = num;
            if (d.durationType === 'PERMANENT') {
              durationRecord['permanent'] = num;
            } else if (d.durationDays) {
              durationRecord[`dur_${d.durationDays}`] = num;
              durationRecord[`${d.durationDays}Days`] = num;
            }
          }
        }
      });

      const updatedOverrides = {
        ...currentOverrides,
        [selectedPanelId]: {
          durations: durationRecord,
          '15Days': durationRecord['dur_15'] || durationRecord['15Days'] || null,
          '20Days': durationRecord['dur_20'] || durationRecord['20Days'] || null,
          '30Days': durationRecord['dur_30'] || durationRecord['30Days'] || null,
          'permanent': durationRecord['dur_perm'] || durationRecord['permanent'] || null,
        },
      };

      await apiClient.saveCustomerPricing(selectedCustomerId, updatedOverrides);
      setMessage({ type: 'success', text: 'Customer-specific panel price overrides configured successfully!' });
      await loadAllData();
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to configure customer overrides') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetCustomerPricing = async () => {
    if (!selectedCustomerId || !selectedPanelId) return;
    setSaving(true);
    setMessage(null);
    try {
      const currentOverrides = appStore.state.customerPricing?.[selectedCustomerId] || {};
      const updatedOverrides = { ...currentOverrides };
      delete updatedOverrides[selectedPanelId];

      await apiClient.saveCustomerPricing(selectedCustomerId, updatedOverrides);
      setCustDurationOverrides({});
      setMessage({ type: 'success', text: 'Overrides cleared. Restored back to panel pricing.' });
      await loadAllData();
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to clear customer overrides') });
    } finally {
      setSaving(false);
    }
  };

  // Handle Saving Operator (Individual AdminUser) Pricing
  const handleSaveOperatorPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperatorId) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiClient.saveCustomPricing(selectedOperatorId, {
        plan15Price: Number(opP15),
        plan20Price: Number(opP20),
        plan30Price: Number(opP30),
        planPermPrice: Number(opPPerm),
      });
      setOpPricing(updated.pricing);
      setMessage({ type: 'success', text: `Saved custom rates for operator ${selectedOperatorId}!` });
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to save operator rates') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetOperatorPricing = async () => {
    if (!selectedOperatorId) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.resetCustomPricing(selectedOperatorId);
      setOpPricing(null);

      const default15 = globalPlans.find((p) => p.id === 'plan-15')?.defaultPrice || 120;
      const default20 = globalPlans.find((p) => p.id === 'plan-20')?.defaultPrice || 135;
      const default30 = globalPlans.find((p) => p.id === 'plan-30')?.defaultPrice || 150;
      const defaultPerm = globalPlans.find((p) => p.id === 'plan-perm')?.defaultPrice || 200;

      setOpP15(default15);
      setOpP20(default20);
      setOpP30(default30);
      setOpPPerm(defaultPerm);

      setMessage({ type: 'success', text: `Restored operator ${selectedOperatorId} pricing to global default catalog.` });
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to reset operator pricing') });
    } finally {
      setSaving(false);
    }
  };

  // Filtering Lists
  const filteredPanels = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(panelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(panelSearch.toLowerCase())
  );

  const filteredOperators = users.filter(
    (u) =>
      u.username.toLowerCase().includes(operatorSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Pricing Engine */}
      <div className="p-5 rounded-2xl bg-violet-950/20 border border-violet-500/30 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-400/50 flex items-center justify-center text-violet-300 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base text-white tracking-wider">
                PRICING MANAGEMENT CONSOLE
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono-code font-bold bg-violet-950 text-violet-300 border border-violet-500/50">
                CUSTOM DURATION SCHEMES
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-300 mt-0.5">
              Control flexible duration packages per panel (add custom days, edit rates, toggle permanent access) and configure custom rates for individual customers.
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-800 p-1 bg-slate-950 rounded-xl max-w-md">
        <button
          onClick={() => { setActiveSubTab('panel'); setMessage(null); }}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-mono-code font-bold cursor-pointer transition-all ${
            activeSubTab === 'panel'
              ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          PANEL PRICING
        </button>
        <button
          onClick={() => { setActiveSubTab('customer'); setMessage(null); }}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-mono-code font-bold cursor-pointer transition-all ${
            activeSubTab === 'customer'
              ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          CUSTOMER CUSTOM
        </button>
        <button
          onClick={() => { setActiveSubTab('operator'); setMessage(null); }}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-mono-code font-bold cursor-pointer transition-all ${
            activeSubTab === 'operator'
              ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          OPERATOR SPECIFIC
        </button>
      </div>

      {/* Action/Notification feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono-code flex items-center gap-2.5 ${
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

      {/* ======================================================== */}
      {/* SUB-TAB 1: PANEL PRICING DIRECTORY                       */}
      {/* ======================================================== */}
      {activeSubTab === 'panel' && (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-wider uppercase">
                GLOBAL MODULE PRICING DIRECTORY
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Configure customized durations and prices for each individual panel independently.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Filter by panel name..."
                value={panelSearch}
                onChange={(e) => setPanelSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-850 rounded-2xl">
            <table className="w-full text-left font-mono-code text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-850 text-slate-400">
                <tr>
                  <th className="p-4">Panel Node</th>
                  <th className="p-4">Configured Durations & Rates</th>
                  <th className="p-4 text-center">Permanent Access</th>
                  <th className="p-4 text-center">Active Packages</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredPanels.map((mod) => {
                  const pricing = appStore.getPanelPricing(mod.id);
                  const durations = (pricing.durations || []).filter((d) => d.enabled !== false);
                  const permDuration = (pricing.durations || []).find((d) => d.durationType === 'PERMANENT' && d.enabled !== false);

                  return (
                    <tr key={mod.id} className="hover:bg-slate-900/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block text-xs">{mod.name}</span>
                            <span className="text-[10px] text-slate-500">{mod.id} • Base: ₹{mod.price || 120}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {durations.length === 0 ? (
                            <span className="text-slate-500 text-[10px] italic">No active durations configured</span>
                          ) : (
                            durations.map((d) => (
                              <span
                                key={d.id}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                                  d.durationType === 'PERMANENT'
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                    : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                                }`}
                              >
                                {d.label || (d.durationType === 'PERMANENT' ? 'Permanent' : `${d.durationDays} Days`)}: ₹{d.price}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {permDuration ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            AVAILABLE (₹{permDuration.price})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 border border-slate-800 text-slate-500">
                            DISABLED
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                          {durations.length} {durations.length === 1 ? 'PACKAGE' : 'PACKAGES'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => setEditingPanel(mod)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-violet-950/60 border border-slate-800 hover:border-violet-500/50 text-[10px] text-violet-300 hover:text-white font-bold flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>CONFIGURE</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredPanels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No modules/panels matching search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: CUSTOMER CUSTOM PRICING                       */}
      {/* ======================================================== */}
      {activeSubTab === 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form (Left Column) */}
          <form onSubmit={handleSaveCustomerPricing} className="lg:col-span-7 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-wider uppercase">
                CUSTOMER-SPECIFIC RATE MATRIX
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Establish custom rates for individual customers for the selected panel's configured duration packages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Customer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono-code text-slate-400 uppercase block">
                  1. SELECT CUSTOMER ID
                </label>
                <div className="relative">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code text-white appearance-none outline-none focus:border-violet-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_id} ({c.username})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Select Panel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono-code text-slate-400 uppercase block">
                  2. SELECT TARGET PANEL
                </label>
                <div className="relative">
                  <select
                    value={selectedPanelId}
                    onChange={(e) => setSelectedPanelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code text-white appearance-none outline-none focus:border-violet-500"
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-850 pt-4 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold font-mono-code text-slate-400 uppercase tracking-wider block">
                  3. EDIT CUSTOM DURATION OVERRIDES (Blank implies Panel Default Price)
                </span>
                <span className="text-[9px] text-slate-500 font-mono-code">
                  {activePanelDurations.length} duration packages configured
                </span>
              </div>

              {activePanelDurations.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs font-mono-code">
                  This panel does not have any active duration packages configured yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePanelDurations.map((d) => {
                    const currentVal = custDurationOverrides[d.id] || '';
                    const isCustom = currentVal.trim() !== '';

                    return (
                      <div key={d.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono-code text-slate-400 font-bold">
                            {d.label || (d.durationType === 'PERMANENT' ? 'Permanent' : `${d.durationDays} Days`)}
                          </span>
                          {isCustom ? (
                            <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded font-bold">
                              CUSTOM
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 text-slate-500 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            value={currentVal}
                            placeholder={String(d.price)}
                            onChange={(e) =>
                              setCustDurationOverrides({
                                ...custDurationOverrides,
                                [d.id]: e.target.value,
                              })
                            }
                            className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={handleResetCustomerPricing}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-code text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition-transform"
              >
                CLEAR ALL OVERRIDES
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 text-slate-950 font-display font-bold text-xs tracking-wider cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Check className="w-4 h-4 text-slate-950" />
                )}
                <span>SAVE CUSTOM PRICING</span>
              </button>
            </div>
          </form>

          {/* Directory Summary / Overridden customers (Right Column) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-wider uppercase">
                ACTIVE CUSTOMER MAP
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Customers that currently have custom overrides defined for active panels.
              </p>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {customers.map((cust) => {
                const overrides = appStore.state.customerPricing?.[cust.id] || {};
                const keys = Object.keys(overrides);
                const activeOverridesCount = keys.length;

                if (activeOverridesCount === 0) return null;

                return (
                  <div key={cust.id} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono-code font-bold text-xs text-white block">{cust.customer_id}</span>
                        <span className="text-[10px] text-slate-500 font-mono-code">{cust.username}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono-code bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                        {activeOverridesCount} {activeOverridesCount === 1 ? 'OVERRIDE' : 'OVERRIDES'} ACTIVE
                      </span>
                    </div>

                    <div className="text-[10px] font-mono-code text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                      {keys.map((k) => {
                        const panel = modules.find((m) => m.id === k);
                        if (!panel) return null;
                        return (
                          <div key={k} className="flex justify-between">
                            <span className="text-violet-300 truncate max-w-[150px] font-bold">{panel.name}:</span>
                            <span className="text-emerald-400 font-bold">Custom Rates Active</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: OPERATOR SPECIFIC PRICING                     */}
      {/* ======================================================== */}
      {activeSubTab === 'operator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Operator Directory (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  SELECT OPERATOR
                </span>
                <span className="text-[10px] font-mono-code text-slate-500">
                  {users.length} REGISTERED
                </span>
              </div>

              <input
                type="text"
                placeholder="Search Operator ID..."
                value={operatorSearch}
                onChange={(e) => setOperatorSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code text-white placeholder:text-slate-500 focus:border-violet-500 outline-none"
              />

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredOperators.map((u) => {
                  const isSelected = u.id === selectedOperatorId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedOperatorId(u.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-violet-950/60 border-violet-500/80 shadow-[0_0_15px_rgba(139,92,246,0.15)] text-white'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-code font-bold text-xs">{u.username}</span>
                          {u.role === 'admin' && (
                            <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-violet-950 text-violet-300 border border-violet-500/30">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono-code text-slate-500 block">{u.id}</span>
                      </div>

                      <div className="text-right">
                        {u.hasCustomPricing ? (
                          <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/40">
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

          {/* Right Column: Operator pricing inputs */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code text-slate-400">CONFIGURING PRICING FOR:</span>
                    <span className="font-display font-extrabold text-lg text-white">
                      {users.find((u) => u.id === selectedOperatorId)?.username || selectedOperatorId || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                    Clearance Level {users.find((u) => u.id === selectedOperatorId)?.clearanceLevel || 3}
                  </p>
                </div>

                <div>
                  {opPricing ? (
                    <div className="px-3 py-1 rounded-xl bg-violet-950/80 border border-violet-500/50 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-xs font-mono-code font-bold text-violet-300">
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

              <form onSubmit={handleSaveOperatorPricing} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 15 Days Runtime */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-violet-400" />
                        15 DAYS RUNTIME
                      </label>
                      <span className="text-[10px] font-mono-code text-slate-400">Default: ₹120</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono-code">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={opP15}
                        onChange={(e) => setOpP15(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 20 Days Runtime */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-violet-400" />
                        20 DAYS RUNTIME
                      </label>
                      <span className="text-[10px] font-mono-code text-slate-400">Default: ₹135</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono-code">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={opP20}
                        onChange={(e) => setOpP20(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 30 Days Runtime */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-violet-400" />
                        30 DAYS RUNTIME
                      </label>
                      <span className="text-[10px] font-mono-code text-slate-400">Default: ₹150</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono-code">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={opP30}
                        onChange={(e) => setOpP30(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Permanent Runtime */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        PERMANENT RUNTIME
                      </label>
                      <span className="text-[10px] font-mono-code text-slate-400">Default: ₹200</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono-code">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={opPPerm}
                        onChange={(e) => setOpPPerm(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-code font-bold text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  {opPricing && (
                    <button
                      type="button"
                      onClick={handleResetOperatorPricing}
                      disabled={saving}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>RESET TO DEFAULT</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Check className="w-4 h-4 text-slate-950" />
                    )}
                    <span>SAVE PRICING FOR {users.find((u) => u.id === selectedOperatorId)?.username || selectedOperatorId}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Pricing Modal */}
      {editingPanel && (
        <AdminPanelPricingModal
          panel={editingPanel}
          onClose={() => setEditingPanel(null)}
          onSaved={() => {
            setEditingPanel(null);
            loadAllData();
            if (onPricingUpdated) onPricingUpdated();
          }}
        />
      )}
    </div>
  );
};
