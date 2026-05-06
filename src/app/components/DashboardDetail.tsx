import React, { useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Download, Share2, RefreshCw, BarChart3 } from "lucide-react";
import LiveWidget from "./LiveWidget";
import InjectedWidget from "./InjectedWidget";

// Generar datos aleatorios para gráfico de barras
const generateBarData = () => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return months.map((month) => ({
    name: month,
    ventas: Math.floor(Math.random() * 5000) + 1000,
    gastos: Math.floor(Math.random() * 3000) + 500,
    utilidad: Math.floor(Math.random() * 2000) + 300,
  }));
};

// Generar datos aleatorios para gráfico de dona
const generatePieData = () => {
  return [
    { name: "Posventa", value: Math.floor(Math.random() * 400) + 100 },
    { name: "Comercial", value: Math.floor(Math.random() * 400) + 100 },
    { name: "Marketing", value: Math.floor(Math.random() * 400) + 100 },
    { name: "Administración", value: Math.floor(Math.random() * 400) + 100 },
    { name: "RH", value: Math.floor(Math.random() * 400) + 100 },
  ];
};

// Generar datos aleatorios para gráfico de línea
const generateLineData = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return days.map((day) => ({
    day: `Día ${day}`,
    rendimiento: Math.floor(Math.random() * 100) + 50,
    objetivo: Math.floor(Math.random() * 100) + 60,
    promedio: Math.floor(Math.random() * 100) + 55,
  }));
};

// Generar datos aleatorios para gráfico de burbujas
const generateScatterData = () => {
  return Array.from({ length: 50 }, () => ({
    x: Math.floor(Math.random() * 100) + 1,
    y: Math.floor(Math.random() * 100) + 1,
    z: Math.floor(Math.random() * 1000) + 100,
  }));
};

// Generar datos aleatorios para tabla
const generateTableData = () => {
  const names = [
    "Lorem ipsum dolor",
    "Consectetur adipiscing",
    "Sed do eiusmod",
    "Tempor incididunt",
    "Ut labore et",
    "Dolore magna aliqua",
    "Ut enim ad",
    "Minim veniam quis",
    "Nostrud exercitation",
    "Ullamco laboris nisi",
  ];

  return names.map((name, index) => ({
    id: index + 1,
    concepto: name,
    categoria: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
    cantidad: Math.floor(Math.random() * 1000) + 10,
    precio: (Math.random() * 1000 + 50).toFixed(2),
    total: (Math.random() * 10000 + 100).toFixed(2),
    status: ["Activo", "Pendiente", "Completado"][Math.floor(Math.random() * 3)],
    fecha: `${Math.floor(Math.random() * 28) + 1}/0${Math.floor(Math.random() * 9) + 1}/2026`,
  }));
};

const COLORS = ["#E85D5D", "#DC2626", "#F87171", "#FCA5A5", "#FEE2E2"];

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface DashboardDetailProps {
  dashboard: any;
  onBack: () => void;
}

