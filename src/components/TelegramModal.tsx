import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, Copy, ExternalLink, ShieldCheck, Bell, Users, X, Radio, ArrowRight } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  const telegramUrl = 'https://t.me/AegisQuantumDefense';

  const handleCopy = () => {
    cyberAudio.playClick(1300);
    navigator.clipboard.writeText(telegramUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateJoin = () => {
    cyberAudio.playAccessGranted();
    setHasSubscribed(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            cyberAudio.playClick(800);
            onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md rounded-2xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_-10px_rgba(0,242,254,0.35)] z-10 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(11, 16, 26, 0.95) 0%, rgba(6, 9, 15, 0.98) 100%)',
          }}
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => {
              cyberAudio.playClick(900);
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-5">
            <div 
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #38bdf8 0%, #0284c7 50%, #034475 100%)',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 8px 24px rgba(0, 198, 255, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <Send className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white tracking-wider">
                  AEGIS DEFENSE CHANNEL
                </h3>
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                @AegisQuantumDefense • Verified Security Feed
              </p>
            </div>
          </div>

          {/* Channel Stats Row */}
          <div className="grid grid-cols-3 gap-2.5 mb-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-mono-code">SUBSCRIBERS</div>
              <div className="text-sm font-bold text-slate-100 font-mono-code flex items-center justify-center gap-1 mt-0.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                48,290
              </div>
            </div>
            <div className="text-center border-x border-slate-800">
              <div className="text-[10px] text-slate-500 font-mono-code">STATUS</div>
              <div className="text-sm font-bold text-emerald-400 font-mono-code flex items-center justify-center gap-1 mt-0.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                ACTIVE
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-mono-code">FREQ</div>
              <div className="text-sm font-bold text-cyan-300 font-mono-code flex items-center justify-center gap-1 mt-0.5">
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                REALTIME
              </div>
            </div>
          </div>

          {/* Recent Broadcasts Preview */}
          <div className="mb-5 space-y-2">
            <div className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>LATEST BROADCASTS</span>
              <span className="text-cyan-400/80 text-[10px]">ENCRYPTED FEED</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
                <span className="text-cyan-400 font-semibold">[SEC-ADVISORY #492]</span>
                <span>28 mins ago</span>
              </div>
              <p className="text-slate-200">
                Quantum Key Rotation Protocol v4.8 deployed across all edge gateways (Tokyo & Frankfurt nodes). Latency dropped by 18%.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
                <span className="text-amber-400 font-semibold">[MAINTENANCE]</span>
                <span>3 hours ago</span>
              </div>
              <p className="text-slate-300">
                Scheduled TLS 1.3 handshake optimization concluded. Zero downtime recorded.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {!hasSubscribed ? (
              <button
                type="button"
                onClick={handleSimulateJoin}
                className="w-full py-3 px-4 rounded-xl font-display font-bold tracking-wider text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_-5px_rgba(0,242,254,0.5)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                JOIN TELEGRAM CHANNEL NOW
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl font-mono-code text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                SUBSCRIBED TO PRIORITY BROADCASTS
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono-code text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'LINK COPIED' : 'COPY CHANNEL LINK'}
              </button>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => cyberAudio.playClick(1100)}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono-code text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                OPEN APP
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
