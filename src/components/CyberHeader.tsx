import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Shield, User, X, Copy, CheckCircle2, Award, 
  ShieldAlert, Calendar, Clock, MapPin, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { cyberAudio } from '../utils/cyberAudio';

interface CyberHeaderProps {
  onOpenAdminLogin: () => void;
  user?: UserProfile | null;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onOpenAdminLogin,
  user,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileOpen]);

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const now = new Date();
  const expiryDate = user?.expiry_date ? new Date(user.expiry_date) : null;
  const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-row items-center justify-between gap-2 sm:gap-4 z-20 relative">
      {user ? (
        /* Authenticated Large Profile Header in the same position as the old branding logo */
        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick(1000);
            setIsProfileOpen(true);
          }}
          className="flex items-center gap-3 sm:gap-4 group cursor-pointer text-left bg-transparent border-0 p-0 outline-none focus:outline-none"
          title="Open Secure Profile Details"
        >
          {/* Large User Profile Icon */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900/95 border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(0,242,254,0.6)] shrink-0">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-sm" />
            <span className="text-xl sm:text-2xl select-none relative z-10 filter drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]">👤</span>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
          </div>

          <div className="font-mono-code leading-none">
            <div className="font-display font-black text-lg sm:text-2xl tracking-widest text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2 uppercase">
              <span>USER</span>
              <span className="text-cyan-500 font-bold">-</span>
              <span className="text-cyan-300 drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">{user.customer_id || user.id || 'CUST-UNKNOWN'}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider mt-1.5 font-bold uppercase">
              AUTHENTICATED GATEWAY OPERATOR // STATUS SECURE
            </p>
          </div>
        </button>
      ) : (
        /* Brand Identity - Only shown if NO authenticated user (Clicking AEGIS logo opens ADMIN PANEL LOGIN) */
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="aegis-brand-logo-btn"
            onClick={() => {
              cyberAudio.playClick(1200);
              onOpenAdminLogin();
            }}
            className="flex items-center gap-2 sm:gap-3 group cursor-pointer text-left bg-transparent border-0 p-0 outline-none"
            title="VERIFY // BUY Core Gateway (Click to open Admin Command Login)"
          >
            {/* Holographic Gateway Emblem */}
            <div className="relative w-10 h-10 rounded-xl bg-slate-900/90 border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] transition-transform duration-300 group-hover:scale-105 group-hover:border-cyan-400">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm" />
              <Shield className="w-5 h-5 text-cyan-400 relative z-10" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-bold text-base sm:text-lg md:text-xl tracking-widest text-white group-hover:text-cyan-200 transition-colors uppercase">
                  VERIFY <span className="text-cyan-400 font-light">//</span> BUY
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  v4.8
                </span>
              </div>
              <p className="text-[10px] font-mono-code text-slate-400 tracking-wider hidden min-[360px]:block">
                VERIFY AND PURCHASE KEY GATEWAY
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Center Live UTC Clock - Only shown if NO authenticated user */}
      {!user && (
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
      )}

      {/* Right status capsule / placeholder for desktop spacing balancing - Only shown if NO authenticated user */}
      {!user && (
        <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-medium hidden sm:inline">SECURE GATEWAY</span>
            <span className="text-cyan-300 font-medium sm:hidden">ACTIVE</span>
          </div>
        </div>
      )}

      {/* PROFESSIONAL PROFILE MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isProfileOpen && user && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
              {/* Fixed Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  cyberAudio.playClick(900);
                  setIsProfileOpen(false);
                }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md z-[9998] cursor-pointer"
              />

              {/* Modal Body Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-lg rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-6 my-auto max-h-[85dvh] sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden z-[9999]"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />

                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white tracking-wide uppercase">
                        SECURE PROFILE
                      </h3>
                      <p className="text-[10px] font-mono-code text-slate-400 tracking-wider">
                        CRYPTOGRAPHIC ACCOUNT CREDENTIALS
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playClick(900);
                      setIsProfileOpen(false);
                    }}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Close Profile"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Avatar / Status Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left relative overflow-hidden">
                  <div className="relative w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
                    <span className="text-3xl select-none">👤</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                      {user.clearanceLevel || 3}
                    </div>
                  </div>

                  <div className="space-y-1 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-display font-black text-xl text-white truncate">
                        {user.username}
                      </span>
                      <div className="shrink-0">
                        {user.status === 'blocked' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                            <ShieldAlert className="w-3 h-3" />
                            BLOCKED
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-amber-950 text-amber-400 border border-amber-500/40">
                            <ShieldAlert className="w-3 h-3 animate-pulse" />
                            EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] font-mono-code text-cyan-400/80 uppercase tracking-widest flex items-center gap-1 justify-center sm:justify-start">
                      <Award className="w-3.5 h-3.5" />
                      Clearance Level: {user.clearanceLevel || 3} [OPERATOR]
                    </p>
                  </div>
                </div>

                {copiedField && (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-code text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Copied {copiedField} to clipboard!
                    </span>
                  </div>
                )}

                {/* Info Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono-code text-xs text-left">
                  {/* Customer ID */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">CUSTOMER ID</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-cyan-300 truncate">
                        {user.customer_id || user.id || 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          cyberAudio.playClick(600);
                          copyToClipboard(user.customer_id || user.id || 'N/A', 'Customer ID');
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Copy Customer ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Secure Codename */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">CODENAME</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-white truncate">
                        {user.codename || 'OPERATOR'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          cyberAudio.playClick(600);
                          copyToClipboard(user.codename || 'OPERATOR', 'Codename');
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Copy Codename"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subscription Plan Name */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">PLAN / SUBSCRIPTION</span>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate">AEGIS CORE PLAN</span>
                    </div>
                  </div>

                  {/* Price / Billing Rate */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">BILLING PRICE</span>
                    <div className="font-bold text-cyan-300 flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-normal">₹</span>
                      <span>{user.price || 120}</span>
                    </div>
                  </div>

                  {/* Expiry / Remaining Days */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">EXPIRATION CALENDAR</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>
                          {user.expiry_date ? new Date(user.expiry_date).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      {daysRemaining !== null && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isExpired 
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : daysRemaining <= 3
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isExpired ? 'EXPIRED' : `${daysRemaining} DAYS REMAINING`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Secure Node region */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">NODE REGION</span>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{user.nodeRegion || 'Asia-SE'}</span>
                    </div>
                  </div>

                  {/* Assigned Terminal */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1 relative">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">SECURE TERMINAL ID</span>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate">{user.terminalId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playClick(900);
                      setIsProfileOpen(false);
                    }}
                    className="w-full py-3 px-6 rounded-xl font-display font-bold tracking-widest text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>CLOSE CORE PROFILE</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
};
