import React, { useState } from 'react';
import { Plus, LayoutDashboard, LayoutPanelTop, Search, Layers, Box, ChevronRight, PenSquare, X, AlertCircle } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore, INITIAL_AREAS, AREA_NAMES } from '../../hooks/useDataStore';

export default function DevLanding() {
  const { dark, theme, setViewMode } = useDev() as any;
  const { drafts, systemDashboards, resetCanvas } = useDataStore() as any;
  
  const [securityGate, setSecurityGate] = useState({ isOpen: false, dashboard: null as any });

  const startCreate = async () => {
    await resetCanvas();
    setViewMode('main');
  };

  if (securityGate.isOpen) {
     // Simplifying security gate for the refactor
     return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className={`w-full max-w-md p-8 rounded-3xl border ${theme.border} ${theme.surface}`}>
                <h3 className="text-xl font-bold mb-4">Acceso al Editor</h3>
                <p className="text-sm opacity-60 mb-6">Conectando con {securityGate.dashboard?.title}...</p>
                <div className="flex gap-4">
                    <button onClick={() => setSecurityGate({isOpen: false, dashboard: null})} className="flex-1 py-3 opacity-50 font-bold">Cancelar</button>
                    <button onClick={() => setViewMode('main')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Entrar</button>
                </div>
            </div>
        </div>
     );
  }

  const hasSnapshot = localStorage.getItem("atr_dev_snapshot") !== null;

  const recoverSnapshot = () => {
    // Snapshots are already in the internal_canvas on load in some cases,
    // but here we ensure the view switches and the state is fresh
    setViewMode('main');
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 lg:p-16">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
              Laboratorio de Datos v6
            </div>
            <h1 className={`text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9] ${dark ? 'text-white' : 'text-slate-900'}`}>
              Desarrolla <br/> Componentes <br/> <span className="text-indigo-500 italic">Autónomos.</span>
            </h1>
            <p className={`text-lg ${theme.muted} leading-relaxed font-medium`}>
              DataCanvas O.S. es el primer motor de análisis que permite inyectar SQL y JSX directamente en el Marketplace.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={startCreate}
                className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/30 overflow-hidden active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Nuevo Proyecto
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              {hasSnapshot && (
                <button 
                  onClick={recoverSnapshot}
                  className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/30 overflow-hidden active:scale-95 animate-bounce-subtle"
                >
                   <span className="relative z-10 flex items-center gap-2">
                    <PenSquare className="w-5 h-5" /> Continuar Borrador
                  </span>
                </button>
              )}
              
              <button 
                onClick={() => setViewMode('edit_selection')}
                className={`px-8 py-4 ${theme.surface} border-2 ${theme.border} ${theme.text} hover:border-indigo-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95`}
              >
                Editar Dashboard
              </button>
            </div>
          </div>
          
          {/* Stats / Quick Box */}
          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
            {[
              { label: 'Borradores', val: drafts?.length || 0, icon: Layers, color: 'text-emerald-500' },
              { label: 'Componentes', val: '0', icon: Box, color: 'text-pink-500' }, // Needs count from store
              { label: 'Conexiones', val: '0', icon: Search, color: 'text-indigo-500' },
              { label: 'Marketplace', val: '0', icon: LayoutPanelTop, color: 'text-orange-500' }
            ].map(s => (
              <div key={s.label} className={`p-6 rounded-3xl border ${theme.border} ${theme.surface} space-y-2 group hover:border-indigo-500 transition-all`}>
                <s.icon className={`w-6 h-6 ${s.color} transition-transform group-hover:scale-110`} />
                <div className="text-2xl font-black">{s.val}</div>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Drafts */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Continuar Trabajo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {drafts.length === 0 && <p className="text-sm opacity-40 italic">No tienes borradores pendientes.</p>}
             {drafts.map((draft: any) => (
                <div key={draft.id} className={`group ${theme.surface} border ${theme.border} rounded-2xl p-6 hover:border-indigo-500 transition-all cursor-pointer`}>
                    <h4 className="font-bold text-lg mb-1">{draft.name}</h4>
                    <p className="text-xs opacity-50 mb-4">Último cambio: {new Date(draft.updatedAt).toLocaleDateString()}</p>
                    <button onClick={() => setViewMode('main')} className="w-full py-2 bg-indigo-500/10 text-indigo-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition">Abrir Borrador</button>
                </div>
             ))}
          </div>
        </div>
      </div>
    </main>
  );
}
