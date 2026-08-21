import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Shield, User, X, Copy, CheckCircle2, Award, 
  ShieldAlert, Calendar, Clock, MapPin, Monitor, Key, RefreshCw,
  Menu, LogOut, Terminal, LayoutDashboard, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, GeneratedKeyRecord } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { apiClient } from '../services/apiClient';
import { appStore } from '../store/appStore';

interface CyberHeaderProps {
  onOpenAdminLogin: () => void;
  user?: UserProfile | null;
  onLogout?: () => void;
  onOpenTerminal?: () => void;
  onOpenAdmin?: () => void;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onOpenAdminLogin,
  user,
  onLogout,
  onOpenTerminal,
  onOpenAdmin,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMyKeysOpen, setIsMyKeysOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [userKeys, setUserKeys] = useState<GeneratedKeyRecord[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (isMyKeysOpen && user) {
      setIsLoadingKeys(true);
      const targetUserId = user.customer_id || user.id || user.username;

      const fetchAndSortKeys = async () => {
        try {
          const keys = await apiClient.getGeneratedKeys(targetUserId);
          const sorted = (keys || []).slice().sort((a, b) => {
            const getTs = (rec: GeneratedKeyRecord) => {
              const dateVal = rec.createdAt || (rec as any).generatedAt || (rec as any).purchasedAt;
              if (!dateVal) return 0;
              const time = new Date(dateVal).getTime();
              return isNaN(time) ? 0 : time;
            };
            const timeA = getTs(a);
            const timeB = getTs(b);
            if (timeB !== timeA) {
              return timeB - timeA; // Newest first at top
            }
            return (b.id || '').localeCompare(a.id || '');
          });
          setUserKeys(sorted);
        } catch (err) {
          console.warn('Failed to fetch user keys:', err);
        } finally {
          setIsLoadingKeys(false);
        }
      };

      fetchAndSortKeys();

      const unsubscribe = appStore.subscribe(() => {
        fetchAndSortKeys();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isMyKeysOpen, user]);

  const handleCopyValue = async (val: string, recordId: string, type: 'key' | 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(val);
      cyberAudio.playClick(600);
      setCopiedKeyId(`${recordId}-${type}`);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isProfileOpen || isMyKeysOpen || isUserMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileOpen, isMyKeysOpen, isUserMenuOpen]);

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
        /* Authenticated Operator Header: THREE-LINE MENU -> USER LOGO -> USER TEXT */
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. THREE-LINE / HAMBURGER MENU CONTROL BUTTON (FIRST) */}
          <button
            type="button"
            id="user-3-line-menu-btn"
            onClick={() => {
              cyberAudio.playClick(1100);
              setIsUserMenuOpen((prev) => !prev);
            }}
            className={`p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.2)] ${
              isUserMenuOpen
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/80 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                : 'border-cyan-500/40 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-slate-800'
            }`}
            title="Toggle User Menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 2 & 3. USER PROFILE LOGO/AVATAR (SECOND) -> USER NAME TEXT (THIRD) */}
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1000);
              setIsUserMenuOpen((prev) => !prev);
            }}
            className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer text-left bg-transparent border-0 p-0 outline-none focus:outline-none"
            title="Open User Menu"
          >
            {/* 2. User Profile Avatar Logo */}
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/95 border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(0,242,254,0.6)] shrink-0">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-sm" />
              <span className="text-lg sm:text-xl select-none relative z-10 filter drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]">👤</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
            </div>

            {/* 3. User Name Text */}
            <div className="font-mono-code leading-none">
              <div className="font-display font-black text-base sm:text-xl tracking-widest text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2 uppercase">
                <span>USER</span>
                <span className="text-cyan-500 font-bold">-</span>
                <span className="text-cyan-300 drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">{user.customer_id || user.id || 'CUST-UNKNOWN'}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider mt-1 font-bold uppercase">
                AUTHENTICATED GATEWAY OPERATOR
              </p>
            </div>
          </button>
        </div>
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

      {/* Right status capsule - Only shown if NO authenticated user */}
      {!user && (
        <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-medium hidden sm:inline">SECURE GATEWAY</span>
            <span className="text-cyan-300 font-medium sm:hidden">ACTIVE</span>
          </div>
        </div>
      )}

      {/* 3-LINE USER MENU DROPDOWN / NAVIGATION POPOVER */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isUserMenuOpen && user && (
            <div className="fixed inset-0 z-[9990] flex items-start justify-start p-4 sm:p-6 overflow-hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsUserMenuOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9989] cursor-pointer"
              />

              {/* Menu Container */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative z-[9990] w-full max-w-sm rounded-2xl cyber-glass p-5 border border-cyan-500/40 shadow-[0_0_40px_rgba(0,242,254,0.3)] bg-slate-950 space-y-4 mt-16 sm:mt-20"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-display font-bold text-xs text-cyan-300 tracking-wider uppercase">
                      OPERATOR MENU // {user.customer_id || user.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 font-mono-code text-xs">
                  {/* USER PROFILE Option */}
                  <button
                    type="button"
                    id="menu-user-profile-btn"
                    onClick={() => {
                      cyberAudio.playClick(1000);
                      setIsUserMenuOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-slate-900/80 hover:from-cyan-900/90 hover:to-slate-800/90 border border-cyan-500/40 hover:border-cyan-400 text-left flex items-center justify-between transition-all group cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-900/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-display font-bold text-sm text-white block uppercase group-hover:text-cyan-200 tracking-wider">
                          USER PROFILE
                        </span>
                        <span className="text-[10px] text-cyan-400/80 block font-mono-code">
                          View Account Profile
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* MY KEYS Option */}
                  <button
                    type="button"
                    id="menu-my-keys-btn"
                    onClick={() => {
                      cyberAudio.playClick(1100);
                      setIsUserMenuOpen(false);
                      setIsMyKeysOpen(true);
                    }}
                    className="w-full p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-400 text-left flex items-center justify-between transition-all group cursor-pointer shadow-[0_0_10px_rgba(0,242,254,0.1)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-display font-bold text-sm text-white block uppercase group-hover:text-cyan-200 tracking-wider">
                          MY KEYS
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono-code">
                          View Purchased Panels &amp; Generated Access
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* SYSTEM CONSOLE Option */}
                  {onOpenTerminal && (
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playClick(1200);
                        setIsUserMenuOpen(false);
                        onOpenTerminal();
                      }}
                      className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-display font-bold text-xs text-slate-200 block uppercase group-hover:text-cyan-300">
                            SYSTEM CONSOLE
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Diagnostics &amp; Real-time Logs
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  {/* ADMIN PANEL Option */}
                  {onOpenAdmin && user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playClick(1400);
                        setIsUserMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-display font-bold text-xs text-cyan-300 block uppercase">
                            ADMIN PANEL
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Manage System &amp; Customers
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  {/* LOGOUT Option */}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playClick(900);
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full p-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 hover:border-rose-500/60 text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-display font-bold text-xs text-rose-300 block uppercase">
                            BACK TO GATEWAY / LOGOUT
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Exit Secure Session
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* USER PROFILE MODAL */}
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
                className="relative w-full max-w-xl rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-6 my-auto max-h-[85dvh] sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden z-[9999]"
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
                        USER PROFILE
                      </h3>
                      <p className="text-[10px] font-mono-code text-slate-400 tracking-wider">
                        SECURE USER DETAILS &amp; MY KEYS HISTORY
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

                {/* USER PROFILE — DETAILS ONLY */}
                <div className="space-y-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/90 relative overflow-hidden">
                  {/* Profile Avatar / Status Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left relative overflow-hidden">
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

                  {/* User Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono-code text-xs text-left">
                    {/* Customer ID */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
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
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
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
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">PLAN / SUBSCRIPTION</span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="truncate">AEGIS CORE PLAN</span>
                      </div>
                    </div>

                    {/* Price / Billing Rate */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">BILLING PRICE</span>
                      <div className="font-bold text-cyan-300 flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-normal">₹</span>
                        <span>{user.price || 120}</span>
                      </div>
                    </div>

                    {/* Expiry / Remaining Days */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative sm:col-span-2">
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
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">NODE REGION</span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{user.nodeRegion || 'Asia-SE'}</span>
                      </div>
                    </div>

                    {/* Assigned Terminal */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">SECURE TERMINAL ID</span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="truncate">{user.terminalId || 'N/A'}</span>
                      </div>
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
                    <span>CLOSE USER PROFILE</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* MY KEYS DEDICATED MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMyKeysOpen && user && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
              {/* Fixed Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  cyberAudio.playClick(900);
                  setIsMyKeysOpen(false);
                }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md z-[9998] cursor-pointer"
              />

              {/* Modal Body Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-xl rounded-3xl cyber-glass p-6 sm:p-7 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,242,254,0.25)] bg-slate-950 space-y-6 my-auto max-h-[85dvh] sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden z-[9999]"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />

                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white tracking-wide uppercase">
                        MY KEYS
                      </h3>
                      <p className="text-[10px] font-mono-code text-slate-400 tracking-wider">
                        PURCHASED PANELS &amp; GENERATED ACCESS HISTORY
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-code px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                      {userKeys.length} {userKeys.length === 1 ? 'RECORD' : 'RECORDS'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playClick(900);
                        setIsMyKeysOpen(false);
                      }}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Close My Keys"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* MY KEYS CONTENT */}
                <div className="space-y-3.5">
                  {isLoadingKeys ? (
                    <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 font-mono-code text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading access history...</span>
                    </div>
                  ) : userKeys.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                        <Key className="w-6 h-6" />
                      </div>
                      <p className="font-display font-bold text-base text-slate-300">No Keys Found</p>
                      <p className="text-xs font-mono-code text-slate-500 max-w-xs mx-auto">
                        Your purchased panel access credentials will be saved and shown here automatically after a successful purchase.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[50dvh] overflow-y-auto pr-1">
                      {userKeys.map((k) => {
                        const idVal = k.generatedId || k.credentials?.id || k.key;
                        const passVal = k.generatedPassword || k.credentials?.password || '';
                        const isIdCopied = copiedKeyId === `${k.id}-id`;
                        const isPassCopied = copiedKeyId === `${k.id}-password`;

                        const isKeyExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
                        const statusBadge = k.status === 'revoked' ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                            REVOKED
                          </span>
                        ) : isKeyExpired ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        );

                        return (
                          <div
                            key={k.id}
                            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 text-left relative group shadow-md"
                          >
                            {/* Card Top: Panel Logo, Panel Name, Duration, Status */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-display font-bold text-sm text-white truncate">
                                    {k.panelName || 'AEGIS PANEL'}
                                  </h5>
                                  <span className="text-[10px] font-mono-code text-cyan-400/90 block">
                                    PACKAGE / DURATION: {k.duration || '30 DAYS'}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {statusBadge}
                              </div>
                            </div>

                            {/* Credentials Grid: Access ID & Access Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono-code">
                              {/* Access ID */}
                              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] text-slate-500 block uppercase font-bold">ACCESS ID</span>
                                  <span className="font-bold text-cyan-300 text-xs break-all block select-all">
                                    {idVal}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyValue(idVal, k.id, 'id')}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono-code flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                  title="Copy Access ID"
                                >
                                  {isIdCopied ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">COPIED ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="font-bold">COPY ID</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Access Password */}
                              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] text-slate-500 block uppercase font-bold">ACCESS PASSWORD</span>
                                  <span className="font-bold text-white text-xs break-all block select-all">
                                    {passVal}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyValue(passVal, k.id, 'password')}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono-code flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                  title="Copy Access Password"
                                >
                                  {isPassCopied ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">COPIED ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="font-bold">COPY PASSWORD</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Purchase & Expiry dates */}
                            <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1.5 border-t border-slate-800/60">
                              <span>PURCHASED: {new Date(k.createdAt).toLocaleDateString()}</span>
                              <span>
                                EXPIRES: {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'LIFETIME'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playClick(900);
                      setIsMyKeysOpen(false);
                    }}
                    className="w-full py-3 px-6 rounded-xl font-display font-bold tracking-widest text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>CLOSE MY KEYS</span>
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
