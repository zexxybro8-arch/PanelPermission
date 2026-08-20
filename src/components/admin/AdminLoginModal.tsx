import React, { useState } from 'react';
import { ShieldAlert, Key, User, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminLoginModalProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiClient.adminLogin(username.trim(), password.trim());
      onSuccess(data.user);
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err, 'INVALID ADMIN CREDENTIALS');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl cyber-glass p-8 border border-cyan-500/40 shadow-[0_0_80px_rgba(0,242,254,0.25)] bg-slate-950/95 space-y-6 relative overflow-hidden">
        {/* Neon top line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 shadow-[0_0_15px_rgba(0,242,254,0.8)]" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,242,254,0.3)]">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="font-display font-black text-xl text-white tracking-widest uppercase">
            ADMINISTRATIVE COMMAND LOGIN
          </h2>
          <p className="text-xs font-mono-code text-cyan-400/80">
            ENTER ROOT CREDENTIALS TO ACCESS SYSTEM LEVEL 5
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-code flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono-code font-bold text-slate-300 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              ADMINISTRATOR ID
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Admin ID"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono-code text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono-code font-bold text-slate-300 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              MASTER PASS KEY
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Admin Password"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono-code text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-mono-code text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← RETURN TO USER PORTAL
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-display font-extrabold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-950 font-bold" />
              )}
              <span>AUTHORIZE LEVEL 5</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
