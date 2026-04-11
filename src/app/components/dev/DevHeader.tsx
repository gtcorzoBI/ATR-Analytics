import React from 'react';
import { ChevronLeft, BarChart3, LayoutDashboard, Code2, Database, Sun, Moon, LogOut } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useAuth } from '../../context/AuthContext';

export default function DevHeader() {
  const { 
    viewMode, setViewMode, workspaceMode, setWorkspaceMode, 
    dark, toggleTheme, theme 
  } = useDev() as any;
  const { user, logout } = useAuth();

  if (viewMode === 'landing') return null;

  return (
    <header className={`h-11 ${theme.surface} ${theme.border} border-b flex items-center justify-between px-4 shrink-0 z-30`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setViewMode('landing')}
          className={`flex items-center gap-1.5 text-[10px] font-bold ${theme.muted} hover:text-indigo-400 transition pr-3 border-r ${theme.border}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Inicio
        </button>
        <div className="flex items-center gap-2.5 mr-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm tracking-tight">DataCanvas O.S.</span>
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-widest font-black">DEV</span>
        </div>

        <div className={`flex items-center p-0.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg border ${theme.border}`}>
          <button 
            onClick={() => setWorkspaceMode('graphic')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'graphic' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : `text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700/50`}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Gráfica
          </button>
          <button 
            onClick={() => setWorkspaceMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'code' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : `text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700/50`}`}
          >
            <Code2 className="w-3.5 h-3.5" /> Código JSX
          </button>
          <button 
            onClick={() => setWorkspaceMode('relations')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'relations' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm' : `text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700/50`}`}
          >
            <Database className="w-3.5 h-3.5" /> Relaciones
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r ${theme.border}">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className={`text-[11px] font-bold ${theme.text}`}>{user?.firstName} {user?.lastName}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className={`p-1.5 rounded-lg ${theme.hover} ${theme.text} transition`}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={logout} className={`p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition`} title="Cerrar Sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
