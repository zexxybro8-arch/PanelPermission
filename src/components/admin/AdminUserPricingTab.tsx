import React, { useState, useEffect } from 'react';
import { 
  DollarSign, User, ShieldAlert, Check, RefreshCw, 
  RotateCcw, Sparkles, AlertCircle, ArrowRight, Tag,
  Search, Edit3, X, Sliders, ChevronDown, Shield, Boxes
} from 'lucide-react';
import { AdminUser, UserCustomPricing, AdminRuntimePlan, Customer, CyberModule, PanelPricing, CustomerPricing } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';
import { appStore } from '../../store/appStore';

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
  // SUB-TAB 1: PANEL DEFAULT PRICING STATES
  // ----------------------------------------------------
  const [editingPanel, setEditingPanel] = useState<CyberModule | null>(null);
  const [panelP15, setPanelP15] = useState<number>(120);
  const [panelP20, setPanelP20] = useState<number>(138);
  const [panelP30, setPanelP30] = useState<number>(150);
  const [panelPPerm, setPanelPPerm] = useState<number>(216);

  // ----------------------------------------------------
  // SUB-TAB 2: CUSTOMER CUSTOM PRICING STATES
  // ----------------------------------------------------
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  
  // Custom inputs (empty string means default/null)
  const [custP15, setCustP15] = useState<string>('');
  const [custP20, setCustP20] = useState<string>('');
  const [custP30, setCustP30] = useState<string>('');
  const [custPPerm, setCustPPerm] = useState<string>('');

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
      if (savedOverrides) {
        setCustP15(savedOverrides['15Days'] !== undefined && savedOverrides['15Days'] !== null ? String(savedOverrides['15Days']) : '');
        setCustP20(savedOverrides['20Days'] !== undefined && savedOverrides['20Days'] !== null ? String(savedOverrides['20Days']) : '');
        setCustP30(savedOverrides['30Days'] !== undefined && savedOverrides['30Days'] !== null ? String(savedOverrides['30Days']) : '');
        setCustPPerm(savedOverrides['permanent'] !== undefined && savedOverrides['permanent'] !== null ? String(savedOverrides['permanent']) : '');
      } else {
        setCustP15('');
        setCustP20('');
        setCustP30('');
        setCustPPerm('');
      }
    }
  }, [selectedCustomerId, selectedPanelId]);

  // Handle Editing Panel Pricing Modal opening
  const handleStartEditPanel = (mod: CyberModule) => {
    setEditingPanel(mod);
    const saved = appStore.state.panelPricing?.[mod.id];
    const base = mod.price || 120;
    if (saved) {
      setPanelP15(saved['15Days'] || base);
      setPanelP20(saved['20Days'] || Math.round(base * 1.15));
      setPanelP30(saved['30Days'] || Math.round(base * 1.25));
      setPanelPPerm(saved['permanent'] || Math.round(base * 1.8));
    } else {
      setPanelP15(base);
      setPanelP20(Math.round(base * 1.15));
      setPanelP30(Math.round(base * 1.25));
      setPanelPPerm(Math.round(base * 1.8));
    }
  };

  const handleSavePanelPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPanel) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.savePanelPricing(editingPanel.id, {
        '15Days': Number(panelP15),
        '20Days': Number(panelP20),
        '30Days': Number(panelP30),
        'permanent': Number(panelPPerm),
      });
      setMessage({ type: 'success', text: `Saved pricing template for panel ${editingPanel.name} successfully!` });
      setEditingPanel(null);
      await loadAllData();
      if (onPricingUpdated) onPricingUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to save panel default pricing') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPanelToDefault = () => {
    if (!editingPanel) return;
    const base = editingPanel.price || 120;
    setPanelP15(base);
    setPanelP20(Math.round(base * 1.15));
    setPanelP30(Math.round(base * 1.25));
    setPanelPPerm(Math.round(base * 1.8));
  };

  // Handle Saving Customer-Specific Overrides
  const handleSaveCustomerPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPanelId) return;
    setSaving(true);
    setMessage(null);
    try {
      const currentOverrides = appStore.state.customerPricing?.[selectedCustomerId] || {};
      const updatedOverrides = {
        ...currentOverrides,
        [selectedPanelId]: {
          '15Days': custP15 !== '' ? Number(custP15) : null,
          '20Days': custP20 !== '' ? Number(custP20) : null,
          '30Days': custP30 !== '' ? Number(custP30) : null,
          'permanent': custPPerm !== '' ? Number(custPPerm) : null,
        }
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
      setCustP15('');
      setCustP20('');
      setCustP30('');
      setCustPPerm('');
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
  const filteredPanels = modules.filter(m => 
    m.name.toLowerCase().includes(panelSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(panelSearch.toLowerCase())
  );

  const filteredOperators = users.filter(u =>
    u.username.toLowerCase().includes(operatorSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  // Selected details resolver
  const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId);
  const selectedPanelObj = modules.find(m => m.id === selectedPanelId);

  // Resolve defaults for placeholders in customer tab
  const getPanelBaseAndDefaults = (pId: string) => {
    const mod = modules.find(m => m.id === pId);
    if (!mod) return { base: 120, d15: 120, d20: 138, d30: 150, dPerm: 216 };
    const base = mod.price || 120;
    const globalPricing = appStore.state.panelPricing?.[mod.id] || {};
    return {
      base,
      d15: globalPricing['15Days'] || base,
      d20: globalPricing['20Days'] || Math.round(base * 1.15),
      d30: globalPricing['30Days'] || Math.round(base * 1.25),
      dPerm: globalPricing['permanent'] || Math.round(base * 1.8),
    };
  };

  const currentDefaults = getPanelBaseAndDefaults(selectedPanelId);

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
                SYSTEM TIER-5 OVERRIDES
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-300 mt-0.5">
              Configure baseline pricing per panel/module, customized rates for specific customers, or operator rates. High priority rule: Custom Customer Overrides &gt; Panel Default Pricing &gt; Base Scale.
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
      {/* SUB-TAB 1: PANEL PRICING TABLE                           */}
      {/* ======================================================== */}
      {activeSubTab === 'panel' && (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-wider uppercase">
                GLOBAL MODULE PRICING DIRECTORY
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Configure standard price templates for all runtime access durations of active panels.
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
                  <th className="p-4 text-right">15 Days</th>
                  <th className="p-4 text-right">20 Days</th>
                  <th className="p-4 text-right">30 Days</th>
                  <th className="p-4 text-right">Permanent</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredPanels.map((mod) => {
                  const pricing = appStore.state.panelPricing?.[mod.id];
                  const hasCustom = !!pricing;
                  
                  const base = mod.price || 120;
                  const v15 = pricing?.['15Days'] || base;
                  const v20 = pricing?.['20Days'] || Math.round(base * 1.15);
                  const v30 = pricing?.['30Days'] || Math.round(base * 1.25);
                  const vPerm = pricing?.['permanent'] || Math.round(base * 1.8);

                  return (
                    <tr key={mod.id} className="hover:bg-slate-900/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block text-xs">{mod.name}</span>
                            <span className="text-[10px] text-slate-500">{mod.id} • Base: ₹{base}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-violet-300">₹{v15}</td>
                      <td className="p-4 text-right font-bold text-violet-300">₹{v20}</td>
                      <td className="p-4 text-right font-bold text-violet-300">₹{v30}</td>
                      <td className="p-4 text-right font-bold text-amber-300">₹{vPerm}</td>
                      <td className="p-4 text-center">
                        {hasCustom ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 border border-violet-500/30 text-violet-300">
                            CUSTOM
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-800 text-slate-500">
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleStartEditPanel(mod)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-violet-400 hover:text-violet-300 font-bold flex items-center justify-center gap-1.5 mx-auto transition-transform"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredPanels.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
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
                Establish custom price points for individual customers. These prices will supersede global default templates during payment checkout.
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
                    {customers.map(c => (
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
                    {modules.map(m => (
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
                  3. EDIT OVERRIDE VALUE (Blank implies Global Panel Price)
                </span>
                <span className="text-[9px] text-slate-500 font-mono-code">
                  Base Price: ₹{currentDefaults.base}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 15 Days Override */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code text-slate-400">15 DAYS PRICE</span>
                    {custP15 ? (
                      <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded">CUSTOM</span>
                    ) : (
                      <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 text-slate-500 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={custP15}
                      placeholder={String(currentDefaults.d15)}
                      onChange={(e) => setCustP15(e.target.value)}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* 20 Days Override */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code text-slate-400">20 DAYS PRICE</span>
                    {custP20 ? (
                      <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded">CUSTOM</span>
                    ) : (
                      <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 text-slate-500 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={custP20}
                      placeholder={String(currentDefaults.d20)}
                      onChange={(e) => setCustP20(e.target.value)}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* 30 Days Override */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code text-slate-400">30 DAYS PRICE</span>
                    {custP30 ? (
                      <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded">CUSTOM</span>
                    ) : (
                      <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 text-slate-500 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={custP30}
                      placeholder={String(currentDefaults.d30)}
                      onChange={(e) => setCustP30(e.target.value)}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* Permanent Override */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code text-slate-400">PERMANENT PRICE</span>
                    {custPPerm ? (
                      <span className="text-[9px] px-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded">CUSTOM</span>
                    ) : (
                      <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 text-slate-500 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={custPPerm}
                      placeholder={String(currentDefaults.dPerm)}
                      onChange={(e) => setCustPPerm(e.target.value)}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>
              </div>
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
                const activeOverridesCount = keys.filter(k => {
                  const ov = overrides[k];
                  return ov && (ov['15Days'] || ov['20Days'] || ov['30Days'] || ov['permanent']);
                }).length;

                if (activeOverridesCount === 0) return null;

                return (
                  <div key={cust.id} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono-code font-bold text-xs text-white block">{cust.customer_id}</span>
                        <span className="text-[10px] text-slate-500 font-mono-code">{cust.username}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono-code bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                        {activeOverridesCount} OVERRIDES ACTIVE
                      </span>
                    </div>

                    <div className="text-[10px] font-mono-code text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                      {keys.map(k => {
                        const ov = overrides[k];
                        const panel = modules.find(m => m.id === k);
                        if (!panel || !(ov['15Days'] || ov['20Days'] || ov['30Days'] || ov['permanent'])) return null;
                        return (
                          <div key={k} className="flex justify-between">
                            <span className="text-violet-300 truncate max-w-[150px] font-bold">{panel.name}:</span>
                            <span className="text-slate-500">
                              [
                              {ov['15Days'] ? `15d: ₹${ov['15Days']}` : ''}
                              {ov['20Days'] ? ` 20d: ₹${ov['20Days']}` : ''}
                              {ov['30Days'] ? ` 30d: ₹${ov['30Days']}` : ''}
                              {ov['permanent'] ? ` perm: ₹${ov['permanent']}` : ''}
                              ]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {customers.every(cust => {
                const overrides = appStore.state.customerPricing?.[cust.id] || {};
                return Object.keys(overrides).length === 0;
              }) && (
                <div className="text-center py-12 text-slate-500 font-mono-code text-xs">
                  No custom pricing overrides are currently active in system cache.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ORIGINAL OPERATOR SPECIFIC PRICING            */}
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
                      {users.find(u => u.id === selectedOperatorId)?.username || selectedOperatorId || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                    Clearance Level {users.find(u => u.id === selectedOperatorId)?.clearanceLevel || 3}
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
                    <span>SAVE PRICING FOR {users.find(u => u.id === selectedOperatorId)?.username || selectedOperatorId}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDITING PANEL DEFAULT PRICING DIALOG (MODAL)             */}
      {/* ======================================================== */}
      {editingPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden">
          <div className="w-full max-w-lg rounded-2xl border border-violet-500/30 bg-slate-950 p-6 space-y-4 shadow-[0_0_50px_rgba(139,92,246,0.15)] my-auto max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs text-white tracking-wider uppercase">
                    EDIT PANEL DEFAULT PRICES
                  </h3>
                  <span className="text-[10px] font-mono-code text-slate-400">
                    Panel: {editingPanel.name} ({editingPanel.id})
                  </span>
                </div>
              </div>
              <button onClick={() => setEditingPanel(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePanelPricing} className="space-y-4">
              <p className="text-xs font-mono-code text-slate-400">
                Define the standard global prices for each rental period of this panel. Leave fields filled to commit overrides to the base scale.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* 15 Days */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono-code text-slate-500 block">15 DAYS RATE (INR)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={panelP15}
                      onChange={(e) => setPanelP15(Number(e.target.value))}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* 20 Days */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono-code text-slate-500 block">20 DAYS RATE (INR)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={panelP20}
                      onChange={(e) => setPanelP20(Number(e.target.value))}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* 30 Days */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono-code text-slate-500 block">30 DAYS RATE (INR)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={panelP30}
                      onChange={(e) => setPanelP30(Number(e.target.value))}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>

                {/* Permanent */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono-code text-slate-500 block">PERMANENT RATE (INR)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={panelPPerm}
                      onChange={(e) => setPanelPPerm(Number(e.target.value))}
                      className="w-full pl-5.5 pr-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right text-xs text-violet-300 font-bold focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-850 gap-3">
                <button
                  type="button"
                  onClick={handleResetPanelToDefault}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-amber-400 font-bold"
                >
                  RESET TO MULTIPLIERS
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPanel(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4.5 py-2 rounded-lg bg-gradient-to-r from-violet-400 to-fuchsia-500 text-slate-950 font-display font-extrabold text-[10px] tracking-wider"
                  >
                    {saving ? 'SAVING...' : 'SAVE TEMPLATE'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
