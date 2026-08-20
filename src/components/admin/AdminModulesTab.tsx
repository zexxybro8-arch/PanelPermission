import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, Plus, Edit3, Trash2, Power, Zap, Flame, Cpu, 
  Activity, Droplets, Crosshair, EyeOff, X, Check, AlertTriangle, 
  Search, Shield, DollarSign, Image as ImageIcon, Users, UserCheck,
  ExternalLink, Sparkles, Upload
} from 'lucide-react';
import { CyberModule, Customer } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';
import { compressImage } from '../../utils/imageCompressor';

interface AdminModulesTabProps {
  modules: CyberModule[];
  onRefresh: () => void;
}

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Flame,
  Cpu,
  Activity,
  Droplets,
  Crosshair,
  EyeOff,
  Boxes,
  Shield,
};

export const AdminModulesTab: React.FC<AdminModulesTabProps> = ({
  modules,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CyberModule | null>(null);
  const [assigningModule, setAssigningModule] = useState<CyberModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<CyberModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  // New Panel Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newVersion, setNewVersion] = useState('1.0.0');
  const [newDescription, setNewDescription] = useState('');
  const [newTag, setNewTag] = useState('CUSTOM');
  const [newIcon, setNewIcon] = useState('Flame');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newPrice, setNewPrice] = useState<number>(120);
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newRequiredRuntime, setNewRequiredRuntime] = useState('15+ Days Access');
  const [newAssignedCustomers, setNewAssignedCustomers] = useState<string[]>([]);

  // Assign Customer Modal State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Load Customers for Assignments
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await apiClient.getCustomers();
        if (data && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      } catch (e) {
        console.warn('Failed to load customers for panel assignments:', e);
      }
    };
    fetchCustomers();
  }, []);

  const handleToggleStatus = async (mod: CyberModule) => {
    try {
      await apiClient.toggleModule(mod.id);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to toggle panel status'));
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const generatedId = newId.trim()
        ? newId.toLowerCase().replace(/\s+/g, '-')
        : 'panel-' + newName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      await apiClient.createModule({
        id: generatedId,
        name: newName.trim(),
        version: newVersion.trim() || '1.0.0',
        description: newDescription.trim(),
        tag: newTag.trim().toUpperCase() || 'CUSTOM',
        icon: newIcon,
        imageUrl: newImageUrl.trim(),
        price: Number(newPrice) || 120,
        status: newStatus,
        enabled: newStatus === 'active',
        requiredRuntime: newRequiredRuntime.trim() || '15+ Days Access',
        assignedCustomerIds: newAssignedCustomers,
      });

      setIsAddModalOpen(false);
      setNewId('');
      setNewName('');
      setNewDescription('');
      setNewImageUrl('');
      setNewPrice(120);
      setNewAssignedCustomers([]);
      onRefresh();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to create access panel'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.updateModule(editingModule.id, {
        name: editingModule.name.trim(),
        version: editingModule.version.trim() || '1.0.0',
        description: editingModule.description.trim(),
        tag: editingModule.tag.trim().toUpperCase() || 'CUSTOM',
        icon: editingModule.icon || 'Flame',
        imageUrl: editingModule.imageUrl?.trim() || '',
        price: Number(editingModule.price) || 120,
        status: editingModule.status || (editingModule.enabled ? 'active' : 'inactive'),
        enabled: editingModule.status === 'active' || editingModule.enabled,
        requiredRuntime: editingModule.requiredRuntime || '15+ Days Access',
        assignedCustomerIds: editingModule.assignedCustomerIds || [],
      });
      setEditingModule(null);
      onRefresh();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update access panel'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!assigningModule) return;
    setSaving(true);
    try {
      await apiClient.assignCustomersToPanel(assigningModule.id, selectedCustomerIds);
      setAssigningModule(null);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to save customer panel assignments'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingModule) return;
    setSaving(true);
    try {
      await apiClient.deleteModule(deletingModule.id);
      setDeletingModule(null);
      onRefresh();
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to delete panel'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered Panels
  const filteredModules = modules.filter((mod) => {
    const matchesSearch = 
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchTerm.toLowerCase());

    const isModActive = mod.status === 'active' || (mod.enabled !== false && mod.status !== 'inactive');
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isModActive) ||
      (statusFilter === 'INACTIVE' && !isModActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base text-white tracking-wider">
                ACCESS PANEL MANAGEMENT
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {modules.length} TOTAL PANELS
              </span>
            </div>
            <span className="text-xs font-mono-code text-slate-400">
              Configure panel names, visual banner images, customer assignments, pricing, and active status
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-extrabold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-[1.02] transition-transform cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950 font-bold" />
          <span>ADD NEW PANEL</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search panels by name, tag, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono-code text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono-code text-xs">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Panels Grid */}
      {filteredModules.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
          <Boxes className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-display font-bold text-sm text-slate-300">NO ACCESS PANELS FOUND</h3>
          <p className="text-xs font-mono-code text-slate-500">
            No access panels match your current search query or filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredModules.map((mod) => {
            const Icon = (mod.icon && ICON_COMPONENTS[mod.icon]) || Flame;
            const isEnabled = mod.status === 'active' || (mod.enabled !== false && mod.status !== 'inactive');
            const hasValidImage = !!mod.imageUrl && !imageErrorMap[mod.id];
            const assignedCount = mod.assignedCustomerIds?.length || mod.assignedCustomers?.length || 0;

            return (
              <div
                key={mod.id}
                className={`p-5 rounded-3xl border transition-all duration-300 space-y-4 flex flex-col justify-between relative group overflow-hidden ${
                  isEnabled
                    ? 'bg-slate-950/90 border-slate-800/90 hover:border-cyan-500/40 shadow-[0_0_30px_-10px_rgba(0,242,254,0.15)]'
                    : 'bg-slate-950/50 border-slate-900 opacity-65'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Card: Visual Image Preview / Icon + Title + Status Power */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Image Thumbnail or Cyber Icon */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0 overflow-hidden relative shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                        {hasValidImage ? (
                          <img
                            src={mod.imageUrl}
                            alt={mod.name}
                            className="w-full h-full object-cover"
                            onError={() => setImageErrorMap(prev => ({ ...prev, [mod.id]: true }))}
                          />
                        ) : (
                          <Icon className="w-6 h-6 text-cyan-400" />
                        )}
                      </div>

                      <div>
                        <h3 className="font-display font-bold text-base text-white tracking-wider group-hover:text-cyan-200 transition-colors">
                          {mod.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono-code text-slate-400">
                            v{mod.version}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                            {mod.tag}
                          </span>
                          {typeof mod.price === 'number' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              ₹{mod.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(mod)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                        isEnabled
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={isEnabled ? 'Click to Disable Panel' : 'Click to Enable Panel'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Panel Description */}
                  <p className="text-xs font-mono-code text-slate-400 line-clamp-2 min-h-[34px] leading-relaxed">
                    {mod.description}
                  </p>

                  {/* Assigned Customers Pill */}
                  <div className="flex items-center justify-between text-[11px] font-mono-code pt-2 border-t border-slate-900">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Assigned Users:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAssigningModule(mod);
                        const currentAssigned = mod.assignedCustomerIds || 
                          (mod.assignedCustomers ? mod.assignedCustomers.map(c => c.id) : []) || [];
                        setSelectedCustomerIds(currentAssigned);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold hover:border-cyan-400 transition-colors"
                    >
                      {assignedCount} Assigned (Manage)
                    </button>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono-code">
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    {isEnabled ? 'ACTIVE PANEL' : 'INACTIVE'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingModule({ ...mod })}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Edit Panel Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingModule(mod)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete Panel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD PANEL MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  ADD NEW ACCESS PANEL
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateModule} className="space-y-4">
              {/* Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">PANEL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BALA MOD XYZ"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">PANEL ID (SLUG)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              {/* Image URL / Upload with live preview */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1 flex items-center justify-between">
                  <span>PANEL IMAGE / LOGO (URL OR UPLOAD)</span>
                  <span className="text-[10px] text-slate-500">Optional</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... or upload file"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                  <label className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono-code text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>UPLOAD</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const dataUrl = await compressImage(file);
                            setNewImageUrl(dataUrl);
                          } catch (err) {
                            alert('Failed to compress image file');
                          }
                        }
                      }}
                    />
                  </label>
                  {newImageUrl && (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/40 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Tag & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">DEFAULT PRICE (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">TAG</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">INITIAL STATUS</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="active">ACTIVE</option>
                    <option value="inactive">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Icon & Runtime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">FALLBACK ICON</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="Flame">Flame (Fire / Attack)</option>
                    <option value="Zap">Zap (Lightning / Speed)</option>
                    <option value="Cpu">Cpu (Core / System)</option>
                    <option value="Activity">Activity (Pulse / Radar)</option>
                    <option value="Droplets">Droplets (Sync / Fluid)</option>
                    <option value="Crosshair">Crosshair (Precision / Aim)</option>
                    <option value="EyeOff">EyeOff (Stealth / Ghost)</option>
                    <option value="Shield">Shield (Armor / Sentinel)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">ACCESS REQUIREMENT</label>
                  <input
                    type="text"
                    value={newRequiredRuntime}
                    onChange={(e) => setNewRequiredRuntime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">PANEL DESCRIPTION</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Operational panel functionality, bypass capabilities..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                />
              </div>

              {/* Assign Customers Checkboxes */}
              {customers.length > 0 && (
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    ASSIGN CUSTOMERS (CAN BE MODIFIED LATER)
                  </label>
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1.5">
                    {customers.map((c) => {
                      const isChecked = newAssignedCustomers.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs font-mono-code text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAssignedCustomers([...newAssignedCustomers, c.id]);
                              } else {
                                setNewAssignedCustomers(newAssignedCustomers.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded border-slate-700 text-cyan-400 focus:ring-0"
                          />
                          <span className="font-bold text-white">{c.customer_id || c.username}</span>
                          <span className="text-slate-500">({c.username})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-extrabold text-xs tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-[1.02] transition-transform"
                >
                  {saving ? 'CREATING...' : 'CREATE PANEL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT PANEL MODAL */}
      {/* ======================================================== */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  EDIT PANEL: {editingModule.name}
                </h3>
              </div>
              <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateModule} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">PANEL NAME</label>
                <input
                  type="text"
                  required
                  value={editingModule.name}
                  onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                />
              </div>

              {/* Image URL / Upload */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  PANEL IMAGE / LOGO (URL OR UPLOAD)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... or upload file"
                    value={editingModule.imageUrl || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, imageUrl: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                  <label className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono-code text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>UPLOAD</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const dataUrl = await compressImage(file);
                            setEditingModule({ ...editingModule, imageUrl: dataUrl });
                          } catch (err) {
                            alert('Failed to compress image file');
                          }
                        }
                      }}
                    />
                  </label>
                  {editingModule.imageUrl && (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/40 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={editingModule.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Tag & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">PRICE (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingModule.price || 120}
                    onChange={(e) => setEditingModule({ ...editingModule, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">TAG</label>
                  <input
                    type="text"
                    value={editingModule.tag}
                    onChange={(e) => setEditingModule({ ...editingModule, tag: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">STATUS</label>
                  <select
                    value={editingModule.status || (editingModule.enabled ? 'active' : 'inactive')}
                    onChange={(e) => setEditingModule({ ...editingModule, status: e.target.value as any, enabled: e.target.value === 'active' })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="active">ACTIVE</option>
                    <option value="inactive">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Icon & Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">ICON</label>
                  <select
                    value={editingModule.icon || 'Flame'}
                    onChange={(e) => setEditingModule({ ...editingModule, icon: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="Flame">Flame (Fire / Attack)</option>
                    <option value="Zap">Zap (Lightning / Speed)</option>
                    <option value="Cpu">Cpu (Core / System)</option>
                    <option value="Activity">Activity (Pulse / Radar)</option>
                    <option value="Droplets">Droplets (Sync / Fluid)</option>
                    <option value="Crosshair">Crosshair (Precision / Aim)</option>
                    <option value="EyeOff">EyeOff (Stealth / Ghost)</option>
                    <option value="Shield">Shield (Armor / Sentinel)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">VERSION</label>
                  <input
                    type="text"
                    value={editingModule.version}
                    onChange={(e) => setEditingModule({ ...editingModule, version: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value={editingModule.description}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-extrabold text-xs tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-[1.02] transition-transform"
                >
                  {saving ? 'UPDATING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ASSIGN CUSTOMERS MODAL */}
      {/* ======================================================== */}
      {assigningModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Users className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-white">
                  ASSIGN CUSTOMERS: {assigningModule.name}
                </h3>
              </div>
              <button onClick={() => setAssigningModule(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono-code text-slate-400">
              Select which customers are granted access to this panel in their customer dashboard:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {customers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 text-center text-xs font-mono-code text-slate-500">
                  No customers registered yet.
                </div>
              ) : (
                customers.map((c) => {
                  const isChecked = selectedCustomerIds.includes(c.id) || selectedCustomerIds.includes(c.customer_id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomerIds([...selectedCustomerIds, c.id]);
                            } else {
                              setSelectedCustomerIds(selectedCustomerIds.filter((id) => id !== c.id && id !== c.customer_id));
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-400 focus:ring-0"
                        />
                        <div>
                          <span className="font-bold text-white text-xs block">
                            {c.customer_id || c.username}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono-code">
                            User: {c.username}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono-code font-bold ${
                        c.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningModule(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.3)]"
              >
                {saving ? 'SAVING...' : 'SAVE ASSIGNMENTS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deletingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl cyber-glass p-6 border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-white">
                CONFIRM DELETION
              </h3>
            </div>

            <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete access panel <span className="text-rose-400 font-bold">{deletingModule.name}</span>? This action removes customer authorizations for this panel.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingModule(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs tracking-wider"
              >
                {saving ? 'DELETING...' : 'DELETE PANEL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
