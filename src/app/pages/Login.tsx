import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp, 
  Database, 
  FileSpreadsheet, 
  Activity, 
  Layers, 
  Network, 
  Calculator, 
  Box, 
  Cpu, 
  Binary, 
  Globe,
  Lock,
  User,
  EyeOff,
  Eye,
  BarChart
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const magicLoginAttempted = useRef(false);

  const { login, magicLogin } = useAuth();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Lista de íconos de análisis de datos
  const iconTypes = [
    BarChart3, PieChart, LineChart, TrendingUp, Database, 
    FileSpreadsheet, Activity, Layers, Network, Calculator, 
    Box, Cpu, Binary, Globe
  ];

  // Generar configuraciones aleatorias para los íconos de fondo
  const floatingIcons = useMemo(() => {
    return Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      Icon: iconTypes[Math.floor(Math.random() * iconTypes.length)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 40 + 20,
      opacity: Math.random() * 0.15 + 0.05,
      speedX: (Math.random() - 0.5) * 0.08, 
      speedY: (Math.random() - 0.5) * 0.08,
      floatDelay: `${Math.random() * 5}s`,
      floatDuration: `${Math.random() * 4 + 6}s`,
    }));
  }, []);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token && !magicLoginAttempted.current) {
      magicLoginAttempted.current = true;
      magicLogin(token).then((success) => {
        if (success) {
          navigate("/change-password");
        } else {
          setError("El enlace de inicio de sesión no es válido o ha expirado");
        }
      });
    }
  }, [searchParams, magicLogin, navigate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username && password) {
      const success = await login(username, password);
      if (success) {
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
    <div 
      className="flex min-h-screen w-full bg-gray-50 font-sans overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
      `}} />

      {/* PANEL IZQUIERDO */}
      <div className="relative hidden lg:flex lg:w-[55%] bg-gradient-to-br from-red-600 via-red-700 to-red-900 flex-col justify-center px-16 xl:px-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          {floatingIcons.map((item) => {
            const offsetX = (mousePos.x - windowSize.width / 2) * item.speedX;
            const offsetY = (mousePos.y - windowSize.height / 2) * item.speedY;

            return (
              <div
                key={item.id}
                className="absolute text-white transition-transform duration-200 ease-out"
                style={{
                  left: `${item.left}%`,
                  top: `${item.top}%`,
                  opacity: item.opacity,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                }}
              >
                <div style={{ animation: `floatUp ${item.floatDuration} ease-in-out infinite`, animationDelay: item.floatDelay }}>
                  <item.Icon size={item.size} strokeWidth={1.5} />
                </div>
              </div>
            );
          })}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=')] opacity-50"></div>
        </div>

        <div className="relative z-10 text-white max-w-2xl animate-slide-up">
          <div className="flex items-center gap-3 mb-8">
            <BarChart className="w-8 h-8 md:w-10 md:h-10 text-white" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ATR Analytics Pro</h2>
          </div>
          
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-6">
            Sistema de análisis empresarial <br className="hidden xl:block"/>
            <span className="text-red-200">de Grupo Torres Corzo</span>
          </h1>
          
          <p className="text-lg md:text-xl text-red-100 font-light leading-relaxed max-w-lg mb-12">
            Accede a dashboards interactivos y datos en tiempo real para potenciar la toma de decisiones estratégicas en tu negocio.
          </p>
        </div>

        <div className="absolute bottom-8 left-16 xl:left-24 text-red-200/60 text-sm z-10">
          &copy; 2026 ATR Analytics Pro. Todos los derechos reservados. By Departamento BI
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-20">
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden text-red-600">
            <BarChart className="w-6 h-6" />
            <span className="font-bold text-lg">ATR Analytics Pro</span>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(220,38,38,0.1)] p-8 sm:p-12 border border-gray-100 animate-slide-up delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 shadow-sm border border-red-100 rotate-3 hover:rotate-0 transition-transform">
              <Lock size={32} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Iniciar Sesión</h2>
            <p className="text-gray-500">Ingresa tus credenciales para acceder</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-slide-up">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-red-500 checked:border-red-500 transition-colors cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Recordarme</span>
              </label>
              
              <a href="#" className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-red-500/30 transform hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              Iniciar Sesión
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            ¿Necesitas ayuda? <a href="#" className="font-semibold text-red-600 hover:underline">Contacta soporte</a>
          </p>
        </div>
      </div>
    </div>
  );
}