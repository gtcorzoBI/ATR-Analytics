import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDataStore } from '../hooks/useDataStore';

interface DevContextType {
  viewMode: 'landing' | 'main' | 'basico' | 'edit_selection' | 'draft_selection';
  setViewMode: (mode: any) => void;
  workspaceMode: 'graphic' | 'code' | 'relations';
  setWorkspaceMode: (mode: any) => void;
  dark: boolean;
  setDark: (dark: boolean | ((prev: boolean) => boolean)) => void;
  toggleTheme: () => void;
  
  // Tabs & Query State
  tabs: any[];
  setTabs: (tabs: any[]) => void;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  patchTab: (id: string, partial: any) => void;
  
  // Dashboard Builder State
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  dashItems: any[];
  
  // Sidebar/Inspector State
  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;
  trackedTables: any[];
  setTrackedTables: (tables: any[] | ((prev: any[]) => any[])) => void;
  
  // Global Dev Library
  dataSources: any[];
  savedComponents: any[];
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export function DevProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dataSources, devMeasures, devCanvas } = useDataStore() as any;

  const [viewMode, setViewMode] = useState<'landing'|'main'|'basico'|'edit_selection'|'draft_selection'>('landing');
  const [workspaceMode, setWorkspaceMode] = useState<'graphic'|'code'|'relations'>('graphic');
  const [dark, setDark] = useState(() => localStorage.getItem("dev_theme") !== "light");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const [tabs, setTabs] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [trackedTables, setTrackedTables] = useState<any[]>([]);

  const toggleTheme = () => {
    setDark(d => {
      const n = !d;
      localStorage.setItem("dev_theme", n ? "dark" : "light");
      return n;
    });
  };

  const patchTab = (id: string, partial: any) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...partial } : t));
  };

  return (
    <DevContext.Provider value={{
      viewMode, setViewMode,
      workspaceMode, setWorkspaceMode,
      dark, setDark, toggleTheme,
      tabs, setTabs,
      activeTabId, setActiveTabId,
      patchTab,
      showDashboard, setShowDashboard,
      dashItems: devCanvas || [],
      showRightPanel, setShowRightPanel,
      trackedTables, setTrackedTables,
      dataSources: dataSources || [],
      savedComponents: devMeasures || []
    }}>
      {children}
    </DevContext.Provider>
  );
}

export function useDev() {
  const context = useContext(DevContext);
  if (context === undefined) {
    throw new Error('useDev must be used within a DevProvider');
  }
  return context;
}
