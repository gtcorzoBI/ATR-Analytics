import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import {
  Database, ChevronRight, ChevronDown, Table2, Columns3, Play,
  LogOut, RefreshCw, Code2, BarChart3, X, Plus, Search, Sun, Moon,
  AlertCircle, CheckCircle2, Loader2, FileText, Save, LayoutDashboard, PenSquare, ChevronLeft, PieChart,
  LayoutPanelTop, Layers, Circle, Grid, Filter
} from "lucide-react";
import ChartPreview from "../components/ChartPreview";
import DashboardBuilder from "../components/DashboardBuilder";
import { useDataStore, AREA_NAMES, INITIAL_AREAS } from "../hooks/useDataStore";
import { VISUAL_DEFINITIONS, VisualMappingState, getEmptyMapping, VisualSlotItem } from "../components/VisualDefinitions";
import { generateChartCode } from "../components/VisualGenerator";
import SyntaxHighlighter from "../components/SyntaxHighlighter";
import RelationCanvas, { NodeDef, EdgeDef } from "../components/RelationCanvas";

interface Connection {
  id: string; name: string; host: string;
  database: string; username: string; password: string;
}
interface TableMeta { TABLE_SCHEMA: string; TABLE_NAME: string; TABLE_TYPE: string; }
interface ColumnMeta { COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string; }
interface DataTab {
  id: string; title: string; connectionId: string;
  query: string; code: string;
  rows: any[]; columns: string[];
  loading: boolean; error: string; queryRan: boolean;
}

const API = "http://localhost:3001";

function typeColor(t: string) {
  const m: Record<string, string> = {
    int: "text-blue-400", bigint: "text-blue-400", smallint: "text-blue-400", tinyint: "text-blue-400",
    varchar: "text-emerald-400", nvarchar: "text-emerald-400", char: "text-emerald-400", text: "text-emerald-400",
    datetime: "text-yellow-400", date: "text-yellow-400", datetime2: "text-yellow-400",
    decimal: "text-purple-400", numeric: "text-purple-400", float: "text-purple-400", money: "text-purple-400",
    bit: "text-pink-400"
  };
  return m[t?.toLowerCase()] ?? "text-slate-400";
}

const DEFAULT_CODE = (title: string) => `// data[]    → array de resultados de la query
// columns[] → nombres de columnas disponibles
// El componente DEBE llamarse "Chart"

function Chart() {
  const xKey = columns[0];
  const yKey = columns[1];

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'inherit' }}>
        ${title} — {data.length} registros
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}`;




