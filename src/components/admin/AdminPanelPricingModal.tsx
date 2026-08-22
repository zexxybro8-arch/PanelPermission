import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Edit2, Check, AlertCircle, 
  Clock, ShieldCheck, Zap, Sparkles, CheckCircle2,
  DollarSign, RotateCcw, AlertTriangle, Infinity
} from 'lucide-react';
import { CyberModule, PanelPricing, PanelDurationPricing, DurationType } from '../../types';
import { apiClient } from '../../services/apiClient';
import { appStore } from '../../store/appStore';

interface AdminPanelPricingModalProps {
  panel: CyberModule;
  isOpen?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AdminPanelPricingModal: React.FC<AdminPanelPricingModalProps> = ({
  panel,
  isOpen = true,
  onClose,
  onSaved,
}) => {
  if (!isOpen) return null;
  // Main state
  const [durations, setDurations] = useState<PanelDurationPricing[]>([]);
  const [permanentEnabled, setPermanentEnabled] = useState<boolean>(false);
  const [permanentPrice, setPermanentPrice] = useState<number>(450);

  // New Duration form inputs
  const [newDays, setNewDays] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDays, setEditDays] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  // Status & Feedback
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Load existing panel pricing
  useEffect(() => {
    if (isOpen && panel) {
      setValidationError(null);
      setSuccessMessage(null);
      setEditingId(null);
      setNewDays('');
      setNewPrice('');

      const normalized = appStore.getPanelPricing(panel.id);
      if (normalized && normalized.durations && normalized.durations.length > 0) {
        const dayDurations: PanelDurationPricing[] = [];
        let permFound = false;

        normalized.durations.forEach((d) => {
          if (d.durationType === 'PERMANENT') {
            permFound = true;
            setPermanentEnabled(d.enabled !== false);
            setPermanentPrice(d.price || 450);
          } else {
            dayDurations.push({
              id: d.id || `dur_${d.durationDays}`,
              durationType: 'DAYS',
              durationDays: d.durationDays,
              price: d.price,
              enabled: d.enabled !== false,
              label: d.label || `${d.durationDays} Days`,
            });
          }
        });

        // Sort day durations ascending
        dayDurations.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
        setDurations(dayDurations);
        if (!permFound) {
          setPermanentEnabled(false);
          setPermanentPrice(Math.round((panel.price || 120) * 1.8));
        }
      } else {
        // No pricing configured yet for this panel
        setDurations([]);
        setPermanentEnabled(false);
        setPermanentPrice(Math.round((panel.price || 120) * 1.8));
      }
    }
  }, [isOpen, panel]);

  if (!isOpen) return null;

  // Add new duration
  const handleAddDuration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const daysNum = parseInt(newDays.trim(), 10);
    const priceNum = parseFloat(newPrice.trim());

    if (!newDays.trim() || isNaN(daysNum) || daysNum <= 0) {
      setValidationError('Please enter a valid number of days (greater than 0).');
      return;
    }

    if (!newPrice.trim() || isNaN(priceNum) || priceNum <= 0) {
      setValidationError('Please enter a valid price in INR (greater than 0).');
      return;
    }

    // Check for duplicate duration days for this panel
    const exists = durations.some(
      (d) => d.durationType === 'DAYS' && d.durationDays === daysNum
    );
    if (exists) {
      setValidationError(`Duration of ${daysNum} Days already exists for this panel. You cannot have duplicate durations with conflicting rates.`);
      return;
    }

    const newEntry: PanelDurationPricing = {
      id: `dur_${daysNum}_${Date.now()}`,
      durationType: 'DAYS',
      durationDays: daysNum,
      price: priceNum,
      enabled: true,
      label: `${daysNum} Days`,
    };

