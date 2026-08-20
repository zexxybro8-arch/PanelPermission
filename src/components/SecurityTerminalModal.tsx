import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Play, Pause, Trash2, Download, X, CornerDownLeft, Sparkles } from 'lucide-react';
import { TelemetryLog } from '../types';
import { cyberAudio } from '../utils/cyberAudio';

interface SecurityTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TelemetryLog[];
  onClearLogs: () => void;
}

export const SecurityTerminalModal: React.FC<SecurityTerminalModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [customOutputs, setCustomOutputs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, customOutputs, isPaused]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    cyberAudio.playClick(1400);
    const cmd = commandInput.trim().toLowerCase();
    const ts = new Date().toISOString().slice(11, 19);

    let response = '';
    switch (cmd) {
      case 'help':
        response = `[${ts}] AVAILABLE COMMANDS:\n  status    - View system health & gateway metrics\n  ping      - Test network latency\n  clear     - Clear command terminal history`;
        break;
      case 'status':
        response = `[${ts}] STATUS: SYSTEM OPERATIONAL\n  Gateway: Active\n  Security: Verified\n  Response Time: 24ms`;
        break;
      case 'ping':
        response = `[${ts}] NETWORK LATENCY:\n  Node-01: 12ms [OPTIMAL]\n  Node-02: 19ms [OPTIMAL]\n  Node-03: 28ms [OPTIMAL]`;
        break;
      case 'clear':
        setCustomOutputs([]);
        setCommandInput('');
        return;
      default:
        response = `[${ts}] UNRECOGNIZED COMMAND: '${commandInput}'. Type 'help' for command list.`;
    }

    setCustomOutputs((prev) => [...prev, `> ${commandInput}`, response]);
    setCommandInput('');
  };

  const handleExport = () => {
    cyberAudio.playClick(1200);
    const content = logs.map(l => `[${l.timestamp}] [${l.type}] [${l.source}]: ${l.message} ${l.payloadHash || ''}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verify-buy-audit-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            cyberAudio.playClick(900);
            onClose();
          }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl h-[80vh] max-h-[680px] rounded-2xl cyber-glass border border-cyan-500/30 shadow-[0_0_60px_-10px_rgba(0,242,254,0.35)] z-10 flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(8, 12, 20, 0.96) 0%, rgba(5, 7, 12, 0.99) 100%)',
          }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-white tracking-wider flex items-center gap-2">
                  VERIFY // BUY ACTIVITY CONSOLE
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    REALTIME
                  </span>
                </h3>
                <p className="text-[10px] font-mono-code text-slate-400">
                  Real-time System Activity Stream
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  cyberAudio.playClick(1000);
                  setIsPaused(!isPaused);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono-code text-slate-300 flex items-center gap-1 transition-colors"
                title={isPaused ? 'Resume stream' : 'Pause stream'}
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                <span className="hidden sm:inline">{isPaused ? 'RESUME' : 'PAUSE'}</span>
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono-code text-slate-300 flex items-center gap-1 transition-colors"
                title="Export audit log"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">EXPORT</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  cyberAudio.playClick(900);
                  onClearLogs();
                  setCustomOutputs([]);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  cyberAudio.playClick(900);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Terminal Logs Body */}
          <div className="flex-1 p-4 overflow-y-auto font-mono-code text-xs space-y-1.5 bg-black/40 cyber-scanlines">
            <div className="text-[11px] text-cyan-400/80 mb-3 pb-2 border-b border-slate-800/80">
              --- AEGIS THREAT DEFENSE TELEMETRY INITIALIZED [SESSION HASH: 0x8F9B2C] ---
              <br />
              Type <span className="text-white font-bold underline">help</span> below to execute security routines.
            </div>

            {logs.map((log) => {
              let typeColor = 'text-cyan-400';
              let badgeBg = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
              if (log.type === 'SUCCESS') {
                typeColor = 'text-emerald-400';
                badgeBg = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
              } else if (log.type === 'WARN') {
                typeColor = 'text-amber-400';
                badgeBg = 'bg-amber-950/60 text-amber-300 border-amber-500/30';
              } else if (log.type === 'SEC_ALERT') {
                typeColor = 'text-rose-400';
                badgeBg = 'bg-rose-950/60 text-rose-300 border-rose-500/30';
              }

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/40 p-0.5 rounded">
                  <span className="text-slate-500 select-none shrink-0">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border shrink-0 ${badgeBg}`}>
                    {log.type}
                  </span>
                  <span className="text-slate-400 shrink-0">[{log.source}]</span>
                  <span className={`flex-1 ${typeColor}`}>{log.message}</span>
                  {log.payloadHash && (
                    <span className="text-slate-600 text-[10px] hidden md:inline shrink-0 font-mono">
                      {log.payloadHash}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Custom Interactive Terminal Responses */}
            {customOutputs.map((out, idx) => (
              <div
                key={`custom-${idx}`}
                className={`whitespace-pre-wrap p-1 rounded ${
                  out.startsWith('>') ? 'text-cyan-300 font-bold bg-cyan-950/20' : 'text-slate-200'
                }`}
              >
                {out}
              </div>
            ))}

            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Input Bar */}
          <form
            onSubmit={handleCommand}
            className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2 shrink-0"
          >
            <span className="text-cyan-400 font-mono-code font-bold text-sm">&gt;</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter command (e.g. status, ping, threats, decrypt, help)..."
              className="flex-1 bg-transparent border-none text-xs font-mono-code text-white placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono-code flex items-center gap-1 transition-colors"
            >
              <span>RUN</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
