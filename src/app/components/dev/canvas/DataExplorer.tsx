import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table2, Database, Search, Filter, Download, MoreHorizontal, 
  ChevronRight, ChevronDown, Layout, Maximize2, Info, 
  FileText, Zap, ShieldCheck, AlertCircle, Play,
  Upload, Globe2, Link2, Key, BarChart3, PieChart, Box, FileSpreadsheet, Lock,
  Plus, Settings2, Trash2, LineChart as LineIcon, BarChart2, MousePointer2, 
  Save, Loader2, X, Layers, CircleDot, ScatterChart, Grid, TrendingUp, LayoutPanelTop,
  Code2, RotateCw
} from 'lucide-react';

// Help component to render dynamic icons from definitions
function VisualIcon({ type, className }: { type: string, className?: string }) {
  const icons: Record<string, any> = {
    'LayoutPanelTop': LayoutPanelTop,
    'BarChart3': BarChart3,
    'Layers': Layers,
    'LineChart': LineIcon,
    'CircleDot': CircleDot,
    'ScatterChart': ScatterChart,
    'Table2': Table2,
    'Grid': Grid,
    'Filter': Filter,
    'Layout': Layout,
    'TrendingUp': TrendingUp
  };
  const Icon = icons[type] || Box;
  return <Icon className={className} />;
}
import { useDev } from '../../../context/DevContext';
import { useDataStore } from '../../../hooks/useDataStore';
import * as XLSX from 'xlsx';
import { VISUAL_DEFINITIONS, getEmptyMapping } from '../../VisualDefinitions';
import ChartPreview from '../../ChartPreview';
import { generateJSX } from '../../../utils/jsxGenerator';
import { useDrag, useDrop } from 'react-dnd';

// --- Draggable Column Component ---