    const updated = [...durations, newEntry];
    updated.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
    setDurations(updated);
    setNewDays('');
    setNewPrice('');
  };

  // Start editing a duration in place
  const handleStartEdit = (d: PanelDurationPricing) => {
    setEditingId(d.id || `dur_${d.durationDays}`);
    setEditDays(String(d.durationDays || ''));
    setEditPrice(String(d.price));
    setValidationError(null);
  };

  // Save inline edit
  const handleSaveEdit = (targetId: string) => {
    setValidationError(null);
    const daysNum = parseInt(editDays.trim(), 10);
    const priceNum = parseFloat(editPrice.trim());

    if (!editDays.trim() || isNaN(daysNum) || daysNum <= 0) {
      setValidationError('Duration days must be a positive integer.');
      return;
    }

    if (!editPrice.trim() || isNaN(priceNum) || priceNum <= 0) {
      setValidationError('Price must be a valid positive amount.');
      return;
    }

    // Check if duplicate with another item
    const duplicate = durations.some(
      (d) => (d.id !== targetId) && d.durationType === 'DAYS' && d.durationDays === daysNum
    );
    if (duplicate) {
      setValidationError(`Another row already uses ${daysNum} Days. Durations must be unique per panel.`);
      return;
    }

    const updated = durations.map((d) => {
      if (d.id === targetId || `dur_${d.durationDays}` === targetId) {
        return {
          ...d,
          durationDays: daysNum,
          price: priceNum,
          label: `${daysNum} Days`,
        };
      }
      return d;
    });

    updated.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
    setDurations(updated);
    setEditingId(null);
  };

  // Delete duration
  const handleDeleteDuration = (targetId: string) => {
    setDurations((prev) => prev.filter((d) => (d.id !== targetId && `dur_${d.durationDays}` !== targetId)));
    if (editingId === targetId) {
      setEditingId(null);
    }
  };

  // Toggle duration enabled status
  const handleToggleDurationEnabled = (targetId: string) => {
    setDurations((prev) =>
      prev.map((d) => {
        if (d.id === targetId || `dur_${d.durationDays}` === targetId) {
          return { ...d, enabled: !d.enabled };
        }
        return d;
      })
    );
  };

  // Reset to initial multiplier suggestion (helper shortcut for admin convenience)
  const handleQuickSeedDefaults = () => {
    const base = panel.price || 120;
    const defaultDurations: PanelDurationPricing[] = [
      { id: 'dur_7', durationType: 'DAYS', durationDays: 7, price: Math.round(base * 0.6), enabled: true, label: '7 Days' },
      { id: 'dur_15', durationType: 'DAYS', durationDays: 15, price: base, enabled: true, label: '15 Days' },
      { id: 'dur_30', durationType: 'DAYS', durationDays: 30, price: Math.round(base * 1.5), enabled: true, label: '30 Days' },
      { id: 'dur_45', durationType: 'DAYS', durationDays: 45, price: Math.round(base * 2.0), enabled: true, label: '45 Days' },
    ];
    setDurations(defaultDurations);
    setPermanentEnabled(true);
    setPermanentPrice(Math.round(base * 3.5));
    setValidationError(null);
  };

  // Save the entire scheme
  const handleSaveScheme = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    // Validation: must have at least one active duration or permanent enabled
    const activeDays = durations.filter((d) => d.enabled);
    if (activeDays.length === 0 && !permanentEnabled) {
      setValidationError('Please configure and enable at least one duration (or Permanent Access) so this panel can be purchased.');
      return;
    }

    if (permanentEnabled && (isNaN(Number(permanentPrice)) || Number(permanentPrice) <= 0)) {
      setValidationError('Please specify a valid price for Permanent Access (must be > 0).');
      return;
    }

    // Build the final durations array
    const finalDurations: PanelDurationPricing[] = [...durations];
    if (permanentEnabled) {
      finalDurations.push({
        id: 'dur_perm',
        durationType: 'PERMANENT',
        durationDays: null,
        price: Number(permanentPrice),
        enabled: true,
        label: 'Permanent',
      });
    }

    const payload: PanelPricing = {
      panelId: panel.id,
      durations: finalDurations,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await apiClient.savePanelPricing(panel.id, payload);
      setSuccessMessage('Panel pricing scheme saved successfully!');
      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 500);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save panel pricing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-mono-code">
      <div className="bg-slate-950 border border-violet-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(139,92,246,0.25)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-white tracking-wider">
                  PANEL PRICING SCHEME
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/80 text-violet-300 border border-violet-500/40">
                  {panel.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Panel ID: <span className="text-violet-300 font-bold">{panel.id}</span> • Dynamic duration options & pricing
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Alerts */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{validationError}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Configured Durations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="font-display font-bold text-sm text-white tracking-wide">
                  ACTIVE DURATIONS ({durations.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickSeedDefaults}
                className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 hover:underline cursor-pointer"
                title="Load standard preset durations as a starting point"
              >
                <Sparkles className="w-3 h-3" />
                <span>LOAD SUGGESTED PRESET</span>
              </button>
            </div>

            {durations.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">No day durations configured for this panel yet.</p>
                <p className="text-[11px] text-slate-500">
                  Add custom duration periods below (e.g. 7 Days → ₹50, 45 Days → ₹220).
                </p>
              </div>
            ) : (
              <div className="border border-slate-800/90 rounded-2xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">Duration</th>
                      <th className="p-3 text-right">Price (INR)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {durations.map((d) => {
                      const isEditing = editingId === (d.id || `dur_${d.durationDays}`);

                      if (isEditing) {
                        return (
                          <tr key={d.id || d.durationDays} className="bg-violet-950/20">
                            <td className="p-3 pl-4">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={editDays}
                                  onChange={(e) => setEditDays(e.target.value)}
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-violet-500 text-white font-bold outline-none"
                                />
                                <span className="text-slate-400 text-xs">Days</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="relative inline-block w-28">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full pl-5 pr-2 py-1 rounded-lg bg-slate-900 border border-violet-500 text-right text-violet-300 font-bold outline-none"
                                />
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] text-violet-400 font-bold">EDITING</span>
                            </td>
                            <td className="p-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(d.id || `dur_${d.durationDays}`)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                  title="Save edit"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                                  title="Cancel edit"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={d.id || d.durationDays} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400">
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-bold text-white text-sm">{d.durationDays} Days</span>
                                <span className="text-[10px] text-slate-500 block">Type: Custom Period</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-display font-black text-sm text-violet-300">
                              ₹{d.price}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDurationEnabled(d.id || `dur_${d.durationDays}`)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                d.enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                              }`}
                            >
                              {d.enabled ? 'ACTIVE' : 'DISABLED'}
                            </button>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(d)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-violet-300 transition-colors cursor-pointer"
                                title="Edit duration & price"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDuration(d.id || `dur_${d.durationDays}`)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete duration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Add New Duration Form */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                + ADD DURATION TO THIS PANEL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">
                  DURATION (DAYS):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 7, 45, 60"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDuration();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold placeholder:text-slate-600 focus:border-emerald-400 outline-none"
                  />
                </div>
                {newDays && (
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    Displays as: {newDays} Days
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">
                  PRICE (INR):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50, 220"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDuration();
                    }}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-right text-emerald-300 font-bold placeholder:text-slate-600 focus:border-emerald-400 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddDuration()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADD DURATION</span>
              </button>
            </div>
          </div>

          {/* Section 3: Permanent Access Option */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-900/60 to-slate-900/60 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Infinity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs uppercase tracking-wider block">
                    PERMANENT / LIFETIME ACCESS
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Non-expiring lifetime license authorization
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-bold ${permanentEnabled ? 'text-amber-400' : 'text-slate-500'}`}>
                  {permanentEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
                <input
                  type="checkbox"
                  checked={permanentEnabled}
                  onChange={(e) => setPermanentEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 border-slate-700 cursor-pointer"
                />
              </label>
            </div>

            {permanentEnabled ? (
              <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  Permanent access will be available to purchase on this panel:
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300">Rate:</span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={permanentPrice}
                      onChange={(e) => setPermanentPrice(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 text-right text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                Permanent access is disabled for this panel. Users will only see the custom day durations configured above.
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800/90 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={handleSaveScheme}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-display font-extrabold text-xs tracking-wider flex items-center gap-2 border border-violet-400/40 shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'SAVING SCHEME...' : 'SAVE PRICING SCHEME'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
