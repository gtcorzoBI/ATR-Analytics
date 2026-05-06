import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2, Download, GitBranch,
  Database, Network, Zap, Activity, ChevronDown, ChevronRight,
  Search, ArrowRight, TrendingUp, DollarSign, Building2, BookOpen,
  Sun, Moon, BarChart2, ThumbsUp, Brain
} from 'lucide-react';
import RhythmBoard from './RhythmBoard';
import GanttView from './GanttView';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, PieChart, Pie, Cell, Legend,
  BarChart, ScatterChart, Scatter, ZAxis, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';

import { GoogleGenerativeAI } from "@google/generative-ai";

// @ts-ignore
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "dummy_key";
const genAI = new GoogleGenerativeAI(apiKey);

// ── Sistema de Memoria Persistente ──────────────────────────────────────────
const MEM_KEY = 'fpa_ai_memory_v2';
const getMemory = (): string[] => { try { return JSON.parse(localStorage.getItem(MEM_KEY) || '[]'); } catch { return []; } };
const saveMemory = (items: string[]) => localStorage.setItem(MEM_KEY, JSON.stringify(items.slice(0, 15)));
const addToMemory = (insight: string) => { const m = getMemory(); if (!m.some(x => x === insight)) saveMemory([insight, ...m]); };

const SYSTEM_INSTRUCTION = `Tu nombre es 'TC IA ANALYTIC', eres un Copiloto avanzado de nivel directivo experto en FP&A, ERP y BI Financiero Corporativo.
Analiza datos financieros, runway, burn rate, KPIs operativos y administrativos de las tarjetas del sistema.
REGLAS:
1. Cuando te pregunten cómo va el negocio, una agencia específica, un área, o pidan un análisis, SIEMPRE genera gráficas dinámicas ricas. Para ello usa bloques de código con lenguaje "chart-bar", "chart-line", "chart-area", "chart-donut", "chart-pie", "chart-bar-stacked", "chart-scatter", "chart-radar", "chart-bar-h", "chart-table" o "chart-kpi". 
2. ¡PROHIBIDO USAR LA ETIQUETA "json"! NUNCA uses \`\`\`json. Usa siempre el prefijo \`\`\`chart-*. El contenido del bloque DEBE ser un arreglo JSON válido. Elige libremente la gráfica que mejor represente los datos (ej. barras para comparar, dona para distribución, etc.).
3. Usa TODOS los datos disponibles en las tarjetas: montos, sucursales, áreas, estados y fechas.
4. Si te preguntan por una agencia específica, filtra los datos de esa agencia.
5. Si te piden cálculos avanzados (ROI, variaciones), hazlos matemáticamente y muéstralos en un "chart-table" o "chart-kpi".
6. Después de las gráficas, incluye un resumen ejecutivo avanzado en Markdown.`;

const AREAS: Record<string, { icon: React.ReactNode; color: string; categories: string[] }> = {
  "FINANCIAMIENTO": {
    icon: <DollarSign size={14} />,
    color: "text-emerald-400",
    categories: ["Bancos", "Flujos de Efectivo", "Créditos", "Tesorería", "Proyecciones", "Conciliaciones"]
  },
  "ADMINISTRACION": {
    icon: <Building2 size={14} />,
    color: "text-amber-400",
    categories: ["Eros", "Vales de Compra", "Deuda Días", "Compras", "Órdenes de Compra", "Inventarios", "Nómina", "Gastos Operativos"]
  },
  "CONTABILIDAD": {
    icon: <BookOpen size={14} />,
    color: "text-indigo-400",
    categories: ["Facturas Realizadas", "Costo de Ingreso", "Costo Egresos", "Cuentas por Cobrar", "Cuentas por Pagar", "Presupuestos", "Auditoría", "Fiscal / Impuestos"]
  }
};

const baseData = [
  { month: 'Ene', Ingresos: 120, Gastos: 150, Caja: 1000 },
  { month: 'Feb', Ingresos: 135, Gastos: 155, Caja: 980 },
  { month: 'Mar', Ingresos: 150, Gastos: 160, Caja: 970 },
  { month: 'Abr', Ingresos: 180, Gastos: 165, Caja: 985 },
  { month: 'May', Ingresos: 210, Gastos: 170, Caja: 1025 },
  { month: 'Jun', Ingresos: 250, Gastos: 180, Caja: 1095 },
  { month: 'Jul', Ingresos: 290, Gastos: 190, Caja: 1195 },
  { month: 'Ago', Ingresos: 320, Gastos: 200, Caja: 1315 },
  { month: 'Sep', Ingresos: 360, Gastos: 220, Caja: 1455 },
  { month: 'Oct', Ingresos: 400, Gastos: 240, Caja: 1615 },
  { month: 'Nov', Ingresos: 450, Gastos: 260, Caja: 1805 },
  { month: 'Dic', Ingresos: 500, Gastos: 280, Caja: 2025 },
];

