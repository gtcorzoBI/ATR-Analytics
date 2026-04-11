import React, { useState, useEffect } from 'react';
import { X, Play, Columns3, Database, LayoutDashboard, Code2, Loader2, AlertCircle, RefreshCw, BarChart3, Save } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore } from '../../hooks/useDataStore';
import SyntaxHighlighter from '../SyntaxHighlighter';
import ChartPreview from '../ChartPreview';
import { VISUAL_DEFINITIONS, getEmptyMapping } from '../VisualDefinitions';
import RelationCanvas from '../RelationCanvas';
import VisualBuilder from './canvas/VisualBuilder';
import DashboardCanvas from './canvas/DashboardCanvas';

export default function DevWorkspace() {
  const { 
    dark, theme, tabs, setTabs, activeTabId, setActiveTabId, patchTab,
    workspaceMode, setWorkspaceMode, savedComponents
  } = useDev() as any;
  const { saveDevMeasure } = useDataStore() as any;

  const activeTab = tabs.find((t: any) => t.id === activeTabId);

  const getEnv = (key: string, fallback: string) => {
    try {
      return (import.meta as any).env[key] || fallback;
    } catch {
      return fallback;
    }
  };

  const API = getEnv("VITE_API_URL", "http://localhost:3001");

  if (!activeTab) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${theme.bg}`}>
        <div className="text-center opacity-20">
          <LayoutDashboard className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest">Workspace Vacío</h2>
          <p className="text-xs mt-2">Explora tablas o abre un borrador para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${theme.bg}`}>
      {/* Tabs Header */}
      <div className={`h-10 flex items-center bg-black/5 dark:bg-black/20 border-b ${theme.border} space-x-1 px-2 shrink-0`}>
        {tabs.map((t: any) => (
          <div 
            key={t.id} 
            onClick={() => setActiveTabId(t.id)}
            className={`h-full flex items-center px-4 gap-3 cursor-pointer border-x ${theme.border} transition-all ${activeTabId === t.id ? `${theme.surface} border-t-2 border-t-indigo-500` : `opacity-60 hover:opacity-100`}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[120px]">{t.title}</span>
            <button onClick={(e) => { e.stopPropagation(); setTabs(tabs.filter((tab: any) => tab.id !== t.id)); if (activeTabId === t.id) setActiveTabId(tabs[0]?.id || null); }} className="hover:text-red-500">
               <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
          {workspaceMode === 'relations' ? (
              <RelationCanvas 
                nodes={[]} 
                edges={[]} 
                onNodesChange={() => {}} 
                onEdgesChange={() => {}} 
                dark={dark} 
              />
          ) : workspaceMode === 'graphic' ? (
              <VisualBuilder />
          ) : workspaceMode === 'dashboard' ? (
              <DashboardCanvas />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center opacity-20">
                    <Database className="w-12 h-12" />
                </div>
            </div>
          )}
      </div>
    </div>
  );
}
