import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error (Jonathan, look here):', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full animate-pulse" />
               <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-red-500/50">
                  <ShieldAlert className="w-12 h-12 text-red-500" />
               </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter text-white">Oops, algo se detuvo.</h1>
              <p className="text-slate-400 font-medium text-lg max-w-md mx-auto">
                Jonathan, el sistema detectó una anomalía en el motor de renderizado. No te preocupes, tus datos están a salvo.
              </p>
            </div>

            {/* Technical Detail (Collapsed or subtle) */}
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-[10px] font-mono text-red-400/70 text-left overflow-auto max-h-32 scrollbar-hide">
               {this.state.error?.toString()}
               <br />
               {this.state.error?.stack?.split('\n').slice(0, 3).join('\n')}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
               <button 
                 onClick={() => window.location.reload()}
                 className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
               >
                 <RefreshCw className="w-4 h-4" /> Reintentar Carga
               </button>
               <button 
                 onClick={this.handleReset}
                 className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] transition hover:bg-white/10 flex items-center justify-center gap-2"
               >
                 <Home className="w-4 h-4" /> Volver al Inicio
               </button>
            </div>

            <div className="pt-8 opacity-20 text-[9px] font-black uppercase tracking-[0.3em] text-white">
               DataCanvas Security Protocol v1.0
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
