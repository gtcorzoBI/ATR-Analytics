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
  const [connections, setConnections] = useState<Connection[]>(() =>
    JSON.parse(localStorage.getItem("atr_connections") || "[]")
  );
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState({ name: "", host: "localhost", database: "", username: "sa", password: "" });
  const [connTesting, setConnTesting] = useState(false);
  const [connTestMsg, setConnTestMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Explorer ─────────────────────────────────────────────────────────
  const [expandedConn, setExpandedConn] = useState<string | null>(null);
  const [tablesMap, setTablesMap] = useState<Record<string, TableMeta[]>>({});
  const [selectedTable, setSelectedTable] = useState<{ conn: Connection; schema: string; table: string } | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnMeta[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [loadingTables, setLoadingTables] = useState<string | null>(null);
  const [loadingCols, setLoadingCols] = useState(false);

  // ── Editor Tabs ───────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<DataTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const [renderCounter, setRenderCounter] = useState(0);

  // ── Saved Components & Dashboard ─────────────────────────────────────
  const [savedComponents, setSavedComponents] = useState<any[]>(() =>
    JSON.parse(localStorage.getItem("atr_saved_components") || "[]")
  );
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashItems, setDashItems] = useState<any[]>(() =>
    JSON.parse(localStorage.getItem("atr_dashboard_items") || "[]")
  );

  // ── Tutorial ──────────────────────────────────────────────────────────
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => { if (!localStorage.getItem("atr_dev_tutorial_seen")) setShowTutorial(true); }, []);

  // ── Dev Workflow State ────────────────────────────────────────────────
  const { systemDashboards } = useDataStore();
  const [viewMode, setViewMode] = useState<'landing' | 'main' | 'edit_selection' | 'basico'>('landing');
  const [isDragging, setIsDragging] = useState(false);
  const [activeVisualType, setActiveVisualType] = useState<string | null>(null);
  const [visualMapping, setVisualMapping] = useState<{
    xAxis: string;
    yAxis: string;
    rows: string[];
    cols: string[];
    values: Array<{ name: string; agg: 'sum' | 'avg' | 'count' | 'distinct' | 'none' }>;
    legend: string;
  }>({
    xAxis: '', yAxis: '', rows: [], cols: [], values: [], legend: ''
  });

  const [securityGate, setSecurityGate] = useState<{
    isOpen: boolean;
    dashboard: any | null;
    form: { user: string; pass: string; host: string; db: string };
  }>({
    isOpen: false,
    dashboard: null,
    form: { user: 'sa', pass: '', host: 'localhost', db: '' }
  });

  const startCreate = () => {
    // Force complete reset for NEW projects
    setTabs([]);
    setActiveTabId(null);
    setDashItems([]);
    setSavedComponents([]);
    setActiveVisualType(null);
    setVisualMapping({ xAxis: '', yAxis: '', rows: [], cols: [], values: [], legend: '' });
    setConnections([]); // Clear connections as requested
    localStorage.removeItem("atr_connections"); // Persist the clear
    setViewMode('main');
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
      setSavedComponents(comps);
      
      // Load into canvas
      setDashItems(dash.config.components.map((c: any) => ({
        ...c,
        instanceId: `inst-${Date.now()}-${Math.random()}`
      })));
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
  const updateGeneratedCode = (type: string, mapping: any) => {
    if (!activeTabId) return;
    const title = activeTab?.title || "Data Chart";
    const { xAxis, yAxis, values, rows, cols } = mapping;
    
    // Helper to sanitize variable names (fixes "no._de_vin" bug)
    const clean = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Aggregation Logic Injected into the component
    const hasAgg = values.some((v:any) => v.agg !== 'none') || type === 'pie' || type === 'donut';
    
    let processLogic = '';
    if (hasAgg || type === 'pie' || type === 'donut' || type === 'bar' || type === 'line' || type === 'area' || type === 'bar-h' || type === 'bar-stacked') {
      processLogic = `
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    const grouped = data.reduce((acc, row) => {
      const key = row["${xAxis}"] || 'Sin Datos';
      if (!acc[key]) acc[key] = { "${xAxis}": key, _count: 0, _sum: {} };
      acc[key]._count++;
      ${values.map((v:any) => `
      const val_${clean(v.name)} = parseFloat(row["${v.name}"]) || 0;
      acc[key]._sum["${v.name}"] = (acc[key]._sum["${v.name}"] || 0) + val_${clean(v.name)};
      `).join('')}
      return acc;
    }, {});
    
    return Object.values(grouped).map((g) => ({
      ...g,
      ${values.map((v:any) => `
      "${v.name}": ${v.agg === 'avg' ? `g._sum["${v.name}"] / g._count` : v.agg === 'count' ? `g._count` : `g._sum["${v.name}"]`}`).join(',\n      ')}
    }));
  }, [data]);`;
    } else {
      processLogic = `const processedData = data;`;
    }

    let generated = '';
    const renderData = hasAgg || type === 'pie' ? 'processedData' : 'data';

    if (type === 'table') {
      const allCols = [...rows, ...cols, ...values.map((v:any) => v.name)];
      const finalCols = allCols.length > 0 ? allCols : (activeTab?.columns || []).slice(0, 5);
      generated = `function Chart() {\n  return (\n    <div className="w-full h-full overflow-hidden flex flex-col">\n      <h3 className="text-gray-500 text-[10px] font-black uppercase mb-3 px-1 tracking-[0.2em]">${title}</h3>\n      <div className="flex-1 overflow-auto border rounded-3xl bg-white/50 backdrop-blur-sm">\n        <table className="w-full text-left text-[11px]">\n          <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md border-b"><tr>${finalCols.map(c => `<th key="${c}" className="p-3 text-gray-400 font-black uppercase text-[9px] tracking-tighter">${c}</th>`).join('')}</tr></thead>\n          <tbody className="divide-y divide-slate-100">{data.slice(0, 50).map((r, i) => <tr key={i} className="hover:bg-indigo-50/30 transition-colors">${finalCols.map(c => `<td key="${c}" className="p-3 font-medium text-slate-600">{r["${c}"]}</td>`).join('')}</tr>)}</tbody>\n        </table>\n      </div>\n    </div>\n  );\n}`;
    } else if (type === 'bar' || type === 'line' || type === 'area' || type === 'bar-h' || type === 'bar-stacked') {
      const isStacked = type === 'bar-stacked';
      const isH = type === 'bar-h';
      const chart = type === 'line' ? 'LineChart' : (type === 'area' ? 'AreaChart' : 'BarChart');
      const comp = type === 'line' ? 'Line' : (type === 'area' ? 'Area' : 'Bar');
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      generated = `function Chart() {\n  const { ResponsiveContainer, ${chart}, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ${comp}, Area, Defs, LinearGradient, Stop } = window.Recharts;\n  ${processLogic}\n  return (\n    <div style={{ width: '100%', height: 350 }}>\n    <ResponsiveContainer width="100%" height="100%">\n      <${chart} data={${renderData}} layout="${isH ? 'vertical' : 'horizontal'}" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>\n        <defs>\n          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">\n            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>\n            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>\n          </linearGradient>\n        </defs>\n        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />\n        <XAxis dataKey="${xAxis}" type="${isH ? 'number' : 'category'}" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />\n        <YAxis type="${isH ? 'category' : 'number'}" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />\n        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px'}} />\n        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold'}} />\n        ${values.map((v:any, i:number) => `<${comp} key="${v.name}" dataKey="${v.name}" name="${v.agg!=='none' ? v.agg.toUpperCase()+' de '+v.name : v.name}" ${isStacked ? 'stackId="a"' : ''} ${type==='area'?'fill="url(#colorVal)" fillOpacity={1}':''} ${type==='line'?'strokeWidth={3} dot={{r:4, strokeWidth:2, fill:"#fff"}}':''} stroke="${colors[i % colors.length]}" fill="${colors[i % colors.length]}" radius={[6, 6, 0, 0]} />`).join('\n        ')}\n      </${chart}>\n    </ResponsiveContainer>\n    </div>\n  );\n}`;
    } else if (type === 'card') {
      const valField = values[0]?.name || (activeTab?.columns[0]);
      const aggType = values[0]?.agg || 'sum';
      generated = `function Chart() {\n  const value = React.useMemo(() => {\n    if (!data || data.length === 0) return 0;\n    ${aggType === 'sum' ? `return data.reduce((acc, r) => acc + (parseFloat(r["${valField}"]) || 0), 0);` : aggType === 'avg' ? `return data.reduce((acc, r) => acc + (parseFloat(r["${valField}"]) || 0), 0) / data.length;` : `return data.length;`}\n  }, [data]);\n\n  return (\n    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in zoom-in duration-500">\n      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">${title}</h3>\n      <div className="text-6xl font-black text-indigo-600 tabular-nums tracking-tighter drop-shadow-sm"> {typeof value === 'number' ? value.toLocaleString(undefined, {maximumFractionDigits:1}) : value}</div>\n      <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">\n        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Dato Actualizado\n      </div>\n    </div>\n  );\n}`;
    } else if (type === 'pie' || type === 'donut') {
      const isDonut = type === 'donut';
      generated = `function Chart() {\n  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } = window.Recharts;\n  ${processLogic}\n  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#2dd4bf'];\n  return (\n    <div className="w-full h-full flex flex-col items-center justify-center">\n       <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">${title}</h3>\n       <div style={{ width: '100%', height: 350 }}>\n       <ResponsiveContainer width="100%" height="100%">\n        <PieChart>\n          <Pie data={${renderData}} dataKey="${values[0]?.name}" nameKey="${xAxis}" cx="50%" cy="50%" innerRadius={${isDonut ? 65 : 0}} outerRadius={85} paddingAngle={4} stroke="none" label={{fontSize: 9, fill: '#64748b'}}>\n            {processedData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}\n          </Pie>\n          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />\n          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{fontSize: '9px', paddingTop: '20px'}} />\n        </PieChart>\n      </ResponsiveContainer>\n      </div>\n    </div>\n  );\n}`;
    } else if (type === 'matrix') {
      const rowKey = xAxis || (activeTab?.columns[0]);
      const colKey = cols[0] || (activeTab?.columns[1]);
      const valKey = values[0]?.name || (activeTab?.columns[2]);
      const aggType = values[0]?.agg || 'sum';
      
      generated = `function Chart() {\n  const matrixData = React.useMemo(function() {\n    if (!data || data.length === 0) return { rows: [], cols: [], cells: {} };\n    const rs = [...new Set(data.map(function(r){ return r["${rowKey}"]; }))].filter(Boolean).sort();\n    const cs = [...new Set(data.map(function(r){ return r["${colKey}"]; }))].filter(Boolean).sort();\n    const cls = {};\n    data.forEach(function(r) {\n      const k = r["${rowKey}"] + "||" + r["${colKey}"];\n      const val = parseFloat(r["${valKey}"]) || 0;\n      if (!cls[k]) cls[k] = { val: 0, count: 0 };\n      cls[k].val += val;\n      cls[k].count += 1;\n    });\n    return { rows: rs, cols: cs, cells: cls };\n  }, [data]);\n\n  return (\n    <div className="w-full h-full overflow-hidden flex flex-col p-1">\n      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">${title}</h3>\n      <div className="flex-1 overflow-auto border rounded-2xl bg-white/50 backdrop-blur-sm shadow-inner">\n        <table className="w-full text-[10px] border-collapse bg-white/40">\n          <thead className="sticky top-0 z-20">\n            <tr className="bg-slate-100/90 backdrop-blur-md">\n              <th className="p-3 border-b border-r bg-slate-200/50 text-slate-500 font-black uppercase text-[9px] sticky left-0 z-30">${rowKey} / ${colKey}</th>\n              {matrixData.cols.map(function(col){ return <th key={col} className="p-3 border-b border-r text-indigo-600 font-bold min-w-[80px] text-center">{col}</th>; })}\n            </tr>\n          </thead>\n          <tbody className="divide-y divide-slate-100">\n            {matrixData.rows.map(function(row){ return (\n              <tr key={row} className="hover:bg-indigo-50/20 transition-colors">\n                <td className="p-3 border-r font-bold bg-slate-50/80 sticky left-0 z-10 text-slate-700 min-w-[120px] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">{row}</td>\n                {matrixData.cols.map(function(col){ \n                  const cell = matrixData.cells[row + "||" + col];\n                  const displayVal = !cell ? "-" : (${aggType === 'avg' ? 'cell.val / cell.count' : aggType === 'count' ? 'cell.count' : 'cell.val'});\n                  return <td key={col} className="p-3 border-r text-center text-slate-600 tabular-nums font-medium">\n                    {typeof displayVal === 'number' ? displayVal.toLocaleString(undefined, {maximumFractionDigits:1}) : displayVal}\n                  </td>; \n                })}\n              </tr>\n            ); })}\n          </tbody>\n        </table>\n      </div>\n    </div>\n  );\n}`;
    } else if (type === 'slicer') {
      const filterCol = xAxis || (activeTab?.columns[0]);
      generated = `function Chart() {\n  const options = [...new Set(data.map(function(r){ return r["${filterCol}"]; }))].filter(Boolean).sort();\n  return (\n    <div className="w-full h-full flex flex-col p-2 bg-indigo-50/20 rounded-2xl border border-indigo-100/50">\n      <h3 className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">🔍 ${filterCol}</h3>\n      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-indigo-200">\n        {options.map(function(opt){ return (\n          <label key={opt} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-all group border border-transparent hover:border-indigo-100 hover:shadow-sm">\n            <input type="checkbox" className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />\n            <span className="text-[11px] text-slate-600 group-hover:text-indigo-600 truncate font-semibold">{opt}</span>\n          </label>\n        ); })}\n      </div>\n    </div>\n  );\n}`;
    }

    if (generated) {
      patchTab(activeTabId!, { code: generated });
    }
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
    if (!connForm.name || !connForm.host || !connForm.database) return;
    const c = { ...connForm, id: `conn-${Date.now()}` };
    const updated = [...connections, c];
    setConnections(updated);
    localStorage.setItem("atr_connections", JSON.stringify(updated));
    setConnForm({ name: "", host: "localhost", database: "", username: "sa", password: "" });
    setConnTestMsg(null);
    setShowAddConn(false);
  };

  const deleteConn = (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    setConnections(updated);
    localStorage.setItem("atr_connections", JSON.stringify(updated));
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

  // ─────────────────────────────────────────────────────────────────────
  // Select table → load columns
  // ─────────────────────────────────────────────────────────────────────
  const selectTable = async (conn: Connection, schema: string, table: string) => {
    setSelectedTable({ conn, schema, table });
    setLoadingCols(true); setSelectedColumns([]);
    try {
      const d = await apiFetch("/api/columns", { host: conn.host, database: conn.database, username: conn.username, password: conn.password, schema, table });
      if (d.success) setSelectedColumns(d.columns);
    } catch { /**/ }
    setLoadingCols(false);
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
  const saveComponent = (tab: DataTab) => {
    const name = prompt("Nombre del componente:", tab.title);
    if (!name) return;
    const comp = { id: `comp-${Date.now()}`, name, code: tab.code, rows: tab.rows, columns: tab.columns };
    const updated = [...savedComponents, comp];
    setSavedComponents(updated);
    localStorage.setItem("atr_saved_components", JSON.stringify(updated));
  };

  const addToDashboard = (comp: any) => {
    const updated = [...dashItems, { ...comp, instanceId: `inst-${Date.now()}` }];
    setDashItems(updated);
    localStorage.setItem("atr_dashboard_items", JSON.stringify(updated));
  };

  const removeFromDashboard = (iid: string) => {
    const updated = dashItems.filter((d: any) => d.instanceId !== iid);
    setDashItems(updated);
    localStorage.setItem("atr_dashboard_items", JSON.stringify(updated));
  };

  const deleteSavedComponent = (id: string) => {
    const updated = savedComponents.filter((c: any) => c.id !== id);
    setSavedComponents(updated);
    localStorage.setItem("atr_saved_components", JSON.stringify(updated));
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
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${theme.muted} hidden sm:block`}>{user?.firstName} {user?.lastName}</span>
          <button
            onClick={() => {
              if (dashItems.length > 0 && !window.confirm("¿Deseas limpiar el lienzo actual para crear uno nuevo?")) return;
              setDashItems([]);
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

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Explorer ──────────────────────────────────────────── */}
        <aside className={`w-60 ${theme.surface} ${theme.border} border-r flex flex-col overflow-hidden shrink-0`}>
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
                        const isSel = selectedTable?.table === tbl.TABLE_NAME && selectedTable?.schema === tbl.TABLE_SCHEMA && selectedTable?.conn.id === conn.id;
                        return (
                          <button
                            key={tbl.TABLE_NAME}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-left transition group ${
                              isSel ? `${dark ? 'bg-indigo-500/20' : 'bg-indigo-50'} text-indigo-400` : `${theme.hover} ${theme.text} opacity-80 hover:opacity-100`
                            }`}
                            onClick={() => selectTable(conn, tbl.TABLE_SCHEMA, tbl.TABLE_NAME)}
                            onDoubleClick={() => openTab(conn, tbl.TABLE_SCHEMA, tbl.TABLE_NAME)}
                            title="Click: columnas | Doble clic: abrir datos"
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

              <div className="flex-1 flex overflow-hidden">
                {/* Data Grid */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className={`h-7 ${theme.surface} ${theme.border} border-b flex items-center px-3 gap-3 shrink-0`}>
                    <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider`}>Resultados</span>
                    {activeTab.queryRan && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {activeTab.rows.length} filas · {activeTab.columns.length} cols</span>}
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
                <div className={`w-[44%] flex flex-col ${theme.bg} ${theme.border} border-l overflow-hidden shrink-0 relative`}>
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

                      <div className="flex flex-col gap-3">
                        {/* Slots Row 1 */}
                        <div className="flex flex-wrap gap-4">
                          {/* Slot X / Filas */}
                          {(activeVisualType!=='card') && (
                            <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                {activeVisualType==='table' ? 'Filas (Agrupación)' : 'Categoría (Eje X)'}
                              </label>
                              <div 
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                  e.preventDefault();
                                  const col = e.dataTransfer.getData("colName");
                                  const next = { ...visualMapping, xAxis: col, rows: [...new Set([...visualMapping.rows, col])] };
                                  setVisualMapping(next);
                                  updateGeneratedCode(activeVisualType!, next);
                                }}
                                className={`h-11 border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
                                  visualMapping.xAxis ? 'bg-indigo-600/10 border-indigo-500/50 shadow-inner' : 'border-slate-700/30 hover:border-indigo-400/30'
                                }`}
                              >
                                {visualMapping.xAxis ? (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 rounded-lg text-white text-[9px] font-black animate-in zoom-in duration-200 shadow-lg shadow-indigo-600/30">
                                    {visualMapping.xAxis} <button className="hover:text-red-300 transition" onClick={() => {
                                      const next = {...visualMapping, xAxis: '', rows: []};
                                      setVisualMapping(next);
                                      updateGeneratedCode(activeVisualType!, next);
                                    }}>×</button>
                                  </div>
                                ) : <span className="text-[9px] opacity-20 font-bold uppercase tracking-tighter">Soltar Campo</span>}
                              </div>
                            </div>
                          )}

                          {/* Slot Y / Columnas / Valores Card */}
                          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">
                              {activeVisualType==='table' ? 'Columnas / Medidas' : (activeVisualType==='card' ? 'Campo de Valor' : 'Valor Principal (Eje Y)')}
                            </label>
                            <div 
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                const col = e.dataTransfer.getData("colName");
                                const next = { ...visualMapping, yAxis: col, values: [...visualMapping.values, { name: col, agg: 'sum' as const }] };
                                setVisualMapping(next);
                                updateGeneratedCode(activeVisualType!, next);
                              }}
                              className={`min-h-[44px] border-2 border-dashed rounded-xl flex flex-wrap items-center gap-2 p-2 transition-all ${
                                visualMapping.values.length > 0 ? 'bg-emerald-600/5 border-emerald-500/30 shadow-inner' : 'border-slate-700/30 hover:border-emerald-400/30'
                              }`}
                            >
                              {visualMapping.values.length === 0 && <span className="text-[9px] opacity-20 font-bold uppercase tracking-tighter mx-auto">Configura Medidas</span>}
                              {visualMapping.values.map((v, idx) => (
                                <div key={v.name+idx} className="group relative flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-[9px] font-bold animate-in zoom-in duration-200">
                                  <div className="flex flex-col items-start leading-none gap-0.5">
                                    <span className="text-[7px] text-emerald-400 uppercase font-black">{v.agg}</span>
                                    <span>{v.name}</span>
                                  </div>
                                  
                                  {/* Aggregation Switcher Bubble */}
                                  <div className="flex gap-1 ml-1 scale-90 origin-left">
                                    {['sum', 'avg', 'count'].map(a => (
                                      <button 
                                        key={a}
                                        onClick={() => {
                                          const nextValues = [...visualMapping.values];
                                          nextValues[idx] = { ...nextValues[idx], agg: a as any };
                                          const next = { ...visualMapping, values: nextValues };
                                          setVisualMapping(next);
                                          updateGeneratedCode(activeVisualType!, next);
                                        }}
                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black uppercase transition-all ${
                                          v.agg === a ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {a[0]}
                                      </button>
                                    ))}
                                  </div>

                                  <button className="ml-1 opacity-40 hover:opacity-100 hover:text-red-400" onClick={() => {
                                    const next = {...visualMapping, values: visualMapping.values.filter((_,i)=>i!==idx)};
                                    setVisualMapping(next);
                                    updateGeneratedCode(activeVisualType!, next);
                                  }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Additional Series (Charts only) */}
                        {(activeVisualType==='bar' || activeVisualType==='line' || activeVisualType==='area') && visualMapping.values.length > 0 && (
                          <p className="text-[8px] text-indigo-400 font-bold leading-tight opacity-60 px-1">
                             💡 Arrastra más campos a "Valor Principal" para comparar múltiples series de datos.
                          </p>
                        )}
                      </div>

                    </div>
                  )}
                  {/* Editor */}
                  <div className={`flex-1 flex flex-col overflow-hidden ${theme.border} border-b`}>
                    <div className={`h-7 ${theme.surface} ${theme.border} border-b flex items-center justify-between px-3 shrink-0`}>
                      <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider flex items-center gap-1`}>
                        <Code2 className="w-3 h-3" /> React / Recharts JSX
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={runCode}
                          className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1 transition">
                          <Play className="w-2.5 h-2.5" /> Renderizar
                        </button>
                        <button onClick={() => saveComponent(activeTab)}
                          className={`text-[10px] ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} px-2 py-0.5 rounded font-bold flex items-center gap-1 transition`}>
                          <Save className="w-2.5 h-2.5" /> Guardar
                        </button>
                      </div>
                    </div>
                    <textarea
                      className={`flex-1 ${theme.code} text-emerald-400 font-mono text-[11px] p-3 resize-none focus:outline-none leading-relaxed`}
                      value={activeTab.code}
                      onChange={e => patchTab(activeTabId!, { code: e.target.value })}
                      spellCheck={false}
                    />
                  </div>

                  {/* Preview */}
                  <div className={`h-[42%] flex flex-col shrink-0 overflow-hidden`}>
                    <div className={`h-7 ${theme.surface} ${theme.border} border-b flex items-center px-3 shrink-0`}>
                      <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider flex items-center gap-1`}>
                        <BarChart3 className="w-3 h-3" /> Preview
                      </span>
                    </div>
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
          )}
        </div>

                {/* Column Inspector */}
                <aside className={`w-56 ${theme.surface} ${theme.border} border-l flex flex-col overflow-hidden shrink-0`}>
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
                              const fresh = { xAxis: '', yAxis: '', rows: [], cols: [], values: [], legend: '' };
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

                  <div className={`px-3 py-2 ${theme.border} border-b shrink-0 flex items-center justify-between`}>
                    <span className={`text-[10px] font-bold ${theme.muted} uppercase tracking-wider truncate flex-1`}>
                      {selectedTable ? `${selectedTable.schema}.${selectedTable.table}` : "Columnas"}
                    </span>
                    {selectedTable && (
                      <button onClick={() => openTab(selectedTable.conn, selectedTable.schema, selectedTable.table)}
                        className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded transition ml-1 shrink-0">↗</button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {!selectedTable && viewMode === 'main' && (
                      <div className="p-4 text-center">
                        <Columns3 className={`w-8 h-8 mx-auto mb-2 opacity-20 ${theme.muted}`} />
                        <p className={`text-[11px] ${theme.muted} italic`}>Selecciona una tabla</p>
                      </div>
                    )}
                    {loadingCols && <div className="flex justify-center pt-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>}
                    {selectedColumns.map((col, i) => (
                      <div 
                        key={i} 
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData("colName", col.COLUMN_NAME);
                          setIsDragging(true);
                        }}
                        onDragEnd={() => setIsDragging(false)}
                        onClick={() => {
                          if (activeTabId) {
                            const current = activeTab?.code || "";
                            patchTab(activeTabId, { code: current + ` "${col.COLUMN_NAME}"` });
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs ${theme.hover} transition cursor-grab border-b ${theme.border} group active:cursor-grabbing hover:bg-indigo-600/5`}
                      >
                        <Columns3 className={`w-3 h-3 shrink-0 ${theme.muted} opacity-50 group-hover:text-indigo-400 group-hover:opacity-100`} />
                        <div className="flex-1 min-w-0">
                          <div className={`truncate font-medium text-xs ${theme.text} group-hover:text-indigo-400 transition-colors`}>{col.COLUMN_NAME}</div>
                          <div className={`text-[10px] ${typeColor(col.DATA_TYPE)}`}>{col.DATA_TYPE}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-400 translate-x-1 group-hover:translate-x-0 transition-all">
                           <LayoutDashboard className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
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
