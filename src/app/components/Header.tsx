import { useState } from "react";
import { useNavigate } from "react-router";
import { Settings, LogOut, User, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const username = user ? `${user.firstName} ${user.lastName}` : "Usuario";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Título de la página */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Panel de Bienvenida</h1>
        <p className="text-sm text-gray-500">Anuncios y actualizaciones empresariales</p>
      </div>

      {/* Acciones del usuario */}
      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Perfil dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-900">{username}</p>
              <p className="text-xs text-gray-500 uppercase">{user?.role === 'admin' ? 'Administrador' : user?.role === 'dev' ? 'Desarrollador' : 'Usuario'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{username}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
              </div>

              <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-4 h-4" />
                <span className="text-sm">Mi Perfil</span>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configuración</span>
              </button>

              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[#E85D5D] hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}