export default function DevDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // ── Theme ─────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(() => localStorage.getItem("dev_theme") !== "light");
  const toggleTheme = () => setDark(d => { const n = !d; localStorage.setItem("dev_theme", n ? "dark" : "light"); return n; });

  const theme = {
    bg: dark ? "bg-[#0d1117]" : "bg-slate-100",
    surface: dark ? "bg-[#161b22]" : "bg-white",
    border: dark ? "border-slate-800" : "border-slate-200",
    text: dark ? "text-slate-200" : "text-slate-900",
    muted: dark ? "text-slate-400" : "text-slate-500",
    input: dark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    hover: dark ? "hover:bg-slate-800/60" : "hover:bg-slate-100",
    code: dark ? "bg-[#0d1117]" : "bg-slate-50",
  };

  // ── Connections ───────────────────────────────────────────────────────
  const { dataSources, saveDevSource, saveDevCanvas, saveDevMeasure, deleteDevSource, clearAllDevState } = useDataStore() as any;
  // Dev sources act as connections here
  const connections: Connection[] = dataSources as Connection[];
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState({ name: "", host: "localhost", database: "", username: "sa", password: "" });
  const [connTesting, setConnTesting] = useState(false);
  const [connTestMsg, setConnTestMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Explorer ─────────────────────────────────────────────────────────
  const [expandedConn, setExpandedConn] = useState<string | null>(null);
  const [tablesMap, setTablesMap] = useState<Record<string, TableMeta[]>>({});
  const [trackedTables, setTrackedTables] = useState<{ conn: Connection; schema: string; table: string; columns: ColumnMeta[]; isExpanded: boolean }[]>([]);
  const [showDataGrid, setShowDataGrid] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [rightPanelSearch, setRightPanelSearch] = useState("");
  const [loadingTables, setLoadingTables] = useState<string | null>(null);
  const [loadingCols, setLoadingCols] = useState(false);

  // ── Editor Tabs ───────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<DataTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const [renderCounter, setRenderCounter] = useState(0);

  // ── Saved Components & Dashboard ─────────────────────────────────────
  const { devMeasures = [], devCanvas = [] } = useDataStore() as any; // Using dev assets from store
  const savedComponents = devMeasures;
  const dashItems = devCanvas;
  const [showDashboard, setShowDashboard] = useState(false);

  // ── Tutorial ──────────────────────────────────────────────────────────
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => { if (!localStorage.getItem("atr_dev_tutorial_seen")) setShowTutorial(true); }, []);

  // ── Dev Workflow State ────────────────────────────────────────────────
  const { systemDashboards } = useDataStore();
  const [viewMode, setViewMode] = useState<'landing' | 'main' | 'edit_selection' | 'basico'>('landing');
  const [workspaceMode, setWorkspaceMode] = useState<'graphic' | 'code' | 'relations'>('graphic');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const [isDragging, setIsDragging] = useState(false);
  const [activeVisualType, setActiveVisualType] = useState<string | null>(null);
  
  const [relNodes, setRelNodes] = useState<NodeDef[]>([]);
  const [relEdges, setRelEdges] = useState<EdgeDef[]>([]);
  const [visualMapping, setVisualMapping] = useState<VisualMappingState>(getEmptyMapping());

  // Sync trackedTables from Right Panel to Relation Canvas nodes automatically
  useEffect(() => {
    setRelNodes(prevNodes => {
      const existingMap = new Map(prevNodes.map(n => [n.id, n]));
      return trackedTables.map((t, idx) => {
        const id = `${t.schema}.${t.table}`;
        if (existingMap.has(id)) {
          return { ...existingMap.get(id)!, fields: t.columns.map(c => ({ name: c.COLUMN_NAME, type: c.DATA_TYPE })) as any };
        }
        return {
          id,
          title: t.table,
          x: 100 + (idx * 250) % 600,
          y: 100 + (Math.floor(idx / 3) * 200),
          fields: t.columns.map(c => ({ name: c.COLUMN_NAME, type: c.DATA_TYPE })) as any
        }
      });
    });
  }, [trackedTables]);

  const [securityGate, setSecurityGate] = useState<{
    isOpen: boolean;
    dashboard: any | null;
    form: { user: string; pass: string; host: string; db: string };
  }>({
    isOpen: false,
    dashboard: null,
    form: { user: 'sa', pass: '', host: 'localhost', db: '' }
  });

  const startCreate = async () => {
    if (window.confirm("¿Seguro que deseas empezar de cero? Esto limpiará el espacio de trabajo local (se borrarán los componentes e conexiones de esta sesión).")) {
       // Clear in-memory UI state
       setTabs([]);
       setActiveTabId(null);
       setActiveVisualType(null);
       setVisualMapping(getEmptyMapping());
       setTrackedTables([]);
       setRelNodes([]);
       setRelEdges([]);
       setViewMode('main');
       setShowDataGrid(true);
       setExpandedConn(null);
       setTablesMap({});
       setRightPanelSearch("");
       setTableSearch("");
       
       // Wipe all dev state from memory, localStorage AND backend
       await clearAllDevState();
       saveDevCanvas([]); // ensure canvas is notified separately
       // setViewMode('main') already called above — navigates directly to the editor
     }
   };

  const startBasico = () => {
    setTabs([{
      id: 'basic-mode', title: 'Lienzo Básico', connectionId: 'none',
      query: '-- Modo Básico: No requiere SQL',
      code: 'function Chart() {\n  return (\n    <div className="p-8 text-center bg-indigo-600/10 rounded-3xl border-2 border-dashed border-indigo-500/30">\n      <h2 className="text-2xl font-bold text-indigo-600 mb-2">¡Pega tu HTML/JSX aquí!</h2>\n      <p className="text-sm opacity-60">Este modo es para diseños ya trabajados con anterioridad.</p>\n    </div>\n  );\n}',
      rows: [{}], columns: [], loading: false, error: "", queryRan: true
    }]);
    setActiveTabId('basic-mode');
    setViewMode('main');
  };

  const openSecurityGate = (dash: any) => {
    setSecurityGate({
      ...securityGate,
      isOpen: true,
      dashboard: dash,
      form: { ...securityGate.form, db: dash.title }
    });
  };

  const handleUnlock = () => {
    if (!securityGate.dashboard) return;
    // Mock unlock - in real life this would test connection
    const dash = securityGate.dashboard;
    
    // Load components from dashboard config
    if (dash.config && dash.config.components) {
      const comps = dash.config.components.map((c: any) => ({
        id: `comp-${Date.now()}-${Math.random()}`,
        name: c.name,
        code: c.code,
        rows: c.rows || [],
        columns: c.columns || []
      }));
      comps.forEach((c:any) => saveDevMeasure(c));
      
      // Load into canvas
      const items = dash.config.components.map((c: any) => ({
        ...c,
        instanceId: `inst-${Date.now()}-${Math.random()}`
      }));
      saveDevCanvas(items);
    }
    
    setSecurityGate({ ...securityGate, isOpen: false });
    setViewMode('main');
    alert("Acceso concedido. Cargando diseño y medidas...");
  };

  // ── Tab Management (Moved up for hoisting) ───────────────────────────
  const patchTab = (id: string, patch: Partial<DataTab>) =>
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const openTab = (conn: Connection, schema: string, table: string) => {
    const id = `${conn.id}::${schema}.${table}`;
    const existing = tabs.find(t => t.id === id);
    if (existing) { setActiveTabId(id); return; }
    const newTab: DataTab = {
      id, title: `${schema}.${table}`, connectionId: conn.id,
      query: `SELECT TOP 500 *\nFROM [${schema}].[${table}]`,
      code: DEFAULT_CODE(`${schema}.${table}`),
      rows: [], columns: [], loading: false, error: "", queryRan: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    runQuery({ ...newTab }, conn);
  };

  const closeTab = (id: string) => {
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining[remaining.length - 1]?.id || null);
  };

  const openBlankTab = () => {
    const id = `script-${Date.now()}`;
    const newTab: DataTab = {
      id, title: "Script", connectionId: connections[0]?.id || "",
      query: "SELECT TOP 100 *\nFROM [dbo].[tu_tabla]",
      code: DEFAULT_CODE("tu_tabla"),
      rows: [], columns: [], loading: false, error: "", queryRan: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };

  // ── CODE GENERATOR 2.0 (AGGREGATIONS & SANITIZATION) ─────────────────
  const updateGeneratedCode = (type: string, mapping: VisualMappingState) => {
    if (!activeTabId) return;
    const title = activeTab?.title || "Data Chart";
    const columns = activeTab?.columns || [];
    const generated = generateChartCode(type, mapping, columns, title);
    if (generated) patchTab(activeTabId, { code: generated });
  };

  // ── API helper ────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path: string, body: object) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const resp = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
      if (resp.status === 401) {
        return { success: false, error: "Sesión expirada. Por favor, refresca la página (F5) o vuelve a iniciar sesión." };
      }
      return await resp.json();
    } catch (e) {
      return { success: false, error: "No se pudo conectar al servidor. Asegúrate que 'npm run api' esté corriendo." };
    }
  }, [token]);

  // ─────────────────────────────────────────────────────────────────────
  // Connection CRUD
  // ─────────────────────────────────────────────────────────────────────
  const saveConn = () => {
    const missing = [];
    if (!connForm.name) missing.push('Nombre');
    if (!connForm.host) missing.push('Servidor');
    if (!connForm.database) missing.push('Base de Datos');
    if (missing.length > 0) {
      setConnTestMsg({ ok: false, msg: `Completa los campos: ${missing.join(', ')}` });
      return;
    }
    const c = { ...connForm, id: `conn-${Date.now()}` };
    saveDevSource(c);
    setConnForm({ name: "", host: "localhost", database: "", username: "sa", password: "" });
    setConnTestMsg(null);
    setShowAddConn(false);
    // Auto-load tables for the new connection right away
    setTimeout(() => loadTables(c), 250);
  };

  const deleteConn = (id: string) => {
    deleteDevSource(id);
    setTablesMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (expandedConn === id) setExpandedConn(null);
  };

  const testConn = async () => {
    setConnTesting(true); setConnTestMsg(null);
    try {
      const d = await apiFetch("/api/query", { ...connForm, query: "SELECT 1 AS ok" });
      setConnTestMsg(d.success ? { ok: true, msg: "Conexión exitosa ✓" } : { ok: false, msg: d.error });
    } catch {
      setConnTestMsg({ ok: false, msg: "Backend no disponible — arranca npm run api" });
    }
    setConnTesting(false);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Load tables
  // ─────────────────────────────────────────────────────────────────────
  const loadTables = async (conn: Connection) => {
    if (expandedConn === conn.id) { setExpandedConn(null); return; }
    setExpandedConn(conn.id);
    if (tablesMap[conn.id]) return;
    setLoadingTables(conn.id);
    try {
      const d = await apiFetch("/api/tables", { host: conn.host, database: conn.database, username: conn.username, password: conn.password });
      if (d.success) setTablesMap(prev => ({ ...prev, [conn.id]: d.tables }));
    } catch { /**/ }
    setLoadingTables(null);
  };

  const selectTable = async (conn: Connection, schema: string, table: string) => {
    if (trackedTables.find(t => t.table === table)) {
      alert(`La tabla ${table} ya ha sido agregada a la barra lateral.`);
      return;
    }
    setLoadingCols(true);
    try {
      const d = await apiFetch("/api/columns", { host: conn.host, database: conn.database, username: conn.username, password: conn.password, schema, table });
      if (d.success) {
        setTrackedTables(prev => [...prev, { conn, schema, table, columns: d.columns, isExpanded: true }]);
      }
    } catch { /**/ }
    setLoadingCols(false);
  };

  const toggleTrackedTable = (table: string) => {
    setTrackedTables(prev => prev.map(t => t.table === table ? { ...t, isExpanded: !t.isExpanded } : t));
  };
  
  const removeTrackedTable = (table: string) => {
    setTrackedTables(prev => prev.filter(t => t.table !== table));
  };

  // ─────────────────────────────────────────────────────────────────────
  // Run SQL
  // ─────────────────────────────────────────────────────────────────────
  const runQuery = async (tab: DataTab, explicitConn?: Connection) => {
    const conn = explicitConn || connections.find(c => c.id === tab.connectionId);
    if (!conn) { patchTab(tab.id, { error: "Selecciona una conexión válida." }); return; }
    patchTab(tab.id, { loading: true, error: "", queryRan: false });
    try {
      const d = await apiFetch("/api/query", { host: conn.host, database: conn.database, username: conn.username, password: conn.password, query: tab.query });
      if (d.success) patchTab(tab.id, { rows: d.rows, columns: d.columns, loading: false, queryRan: true });
      else patchTab(tab.id, { error: d.error, loading: false });
    } catch {
      patchTab(tab.id, { error: "No se puede conectar al backend. Ejecuta: npm run api", loading: false });
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Run JSX code in iframe — uses @babel/standalone for JSX transpilation
  // ─────────────────────────────────────────────────────────────────────
  const runCode = () => {
    setRenderCounter(prev => prev + 1);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Save component / Dashboard
  // ─────────────────────────────────────────────────────────────────────
  const { deleteDevMeasure } = useDataStore() as any;

  const saveComponent = (tab: DataTab) => {
    const name = prompt("Nombre del componente:", tab.title);
    if (!name) return;
    const comp = { id: `comp-${Date.now()}`, name, code: tab.code, rows: tab.rows, columns: tab.columns };
    saveDevMeasure(comp);
  };

  const addToDashboard = (comp: any) => {
    const updated = [...dashItems, { ...comp, instanceId: `inst-${Date.now()}` }];
    saveDevCanvas(updated);
  };

  const removeFromDashboard = (iid: string) => {
    const updated = dashItems.filter((d: any) => d.instanceId !== iid);
    saveDevCanvas(updated);
  };

  const deleteSavedComponent = (id: string) => {
    deleteDevMeasure(id);
  };



  // ─────────────────────────────────────────────────────────────────────
  // Filtered tables
  // ─────────────────────────────────────────────────────────────────────
  const filteredTables = (connId: string) => {
    const tables = tablesMap[connId] || [];
    if (!tableSearch.trim()) return tables;
    const q = tableSearch.toLowerCase();
    return tables.filter(t => t.TABLE_NAME.toLowerCase().includes(q));
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  
  // ── RENDER: LANDING ──
  if (viewMode === 'landing') {
    return (
      <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans items-center justify-center p-6 transition-all duration-500`}>
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-3">Lienzo de Desarrollo</h1>
            <p className={`${theme.muted} text-lg`}>Bienvenido al entorno de creación y edición de DataCanvas O.S.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Card */}
            <div 
              onClick={startCreate}
              className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                dark ? 'bg-[#161b22] border-slate-800 hover:border-indigo-500 hover:bg-[#1c232d]' : 'bg-white border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30'
              }`}
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Crear Nuevo</h3>
                <p className={`${theme.muted} text-sm leading-relaxed mb-6`}>
                  Inicia un proyecto desde cero. Define tus conexiones SQL, crea medidas interactivas y diseña un dashboard totalmente nuevo.
                </p>
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                  Empezar Ahora <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <LayoutDashboard className="w-32 h-32" />
              </div>
            </div>

            {/* Edit Card */}
            <div 
              onClick={() => setViewMode('edit_selection')}
              className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                dark ? 'bg-[#161b22] border-slate-800 hover:border-emerald-500 hover:bg-[#1c232d]' : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30'
              }`}
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <PenSquare className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Editar Existente</h3>
                <p className={`${theme.muted} text-sm leading-relaxed mb-6`}>
                  Modifica dashboards ya publicados. Ajusta medidas, cambia el layout o agrega nuevas visualizaciones a los tableros actuales.
                </p>
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                  Explorar Repositorio <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Search className="w-32 h-32" />
              </div>
            </div>

            {/* Basic Mode Card */}
            <div 
              onClick={startBasico}
              className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                dark ? 'bg-[#161b22] border-slate-800 hover:border-orange-500 hover:bg-[#1c232d]' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/30'
              }`}
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Code2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Lienzo Básico</h3>
                <p className={`${theme.muted} text-sm leading-relaxed mb-6`}>
                  Pega directamente tu HTML o JSX previamente trabajado. Sin necesidad de consultas SQL ni configuración compleja.
                </p>
                <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                  Pegar Código <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText className="w-32 h-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: EDIT SELECTION ──
  if (viewMode === 'edit_selection') {
    return (
      <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans transition-all duration-500`}>
        <header className={`h-16 ${theme.surface} ${theme.border} border-b flex items-center justify-between px-8 shrink-0`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('landing')} className={`p-2 rounded-xl border ${theme.border} ${theme.hover} transition`}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold italic tracking-tight">Seleccionar Dashboard para Editar</h2>
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-xs ${theme.muted}`}>Selecciona un área para ver sus tableros</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {INITIAL_AREAS.map(areaId => (
                <div key={areaId} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: theme.border }}>
                    <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-indigo-500">{AREA_NAMES[areaId]}</h3>
                  </div>
                  
                  <div className="grid gap-3">
                    {(systemDashboards[areaId] || []).length === 0 ? (
                      <p className={`text-sm italic ${theme.muted} py-4`}>No hay dashboards en esta área.</p>
                    ) : (
                      (systemDashboards[areaId] || []).map((dash: any) => (
                        <div 
                          key={dash.id}
                          onClick={() => openSecurityGate(dash)}
                          className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${
                            dark ? 'bg-[#161b22] border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-500 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                              <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-bold text-base">{dash.title}</div>
                              <div className={`text-xs ${theme.muted}`}>{dash.category || AREA_NAMES[areaId]}</div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-500/30">
                            Abrir Editor
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Security Gate Modal */}
        {securityGate.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-md p-8 rounded-3xl border-2 shadow-2xl animate-in zoom-in duration-300 ${
              dark ? 'bg-[#161b22] border-slate-700' : 'bg-white border-slate-100'
            }`}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Acceso Restringido</h3>
                <p className={`${theme.muted} text-sm px-4`}>
                  Para abrir el editor de <strong>{securityGate.dashboard?.title}</strong>, es obligatorio autenticar la conexión a la base de datos de producción.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1 px-1">Host / IP de Base de Datos</label>
                  <input 
                    value={securityGate.form.host} 
                    onChange={e => setSecurityGate({...securityGate, form: {...securityGate.form, host: e.target.value}})}
                    className={`w-full ${theme.input} border-2 rounded-2xl px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-all`} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1 px-1">Usuario SQL</label>
                    <input 
                      value={securityGate.form.user} 
                      onChange={e => setSecurityGate({...securityGate, form: {...securityGate.form, user: e.target.value}})}
                      className={`w-full ${theme.input} border-2 rounded-2xl px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-all`} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1 px-1">Contraseña</label>
                    <input 
                      type="password"
                      placeholder="••••••••"
                      value={securityGate.form.pass} 
                      onChange={e => setSecurityGate({...securityGate, form: {...securityGate.form, pass: e.target.value}})}
                      className={`w-full ${theme.input} border-2 rounded-2xl px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-all`} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setSecurityGate({...securityGate, isOpen: false})}
                  className="flex-1 py-4 font-bold opacity-50 hover:opacity-100 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUnlock}
                  className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Desbloquear Editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden transition-colors duration-200`}>



      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className={`h-11 ${theme.surface} ${theme.border} border-b flex items-center justify-between px-4 shrink-0`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('landing')}
            className={`flex items-center gap-1.5 text-[10px] font-bold ${theme.muted} hover:text-indigo-400 transition pr-3 border-r ${theme.border}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Inicio
          </button>
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">DataCanvas O.S.</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wider">DEV</span>
          </div>

          {(viewMode === 'main' || viewMode === 'basico') && (
            <div className={`flex items-center p-0.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg border ${theme.border}`}>
              <button 
                onClick={() => setWorkspaceMode('graphic')}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'graphic' ? 'bg-white text-indigo-500 shadow-sm' : `text-slate-500 ${theme.hover}`}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Gráfica
              </button>
              <button 
                onClick={() => setWorkspaceMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'code' ? 'bg-white text-emerald-500 shadow-sm' : `text-slate-500 ${theme.hover}`}`}
              >
                <Code2 className="w-3.5 h-3.5" /> Código JSX
              </button>
              <button 
                onClick={() => setWorkspaceMode('relations')}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${workspaceMode === 'relations' ? 'bg-white text-orange-500 shadow-sm' : `text-slate-500 ${theme.hover}`}`}
              >
                <Database className="w-3.5 h-3.5" /> Relaciones
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${theme.muted} hidden sm:block`}>{user?.firstName} {user?.lastName}</span>
          <button
            onClick={() => {
              if (dashItems.length > 0 && !window.confirm("¿Deseas limpiar el lienzo actual para crear uno nuevo?")) return;
              saveDevCanvas([]);
              setShowDashboard(true);
            }}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 px-2.5 py-1.5 rounded transition border border-emerald-600/30 shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-2.5 py-1.5 rounded transition border border-indigo-600/30"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Tablero ({dashItems.length})
          </button>
          <button onClick={toggleTheme} className={`p-1.5 rounded ${theme.hover} transition ${theme.muted}`}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-400/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <button 
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className={`absolute top-1/2 -translate-y-1/2 z-20 w-4 h-12 flex items-center justify-center border ${theme.border} rounded-r-md shadow-md ${theme.surface} ${theme.text} hover:text-indigo-500 transition-all duration-300 ${showLeftPanel ? 'left-60' : 'left-0'}`}
        >
          <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${showLeftPanel ? 'rotate-180' : ''}`} />
        </button>

        {/* ── LEFT: Explorer ──────────────────────────────────────────── */}
        <aside className={`flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${showLeftPanel ? 'w-60 opacity-100' : 'w-0 opacity-0'} ${theme.surface} ${theme.border} border-r`}>
          <div className={`flex items-center justify-between px-3 py-2 ${theme.border} border-b shrink-0`}>
            <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider`}>Bases de Datos</span>
            <button onClick={() => setShowAddConn(true)} className="text-indigo-400 hover:text-indigo-300 transition"><Plus className="w-4 h-4" /></button>
          </div>

          {/* Search */}
          <div className={`px-2 py-2 ${theme.border} border-b shrink-0`}>
            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${theme.muted}`} />
              <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Buscar tabla..."
                className={`w-full pl-7 pr-3 py-1.5 rounded text-xs ${theme.input} border focus:border-indigo-500 focus:outline-none`} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {connections.length === 0 && (
              <div className="p-6 text-center">
                <Database className={`w-8 h-8 ${theme.muted} mx-auto mb-2 opacity-30`} />
                <p className={`text-xs ${theme.muted} italic`}>Sin conexiones</p>
                <button onClick={() => setShowAddConn(true)} className="mt-2 text-xs text-indigo-400 hover:underline">+ Agregar</button>
              </div>
            )}

            {connections.map(conn => {
              const isExp = expandedConn === conn.id;
              const isLoading = loadingTables === conn.id;
              const tables = filteredTables(conn.id);
              const schemas: Record<string, TableMeta[]> = {};
              tables.forEach(t => { if (!schemas[t.TABLE_SCHEMA]) schemas[t.TABLE_SCHEMA] = []; schemas[t.TABLE_SCHEMA].push(t); });

              return (
                <div key={conn.id}>
                  <button className={`w-full flex items-center gap-1.5 px-3 py-1.5 ${theme.hover} transition group text-left`} onClick={() => loadTables(conn)}>
                    {isExp ? <ChevronDown className={`w-3 h-3 ${theme.muted} shrink-0`} /> : <ChevronRight className={`w-3 h-3 ${theme.muted} shrink-0`} />}
                    <Database className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-xs truncate flex-1">{conn.name}</span>
                    {isLoading
                      ? <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                      : <button onClick={e => { e.stopPropagation(); deleteConn(conn.id); }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition shrink-0"><X className="w-3 h-3" /></button>
                    }
                  </button>

                  {isExp && !isLoading && Object.entries(schemas).map(([schema, sTables]) => (
                    <div key={schema} className="ml-3">
                      <div className={`px-2 py-0.5 text-[9px] ${theme.muted} uppercase tracking-widest font-bold opacity-60`}>{schema}</div>
                      {sTables.map(tbl => {
                        const isSel = trackedTables.some(t => t.table === tbl.TABLE_NAME && t.schema === tbl.TABLE_SCHEMA && t.conn.id === conn.id);
                        return (
                          <button
                            key={tbl.TABLE_NAME}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-left transition group ${
                              isSel ? `${dark ? 'bg-indigo-500/20' : 'bg-indigo-50'} text-indigo-400` : `${theme.hover} ${theme.text} opacity-80 hover:opacity-100`
                            }`}
                            onClick={() => selectTable(conn, tbl.TABLE_SCHEMA, tbl.TABLE_NAME)}
                            onDoubleClick={() => openTab(conn, tbl.TABLE_SCHEMA, tbl.TABLE_NAME)}
                            title="Click: Añadir | Doble clic: Ejecutar consulta"
                          >
                            <Table2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="text-xs truncate flex-1">{tbl.TABLE_NAME}</span>
                            <button onClick={e => { e.stopPropagation(); openTab(conn, tbl.TABLE_SCHEMA, tbl.TABLE_NAME); }}
                              className="opacity-0 group-hover:opacity-100 text-indigo-400 text-[10px] px-1 shrink-0 hover:text-indigo-300">↗</button>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className={`p-2 ${theme.border} border-t shrink-0`}>
            <button onClick={openBlankTab} className={`w-full flex items-center justify-center gap-1.5 text-xs ${dark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} py-1.5 rounded transition`}>
              <Code2 className="w-3.5 h-3.5" /> Nuevo Script
            </button>
          </div>
        </aside>

        {/* ── CENTER: Editor + Grid ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className={`h-9 ${theme.surface} ${theme.border} border-b flex items-end overflow-x-auto shrink-0`}>
            {tabs.map(tab => (
              <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border-r ${theme.border} cursor-pointer shrink-0 transition select-none ${
                  activeTabId === tab.id
                    ? `${dark ? 'bg-[#0d1117]' : 'bg-slate-50'} ${theme.text} border-t-2 border-t-indigo-500`
                    : `${theme.muted} ${theme.hover}`
                }`}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="max-w-[100px] truncate">{tab.title}</span>
                {tab.loading && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }} className="hover:text-red-400 ml-1 shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {tabs.length === 0 && <div className={`px-4 py-2 text-xs ${theme.muted} italic`}>← Doble clic en una tabla para abrir datos</div>}
          </div>

          {!activeTab ? (
            <div className={`flex-1 flex flex-col items-center justify-center ${theme.bg} text-center p-8`}>
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-indigo-500 opacity-10" />
              <h2 className={`text-lg font-bold ${theme.muted} mb-2`}>DataCanvas O.S.</h2>
              <p className={`text-sm ${theme.muted} max-w-sm opacity-60`}>Conecta una base de datos, selecciona una tabla, y doble clic para cargar datos.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Query bar */}
              <div className={`${theme.surface} ${theme.border} border-b px-3 py-2 flex gap-2 items-start shrink-0`}>
                <textarea className={`flex-1 ${theme.input} border rounded px-3 py-1.5 font-mono text-xs focus:border-indigo-500 focus:outline-none resize-none`}
                  rows={2} value={activeTab.query} onChange={e => patchTab(activeTabId!, { query: e.target.value })} />
                <div className="flex flex-col gap-1.5">
                  <select className={`${theme.input} border rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none`}
                    value={activeTab.connectionId} onChange={e => patchTab(activeTabId!, { connectionId: e.target.value })}>
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => runQuery(activeTab)} disabled={activeTab.loading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 justify-center transition">
                    {activeTab.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {activeTab.loading ? "..." : "Run"}
                  </button>
                </div>
              </div>

              {activeTab.error && (
                <div className="px-4 py-2 bg-red-900/20 border-b border-red-900/40 text-xs text-red-400 font-mono shrink-0 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {activeTab.error}
                </div>
              )}

              <div className="flex-1 flex overflow-hidden relative">
                
                {/* ─ RELATIONS MODE ─ */}
                {workspaceMode === 'relations' && (
                  <div className="absolute inset-0 z-20">
                    <RelationCanvas 
                      nodes={relNodes} 
                      edges={relEdges} 
                      onNodesChange={setRelNodes} 
                      onEdgesChange={setRelEdges}
                      dark={dark}
                    />
                  </div>
                )}
                
                {/* ─ CODE MODE ─ */}
                {workspaceMode === 'code' && (
                  <div className={`absolute inset-0 z-20 flex flex-col ${dark ? 'bg-[#0d1117]' : 'bg-[#f8fafc]'}`}>
                     <div className={`h-12 ${theme.surface} ${theme.border} border-b flex items-center justify-between px-5 shadow-sm`}>
                        <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          <Code2 className="w-4 h-4" /> Intérprete React / JSX
                        </span>
                        <div className="flex gap-2">
                           <button onClick={runCode} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 transition shadow-md shadow-emerald-500/20 active:scale-95">
                             <Play className="w-3.5 h-3.5" /> Renderizar
                           </button>
                           <button onClick={() => saveComponent(activeTab)} className={`text-xs ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 transition`}>
                             <Save className="w-3.5 h-3.5" /> Guardar Script
                           </button>
                        </div>
                     </div>
                     <div className="flex-1 flex overflow-hidden">
                       <div className="flex-[3] border-r border-slate-700 relative">
                         <SyntaxHighlighter code={activeTab.code} onChange={code => patchTab(activeTabId!, { code })} dark={dark} />
                       </div>
                       <div className={`flex-[2] ${dark ? 'bg-[#06090f]' : 'bg-slate-100'} overflow-hidden flex flex-col`}>
                         <div className={`h-8 ${theme.surface} ${theme.border} border-b flex items-center px-3 shrink-0`}>
                           <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider flex items-center gap-1`}><BarChart3 className="w-3 h-3" /> Live Preview</span>
                         </div>
                         <div className="flex-1 overflow-hidden relative p-4">
                           <div className={`w-full h-full border ${theme.border} rounded-xl ${theme.surface} shadow-sm overflow-hidden flex flex-col`}>
                             <ChartPreview code={activeTab.code} rows={activeTab.rows} columns={activeTab.columns} dark={dark} autoRender={renderCounter > 0} key={`${activeTab.id}-${renderCounter}`} />
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>
                )}
                
                {/* ─ GRAPHIC MODE ─ */}
                <div className={`flex-1 flex overflow-hidden transition-opacity duration-300 ${workspaceMode === 'graphic' ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                {/* Data Grid */}
                <div className={`${showDataGrid ? 'flex-1' : 'w-0 opacity-0 border-none'} flex flex-col overflow-hidden transition-all duration-300`}>
                  <div className={`h-7 ${theme.surface} ${theme.border} border-b flex items-center px-3 gap-3 shrink-0 justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider`}>Resultados</span>
                      {activeTab.queryRan && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {activeTab.rows.length} filas</span>}
                    </div>
                    <button onClick={() => setShowDataGrid(false)} className={`text-[9px] font-bold uppercase tracking-widest ${theme.muted} hover:text-indigo-400 transition flex items-center gap-1`}>
                      Contraer <Columns3 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto bg-white">
                    {!activeTab.queryRan && !activeTab.loading ? (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs flex-col gap-2 opacity-60">
                        <Play className="w-6 h-6" /><span>Ejecuta una query</span>
                      </div>
                    ) : activeTab.loading ? (
                      <div className="flex items-center justify-center h-full gap-2 text-indigo-400 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin" /> Ejecutando...
                      </div>
                    ) : (
                      <table className="w-full text-xs border-collapse min-w-max">
                        <thead>
                          <tr className="sticky top-0 z-10 bg-slate-100">
                            {activeTab.columns.map(col => <th key={col} className="px-3 py-2 text-left text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap">{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {activeTab.rows.map((row, i) => (
                            <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-indigo-50 transition`}>
                              {activeTab.columns.map(col => (
                                <td key={col} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[220px] truncate" title={String(row[col] ?? '')}>
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic text-[10px]">null</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Code + Preview */}
                <div className={`${showDataGrid ? 'w-[44%] shrink-0 border-l' : 'flex-1'} flex flex-col ${theme.bg} ${theme.border} overflow-hidden relative transition-all duration-300`}>
                  {/* VISUAL MAPPER OVERLAY (POWER BI STYLE) */}
                  {activeVisualType && (
                    <div className={`p-3 border-b ${theme.border} ${theme.surface} animate-in slide-in-from-top duration-300 z-10 shadow-xl`}>
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-indigo-600/10 rounded-lg text-indigo-400">
                             {(() => {
                               const icons: any = { bar: BarChart3, 'bar-h': Columns3, line: RefreshCw, area: LayoutDashboard, pie: PieChart, table: Table2, card: FileText };
                               const Ico = icons[activeVisualType] || BarChart3;
                               return <Ico className="w-4 h-4" />
                             })()}
                           </div>
                           <h4 className="text-[10px] font-black uppercase tracking-tight">Mapeador: {activeVisualType.toUpperCase()}</h4>
                         </div>
                         <button onClick={() => setActiveVisualType(null)} className="text-[9px] font-bold opacity-40 hover:opacity-100 transition px-2 py-0.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-400">
                           Cerrar
                         </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2">
                        {VISUAL_DEFINITIONS[activeVisualType]?.slots.map((slot) => {
                          const items = visualMapping[slot.id] || [];
                          return (
                            <div key={slot.id} className="flex flex-col gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                              <label className="text-[9px] font-black uppercase tracking-widest opacity-60 text-indigo-600 dark:text-indigo-400">
                                {slot.label} {slot.type==='value'?'(Medida)':'(Categoría)'}
                              </label>
                              <div 
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                  e.preventDefault();
                                  const colName = e.dataTransfer.getData("colName");
                                  const existing = visualMapping[slot.id] || [];
                                  if (existing.find(i => i.name === colName)) return; // prevent dupes
                                  
                                  const newItem: VisualSlotItem = { name: colName, agg: slot.type === 'value' ? 'sum' : 'none' };
                                  const next = { ...visualMapping, [slot.id]: [...existing, newItem] };
                                  setVisualMapping(next);
                                  updateGeneratedCode(activeVisualType, next);
                                }}
                                className={`min-h-[36px] mt-1 border-2 border-dashed rounded-lg flex flex-wrap items-center gap-1.5 p-1.5 transition-all ${
                                  items.length > 0 ? 'border-transparent bg-white dark:bg-slate-900 shadow-sm' : 'border-slate-300/60 dark:border-slate-700/60 hover:border-indigo-400/40'
                                }`}
                              >
                                {items.length === 0 && <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest pl-1">Soltar Campo</span>}
                                {items.map((item, idx) => (
                                  <div key={item.name+idx} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/30 rounded text-slate-700 dark:text-indigo-200 text-[10px] font-bold group w-full">
                                    <div className="flex-1 truncate leading-none py-0.5">{item.name}</div>
                                    
                                    {slot.type === 'value' && (
                                      <select 
                                        className="bg-transparent border-none outline-none cursor-pointer text-indigo-500 dark:text-indigo-400 font-black tracking-widest text-[9px] uppercase hover:bg-indigo-500/10 rounded px-1 min-w-min"
                                        title="Función de Agrupación"
                                        value={item.agg}
                                        onChange={e => {
                                          const nextItems = [...items];
                                          nextItems[idx] = { ...item, agg: e.target.value as any };
                                          const next = { ...visualMapping, [slot.id]: nextItems };
                                          setVisualMapping(next);
                                          updateGeneratedCode(activeVisualType, next);
                                        }}
                                      >
                                        <option value="sum" className="text-slate-900">SUM</option>
                                        <option value="avg" className="text-slate-900">AVG</option>
                                        <option value="count" className="text-slate-900">CNT</option>
                                        <option value="min" className="text-slate-900">MIN</option>
                                        <option value="max" className="text-slate-900">MAX</option>
                                        <option value="none" className="text-slate-900"> - </option>
                                      </select>
                                    )}

                                    <button className="opacity-40 hover:opacity-100 text-red-500 hover:bg-red-500/10 shrink-0 p-0.5 rounded transition" onClick={() => {
                                      const next = {...visualMapping, [slot.id]: items.filter((_,i)=>i!==idx)};
                                      setVisualMapping(next);
                                      updateGeneratedCode(activeVisualType, next);
                                    }}><X className="w-3 h-3" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                  {!showDataGrid && (
                    <div className="absolute top-2 left-2 z-20">
                      <button onClick={() => setShowDataGrid(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 shadow-lg transition flex items-center gap-2 text-xs font-bold">
                        <Columns3 className="w-4 h-4" /> Mostrar Datos
                      </button>
                    </div>
                  )}

                  {/* Preview (Maximized in Graphic Mode) */}
                  <div className="flex-1 flex flex-col shrink-0 overflow-hidden relative">
                    <ChartPreview
                      code={activeTab.code}
                      rows={activeTab.rows}
                      columns={activeTab.columns}
                      dark={dark}
                      autoRender={renderCounter > 0}
                      key={`${activeTab.id}-${renderCounter}`}
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Right Panel Button */}
        <button 
          onClick={() => setShowRightPanel(!showRightPanel)}
          className={`absolute top-1/2 -translate-y-1/2 z-20 w-4 h-12 flex items-center justify-center border ${theme.border} rounded-l-md shadow-md ${theme.surface} ${theme.text} hover:text-indigo-500 transition-all duration-300 ${showRightPanel ? 'right-56' : 'right-0'}`}
        >
          <ChevronLeft className={`w-3 h-3 transition-transform duration-300 ${showRightPanel ? 'rotate-180' : ''}`} />
        </button>

        {/* Column Inspector */}
        <aside className={`flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${showRightPanel ? 'w-56 opacity-100' : 'w-0 opacity-0'} ${theme.surface} ${theme.border} border-l`}>
                  {/* Power BI Style Visuals Panel */}
                  <div className={`p-3 border-b ${theme.border}`}>
                    <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider block mb-3`}>Visuales (Templates)</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'bar', icon: BarChart3, label: 'Barras' },
                          { id: 'bar-stacked', icon: LayoutPanelTop, label: 'B. Apiladas' },
                          { id: 'bar-h', icon: Layers, label: 'B. Horiz' },
                          { id: 'line', icon: RefreshCw, label: 'Línea' },
                          { id: 'area', icon: LayoutDashboard, label: 'Área' },
                          { id: 'pie', icon: PieChart, label: 'Circular' },
                          { id: 'donut', icon: Circle, label: 'Dona' },
                          { id: 'card', icon: FileText, label: 'Tarjeta' },
                          { id: 'table', icon: Table2, label: 'Tabla' },
                          { id: 'matrix', icon: Grid, label: 'Matriz' },
                          { id: 'slicer', icon: Filter, label: 'Filtro' },
                        ].map(v => (
                          <button 
                            key={v.id} 
                            onClick={() => {
                              if (!activeTab) return;
                              setActiveVisualType(v.id);
                              const fresh = getEmptyMapping();
                              setVisualMapping(fresh);
                              updateGeneratedCode(v.id, fresh);
                            }}
                            className={`p-2 rounded-lg border transition flex items-center justify-center group relative ${
                              activeVisualType === v.id ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400' : `${theme.border} ${theme.hover} text-slate-500`
                            }`}
                            title={v.label}
                          >
                            <v.icon className={`w-4 h-4 ${activeVisualType === v.id ? 'animate-pulse' : ''}`} />
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">{v.label}</div>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 p-2">
                    {trackedTables.length === 0 && viewMode === 'main' && (
                      <div className="p-4 text-center">
                        <Columns3 className={`w-8 h-8 mx-auto mb-2 opacity-20 ${theme.muted}`} />
                        <p className={`text-[11px] ${theme.muted} italic`}>Selecciona tablas de la izquierda</p>
                      </div>
                    )}
                    {loadingCols && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>}
                    {trackedTables.length > 0 && (
                      <div className="flex flex-col gap-2 p-2 pb-0 shrink-0">
                        <input
                          type="text"
                          placeholder="Buscar columna en tablas..."
                          className={`w-full ${theme.input} border rounded-lg px-3 py-1.5 text-[11px] focus:border-indigo-500 focus:outline-none`}
                          value={rightPanelSearch}
                          onChange={e => setRightPanelSearch(e.target.value)}
                        />
                        <div className="flex gap-2">
                           <button onClick={() => setTrackedTables(p => p.map(t => ({...t, isExpanded: true})))} className={`flex-1 text-[9px] uppercase tracking-widest font-bold py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 transition`}>Expandir</button>
                           <button onClick={() => setTrackedTables(p => p.map(t => ({...t, isExpanded: false})))} className={`flex-1 text-[9px] uppercase tracking-widest font-bold py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 transition`}>Contraer</button>
                        </div>
                      </div>
                    )}
                    
                    {trackedTables.map(t => {
                      const filteredCols = t.columns.filter(c => c.COLUMN_NAME.toLowerCase().includes(rightPanelSearch.toLowerCase()));
                      if (rightPanelSearch && filteredCols.length === 0) return null; // Hide table if no columns match

                      return (
                      <div key={t.table} className={`rounded-xl border shadow-sm overflow-hidden ${theme.border} ${theme.surface}`}>
                        <div className={`px-2 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-500/5 transition`} onClick={() => toggleTrackedTable(t.table)}>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-indigo-500 truncate">{t.schema}.{t.table}</span>
                             <span className={`text-[9px] ${theme.muted}`}>{t.columns.length} columnas</span>
                          </div>
                          <div className="flex items-center gap-1">
                             <button onClick={(e) => { e.stopPropagation(); openTab(t.conn, t.schema, t.table); }} title="Consultar" className="text-[10px] bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white px-1.5 py-0.5 rounded transition">↗</button>
                             <button onClick={(e) => { e.stopPropagation(); removeTrackedTable(t.table); }} className="text-red-400 hover:text-red-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        {t.isExpanded && (
                          <div className="border-t border-slate-500/10 max-h-64 overflow-y-auto">
                            {filteredCols.map((col, i) => (
                              <div
                                key={i}
                                draggable
                                onDragStart={e => { e.dataTransfer.setData("colName", col.COLUMN_NAME); setIsDragging(true); }}
                                onDragEnd={() => setIsDragging(false)}
                                onClick={() => {
                                  if (activeTabId) patchTab(activeTabId, { code: (activeTab?.code || "") + ` "${col.COLUMN_NAME}"` });
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-indigo-600/5 transition cursor-grab border-b last:border-b-0 border-slate-500/10 group`}
                              >
                                <Columns3 className={`w-3 h-3 shrink-0 ${theme.muted} opacity-50`} />
                                <div className="flex-1 min-w-0">
                                  <div className={`truncate font-medium group-hover:text-indigo-500 transition-colors`}>{col.COLUMN_NAME}</div>
                                  <div className={`text-[9px] opacity-70 ${typeColor(col.DATA_TYPE)}`}>{col.DATA_TYPE}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>

          {/* Saved Components list (BANCO DE GRÁFICOS) */}
          {savedComponents.length > 0 && (
            <div className={`${theme.border} border-t`}>
              <div className={`px-3 py-2 text-[10px] font-black ${theme.muted} uppercase tracking-widest text-indigo-500`}>Banco de Gráficos ({savedComponents.length})</div>
              <div className="max-h-56 overflow-y-auto">
                {savedComponents.map((sc: any) => (
                  <div key={sc.id} className={`flex items-center gap-1 px-2 py-1 text-xs ${theme.hover} group`}>
                    <BarChart3 className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="flex-1 truncate text-[11px]">{sc.name}</span>
                    <button onClick={() => addToDashboard(sc)} title="Agregar al dashboard"
                      className="opacity-0 group-hover:opacity-100 text-emerald-400 hover:text-emerald-300 transition text-[10px] px-1">+DB</button>
                    <button onClick={() => deleteSavedComponent(sc.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Dashboard Modal ──────────────────────────────────────────── */}
      {showDashboard && (
        <DashboardBuilder
          components={savedComponents}
          dark={dark}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {/* ── Add Connection Modal ─────────────────────────────────────── */}
      {showAddConn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${dark ? 'bg-[#161b22] border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-md p-6 shadow-2xl`}>
            <h3 className={`text-base font-bold ${theme.text} mb-4 flex items-center gap-2`}>
              <Database className="w-4 h-4 text-indigo-400" /> Nueva Conexión SQL Server
            </h3>
            <div className="space-y-3">
              <div>
                <label className={`text-xs font-medium ${theme.muted} block mb-1`}>Nombre (alias)</label>
                <input className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none`}
                  value={connForm.name} onChange={e => setConnForm({...connForm, name: e.target.value})} placeholder="Producción ATR" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${theme.muted} block mb-1`}>Servidor / IP</label>
                  <input className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none`}
                    value={connForm.host} onChange={e => setConnForm({...connForm, host: e.target.value})} placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${theme.muted} block mb-1`}>Base de Datos</label>
                  <input className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none`}
                    value={connForm.database} onChange={e => setConnForm({...connForm, database: e.target.value})} placeholder="ATR_DB" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${theme.muted} block mb-1`}>Usuario</label>
                  <input className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none`}
                    value={connForm.username} onChange={e => setConnForm({...connForm, username: e.target.value})} placeholder="sa" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${theme.muted} block mb-1`}>Contraseña</label>
                  <input type="password" className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none`}
                    value={connForm.password} onChange={e => setConnForm({...connForm, password: e.target.value})} placeholder="••••••••" />
                </div>
              </div>
              {connTestMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${connTestMsg.ok ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900' : 'bg-red-950/40 text-red-400 border border-red-900'}`}>
                  {connTestMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  {connTestMsg.msg}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-700/40">
              <button onClick={testConn} disabled={connTesting} className={`text-sm ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} px-4 py-2 rounded-lg transition disabled:opacity-50`}>
                {connTesting ? "Probando..." : "Probar conexión"}
              </button>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddConn(false); setConnTestMsg(null); }} className={`text-sm ${theme.muted} px-3 py-2 transition`}>Cancelar</button>
                <button onClick={saveConn} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial ─────────────────────────────────────────────────── */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${dark ? 'bg-[#161b22] border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-md p-6 shadow-2xl`}>
            <h3 className={`text-lg font-bold ${theme.text} mb-1`}>DataCanvas O.S. 🚀</h3>
            <p className={`text-xs ${theme.muted} mb-4`}>Tu IDE de análisis de datos en tiempo real.</p>
            <div className="space-y-2.5 text-xs">
              {[
                ["1", "text-indigo-400", "Conecta tu SQL Server", "Clic en + en el explorador izquierdo. Agrega tu IP, base de datos, usuario y contraseña."],
                ["2", "text-emerald-400", "Explora tablas y columnas", "Expande la conexión. Clic → ver columnas. Doble clic → abrir datos en el grid."],
                ["3", "text-pink-400", "Desarrolla visualizaciones JSX", "Edita el código React en el panel derecho con Recharts. Datos disponibles en data[] y columns[]. Presiona Renderizar."],
                ["4", "text-yellow-400", "Construye un Dashboard", "Guarda componentes con el botón Guardar. Desde la lista de guardados haz +DB para agregar al dashboard."],
              ].map(([n, color, title, desc]) => (
                <div key={n} className={`flex gap-3 ${dark ? 'bg-slate-800/50' : 'bg-slate-50'} p-3 rounded-lg`}>
                  <span className={`${color} font-bold text-base shrink-0`}>{n}</span>
                  <div><strong className={theme.text}>{title}</strong><br /><span className={theme.muted}>{desc}</span></div>
                </div>
              ))}
            </div>
            <div className={`mt-4 ${dark ? 'bg-indigo-950/40 border-indigo-900' : 'bg-indigo-50 border-indigo-200'} border rounded-lg p-3 text-xs text-indigo-400`}>
              ⚡ Requiere backend activo en otra terminal: <code className={`${dark ? 'bg-indigo-900/40' : 'bg-indigo-100'} px-1 rounded`}>npm run api</code>
            </div>
            <button onClick={() => { setShowTutorial(false); localStorage.setItem("atr_dev_tutorial_seen","true"); }}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition text-sm">
              ¡Entendido! →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