export default function DashboardDetail({ dashboard, onBack }: DashboardDetailProps) {
  const { title, category, config } = dashboard;
  
  const barData = generateBarData();
  const pieData = generatePieData();
  const lineData = generateLineData();
  const tableData = generateTableData();

  const isCustom = !!(config && config.components);
  const [accessLoaded, setAccessLoaded] = React.useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      // Capture the canvas using html-to-image (bypasses oklch bug in html2canvas)
      const width = exportRef.current.scrollWidth;
      const height = exportRef.current.scrollHeight;
      
      const imgData = await toPng(exportRef.current, {
        backgroundColor: '#f3f4f6', // Tailwind gray-100
        pixelRatio: 2,
        width: width,
        height: height,
      });
      
      // Calculate dimensions in mm (approx. 1px = 0.264583 mm)
      const pxToMm = 0.264583;
      const imgWidthMm = width * pxToMm; 
      const imgHeightMm = height * pxToMm;
      
      // We want to add a 30mm header at the top
      const finalPdfWidth = Math.max(Math.ceil(imgWidthMm), 210); // Minimum A4 width
      const finalPdfHeight = Math.max(Math.ceil(imgHeightMm + 30), 297); // Minimum A4 height
      
      // Create PDF with custom dimensions to perfectly fit the dashboard
      const pdf = new jsPDF({
        orientation: finalPdfWidth > finalPdfHeight ? 'l' : 'p',
        unit: 'mm',
        format: [finalPdfWidth, finalPdfHeight]
      });

      const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      // Add Header text
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text(title || 'Dashboard', 15, 15);
      
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      
      // Place Date on top right
      const dateText = `Generado el: ${today}`;
      const textWidth = pdf.getStringUnitWidth(dateText) * 10 / pdf.internal.scaleFactor;
      pdf.text(dateText, finalPdfWidth - 15 - textWidth, 15);
      
      // Source/Category below title
      pdf.text(`Origen: ${category}`, 15, 22);

      // Add the captured dashboard image starting below the header (y=30)
      // Center horizontally if the PDF width is larger than the image
      const xOffset = (finalPdfWidth > imgWidthMm) ? (finalPdfWidth - imgWidthMm) / 2 : 0;
      
      pdf.addImage(imgData, 'PNG', xOffset, 30, imgWidthMm, imgHeightMm);
      pdf.save(`ATR_Analytics_${title.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      alert("Hubo un error al generar el PDF: " + (err?.message || "Error desconocido"));
    } finally {
      setIsExporting(false);
    }
  };

  // ── Filter Access Enforcement ─────────────────────────────────────────
  // Fetch this user's filter restrictions and inject into window.__dashboardFilters
  // so all slicer components inside LiveWidget/InjectedWidget respect them.
  useEffect(() => {
    setAccessLoaded(false);
    const token = localStorage.getItem('atr_token');
    const userRaw = localStorage.getItem('active_user');
    
    if (!token || !userRaw || !dashboard.id) {
      setAccessLoaded(true);
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      
      // Note: We no longer skip for admin/dev so they can test/preview user restrictions if assigned.
      console.log(`[DashboardDetail] Fetching access for user ${user.id} on dashboard ${dashboard.id}`);
      
      fetch(`${API}/api/dashboard-access/${encodeURIComponent(dashboard.id)}/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()).then(data => {
        const win = window as any;
        win.__filterAccessRestrictions = {};
        win.__dashboardFilters = {};

        if (data.success && data.filters && Object.keys(data.filters).length > 0) {
          console.log("[DashboardDetail] Security restrictions identified:", data.filters);
          Object.entries(data.filters as Record<string, string[]>).forEach(([field, vals]) => {
            if (!vals.includes('__ALL__') && vals.length > 0) {
              const normalizedField = field.trim();
              win.__filterAccessRestrictions[normalizedField] = vals;
              win.__dashboardFilters[normalizedField] = vals;
            }
          });
          // Small delay to ensure all components are aware of the global state change
          setTimeout(() => {
            window.dispatchEvent(new Event('dashboard-filter'));
          }, 100);
        }
        setAccessLoaded(true);
      }).catch(err => {
        console.error("[DashboardDetail] Failed to fetch access:", err);
        setAccessLoaded(true);
      });
    } catch { 
      setAccessLoaded(true);
    }
  }, [dashboard.id]);

  if (!accessLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Aplicando reglas de seguridad...</p>
      </div>
    );
  }
  
  let user: any = null;
  try {
    user = JSON.parse(localStorage.getItem('active_user') || '{}');
  } catch(e) {}

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{category} - Dashboard Interactivo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              // Trigger a global refresh event
              window.dispatchEvent(new Event('dashboard-filter'));
              // For InjectedWidgets, we might need a more direct way, 
              // but dispatching this event will trigger re-renders.
              console.log("[DashboardDetail] Refreshing data...");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Actualizar</span>
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Enlace del tablero copiado al portapapeles");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Compartir</span>
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${isExporting ? 'bg-gray-400' : 'bg-[#E85D5D] hover:bg-[#DC2626]'}`}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">{isExporting ? 'Exportando...' : 'Exportar'}</span>
          </button>
        </div>
      </div>

      <div ref={exportRef} className="bg-gray-100 rounded-xl border border-gray-200 overflow-auto p-4 shadow-inner" style={{ minHeight: '600px' }}>
      {isCustom ? (
        // ── CUSTOM DASHBOARD RENDER ──
        <div className="relative">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
            <BarChart3 className="w-3.5 h-3.5" /> Diseño Personalizado
          </div>

          
          <div className="relative" style={{ minHeight: '1000px' }}>
            {config.components.map((comp: any, idx: number) => {
              const instanceId = comp.instanceId || `user-comp-${idx}`;
              // Marketplace items need InjectedWidget (executes real SQL via backend)
              const isMarketplace = !!(comp.isMarketplace || (comp.executionJSON && !comp.rows?.length));
              return (
                <div
                  key={instanceId}
                  className="absolute bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                  style={{
                    left: comp.x,
                    top: comp.y,
                    width: comp.w,
                    height: comp.h,
                  }}
                >
                  <div style={{ height: comp.h }}>
                    {isMarketplace ? (
                      <InjectedWidget
                        instanceId={instanceId}
                        widget={{
                          name: comp.name,
                          versionId: comp.versionId || 'local-dev',
                          executionJSON: comp.executionJSON || JSON.stringify({
                            dataSourceId: comp.connectionId,
                            rawQuery: comp.query,
                            code: comp.code
                          }),
                          configJSON: comp.configJSON || JSON.stringify({ code: comp.code })
                        }}
                        dark={false}
                      />
                    ) : (
                      <LiveWidget 
                        instanceId={instanceId}
                        code={comp.code} 
                        rows={comp.rows || []} 
                        columns={comp.columns || []} 
                        query={comp.query}
                        connectionId={comp.connectionId}
                        padding={20}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ── STANDARD MOCK DASHBOARD RENDER ──
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Ingresos</p>
              <p className="text-3xl font-bold text-gray-900">
                ${(Math.random() * 100000 + 50000).toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-2">+12.5% vs mes anterior</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Promedio Diario</p>
              <p className="text-3xl font-bold text-gray-900">
                ${(Math.random() * 5000 + 1000).toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-2">+8.3% vs mes anterior</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Transacciones</p>
              <p className="text-3xl font-bold text-gray-900">{Math.floor(Math.random() * 1000 + 500)}</p>
              <p className="text-sm text-red-600 mt-2">-3.2% vs mes anterior</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Tasa de Conversión</p>
              <p className="text-3xl font-bold text-gray-900">{(Math.random() * 30 + 60).toFixed(1)}%</p>
              <p className="text-sm text-green-600 mt-2">+5.7% vs mes anterior</p>
            </div>
          </div>

          {/* Gráficos - Primera fila */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Análisis Mensual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#E85D5D" />
                  <Bar dataKey="gastos" fill="#DC2626" />
                  <Bar dataKey="utilidad" fill="#F87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución por Área</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Datos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Detalle de Operaciones</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">#{row.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{row.concepto}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{row.categoria}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">${row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
