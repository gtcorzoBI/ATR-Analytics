import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DashboardCard from "../components/DashboardCard";
import DashboardDetail from "../components/DashboardDetail";
import FPAStudio from "../components/FPAStudio";
import { Megaphone, TrendingUp, Calendar, Users, Pin, Zap } from "lucide-react";

// Datos de ejemplo para anuncios
const announcements = [
  {
    id: 1,
    title: "Actualización del Sistema de Reportes",
    description:
      "Se ha implementado una nueva versión del sistema de reportes con mejoras en velocidad y visualización de datos. Todos los usuarios pueden acceder a las nuevas funcionalidades desde hoy.",
    date: "6 Abril 2026",
    category: "Sistema",
    isPinned: true,
    icon: TrendingUp,
    color: "bg-[#E85D5D]",
  },
  {
    id: 2,
    title: "Reunión Mensual de Resultados",
    description:
      "La próxima reunión mensual de resultados se llevará a cabo el 10 de abril a las 10:00 AM. Se presentarán los KPIs de todas las áreas. Asistencia obligatoria para jefes de área.",
    date: "8 Abril 2026",
    category: "Eventos",
    isPinned: true,
    icon: Calendar,
    color: "bg-[#F87171]",
  },
  {
    id: 3,
    title: "Nuevo Dashboard de Marketing",
    description:
      "El equipo de Marketing ha lanzado un nuevo dashboard interactivo para el seguimiento de campañas. Incluye métricas de ROI, conversión y engagement en tiempo real.",
    date: "5 Abril 2026",
    category: "Anuncio",
    isPinned: false,
    icon: Megaphone,
    color: "bg-[#DC2626]",
  },
  {
    id: 4,
    title: "Capacitación: Análisis de Datos Avanzado",
    description:
      "Se abrió la inscripción para el curso de análisis de datos avanzado. Cupos limitados. La capacitación incluye Power BI, Excel avanzado y visualización de datos.",
    date: "4 Abril 2026",
    category: "Capacitación",
    isPinned: false,
    icon: Users,
    color: "bg-orange-500",
  },
  {
    id: 5,
    title: "Mantenimiento Programado",
    description:
      "El sistema estará en mantenimiento el próximo sábado 12 de abril de 2:00 AM a 6:00 AM. Durante este periodo no estará disponible el acceso a los dashboards.",
    date: "3 Abril 2026",
    category: "Mantenimiento",
    isPinned: false,
    icon: TrendingUp,
    color: "bg-gray-600",
  },
];

import { useAuth } from "../context/AuthContext";
import { useDataStore, AREA_NAMES } from "../hooks/useDataStore";

