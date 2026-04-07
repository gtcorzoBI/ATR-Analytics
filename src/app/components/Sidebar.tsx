import { useState } from "react";
import {
  Wrench,
  ShoppingCart,
  FileText,
  CreditCard,
  Megaphone,
  Users,
  Calculator,
  BarChart3,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  { id: "posventa", name: "POSVENTA", icon: Wrench },
  { id: "comercial", name: "COMERCIAL", icon: ShoppingCart },
  { id: "administracion", name: "ADMINISTRACIÓN", icon: FileText },
  { id: "financiamiento", name: "FINANCIAMIENTO", icon: CreditCard },
  { id: "marketing", name: "MARKETING", icon: Megaphone },
  { id: "rh", name: "RH", icon: Users },
  { id: "comisiones", name: "CÁLCULO DE COMISIONES", icon: Calculator },
];

import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  selectedArea: string | null;
  onAreaSelect: (areaId: string) => void;
}

export default function Sidebar({ selectedArea, onAreaSelect }: SidebarProps) {
  const { user } = useAuth();
  
  // Filter menu items
  const visibleMenuItems = menuItems.filter(item => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Un usuario ve un área en el sidebar si tiene permiso a esa área completa 
    // O si tiene permiso a al menos un dashboard de esa área
    const hasAreaAccess = user.permissions.areas.includes(item.id);
    const hasDashboardInArea = user.permissions.dashboards.some(d => d.startsWith(`${item.id}/`));
    
    return hasAreaAccess || hasDashboardInArea;
  });

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[#E85D5D]" />
          <div>
            <h1 className="font-bold text-lg">ATR Analytics Pro</h1>
            <p className="text-xs text-gray-400">Sistema de Análisis</p>
          </div>
        </div>
      </div>

      {/* Áreas de negocio */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-3">
          <p className="text-xs uppercase text-gray-500 font-semibold px-3">Áreas</p>
        </div>
        <nav className="space-y-1 px-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedArea === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onAreaSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
                  isSelected
                    ? "bg-[#E85D5D] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left text-sm font-medium">{item.name}</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Información adicional */}
      {user?.role === "dev" && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => window.location.href = "/dev"}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
          >
            <Wrench className="w-4 h-4" />
            Entrar a DataCanvas O.S.
          </button>
        </div>
      )}
      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Última actualización</p>
          <p className="text-sm font-medium">7 Abr 2026, 08:30</p>
        </div>
      </div>
    </div>
  );
}