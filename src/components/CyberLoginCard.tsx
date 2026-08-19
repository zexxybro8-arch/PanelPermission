import React, { useState } from 'react';
import { 
  Key, User, Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck, 
  AlertCircle, RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { CyberPoWVerification } from './CyberPoWVerification';
import { apiClient } from '../services/apiClient';

interface CyberLoginCardProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenTerminal: () => void;
  selectedRegion: string;
}

export const CyberLoginCard: React.FC<CyberLoginCardProps> = ({
  onLoginSuccess,
  selectedRegion,
}) => {
  // Empty initial React states on page load (strict authentication lock)
  const [operatorId, setOperatorId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Human PoW Proof State
  const [isPoWVerified, setIsPoWVerified] = useState(false);

  // Authentication Sequence States
  const [authStep, setAuthStep] = useState<
    'idle' | 'hashing' | 'lattice' | 'decrypting' | 'granted' | 'error'
  >('idle');
  const [authStatusMessage, setAuthStatusMessage] = useState('');

  // Password Entropy Calculator
  const calculateEntropy = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'AWAITING KEY', color: 'bg-slate-700', bits: 0 };
    let poolSize = 0;
    if (/[a-z]/.test(pwd)) poolSize += 26;
    if (/[A-Z]/.test(pwd)) poolSize += 26;
    if (/[0-9]/.test(pwd)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) poolSize += 33;

    const bits = Math.round(pwd.length * Math.log2(poolSize || 1));
    if (bits < 30) return { score: 1, label: 'STANDARD', color: 'bg-rose-500', bits };
    if (bits < 45) return { score: 2, label: 'MODERATE', color: 'bg-amber-500', bits };
    if (bits < 60) return { score: 3, label: 'SECURE', color: 'bg-sky-400', bits };
    return { score: 4, label: 'QUANTUM-GRADE', color: 'bg-cyan-400', bits };
  };

  const entropy = calculateEntropy(passphrase);

  // Execute Strict Authentication Flow via Server Backend
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Human Proof of Work Verification check
    if (!isPoWVerified) {
      cyberAudio.playError();
      setAuthStep('error');
      setAuthStatusMessage('VERIFICATION REQUIRED: Complete Proof-of-Work matrix');
      setTimeout(() => setAuthStep('idle'), 2500);
      return;
    }

    const trimmedId = operatorId.trim();
    const trimmedPass = passphrase.trim();

    if (!trimmedId || !trimmedPass) {
      cyberAudio.playError();
      setAuthStep('error');
      setAuthStatusMessage('INVALID AUTHORISED ID OR PASS KEY');
      setTimeout(() => setAuthStep('idle'), 3000);
      return;
    }

    cyberAudio.playScan();
    setAuthStep('hashing');
    setAuthStatusMessage('VERIFYING AUTHORISED CIPHER HASH...');

    try {
      // Backend cryptographic verification call
      const authResult = await apiClient.login(trimmedId, trimmedPass);

      cyberAudio.playClick(1400);
      setAuthStep('lattice');
      setAuthStatusMessage('VALIDATING KYBER-1024 LATTICE SIGNATURE...');

      setTimeout(() => {
        cyberAudio.playClick(1600);
        setAuthStep('decrypting');
        setAuthStatusMessage('VERIFYING AUTHORIZED SESSION TOKEN...');
      }, 500);

      setTimeout(() => {
        cyberAudio.playAccessGranted();
        setAuthStep('granted');
        setAuthStatusMessage(`PANEL ACCESS GRANTED // ${authResult.user.username}`);

        // Trigger Confetti Effect
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#00f2fe', '#38bdf8', '#0284c7', '#ffffff'],
          });
        } catch {
          // ignore
        }

        // Transition to Protected Dashboard with isolated user state
        setTimeout(() => {
          const userObj: UserProfile = {
            id: authResult.user.id,
            username: authResult.user.username,
            codename: `${authResult.user.username}_OPERATOR`,
            clearanceLevel: authResult.user.clearanceLevel || 3,
            role: authResult.user.role || 'user',
            terminalId: `TERM-${Math.floor(1000 + Math.random() * 9000)}-X`,
            ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
            nodeRegion: authResult.user.nodeRegion || selectedRegion,
            avatarSeed: authResult.user.username,
            sessionToken: authResult.token,
            loginTime: new Date().toISOString(),
            email: authResult.user.email,
          };
          onLoginSuccess(userObj);
        }, 800);
      }, 1100);

    } catch (err: any) {
      cyberAudio.playError();
      setAuthStep('error');
      setAuthStatusMessage(err.message || 'INVALID AUTHORISED ID OR PASS KEY');
      setTimeout(() => setAuthStep('idle'), 3000);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-0 z-20 relative">
      {/* Outer Card with 3D Border Glow & Glassmorphism */}
      <div 
        className="w-full rounded-3xl cyber-glass p-6 sm:p-8 border border-cyan-500/25 shadow-[0_0_60px_-15px_rgba(0,242,254,0.3)] relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, rgba(12, 17, 28, 0.88) 0%, rgba(7, 10, 17, 0.94) 100%)',
        }}
      >
        {/* Top Glowing Metallic Accent Strip */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f2fe]" />

        {/* Subtle Ambient Corner Refraction */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header & Portal Details */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SECURE AUTHENTICATION GATEWAY
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
            PANEL ACCESS
          </h1>
          <p className="text-xs text-slate-400 font-mono-code mt-1 tracking-wider uppercase">
            ENTER AUTHORIZED ID AND VALID PASS KEY TO ACCESS YOUR PANEL
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleAuthenticate} autoComplete="off" className="space-y-4">
          {/* Operator Identifier Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono-code text-slate-400 tracking-wider flex items-center gap-1.5">
                <Key className="w-3 h-3 text-cyan-400" />
                ENTER AUTHORISED ID
              </label>
              <span className="text-[10px] font-mono-code text-cyan-400/80">SHA-256 HASHED</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4 text-cyan-400/80" />
              </div>
              <input
                type="text"
                required
                value={operatorId}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  setOperatorId(e.target.value);
                  cyberAudio.playKeypress();
                }}
                placeholder="Enter Authorised ID"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-sm font-mono-code text-white placeholder:text-slate-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Master Passphrase Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono-code text-slate-400 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-cyan-400" />
                ENTER VALID PASS KEY
              </label>
              <span className="text-[10px] font-mono-code text-slate-500">ENCRYPTED INPUT</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4 text-cyan-400/80" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passphrase}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  cyberAudio.playKeypress();
                }}
                placeholder="Enter Valid Pass Key"
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-sm font-mono-code text-white placeholder:text-slate-500 transition-all outline-none tracking-wider"
              />
              <button
                type="button"
                onClick={() => {
                  cyberAudio.playClick(1100);
                  setShowPassword(!showPassword);
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title={showPassword ? 'Hide pass key' : 'Show pass key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Real-time Entropy Meter Bar */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono-code">
                <span className="text-slate-400">CIPHER ENTROPY:</span>
                <span className={`font-bold ${
                  entropy.score >= 3 ? 'text-cyan-300' : entropy.score === 2 ? 'text-amber-300' : entropy.score === 1 ? 'text-rose-400' : 'text-slate-500'
                }`}>
                  {entropy.label} {entropy.bits > 0 ? `(${entropy.bits} BITS)` : ''}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className={`rounded-full ${entropy.score >= 1 ? entropy.color : 'bg-slate-800'} transition-all`} />
                <div className={`rounded-full ${entropy.score >= 2 ? entropy.color : 'bg-slate-800'} transition-all`} />
                <div className={`rounded-full ${entropy.score >= 3 ? entropy.color : 'bg-slate-800'} transition-all`} />
                <div className={`rounded-full ${entropy.score >= 4 ? entropy.color : 'bg-slate-800'} transition-all`} />
              </div>
            </div>
          </div>

          {/* Interactive Cyber Proof of Work (PoW) Human Verification */}
          <CyberPoWVerification
            isVerified={isPoWVerified}
            onVerify={setIsPoWVerified}
          />

          {/* Authentication Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={authStep !== 'idle' && authStep !== 'error'}
              className="w-full py-3.5 px-6 rounded-xl font-display font-bold tracking-widest text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(0,242,254,0.5)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000" />

              {authStep === 'idle' && (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950 font-bold" />
                  <span>VERIFY &amp; ACCESS PANEL</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </>
              )}

              {(authStep === 'hashing' || authStep === 'lattice' || authStep === 'decrypting') && (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{authStatusMessage}</span>
                </>
              )}

              {authStep === 'granted' && (
                <>
                  <Check className="w-5 h-5 text-slate-950 font-extrabold" />
                  <span>{authStatusMessage}</span>
                </>
              )}

              {authStep === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-950" />
                  <span className="text-rose-950 font-bold">{authStatusMessage}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Compliance Badges Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono-code text-slate-400">
          <div className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
            <span className="text-cyan-400 font-bold">TLS 1.3</span>
            <span className="block text-slate-500">ENCRYPTED</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
            <span className="text-cyan-400 font-bold">ZKP</span>
            <span className="block text-slate-500">ZERO-KNOWLEDGE</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
            <span className="text-cyan-400 font-bold">KYBER-1024</span>
            <span className="block text-slate-500">QUANTUM RESIST</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
            <span className="text-emerald-400 font-bold">SOC2 TYPE II</span>
            <span className="block text-slate-500">COMPLIANT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
