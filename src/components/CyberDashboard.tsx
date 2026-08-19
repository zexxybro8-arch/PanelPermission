import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, ArrowLeft, Terminal, Sparkles, Lock, 
  Zap, Cpu, Activity, Droplets, Crosshair, EyeOff,
  ChevronRight, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { UserProfile, CyberModule } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { PremiumPaymentModal } from './PremiumPaymentModal';

interface CyberDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenTerminal: () => void;
}

const INITIAL_MODULES: CyberModule[] = [
  {
    id: 'angry-mod',
    name: 'ANGRY MOD',
    description: 'Advanced telemetry instrumentation & sandboxed runtime virtualization environment.',
    tag: 'V2.4 KERNEL',
    version: '2.4.0',
    enabled: false,
  },
  {
    id: 'gk-panel',
    name: 'GK PANEL',
    description: 'Kernel dispatch inspector and real-time buffer telemetry monitor.',
    tag: 'SYS OVERLAY',
    version: '1.8.2',
    enabled: false,
  },
  {
    id: 'rapid-core',
    name: 'RAPID CORE',
    description: 'High-frequency thread scheduler and ultra-low latency packet optimizer.',
    tag: 'LATENCY ENGINE',
    version: '3.1.0',
    enabled: false,
  },
  {
    id: 'dripclint',
    name: 'DRIPCLINT',
    description: 'UI stream layout interceptor and dynamic HUD render layer synchronization.',
    tag: 'STREAM SYNC',
    version: '1.2.9',
    enabled: false,
  },
  {
    id: 'xyz-cheats',
    name: 'XYZ CHEATS',
    description: 'Algorithmic 3D coordinate vector math solver and memory diagnostic analyzer.',
    tag: 'VECTOR MATH',
    version: '4.0.1',
    enabled: false,
  },
  {
    id: 'silent-cheats',
    name: 'SILENT CHEATS',
    description: 'Stealth process sandbox auditor and zero-footprint memory trace wiper.',
    tag: 'ZERO TRACE',
    version: '2.0.4',
    enabled: false,
  },
];

const MODULE_ICONS: Record<string, React.ElementType> = {
  'angry-mod': Zap,
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
}) => {
  const [modules, setModules] = useState<CyberModule[]>(INITIAL_MODULES);
  const [activePaywallModule, setActivePaywallModule] = useState<CyberModule | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Trigger Paywall whenever an ON/OFF toggle is clicked
  const handleToggleModule = (module: CyberModule) => {
    cyberAudio.playScan();
    setActivePaywallModule(module);
    setIsPaywallOpen(true);
  };

  const handleClosePaywall = () => {
    setIsPaywallOpen(false);
    setActivePaywallModule(null);
  };

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
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1200);
              onOpenTerminal();
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono-code text-cyan-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">LIVE TELEMETRY</span>
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

      {/* Security Demo Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs font-mono-code text-slate-300">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-cyan-300">DEMO ENVIRONMENT:</strong> All toggles trigger the simulated access gateway with zero changes to device permissions or files.
          </span>
        </div>
        <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 shrink-0 hidden md:inline">
          6 MODULES LOADED
        </span>
      </div>

      {/* Grid of 6 Cyber Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {modules.map((mod, index) => {
          const IconComponent = MODULE_ICONS[mod.id] || Zap;

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
                    <span className="text-[11px] font-mono-code font-bold text-slate-500 select-none">
                      OFF
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleModule(mod)}
                      className="w-12 h-6 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400/60 p-0.5 transition-all duration-300 relative cursor-pointer group/toggle focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                      title={`Request access for ${mod.name}`}
                    >
                      {/* Toggle Knob (Default OFF) */}
                      <motion.div
                        className="w-4.5 h-4.5 rounded-full bg-slate-400 group-hover/toggle:bg-cyan-300 shadow-md flex items-center justify-center"
                        animate={{ x: mod.enabled ? 24 : 0 }}
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
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  REQUIRES ACCESS PASS
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleModule(mod)}
                  className="text-cyan-400 hover:text-cyan-200 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>REQUEST ACCESS</span>
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
      />
    </motion.div>
  );
};
