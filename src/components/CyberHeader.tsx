import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';

interface CyberHeaderProps {
  onOpenAdminLogin: () => void;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onOpenAdminLogin,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcString = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setTimeStr(utcString);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-row items-center justify-between gap-4 z-20 relative">
      {/* Brand Identity - Clicking AEGIS logo opens ADMIN PANEL LOGIN */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="aegis-brand-logo-btn"
          onClick={() => {
            cyberAudio.playClick(1200);
            onOpenAdminLogin();
          }}
          className="flex items-center gap-3 group cursor-pointer text-left bg-transparent border-0 p-0 outline-none"
          title="VERIFY // BUY Core Gateway (Click to open Admin Command Login)"
        >
          {/* Holographic Gateway Emblem */}
          <div className="relative w-10 h-10 rounded-xl bg-slate-900/90 border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] transition-transform duration-300 group-hover:scale-105 group-hover:border-cyan-400">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm" />
            <Shield className="w-5 h-5 text-cyan-400 relative z-10" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg sm:text-xl tracking-widest text-white group-hover:text-cyan-200 transition-colors">
                VERIFY <span className="text-cyan-400 font-light">//</span> BUY
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                v4.8
              </span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-400 tracking-wider">
              VERIFY AND PURCHASE KEY GATEWAY
            </p>
          </div>
        </button>
      </div>

      {/* Center Live UTC Clock */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full cyber-glass border border-slate-800/80 text-xs font-mono-code text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-slate-300 font-medium">SYSTEM ONLINE</span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-cyan-300 font-semibold">{timeStr || 'SYNCHRONIZING...'}</span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 font-medium hidden sm:inline">SECURE GATEWAY</span>
          <span className="text-cyan-300 font-medium sm:hidden">ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
