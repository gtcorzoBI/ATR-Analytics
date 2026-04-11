import React, { useEffect } from 'react';
import { DevProvider, useDev } from '../context/DevContext';
import { useAuth } from '../context/AuthContext';
import { useDataStore } from '../hooks/useDataStore';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Modular Components
import DevHeader from '../components/dev/DevHeader';
import DevLanding from '../components/dev/DevLanding';
import DevSidebar from '../components/dev/DevSidebar';
import DevWorkspace from '../components/dev/DevWorkspace';
import GraphBank from '../components/dev/GraphBank';
import DashboardBuilder from '../components/DashboardBuilder';
import DataExplorer from '../components/dev/canvas/DataExplorer';

function DevDashboardContent() {
  const { user } = useAuth();
  const { 
    viewMode, setViewMode, dark, theme, 
    showDashboard, setShowDashboard,
    savedComponents, dataSources
  } = useDev() as any;
  const { devCanvas } = useDataStore() as any;

  // v6: Auto-load Snapshots on mount if arriving at landing
  useEffect(() => {
    const snapshot = localStorage.getItem("atr_dev_snapshot");
    if (snapshot && viewMode === 'landing') {
        const { timestamp } = JSON.parse(snapshot);
        const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        if (ageInHours < 24) {
            console.log("Snapshot detected, Jonathan. Select 'Continuar' or 'Nuevo'.");
        }
    }
  }, []);

  if (viewMode === 'landing' || viewMode === 'edit_selection') {
    return (
        <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} transition-colors duration-500`}>
            <DevLanding />
        </div>
    );
  }

  if (viewMode === 'canvas_setup') {
    return (
        <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} transition-colors duration-200`}>
            <DevHeader />
            <DataExplorer />
        </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden transition-colors duration-200`}>
        <DevHeader />
        
        <div className="flex-1 flex overflow-hidden">
            <DevSidebar />
            <DevWorkspace />
            <GraphBank />
        </div>

        {/* Modals shared by context */}
        {showDashboard && (
            <DashboardBuilder
                components={savedComponents}
                connections={dataSources}
                dark={dark}
                onClose={() => setShowDashboard(false)}
            />
        )}
    </div>
  );
}

export default function DevDashboard() {
  return (
    <DndProvider backend={HTML5Backend}>
      <DevProvider>
        <DevDashboardContent />
      </DevProvider>
    </DndProvider>
  );
}
