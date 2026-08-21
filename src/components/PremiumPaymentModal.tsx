import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, X, ShieldCheck, 
  QrCode, Sparkles, RefreshCw, Zap, AlertCircle, Clock, CheckCircle2,
  Copy, Check, KeyRound, User, Lock, Key
} from 'lucide-react';
import { CyberModule, UserProfile, AdminRuntimePlan, GeneratedKeyRecord } from '../types';
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

// Minimum: 3:30 (210s), Maximum: 3:50 (230s)
const getRandomTriggerSeconds = () => Math.floor(Math.random() * (230 - 210 + 1)) + 210;

interface PremiumPaymentModalProps {
  module: CyberModule | null;
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  plans?: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  upiQrImage?: string;
  onOpenVerifyWithKey?: (panel: CyberModule, accessKey?: string) => void;
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
  onOpenVerifyWithKey,
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
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'method' | 'qr_payment' | 'success_popup' | 'generating_access' | 'congratulations'>('plans');
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIMER_SECONDS);
  const [randomTriggerSeconds, setRandomTriggerSeconds] = useState<number>(getRandomTriggerSeconds);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [serverQrImage, setServerQrImage] = useState<string>(upiQrImage || DEFAULT_QR_IMAGE);
  const [cancelState, setCancelState] = useState<'idle' | 'cancelling' | 'cancelled'>('idle');
  const [cancelProgress, setCancelProgress] = useState<number>(0);
  
  // Generated Key state
  const [generatedKeyRecord, setGeneratedKeyRecord] = useState<GeneratedKeyRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Initialize selectedPlan once when modal opens or module changes
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
      hasTriggeredRef.current = false;
      setGeneratedKeyRecord(null);
    }
  }, [isOpen, module]);

  // Execute payment success flow
  const triggerPaymentSuccess = async (forcedOrderId?: string) => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    cyberAudio.playSuccess();
    const orderId = forcedOrderId || activeOrderId || ('ORD-' + Math.floor(10000 + Math.random() * 90000));
    
    // Step 1: Payment Successful popup
    setCheckoutStep('success_popup');

    // Asynchronously generate & persist key record linked to exact order, user, panel, and duration
    try {
      const currentUserId = user?.id || user?.customer_id || user?.username || 'USER_10025';
      const keyRec = await apiClient.generateKeyForOrder(
        orderId,
        currentUserId,
        module?.id,
        selectedPlan?.durationDays,
        selectedPlan?.planName
      );
      setGeneratedKeyRecord(keyRec);
    } catch (err) {
      console.error('Error generating key:', err);
    }

    // Step 2: Transition to "Generating your access..." after 1.8 seconds
    setTimeout(() => {
      cyberAudio.playScan();
      setCheckoutStep('generating_access');

      // Step 3: Transition to "Congratulations!" screen after 2.0 seconds
      setTimeout(() => {
        cyberAudio.playSuccess();
        setCheckoutStep('congratulations');
      }, 2000);
    }, 1800);
  };

  // Real-time 5:00 countdown timer for active QR payment session
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && checkoutStep === 'qr_payment' && timeLeft > 0 && !hasTriggeredRef.current) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const nextTime = prev > 0 ? prev - 1 : 0;
          // Trigger simulated success when countdown goes below random threshold (between 3:30 and 3:50)
          if (nextTime <= randomTriggerSeconds && !hasTriggeredRef.current) {
            setTimeout(() => {
              triggerPaymentSuccess();
            }, 0);
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, checkoutStep, timeLeft, randomTriggerSeconds]);

  if (!isOpen || !module) return null;

  const handleClose = () => {
    if (cancelState !== 'idle') return;
    cyberAudio.playClick(900);
    setCheckoutStep('plans');
    setTimeLeft(INITIAL_TIMER_SECONDS);
    setActiveOrderId(null);
    hasTriggeredRef.current = false;
    onClose();
  };

  const handleCancelPayment = () => {
    if (cancelState !== 'idle') return;

    cyberAudio.playClick(800);
    setCancelState('cancelling');
    setCancelProgress(0);

    const steps = [0, 25, 50, 75, 100];
    let stepIndex = 0;

    const interval = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < steps.length) {
        setCancelProgress(steps[stepIndex]);
      } else {
        clearInterval(interval);
        setCancelState('cancelled');
        cyberAudio.playClick(600);

        setTimeout(() => {
          setCheckoutStep('plans');
          setCancelState('idle');
          setCancelProgress(0);
          setTimeLeft(INITIAL_TIMER_SECONDS);
          setActiveOrderId(null);
          hasTriggeredRef.current = false;
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
    setRandomTriggerSeconds(getRandomTriggerSeconds());
    hasTriggeredRef.current = false;

    // Call backend API to create order with exact selected plan parameters
    try {
      const currentUserId = user?.id || user?.customer_id || user?.username || 'USER_10025';
      const orderRes = await apiClient.createOrder(currentUserId, module.id, selectedPlan.planId, {
        planName: selectedPlan.planName,
        finalPrice: selectedPlan.numericPrice,
        durationDays: selectedPlan.durationDays,
      });
      setActiveOrderId(orderRes.order.id);
      setServerQrImage(orderRes.upiQrImageUrl || '');
      setCheckoutStep('qr_payment');
    } catch (err: any) {
      console.error('Backend order creation error:', err);
      alert(err.message || 'Failed to create order');
      return;
    }
  };

  const handleStartNewPayment = () => {
    cyberAudio.playClick(1100);
    setTimeLeft(INITIAL_TIMER_SECONDS);
    setRandomTriggerSeconds(getRandomTriggerSeconds());
    hasTriggeredRef.current = false;
  };

  // Clipboard copy helpers
  const handleCopyKey = () => {
    if (!generatedKeyRecord) return;
    navigator.clipboard.writeText(generatedKeyRecord.key);
    cyberAudio.playClick(1200);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyId = () => {
    if (!generatedKeyRecord) return;
    const idToCopy = generatedKeyRecord.generatedId || generatedKeyRecord.credentials?.id || '';
    navigator.clipboard.writeText(idToCopy);
    cyberAudio.playClick(1200);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPassword = () => {
    if (!generatedKeyRecord) return;
    const passToCopy = generatedKeyRecord.generatedPassword || generatedKeyRecord.credentials?.password || '';
    navigator.clipboard.writeText(passToCopy);
    cyberAudio.playClick(1200);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
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
                  Choose a runtime duration to authorize and generate your unique panel credentials.
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

                      {/* Right Side: Price & Quick Action */}
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <div className="flex items-baseline gap-1">
                          <span className={`font-display font-black text-xl sm:text-2xl tracking-tight transition-colors ${
                            isSelected ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,242,254,0.4)]' : 'text-slate-100 group-hover:text-cyan-200'
                          }`}>
                            {plan.price}
                          </span>
                          <span className="text-[10px] font-mono-code text-slate-500">INR</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndPay(plan);
                          }}
                          className={`mt-2.5 px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold tracking-wider flex items-center gap-1.5 transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.3)] hover:scale-105'
                              : 'bg-slate-800 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/30 border border-slate-700'
                          }`}
                        >
                          <span>SELECT</span>
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Continue Button */}
              {selectedPlan && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('method')}
                    className="w-full py-4 px-6 rounded-2xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>CONTINUE TO PAYMENT ({selectedPlan.price})</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PAYMENT METHOD (UPI QR)                                            */}
          {/* ========================================================================= */}
          {checkoutStep === 'method' && (
            <div className="space-y-5">
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                  STEP 2/3: PAYMENT METHOD
                </span>
              </div>

              <div className="text-center space-y-1.5 pb-1">
                <h3 className="font-display font-bold text-xl text-white tracking-wider">
                  SELECT PAYMENT GATEWAY
                </h3>
                <p className="text-xs font-mono-code text-slate-400">
                  Instant automated UPI QR verification is active.
                </p>
              </div>

              {selectedPlan && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-400 block">{module.name}</span>
                    <span className="text-sm font-display font-bold text-white">{selectedPlan.planName}</span>
                    <span className="text-xs font-mono-code text-cyan-400 block">{selectedPlan.duration}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-extrabold text-2xl text-cyan-300">{selectedPlan.price}</span>
                    <span className="text-[10px] font-mono-code text-slate-500 block">INR TOTAL</span>
                  </div>
                </div>
              )}

              {/* UPI QR Method Selection Card */}
              <div 
                onClick={handleProceedToQR}
                className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-950 to-cyan-950/80 border border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.2)] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                      UPI DIRECT QR CODE
                    </span>
                    <span className="text-xs font-mono-code text-slate-400 block">
                      Pay via GPay, PhonePe, Paytm, BHIM, or any UPI App
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleProceedToQR}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-slate-950" />
                  <span>GENERATE PAYMENT QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutStep('plans')}
                  className="w-full py-2.5 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all text-center cursor-pointer"
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
                    {serverQrImage ? (
                      <img
                        src={serverQrImage}
                        alt="UPI Payment QR Code"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-[240px] sm:max-h-[260px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-[240px] sm:h-[260px] flex flex-col items-center justify-center bg-slate-900 border border-rose-500/50 rounded-lg text-center p-4">
                        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                        <span className="font-display font-bold text-lg text-rose-400">QR NOT CONFIGURED</span>
                        <span className="text-xs text-slate-500 mt-2 font-mono-code">Please contact administrator to setup pricing QR.</span>
                      </div>
                    )}

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

              {/* Action Controls */}
              <div className="space-y-2.5 pt-1">
                {isExpired && (
                  <button
                    type="button"
                    onClick={handleStartNewPayment}
                    className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-orange-300 hover:from-amber-300 hover:to-orange-200 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-950" />
                    <span>START NEW PAYMENT</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelPayment}
                  disabled={cancelState !== 'idle'}
                  className="w-full py-2 px-6 rounded-xl font-mono-code text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelState !== 'idle' ? 'CANCELLING...' : 'CANCEL PAYMENT'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PAYMENT SUCCESSFUL POPUP                                          */}
          {/* ========================================================================= */}
          {checkoutStep === 'success_popup' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8 px-4 text-center space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_40px_rgba(16,185,129,0.5)] animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono-code font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  GATEWAY SETTLEMENT VERIFIED
                </span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wider uppercase">
                  PAYMENT SUCCESSFUL ✓
                </h3>
                <p className="text-xs font-mono-code text-slate-400 max-w-sm mx-auto">
                  Transaction verified and registered with Aegis Defense Network.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left font-mono-code text-xs max-w-xs mx-auto space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Panel:</span>
                  <span className="text-cyan-300 font-bold">{module.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-emerald-400 font-bold">{selectedPlan?.price || 'PAID'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-bold">APPROVED ✓</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: GENERATING YOUR ACCESS STATE                                      */}
          {/* ========================================================================= */}
          {checkoutStep === 'generating_access' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-10 px-4 text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-cyan-950/80 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(0,242,254,0.4)]">
                  <KeyRound className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-widest uppercase animate-pulse">
                  GENERATING YOUR ACCESS...
                </h3>
                <p className="text-xs font-mono-code text-cyan-400">
                  Provisioning cryptographic access key & dedicated credentials
                </p>
              </div>

              {/* Progress bar animation */}
              <div className="w-full max-w-xs mx-auto h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                <motion.div
                  initial={{ width: "10%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 shadow-[0_0_15px_#00f2fe]"
                />
              </div>

              <div className="text-[10px] font-mono-code text-slate-500 uppercase tracking-widest">
                ENCRYPTING RECEPTOR TOKEN • SHA-256
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: CONGRATULATIONS & KEY DISPLAY WITH INDIVIDUAL COPY BUTTONS        */}
          {/* ========================================================================= */}
          {checkoutStep === 'congratulations' && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-5 text-center"
            >
              {/* Header Badge */}
              <div className="space-y-1.5 pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono-code font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACCESS AUTHORIZED</span>
                </div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-white tracking-wider uppercase">
                  CONGRATULATIONS!
                </h3>
                <p className="text-xs font-mono-code text-slate-300">
                  Your Access Has Been Generated
                </p>
              </div>

              {/* GENERATED ACCESS DISPLAY BOX */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,242,254,0.15)] space-y-3 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-mono-code font-bold text-cyan-300 uppercase tracking-wider">
                      GENERATED ACCESS
                    </span>
                  </div>
                  <span className="text-[9px] font-mono-code px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {generatedKeyRecord?.duration || selectedPlan?.duration || '30 DAYS'}
                  </span>
                </div>

                {/* ACCESS ID ITEM */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono-code text-slate-500 block uppercase font-bold">ACCESS ID</span>
                      <span className="font-mono-code font-bold text-sm sm:text-base text-cyan-300 tracking-wider break-all select-all block">
                        {generatedKeyRecord?.generatedId || generatedKeyRecord?.credentials?.id || 'AG-7K4P9X2M'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono-code flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">COPIED ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY ID</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ACCESS PASSWORD ITEM */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono-code text-slate-500 block uppercase font-bold">ACCESS PASSWORD</span>
                      <span className="font-mono-code font-bold text-sm sm:text-base text-white tracking-wider break-all select-all block">
                        {generatedKeyRecord?.generatedPassword || generatedKeyRecord?.credentials?.password || 'Q8N4-LP7Z-2X'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-code flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">COPIED ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY PASSWORD</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick(900);
                    handleClose();
                  }}
                  className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-slate-950 font-bold" />
                  <span>CONTINUE</span>
                </button>
              </div>
            </motion.div>
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
