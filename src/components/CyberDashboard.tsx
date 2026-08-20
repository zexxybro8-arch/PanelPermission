import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Terminal, Lock, 
  Zap, Cpu, Activity, Droplets, Crosshair, EyeOff,
  Flame, ChevronRight, ShieldCheck, LayoutDashboard, Radio, Shield,
  User, Copy, CheckCircle2, ImageIcon, FileText, Settings
} from 'lucide-react';
import { UserProfile, CyberModule, AdminRuntimePlan, AdminLicense, PanelPermissionState } from '../types';
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
  'mod-1': Flame,
  'mod-2': Zap,
  'mod-3': Cpu,
  'mod-4': Activity,
  'mod-5': Droplets,
  'mod-6': Crosshair,
  'mod-7': EyeOff,
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
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const [lockedAlert, setLockedAlert] = useState<{ moduleName: string; type: 'VERIFY' | 'FILES' | 'SETUP'; reason?: string } | null>(null);
  const [activeVerifyModule, setActiveVerifyModule] = useState<CyberModule | null>(null);
  const [activeFilesModule, setActiveFilesModule] = useState<CyberModule | null>(null);
  const [activeSetupModule, setActiveSetupModule] = useState<CyberModule | null>(null);

  const [livePermissions, setLivePermissions] = useState<Record<string, PanelPermissionState>>({});
  const [liveCustomer, setLiveCustomer] = useState<any>(null);

  const handleOptionClick = (mod: CyberModule, type: 'VERIFY' | 'FILES' | 'SETUP', isAllowed: boolean, reason?: string) => {
    cyberAudio.playClick();
    if (!isAllowed) {
      setLockedAlert({ moduleName: mod.name, type, reason });
      return;
    }
    if (type === 'VERIFY') setActiveVerifyModule(mod);
    else if (type === 'FILES') setActiveFilesModule(mod);
    else if (type === 'SETUP') setActiveSetupModule(mod);
  };

  // Load live portal catalogue and personalized pricing from local store / server
  const loadPortalConfig = async () => {
    try {
      const config = await apiClient.getPortalConfig(user.id || user.customer_id || user.username);
      setModules(config.modules || []);
      setPlans(config.plans || []);
      setUserLicenses(config.userLicenses || []);
      if (config.upiQrImage) setUpiQrImage(config.upiQrImage);
      if (config.panel_permissions) {
        setLivePermissions(config.panel_permissions);
        console.log('[CUSTOMER LOAD PERMISSIONS]', {
          customerId: user.customer_id || user.id || user.username,
          loadedPermissions: config.panel_permissions,
        });
      }
      if (config.customer) {
        setLiveCustomer(config.customer);
      }
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

  // Strictly enforce role check: only verified admin SAGAR551 with valid admin token
  const isAdmin = user.role === 'admin' && user.username === 'SAGAR551' && !!apiClient.getAdminToken();

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
              ACCESS PANELS
            </h1>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Select a panel to access
            </p>
          </div>
        </div>

        {/* Top Action Buttons (Admin Panel button strictly hidden for customers) */}
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

      {/* Grid of Cyber Panels */}
      {modules.length === 0 ? (
        <div className="p-12 rounded-3xl cyber-glass border border-slate-800 bg-slate-950/70 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">NO ACCESS PANELS ASSIGNED</h3>
          <p className="text-xs font-mono-code text-slate-400 max-w-md mx-auto">
            No access panels have been assigned to your customer account yet. Please contact the administrator to grant panel authorization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {modules.map((mod, index) => {
            const IconComponent = MODULE_ICONS[mod.id] || MODULE_ICONS[mod.icon] || Shield;
            
            // Customer module assignment check
            const isCustomerModule = Array.isArray(user.assigned_modules) && user.assigned_modules.length > 0
              ? user.assigned_modules.includes(mod.id)
              : true;

            const hasLicense = isCustomerModule || userLicenses.some((lic) => lic.moduleId === mod.id && lic.status === 'active');
            const hasValidImage = !!mod.imageUrl && !imageErrorMap[mod.id];

            const isBlocked = (liveCustomer?.status || user.status) === 'blocked';
            const isExpired = daysRemaining !== null && daysRemaining < 0;

            const rawPerms = (livePermissions && livePermissions[mod.id]) || user.panel_permissions?.[mod.id] || {
              verify_access: false,
              files_access: false,
              setup_access: false,
              purchased: false,
              payment_status: 'none',
            };

            const verifyUnlocked = Boolean(rawPerms.verify_access) === true;
            const filesUnlocked = Boolean(rawPerms.files_access) === true;
            const setupUnlocked = Boolean(rawPerms.setup_access) === true;

            const panelPerms = {
              verify_access: !isBlocked && !isExpired && verifyUnlocked,
              files_access: !isBlocked && !isExpired && filesUnlocked,
              setup_access: !isBlocked && !isExpired && setupUnlocked,
              purchased: Boolean(rawPerms.purchased),
              payment_status: rawPerms.payment_status || (rawPerms.purchased ? 'approved' : 'none'),
            };

            console.log('[ACCESS CHECK]', {
              customerId: user.customer_id || user.id || user.username,
              panelId: mod.id,
              panelName: mod.name,
              VERIFY: panelPerms.verify_access,
              FILES: panelPerms.files_access,
              SETUP: panelPerms.setup_access,
            });

            const blockReason = isBlocked
              ? 'ACCOUNT BLOCKED: Please contact administrator.'
              : isExpired
              ? 'SUBSCRIPTION EXPIRED: Please renew runtime plan.'
              : 'Contact administrator to request access.';

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

                <div className="space-y-4">
                  {/* Card Top: Visual Panel Image / Icon, Name & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Image or Icon Preview */}
                      <div className="relative w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.2)] group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                        {hasValidImage ? (
                          <img
                            src={mod.imageUrl}
                            alt={mod.name}
                            className="w-full h-full object-cover rounded-xl"
                            onError={() => setImageErrorMap(prev => ({ ...prev, [mod.id]: true }))}
                          />
                        ) : (
                          <IconComponent className="w-6 h-6" />
                        )}
                      </div>                       <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display font-bold text-lg text-white tracking-wider group-hover:text-cyan-200 transition-colors">
                            {mod.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono-code text-cyan-400/80">
                            {mod.tag} • v{mod.version}
                          </span>
                          {typeof mod.price === 'number' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                              ₹{mod.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Restored Panel Description */}
                  {mod.description && (
                    <p className="text-xs text-slate-300 font-mono-code leading-relaxed line-clamp-3 mt-1.5">
                      {mod.description}
                    </p>
                  )}

                  {/* FOUR MAIN OPTIONS: VERIFY, FILES, SETUP, BUY (2x2 Layout) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/80">
                    {/* ROW 1 - LEFT: VERIFY */}
                    <button
                      type="button"
                      onClick={() => handleOptionClick(mod, 'VERIFY', panelPerms.verify_access, blockReason)}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-mono-code font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:ring-offset-1 focus:ring-offset-slate-950 cursor-pointer ${
                        panelPerms.verify_access
                          ? 'bg-slate-900/90 hover:bg-slate-800/90 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_0_12px_rgba(0,242,254,0.18)]'
                          : 'bg-slate-950/70 hover:bg-slate-900/80 text-slate-400 border-slate-800/90 hover:border-slate-700 hover:text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                      }`}
                      title={panelPerms.verify_access ? 'Verify Panel' : 'Access Locked'}
                    >
                      {panelPerms.verify_access ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span>VERIFY</span>
                    </button>

                    {/* ROW 1 - RIGHT: FILES */}
                    <button
                      type="button"
                      onClick={() => handleOptionClick(mod, 'FILES', panelPerms.files_access, blockReason)}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-mono-code font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:ring-offset-1 focus:ring-offset-slate-950 cursor-pointer ${
                        panelPerms.files_access
                          ? 'bg-slate-900/90 hover:bg-slate-800/90 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_0_12px_rgba(0,242,254,0.18)]'
                          : 'bg-slate-950/70 hover:bg-slate-900/80 text-slate-400 border-slate-800/90 hover:border-slate-700 hover:text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                      }`}
                      title={panelPerms.files_access ? 'Panel Files' : 'Access Locked'}
                    >
                      {panelPerms.files_access ? (
                        <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span>FILES</span>
                    </button>

                    {/* ROW 2 - LEFT: SETUP */}
                    <button
                      type="button"
                      onClick={() => handleOptionClick(mod, 'SETUP', panelPerms.setup_access, blockReason)}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-mono-code font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:ring-offset-1 focus:ring-offset-slate-950 cursor-pointer ${
                        panelPerms.setup_access
                          ? 'bg-slate-900/90 hover:bg-slate-800/90 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_0_12px_rgba(0,242,254,0.18)]'
                          : 'bg-slate-950/50 hover:bg-slate-900/60 text-slate-500 border-slate-850/60 hover:border-slate-800 opacity-60 hover:opacity-85 shadow-none'
                      }`}
                      title={panelPerms.setup_access ? 'Panel Setup' : 'Access Locked / Unavailable'}
                    >
                      {panelPerms.setup_access ? (
                        <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Settings className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span>SETUP</span>
                    </button>

                    {/* ROW 2 - RIGHT: BUY (Primary CTA) */}
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playClick();
                        setActivePaywallModule(mod);
                        setIsPaywallOpen(true);
                      }}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-mono-code font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:ring-offset-1 focus:ring-offset-slate-950 cursor-pointer group/buy ${
                        panelPerms.purchased && panelPerms.payment_status === 'approved'
                          ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 hover:from-cyan-900 hover:to-slate-850 text-cyan-200 border-cyan-500/60 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.2)] hover:shadow-[0_0_18px_rgba(0,242,254,0.35)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : panelPerms.purchased && panelPerms.payment_status === 'pending'
                          ? 'bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-500/50 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_18px_rgba(245,158,11,0.35)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-cyan-300/50 hover:border-cyan-200 shadow-[0_0_14px_rgba(0,242,254,0.25)] hover:shadow-[0_0_22px_rgba(0,242,254,0.45)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                      }`}
                      title="Purchase Panel"
                    >
                      <Zap className={`w-3.5 h-3.5 shrink-0 ${
                        panelPerms.purchased && panelPerms.payment_status === 'pending'
                          ? 'text-amber-400'
                          : 'text-cyan-200 fill-cyan-200/30'
                      }`} />
                      <span>
                        {panelPerms.purchased && panelPerms.payment_status === 'approved'
                          ? 'BUY AGAIN'
                          : panelPerms.purchased && panelPerms.payment_status === 'pending'
                          ? 'PENDING'
                          : 'BUY'}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Simulated Premium Paywall Modal */}
      <PremiumPaymentModal
        module={activePaywallModule}
        isOpen={isPaywallOpen}
        onClose={handleClosePaywall}
        user={user}
        plans={plans}
        upiQrImage={upiQrImage}
      />

      {/* Locked Access Alert Modal */}
      {lockedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 w-full max-w-sm text-slate-100 font-mono-code text-xs shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/60 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wide">
                  {lockedAlert.type} ACCESS IS CURRENTLY LOCKED
                </h3>
                <span className="text-[10px] text-amber-400/80 font-mono-code">
                  {lockedAlert.moduleName}
                </span>
              </div>
            </div>
            <p className="text-amber-200/90 leading-relaxed mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {lockedAlert.reason || 'Contact administrator to request access.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLockedAlert(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Access Modal */}
      {activeVerifyModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 w-full max-w-md text-slate-100 font-mono-code text-xs shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">VERIFY: {activeVerifyModule.name}</h3>
                  <span className="text-[10px] text-emerald-400">STATUS: VERIFIED SECURE & AUTHORIZED</span>
                </div>
              </div>
              <button onClick={() => setActiveVerifyModule(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-4">
              <div className="flex justify-between"><span className="text-slate-400">Panel ID:</span><span className="text-cyan-300">{activeVerifyModule.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Signature:</span><span className="text-emerald-400">SHA-256 VALIDATED</span></div>
              <div className="flex justify-between"><span className="text-slate-400">License Status:</span><span className="text-emerald-400">ACTIVE & UNLOCKED</span></div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setActiveVerifyModule(null)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Files Access Modal */}
      {activeFilesModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 w-full max-w-md text-slate-100 font-mono-code text-xs shadow-[0_0_50px_rgba(0,242,254,0.3)]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">FILES: {activeFilesModule.name}</h3>
                  <span className="text-[10px] text-cyan-400">SECURE ASSET REPOSITORY</span>
                </div>
              </div>
              <button onClick={() => setActiveFilesModule(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-4">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>payload_core.bin</span>
                <span className="text-cyan-400 font-bold">READY</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>config_auth.json</span>
                <span className="text-cyan-400 font-bold">READY</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setActiveFilesModule(null)} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Access Modal */}
      {activeSetupModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 w-full max-w-md text-slate-100 font-mono-code text-xs shadow-[0_0_50px_rgba(0,242,254,0.3)]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">SETUP: {activeSetupModule.name}</h3>
                  <span className="text-[10px] text-cyan-400">INITIALIZATION & CONFIGURATION</span>
                </div>
              </div>
              <button onClick={() => setActiveSetupModule(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-4 text-slate-300">
              <p>1. Ensure system architecture matches v{activeSetupModule.version}.</p>
              <p>2. Load environmental tokens into secure memory.</p>
              <p>3. Execute handshake command.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setActiveSetupModule(null)} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