function DraggableColumnHeader({ column, theme }: { column: string, theme: any }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'COLUMN',
    item: { name: column, type: 'STR' }, // Defaulting to STR, would be better to detect
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <th 
      ref={drag as any}
      className={`px-4 py-2 border-r ${theme.border} text-[10px] font-bold text-indigo-400 uppercase tracking-tighter cursor-grab active:cursor-grabbing transition-colors hover:bg-indigo-500/5 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <MousePointer2 className="w-2.5 h-2.5 opacity-30" />
        {column}
      </div>
    </th>
  );
}

function DraggableSidebarItem({ column, type, theme }: { column: string, type: string, theme: any }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'COLUMN',
    item: { name: column, type: type === 'INT' || type === 'DECIMAL' || type === 'FLOAT' || type === 'MONEY' ? 'NUM' : 'STR' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag as any}
      className={`p-3 rounded-2xl border ${theme.border} group hover:border-indigo-500/50 transition-all cursor-grab active:cursor-grabbing bg-black/5 ${isDragging ? 'opacity-50 border-indigo-500 shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
             <MousePointer2 className="w-3 h-3 opacity-30" />
             <span className="text-[10px] font-bold truncate pr-4">{column}</span>
          </div>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${theme.border} border bg-black/5 text-slate-500`}>
              {type}
          </span>
      </div>
    </div>
  );
}

// --- Drop Slot Component ---

function DropSlot({ slot, mapping, setMapping, theme }: { slot: any, mapping: any, setMapping: any, theme: any }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'COLUMN',
    drop: (item: any) => {
      const current = mapping[slot.id] || [];
      // Only add if not already present or if we want multiple
      if (!current.find((c: any) => c.name === item.name)) {
        setMapping({
          ...mapping,
          [slot.id]: [...current, { ...item, displayName: item.name, agg: item.type === 'NUM' ? 'sum' : 'count' }]
        });
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const removeItem = (colName: string) => {
    setMapping({
      ...mapping,
      [slot.id]: (mapping[slot.id] || []).filter((c: any) => c.name !== colName)
    });
  };

  const updateItem = (colName: string, patches: any) => {
    setMapping({
      ...mapping,
      [slot.id]: (mapping[slot.id] || []).map((c: any) => 
        c.name === colName ? { ...c, ...patches } : c
      )
    });
  };

  return (
    <div className="space-y-1.5">
       <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">{slot.label}</label>
       <div 
        ref={drop as any}
        className={`min-h-[44px] rounded-2xl border-2 border-dashed transition-all p-2 flex flex-wrap gap-2
          ${isOver ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02]' : canDrop ? 'border-indigo-500/30' : 'border-slate-700/30'}`}
       >
          {(mapping[slot.id] || []).map((m: any) => (
            <div key={m.name} className="flex flex-col gap-1 w-full bg-slate-800/80 border border-slate-700/50 rounded-xl p-2 group relative">
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-indigo-400 truncate pr-6">{m.displayName || m.name}</span>
                  <button onClick={() => removeItem(m.name)} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                     <X className="w-3 h-3" />
                  </button>
               </div>
               
               <div className="flex items-center gap-2 mt-1">
                  <select 
                    value={m.agg} 
                    onChange={(e) => updateItem(m.name, { agg: e.target.value })}
                    className="bg-black/20 text-[8px] font-black uppercase border-none outline-none rounded px-1.5 py-0.5 text-slate-500 cursor-pointer hover:bg-indigo-500/20 hover:text-indigo-400 transition"
                  >
                    <option value="sum">Suma</option>
                    <option value="avg">Prom</option>
                    <option value="count">Cont</option>
                    <option value="distinct">Unic</option>
                    <option value="median">Mediana</option>
                    <option value="stdev">Desv Est</option>
                    <option value="var">Varianza</option>
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Renombrar..."
                    value={m.displayName}
                    onChange={(e) => updateItem(m.name, { displayName: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none text-[8px] font-medium text-slate-500 placeholder:opacity-30 focus:text-indigo-400"
                  />
               </div>
            </div>
          ))}
          {(!mapping[slot.id] || mapping[slot.id].length === 0) && (
            <div className="w-full h-full flex items-center justify-center py-2 opacity-20 italic text-[9px]">Suelta campos aquí</div>
          )}
       </div>
    </div>
  );
}

// --- MAIN DATA EXPLORER COMPONENT ---
export default function DataExplorer() {
  const { theme, patchTab, activeTabId, tabs, setTabs, setActiveTabId } = useDev() as any;
  const activeTab = tabs.find((t: any) => t.id === activeTabId);
  const { 
    tables, dataSources, fetchTables, 
    testSQLConnection, saveDevSource, 
    fetchColumns, fetchPreview,
    diagData // Extracted from global store
  } = useDataStore() as any;

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Integrated Builder State
  const [selectedVisual, setSelectedVisual] = useState<string | null>(null);
  const [mapping, setMapping] = useState<any>(getEmptyMapping());
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'hub' | 'sql' | 'file' | 'api'>('hub');
  const [apiConfig, setApiConfig] = useState({ url: "", method: "GET", headers: "", body: "" });
  const [fileInfo, setFileInfo] = useState<{ name: string, size: number } | null>(null);
  const [sqlConn, setSqlConn] = useState({ host: "localhost", database: "", username: "sa", password: "", provider: "sqlserver" });
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean, msg: string } | null>(null);
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connError, setConnError] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [lastRunMapping, setLastRunMapping] = useState<any>(null);

  // NEW: Code mode states
  const [centerView, setCenterView] = useState<'visual' | 'code'>('visual');
  const [isCustomCode, setIsCustomCode] = useState(false);

  const API = (import.meta as any).env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("atr_token");

  // SAFETY: Guard against undefined tables
  const SAFE_TABLES = tables ?? {};

  const connection = useMemo(() => {
    if (!activeTab?.connectionId || !dataSources) return null;
    return dataSources.find((c: any) => c.id === activeTab.connectionId);
  }, [activeTab, dataSources]);

  // Sync local state when tab changes (especially for FILE/API)
  useEffect(() => {
    if (activeTab) {
      if (activeTab.sourceType === 'FILE' || activeTab.sourceType === 'API') {
        setData(activeTab.rows || []);
        setColumns(activeTab.columns || []);
        setTotalRows(activeTab.rows?.length || 0);
        setSelectedTable(activeTab.title);
      } else {
        // For SQL, data is managed by fetchTableData, but we might want to recover last state
        if (activeTab.rows && activeTab.rows.length > 0) {
          setData(activeTab.rows);
          setColumns(activeTab.columns || []);
          setSelectedTable(activeTab.title);
          // fetchPreview would be needed for fresh count if not in activeTab
        }
      }
    }
  }, [activeTabId]);

  const filteredTables = useMemo(() => {
    const connId = activeTab?.connectionId ?? "";
    const list = (SAFE_TABLES[connId] || []) as any[];
    return list.filter((t: any) => {
      const name = typeof t === 'string' ? t : t.TABLE_NAME || "";
      return name.toLowerCase().includes(tableSearch.toLowerCase());
    });
  }, [SAFE_TABLES, activeTab, tableSearch]);

  // --- DATA LOADING ENGINES ---

  const loadLocalFile = async (file: File) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]).map(k => ({ COLUMN_NAME: k, DATA_TYPE: typeof rows[0][k] }));
          const id = `tab-file-${Date.now()}`;
          const newTab = {
            id,
            title: file.name,
            connectionId: 'local-file', // Virtual ID
            sourceType: 'FILE',
            rows,
            columns: cols,
            queryRan: true
          };
          setTabs([...tabs, newTab]);
          setActiveTabId(id);
          setData(rows);
          setColumns(cols);
          setSelectedTable(file.name);
          setTotalRows(rows.length);
          setOnboardingStep('hub'); // Close modal if open
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error("File load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const loadApiData = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: apiConfig.headers ? JSON.parse(apiConfig.headers) : {}
      });
      const json = await res.json();
      
      // Basic flattening: if root is array, use it. If not, look for array property.
      const rows = Array.isArray(json) ? json : (Object.values(json).find(v => Array.isArray(v)) as any[]) || [];
      
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]).map(k => ({ COLUMN_NAME: k, DATA_TYPE: typeof rows[0][k] }));
        const id = `tab-api-${Date.now()}`;
        const newTab = {
            id,
            title: 'API Response',
            connectionId: 'api-endpoint',
            sourceType: 'API',
            rows,
            columns: cols,
            queryRan: true,
            apiConfig: { ...apiConfig }
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(id);
        setData(rows);
        setColumns(cols);
        setSelectedTable('API Response');
        setTotalRows(rows.length);
        setOnboardingStep('hub');
      }
    } catch (e) {
      console.error("API fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSource = async (conn: any) => {
    setConnStatus('testing');
    setConnError("");
    try {
      // 1. Test connection first
      const testRes = await testSQLConnection(conn);
      if (!testRes.success) {
        setConnStatus('error');
        setConnError(testRes.error || "Fallo en la autenticación o red.");
        return;
      }

      setConnStatus('success');
      
      // 2. Save source and WAIT for backend confirmation (Eliminate Race Condition)
      const id = conn.id || `src-${Date.now()}`;
      const saveRes = await saveDevSource({ ...conn, id });
      
      if (!saveRes || !saveRes.success) {
        console.warn("Source saved locally but backend registration delayed/failed. Table discovery might need a refresh.");
      }

      // 3. Create Tab
      const tabId = `tab-${Date.now()}`;
      const newTab = {
        id: tabId,
        title: conn.database,
        connectionId: id,
        sourceType: 'SQL',
        query: "",
        code: "",
        rows: [],
        columns: [],
        loading: false,
        error: "",
        queryRan: false
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);

      // 4. Fetch tables (Automatic and robust)
      await fetchTables(id);
      
      // Cleanup for next use
      setConnStatus('idle');
      setOnboardingStep('hub'); 
    } catch (e: any) {
      setConnStatus('error');
      setConnError(e.message || "Error inesperado al conectar.");
    }
  };

  const fetchTableData = async (tableData: any) => {
    const tableName = typeof tableData === 'string' ? tableData : tableData.TABLE_NAME;
    if (!activeTab?.connectionId) return;

    setSelectedTable(tableName);
    setLoading(true);
    setMapping(getEmptyMapping());
    setIsDirty(false);
    try {
      // Enterprise Metadata Load
      const cols = await fetchColumns(activeTab.connectionId, tableName);
      setColumns(cols);

      // Enterprise Data Load (sampled)
      const res = await fetchPreview(activeTab.connectionId, tableName);
      if (res.success) {
        setData(res.rows);
        setTotalRows(res.totalRows || res.rows.length);
        patchTab(activeTabId, { 
          title: tableName, 
          rows: res.rows, 
          columns: cols,
          query: `SELECT TOP 50000 * FROM [${tableName}]`,
          queryRan: true
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };


  const runAnalysis = () => {
    if (!selectedVisual || !selectedTable) return;
    setIsDirty(false);
    setLastRunMapping({...mapping});
    
    const jsx = generateJSX(selectedVisual, mapping, columns.map(c => c.COLUMN_NAME || c.name));
    patchTab(activeTabId, { code: jsx });
  };

  useEffect(() => {
    if (selectedVisual && activeTabId && !isCustomCode) {
       const jsx = generateJSX(selectedVisual, mapping, columns.map(c => c.COLUMN_NAME || c.name));
       patchTab(activeTabId, { code: jsx });
    }
  }, [selectedVisual, mapping, columns, activeTabId, isCustomCode]);

  const handleCodeChange = (newCode: string) => {
    setIsCustomCode(true);
    patchTab(activeTabId, { code: newCode });
  };

  const handleResetToVisual = () => {
    setIsCustomCode(false);
    const jsx = generateJSX(selectedVisual || 'bar', mapping, columns.map(c => c.COLUMN_NAME || c.name));
    patchTab(activeTabId, { code: jsx });
  };

  const handleSaveToMarketplace = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const checkRes = await fetch(`${API}/api/dev/visualizations/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: saveName })
      });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setSaveStatus({ ok: false, msg: "Este nombre ya existe." });
        return;
      }

      await fetch(`${API}/api/dev/visualizations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: saveName,
          type: selectedVisual,
          query: activeTab.query,
          mapping,
          code: activeTab.code,
          datasourceId: activeTab.connectionId,
          sourceType: activeTab.sourceType || 'SQL',
          snapshot: (activeTab.sourceType === 'FILE' || activeTab.sourceType === 'API') ? activeTab.rows : null,
          config: activeTab.sourceType === 'API' ? activeTab.apiConfig : null
        })
      });
      setSaveStatus({ ok: true, msg: "¡Publicado!" });
      setTimeout(() => setShowSaveModal(false), 2000);
    } catch (e: any) {
      setSaveStatus({ ok: false, msg: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeTab) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-20 ${theme.bg}`}>
          
          {onboardingStep === 'hub' && (
            <div className="max-w-4xl w-full space-y-12 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                       Paso 1: Configurar Origen
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">¿Con qué datos iniciaremos?</h2>
                    <p className={`text-base ${theme.muted} font-medium max-w-xl mx-auto`}>Jonathan, selecciona el tipo de conexión para este lienzo. Procesaremos tus datos con potencia híbrida.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* OPTION: SQL */}
                    <button 
                      onClick={() => setOnboardingStep('sql')}
                      className={`group p-8 rounded-[40px] border ${theme.border} ${theme.surface} text-left transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1`}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition">
                           <Database className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black mb-1">Bases de Datos</h3>
                        <p className={`text-[10px] ${theme.muted} uppercase tracking-widest font-bold`}>SQL Server, MySQL, Postgres</p>
                    </button>

                    {/* OPTION: FILES */}
                    <button 
                      onClick={() => setOnboardingStep('file')}
                      className={`group p-8 rounded-[40px] border ${theme.border} ${theme.surface} text-left transition-all hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1`}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition">
                           <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black mb-1">Archivos Locales</h3>
                        <p className={`text-[10px] ${theme.muted} uppercase tracking-widest font-bold`}>Excel, CSV, JSON</p>
                    </button>

                    {/* OPTION: API */}
                    <button 
                      onClick={() => setOnboardingStep('api')}
                      className={`group p-8 rounded-[40px] border ${theme.border} ${theme.surface} text-left transition-all hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1`}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition">
                           <Globe2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black mb-1">API Externa</h3>
                        <p className={`text-[10px] ${theme.muted} uppercase tracking-widest font-bold`}>Postman HTTP Requests</p>
                    </button>
                </div>

                {dataSources && dataSources.length > 0 && (
                  <div className="space-y-4 pt-10 border-t border-slate-500/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Conexiones Recientes</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       {dataSources.map((c: any) => (
                         <button key={c.id} onClick={() => handleSelectSource(c)} className={`p-4 rounded-3xl border ${theme.border} ${theme.surface} hover:border-indigo-500 transition-all flex items-center gap-3 group`}>
                            <Database className="w-4 h-4 text-indigo-500 group-hover:scale-125 transition" />
                            <span className="text-[11px] font-bold truncate">{c.name}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {onboardingStep === 'sql' && (
             <div className="max-w-md w-full animate-in slide-in-from-bottom-5 duration-500">
                <button onClick={() => setOnboardingStep('hub')} className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition">
                   <ChevronDown className="w-4 h-4 rotate-90" /> Volver al Hub
                </button>
                <div className={`p-10 rounded-[48px] border-2 ${theme.border} ${theme.surface} shadow-3xl space-y-8`}>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                         <Database className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black tracking-tight">SQL Connection</h3>
                         <p className={`text-[10px] ${theme.muted} font-medium`}>Instancia Relacional en la red.</p>
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Motor de Base de Datos</label>
                      <div className="flex gap-4">
                         {[
                           { id: 'sqlserver', label: 'SQL Server', icon: Database },
                           { id: 'mysql', label: 'MySQL', icon: Database }
                         ].map(m => (
                           <button 
                             key={m.id}
                             onClick={() => setSqlConn({...sqlConn, provider: m.id})}
                             className={`flex-1 py-3 px-4 rounded-2xl border transition-all flex items-center justify-center gap-2
                               ${sqlConn.provider === m.id ? 'bg-indigo-600 text-white border-indigo-600' : `${theme.border} ${theme.surface} hover:border-indigo-500/50 opacity-60`}`}
                           >
                              <m.icon className="w-4 h-4" />
                              <span className="text-[9px] font-black uppercase">{m.label}</span>
                           </button>
                         ))}
                      </div>
                   </div>
                   {[
                     { label: 'Host / Server IP', key: 'host', type: 'text' },
                     { label: 'Base de Datos', key: 'database', type: 'text' },
                     { label: 'Username', key: 'username', type: 'text' },
                     { label: 'Password', key: 'password', type: 'password' },
                   ].map(f => (
                     <div key={f.key} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{f.label}</label>
                        <input 
                         type={f.type} 
                         value={(sqlConn as any)[f.key]}
                         onChange={e => setSqlConn({...sqlConn, [f.key]: e.target.value})}
                         className={`w-full px-5 py-4 rounded-2xl border ${theme.border} ${theme.input} text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all`} 
                        />
                     </div>
                   ))}
                   <button 
                      onClick={() => handleSelectSource(sqlConn)}
                      disabled={connStatus === 'testing' || connStatus === 'success'}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                    >
                       {connStatus === 'testing' ? 'Validando...' : 'Establecer Conexión'}
                    </button>
                    
                    {/* Visual Validation Overlay */}
                    {connStatus !== 'idle' && (
                       <div className="absolute inset-0 z-50 rounded-[48px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                          {connStatus === 'testing' && (
                             <div className="space-y-6">
                                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black uppercase tracking-tighter">Probando Servidor</h4>
                                    <p className="text-[10px] uppercase tracking-widest font-black opacity-40">Validando credenciales en tiempo real</p>
                                </div>
                             </div>
                          )}
                          
                          {connStatus === 'success' && (
                             <div className="space-y-6 animate-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 scale-110">
                                   <Zap className="w-10 h-10" fill="currentColor" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black uppercase tracking-tighter text-emerald-600">¡Conexión Exitosa!</h4>
                                    <p className="text-[10px] uppercase tracking-widest font-black opacity-40">Sincronizando todas las tablas y vistas</p>
                                </div>
                             </div>
                          )}
                          
                          {connStatus === 'error' && (
                             <div className="space-y-6 animate-in bounce-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-2xl shadow-red-500/30">
                                   <X className="w-10 h-10 stroke-[3]" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black uppercase tracking-tighter text-red-600">Error de Conexión</h4>
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
                                       <p className="text-[9px] font-bold text-red-500 leading-relaxed max-w-[240px]">{connError}</p>
                                    </div>
                                    <button 
                                      onClick={() => setConnStatus('idle')}
                                      className="mt-4 px-6 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-slate-700 transition"
                                    >
                                       Reintentar
                                    </button>
                                </div>
                             </div>
                          )}
                       </div>
                    )}
                 </div>
             </div>
          )}

          {onboardingStep === 'file' && (
             <div className="max-w-md w-full animate-in slide-in-from-bottom-5 duration-500">
                <button onClick={() => setOnboardingStep('hub')} className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition">
                   <ChevronDown className="w-4 h-4 rotate-90" /> Volver al Hub
                </button>
                <div className={`p-10 rounded-[48px] border-2 ${theme.border} ${theme.surface} shadow-3xl text-center space-y-8`}>
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                         <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tight">Carga de Archivo</h3>
                         <p className={`text-[10px] ${theme.muted} font-medium`}>Los datos vivirán en memoria hasta que publiques.</p>
                      </div>
                   </div>
                   
                   <div 
                    className={`h-48 rounded-[32px] border-2 border-dashed ${theme.border} flex flex-col items-center justify-center gap-4 group hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer relative overflow-hidden`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) loadLocalFile(file);
                    }}
                   >
                     <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv,.json"
                      onChange={e => e.target.files && loadLocalFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                     />
                     <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Upload className="w-5 h-5" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest">Arrastra o selecciona</p>
                        <p className={`text-[9px] ${theme.muted}`}>Excel, CSV o JSON</p>
                     </div>
                   </div>
                </div>
             </div>
          )}

          {onboardingStep === 'api' && (
             <div className="max-w-2xl w-full animate-in slide-in-from-bottom-5 duration-500">
                <button onClick={() => setOnboardingStep('hub')} className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition">
                   <ChevronDown className="w-4 h-4 rotate-90" /> Volver al Hub
                </button>
                <div className={`p-10 rounded-[48px] border-2 ${theme.border} ${theme.surface} shadow-3xl space-y-8`}>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                         <Globe2 className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black tracking-tight">API Request Pro</h3>
                         <p className={`text-[10px] ${theme.muted} font-medium`}>Conexión Postman para endpoints remotos.</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1 space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Método</label>
                         <select 
                          value={apiConfig.method}
                          onChange={e => setApiConfig({...apiConfig, method: e.target.value})}
                          className={`w-full px-5 py-4 rounded-2xl border ${theme.border} ${theme.input} text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/10 transition-all`}
                         >
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                         </select>
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Endpoint URL</label>
                         <input 
                          type="text" 
                          placeholder="https://api.ejemplo.com/v1/datos"
                          value={apiConfig.url}
                          onChange={e => setApiConfig({...apiConfig, url: e.target.value})}
                          className={`w-full px-5 py-4 rounded-2xl border ${theme.border} ${theme.input} text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all`}
                         />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Headers (JSON)</label>
                      <textarea 
                        placeholder='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'
                        rows={3}
                        value={apiConfig.headers}
                        onChange={e => setApiConfig({...apiConfig, headers: e.target.value})}
                        className={`w-full px-5 py-4 rounded-2xl border ${theme.border} ${theme.input} text-xs font-mono outline-none focus:ring-4 focus:ring-amber-500/10 transition-all resize-none`}
                      />
                   </div>

                   <button 
                    onClick={loadApiData}
                    disabled={!apiConfig.url}
                    className="w-full py-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-600/20 active:scale-[0.98]"
                   >
                      Probar y Cargar Datos
                   </button>
                </div>
             </div>
          )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* PANEL IZQUIERDO: Navegador de Fuentes */}
      <aside className={`w-64 shrink-0 h-full border-r ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
          <div className={`p-4 border-b ${theme.border} bg-black/5 space-y-3`}>
             <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Tablas y Vistas</span>
                <button 
                  onClick={() => activeTab?.connectionId && fetchTables(activeTab.connectionId)}
                  disabled={loading || !activeTab?.connectionId}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500 hover:text-indigo-500 transition-colors disabled:opacity-30"
                  title="Refrescar metadatos"
                >
                   <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
             </div>
             <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${theme.border} bg-white dark:bg-black/20 ring-4 ring-transparent focus-within:ring-indigo-500/10 transition-all`}>
                <Search className="w-3.5 h-3.5 opacity-40 shrink-0" />
                <input 
                 type="text" 
                 placeholder="Filtrar entidades..." 
                 className="w-full bg-transparent border-none outline-none text-[10px] font-bold"
                 value={tableSearch}
                 onChange={e => setTableSearch(e.target.value)}
                />
             </div>
          </div>
         <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            {!filteredTables.length && !loading && activeTab && (activeTab?.sourceType !== 'FILE' && activeTab?.sourceType !== 'API') && (
              <div className="p-10 text-center animate-in fade-in duration-500">
                <div className={`w-12 h-12 rounded-2xl bg-slate-500/5 flex items-center justify-center mx-auto mb-4`}>
                    <Database className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-relaxed">
                  {tableSearch ? "No hay coincidencias" : "No se encontraron tablas o vistas"}
                </p>
                {diagData && !tableSearch && (
                   <div className="mt-4 p-3 bg-slate-500/5 rounded-xl border border-white/5 space-y-2 text-left animate-in slide-in-from-bottom duration-500">
                      <div className="flex justify-between items-center opacity-30">
                         <span className="text-[7px] font-black uppercase">QA Telemetry</span>
                         <span className="text-[6px] font-bold">SQL Context</span>
                      </div>
                      <div className="space-y-1">
                         <div className="flex justify-between text-[8px] font-bold">
                            <span className="opacity-40 uppercase">User</span>
                            <span className="text-indigo-400 capitalize">{diagData.currentUser}</span>
                         </div>
                         <div className="flex justify-between text-[8px] font-bold">
                            <span className="opacity-40 uppercase">DB</span>
                            <span className="text-emerald-400 uppercase">{diagData.currentDB}</span>
                         </div>
                      </div>
                      <div className="h-px bg-white/5" />
                      <p className="text-[6px] leading-[1.4] opacity-30 truncate">
                         {diagData.serverVersion}
                      </p>
                   </div>
                )}
                {!tableSearch && !diagData && <p className="text-[7px] font-bold uppercase tracking-widest opacity-20 mt-2">Verifica los permisos del usuario</p>}
              </div>
            )}
            {!activeTab && !loading && (
               <div className="p-10 text-center opacity-20">
                 <Layout className="w-8 h-8 mx-auto mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Selecciona un origen</p>
               </div>
            )}
            
            {/* VIRTUAL TABLES FOR FILES/API */}
            {(activeTab?.sourceType === 'FILE' || activeTab?.sourceType === 'API') && (
              <button 
                onClick={() => setSelectedTable(activeTab.title)}
                className={`w-full text-left px-5 py-4 text-[11px] font-bold flex items-center justify-between hover:bg-black/5 transition-all group ${selectedTable === activeTab.title ? 'text-indigo-500 bg-indigo-500/5' : ''}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${theme.border} group-hover:bg-white transition ${selectedTable === activeTab.title ? 'bg-white shadow-sm' : ''}`}>
                       {activeTab.sourceType === 'FILE' ? <FileSpreadsheet className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                       <span className="truncate max-w-[140px] tracking-tighter">{activeTab.title}</span>
                       <span className="text-[7px] font-black uppercase opacity-40 tracking-widest">Fuente Activa</span>
                    </div>
                 </div>
                 {selectedTable === activeTab.title && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {filteredTables.map((t: string) => (
              <button 
                key={t}
                onClick={() => fetchTableData(t)}
                className={`w-full text-left px-5 py-3 text-[11px] font-bold flex items-center justify-between hover:bg-black/5 transition-all group ${selectedTable === t ? 'text-indigo-500 bg-indigo-500/5' : ''}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border ${theme.border} group-hover:bg-white transition ${selectedTable === t ? 'bg-white shadow-sm' : ''}`}>
                       <Table2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate max-w-[140px] tracking-tight">{t}</span>
                 </div>
                 {selectedTable === t && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ))}
         </div>
         <div className={`h-12 border-b ${theme.border} bg-slate-500/5 flex items-center px-4 gap-3 shrink-0`}>
             <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Database className="w-3 h-3" />
             </div>
             <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate text-indigo-500">
                   {connection?.name || (activeTab ? "Analizador SQL" : "Explorador de Datos")}
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden">
                   <div className={`w-1 h-1 rounded-full ${loading ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
                   <span className="text-[7px] font-black uppercase tracking-widest opacity-40">
                      {loading ? 'Sincronizando Metadatos...' : 'Motor [vQuantum] Activo'}
                   </span>
                </div>
             </div>
          </div>
      </aside>

      {/* PANEL CENTRAL: Preview de Datos (Fijo) */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-50 dark:bg-[#0c0f16]">
        {!selectedTable ? (
             <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-[48px] bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                   <Database className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-2 max-w-xs">
                   <h3 className="text-xl font-black tracking-tight uppercase">Analizador Pro</h3>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${theme.muted} leading-relaxed`}>Selecciona una entidad para iniciar la exploración de datos masivos.</p>
                </div>
             </div>
        ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* TOOLBAR */}
                <div className={`shrink-0 h-14 border-b ${theme.border} ${theme.surface} flex items-center justify-between px-6 z-20`}>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                           <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">{selectedTable}</h2>
                           <span className="text-[8px] font-black text-indigo-500 opacity-60 uppercase tracking-widest">Ejecución Híbrida</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5 rounded-xl border border-indigo-500/20`}>
                            <Zap className="w-3 h-3 text-indigo-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 opacity-70">
                                {totalRows > 50000 ? `Muestra Parcial: 50,000 / ${totalRows.toLocaleString()}` : `Total: ${totalRows.toLocaleString()} registros`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* DATA GRID FIXED */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#090b10]">
                   <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead className={`sticky top-0 ${theme.surface} z-10 shadow-sm`}>
                          <tr>
                            {columns.map(c => (
                              <DraggableColumnHeader key={c.COLUMN_NAME || c.name} column={c.COLUMN_NAME || c.name} theme={theme} />
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-500/10">
                          {data.map((row, i) => (
                            <tr key={i} className="hover:bg-black/5 transition-colors group">
                               {columns.map(c => (
                                 <td key={c.COLUMN_NAME || c.name} className={`px-4 py-2.5 text-[10px] whitespace-nowrap border-r ${theme.border} font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors`}>
                                   {String(row[c.COLUMN_NAME || c.name] ?? '-')}
                                 </td>
                               ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-30">
                           <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Procesando</span>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
            </div>
        )}
      </main>


      {/* PANEL DERECHO: Constructor Maestro */}
      <aside className={`w-[360px] shrink-0 h-full border-l ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
         {!selectedTable ? (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-black/5">
                <div className="w-12 h-12 rounded-full border border-slate-500/20 flex items-center justify-center opacity-20">
                   <Settings2 className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight opacity-20">Configurador Pro</p>
             </div>
         ) : (
             <div className="h-full flex flex-col overflow-hidden">
                {/* 1. CAMPOS DISPONIBLES (TOP) */}
                <div className={`p-4 border-b ${theme.border} bg-black/5`}>
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Campos en {selectedTable}</h4>
                      <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded uppercase">Ready</span>
                   </div>
                   <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                      {columns.map(c => (
                        <DraggableSidebarItem key={c.COLUMN_NAME || c.name} column={c.COLUMN_NAME || c.name} type={c.DATA_TYPE || 'STR'} theme={theme} />
                      ))}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   {/* 2. CATÁLOGO */}
                   <div className={`p-5 border-b ${theme.border}`}>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4">Métricas y Visuales</h4>
                      <div className="grid grid-cols-4 gap-2">
                         {Object.values(VISUAL_DEFINITIONS).map(v => (
                           <button 
                             key={v.id}
                             onClick={() => {
                               setSelectedVisual(v.id);
                               setMapping(getEmptyMapping());
                               setIsDirty(true);
                             }}
                             className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1.5 group relative
                               ${selectedVisual === v.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30' : `bg-white dark:bg-black/20 ${theme.border} hover:border-indigo-500/50`}`}
                             title={v.label}
                           >
                              <VisualIcon type={v.iconType} className={`w-3.5 h-3.5 ${selectedVisual === v.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-500'}`} />
                              <span className="text-[7px] font-black truncate w-full text-center uppercase tracking-tighter">{v.label.split(' ')[0]}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* 3. SLOTS */}
                   <div className="p-5 space-y-6">
                      {selectedVisual ? (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                           <div className="flex items-center justify-between mb-2">
                              <h5 className="text-[10px] font-black uppercase tracking-tighter text-indigo-500">Puntos de Datos</h5>
                              {isDirty && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 text-[7px] font-black uppercase tracking-widest animate-pulse">
                                   Cambios Pendientes
                                </div>
                              )}
                           </div>
                           
                           <div onChange={() => setIsDirty(true)}>
                            {(VISUAL_DEFINITIONS[selectedVisual]?.slots || []).map(slot => (
                              <DropSlot key={slot.id} slot={slot} mapping={mapping} setMapping={(m: any) => { setMapping(m); setIsDirty(true); }} theme={theme} />
                            ))}
                           </div>

                           <button 
                            onClick={runAnalysis}
                            disabled={!isDirty}
                            className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 
                              ${isDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50'}`}
                           >
                              <Play className="w-4 h-4" /> Ejecutar Consulta
                           </button>
                        </div>
                      ) : (
                        <div className="py-10 text-center space-y-4 opacity-20">
                           <Layout className="w-8 h-8 mx-auto" />
                           <p className="text-[9px] font-black uppercase tracking-widest">Configuración Bloqueada</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* 4. CHART PREVIEW (BOTTOM) */}
                <div className={`p-4 border-t ${theme.border} bg-slate-900 min-h-[220px] flex flex-col`}>
                   <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vista Previa Pro</span>
                      <button 
                        disabled={!selectedVisual}
                        onClick={() => setShowSaveModal(true)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-indigo-400 transition"
                      >
                         <Save className="w-3.5 h-3.5" />
                      </button>
                   </div>
                   <div className="flex-1 rounded-2xl bg-black/40 border border-white/5 p-4 overflow-hidden relative group">
                      {selectedVisual && lastRunMapping ? (
                        <ChartPreview 
                          code={activeTab.code}
                          rows={data}
                          columns={columns.map(c => c.COLUMN_NAME || c.name)}
                          dark={true}
                          autoRender={true}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-10">
                           <BarChart2 className="w-8 h-8" />
                           <p className="text-[8px] font-black uppercase tracking-[0.2em]">Esperando Datos</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
         )}
      </aside>

      {/* MODAL DE GUARDADO (Persistente) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className={`w-full max-w-md ${theme.surface} border ${theme.border} rounded-[48px] p-10 shadow-3xl space-y-8`}>
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Save className="w-7 h-7" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase whitespace-nowrap">Guardar Visualización</h3>
                    <p className={`text-[10px] ${theme.muted} font-black uppercase tracking-[0.2em]`}>Ready for Marketplace</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nombre Único del Componente</label>
                 <input 
                  type="text" 
                  autoFocus
                  placeholder="Ej: Análisis Mensual de KPIs"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  className={`w-full px-6 py-5 rounded-3xl border ${theme.border} ${theme.input} text-base font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all`}
                 />
              </div>

              {saveStatus && (
                <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${saveStatus.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} flex items-center gap-3 animate-in zoom-in-95`}>
                   <Info className="w-4 h-4" />
                   {saveStatus.msg}
                </div>
              )}

              <div className="flex gap-4">
                 <button onClick={() => setShowSaveModal(false)} className={`flex-1 py-5 rounded-3xl border ${theme.border} hover:bg-black/5 text-[10px] font-black uppercase tracking-widest transition-all`}>
                    Descartar
                 </button>
                 <button 
                  onClick={handleSaveToMarketplace}
                  disabled={isSaving || !saveName.trim()}
                  className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                 >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y Guardar'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
