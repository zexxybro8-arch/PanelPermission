import React, { useState } from 'react';
import { 
  Settings, Shield, QrCode, Server, Clock, 
  Save, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import { SystemSettingsData } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminSettingsTabProps {
  settings: SystemSettingsData | null;
  onRefresh: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<SystemSettingsData>(
    settings || {
      gatewayVersion: '4.8.2-QUANTUM',
      maintenanceMode: false,
      requirePoW: true,
      defaultNode: 'SINGAPORE-01',
      upiQrImageUrl: 'https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg',
      sessionTimeoutHours: 48,
    }
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await apiClient.updateSettings(formData);
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to update system settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white tracking-wider">
              AEGIS CORE SYSTEM CONFIGURATION
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Control gateway security standards, UPI QR endpoints, and session TTL
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-6">
          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>SYSTEM CONFIGURATION PERSISTED &amp; PROPAGATED ACROSS ALL EDGES</span>
            </div>
          )}

          {/* UPI QR Endpoint */}
          <div className="space-y-2">
            <label className="text-xs font-mono-code font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              GLOBAL UPI PAYMENT QR IMAGE URL
            </label>
            <input
              type="url"
              required
              value={formData.upiQrImageUrl}
              onChange={(e) => setFormData({ ...formData, upiQrImageUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
            />
            <span className="text-[11px] font-mono-code text-slate-500 block">
              This image is served to users when they click &apos;PROCEED TO PAY&apos; on any module.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gateway Version */}
            <div className="space-y-2">
              <label className="text-xs font-mono-code font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                GATEWAY KERNEL VERSION
              </label>
              <input
                type="text"
                value={formData.gatewayVersion}
                onChange={(e) => setFormData({ ...formData, gatewayVersion: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
              />
            </div>

            {/* Session Timeout */}
            <div className="space-y-2">
              <label className="text-xs font-mono-code font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                SESSION TIMEOUT (HOURS)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={formData.sessionTimeoutHours}
                onChange={(e) => setFormData({ ...formData, sessionTimeoutHours: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          {/* Security Toggles */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-xs font-mono-code font-bold text-white block">
                  REQUIRE PROOF-OF-WORK (POW) HANDSHAKE
                </span>
                <span className="text-[11px] font-mono-code text-slate-400">
                  Mitigate automated brute-force attacks by requiring SHA-256 client puzzle verification
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.requirePoW}
                onChange={(e) => setFormData({ ...formData, requirePoW: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-xs font-mono-code font-bold text-white block">
                  MAINTENANCE GATEWAY LOCKOUT
                </span>
                <span className="text-[11px] font-mono-code text-slate-400">
                  Temporarily lock non-admin user portal logins during cluster upgrades
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.maintenanceMode}
                onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Save className="w-4 h-4 text-slate-950" />}
              <span>SAVE SYSTEM SETTINGS</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
