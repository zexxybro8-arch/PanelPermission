import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-slate-950/90 border border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.2)] text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-300 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-white tracking-wider">
              {this.props.fallbackTitle || 'MODULE TELEMETRY ERROR'}
            </h3>
            <p className="text-xs font-mono-code text-slate-400">
              An isolated execution anomaly occurred in this admin module view.
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono-code text-rose-400 text-left overflow-x-auto max-h-32">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-display font-extrabold text-xs tracking-wider flex items-center gap-2 mx-auto cursor-pointer shadow-[0_0_20px_rgba(0,242,254,0.3)]"
          >
            <RotateCcw className="w-4 h-4 text-slate-950 font-bold" />
            <span>REINITIALIZE MODULE</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