export default function Dashboard() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<any | null>(null);
  const [showFPAStudio, setShowFPAStudio] = useState(false);
  const { user, recordActivity } = useAuth();
  const { systemDashboards } = useDataStore();

  // Get raw dashboards for area from store
  const rawDashboards = selectedArea ? (systemDashboards[selectedArea] || []) : [];
  
  // Filter based on roles and specific assignments
  const visibleDashboards = rawDashboards.filter(d => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!selectedArea) return false;

    // View if whole area access
    if (user.permissions.areas.includes(selectedArea)) return true;
    
    // View if specific dashboard access (path matches AreaID/DashID)
    const path = `${selectedArea}/${d.id}`;
    return user.permissions.dashboards.includes(path);
  });

  // Dynamic notifications for assigned dashboards
  const assignmentNotifications = user?.permissions.dashboards.map((path, idx) => {
    const [areaId, dashId] = path.split('/');
    const areaDashboards = systemDashboards[areaId] || [];
    const dashboard = areaDashboards.find(d => d.id === dashId);
    if (!dashboard) return null;

    return {
      id: `assign-${idx}`,
      title: "Nuevo Tablero Asignado",
      description: `Se te ha asignado el tablero "${dashboard.title}" en el área de ${AREA_NAMES[areaId] || areaId}.`,
      date: "Hoy",
      category: "Novedad",
      isPinned: true,
      icon: TrendingUp,
      color: "bg-indigo-600",
      action: () => {
        setSelectedArea(areaId);
        setSelectedDashboard(dashboard);
      }
    };
  }).filter(Boolean).slice(0, 3); // Show top 3 as novelty

  const allAnnouncements = [...(assignmentNotifications as any), ...announcements];

  return (
    <div className="flex h-screen bg-gray-50 print:h-auto print:overflow-visible">
      {/* Sidebar */}
      {!showFPAStudio && (
        <Sidebar 
          selectedArea={selectedArea} 
          onAreaSelect={(area) => {
            setSelectedArea(area);
            setSelectedDashboard(null); // Clean up the inner view bug
            setShowFPAStudio(false);
          }} 
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        {/* Header */}
        <div className="print:hidden">
          <Header />
        </div>

        {/* Área de contenido */}
        <main className={`flex-1 overflow-y-auto print:overflow-visible ${showFPAStudio ? '' : 'p-6'}`}>
          <div className={showFPAStudio ? 'h-full print:h-auto' : 'max-w-6xl mx-auto'}>
            {showFPAStudio ? (
              <FPAStudio />
            ) : selectedDashboard ? (
              // Vista detallada del dashboard con gráficos
              <DashboardDetail
                dashboard={selectedDashboard}
                onBack={() => setSelectedDashboard(null)}
              />
            ) : selectedArea ? (
              // Vista de dashboards del área seleccionada
              <>
                <div className="mb-6">
                  <button
                    onClick={() => setSelectedArea(null)}
                    className="text-[#E85D5D] hover:text-[#DC2626] font-medium text-sm flex items-center gap-2 mb-4"
                  >
                    ← Volver a anuncios
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedArea ? AREA_NAMES[selectedArea] : ""}
                  </h1>
                  <p className="text-gray-600">
                    Dashboards y reportes disponibles para esta área
                  </p>
                </div>

                {/* Grid de tarjetas de dashboards */}
                <div className="flex flex-wrap gap-6">
                  {visibleDashboards.length === 0 ? (
                    <div className="w-full p-8 text-center bg-white rounded-xl border border-gray-200">
                      <p className="text-gray-500">No tienes acceso a ningún dashboard en esta área.</p>
                    </div>
                  ) : (
                    visibleDashboards.map((dashboard) => (
                      <DashboardCard
                        key={dashboard.id}
                        title={dashboard.title}
                        description={dashboard.description}
                        category={dashboard.category}
                        onClick={() => {
                          setSelectedDashboard(dashboard);
                          recordActivity(dashboard.title);
                        }}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              // Vista de anuncios por defecto
              <>
                {/* Mensaje de bienvenida */}
                <div className="bg-gradient-to-r from-[#E85D5D] to-[#DC2626] rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                      ¡Bienvenido al Sistema de Análisis Empresarial!
                    </h1>
                    <p className="text-red-100 text-lg mb-6 max-w-2xl">
                      Accede a los dashboards de cada área desde el menú lateral para visualizar datos y
                      métricas en tiempo real.
                    </p>
                    
                    {(user?.role === 'superuser' || user?.role === 'extrauser') && (
                      <button 
                        onClick={() => setShowFPAStudio(true)}
                        className="bg-white text-[#DC2626] hover:bg-red-50 flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 mt-4"
                      >
                        <Zap className="w-5 h-5" />
                        Abrir FP&A Studio ({user?.role === 'superuser' ? 'SuperUSER' : 'ExtraUser'})
                      </button>
                    )}
                  </div>
                  {/* Decoración gráfica */}
                  <div className="absolute top-0 right-0 opacity-10">
                    <TrendingUp className="w-64 h-64 -mt-10 -mr-10" />
                  </div>
                </div>

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Total Áreas</p>
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#E85D5D]" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">7</p>
                  </div>

                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Anuncios Activos</p>
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-[#E85D5D]" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
                  </div>

                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Reportes Activos</p>
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-[#E85D5D]" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">24</p>
                  </div>

                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Próximas Tareas</p>
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#E85D5D]" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">3</p>
                  </div>
                </div>

                {/* Sección de anuncios */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Anuncios Empresariales
                    </h2>
                    <button className="text-sm text-[#E85D5D] hover:text-[#DC2626] font-medium">
                      Ver todos
                    </button>
                  </div>

                  <div className="space-y-4">
                    {allAnnouncements.map((announcement: any) => {
                      const Icon = announcement.icon;
                      return (
                        <div
                          key={announcement.id}
                          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex gap-4">
                            {/* Icono */}
                            <div
                              className={`w-12 h-12 ${announcement.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>

                            {/* Contenido */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-bold text-gray-900">
                                    {announcement.title}
                                  </h3>
                                  {announcement.isPinned && (
                                    <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                      <Pin className="w-3 h-3" />
                                      Fijado
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                                  {announcement.date}
                                </span>
                              </div>

                              <p className="text-gray-700 mb-3 leading-relaxed">
                                {announcement.description}
                              </p>

                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                                  {announcement.category}
                                </span>
                                <button 
                                  onClick={() => {
                                    if ((announcement as any).action) (announcement as any).action();
                                    else alert("Próximamente más detalles...");
                                  }}
                                  className="text-sm text-[#E85D5D] hover:text-[#DC2626] font-medium"
                                >
                                  {(announcement as any).action ? 'Ir al tablero →' : 'Leer más →'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}