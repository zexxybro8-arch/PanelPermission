import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Cpu, Check, Lock, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';

interface CyberPoWVerificationProps {
  isVerified: boolean;
  onVerify: (verified: boolean) => void;
}

export const CyberPoWVerification: React.FC<CyberPoWVerificationProps> = ({
  isVerified,
  onVerify,
}) => {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    if (isVerified || isSolving) return;
    setIsDragging(true);
    cyberAudio.playClick(1000);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || isVerified || isSolving || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const handleWidth = 44;
    const max = rect.width - handleWidth;
    const currentX = Math.max(0, Math.min(clientX - rect.left - handleWidth / 2, max));
    const percentage = currentX / max;
    setSliderPos(percentage);

    if (percentage >= 0.96) {
      setIsDragging(false);
      setIsSolving(true);
      cyberAudio.playScan();

      // Complete verification
      setTimeout(() => {
        setIsSolving(false);
        onVerify(true);
        cyberAudio.playAccessGranted();
      }, 500);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    cyberAudio.playClick(800);
    setSliderPos(0);
    onVerify(false);
  };

  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[11px] font-mono-code text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          PROOF OF HUMAN IDENTITY
        </span>
        {isVerified && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] font-mono-code text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            RESET HASH
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        onMouseMove={(e) => isDragging && handleMove(e.clientX)}
        onTouchMove={(e) => isDragging && e.touches.length > 0 && handleMove(e.touches[0].clientX)}
        onMouseUp={() => {
          if (isDragging && !isVerified) {
            setIsDragging(false);
            setSliderPos(0);
          }
        }}
        onTouchEnd={() => {
          if (isDragging && !isVerified) {
            setIsDragging(false);
            setSliderPos(0);
          }
        }}
        className={`relative h-12 w-full rounded-xl overflow-hidden select-none border transition-colors touch-none ${
          isVerified
            ? 'bg-emerald-950/40 border-emerald-500/40'
            : isSolving
            ? 'bg-cyan-950/40 border-cyan-500/50'
            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Progress Background Fill */}
        <div
          className={`absolute inset-y-0 left-0 transition-all ${
            isVerified
              ? 'w-full bg-emerald-500/20'
              : 'bg-gradient-to-r from-cyan-500/10 via-cyan-400/25 to-cyan-400/40'
          }`}
          style={{ width: isVerified ? '100%' : `${sliderPos * 100}%` }}
        />

        {/* Center Label Prompt */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-12">
          {isVerified ? (
            <span className="text-xs font-mono-code font-bold text-emerald-300 flex items-center gap-1.5 tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              NEURAL PROOF VERIFIED // ZERO-KNOWLEDGE VALID
            </span>
          ) : isSolving ? (
            <span className="text-xs font-mono-code text-cyan-300 flex items-center gap-2 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              COMPUTING SHA-512 ENTROPY...
            </span>
          ) : (
            <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5">
              <span>SLIDE TO DECRYPT ACCESS TOKEN</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
            </span>
          )}
        </div>

        {/* Draggable Cyber Knob */}
        {!isVerified && !isSolving && (
          <div
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            style={{
              left: `${sliderPos * (trackRef.current ? trackRef.current.clientWidth - 44 : 0)}px`,
            }}
            className="absolute top-1 bottom-1 w-11 rounded-lg bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_15px_rgba(0,242,254,0.5)] z-20 transition-transform hover:scale-105 active:scale-95"
          >
            <Lock className="w-4 h-4 text-slate-950 font-bold" />
          </div>
        )}

        {isVerified && (
          <div className="absolute right-2 top-2 bottom-2 w-8 rounded-lg bg-emerald-500 flex items-center justify-center z-20 shadow-[0_0_12px_#10b981]">
            <Check className="w-4 h-4 text-slate-950 font-bold" />
          </div>
        )}
      </div>
    </div>
  );
};
