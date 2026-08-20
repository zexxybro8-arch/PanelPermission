import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, X, ShieldCheck, 
  QrCode, Sparkles, RefreshCw, Zap, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';
import { CyberModule, UserProfile, AdminRuntimePlan } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { apiClient } from '../services/apiClient';

interface RuntimePlanItem {
  id: string;
  name: string;
  price: string;
  numericPrice: number;
  duration: string;
  durationDays: number;
  badge?: string;
  isPopular?: boolean;
}

const DEFAULT_RUNTIME_PLANS: RuntimePlanItem[] = [
  {
    id: 'plan-15',
    name: '15 DAYS RUNTIME',
    price: '₹70',
    numericPrice: 70,
    duration: '15 Days',
    durationDays: 15,
    badge: 'BASIC',
  },
  {
    id: 'plan-20',
    name: '20 DAYS RUNTIME',
    price: '₹90',
    numericPrice: 90,
    duration: '20 Days',
    durationDays: 20,
    badge: 'STANDARD',
  },
  {
    id: 'plan-30',
    name: '30 DAYS RUNTIME',
    price: '₹120',
    numericPrice: 120,
    duration: '30 Days',
    durationDays: 30,
    badge: 'RECOMMENDED',
    isPopular: true,
  },
  {
    id: 'plan-permanent',
    name: 'PERMANENT RUNTIME',
    price: '₹400',
    numericPrice: 400,
    duration: 'Lifetime',
    durationDays: 3650,
    badge: 'LIFETIME',
  },
];

const DEFAULT_QR_IMAGE = 'https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg';
const INITIAL_TIMER_SECONDS = 300; // 5 minutes

interface PremiumPaymentModalProps {
  module: CyberModule | null;
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  plans?: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  upiQrImage?: string;
}

interface SelectedPlanState {
  planId: string;
  planName: string;
  price: string;
  numericPrice: number;
  duration: string;
  durationDays: number;
  panelId: string;
  customerId: string;
}

