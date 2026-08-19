import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, ShieldAlert, Check, Copy, RefreshCw, X, ArrowRight } from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';

interface CyberRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreAccess: (username: string) => void;
}

const SAMPLE_MNEMONIC = [
  'quantum', 'cipher', 'nexus', 'shield', 'entropy', 'vertex',
  'plasma', 'orbital', 'matrix', 'beacon', 'vector', 'zenith'
];

export const CyberRecoveryModal: React.FC<CyberRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRestoreAccess,
}) => {
  const [operatorId, setOperatorId] = useState('OPERATOR_77');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(SAMPLE_MNEMONIC);
  const [isRecovering, setIsRecovering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const handleRegenerateSeed = () => {
    cyberAudio.playClick(1100);
    const pool = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'kappa', 'lambda', 'sigma', 'omega', 'titan', 'aurora', 'pulsar', 'hyperion', 'quasar'];
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 12);
    setMnemonicWords(shuffled);
  };

  const handleCopySeed = () => {
    cyberAudio.playClick(1300);
    navigator.clipboard.writeText(mnemonicWords.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    cyberAudio.playScan();
    setIsRecovering(true);

    setTimeout(() => {
      setIsRecovering(false);
      setRecovered(true);
      cyberAudio.playAccessGranted();

      setTimeout(() => {
        onRestoreAccess(operatorId);
        onClose();
      }, 1200);
    }, 1500);
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
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-lg rounded-2xl cyber-glass p-6 border border-cyan-500/30 shadow-[0_0_50px_-10px_rgba(0,242,254,0.3)] z-10 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(11, 16, 26, 0.95) 0%, rgba(6, 9, 15, 0.98) 100%)',
          }}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          <button
            onClick={() => {
              cyberAudio.playClick(900);
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white tracking-wider">
                EMERGENCY CIPHER RECOVERY
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                Cryptographic Key Re-generation Protocol
              </p>
            </div>
          </div>

          <form onSubmit={handleExecuteRecovery} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono-code text-slate-400 mb-1.5">
                OPERATOR DESIGNATION / USER ID
              </label>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none text-xs font-mono-code text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono-code text-slate-400">
                  12-WORD MNEMONIC RESTORATION SEED
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateSeed}
                    className="text-[10px] font-mono-code text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    RE-GENERATE
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleCopySeed}
                    className="text-[10px] font-mono-code text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                {mnemonicWords.map((word, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-1.5 text-xs font-mono-code text-slate-300"
                  >
                    <span className="text-[10px] text-cyan-500/70 font-semibold w-4">
                      {idx + 1}.
                    </span>
                    <span className="font-medium text-slate-200">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200/90 font-mono-code">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Restoring with this mnemonic will rotate the terminal session hash and revoke previous active tokens.
              </span>
            </div>

            <button
              type="submit"
              disabled={isRecovering || recovered}
              className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-[0_0_25px_-5px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  RE-COMPUTING CIPHER TREE...
                </>
              ) : recovered ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  CREDENTIALS RESTORED // LOGGING IN...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  RESTORE ACCESS & LOG IN
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
