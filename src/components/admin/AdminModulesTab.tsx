import React, { useState } from 'react';
import { 
  Boxes, Plus, Edit3, Trash2, Power, Zap, Flame, Cpu, 
  Activity, Droplets, Crosshair, EyeOff, X, Check, AlertTriangle, RefreshCw
} from 'lucide-react';
import { CyberModule } from '../../types';
import { apiClient } from '../../services/apiClient';

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
};

export const AdminModulesTab: React.FC<AdminModulesTabProps> = ({
  modules,
  onRefresh,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CyberModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<CyberModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New module form state
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newVersion, setNewVersion] = useState('1.0.0');
  const [newDescription, setNewDescription] = useState('');
  const [newTag, setNewTag] = useState('CUSTOM');
  const [newIcon, setNewIcon] = useState('Zap');
  const [newRequiredRuntime, setNewRequiredRuntime] = useState('15+ Days');

  const handleToggleStatus = async (mod: CyberModule) => {
    try {
      await apiClient.toggleModule(mod.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle module status');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiClient.createModule({
        id: newId.toLowerCase().replace(/\s+/g, '-'),
        name: newName,
        version: newVersion,
        description: newDescription,
        tag: newTag.toUpperCase(),
        icon: newIcon,
        enabled: true,
        requiredRuntime: newRequiredRuntime,
      });
      setIsAddModalOpen(false);
      setNewId('');
      setNewName('');
      setNewDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create module');
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
        name: editingModule.name,
        version: editingModule.version,
        description: editingModule.description,
        tag: editingModule.tag,
        icon: editingModule.icon,
        requiredRuntime: editingModule.requiredRuntime,
      });
      setEditingModule(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update module');
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
    } catch (err: any) {
      alert(err.message || 'Failed to delete module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white tracking-wider">
              COMMAND MODULES MANAGEMENT
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Manage accessible toolkits, versions, tags, and availability status
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.25)] hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950 font-bold" />
          <span>ADD NEW MODULE</span>
        </button>
      </div>

      {/* Modules Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = (mod.icon && ICON_COMPONENTS[mod.icon]) || Zap;
          const isEnabled = mod.enabled !== false && (mod as any).status !== 'disabled';

          return (
            <div
              key={mod.id}
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
                isEnabled
                  ? 'bg-slate-950/90 border-slate-800 shadow-lg'
                  : 'bg-slate-950/50 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white tracking-wider">
                      {mod.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono-code text-slate-400">
                        v{mod.version}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        {mod.tag}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(mod)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title={isEnabled ? 'Disable Module' : 'Enable Module'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs font-mono-code text-slate-400 line-clamp-2 min-h-[32px]">
                {mod.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono-code">
                <span className="text-[10px] text-slate-500">
                  Req: {mod.requiredRuntime || '15+ Days'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingModule({ ...mod })}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Edit Module"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingModule(mod)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Delete Module"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Module Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  ADD NEW MODULE
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateModule} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">MODULE ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. stealth-core"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">MODULE NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STEALTH CORE"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">VERSION</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">TAG</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">ICON</label>
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                >
                  <option value="Zap">Zap (Lightning)</option>
                  <option value="Flame">Flame (Fire)</option>
                  <option value="Cpu">Cpu (Processor)</option>
                  <option value="Activity">Activity (Pulse)</option>
                  <option value="Droplets">Droplets (Sync)</option>
                  <option value="Crosshair">Crosshair (Target)</option>
                  <option value="EyeOff">EyeOff (Stealth)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Module functional description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider"
                >
                  ADD MODULE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  EDIT MODULE: {editingModule.name}
                </h3>
              </div>
              <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateModule} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">MODULE NAME</label>
                <input
                  type="text"
                  required
                  value={editingModule.name}
                  onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">VERSION</label>
                  <input
                    type="text"
                    value={editingModule.version}
                    onChange={(e) => setEditingModule({ ...editingModule, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 block mb-1">TAG</label>
                  <input
                    type="text"
                    value={editingModule.tag}
                    onChange={(e) => setEditingModule({ ...editingModule, tag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value={editingModule.description}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider"
                >
                  UPDATE MODULE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl cyber-glass p-6 border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)] bg-slate-950 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-white">
                CONFIRM DELETION
              </h3>
            </div>

            <p className="text-xs font-mono-code text-slate-300">
              Are you sure you want to permanently delete module <span className="text-rose-400 font-bold">{deletingModule.name}</span>? This action will be logged in the audit trail.
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
                DELETE MODULE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
