import React, { useState } from 'react';
import { Database, Plus, ChevronDown, Table2, Search, X, Loader2 } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore } from '../../hooks/useDataStore';

export default function DevSidebar() {
  const { dark, dataSources, setTrackedTables, setTabs, setActiveTabId, tabs } = useDev();
  const { saveDevSource, deleteDevSource } = useDataStore() as any;
  
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState({ name: "", host: "localhost", database: "", username: "sa", password: "" });
  const [connTesting, setConnTesting] = useState(false);
  const [connTestMsg, setConnTestMsg] = useState<{ok: boolean, msg: string} | null>(null);
  const [expandedConn, setExpandedConn] = useState<string | null>(null);
  const [tablesMap, setTablesMap] = useState<Record<string, any[]>>({});
  const [loadingTables, setLoadingTables] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");

  const theme = {
    surface: dark ? "bg-[#161b22]" : "bg-white",
    border: dark ? "border-slate-800" : "border-slate-200",
    text: dark ? "text-slate-200" : "text-slate-900",
    muted: dark ? "text-slate-400" : "text-slate-500",
    input: dark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    hover: dark ? "hover:bg-slate-800/60" : "hover:bg-slate-100",
  };

  const API = "http://localhost:3001";

  const toggleConn = async (conn: any) => {
    if (expandedConn === conn.id) {
      setExpandedConn(null); return;
    }
    setExpandedConn(conn.id);
    if (tablesMap[conn.id]) return;

    setLoadingTables(conn.id);
    try {
      const token = localStorage.getItem("atr_token");
      const res = await fetch(`${API}/api/dev/tables?host=${conn.host}&db=${conn.database}&user=${conn.username}&pass=${conn.password}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.tables) setTablesMap(prev => ({ ...prev, [conn.id]: data.tables }));
    } catch (e) { console.error(e); } finally { setLoadingTables(null); }
  };

  const toggleTrackedTable = async (conn: any, schema: string, table: string) => {
    setTrackedTables((prev: any[]) => {
      const exists = prev.find(t => t.table === table && t.conn.id === conn.id);
      if (exists) return prev.filter(t => !(t.table === table && t.conn.id === conn.id));
      
      const newT = { conn, schema, table, columns: [], isExpanded: true };
      // Fetch columns in background
      (async () => {
        try {
          const token = localStorage.getItem("atr_token");
          const res = await fetch(`${API}/api/dev/columns?host=${conn.host}&db=${conn.database}&user=${conn.username}&pass=${conn.password}&table=${table}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.columns) {
            setTrackedTables((current: any[]) => current.map(item => 
              (item.table === table && item.conn.id === conn.id) ? { ...item, columns: data.columns } : item
            ));
          }
        } catch (e) { console.error(e); }
      })();
      return [...prev, newT];
    });
  };

  const openTab = (conn: any, schema: string, table: string) => {
    const id = `tab-${Date.now()}`;
    const newTab = {
      id,
      title: table,
      connectionId: conn.id,
      query: `SELECT TOP 100 * FROM ${schema}.${table}`,
      code: "", // Initial empty code
      rows: [],
      columns: [],
      loading: false,
      error: "",
      queryRan: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(id);
  };

  return (
    <aside className={`w-64 shrink-0 h-full border-r ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
      <div className="p-4 flex items-center justify-between border-b ${theme.border}">
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Conexiones</span>
        <button onClick={() => setShowAddConn(true)} className="p-1 hover:bg-indigo-600/10 text-indigo-500 rounded-lg transition">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {dataSources.length === 0 && (
          <div className="p-8 text-center">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-10" />
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-30">No hay fuentes conectadas</p>
          </div>
        )}
        
        {dataSources.map((conn: any) => (
          <div key={conn.id} className="border-b ${theme.border}">
            <div 
              onClick={() => toggleConn(conn)}
              className={`px-4 py-3 flex items-center justify-between cursor-pointer ${theme.hover} transition-colors ${expandedConn === conn.id ? 'bg-indigo-600/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Database className={`w-4 h-4 ${expandedConn === conn.id ? 'text-indigo-500' : theme.muted}`} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold truncate max-w-[120px]">{conn.name}</span>
                  <span className={`text-[9px] ${theme.muted} uppercase tracking-tighter`}>{conn.database}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {loadingTables === conn.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                <button onClick={(e) => { e.stopPropagation(); deleteDevSource(conn.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 transition">
                   <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {expandedConn === conn.id && (
              <div className="bg-black/5 dark:bg-black/20 py-2">
                <div className="px-3 mb-2">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1.5 opacity-30" />
                    <input 
                      className={`w-full bg-transparent border-none text-[10px] pl-7 pr-2 py-1 outline-none ${theme.text}`}
                      placeholder="Filtrar tablas..."
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto px-1">
                  {(tablesMap[conn.id] || [])
                    .filter(t => t.TABLE_NAME.toLowerCase().includes(tableSearch.toLowerCase()))
                    .map((t, idx) => (
                    <div 
                      key={idx}
                      onClick={() => toggleTrackedTable(conn, t.TABLE_SCHEMA, t.TABLE_NAME)}
                      className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-600/10 transition-colors mb-0.5`}
                    >
                      <div className="flex items-center gap-3">
                        <Table2 className="w-3 h-3 text-slate-400 group-hover:text-indigo-400" />
                        <span className="text-[11px] font-medium truncate max-w-[140px] text-slate-500 group-hover:text-indigo-500">{t.TABLE_NAME}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); openTab(conn, t.TABLE_SCHEMA, t.TABLE_NAME); }} className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-500 px-1 hover:underline">↗</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
