import React, { useState } from 'react';
import { 
  Key, User, Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck, 
  AlertCircle, RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { cyberAudio } from '../utils/cyberAudio';
import { apiClient } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorMessage';

interface CyberLoginCardProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenTerminal?: () => void;
  selectedRegion?: string;
}

export const CyberLoginCard: React.FC<CyberLoginCardProps> = ({
  onLoginSuccess,
  selectedRegion = 'Asia-SE',
}) => {
  // Empty initial React states on page load (strict authentication lock)
  const [operatorId, setOperatorId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Authentication Sequence States
  const [authStep, setAuthStep] = useState<
    'idle' | 'hashing' | 'lattice' | 'decrypting' | 'granted' | 'error'
  >('idle');
  const [authStatusMessage, setAuthStatusMessage] = useState('');

  // Execute Strict Authentication Flow via Server Backend / Resilient Client Engine
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Cryptographic verification call
      const authResult = await apiClient.login(trimmedId, trimmedPass);

      cyberAudio.playClick(1400);
      setAuthStep('lattice');
      setAuthStatusMessage('VALIDATING ENCRYPTED ACCESS TOKEN...');

      setTimeout(() => {
        cyberAudio.playClick(1600);
        setAuthStep('decrypting');
        setAuthStatusMessage('AUTHORIZING SECURE SESSION...');
      }, 400);

      setTimeout(() => {
        cyberAudio.playAccessGranted();
        setAuthStep('granted');
        const username = authResult?.user?.username || trimmedId;
        const msg = typeof authResult?.message === 'string' && authResult.message !== '[object Object]'
          ? authResult.message
          : `PANEL ACCESS GRANTED // ${username}`;
        setAuthStatusMessage(msg);

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
            customer_id: (authResult.user as any).customer_id,
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
            price: (authResult.user as any).price,
            status: (authResult.user as any).status,
            expiry_date: (authResult.user as any).expiry_date,
            assigned_modules: (authResult.user as any).assigned_modules,
          };
          onLoginSuccess(userObj);
        }, 700);
      }, 850);

    } catch (err: unknown) {
      cyberAudio.playError();
      setAuthStep('error');
      const safeMsg = extractErrorMessage(err, 'INVALID AUTHORISED ID OR PASS KEY');
      setAuthStatusMessage(safeMsg);
      setTimeout(() => setAuthStep('idle'), 3500);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-0 z-20 relative">
      {/* Outer Card with 3D Border Glow & Glassmorphism */}
      <div 
        className="w-full rounded-3xl cyber-glass p-6 sm:p-8 border border-cyan-500/25 shadow-[0_0_60px_-15px_rgba(0,242,254,0.3)] relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, rgba(12, 17, 28, 0.90) 0%, rgba(7, 10, 17, 0.96) 100%)',
        }}
      >
        {/* Top Glowing Metallic Accent Strip */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f2fe]" />

        {/* Subtle Ambient Corner Refraction */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header & Portal Details */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SECURE AUTHENTICATION GATEWAY
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
            PANEL STORE
          </h1>
          <p className="text-xs text-slate-400 font-mono-code mt-1.5 tracking-wider uppercase leading-relaxed">
            AUTHENTICATE WITH YOUR CREDENTIALS
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleAuthenticate} autoComplete="off" className="space-y-4">
          {/* Operator Identifier Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono-code text-slate-300 tracking-wider flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                ENTER AUTHORISED ID
              </label>
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
              <label className="text-[11px] font-mono-code text-slate-300 tracking-wider flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                ENTER VALID PASS KEY
              </label>
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
          </div>

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
      </div>
    </div>
  );
};
