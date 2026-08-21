import React, { useState } from 'react';
import { 
  X, FileText, Settings, Video, Plus, Trash2, Edit3, 
  ExternalLink, Check, AlertTriangle, Play, HardDrive, 
  Eye, Save, ArrowUp, ArrowDown, Power, HelpCircle, Shield
} from 'lucide-react';
import { CyberModule, PanelDownloadFile, PanelSetupStep, PanelSetupContent } from '../../types';
import { apiClient } from '../../services/apiClient';
import { PanelFilesView } from '../panel/PanelFilesView';
import { PanelSetupView } from '../panel/PanelSetupView';

interface AdminPanelContentModalProps {
  panel: CyberModule;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminPanelContentModal: React.FC<AdminPanelContentModalProps> = ({
  panel,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'FILES' | 'SETUP' | 'PREVIEW'>('FILES');
  const [previewSubTab, setPreviewSubTab] = useState<'FILES' | 'SETUP'>('FILES');

  // Files State
  const [filesEnabled, setFilesEnabled] = useState<boolean>(panel.filesEnabled !== false);
  const [files, setFiles] = useState<PanelDownloadFile[]>(panel.files || []);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [fileForm, setFileForm] = useState<Partial<PanelDownloadFile>>({
    title: '',
    downloadUrl: '',
    description: '',
    version: panel.version || '1.0.0',
    fileSize: '',
  });

  // Setup State
  const [setupEnabled, setSetupEnabled] = useState<boolean>(panel.setupEnabled !== false);
  const [videoTitle, setVideoTitle] = useState(panel.setup?.videoTitle || '');
  const [videoUrl, setVideoUrl] = useState(panel.setup?.videoUrl || '');
  const [instructions, setInstructions] = useState(panel.setup?.instructions || '');
  const [steps, setSteps] = useState<PanelSetupStep[]>(panel.setup?.steps || []);
  const [importantNotes, setImportantNotes] = useState<string[]>(panel.setup?.importantNotes || []);

  // Step Add/Edit State
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepDescription, setStepDescription] = useState('');

  // Note Input
  const [newNote, setNewNote] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // ==========================================
  // FILES HANDLERS
  // ==========================================
  const handleSaveFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileForm.title || !fileForm.downloadUrl) {
      setError('File title and download URL are required.');
      return;
    }
    setError('');

    const newFileObj: PanelDownloadFile = {
      id: editingFileIndex !== null && files[editingFileIndex]?.id 
        ? files[editingFileIndex].id 
        : `file-${Date.now()}`,
      panelId: panel.id,
      title: (fileForm.title || '').trim(),
      downloadUrl: (fileForm.downloadUrl || '').trim(),
      description: (fileForm.description || '').trim(),
      version: (fileForm.version || '').trim(),
      fileSize: (fileForm.fileSize || '').trim(),
      orderIndex: editingFileIndex !== null ? editingFileIndex + 1 : files.length + 1,
      createdAt: new Date().toISOString(),
    };

    if (editingFileIndex !== null) {
      const updated = [...files];
      updated[editingFileIndex] = newFileObj;
      setFiles(updated);
      setEditingFileIndex(null);
    } else {
      setFiles([...files, newFileObj]);
    }

