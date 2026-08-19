import React, { useState, useEffect } from 'react';
import { Shield, Volume2, VolumeX, Terminal, Globe2, Activity, Cpu, Lock } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';
import { ServerNode } from '../types';

interface CyberHeaderProps {
  onOpenTerminal: () => void;
  selectedNode: ServerNode;
  onSelectNode: (node: ServerNode) => void;
  availableNodes: ServerNode[];
  isAudioMuted: boolean;
  onToggleAudio: () => void;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onOpenTerminal,
  selectedNode,
  onSelectNode,
  availableNodes,
  isAudioMuted,
  onToggleAudio,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNodeSelector, setShowNodeSelector] = useState<boolean>(false);

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
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 relative">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => cyberAudio.playClick(1000)}>
          {/* Holographic Gateway Emblem */}
          <div className="relative w-10 h-10 rounded-xl bg-slate-900/90 border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.3)] transition-transform duration-300 group-hover:scale-105">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm" />
            <Shield className="w-5 h-5 text-cyan-400 relative z-10" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg sm:text-xl tracking-widest text-white">
                AEGIS <span className="text-cyan-400 font-light">//</span> DEFENSE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                v4.8
              </span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-400 tracking-wider">
              QUANTUM SECURITY GATEWAY
            </p>
          </div>
        </div>

        {/* Mobile-only audio/terminal quick buttons */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          
          <button
            type="button"
            onClick={onOpenTerminal}
            title="Open Live Telemetry"
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Status Indicators & Live UTC Clock */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-full cyber-glass border border-slate-800/80 text-xs font-mono-code text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-slate-300 font-medium">CORE ONLINE</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>KYBER-1024 / AES-256</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{timeStr || 'SYNCHRONIZING...'}</span>
        </div>
      </div>

      {/* Right Controls: Node Cluster Selector, Audio Toggle & Terminal Trigger */}
      <div className="hidden sm:flex items-center gap-3">
        {/* Node Cluster Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick(1100);
              setShowNodeSelector(!showNodeSelector);
            }}
            className="px-3 py-1.5 rounded-xl cyber-glass border border-slate-800 hover:border-cyan-500/40 text-xs font-mono-code text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">{selectedNode.name}</span>
            <span className="text-emerald-400 text-[11px] font-bold">{selectedNode.latencyMs}ms</span>
          </button>

          {showNodeSelector && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl cyber-glass border border-cyan-500/30 p-2 shadow-2xl z-50">
              <div className="text-[10px] font-mono-code text-slate-400 px-2 py-1 uppercase tracking-wider">
                SELECT EDGE CLUSTER
              </div>
              <div className="space-y-1 mt-1">
                {availableNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      cyberAudio.playClick(1300);
                      onSelectNode(node);
                      setShowNodeSelector(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono-code flex items-center justify-between transition-colors ${
                      node.id === selectedNode.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{node.name}</span>
                    <span className="text-[11px] text-emerald-400">{node.latencyMs}ms</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Security Log Drawer Button */}
        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick(1200);
            onOpenTerminal();
          }}
          className="px-3 py-1.5 rounded-xl cyber-glass border border-slate-800 hover:border-cyan-500/40 text-xs font-mono-code text-slate-300 hover:text-cyan-300 flex items-center gap-2 transition-all cursor-pointer"
          title="Open Live Threat & Telemetry Console"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>TELEMETRY</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </button>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={onToggleAudio}
          title={isAudioMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          className="p-2 rounded-xl cyber-glass border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
        >
          {isAudioMuted ? (
            <VolumeX className="w-4 h-4 text-slate-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      </div>
    </header>
  );
};
