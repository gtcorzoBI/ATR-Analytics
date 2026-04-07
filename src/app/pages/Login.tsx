import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, User, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username && password) {
      const success = await login(username, password);
      if (success) {
        // Redirección basada en rol
        const activeUserStr = localStorage.getItem("active_user");
        if (activeUserStr) {
          const usr = JSON.parse(activeUserStr);
          if (usr.role === "admin") navigate("/admin");
          else if (usr.role === "dev") navigate("/dev");
          else navigate("/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } else {
      setError("Por favor ingrese usuario y contraseña");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Información */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#E85D5D] via-[#DC2626] to-[#B91C1C] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <BarChart3 className="w-10 h-10 text-white" />
            <h1 className="text-3xl font-bold text-white">ATR Analytics Pro</h1>
          </div>
          <div className="space-y-6 text-white/90">
            <h2 className="text-4xl font-bold leading-tight">
              Sistema de análisis empresarial
              <br />
              de Grupo Torres Corzo
            </h2>
            <p className="text-xl text-white/80">
              Accede a dashboards interactivos y datos en tiempo real para tomar decisiones estratégicas
            </p>
          </div>
        </div>
        <div className="text-white/60 text-sm">
          © 2026 ATR Analytics Pro. Todos los derechos reservados. By Departamento BI
        </div>
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <Lock className="w-8 h-8 text-[#E85D5D]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
              <p className="text-gray-600 mt-2">Ingresa tus credenciales para acceder</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E85D5D] focus:border-[#E85D5D] transition-colors"
                    placeholder="Ingresa tu usuario"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E85D5D] focus:border-[#E85D5D] transition-colors"
                    placeholder="Ingresa tu contraseña"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-[#E85D5D] focus:ring-[#E85D5D] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                </label>
                <a href="#" className="text-sm text-[#E85D5D] hover:text-[#DC2626]">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-[#E85D5D] text-white py-3 px-4 rounded-lg hover:bg-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#E85D5D] focus:ring-offset-2 transition-colors font-medium"
              >
                Iniciar Sesión
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿Necesitas ayuda?{" "}
                <a href="#" className="text-[#E85D5D] hover:text-[#DC2626] font-medium">
                  Contacta soporte
                </a>
              </p>
            </div>
          </div>

          {/* Nota de demostración */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-[#DC2626] text-center">
              <strong>Demo:</strong> Ingresa cualquier usuario y contraseña para acceder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}