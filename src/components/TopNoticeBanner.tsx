import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ExternalLink, ShieldCheck, Users, Sparkles, X, Check, Copy } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';

interface TopNoticeBannerProps {
  onOpenTelegramModal: () => void;
}

export const TopNoticeBanner: React.FC<TopNoticeBannerProps> = ({ onOpenTelegramModal }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    cyberAudio.playClick(1400);
    navigator.clipboard.writeText('https://t.me/AegisQuantumDefense');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBannerClick = () => {
    cyberAudio.playClick(1200);
    onOpenTelegramModal();
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl mx-auto px-4 sm:px-0 mb-6 z-20 relative"
      >
        <div
          onClick={handleBannerClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBannerClick(); }}
          className="group relative w-full overflow-hidden rounded-2xl cyber-glass p-3.5 sm:p-4 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_-5px_rgba(0,242,254,0.25)] cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-400"
          style={{
            background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.85) 0%, rgba(8, 12, 20, 0.92) 100%)',
          }}
        >
          {/* Ambient Corner Accent */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
          
          {/* Subtle Cyber Grid Border Glow */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="flex items-center justify-between gap-3 relative z-10">
            {/* Left: 3D Telegram Circular Emblem Container */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0 flex items-center justify-center">
                {/* Outer 3D Halo Glow Ring */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500/40 via-sky-400/20 to-blue-600/40 blur-[6px] group-hover:blur-[9px] transition-all duration-300" />
                
                {/* 3D Circular Container */}
                <div 
                  className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #0284c7 50%, #034475 90%, #082f49 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.6), 0 4px 12px rgba(0, 198, 255, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {/* Subtle 3D Glass Specular Reflection Highlight */}
                  <div className="absolute top-1 left-2 w-5 h-2.5 bg-white/40 rounded-full transform -rotate-25 blur-[1px] pointer-events-none" />

                  {/* Telegram Paper Airplane Icon */}
                  <Send 
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transform -translate-x-[1px] translate-y-[1px]" 
                  />
                  
                  {/* Live Status Indicator Ping */}
                  <span className="absolute top-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 border border-slate-900"></span>
                  </span>
                </div>
              </div>

              {/* Text Content */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold tracking-wider text-xs sm:text-sm text-slate-100 uppercase group-hover:text-cyan-300 transition-colors">
                    ALL UPDATES ARE POSTED ON TELEGRAM
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse hidden sm:inline-block" />
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-cyan-400/90 tracking-wide flex items-center gap-1 group-hover:underline">
                    JOIN OUR OFFICIAL CHANNEL
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                  </span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-[10px] text-slate-400 font-mono-code hidden sm:flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-slate-400" />
                    48.2K verified
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Telegram Channel Link"
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px] font-mono-code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline text-emerald-400">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">COPY</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cyberAudio.playClick(900);
                  setIsDismissed(true);
                }}
                title="Dismiss Announcement"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
