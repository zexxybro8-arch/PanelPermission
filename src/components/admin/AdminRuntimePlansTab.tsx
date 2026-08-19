import React, { useState } from 'react';
import { 
  Layers, Edit3, Check, X, Tag, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { AdminRuntimePlan } from '../../types';
import { apiClient } from '../../services/apiClient';

interface AdminRuntimePlansTabProps {
  plans: AdminRuntimePlan[];
  onRefresh: () => void;
}

export const AdminRuntimePlansTab: React.FC<AdminRuntimePlansTabProps> = ({
  plans,
  onRefresh,
}) => {
  const [editingPlan, setEditingPlan] = useState<AdminRuntimePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleEditClick = (plan: AdminRuntimePlan) => {
    setEditingPlan({ ...plan });
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.updateRuntimePlan(editingPlan.id, {
        name: editingPlan.name,
        durationDays: Number(editingPlan.durationDays),
        defaultPrice: Number(editingPlan.defaultPrice),
        badge: editingPlan.badge,
        description: editingPlan.description,
        status: editingPlan.status,
      });
      setEditingPlan(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white tracking-wider">
              GLOBAL RUNTIME PLANS CATALOGUE
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Manage base catalogue pricing applied to all users without custom overrides
            </span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-lg space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base text-white tracking-wider">
                    {plan.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {plan.badge}
                  </span>
                </div>
                <span className="text-xs font-mono-code text-slate-400 mt-1 block">
                  {plan.durationDays > 0 ? `${plan.durationDays} Days Duration` : 'Non-expiring Lifetime Access'}
                </span>
              </div>

              <div className="text-right">
                <span className="font-display font-extrabold text-2xl text-cyan-300">
                  ₹{plan.defaultPrice}
                </span>
                <span className="text-[10px] font-mono-code text-slate-500 block">GLOBAL BASE</span>
              </div>
            </div>

            <p className="text-xs font-mono-code text-slate-400 line-clamp-2">
              {plan.description}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono-code">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                plan.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {plan.status.toUpperCase()}
              </span>

              <button
                type="button"
                onClick={() => handleEditClick(plan)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDIT PLAN</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  EDIT RUNTIME PLAN
                </h3>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  PLAN NAME
                </label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    DEFAULT PRICE (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPlan.defaultPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, defaultPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                    BADGE LABEL
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.badge}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>SAVE CHANGES</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