export const PremiumPaymentModal: React.FC<PremiumPaymentModalProps> = ({
  module,
  isOpen,
  onClose,
  user,
  plans,
  upiQrImage,
}) => {
  // Map dynamic plans if provided
  const availablePlans: RuntimePlanItem[] = (plans && plans.length > 0)
    ? plans.map((p) => {
        const pNum = p.userPrice ?? p.defaultPrice ?? 120;
        const dDays = p.durationDays ?? 30;
        const isPermanent = dDays < 0 || dDays === 3650 || (p.name || '').toUpperCase().includes('PERMANENT') || p.badge === 'LIFETIME';
        return {
          id: p.id,
          name: isPermanent ? 'PERMANENT RUNTIME' : (p.name || `${dDays} DAYS RUNTIME`),
          price: `₹${pNum}`,
          numericPrice: pNum,
          duration: isPermanent ? 'Lifetime' : `${dDays} Days`,
          durationDays: dDays,
          badge: isPermanent ? 'LIFETIME' : (p.badge || 'STANDARD'),
          isPopular: p.isPopular,
        };
      })
    : DEFAULT_RUNTIME_PLANS;

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlanState | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'method' | 'qr_payment'>('plans');
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [serverQrImage, setServerQrImage] = useState<string>(upiQrImage || DEFAULT_QR_IMAGE);
  const [cancelState, setCancelState] = useState<'idle' | 'cancelling' | 'cancelled'>('idle');
  const [cancelProgress, setCancelProgress] = useState<number>(0);

  // Initialize selectedPlan once when modal opens or module changes. Do NOT overwrite on plans refetch.
  useEffect(() => {
    if (isOpen && module) {
      const defaultPlan = availablePlans.find(p => p.isPopular) || availablePlans[0];
      if (defaultPlan) {
        setSelectedPlan({
          planId: defaultPlan.id,
          planName: defaultPlan.name,
          price: defaultPlan.price,
          numericPrice: defaultPlan.numericPrice,
          duration: defaultPlan.duration,
          durationDays: defaultPlan.durationDays,
          panelId: module.id,
          customerId: user?.id || user?.customer_id || user?.username || 'USER_10025',
        });
      }
      setCheckoutStep('plans');
    }
  }, [isOpen, module]);

  // Real-time 5:00 countdown timer for active QR payment session
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && checkoutStep === 'qr_payment' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, checkoutStep, timeLeft]);

  if (!isOpen || !module) return null;

  const handleClose = () => {
    if (cancelState !== 'idle') return;
    cyberAudio.playClick(900);
    setCheckoutStep('plans');
    setTimeLeft(INITIAL_TIMER_SECONDS);
    setIsVerifying(false);
    setVerificationStatus(null);
    setActiveOrderId(null);
    onClose();
  };

  const handleCancelPayment = () => {
    if (cancelState !== 'idle') return;

    cyberAudio.playClick(800);
    setCancelState('cancelling');
    setCancelProgress(0);

    const steps = [0, 25, 50, 75, 100];
    let stepIndex = 0;

    // Transition smoothly through 0 -> 25 -> 50 -> 75 -> 100 over ~1.6 seconds (400ms per step)
    const interval = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < steps.length) {
        setCancelProgress(steps[stepIndex]);
      } else {
        clearInterval(interval);
        setCancelState('cancelled');
        cyberAudio.playClick(600);

        // Keep confirmation visible for exactly 1 second, then navigate back to plans
        setTimeout(() => {
          setCheckoutStep('plans');
          setCancelState('idle');
          setCancelProgress(0);
          setTimeLeft(INITIAL_TIMER_SECONDS);
          setVerificationStatus(null);
          setActiveOrderId(null);
        }, 1000);
      }
    }, 400);
  };

  const handleSelectPlan = (plan: RuntimePlanItem) => {
    cyberAudio.playClick(1000);
    setSelectedPlan({
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      numericPrice: plan.numericPrice,
      duration: plan.duration,
      durationDays: plan.durationDays,
      panelId: module?.id || '',
      customerId: user?.id || user?.customer_id || user?.username || 'USER_10025',
    });
  };

  const handleSelectAndPay = (plan: RuntimePlanItem) => {
    cyberAudio.playClick(1300);
    setSelectedPlan({
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      numericPrice: plan.numericPrice,
      duration: plan.duration,
      durationDays: plan.durationDays,
      panelId: module?.id || '',
      customerId: user?.id || user?.customer_id || user?.username || 'USER_10025',
    });
    setCheckoutStep('method');
  };

  const handleProceedToQR = async () => {
    if (
      !selectedPlan ||
      !selectedPlan.planId ||
      !selectedPlan.price ||
      !selectedPlan.duration ||
      typeof selectedPlan.durationDays !== 'number' ||
      !selectedPlan.panelId
    ) {
      alert("Please select a valid plan before continuing.");
      return;
    }

    cyberAudio.playClick(1400);
    setTimeLeft(INITIAL_TIMER_SECONDS);
    setVerificationStatus(null);

    // Call real backend API to create order with exact selected plan parameters
    try {
      const currentUserId = user?.id || user?.customer_id || user?.username || 'USER_10025';
      const orderRes = await apiClient.createOrder(currentUserId, module.id, selectedPlan.planId, {
        planName: selectedPlan.planName,
        finalPrice: selectedPlan.numericPrice,
        durationDays: selectedPlan.durationDays,
      });
      setActiveOrderId(orderRes.order.id);
      if (orderRes.upiQrImageUrl) {
        setServerQrImage(orderRes.upiQrImageUrl);
      }
    } catch (err: any) {
      console.warn('Backend order creation warning:', err);
    }

    setCheckoutStep('qr_payment');
  };

  const handleStartNewPayment = () => {
    cyberAudio.playClick(1100);
    setTimeLeft(INITIAL_TIMER_SECONDS);
    setVerificationStatus(null);
  };

  const handleCheckPaymentStatus = async () => {
    cyberAudio.playScan();
    setIsVerifying(true);
    setVerificationStatus(null);

    try {
      if (activeOrderId) {
        const ord = await apiClient.getOrder(activeOrderId);
        if (ord.paymentStatus === 'PAID') {
          setVerificationStatus('PAYMENT CONFIRMED! Runtime license successfully provisioned and unlocked.');
          setIsVerifying(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsVerifying(false);
      setVerificationStatus('Awaiting gateway settlement confirmation. Please complete the transfer on your UPI application.');
    }, 1200);
  };

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const formattedTimer = `${minutes}:${seconds}`;
  const isExpired = timeLeft === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-[#020408]/92 backdrop-blur-md"
        />

        {/* Ambient Glow behind the modal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-[450px] h-[450px] bg-cyan-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        </div>

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl my-6 rounded-3xl bg-[#040712]/95 backdrop-blur-2xl border border-cyan-500/35 p-5 sm:p-7 shadow-[0_0_60px_-10px_rgba(0,242,254,0.25)] overflow-hidden z-10 max-h-[90vh] overflow-y-auto"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shinesweep {
              0% { left: -100%; }
              100% { left: 200%; }
            }
          ` }} />

          {/* Polished Glass Border & Light Sweep Accent */}
          <div className="absolute inset-0 border border-cyan-500/25 rounded-3xl pointer-events-none z-20 overflow-hidden">
            <div className="absolute top-0 -left-[100%] w-[50%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" style={{ animation: 'shinesweep 6s infinite linear' }} />
          </div>

          {/* Top Glowing Metallic Accent Strip */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f2fe]" />

          {/* Subtle Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* ========================================================================= */}
          {/* STEP 1: RUNTIME PLAN SELECTION                                            */}
          {/* ========================================================================= */}
          {checkoutStep === 'plans' && (
            <div className="space-y-5">
              {/* Header Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span>SECURE CHECKOUT</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title & Module Overview */}
              <div className="text-center space-y-1.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono-code font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SELECT RUNTIME PLAN</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
                  {module.name}
                </h2>
                <p className="text-xs font-mono-code text-slate-400 max-w-md mx-auto">
                  Choose a runtime duration to authorize and dispatch the module.
                </p>
              </div>

              {/* 4 Runtime Plans List */}
              <div className="space-y-3 pt-1">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlan?.planId === plan.id;
                  const isRecommended = plan.durationDays === 30 || plan.name.includes('30') || plan.badge === 'RECOMMENDED' || plan.isPopular;
                  const isLifetime = plan.durationDays < 0 || plan.durationDays === 3650 || plan.name.toUpperCase().includes('PERMANENT') || plan.badge === 'LIFETIME';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-row items-center justify-between gap-4 relative overflow-hidden group active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[#0a1122]/80 border-cyan-400/90 shadow-[0_0_20px_rgba(0,242,254,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                          : 'bg-[#030611]/60 border-slate-800/80 hover:bg-[#070b1b]/85 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,242,254,0.1)] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.01)]'
                      }`}
                    >
                      {/* Left Side: Icon, Name & Badges */}
                      <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                              : 'bg-slate-900/90 border-slate-800 text-slate-500 group-hover:text-cyan-300 group-hover:border-cyan-500/40'
                          }`}
                        >
                          <Zap className={`w-4.5 h-4.5 ${isSelected ? 'animate-pulse text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-display font-bold text-sm sm:text-base text-white tracking-wide truncate">
                              {isLifetime ? 'PERMANENT RUNTIME' : plan.name}
                            </span>
                            
                            {isLifetime ? (
                              <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse">
                                LIFETIME
                              </span>
                            ) : isRecommended ? (
                              <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,242,254,0.2)]">
                                RECOMMENDED
                              </span>
                            ) : plan.badge ? (
                              <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full border bg-slate-800/90 text-slate-400 border-slate-700">
                                {plan.badge}
                              </span>
                            ) : null}

                            {isSelected && (
                              <span className="text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-full border bg-cyan-400/20 text-cyan-200 border-cyan-400/60 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400 animate-bounce" />
                                <span className="animate-pulse">SELECTED</span>
                              </span>
                            )}
                          </div>
                          
                          <span className={`text-xs font-mono-code block mt-1 font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                            {isLifetime ? 'LIFETIME ACCESS' : `Duration: ${plan.duration}`}
                          </span>
                          <span className="text-[11px] font-mono-code text-slate-500 block mt-0.5 truncate">
                            {isLifetime ? 'Unrestricted panel authorization dispatch' : 'Direct module authorization dispatch'}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Price & PAY Button Column */}
                      <div className="flex flex-col items-end justify-center shrink-0 w-24 sm:w-28 text-right gap-1.5 min-w-[90px] sm:min-w-[110px]">
                        <div className="text-right">
                          <span className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight block leading-none">
                            {plan.price}
                          </span>
                          <span className="text-[9px] font-mono-code text-slate-500 block leading-none mt-1">INR</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndPay(plan);
                          }}
                          className={`w-full h-8 px-2 sm:px-3 rounded-lg font-mono-code font-bold text-[10px] tracking-wider transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-cyan-400/60 flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 text-slate-950 shadow-[0_0_14px_rgba(0,242,254,0.35)] font-extrabold'
                              : 'bg-gradient-to-r from-cyan-500/20 to-sky-500/20 hover:from-cyan-500/30 hover:to-sky-500/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 hover:text-white shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                          }`}
                        >
                          <Zap className="w-3 h-3 shrink-0" />
                          <span>PAY</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Cancel Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all text-center cursor-pointer active:scale-[0.99]"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PAYMENT METHOD SCREEN (UPI QR ONLY)                                */}
          {/* ========================================================================= */}
          {checkoutStep === 'method' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(900);
                    setCheckoutStep('plans');
                  }}
                  className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK TO PLANS</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Card */}
              <div>
                <span className="text-[10px] font-mono-code font-bold text-cyan-400 tracking-wider">
                  CHECKOUT // {module.name}
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-white mt-0.5">
                  PAYMENT GATEWAY
                </h3>
              </div>

              {/* Selected Plan Details Card */}
              {selectedPlan && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-400 block">SELECTED RUNTIME PLAN // {selectedPlan.duration}</span>
                    <span className="text-sm font-display font-bold text-cyan-300">{selectedPlan.planName}</span>
                    <span className="text-[11px] font-mono-code text-slate-500 block">Panel: {module.name} | Customer: {selectedPlan.customerId}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                      {selectedPlan.price}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400 block">TOTAL AMOUNT</span>
                  </div>
                </div>
              )}

              {/* Single Payment Method: UPI QR */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                  <span>PAYMENT METHOD:</span>
                  <span className="text-cyan-400 font-bold">FAST & SECURE</span>
                </label>

                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-400/60 shadow-[0_0_20px_-5px_rgba(0,242,254,0.25)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-white">UPI QR PAYMENT</span>
                        <span className="text-[9px] font-mono-code font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                          INSTANT
                        </span>
                      </div>
                      <span className="text-xs font-mono-code text-slate-400">
                        Scan with GPay, PhonePe, Paytm, or any UPI app
                      </span>
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_#00f2fe]">
                    <div className="w-2 h-2 rounded-full bg-slate-950" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleProceedToQR}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950 font-bold" />
                  <span>PROCEED TO PAY {selectedPlan?.price || '₹120'}</span>
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

          {/* ========================================================================= */}
          {/* STEP 3: DEDICATED PROFESSIONAL UPI QR PAYMENT SCREEN                       */}
          {/* ========================================================================= */}
          {checkoutStep === 'qr_payment' && (
            <div className="space-y-4 text-center">
              {/* Header Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(900);
                    setCheckoutStep('method');
                  }}
                  className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK</span>
                </button>

                {/* Session Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                    <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                    <span>SECURE UPI PAYMENT SESSION</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Selected Plan Summary Banner */}
              {selectedPlan && (
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-400 block">{module.name}</span>
                    <span className="text-xs font-display font-bold text-white">{selectedPlan.planName} ({selectedPlan.duration})</span>
                    {activeOrderId && (
                      <span className="text-[9px] font-mono-code text-slate-500 block">ORDER: {activeOrderId}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-display font-extrabold text-xl text-cyan-300">{selectedPlan.price}</span>
                    <span className="text-[9px] font-mono-code text-slate-500 block">INR</span>
                  </div>
                </div>
              )}

              {/* Prominent QR Code Display */}
              <div className="relative mx-auto max-w-[240px] sm:max-w-[270px]">
                <div className={`p-3 rounded-2xl bg-slate-950 border transition-all duration-300 ${
                  isExpired 
                    ? 'border-rose-500/50 opacity-50 grayscale' 
                    : 'border-cyan-400/50 shadow-[0_0_30px_rgba(0,242,254,0.3)]'
                }`}>
                  <div className="relative rounded-xl overflow-hidden bg-white p-2 flex items-center justify-center">
                    <img
                      src={serverQrImage || DEFAULT_QR_IMAGE}
                      alt="UPI Payment QR Code"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[240px] sm:max-h-[260px] object-contain rounded-lg"
                    />

                    {isExpired && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-rose-400 mb-1" />
                        <span className="font-display font-bold text-sm text-rose-300">SESSION EXPIRED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Corner Accents */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              </div>

              {/* Instructions text */}
              <div>
                <h4 className="font-display font-bold text-sm sm:text-base text-white tracking-wider">
                  SCAN & PAY USING UPI
                </h4>
                <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                  Scan the QR code with any UPI application to complete transfer
                </p>
              </div>

              {/* Real-time Countdown Timer */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono-code text-slate-400 tracking-wider block">
                  PAYMENT SESSION EXPIRES IN
                </span>

                <div className="flex items-center justify-center gap-2">
                  <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-400' : 'text-cyan-400 animate-pulse'}`} />
                  <span className={`font-display font-extrabold text-2xl sm:text-3xl tracking-widest ${
                    isExpired ? 'text-rose-400' : timeLeft <= 60 ? 'text-amber-400' : 'text-cyan-300'
                  }`}>
                    {formattedTimer}
                  </span>
                </div>

                {isExpired && (
                  <div className="text-xs font-mono-code font-bold text-rose-400 pt-1">
                    PAYMENT SESSION EXPIRED
                  </div>
                )}
              </div>

              {/* Verification Feedback Banner if triggered */}
              {verificationStatus && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono-code text-cyan-300 text-left flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{verificationStatus}</span>
                </div>
              )}

              {/* Action Controls */}
              <div className="space-y-2.5 pt-1">
                {isExpired ? (
                  <button
                    type="button"
                    onClick={handleStartNewPayment}
                    className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-orange-300 hover:from-amber-300 hover:to-orange-200 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-950" />
                    <span>START NEW PAYMENT</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckPaymentStatus}
                    disabled={isVerifying}
                    className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>CHECKING TRANSACTION STATUS...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-slate-950 font-bold" />
                        <span>I HAVE COMPLETED PAYMENT</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelPayment}
                  disabled={cancelState !== 'idle'}
                  className="w-full py-2.5 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelState !== 'idle' ? 'CANCELLING...' : 'CANCEL PAYMENT'}
                </button>
              </div>
            </div>
          )}

          {/* Professional Cyber-Security Cancellation Overlay */}
          <AnimatePresence>
            {cancelState !== 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#02050c]/98 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md rounded-3xl"
              >
                {cancelState === 'cancelling' ? (
                  <div className="space-y-6 flex flex-col items-center">
                    {/* Glowing Tech Header */}
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono-code font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-widest animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>SYSTEM OVERRIDE</span>
                      </div>
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-widest uppercase">
                        CANCELLING PAYMENT...
                      </h3>
                      <p className="text-xs font-mono-code text-slate-400">
                        Terminating active payment gateway handshake
                      </p>
                    </div>

                    {/* Circular Progress Widget */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-28 h-28 transform -rotate-90">
                        {/* Background track */}
                        <circle
                          cx="56"
                          cy="56"
                          r="45"
                          className="stroke-slate-900"
                          strokeWidth="5"
                          fill="transparent"
                        />
                        {/* Interactive glow ring */}
                        <circle
                          cx="56"
                          cy="56"
                          r="45"
                          className="stroke-amber-500/40 blur-[3px]"
                          strokeWidth="7"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={2 * Math.PI * 45 - (cancelProgress / 100) * 2 * Math.PI * 45}
                        />
                        {/* Solid progress ring */}
                        <circle
                          cx="56"
                          cy="56"
                          r="45"
                          className="stroke-amber-500 transition-all duration-300 ease-out"
                          strokeWidth="5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={2 * Math.PI * 45 - (cancelProgress / 100) * 2 * Math.PI * 45}
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Percent text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display font-black text-xl text-white tracking-tighter">
                          {cancelProgress}%
                        </span>
                        <span className="text-[9px] font-mono-code text-slate-500 uppercase tracking-widest">
                          PROGRESS
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6 flex flex-col items-center"
                  >
                    {/* Red status icon */}
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-bounce">
                      <AlertCircle className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-2xl text-rose-500 tracking-wider uppercase">
                        PAYMENT CANCELLED
                      </h3>
                      <p className="text-sm font-mono-code text-slate-300 max-w-xs mx-auto leading-relaxed">
                        Your payment session has been cancelled successfully.
                      </p>
                    </div>

                    <div className="text-[10px] font-mono-code text-slate-500 tracking-wider uppercase animate-pulse">
                      Redirecting to order control panel...
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
