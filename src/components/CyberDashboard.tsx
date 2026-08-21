import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Terminal, Lock, 
  Zap, Cpu, Activity, Droplets, Crosshair, EyeOff,
  Flame, ChevronRight, ShieldCheck, LayoutDashboard, Radio, Shield,
  User, Copy, CheckCircle2, ImageIcon, FileText, Settings, Key, Check,
  Sparkles, RefreshCw, AlertCircle, ShieldAlert
} from 'lucide-react';
import { UserProfile, CyberModule, AdminRuntimePlan, AdminLicense, PanelPermissionState, GeneratedKeyRecord, VerifyKeyResult } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { PremiumPaymentModal } from './PremiumPaymentModal';
import { apiClient } from '../services/apiClient';
import { appStore } from '../store/appStore';
import { PanelFilesView } from './panel/PanelFilesView';
import { PanelSetupView } from './panel/PanelSetupView';

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

  // Credential verification states
  const [verifyIdInput, setVerifyIdInput] = useState<string>('');
  const [verifyPasswordInput, setVerifyPasswordInput] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<VerifyKeyResult | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [panelKeys, setPanelKeys] = useState<GeneratedKeyRecord[]>([]);

  const [livePermissions, setLivePermissions] = useState<Record<string, PanelPermissionState>>({});
  const [liveCustomer, setLiveCustomer] = useState<any>(null);

  const handleOptionClick = (mod: CyberModule, type: 'VERIFY' | 'FILES' | 'SETUP', isAllowed: boolean, reason?: string) => {
    cyberAudio.playClick();
    if (!isAllowed) {
      setLockedAlert({ moduleName: mod.name, type, reason });
      return;
    }
    if (type === 'VERIFY') {
      openVerifyModal(mod);
    } else if (type === 'FILES') {
      setActiveFilesModule(mod);
    } else if (type === 'SETUP') {
      setActiveSetupModule(mod);
    }
  };

  const openVerifyModal = async (mod: CyberModule, prefillId?: string, prefillPassword?: string) => {
    setActiveVerifyModule(mod);
    setVerifyResult(null);
    setVerifyIdInput(prefillId || '');
    setVerifyPasswordInput(prefillPassword || '');
    const targetUserId = user.id || user.customer_id || user.username;
    try {
      const keys = await apiClient.getGeneratedKeys(targetUserId, mod.id);
      setPanelKeys(keys);
      if (prefillId && prefillPassword) {
        setTimeout(() => executeCredentialVerification(prefillId, prefillPassword, mod.id), 100);
      }
    } catch (err) {
      console.warn('Failed to load panel keys:', err);
    }
  };

  const executeCredentialVerification = async (idToVerify?: string, passToVerify?: string, panelId?: string) => {
    const idStr = (idToVerify !== undefined ? idToVerify : verifyIdInput).trim();
    const passStr = (passToVerify !== undefined ? passToVerify : verifyPasswordInput).trim();

    if (!idStr || !passStr) {
      setVerifyResult({
        valid: false,
        message: 'PLEASE ENTER BOTH ACCESS ID AND ACCESS PASSWORD',
      });
      return;
    }

    setIsVerifyingKey(true);
    setVerifyResult(null);
    cyberAudio.playScan();

    // Show professional animated "VERIFYING ACCESS..." state
    await new Promise((resolve) => setTimeout(resolve, 850));

    try {
      const pId = panelId || activeVerifyModule?.id;
      const res = await apiClient.verifyAccessCredentials(idStr, passStr, pId);
      setVerifyResult(res);
      if (res.valid) {
        cyberAudio.playSuccess();
      } else {
        cyberAudio.playClick(600);
      }
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        message: err?.message || 'VERIFICATION FAILED: System error during verification.',
      });
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Load live portal catalogue and personalized pricing from local store / server
  const loadPortalConfig = async (currentPanelId?: string) => {
    try {
      const targetPanelId = currentPanelId || activePaywallModule?.id;
      const config = await apiClient.getPortalConfig(user.id || user.customer_id || user.username, targetPanelId);
      setModules(config.modules || []);
      setPlans((config.plans || []).map((p: any) => ({
        ...p,
        userPrice: p.userPrice ?? p.defaultPrice ?? 0,
        hasCustomPrice: Boolean(p.hasCustomPrice),
      })));
      setUserLicenses(config.userLicenses || []);
      if (config.upiQrImage) setUpiQrImage(config.upiQrImage);
      if (config.panel_permissions) {
        setLivePermissions(config.panel_permissions);
      }
      if (config.customer) {
        setLiveCustomer(config.customer);
      }
    } catch (err) {
      console.warn('Failed to load portal config:', err);
    }
  };

  useEffect(() => {
    loadPortalConfig(activePaywallModule?.id);
    const unsubscribe = appStore.subscribe(() => {
      loadPortalConfig(activePaywallModule?.id);
    });
    return () => unsubscribe();
  }, [user, activePaywallModule]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      cyberAudio.playClick(1200);
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


  // Dedicated FILES View for Selected Panel
  if (activeFilesModule) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 z-20 relative">
        <PanelFilesView
          panel={activeFilesModule}
          onBack={() => setActiveFilesModule(null)}
          onOpenSetup={() => {
            const mod = activeFilesModule;
            setActiveFilesModule(null);
            setActiveSetupModule(mod);
          }}
          onOpenBuy={() => {
            const mod = activeFilesModule;
            setActiveFilesModule(null);
            setActivePaywallModule(mod);
            setIsPaywallOpen(true);
          }}
        />
      </div>
    );
  }

  // Dedicated SETUP View for Selected Panel
  if (activeSetupModule) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 z-20 relative">
        <PanelSetupView
          panel={activeSetupModule}
          onBack={() => setActiveSetupModule(null)}
          onOpenFiles={() => {
            const mod = activeSetupModule;
            setActiveSetupModule(null);
            setActiveFilesModule(mod);
          }}
        />
      </div>
    );
  }

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
        onOpenVerifyWithKey={(mod, key) => {
          openVerifyModal(mod, key);
        }}
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

      {/* Robust Key Verification Modal */}
      {activeVerifyModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#040712]/95 border border-cyan-500/40 rounded-3xl p-6 w-full max-w-lg text-slate-100 font-mono-code text-xs shadow-[0_0_60px_rgba(0,242,254,0.25)] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wide">
                    VERIFY ACCESS: {activeVerifyModule.name}
                  </h3>
                  <span className="text-[10px] text-cyan-400">
                    PANEL ID: {activeVerifyModule.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVerifyModule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input & Verification Controls */}
            <div className="space-y-3">
              {/* Access ID Field */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  ACCESS ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyIdInput}
                    onChange={(e) => setVerifyIdInput(e.target.value)}
                    placeholder="Enter Access ID (e.g. AG-7K4P9X2M)"
                    disabled={isVerifyingKey}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-cyan-300 font-mono-code text-xs tracking-wider disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingKey}
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setVerifyIdInput(text.trim());
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Paste Access ID"
                  >
                    PASTE ID
                  </button>
                </div>
              </div>

              {/* Access Password Field */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  ACCESS PASSWORD
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyPasswordInput}
                    onChange={(e) => setVerifyPasswordInput(e.target.value)}
                    placeholder="Enter Access Password (e.g. Q8N4-LP7Z-2X)"
                    disabled={isVerifyingKey}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-white font-mono-code text-xs tracking-wider disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingKey}
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setVerifyPasswordInput(text.trim());
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Paste Access Password"
                  >
                    PASTE PASS
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => executeCredentialVerification()}
                disabled={isVerifyingKey || !verifyIdInput.trim() || !verifyPasswordInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-display font-extrabold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifyingKey ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>VERIFYING ACCESS...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>VERIFY ACCESS</span>
                  </>
                )}
              </button>
            </div>

            {/* VERIFYING LOADING STATE */}
            {isVerifyingKey && (
              <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 text-center space-y-3 shadow-[0_0_25px_rgba(0,242,254,0.2)]">
                <div className="w-10 h-10 rounded-2xl bg-cyan-900/60 border border-cyan-400/60 flex items-center justify-center mx-auto text-cyan-300">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-cyan-300 tracking-wider">
                    VERIFYING ACCESS...
                  </h4>
                  <p className="text-xs text-slate-300 font-mono-code mt-0.5">
                    Please wait while we verify your access.
                  </p>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-cyan-500/30">
                  <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full animate-pulse w-3/4 mx-auto rounded-full" />
                </div>
              </div>
            )}

            {/* Verification Result Feedback */}
            {!isVerifyingKey && verifyResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                verifyResult.valid
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {verifyResult.valid ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-emerald-300 border border-emerald-500/50">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>ACCESS VERIFIED ✓</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-900 text-rose-300 border border-rose-500/50">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>INVALID ACCESS ✕</span>
                    </div>
                  )}
                  <span className="text-[11px] text-slate-300 font-bold">{verifyResult.message}</span>
                </div>

                {verifyResult.valid && verifyResult.keyRecord && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Panel Name:</span>
                      <span className="text-cyan-300 font-bold">{verifyResult.keyRecord.panelName || activeVerifyModule.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Access Status:</span>
                      <span className="text-emerald-400 font-bold uppercase">{verifyResult.keyRecord.status || 'ACTIVE'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Purchased Duration:</span>
                      <span className="text-emerald-300 font-bold">{verifyResult.keyRecord.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expiry Information:</span>
                      <span className="text-slate-200 font-mono-code">
                        {verifyResult.keyRecord.expiresAt
                          ? new Date(verifyResult.keyRecord.expiresAt).toLocaleDateString()
                          : 'Lifetime / Permanent Access'}
                      </span>
                    </div>

                    {/* Associated Panel Access Credentials */}
                    <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2">
                      <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block">
                        VERIFIED PANEL CREDENTIALS:
                      </span>
                      <div className="flex items-center justify-between font-mono-code">
                        <span className="text-slate-400 text-[11px]">ACCESS ID:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-300 font-bold text-xs">
                            {verifyResult.keyRecord.generatedId || verifyResult.keyRecord.credentials?.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(verifyResult.keyRecord!.generatedId || verifyResult.keyRecord!.credentials?.id, 'Panel ID')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer"
                            title="Copy Panel ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between font-mono-code">
                        <span className="text-slate-400 text-[11px]">ACCESS PASSWORD:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-xs">
                            {verifyResult.keyRecord.generatedPassword || verifyResult.keyRecord.credentials?.password}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(verifyResult.keyRecord!.generatedPassword || verifyResult.keyRecord!.credentials?.password, 'Panel Password')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer"
                            title="Copy Panel Password"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Registered Credentials for this Panel */}
            {panelKeys.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  REGISTERED CREDENTIALS FOR THIS PANEL ({panelKeys.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {panelKeys.map((k) => {
                    const idVal = k.generatedId || k.credentials?.id || k.key;
                    const passVal = k.generatedPassword || k.credentials?.password || '';
                    return (
                      <div
                        key={k.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1 font-mono-code">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-300 truncate">
                              ID: {idVal}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                              {k.duration}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            PASS: {passVal}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyIdInput(idVal);
                              setVerifyPasswordInput(passVal);
                              executeCredentialVerification(idVal, passVal, k.panelId);
                            }}
                            className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold hover:from-cyan-400 hover:to-emerald-400 text-[10px] transition-all cursor-pointer"
                          >
                            VERIFY
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500">
                {copiedField ? `COPIED: ${copiedField} ✓` : 'Aegis Defense Network Security Core'}
              </span>
              <button
                type="button"
                onClick={() => setActiveVerifyModule(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
