import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Plus, Search, Check, AlertCircle, Edit3, Trash2, X, 
  RefreshCw, Upload, Image as ImageIcon, CheckCircle2, 
  ExternalLink, Eye, Filter, Sparkles, Layers, ShieldCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { QrConfig, CyberModule, Customer } from '../../types';
import { extractErrorMessage } from '../../utils/errorMessage';
import { cyberAudio } from '../../utils/cyberAudio';
import { appStore } from '../../store/appStore';

export const AdminQrManagementTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [configs, setConfigs] = useState<QrConfig[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modules, setModules] = useState<CyberModule[]>([]);
  
  const [activeTab, setActiveTab] = useState<'default' | 'customer'>('default');
  const [search, setSearch] = useState('');
  const [selectedPanelFilter, setSelectedPanelFilter] = useState<string>('all');
  const [selectedDurationFilter, setSelectedDurationFilter] = useState<string>('all');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<QrConfig> | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; subtitle: string; price?: number } | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchPanelId, setBatchPanelId] = useState<string>('');
  const [batchQrUrl, setBatchQrUrl] = useState<string>('https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg');

  const [storeState, setStoreState] = useState(appStore.state);

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.state });
    });
    return () => unsubscribe();
  }, []);

  const getGlobalPrice = (panelId?: string, duration?: string): number | null => {
    if (!panelId || !duration) return null;
    const globalPricing = storeState.panelPricing?.[panelId];
    if (globalPricing) {
      const price = globalPricing[duration as '15Days' | '20Days' | '30Days' | 'permanent'];
      if (typeof price === 'number' && price > 0) {
        return price;
      }
    }
    return null;
  };

  useEffect(() => {
    if (editingConfig) {
      const resolvedPrice = getGlobalPrice(editingConfig.panelId, editingConfig.duration);
      
      const existingQrForPrice = resolvedPrice !== null 
        ? configs.find(c => c.price === resolvedPrice) 
        : null;

      if (resolvedPrice !== editingConfig.price) {
        // Price changed: update price and dynamically load/switch QR image URL
        const newUrl = existingQrForPrice ? existingQrForPrice.qrImageUrl : '';
        setEditingConfig(prev => prev ? { 
          ...prev, 
          price: resolvedPrice || undefined, 
          qrImageUrl: newUrl 
        } : null);
      } else if (existingQrForPrice && editingConfig.qrImageUrl !== existingQrForPrice.qrImageUrl) {
        // If the price is the same, but the loaded/existing QR URL differs from current state, synchronize them
        setEditingConfig(prev => prev ? { 
          ...prev, 
          qrImageUrl: existingQrForPrice.qrImageUrl 
        } : null);
      }
    }
  }, [editingConfig?.panelId, editingConfig?.duration, storeState.panelPricing, configs]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const durations: ('15Days' | '20Days' | '30Days' | 'permanent')[] = ['15Days', '20Days', '30Days', 'permanent'];

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedConfigs, fetchedCustomers, fetchedModules] = await Promise.all([
        apiClient.getQrConfigs(),
        apiClient.getCustomers(),
        apiClient.getModules()
      ]);
      setConfigs(fetchedConfigs || []);
      setCustomers((fetchedCustomers as any).customers || []);
      setModules(fetchedModules || []);
      if (fetchedModules.length > 0 && !batchPanelId) {
        setBatchPanelId(fetchedModules[0].id);
      }
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to load QR configurations') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (config?: QrConfig) => {
    cyberAudio.playClick(1000);
    if (config) {
      setEditingConfig({ ...config });
    } else {
      const initialPanelId = modules[0]?.id || 'MOD-AEGIS-SENTINEL';
      const initialDuration = '30Days';
      const resolvedPrice = getGlobalPrice(initialPanelId, initialDuration);
      
      const existingQrForPrice = resolvedPrice !== null 
        ? configs.find(c => c.price === resolvedPrice) 
        : null;

      setEditingConfig({
        panelId: initialPanelId,
        duration: initialDuration,
        customerId: activeTab === 'customer' ? (customers[0]?.id || '') : undefined,
        qrImageUrl: existingQrForPrice ? existingQrForPrice.qrImageUrl : 'https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg',
        price: resolvedPrice || undefined,
        enabled: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isBatch = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPG, SVG, WebP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (isBatch) {
        setBatchQrUrl(dataUrl);
      } else if (editingConfig) {
        setEditingConfig({ ...editingConfig, qrImageUrl: dataUrl });
      }
      cyberAudio.playClick(1200);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleStatus = async (config: QrConfig) => {
    cyberAudio.playClick(900);
    const updated: QrConfig = {
      ...config,
      enabled: !config.enabled,
      updatedAt: new Date().toISOString(),
    };
    try {
      await apiClient.saveQrConfig(updated);
      setConfigs(prev => prev.map(c => c.id === config.id ? updated : c));
      setMessage({ type: 'success', text: `QR status set to ${updated.enabled ? 'ACTIVE' : 'DISABLED'}` });
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to update status') });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig?.panelId || !editingConfig.duration || !editingConfig.qrImageUrl) {
      setMessage({ type: 'error', text: 'Please fill all required fields.' });
      return;
    }

    const resolvedPrice = getGlobalPrice(editingConfig.panelId, editingConfig.duration);
    if (resolvedPrice === null) {
      setMessage({ type: 'error', text: 'Cannot save: A valid global price is not configured for the selected panel and duration.' });
      return;
    }
    
    setSaving(true);
    try {
      const configToSave: QrConfig = {
        id: `PRICE-${resolvedPrice}`,
        panelId: editingConfig.panelId,
        duration: editingConfig.duration as any,
        customerId: activeTab === 'customer' ? (editingConfig.customerId || undefined) : undefined,
        price: resolvedPrice,
        qrImageUrl: editingConfig.qrImageUrl,
        enabled: editingConfig.enabled ?? true,
        updatedAt: new Date().toISOString(),
      };
      await apiClient.saveQrConfig(configToSave);
      cyberAudio.playClick(1400);
      setMessage({ type: 'success', text: 'QR Configuration saved successfully' });
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to save QR configuration') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    cyberAudio.playClick(700);
    if (!window.confirm('Are you sure you want to delete this QR configuration?')) return;
    try {
      await apiClient.deleteQrConfig(id);
      setMessage({ type: 'success', text: 'QR Configuration deleted successfully' });
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to delete configuration') });
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPanelId || !batchQrUrl) {
      setMessage({ type: 'error', text: 'Please select a panel and QR Image URL.' });
      return;
    }

    // Verify all 4 durations have a configured global price
    for (const dur of durations) {
      const p = getGlobalPrice(batchPanelId, dur);
      if (p === null) {
        setMessage({
          type: 'error',
          text: `Cannot batch generate: The global price for duration "${dur}" is not configured on this panel.`
        });
        return;
      }
    }

    setSaving(true);
    try {
      for (const dur of durations) {
        const resolvedPrice = getGlobalPrice(batchPanelId, dur)!;
        const newConfig: QrConfig = {
          id: `PRICE-${resolvedPrice}`,
          panelId: batchPanelId,
          duration: dur,
          price: resolvedPrice,
          qrImageUrl: batchQrUrl,
          enabled: true,
          updatedAt: new Date().toISOString(),
        };
        await apiClient.saveQrConfig(newConfig);
      }

      cyberAudio.playClick(1500);
      setMessage({ type: 'success', text: `Successfully generated/updated 4 duration QR codes for selected panel!` });
      setIsBatchModalOpen(false);
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to batch generate QR configs') });
    } finally {
      setSaving(false);
    }
  };

  // Filtered configurations
  const filteredConfigs = configs.filter(c => {
    const isCustomerSpecific = !!c.customerId;
    if (activeTab === 'default' && isCustomerSpecific) return false;
    if (activeTab === 'customer' && !isCustomerSpecific) return false;
    
    if (selectedPanelFilter !== 'all' && c.panelId !== selectedPanelFilter) return false;
    if (selectedDurationFilter !== 'all' && c.duration !== selectedDurationFilter) return false;
    if (selectedCustomerFilter !== 'all' && c.customerId !== selectedCustomerFilter) return false;

    const panel = modules.find(m => m.id === c.panelId)?.name || c.panelId;
    const cust = customers.find(cu => cu.id === c.customerId)?.username || c.customerId || '';
    
    const searchLower = search.toLowerCase();
    return (
      panel.toLowerCase().includes(searchLower) || 
      cust.toLowerCase().includes(searchLower) || 
      c.duration.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower)
    );
  });

  // Calculate statistics
  const totalConfigs = configs.length;
  const activeConfigsCount = configs.filter(c => c.enabled).length;
  const defaultCount = configs.filter(c => !c.customerId).length;
  const customerCount = configs.filter(c => !!c.customerId).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-violet-500/40 shadow-[0_0_30px_rgba(139,92,246,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/50 flex items-center justify-center text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg sm:text-xl text-white tracking-wider">
                DYNAMIC QR CODE MANAGEMENT
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                PRO
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Configure isolated UPI QR codes for each Panel, Duration (15D, 20D, 30D, Permanent), and Customer overrides.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1000);
              setIsBatchModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/40 hover:border-violet-400 text-violet-300 hover:text-white text-xs font-bold font-mono-code flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>AUTO-SETUP 4 DURATIONS</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold font-mono-code flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            <Plus className="w-4 h-4" />
            <span>ADD QR CONFIG</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono-code text-xs">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block uppercase tracking-wider">Total Configurations</span>
          <span className="font-display font-extrabold text-2xl text-white mt-1 block">{totalConfigs}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
          <span className="text-emerald-400 text-[10px] block uppercase tracking-wider">Active QR Codes</span>
          <span className="font-display font-extrabold text-2xl text-emerald-300 mt-1 block">{activeConfigsCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30">
          <span className="text-cyan-400 text-[10px] block uppercase tracking-wider">Default Panel Matrix</span>
          <span className="font-display font-extrabold text-2xl text-cyan-300 mt-1 block">{defaultCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-violet-500/30">
          <span className="text-violet-400 text-[10px] block uppercase tracking-wider">Customer Overrides</span>
          <span className="font-display font-extrabold text-2xl text-violet-300 mt-1 block">{customerCount}</span>
        </div>
      </div>

      {/* Status / Alert Message */}
      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-mono-code flex items-center justify-between gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
            : 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
        }`}>
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(900);
              setActiveTab('default');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono-code font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'default'
                ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DEFAULT PANEL MATRIX ({defaultCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(900);
              setActiveTab('customer');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono-code font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'customer'
                ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CUSTOMER OVERRIDES ({customerCount})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer self-end sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-mono-code">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by panel, customer username, or duration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Panel Selector Filter */}
          <select
            value={selectedPanelFilter}
            onChange={(e) => setSelectedPanelFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:border-violet-500 outline-none cursor-pointer"
          >
            <option value="all">All Panels</option>
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Duration Selector Filter */}
          <select
            value={selectedDurationFilter}
            onChange={(e) => setSelectedDurationFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:border-violet-500 outline-none cursor-pointer"
          >
            <option value="all">All Durations</option>
            <option value="15Days">15 Days</option>
            <option value="20Days">20 Days</option>
            <option value="30Days">30 Days</option>
            <option value="permanent">Permanent</option>
          </select>

          {/* Customer Filter for Override Tab */}
          {activeTab === 'customer' && (
            <select
              value={selectedCustomerFilter}
              onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:border-violet-500 outline-none cursor-pointer"
            >
              <option value="all">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.username} ({c.customer_id})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-code text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Access Panel</th>
                <th className="p-4">Duration</th>
                {activeTab === 'customer' && <th className="p-4">Customer Override</th>}
                <th className="p-4">Config Price</th>
                <th className="p-4 text-center">QR Preview</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {filteredConfigs.map(c => {
                const panel = modules.find(m => m.id === c.panelId);
                const cust = customers.find(cu => cu.id === c.customerId);
                return (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors group">
                    {/* Panel */}
                    <td className="p-4">
                      <div className="font-display font-bold text-white text-sm">
                        {panel?.name || c.panelId}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono-code block">
                        ID: {c.panelId}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                        c.duration === 'permanent' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : c.duration === '30Days'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {c.duration === 'permanent' ? 'PERMANENT (LIFETIME)' : c.duration.replace('Days', ' DAYS')}
                      </span>
                    </td>

                    {/* Customer */}
                    {activeTab === 'customer' && (
                      <td className="p-4">
                        <div className="font-bold text-emerald-400">
                          {cust ? cust.username : c.customerId}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {cust ? `Cust ID: ${cust.customer_id}` : 'Direct ID'}
                        </span>
                      </td>
                    )}

                    {/* Price */}
                    <td className="p-4">
                      <span className="font-display font-extrabold text-white text-sm">
                        {c.price ? `₹${c.price}` : 'Default Plan'}
                      </span>
                    </td>

                    {/* QR Preview (Clickable) */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setPreviewModalImage({
                          url: c.qrImageUrl,
                          title: panel?.name || c.panelId,
                          subtitle: `${c.duration} // ${cust ? `Customer: ${cust.username}` : 'Default QR'}`,
                          price: c.price,
                        })}
                        className="relative group/qr inline-block cursor-pointer"
                        title="Click to view full preview"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-sm border border-slate-700 transition-transform group-hover/qr:scale-105 overflow-hidden flex items-center justify-center">
                          <img 
                            src={c.qrImageUrl} 
                            alt="QR" 
                            referrerPolicy="no-referrer" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/qr:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </button>
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          c.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{c.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(c)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-violet-950/60 border border-slate-800 hover:border-violet-500/50 text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                          title="Edit QR Configuration"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete Configuration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredConfigs.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'customer' ? 7 : 6} className="p-12 text-center text-slate-500 font-mono-code">
                    <div className="max-w-sm mx-auto space-y-3">
                      <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400 font-bold">No QR configurations match your filter.</p>
                      <p className="text-xs text-slate-500">
                        {activeTab === 'customer' 
                          ? 'Create a customer-specific QR override to personalize checkout for high-tier customers.' 
                          : 'Use the "AUTO-SETUP 4 DURATIONS" tool to seed all durations instantly.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create QR Config</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-violet-500/50 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/50 flex items-center justify-center text-violet-300 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wider">
                    {editingConfig.id ? 'EDIT QR CONFIGURATION' : 'NEW DYNAMIC QR CONFIGURATION'}
                  </h3>
                  <span className="text-[10px] font-mono-code text-violet-400">
                    {activeTab === 'customer' ? 'CUSTOMER OVERRIDE MODE' : 'DEFAULT PANEL MODE'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <form id="qr-form" onSubmit={handleSave} className="space-y-4 font-mono-code text-xs">
                
                {/* Customer (if customer-specific override) */}
                {activeTab === 'customer' && (
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold flex items-center justify-between">
                      <span>Target Customer:</span>
                      <span className="text-emerald-400 text-[10px]">REQUIRED FOR OVERRIDE</span>
                    </label>
                    <select
                      value={editingConfig.customerId || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, customerId: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none cursor-pointer"
                    >
                      <option value="">Select a customer...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.username} ({c.customer_id})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Panel Selection */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Access Panel:</label>
                  <select
                    value={editingConfig.panelId || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, panelId: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none cursor-pointer"
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                    ))}
                  </select>
                </div>

                {/* Duration Selection */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Duration Key:</label>
                  <select
                    value={editingConfig.duration || '30Days'}
                    onChange={(e) => setEditingConfig({ ...editingConfig, duration: e.target.value as any })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="15Days">15 Days</option>
                    <option value="20Days">20 Days</option>
                    <option value="30Days">30 Days</option>
                    <option value="permanent">Permanent (Lifetime)</option>
                  </select>
                </div>

                {/* Optional Price Display */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Configured Price (INR):</label>
                  <input
                    type="text"
                    value={editingConfig.price !== undefined && editingConfig.price !== null ? String(editingConfig.price) : 'Price not configured'}
                    disabled
                    placeholder="Price not configured"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 focus:border-violet-500 outline-none opacity-80 cursor-not-allowed font-bold"
                  />
                  {(editingConfig.price === undefined || editingConfig.price === null) && (
                    <p className="text-rose-400 text-[10px] mt-1 font-mono-code flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Please configure a global price for this panel + duration in the Admin pricing section first.</span>
                    </p>
                  )}
                </div>

                {/* QR Code Upload / URL */}
                <div className="space-y-2 pt-1">
                  <label className="text-slate-300 font-bold flex items-center justify-between">
                    <span>UPI QR Code Image:</span>
                    <span className="text-violet-400 text-[10px]">URL OR FILE UPLOAD</span>
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={editingConfig.qrImageUrl || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, qrImageUrl: e.target.value })}
                      placeholder="Paste Image URL (https://...)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/50 text-violet-300 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Upload local QR image file"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileUpload(e, false)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Image Preview Box */}
                  {editingConfig.qrImageUrl ? (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 h-28 rounded-xl bg-white p-2 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        <img 
                          src={editingConfig.qrImageUrl} 
                          alt="QR Preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="text-left space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold block">✓ QR IMAGE LOADED</span>
                        <p className="text-xs text-slate-300">
                          This QR will be displayed when customer purchases this panel & duration.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                      <span>No QR Image selected yet</span>
                    </div>
                  )}
                </div>

                {/* Enable / Disable Checkbox */}
                <div className="flex items-center gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="enabled-toggle"
                    checked={editingConfig.enabled ?? true}
                    onChange={(e) => setEditingConfig({ ...editingConfig, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="enabled-toggle" className="text-slate-300 font-bold cursor-pointer">
                    Enable this QR Configuration immediately
                  </label>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-mono-code text-xs font-bold transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                form="qr-form"
                type="submit"
                disabled={saving || editingConfig.price === undefined || editingConfig.price === null}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono-code text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingConfig.id ? 'UPDATE CONFIGURATION' : 'SAVE CONFIGURATION'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Batch Setup Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-violet-500/50 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/50 flex items-center justify-center text-violet-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wider">
                    AUTO-SETUP 4 DURATIONS
                  </h3>
                  <span className="text-[10px] font-mono-code text-violet-400">
                    ONE-CLICK SEED FOR 15D, 20D, 30D & PERMANENT
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <form id="batch-form" onSubmit={handleBatchGenerate} className="space-y-4 font-mono-code text-xs">
                <p className="text-slate-300">
                  This will generate or update 4 dedicated QR configurations for the selected panel:
                </p>

                <div className="grid grid-cols-2 gap-2 text-slate-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <div>• 15 Days (₹120)</div>
                  <div>• 20 Days (₹138)</div>
                  <div>• 30 Days (₹150)</div>
                  <div>• Permanent (₹216)</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Select Panel:</label>
                  <select
                    value={batchPanelId}
                    onChange={(e) => setBatchPanelId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none cursor-pointer"
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-300 font-bold">UPI QR Image URL / Upload:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={batchQrUrl}
                      onChange={(e) => setBatchQrUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => batchFileInputRef.current?.click()}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/50 text-violet-300 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>File</span>
                    </button>
                    <input
                      type="file"
                      ref={batchFileInputRef}
                      onChange={(e) => handleFileUpload(e, true)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                {batchQrUrl && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center">
                    <img src={batchQrUrl} alt="Preview" referrerPolicy="no-referrer" className="max-h-28 object-contain bg-white p-1 rounded-lg" />
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-mono-code text-xs font-bold cursor-pointer"
              >
                CANCEL
              </button>
              <button
                form="batch-form"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono-code text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] cursor-pointer disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>GENERATE 4 DURATION QRs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged QR Lightbox Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-violet-500/60 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.3)] p-6 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-left">
                <h4 className="font-display font-bold text-white text-base">{previewModalImage.title}</h4>
                <span className="text-[10px] font-mono-code text-violet-400 block">{previewModalImage.subtitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto">
              <img 
                src={previewModalImage.url} 
                alt="Enlarged QR" 
                referrerPolicy="no-referrer"
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            {previewModalImage.price && (
              <div className="text-center font-mono-code text-xs">
                <span className="text-slate-400">Associated Price: </span>
                <span className="font-display font-extrabold text-lg text-emerald-400">₹{previewModalImage.price}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono-code text-xs font-bold transition-colors cursor-pointer"
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
