import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Play, Settings, FileText, CheckCircle2, 
  AlertTriangle, ShieldAlert, Check, HelpCircle, ExternalLink,
  Layers, Lock, Video, RefreshCw
} from 'lucide-react';
import { CyberModule, PanelSetupContent, PanelSetupStep, UserProfile } from '../../types';
import { apiClient } from '../../services/apiClient';
import { cyberAudio } from '../../utils/cyberAudio';
import { appStore } from '../../store/appStore';

interface PanelSetupViewProps {
  panel: CyberModule;
  user?: UserProfile;
  onBack: () => void;
  onOpenFiles?: () => void;
  onOpenBuy?: () => void;
}

// Helper to convert standard YouTube/Vimeo URLs to embeddable URLs
function formatVideoEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  try {
    // YouTube
    if (clean.includes('youtube.com/watch?v=')) {
      const videoId = clean.split('watch?v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : clean;
    }
    if (clean.includes('youtu.be/')) {
      const videoId = clean.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : clean;
    }
    // YouTube Shorts
    if (clean.includes('youtube.com/shorts/')) {
      const videoId = clean.split('youtube.com/shorts/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : clean;
    }
    // Vimeo
    if (clean.includes('vimeo.com/') && !clean.includes('player.vimeo.com')) {
      const videoId = clean.split('vimeo.com/')[1]?.split('?')[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : clean;
    }
    return clean;
  } catch {
    return clean;
  }
}

export const PanelSetupView: React.FC<PanelSetupViewProps> = ({
  panel,
  user,
  onBack,
  onOpenFiles,
  onOpenBuy,
}) => {
  const [setupData, setSetupData] = useState<PanelSetupContent | null>(panel.setup || null);
  const [setupEnabled, setSetupEnabled] = useState<boolean>(panel.setupEnabled !== false);
  const [showFilesSetupGuide, setShowFilesSetupGuide] = useState<boolean>(!!appStore.state.settings?.showFilesSetupGuide);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkKey = () => {
      const userId = user?.id || user?.customer_id || user?.username || '';
      const valid = appStore.hasValidKeyForPanel(userId, panel.id);
      setHasKey(valid);
    };

    const loadContent = async () => {
      setLoading(true);
      try {
        const content = await apiClient.getPanelContent(panel.id);
        if (content) {
          setSetupData(content.setup || null);
          setSetupEnabled(content.setupEnabled !== false);
        }
      } catch (err) {
        console.warn('Failed to load setup content:', err);
      } finally {
        setLoading(false);
      }
    };

    checkKey();
    loadContent();

    const unsubscribe = appStore.subscribe(() => {
      setShowFilesSetupGuide(!!appStore.state.settings?.showFilesSetupGuide);
      checkKey();
      loadContent();
    });
    return () => unsubscribe();
  }, [user, panel.id]);

  const toggleStepCompleted = (stepId: string) => {
    cyberAudio.playClick(1100);
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const adminSetupEnabled = panel.setupEnabled !== false && setupEnabled && (setupData ? setupData.enabled !== false : true);
  const setupAccessGranted = adminSetupEnabled && hasKey;

  const embedVideoUrl = formatVideoEmbedUrl(setupData?.videoUrl);
  const steps: PanelSetupStep[] = setupData?.steps || [];
  const importantNotes = setupData?.importantNotes || [];
  const totalSteps = steps.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-5xl mx-auto space-y-6"
    >
      {/* Header Banner */}
      <div 
        className="w-full rounded-3xl cyber-glass p-5 sm:p-6 border border-cyan-500/25 shadow-[0_0_50px_-15px_rgba(0,242,254,0.25)] relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(13, 19, 32, 0.94) 0%, rgba(7, 10, 18, 0.98) 100%)',
        }}
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                cyberAudio.playClick(900);
                onBack();
              }}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/50 text-slate-300 hover:text-white transition-all cursor-pointer group shrink-0"
              title="Back to Panels"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3 h-3 text-cyan-400" />
                  INITIALIZATION & SETUP GUIDE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-slate-400 border border-slate-700">
                  PANEL: {panel.tag || 'SYSTEM'}
                </span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
                {panel.name} — SETUP
              </h1>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Video walk-throughs, configuration steps, and runtime instructions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {onOpenFiles && (
              <button
                type="button"
                onClick={onOpenFiles}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs font-mono-code text-cyan-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>DOWNLOAD FILES</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {setupAccessGranted ? (
        <div className="space-y-6">
          {/* Video Section (If configured) */}
          {embedVideoUrl ? (
            <div className="rounded-3xl cyber-glass p-5 sm:p-6 border border-slate-800/90 bg-slate-950/80 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-white">
                      {setupData?.videoTitle || 'VIDEO WALKTHROUGH & INSTALLATION TUTORIAL'}
                    </h3>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      Step-by-step visual demonstration
                    </span>
                  </div>
                </div>

                <a
                  href={setupData?.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono-code text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>OPEN LINK</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Responsive 16:9 Video Player */}
              <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-inner aspect-video">
                <iframe
                  src={embedVideoUrl}
                  title={setupData?.videoTitle || 'Setup Video'}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            /* Optional placeholder if video not attached */
            <div className="rounded-2xl cyber-glass p-4 border border-slate-800/60 bg-slate-950/40 flex items-center justify-between text-xs font-mono-code text-slate-400">
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-500" />
                No video attached for this panel. Follow the written setup instructions below.
              </span>
            </div>
          )}

          {/* Instructions Overview */}
          {setupData?.instructions && (
            <div className="rounded-2xl cyber-glass p-5 border border-slate-800/80 bg-slate-950/60 space-y-2">
              <h4 className="font-mono-code font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                OVERVIEW & PREREQUISITES
              </h4>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed whitespace-pre-line">
                {setupData.instructions}
              </p>
            </div>
          )}

          {/* Steps Progress Tracker */}
          {totalSteps > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    STEP-BY-STEP PROCEDURE ({completedCount}/{totalSteps} COMPLETED)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono-code text-cyan-300 font-bold">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Step Cards List */}
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const stepId = step.id || `step-${index + 1}`;
                  const isDone = Boolean(completedSteps[stepId]);

                  return (
                    <div
                      key={stepId}
                      className={`rounded-2xl cyber-glass p-5 border transition-all duration-200 ${
                        isDone
                          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                          : 'border-slate-800/90 bg-slate-950/80 hover:border-cyan-500/40 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 flex-1">
                          {/* Number Badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono-code font-bold text-xs shrink-0 transition-colors ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                          }`}>
                            {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : (step.stepNumber || index + 1)}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <h4 className={`font-display font-bold text-sm sm:text-base transition-colors ${
                              isDone ? 'text-emerald-300 line-through decoration-emerald-500/50' : 'text-white'
                            }`}>
                              {step.title || `Step ${step.stepNumber || index + 1}`}
                            </h4>
                            <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        {/* Mark Done Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleStepCompleted(stepId)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono-code font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                            isDone
                              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-300'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span>{isDone ? 'DONE' : 'MARK DONE'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty steps fallback */}
          {totalSteps === 0 && !setupData?.instructions && (
            <div className="rounded-3xl cyber-glass p-8 border border-slate-800 bg-slate-950/70 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="font-display font-bold text-base text-white">
                NO SETUP STEPS CONFIGURED YET
              </h4>
              <p className="text-xs font-mono-code text-slate-400 max-w-sm mx-auto">
                Admin has not added step-by-step instructions for this panel yet. Please check back later or contact administrator.
              </p>
            </div>
          )}

          {/* Important Security Notes */}
          {importantNotes.length > 0 && (
            <div className="rounded-2xl cyber-glass p-5 border border-amber-500/30 bg-amber-950/15 space-y-2.5">
              <h4 className="font-mono-code font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                IMPORTANT SECURITY & OPERATIONAL NOTES
              </h4>
              <ul className="space-y-1.5 text-xs font-mono-code text-amber-200/90 list-disc pl-5">
                {importantNotes.map((note, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-white font-bold transition-colors cursor-pointer text-center"
            >
              RETURN TO PANELS
            </button>

            {onOpenFiles && (
              <button
                type="button"
                onClick={onOpenFiles}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono-code font-bold transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>PROCEED TO DOWNLOAD FILES</span>
              </button>
            )}
          </div>
        </div>
      ) : !adminSetupEnabled ? (
        <div className="w-full rounded-3xl cyber-glass p-8 border border-amber-500/30 bg-slate-950/90 text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-display font-bold text-white tracking-wide">
              SETUP GUIDE CURRENTLY OFF
            </h3>
            <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
              {!setupEnabled ? `The administrator has temporarily hidden the setup manual for ${panel.name}.` : 'The setup guide feature is currently toggled OFF in the admin global settings.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-white font-bold transition-colors cursor-pointer"
            >
              RETURN TO PANELS
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-3xl cyber-glass p-8 sm:p-12 border border-rose-500/30 bg-slate-950/90 text-center space-y-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] my-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono-code font-bold bg-rose-950 text-rose-300 border border-rose-500/40 tracking-wider">
              ACCESS RESTRICTED
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wide">
              SETUP GUIDE LOCKED
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-mono-code leading-relaxed">
              You must successfully generate and hold a valid access key for <span className="text-cyan-300 font-bold">{panel.name}</span> to unlock the initialization and setup guide.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-white font-bold transition-colors cursor-pointer"
            >
              RETURN TO PANELS
            </button>
            {onOpenBuy && (
              <button
                type="button"
                onClick={onOpenBuy}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono-code text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,242,254,0.4)] cursor-pointer flex items-center gap-2"
              >
                <span>GENERATE KEY / PURCHASE ACCESS</span>
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
