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

interface DashboardDetailProps {
  dashboard: any;
  onBack: () => void;
}

export default function DashboardDetail({ dashboard, onBack }: DashboardDetailProps) {
  const { title, category, config } = dashboard;
  
  const barData = generateBarData();
  const pieData = generatePieData();
  const lineData = generateLineData();
  const scatterData = generateScatterData();
  const tableData = generateTableData();

  const isCustom = !!(config && config.components);

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
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Actualizar</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Compartir</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#E85D5D] text-white rounded-lg hover:bg-[#DC2626] transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Exportar</span>
          </button>
        </div>
      </div>

      {isCustom ? (
        // ── CUSTOM DASHBOARD RENDER ──
        <div className="relative bg-gray-100 rounded-xl border border-gray-200 overflow-auto p-4 min-h-[600px] shadow-inner">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
            <BarChart3 className="w-3.5 h-3.5" /> Diseño Personalizado
          </div>
          
          <div className="relative" style={{ minHeight: '1000px' }}>
            {config.components.map((comp: any, idx: number) => (
              <div
                key={idx}
                className="absolute bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                style={{
                  left: comp.x,
                  top: comp.y,
                  width: comp.w,
                  height: comp.h,
                }}
              >
                <div style={{ height: comp.h }}>
                  <LiveWidget 
                    code={comp.code} 
                    rows={comp.rows} 
                    columns={comp.columns} 
                    padding={20}
                  />
                </div>
              </div>
            ))}
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
  );
}
