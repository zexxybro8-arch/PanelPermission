import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Terminal, Lock, 
  Zap, Cpu, Activity, Droplets, Crosshair, EyeOff,
  Flame, ChevronRight, ShieldCheck, LayoutDashboard, Radio, Shield,
  User, Copy, CheckCircle2
} from 'lucide-react';
import { UserProfile, CyberModule, AdminRuntimePlan, AdminLicense } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { PremiumPaymentModal } from './PremiumPaymentModal';
import { apiClient } from '../services/apiClient';
import { appStore } from '../store/appStore';

interface CyberDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenTerminal: () => void;
  onOpenAdmin?: () => void;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  'MOD-AEGIS-SENTINEL': Shield,
  'MOD-SPECTRE-FIREWALL': Flame,
  'MOD-NEURAL-VAULT': Lock,
  'MOD-CYBER-SCOUT': Radio,
  'angry-mod': Zap,
  'bala-mod-xyz': Flame,
  'gk-panel': Cpu,
  'rapid-core': Activity,
  'dripclint': Droplets,
  'xyz-cheats': Crosshair,
  'silent-cheats': EyeOff,
};

export const CyberDashboard: React.FC<CyberDashboardProps> = ({
  user,
  onLogout,
  onOpenTerminal,
  onOpenAdmin,
}) => {
  const [modules, setModules] = useState<CyberModule[]>([]);
  const [plans, setPlans] = useState<(AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[]>([]);
  const [userLicenses, setUserLicenses] = useState<AdminLicense[]>([]);
  const [upiQrImage, setUpiQrImage] = useState<string>('');
  const [activePaywallModule, setActivePaywallModule] = useState<CyberModule | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load live portal catalogue and personalized pricing from local store
  const loadPortalConfig = async () => {
    try {
      const config = await apiClient.getPortalConfig(user.id || user.username);
      setModules(config.modules);
      setPlans(config.plans);
      setUserLicenses(config.userLicenses || []);
      if (config.upiQrImage) setUpiQrImage(config.upiQrImage);
    } catch (err) {
      console.warn('Failed to load portal config:', err);
    }
  };

  useEffect(() => {
    loadPortalConfig();
    const unsubscribe = appStore.subscribe(() => {
      loadPortalConfig();
    });
    return () => unsubscribe();
  }, [user]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // ignore
    }
  };

  // Trigger Paywall whenever an ON/OFF toggle or REQUEST ACCESS is clicked
  const handleToggleModule = (module: CyberModule) => {
    cyberAudio.playScan();
    setActivePaywallModule(module);
    setIsPaywallOpen(true);
  };

  const handleClosePaywall = () => {
    setIsPaywallOpen(false);
    setActivePaywallModule(null);
    loadPortalConfig();
  };

  const isAdmin = user.role === 'admin' || user.clearanceLevel >= 5 || user.username === 'SAGAR551';

  // Calculate days remaining for customer
  const now = new Date();
  const expiryDate = user.expiry_date ? new Date(user.expiry_date) : null;
  const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 z-20 relative space-y-6"
    >
      {/* Top Header & Navigation Bar */}
      <div 
        className="w-full rounded-3xl cyber-glass p-5 sm:p-6 border border-cyan-500/25 shadow-[0_0_50px_-15px_rgba(0,242,254,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(13, 19, 32, 0.9) 0%, rgba(7, 10, 18, 0.96) 100%)',
        }}
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(900);
              onLogout();
            }}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/50 text-slate-300 hover:text-white transition-all cursor-pointer group shrink-0"
            title="Back to Authentication Gateway"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                COMMAND GATEWAY // AUTHENTICATED
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                OPERATOR: {user.username}
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
              ACCESS MODULES
            </h1>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Select a module to request access
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={() => {
                cyberAudio.playClick(1400);
                onOpenAdmin();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-extrabold text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-950" />
              <span>ADMIN PANEL</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1200);
              onOpenTerminal();
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono-code text-cyan-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">SYSTEM CONSOLE</span>
            <span className="sm:hidden">CONSOLE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(900);
              onLogout();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            BACK TO GATEWAY
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MY ACCOUNT / CUSTOMER CREDENTIALS & DETAILS CARD */}
      {/* ======================================================== */}
      <div 
        className="w-full rounded-3xl cyber-glass p-5 sm:p-6 border border-slate-800 bg-slate-950/80 shadow-[0_0_40px_-15px_rgba(0,242,254,0.15)] relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-bold text-white tracking-wide">
                MY ACCOUNT // {user.customer_id || user.username}
              </h2>
              <span className="text-[10px] font-mono-code text-slate-400">
                PERSONAL AUTHORIZED SUBSCRIPTION DETAILS
              </span>
            </div>
          </div>

          {copiedField && (
            <span className="text-[11px] font-mono-code text-emerald-400 flex items-center gap-1 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Copied {copiedField}!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-mono-code text-xs">
          {/* Customer ID */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">CUSTOMER ID</span>
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-cyan-300 truncate">
                {user.customer_id || user.id || 'N/A'}
              </span>
              {user.customer_id && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.customer_id!, 'Customer ID')}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300"
                  title="Copy Customer ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Username */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">USERNAME</span>
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-white truncate">
                {user.username}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(user.username, 'Username')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300"
                title="Copy Username"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">STATUS</span>
            <div>
              {user.status === 'blocked' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                  BLOCKED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Pricing & Expiry */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">PRICE & EXPIRY</span>
            <div className="text-cyan-300 font-bold">
              ₹{user.price || 120}
              {expiryDate && (
                <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                  ({daysRemaining !== null && daysRemaining >= 0 ? `${daysRemaining}d left` : 'Expired'})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Cyber Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {modules.map((mod, index) => {
          const IconComponent = MODULE_ICONS[mod.id] || MODULE_ICONS[mod.icon] || Shield;
          
          // Customer module assignment check
          const isCustomerModule = Array.isArray(user.assigned_modules) && user.assigned_modules.length > 0
            ? user.assigned_modules.includes(mod.id)
            : false;

          const hasLicense = isCustomerModule || userLicenses.some((lic) => lic.moduleId === mod.id && lic.status === 'active');

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-2xl cyber-glass p-5 border border-slate-800/90 hover:border-cyan-500/40 hover:shadow-[0_0_30px_-5px_rgba(0,242,254,0.2)] transition-all duration-300 relative group overflow-hidden flex flex-col justify-between"
              style={{
                background: 'linear-gradient(145deg, rgba(12, 17, 28, 0.85) 0%, rgba(7, 10, 16, 0.95) 100%)',
              }}
            >
              {/* Subtle top card glow line on hover */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-3">
                {/* Card Top: Icon, Name & Tag */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.2)] group-hover:scale-105 transition-transform shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-bold text-lg text-white tracking-wider group-hover:text-cyan-200 transition-colors">
                          {mod.name}
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono-code text-cyan-400/80">
                        {mod.tag} • v{mod.version}
                      </span>
                    </div>
                  </div>

                  {/* Animated ON/OFF Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-mono-code font-bold select-none ${hasLicense ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {hasLicense ? 'ON' : 'OFF'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleModule(mod)}
                      className={`w-12 h-6 rounded-full border p-0.5 transition-all duration-300 relative cursor-pointer focus:outline-none ${
                        hasLicense
                          ? 'bg-emerald-950/80 border-emerald-500/60'
                          : 'bg-slate-900 border-slate-700 hover:border-cyan-400/60'
                      }`}
                      title={hasLicense ? `Active license on ${mod.name}` : `Request access for ${mod.name}`}
                    >
                      {/* Toggle Knob */}
                      <motion.div
                        className={`w-4.5 h-4.5 rounded-full shadow-md flex items-center justify-center ${
                          hasLicense ? 'bg-emerald-400' : 'bg-slate-400 group-hover/toggle:bg-cyan-300'
                        }`}
                        animate={{ x: hasLicense ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <Lock className="w-2.5 h-2.5 text-slate-900" />
                      </motion.div>
                    </button>
                  </div>
                </div>

                {/* Neutral Description */}
                <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {/* Bottom Card Footer: Request Button / State */}
              <div className="pt-4 mt-3 border-t border-slate-900/90 flex items-center justify-between text-[11px] font-mono-code">
                {hasLicense ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AUTHORIZED RUNTIME ACTIVE
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                    REQUIRES ACCESS PASS
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleModule(mod)}
                  className="text-cyan-400 hover:text-cyan-200 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{hasLicense ? 'MANAGE RUNTIME' : 'REQUEST ACCESS'}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Simulated Premium Paywall Modal */}
      <PremiumPaymentModal
        module={activePaywallModule}
        isOpen={isPaywallOpen}
        onClose={handleClosePaywall}
        user={user}
        plans={plans}
        upiQrImage={upiQrImage}
      />
    </motion.div>
  );
};
