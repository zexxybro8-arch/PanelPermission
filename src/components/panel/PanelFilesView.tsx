import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Download, Copy, CheckCircle2, FileText, 
  ExternalLink, HardDrive, ShieldCheck, AlertCircle, RefreshCw, Lock
} from 'lucide-react';
import { CyberModule, PanelDownloadFile } from '../../types';
import { apiClient } from '../../services/apiClient';
import { cyberAudio } from '../../utils/cyberAudio';
import { appStore } from '../../store/appStore';

interface PanelFilesViewProps {
  panel: CyberModule;
  onBack: () => void;
  onOpenSetup?: () => void;
  onOpenBuy?: () => void;
}

export const PanelFilesView: React.FC<PanelFilesViewProps> = ({
  panel,
  onBack,
  onOpenSetup,
  onOpenBuy,
}) => {
  const [files, setFiles] = useState<PanelDownloadFile[]>(panel.files || []);
  const [filesEnabled, setFilesEnabled] = useState<boolean>(panel.filesEnabled !== false);
  const [showFilesSetupGuide, setShowFilesSetupGuide] = useState<boolean>(!!appStore.state.settings?.showFilesSetupGuide);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setShowFilesSetupGuide(!!appStore.state.settings?.showFilesSetupGuide);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Refresh content from store/API
    const loadContent = async () => {
      setLoading(true);
      try {
        const content = await apiClient.getPanelContent(panel.id);
        if (content) {
          setFiles(content.files || []);
          setFilesEnabled(content.filesEnabled !== false);
        }
      } catch (err) {
        console.warn('Failed to load panel files:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [panel.id]);

  const handleCopyLink = (url: string, fileId: string) => {
    cyberAudio.playClick(1000);
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownload = (file: PanelDownloadFile) => {
    cyberAudio.playScan();
    setDownloadingId(file.id);
    setTimeout(() => {
      setDownloadingId(null);
      if (file.downloadUrl) {
        window.open(file.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    }, 400);
  };

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
                  <FileText className="w-3 h-3 text-cyan-400" />
                  FILE DOWNLOAD REPOSITORY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-slate-400 border border-slate-700">
                  VERSION: {panel.version || '1.0.0'}
                </span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wider">
                {panel.name} — FILES
              </h1>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Official releases, payload packages, binaries, and configurations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {showFilesSetupGuide && onOpenSetup && (
              <button
                type="button"
                onClick={onOpenSetup}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs font-mono-code text-cyan-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>SETUP GUIDE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!filesEnabled ? (
        <div className="w-full rounded-3xl cyber-glass p-8 border border-amber-500/30 bg-slate-950/90 text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-display font-bold text-white tracking-wide">
              FILES REPOSITORY TEMPORARILY DISABLED
            </h3>
            <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
              The administrator has temporarily paused file downloads for <span className="text-amber-300 font-bold">{panel.name}</span>. Please check back shortly or consult the setup guide.
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
      ) : files.length === 0 ? (
        /* Empty State */
        <div className="w-full rounded-3xl cyber-glass p-10 border border-slate-800 bg-slate-950/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto shadow-inner">
            <HardDrive className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-display font-bold text-white">
              NO FILES CURRENTLY PUBLISHED
            </h3>
            <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
              Admin has not uploaded any downloadable assets or packages for this panel yet. Files will appear here automatically once uploaded.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-white transition-colors cursor-pointer"
            >
              RETURN TO PANELS
            </button>
          </div>
        </div>
      ) : (
        /* Files Grid / List */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs font-mono-code text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              AVAILABLE DOWNLOADS ({files.length})
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              VERIFIED CHECKSUMS OK
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {files.map((file, idx) => {
              const isCopied = copiedId === file.id;
              const isDownloading = downloadingId === file.id;

              return (
                <div
                  key={file.id || idx}
                  className="rounded-2xl cyber-glass p-5 border border-slate-800/90 hover:border-cyan-500/40 bg-slate-950/70 hover:bg-slate-900/60 transition-all duration-200 group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors truncate">
                          {file.title || 'Downloadable Package'}
                        </h4>
                        {file.version && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                            {file.version}
                          </span>
                        )}
                        {file.fileSize && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-900 text-slate-400 border border-slate-800">
                            {file.fileSize}
                          </span>
                        )}
                      </div>

                      {file.description && (
                        <p className="text-xs font-mono-code text-slate-400 leading-relaxed line-clamp-2">
                          {file.description}
                        </p>
                      )}

                      <div className="text-[10px] font-mono-code text-slate-500 flex items-center gap-2 pt-0.5">
                        <span className="truncate max-w-[280px] sm:max-w-md text-slate-600">
                          URL: {file.downloadUrl || 'Link configured'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(file.downloadUrl, file.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title="Copy Direct Download Link"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">COPY LINK</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={!file.downloadUrl}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono-code font-bold text-xs flex items-center gap-2 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_22px_rgba(0,242,254,0.5)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                      <span>{isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
