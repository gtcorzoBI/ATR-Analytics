import React, { useState } from 'react';
import { Plus, LayoutDashboard, LayoutPanelTop, Search, Layers, Box, ChevronRight, PenSquare, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore, INITIAL_AREAS, AREA_NAMES } from '../../hooks/useDataStore';

export default function DevLanding() {
  const { dark, theme, setViewMode } = useDev() as any;
  const { drafts, systemDashboards, resetCanvas } = useDataStore() as any;
  
  const [securityGate, setSecurityGate] = useState({ isOpen: false, dashboard: null as any });

  const startCreate = async () => {
    await resetCanvas();
    setViewMode('canvas_setup');
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

  const modules = [
    { 
      id: 'nuevo', 
      title: 'Nuevo Lienzo', 
      desc: 'Inicia un proyecto desde cero conectando fuentes de datos.', 
      icon: Plus, 
      color: 'bg-indigo-500', 
      action: startCreate 
    },
    { 
      id: 'editar', 
      title: 'Editar Lienzo', 
      desc: 'Modifica y rehidrata dashboards publicados en el marketplace.', 
      icon: LayoutDashboard, 
      color: 'bg-orange-500', 
      action: () => setViewMode('edit_selection') 
    },
    { 
      id: 'graficos', 
      title: 'Crear Gráficos', 
      desc: 'Construye visualizaciones atómicas con JSX Engine.', 
      icon: Box, 
      color: 'bg-pink-500', 
      action: () => { setViewMode('main'); } // Will add logic to set mode to 'code'
    },
    { 
      id: 'borradores', 
      title: 'Borradores', 
      desc: 'Continua trabajando en tus proyectos guardados localmente.', 
      icon: Layers, 
      color: 'bg-emerald-500', 
      action: () => setViewMode('draft_selection') 
    }
  ];

  return (
    <main className="flex-1 overflow-y-auto p-8 lg:p-16 bg-gradient-to-br from-transparent to-indigo-500/5">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Welcome Section */}
        <div className="space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
            DataCanvas O.S. v1.0
          </div>
          <h1 className={`text-4xl lg:text-6xl font-black tracking-tighter leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
            Bienvenido al <span className="text-indigo-500 italic">Laboratorio DEV.</span>
          </h1>
          <p className={`text-lg ${theme.muted} max-w-2xl mx-auto lg:mx-0 font-medium`}>
            Tu centro de mando para la creación de BI autónomo. Selecciona un módulo para comenzar.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={m.action}
              className={`group flex flex-col p-8 rounded-[32px] border ${theme.border} ${theme.surface} text-left transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 active:scale-95`}
            >
              <div className={`w-14 h-14 rounded-2xl ${m.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-${m.color.split('-')[1]}-500/30 group-hover:scale-110 transition-transform duration-300`}>
                <m.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black mb-2">{m.title}</h3>
              <p className={`text-xs ${theme.muted} leading-relaxed font-medium mb-8`}>{m.desc}</p>
              <div className="mt-auto flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Acceder <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        {/* Quick View Dashboard/State */}
        <div className={`p-10 rounded-[40px] border ${theme.border} ${theme.surface} relative overflow-hidden bg-gradient-to-r from-transparent to-indigo-500/5`}>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left">
               <h3 className="text-2xl font-black tracking-tight">Estado de Activos</h3>
               <p className={`text-sm ${theme.muted} font-medium`}>Monitoreo en tiempo real de tus publicaciones en el marketplace interno.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { label: 'Dashboards', val: drafts?.length || 0, icon: LayoutDashboard },
                { label: 'Componentes', val: '0', icon: Box },
                { label: 'Versiones', val: '1.0', icon: RefreshCw }
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                   <div className="text-3xl font-black text-indigo-500">{s.val}</div>
                   <div className={`text-[9px] font-black uppercase tracking-wider ${theme.muted}`}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[120px] rounded-full -mr-32 -mt-32" />
        </div>
      </div>
    </main>
  );
}