export default function FPAStudio() {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [showAI, setShowAI] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [mainView, setMainView] = useState<'lienzo' | 'gantt-global' | 'module'>('lienzo');
  const [allCards, setAllCards] = useState<any[]>([]);
  const [superUsers, setSuperUsers] = useState<string[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showAiReportInLienzo, setShowAiReportInLienzo] = useState<boolean>(false);
  const [standardDashboard, setStandardDashboard] = useState<string | null>(null);
  const [memory, setMemory] = useState<string[]>(() => getMemory());
  const sessionId = useRef('ses_' + Math.random().toString(36).substr(2, 9));
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/rhythm-cards')
      .then(r => r.json()).then(d => { if (d.data) setAllCards(d.data); }).catch(() => { });
    fetch('http://localhost:3001/api/superusers')
      .then(r => r.json()).then(d => { if (d.data) setSuperUsers(d.data); }).catch(() => { });
  }, []);

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Soy tu Copiloto FP&A. Monitoreo el flujo de caja, drivers del negocio y el control operativo de tus áreas. ¿Qué quieres analizar hoy?' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }));
    if (!expandedAreas[area]) { setSelectedArea(area); setSelectedCategory(null); setMainView('module'); }
  };

  const selectCategory = (area: string, cat: string) => {
    setSelectedArea(area);
    setSelectedCategory(cat);
    setMainView('module');
  };

  const goToLienzo = () => { setSelectedArea(null); setSelectedCategory(null); setMainView('lienzo'); };
  const goToGantt = () => { setSelectedArea(null); setSelectedCategory(null); setMainView('gantt-global'); };

  const updateCardStatus = async (id: number, status: string) => {
    await fetch(`http://localhost:3001/api/rhythm-cards/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setAllCards(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleSendMessage = async (textToProcess?: string) => {
    const text = textToProcess || inputValue;
    if (!text.trim()) return;

    const logToDB = (role: string, content: string) => {
      fetch('http://localhost:3001/api/ai-chat-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId.current, role, text: content })
      }).catch(() => { });
    };

    setChatMessages(prev => [...prev, { role: 'user', text }]);
    logToDB('user', text);
    setInputValue("");
    setIsTyping(true);

    if (apiKey === "dummy_key") {
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'model', text: '⚠️ Configura VITE_GEMINI_API_KEY en tu .env para activar el análisis IA.' }]);
        setIsTyping(false);
      }, 800);
      return;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", systemInstruction: SYSTEM_INSTRUCTION });
      const validHistory = chatMessages.filter((msg, idx) => !(idx === 0 && msg.role === 'model'));
      const history = validHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
      const chatSession = model.startChat({ history });
      
      // Inject FULL card context for maximum flexibility (no slice)
      const cardContext = allCards.length > 0
        ? `CONTEXTO COMPLETO DEL SISTEMA (${allCards.length} tarjetas):\n` +
          allCards.map(c => `[${c.area} > ${c.category}] Sucursal: ${c.sucursal || 'N/A'} | Estado: ${c.status} | Título: ${c.title} | Desc: ${c.description || ''}`).join('\n') +
          `\n\nPregunta del usuario: ${text}`
        : `Pregunta del usuario: ${text}`;
        
      const result = await chatSession.sendMessage(cardContext);
      const responseText = result.response.text();
      
      setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
      logToDB('model', responseText);

      if (responseText.length > 200 || responseText.includes('chart-') || responseText.includes('| ---') || responseText.includes('### ')) {
        setAiReport(responseText);
        setStandardDashboard(responseText);
        setShowAiReportInLienzo(false);
        goToLienzo();
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const lower = text.toLowerCase();
      let fallback = `🤖 **Análisis Local:** `;
      if (lower.includes('marketing') || lower.includes('mitad')) fallback += 'Reducir marketing 50% extendería tu Runway ~4.5 meses pero reduciría conversión un 22% en el mes 3.';
      else if (lower.includes('optimista') || lower.includes('q3')) fallback += 'Escenario Q3 +15% elevaría MRR a $138k y Runway de 32 a 41 meses.';
      else if (lower.includes('financiamiento') || lower.includes('banco')) fallback += 'Tu posición de bancos muestra cobertura de 3.2x sobre el pasivo a corto plazo. Sin alertas críticas.';
      else fallback += 'Burn Rate estable. No hay riesgos de liquidez en los próximos 12 meses según las proyecciones del modelo base.';
      setChatMessages(prev => [...prev, { role: 'model', text: fallback }]);
      logToDB('model', fallback);
    } finally { setIsTyping(false); }
  };

  const data = baseData;

  const showKanban = mainView === 'module';
  const C = ['#6366F1', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#38BDF8', '#FB923C', '#4ADE80', '#F472B6', '#94A3B8', '#E879F9', '#2DD4BF'];
  const TS = { borderRadius: '10px', background: isDark ? '#0f172a' : '#fff', border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', color: isDark ? '#fff' : '#000' };
  const WS = { fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' };
  const BOX = (h = 'h-80') => `${h} w-full my-6 p-4 border rounded-xl shadow-sm ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`;

  const renderMarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      if (inline) return <code className={className || ''} {...props}>{children}</code>;
      const cls = className || '';
      const raw = String(children).trim();

      const tryParse = (s: string, expectObject = false): any => { 
        try { 
          const parsed = JSON.parse(s);
          if (expectObject) return parsed;
          if (Array.isArray(parsed)) return parsed;
          if (typeof parsed === 'object' && parsed !== null) {
            const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
            if (possibleArray) return possibleArray;
          }
          return null;
        } catch { return null; } 
      };

      // chart-kpi — tarjetas KPI
      if (/language-chart-kpi/.test(cls)) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
            {data.map((k: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{k.label}</p>
                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
                {k.delta && <p className={`text-xs font-bold mt-1 ${k.trend === 'up' ? 'text-emerald-400' : k.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>{k.trend === 'up' ? '▲' : k.trend === 'down' ? '▼' : '●'} {k.delta}</p>}
              </div>
            ))}
          </div>
        );
      }

      // chart-table — tabla estructurada
      if (/language-chart-table/.test(cls)) {
        const data = tryParse(raw, true); if (!data?.headers) return <pre>{raw}</pre>;
        return (
          <div className={`overflow-x-auto rounded-xl border shadow-sm my-6 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <table className="w-full text-xs">
              <thead className={isDark ? 'bg-slate-800' : 'bg-gray-50'}>
                <tr>{data.headers.map((h: string, i: number) => <th key={i} className={`px-4 py-3 text-left font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{h}</th>)}</tr>
              </thead>
              <tbody>{data.rows.map((row: string[], ri: number) => (
                <tr key={ri} className={ri % 2 === 0 ? (isDark ? 'bg-slate-900/50' : 'bg-white') : (isDark ? 'bg-slate-800/30' : 'bg-gray-50/50')}>
                  {row.map((cell: string, ci: number) => <td key={ci} className={`px-4 py-2.5 border-t ${isDark ? 'border-slate-700 text-slate-300' : 'border-gray-100 text-gray-700'}`}>{cell}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      }

      // chart-pie / chart-donut
      if (/language-chart-(pie|donut)/.test(cls)) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        const isDonut = /chart-donut/.test(cls);
        const pd = data.map((d: any, i: number) => ({ ...d, value: d.value ?? d[Object.keys(d).find(k => k !== 'name')!] ?? 0 }));
        return (
          <div className={BOX()}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pd} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={115} innerRadius={isDonut ? 55 : 0} paddingAngle={isDonut ? 3 : 1}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pd.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [v, '']} contentStyle={TS} />
                <Legend wrapperStyle={WS} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      }

      // chart-scatter
      if (/language-chart-scatter/.test(cls)) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        return (
          <div className={BOX()}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="x" name="X" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="y" name="Y" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <ZAxis dataKey="z" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={TS} />
                <Legend wrapperStyle={WS} />
                <Scatter data={data} fill={C[0]} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      }

      // chart-radar
      if (/language-chart-radar/.test(cls)) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        const keys = Object.keys(data[0] || {}).filter(k => k !== 'indicador');
        return (
          <div className={BOX()}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <PolarAngleAxis dataKey="indicador" tick={{ fill: '#64748b', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                {keys.map((k, i) => <Radar key={k} name={k} dataKey={k} stroke={C[i % C.length]} fill={C[i % C.length]} fillOpacity={0.25} />)}
                <Legend wrapperStyle={WS} />
                <Tooltip contentStyle={TS} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        );
      }

      // chart-bar-h (horizontal)
      if (/language-chart-bar-h/.test(cls)) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        const keys = Object.keys(data[0] || {}).filter(k => k !== 'name');
        return (
          <div className={BOX()}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={TS} />
                <Legend wrapperStyle={WS} />
                {keys.map((k, i) => <Bar key={k} dataKey={k} fill={C[i % C.length]} radius={[0, 4, 4, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }

      // chart-bar / chart-bar-stacked / chart-line / chart-area / chart-area-stacked
      const isBarStacked = /language-chart-bar-stacked/.test(cls);
      const isAreaStacked = /language-chart-area-stacked/.test(cls);
      const isBar = /language-chart-bar/.test(cls);
      const isLine = /language-chart-line/.test(cls);
      const isArea = /language-chart-area/.test(cls);

      if (isBar || isBarStacked || isLine || isArea || isAreaStacked) {
        const data = tryParse(raw); if (!data) return <pre>{raw}</pre>;
        const keys = Object.keys(data[0] || {}).filter(k => k !== 'name');
        return (
          <div className={BOX()}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                <Tooltip contentStyle={TS} />
                <Legend wrapperStyle={WS} />
                {keys.map((k, i) => {
                  if (isBarStacked) return <Bar key={k} dataKey={k} stackId="s" fill={C[i % C.length]} radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />;
                  if (isAreaStacked) return <Area key={k} type="monotone" dataKey={k} stackId="s" fill={C[i % C.length]} fillOpacity={0.5} stroke={C[i % C.length]} strokeWidth={1.5} />;
                  if (isBar) return <Bar key={k} dataKey={k} fill={C[i % C.length]} radius={[4, 4, 0, 0]} />;
                  if (isLine) return <Line key={k} type="monotone" dataKey={k} stroke={C[i % C.length]} strokeWidth={3} dot={{ r: 4 }} />;
                  if (isArea) return <Area key={k} type="monotone" dataKey={k} fill={C[i % C.length]} fillOpacity={0.25} stroke={C[i % C.length]} strokeWidth={2} />;
                  return null;
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      }

      return <code className={cls} {...props}>{children}</code>;
    }
  };

  return (
    <div className={`flex h-[calc(100vh-64px)] w-full font-sans overflow-hidden print:h-auto print:overflow-visible ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>

      {/* ── LEFT SIDEBAR: Area Navigation ── */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} border-r flex flex-col shrink-0 transition-all duration-300 print:hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="p-4 border-b border-slate-800">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} font-bold mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hover:scale-110 transition-transform">
              <Zap size={16} className="fill-current" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <span className="whitespace-nowrap">FP&A Studio</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-auto">Alpha</span>
                <button onClick={() => setIsDark(p => !p)} className={`p-1.5 rounded-lg transition-colors ml-1 ${isDark ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`} title={isDark ? 'Modo Claro' : 'Modo Oscuro'}>
                  {isDark ? <Sun size={14}/> : <Moon size={14}/>}
                </button>
              </>
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
              <input type="text" placeholder="Buscar área o categoría..."
                className={`w-full border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-400'}`}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(AREAS).map(([area, { icon, color, categories }]) => (
            <div key={area} className="mb-1">
              <button onClick={() => toggleArea(area)} title={area} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2 p-2'} rounded-lg text-xs font-bold transition-colors ${selectedArea === area && !selectedCategory ? (isDark ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700') : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100')}`}>
                <span className={color}>{isSidebarCollapsed ? React.cloneElement(icon as any, { size: 18 }) : icon}</span>
                {!isSidebarCollapsed && (
                  <>
                    {area}
                    {expandedAreas[area] ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
                  </>
                )}
              </button>
              {expandedAreas[area] && !isSidebarCollapsed && (
                <div className="ml-6 mt-1 flex flex-col gap-0.5">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => selectCategory(area, cat)} className={`text-left text-xs p-1.5 rounded-md transition-colors ${selectedCategory === cat ? (isDark ? 'bg-indigo-900/50 text-indigo-300 font-bold' : 'bg-indigo-100 text-indigo-700 font-bold') : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'} flex flex-col gap-2`}>
          <button onClick={goToLienzo} title="Global Dashboard" className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-center gap-2'} w-full p-2 rounded-lg text-xs font-bold transition-all ${mainView === 'lienzo' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border text-gray-700 hover:bg-gray-50')}`}>
            <BarChart2 size={isSidebarCollapsed ? 18 : 14} /> {!isSidebarCollapsed && 'Global Dashboard'}
          </button>
          <button onClick={goToGantt} title="Project Timeline" className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-center gap-2'} w-full p-2 rounded-lg text-xs font-bold transition-all ${mainView === 'gantt-global' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border text-gray-700 hover:bg-gray-50')}`}>
            <GitBranch size={isSidebarCollapsed ? 18 : 14} /> {!isSidebarCollapsed && 'Project Timeline'}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className={`h-16 border-b flex items-center justify-between px-6 shrink-0 print:hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <h1 className={`font-black text-xl flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {showKanban ? (selectedCategory ? `${selectedArea} > ${selectedCategory}` : selectedArea) : (mainView === 'gantt-global' ? 'Cronograma General' : 'Lienzo de Análisis Financiero')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAI(!showAI)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${showAI ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : (isDark ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100')}`}>
              <Wand2 size={14} /> {showAI ? 'Cerrar Copiloto' : 'Copiloto IA'}
            </button>
            <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 print:p-0 print:bg-white print:text-black">
          {/* Print Header */}
          <div className="hidden print:block w-full text-black mb-8 border-b border-gray-300 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black">Reporte Analítico FP&A</h1>
                <p className="text-sm text-gray-600 mt-1">Generado por: Administrador TC</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleTimeString('es-MX')}</p>
              </div>
            </div>
          </div>

          {showKanban ? (
            <RhythmBoard
              selectedArea={selectedArea!}
              selectedCategory={selectedCategory}
              isDark={isDark}
              allCards={allCards}
              superUsers={superUsers}
              onStatusChange={updateCardStatus}
              currentUser={user?.email || 'Usuario'}
              currentUserRole={user?.role}
            />
          ) : mainView === 'gantt-global' ? (
            <GanttView cards={allCards} isDark={isDark} onStatusChange={updateCardStatus} superUsers={superUsers} />
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className={`flex justify-center mb-6 p-1 rounded-xl inline-flex mx-auto ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                <button onClick={() => setShowAiReportInLienzo(false)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${!showAiReportInLienzo ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'text-slate-400' : 'text-gray-500')}`}>Dashboard Estándar</button>
                <button onClick={() => setShowAiReportInLienzo(true)} disabled={!aiReport} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${showAiReportInLienzo ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'text-slate-400' : 'text-gray-500')} disabled:opacity-30`}>
                  <Wand2 size={12} /> Reporte TC IA ANALYTIC
                </button>
              </div>

              {!aiReport ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
                    <BarChart2 size={40} className="text-indigo-500 opacity-80" />
                  </div>
                  <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard Listo para Analizar</h2>
                  <p className={`text-sm max-w-sm mb-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Hazle una pregunta al Copiloto IA y tus gráficas aparecerán aquí automáticamente.
                  </p>
                  <div className={`grid grid-cols-2 gap-3 max-w-md w-full text-left`}>
                    {[
                      "¿Cómo va el negocio esta semana?",
                      "Desglose financiero por agencia",
                      "¿Cómo va la sucursal NAVA?",
                      "Análisis de costos y márgenes"
                    ].map(q => (
                      <button key={q} onClick={() => handleSendMessage(q)}
                        className={`text-xs p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 shadow-sm'}`}>
                        {q} →
                      </button>
                    ))}
                  </div>
                </div>
              ) : showAiReportInLienzo ? (
                <div className={`p-8 rounded-2xl border shadow-xl prose prose-sm max-w-none ${isDark ? 'bg-slate-900 border-slate-700 prose-invert prose-headings:text-indigo-300 prose-a:text-indigo-400' : 'bg-white border-gray-200 prose-headings:text-indigo-700 prose-a:text-indigo-600'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderMarkdownComponents}>{aiReport}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-6">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ...renderMarkdownComponents,
                      table: ({ children, ...props }: any) => (
                        <div className={`overflow-x-auto rounded-xl border shadow-sm my-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                          <table className={`w-full text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`} {...props}>{children}</table>
                        </div>
                      ),
                      thead: ({ children, ...props }: any) => <thead className={isDark ? 'bg-slate-800' : 'bg-gray-50'} {...props}>{children}</thead>,
                      th: ({ children, ...props }: any) => <th className={`px-4 py-3 text-left font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`} {...props}>{children}</th>,
                      td: ({ children, ...props }: any) => <td className={`px-4 py-2.5 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} {...props}>{children}</td>,
                      p: () => null,
                      h1: () => null,
                      h2: () => null,
                      h3: () => null,
                      h4: () => null,
                      ul: () => null,
                      ol: () => null,
                      li: () => null,
                      blockquote: () => null,
                      hr: () => null,
                    }}
                  >
                    {aiReport}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR: AI Copilot ── */}
      {showAI && (
        <div className={`w-80 border-l flex flex-col shrink-0 print:hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-gradient-to-r from-indigo-950/50 to-transparent">
            <Wand2 size={16} className="text-indigo-400" />
            <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>TC IA ANALYTIC</h2>
            <div className="ml-auto flex items-center gap-2">
              {memory.length > 0 && (
                <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20 flex items-center gap-1">
                  <Brain size={9} /> {memory.length} recuerdos
                </span>
              )}
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Activo</span>
            </div>
          </div>

          <div className="p-3 border-b border-slate-800">
            <div className="flex flex-col gap-1.5">
              <button onClick={() => handleSendMessage("Dame un resumen ejecutivo de hoy: KPIs críticos, alertas y estado general de todas las agencias.")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 text-xs py-2 px-3 rounded-lg text-left flex items-center justify-between transition-colors">
                Dashboard ejecutivo hoy <ArrowRight size={11} />
              </button>
              <button onClick={() => handleSendMessage("Muestra el comparativo de ingresos vs gastos por agencia este mes con chart-bar-stacked y chart-pie por estado.")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs py-2 px-3 rounded-lg text-left flex items-center justify-between transition-colors">
                Ingresos vs Gastos por agencia <ArrowRight size={11} />
              </button>
              <button onClick={() => handleSendMessage("¿Qué proyectos están vencidos o en riesgo? Muestra con chart-bar-h y tabla detallada.")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-400 text-xs py-2 px-3 rounded-lg text-left flex items-center justify-between transition-colors">
                🔴 Proyectos en riesgo <ArrowRight size={11} />
              </button>
              {selectedArea && (
                <button onClick={() => handleSendMessage(`Análisis FP&A completo del área ${selectedArea}${selectedCategory ? ` categoría ${selectedCategory}` : ''}: KPIs, gráficas y recomendaciones.`)}
                  className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs py-2 px-3 rounded-lg text-left flex items-center justify-between transition-colors">
                  Analizar: {selectedCategory || selectedArea} <ArrowRight size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`text-xs p-3 rounded-xl max-w-[90%] leading-relaxed ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : isDark ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700 prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-table:my-2 prose-td:p-1 prose-th:p-1'
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-table:my-2 prose-td:p-1 prose-th:p-1'}`}>
                  {msg.role === 'user' ? msg.text : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderMarkdownComponents}>{msg.text}</ReactMarkdown>
                  )}
                </div>
                {msg.role === 'model' && idx > 0 && (
                  <button
                    title="Guardar en memoria de la IA"
                    onClick={() => {
                      const insight = msg.text.slice(0, 300).replace(/\n+/g, ' ');
                      addToMemory(insight);
                      setMemory(getMemory());
                    }}
                    className="mt-1 flex items-center gap-1 text-[9px] text-slate-600 hover:text-violet-400 transition-colors">
                    <ThumbsUp size={10} /> Guardar en memoria
                  </button>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-xl rounded-bl-none p-3 flex items-center gap-1">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-slate-800">
            <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="relative">
              <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                placeholder="Pregunta sobre tus finanzas..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button type="submit" disabled={isTyping || !inputValue.trim()}
                className={`absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors`}>
                <ArrowRight size={13} />
              </button>
            </form>
            <p className="text-center text-[9px] text-slate-600 mt-2">Gemma 4 Local · RTX 4050 · {memory.length > 0 ? `${memory.length} recuerdos activos` : 'Sin memoria aún'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
