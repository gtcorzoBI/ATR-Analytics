import { BarChart3, Clock } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  category?: string;
  onClick?: () => void;
}

export default function DashboardCard({ title, description, category = "Dashboard", onClick }: DashboardCardProps) {
  return (
    <div 
      onClick={onClick}
      className="w-[190px] bg-white p-2 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
    >
      {/* Imagen/Icono del card */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 w-full h-[130px] rounded-t-md flex items-center justify-center hover:scale-[0.98] transition-transform cursor-pointer">
        <BarChart3 className="w-16 h-16 text-red-500" />
      </div>

      {/* Categoría */}
      <div className="uppercase text-[0.7em] font-semibold text-red-500 pt-2.5 px-2 hover:cursor-pointer">
        {category}
      </div>

      {/* Título */}
      <div className="font-semibold text-gray-700 px-2 py-2 hover:cursor-pointer leading-tight">
        {title}
      </div>

      {/* Descripción/Autor */}
      <div className="text-gray-500 text-[11px] font-normal px-2 pb-2 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{description}</span>
      </div>
    </div>
  );
}