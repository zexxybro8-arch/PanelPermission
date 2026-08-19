import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, LogOut, Terminal, Activity, Lock, RefreshCw, 
  Cpu, AlertTriangle, CheckCircle2, Globe2, Key, Radio, 
  Layers, HardDrive, Zap, Eye
} from 'lucide-react';
import { UserProfile, ThreatItem } from '../types';
import { cyberAudio } from '../utils/cyberAudio';

interface CyberDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenTerminal: () => void;
}

const INITIAL_THREATS: ThreatItem[] = [
  { id: '1', threatType: 'SYN Flood DDoS', originIp: '185.220.101.5', country: 'NL', mitigation: 'Edge Filtered', severity: 'HIGH', timeAgo: '12s ago' },
  { id: '2', threatType: 'SSH Credential Stuffing', originIp: '45.154.255.88', country: 'RU', mitigation: 'IP Blacklisted', severity: 'MEDIUM', timeAgo: '1m ago' },
  { id: '3', threatType: 'SQLi Probe /api/v2', originIp: '194.26.29.112', country: 'BR', mitigation: 'WAF Neutralized', severity: 'HIGH', timeAgo: '3m ago' },
  { id: '4', threatType: 'Malformed TLS Handshake', originIp: '103.251.167.20', country: 'SG', mitigation: 'Connection Dropped', severity: 'LOW', timeAgo: '5m ago' },
];

export const CyberDashboard: React.FC<CyberDashboardProps> = ({
  user,
  onLogout,
  onOpenTerminal,
}) => {
  const [threats, setThreats] = useState<ThreatItem[]>(INITIAL_THREATS);
  const [keyRotationSeconds, setKeyRotationSeconds] = useState(180);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [ephemeralKey, setEphemeralKey] = useState(user.sessionToken);

  useEffect(() => {
    const timer = setInterval(() => {
      setKeyRotationSeconds((prev) => (prev <= 1 ? 180 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRotateKey = () => {
    cyberAudio.playScan();
    setIsRotatingKey(true);
    setTimeout(() => {
      setIsRotatingKey(false);
      setKeyRotationSeconds(180);
      setEphemeralKey(`AEGIS-${Math.random().toString(36).substring(2, 10).toUpperCase()}-QKEY`);
      cyberAudio.playAccessGranted();
    }, 1000);
  };

  const handleMitigateAll = () => {
    cyberAudio.playAccessGranted();
    setThreats((prev) =>
      prev.map((t) => ({ ...t, mitigation: 'PURGED & ISOLATED' }))
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 z-20 relative space-y-6"
    >
      {/* Top Operator Banner */}
      <div 
        className="w-full rounded-2xl cyber-glass p-5 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_40px_-10px_rgba(0,242,254,0.25)]"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 19, 32, 0.9) 0%, rgba(8, 12, 20, 0.95) 100%)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-white tracking-wider">
                {user.username}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CLEARANCE LVL {user.clearanceLevel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code text-slate-400 mt-1">
              <span className="text-cyan-400">{user.role}</span>
              <span>•</span>
              <span>TERMINAL: {user.terminalId}</span>
              <span>•</span>
              <span className="text-emerald-400">{user.ipAddress}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1200);
              onOpenTerminal();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-xs font-mono-code text-slate-200 hover:text-cyan-300 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>LIVE CONSOLE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(900);
              onLogout();
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-mono-code text-rose-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      {/* Grid of Command Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quantum Key Vault */}
        <div className="rounded-2xl cyber-glass p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-bold text-sm text-white tracking-wider">
                QUANTUM KEY VAULT
              </h3>
            </div>
            <span className="text-[10px] font-mono-code text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
              ACTIVE
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono-code text-slate-500">CURRENT SESSION HASH</div>
            <div className="text-xs font-mono-code text-cyan-300 font-bold break-all">
              {ephemeralKey}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] font-mono-code text-slate-400">
              <span>AUTO ROTATION IN:</span>
              <span className="text-emerald-400 font-bold">{keyRotationSeconds}s</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRotateKey}
            disabled={isRotatingKey}
            className="w-full py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono-code text-cyan-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotatingKey ? 'animate-spin' : ''}`} />
            <span>MANUAL KEY ROTATION</span>
          </button>
        </div>

        {/* Middle / Right Column: Active Threat Interception Radar */}
        <div className="lg:col-span-2 rounded-2xl cyber-glass p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <h3 className="font-display font-bold text-sm text-white tracking-wider">
                REALTIME THREAT INTERCEPTION RADAR
              </h3>
            </div>

            <button
              type="button"
              onClick={handleMitigateAll}
              className="text-[11px] font-mono-code text-cyan-400 hover:underline flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              PURGE THREAT QUEUE
            </button>
          </div>

          <div className="space-y-2">
            {threats.map((threat) => (
              <div
                key={threat.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      threat.severity === 'HIGH'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : threat.severity === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {threat.severity}
                  </span>
                  <div>
                    <span className="text-white font-semibold">{threat.threatType}</span>
                    <span className="text-slate-500 ml-2">from {threat.originIp} [{threat.country}]</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <span className="text-emerald-400 font-semibold">{threat.mitigation}</span>
                  <span className="text-slate-600 text-[10px]">{threat.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
