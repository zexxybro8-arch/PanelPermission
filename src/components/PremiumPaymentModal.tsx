import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, Lock, ArrowLeft, X, Check, ShieldCheck, 
  CreditCard, QrCode, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { CyberModule } from '../types';
import { cyberAudio } from '../utils/cyberAudio';

interface PremiumPaymentModalProps {
  module: CyberModule | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumPaymentModal: React.FC<PremiumPaymentModalProps> = ({
  module,
  isOpen,
  onClose,
}) => {
  const [checkoutStep, setCheckoutStep] = useState<'prompt' | 'simulated_gateway' | 'simulated_complete'>('prompt');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'crypto'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !module) return null;

  const handleClose = () => {
    cyberAudio.playClick(900);
    setCheckoutStep('prompt');
    setIsProcessing(false);
    onClose();
  };

  const handleProceedToPayment = () => {
    cyberAudio.playClick(1300);
    setCheckoutStep('simulated_gateway');
  };

  const handleSimulatePayment = () => {
    cyberAudio.playScan();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutStep('simulated_complete');
      cyberAudio.playAccessGranted();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-[#04060a]/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-3xl cyber-glass border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_60px_-10px_rgba(0,242,254,0.35)] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(13, 19, 32, 0.95) 0%, rgba(7, 10, 18, 0.98) 100%)',
          }}
        >
          {/* Top Glowing Metallic Line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f2fe]" />

          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Step 1: Standard Paywall Prompt */}
          {checkoutStep === 'prompt' && (
            <div className="space-y-6">
              {/* Header with Back/Close */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lock Badge & Title */}
              <div className="text-center space-y-3 pt-2">
                <div className="relative w-16 h-16 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.35)]">
                  <Lock className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono-code font-bold bg-amber-400 text-slate-950">
                    PASS
                  </span>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 mb-2">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    PREMIUM ACCESS REQUIRED
                  </span>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
                    {module.name}
                  </h2>
                  <p className="text-sm font-mono-code text-slate-300 mt-2 max-w-sm mx-auto">
                    This module requires a <span className="text-cyan-300 font-bold">₹200</span> demo access pass.
                  </p>
                </div>
              </div>

              {/* Price Banner Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[11px] font-mono-code text-slate-400 block">DEMO ACCESS LICENSE</span>
                  <span className="text-xs font-mono-code text-cyan-400 font-semibold">{module.name} • 30-DAY RUNTIME</span>
                </div>

                <div className="text-right">
                  <span className="font-display font-extrabold text-3xl text-white tracking-tight">₹200</span>
                  <span className="text-[10px] font-mono-code text-slate-500 block">INR DEMO PASS</span>
                </div>
              </div>

              {/* Simulation Disclaimer Notice */}
              <div className="p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/20 text-[11px] font-mono-code text-slate-400 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-300">DEMO SIMULATION NOTICE:</strong> This is a sandboxed interface demonstration. No real currency will be charged or collected.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(0,242,254,0.5)] flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>CONTINUE TO PAYMENT</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all text-center cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Simulated Payment Selection Gateway */}
          {checkoutStep === 'simulated_gateway' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('prompt')}
                  className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK TO DETAILS</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-mono-code font-bold text-cyan-400 tracking-wider">
                  SECURE CHECKOUT DEMO
                </span>
                <h3 className="font-display font-bold text-xl text-white mt-0.5">
                  SIMULATED PAYMENT PORTAL
                </h3>
                <p className="text-xs font-mono-code text-slate-400 mt-1">
                  Select a demo method to simulate unlocking {module.name}
                </p>
              </div>

              {/* Payment Methods Selector (Demo simulation) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(1100);
                    setSelectedMethod('upi');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedMethod === 'upi'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                  <span className="text-xs font-mono-code font-bold block">UPI QR</span>
                  <span className="text-[9px] font-mono-code text-slate-500">Instant Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(1100);
                    setSelectedMethod('card');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedMethod === 'card'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                  <span className="text-xs font-mono-code font-bold block">CARD</span>
                  <span className="text-[9px] font-mono-code text-slate-500">Virtual Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(1100);
                    setSelectedMethod('crypto');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedMethod === 'crypto'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                  <span className="text-xs font-mono-code font-bold block">Q-KEY</span>
                  <span className="text-[9px] font-mono-code text-slate-500">Tokenized</span>
                </button>
              </div>

              {/* Demo Mock Method Details */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-400">Total Demo Amount:</span>
                  <span className="text-cyan-300 font-bold text-base">₹200.00</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                  <span>SANDBOX ROUTE:</span>
                  <span className="text-emerald-400 font-semibold">GATEWAY_DEMO_200</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>SIMULATING ACCESS GRANT...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-slate-950 font-bold" />
                      <span>SIMULATE ₹200 DEMO PAYMENT</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all text-center cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Simulated Complete State */}
          {checkoutStep === 'simulated_complete' && (
            <div className="py-4 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.35)]">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  DEMO PASS SIMULATED
                </span>
                <h3 className="font-display font-bold text-2xl text-white tracking-wider mt-2">
                  ACCESS PASS SIMULATED
                </h3>
                <p className="text-xs font-mono-code text-slate-300 mt-2 max-w-sm mx-auto">
                  Simulation complete for <strong className="text-cyan-300">{module.name}</strong>. In production, verified access unlocks the secured dispatch cluster.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono-code text-slate-400">
                <span>LICENSE TOKEN: </span>
                <span className="text-cyan-300 font-bold">DEMO-PASS-{Date.now().toString(36).toUpperCase()}</span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 hover:from-cyan-300 hover:to-sky-200 shadow-[0_0_25px_rgba(0,242,254,0.4)] cursor-pointer"
              >
                RETURN TO ACCESS MODULES
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