    setFileForm({
      title: '',
      downloadUrl: '',
      description: '',
      version: panel.version || '1.0.0',
      fileSize: '',
    });
  };

  const handleEditFile = (index: number) => {
    const f = files[index];
    setEditingFileIndex(index);
    setFileForm({ ...f });
  };

  const handleDeleteFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (editingFileIndex === index) {
      setEditingFileIndex(null);
      setFileForm({ title: '', downloadUrl: '', description: '', version: '', fileSize: '' });
    }
  };

  // ==========================================
  // SETUP STEPS HANDLERS
  // ==========================================
  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle) {
      setError('Step title is required.');
      return;
    }
    setError('');

    const newStepObj: PanelSetupStep = {
      id: editingStepIndex !== null && steps[editingStepIndex]?.id 
        ? steps[editingStepIndex].id 
        : `step-${Date.now()}`,
      stepNumber: editingStepIndex !== null ? editingStepIndex + 1 : steps.length + 1,
      title: stepTitle.trim(),
      description: stepDescription.trim(),
    };

    if (editingStepIndex !== null) {
      const updated = [...steps];
      updated[editingStepIndex] = newStepObj;
      setSteps(updated);
      setEditingStepIndex(null);
    } else {
      setSteps([...steps, newStepObj]);
    }

    setStepTitle('');
    setStepDescription('');
  };

  const handleEditStep = (index: number) => {
    const s = steps[index];
    setEditingStepIndex(index);
    setStepTitle(s.title);
    setStepDescription(s.description);
  };

  const handleDeleteStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));
    setSteps(updated);
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
      setStepTitle('');
      setStepDescription('');
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSteps(updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  // Notes
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setImportantNotes([...importantNotes, newNote.trim()]);
    setNewNote('');
  };

  const handleDeleteNote = (index: number) => {
    setImportantNotes(importantNotes.filter((_, i) => i !== index));
  };

  // ==========================================
  // SAVE ALL CONTENT TO BACKEND & FIRESTORE
  // ==========================================
  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    try {
      const setupPayload: PanelSetupContent = {
        panelId: panel.id,
        enabled: setupEnabled,
        videoTitle: videoTitle.trim(),
        videoUrl: videoUrl.trim(),
        instructions: instructions.trim(),
        steps: steps.map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
        importantNotes,
        updatedAt: new Date().toISOString(),
      };

      await apiClient.updatePanelContent(panel.id, {
        filesEnabled,
        setupEnabled,
        files,
        setup: setupPayload,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSaved();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save panel content.');
    } finally {
      setSaving(false);
    }
  };

  // Live preview module object
  const previewPanelObject: CyberModule = {
    ...panel,
    filesEnabled,
    setupEnabled,
    files,
    setup: {
      panelId: panel.id,
      enabled: setupEnabled,
      videoTitle,
      videoUrl,
      instructions,
      steps,
      importantNotes,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div 
        className="w-full max-w-4xl rounded-3xl cyber-glass border border-cyan-500/40 shadow-[0_0_70px_rgba(0,242,254,0.25)] bg-slate-950 flex flex-col my-auto max-h-[92dvh] overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  PANEL CONTENT
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  ID: {panel.id}
                </span>
              </div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white tracking-wide truncate max-w-sm sm:max-w-lg">
                {panel.name} — FILES & SETUP CONFIG
              </h2>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('FILES')}
              className={`px-4 py-2 rounded-xl text-xs font-mono-code font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'FILES'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>FILES / DOWNLOADS ({files.length})</span>
              <span className={`w-2 h-2 rounded-full ${filesEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETUP')}
              className={`px-4 py-2 rounded-xl text-xs font-mono-code font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'SETUP'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>SETUP GUIDE & VIDEO ({steps.length} Steps)</span>
              <span className={`w-2 h-2 rounded-full ${setupEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-mono-code font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>LIVE USER PREVIEW</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono-code flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 1: FILES MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'FILES' && (
            <div className="space-y-6">
              {/* Files Enable Toggle */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Power className={`w-4 h-4 ${filesEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    USER "FILES" ACCESS BUTTON
                  </h4>
                  <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                    When enabled, users who click "FILES" on this panel will access the download repository.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFilesEnabled(!filesEnabled)}
                  className={`px-4 py-2 rounded-xl font-mono-code text-xs font-bold transition-all cursor-pointer border ${
                    filesEnabled
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                      : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filesEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                </button>
              </div>

              {/* Add / Edit File Form */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="font-display font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {editingFileIndex !== null ? 'EDIT FILE RESOURCE' : 'ADD NEW FILE RESOURCE'}
                </h4>

                <form onSubmit={handleSaveFile} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                        FILE TITLE / NAME *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aegis_Sentinel_Core_v4.8.2.zip"
                        value={fileForm.title || ''}
                        onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                        DOWNLOAD LINK / URL *
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://... or download URL"
                        value={fileForm.downloadUrl || ''}
                        onChange={(e) => setFileForm({ ...fileForm, downloadUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                        VERSION (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. v4.8.2-PRO"
                        value={fileForm.version || ''}
                        onChange={(e) => setFileForm({ ...fileForm, version: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                        FILE SIZE (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 24.8 MB"
                        value={fileForm.fileSize || ''}
                        onChange={(e) => setFileForm({ ...fileForm, fileSize: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                      SHORT DESCRIPTION (OPTIONAL)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief note about the payload, driver, or archive."
                      value={fileForm.description || ''}
                      onChange={(e) => setFileForm({ ...fileForm, description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {editingFileIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFileIndex(null);
                          setFileForm({ title: '', downloadUrl: '', description: '', version: '', fileSize: '' });
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-mono-code text-slate-400 hover:text-white"
                      >
                        CANCEL
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-code font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingFileIndex !== null ? 'UPDATE FILE' : 'ADD FILE TO LIST'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Files List */}
              <div className="space-y-3">
                <h4 className="font-display font-bold text-sm text-white flex items-center justify-between">
                  <span>PUBLISHED FILES FOR THIS PANEL ({files.length})</span>
                  <span className="text-xs font-mono-code text-slate-400">Order appears as listed</span>
                </h4>

                {files.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs font-mono-code text-slate-500">
                    No files configured yet. Add your first file download link above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div 
                        key={file.id || idx}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-mono-code text-slate-400 flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-display font-bold text-sm text-white truncate">
                              {file.title}
                            </span>
                            {file.version && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                                {file.version}
                              </span>
                            )}
                            {file.fileSize && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-900 text-slate-400">
                                {file.fileSize}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono-code text-cyan-400/80 truncate pl-7">
                            {file.downloadUrl}
                          </div>
                          {file.description && (
                            <div className="text-xs font-mono-code text-slate-400 pl-7">
                              {file.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditFile(idx)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                            title="Edit File"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(idx)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: SETUP GUIDE & VIDEO MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'SETUP' && (
            <div className="space-y-6">
              {/* Setup Enable Toggle */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Power className={`w-4 h-4 ${setupEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    USER "SETUP" ACCESS BUTTON
                  </h4>
                  <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                    When enabled, users who click "SETUP" on this panel will access the step-by-step setup and video guide.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSetupEnabled(!setupEnabled)}
                  className={`px-4 py-2 rounded-xl font-mono-code text-xs font-bold transition-all cursor-pointer border ${
                    setupEnabled
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                      : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {setupEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                </button>
              </div>

              {/* Video Section Configuration */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="font-display font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  VIDEO TUTORIAL (YOUTUBE / DIRECT LINK)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                      VIDEO TITLE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Complete Setup & Installation Video"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                      VIDEO URL (YOUTUBE / VIMEO / MP4)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions / Overview */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <label className="text-xs font-display font-bold text-white block">
                  SETUP OVERVIEW & SYSTEM PREREQUISITES
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview instructions, system requirements, or guidelines displayed at the top of the Setup page."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none resize-y"
                />
              </div>

              {/* Step-by-Step Builder */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="font-display font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {editingStepIndex !== null ? 'EDIT PROCEDURE STEP' : 'ADD PROCEDURE STEP'}
                </h4>

                <form onSubmit={handleSaveStep} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                      STEP TITLE *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Extract and Run Launcher as Admin"
                      value={stepTitle}
                      onChange={(e) => setStepTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                      STEP DESCRIPTION & INSTRUCTIONS
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detailed instructions for the user to complete this step."
                      value={stepDescription}
                      onChange={(e) => setStepDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-cyan-400 outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {editingStepIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStepIndex(null);
                          setStepTitle('');
                          setStepDescription('');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-mono-code text-slate-400 hover:text-white"
                      >
                        CANCEL
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-code font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingStepIndex !== null ? 'UPDATE STEP' : 'ADD STEP TO LIST'}</span>
                    </button>
                  </div>
                </form>

                {/* Steps List */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <h5 className="font-mono-code font-bold text-xs text-white">
                    STEPS IN PROCEDURE ({steps.length})
                  </h5>

                  {steps.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs font-mono-code text-slate-500">
                      No steps added yet. Use the form above to add numbered steps.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {steps.map((step, idx) => (
                        <div 
                          key={step.id || idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono-code font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <h5 className="font-display font-bold text-xs sm:text-sm text-white truncate">
                                {step.title}
                              </h5>
                              <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveStep(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStep(idx, 'down')}
                              disabled={idx === steps.length - 1}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditStep(idx)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                              title="Edit Step"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(idx)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Important Security Notes Builder */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h4 className="font-display font-bold text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  IMPORTANT SECURITY & OPERATIONAL NOTES
                </h4>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Requires Windows 10/11 x64. Turn off antivirus before extracting."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNote())}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white focus:border-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-code font-bold text-xs transition-colors shrink-0"
                  >
                    ADD NOTE
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {importantNotes.map((note, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs font-mono-code text-amber-200">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {note}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(idx)}
                        className="text-amber-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: LIVE PREVIEW */}
          {/* ========================================== */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  SIMULATING USER VIEW:
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab('FILES')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold transition-all ${
                      previewSubTab === 'FILES'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    FILES PAGE
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab('SETUP')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold transition-all ${
                      previewSubTab === 'SETUP'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    SETUP PAGE
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 shadow-inner">
                {previewSubTab === 'FILES' ? (
                  <PanelFilesView
                    panel={previewPanelObject}
                    onBack={() => {}}
                    onOpenSetup={() => setPreviewSubTab('SETUP')}
                  />
                ) : (
                  <PanelSetupView
                    panel={previewPanelObject}
                    onBack={() => {}}
                    onOpenFiles={() => setPreviewSubTab('FILES')}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Modal Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-slate-300 font-bold transition-colors cursor-pointer"
          >
            DISCARD / CLOSE
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className={`px-6 py-2.5 rounded-xl font-mono-code font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              saveSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>SAVED TO FIRESTORE & DB!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'SAVING CONTENT...' : 'SAVE ALL CHANGES'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
