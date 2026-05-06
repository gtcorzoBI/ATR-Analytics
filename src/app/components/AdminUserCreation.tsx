import React, { useState } from "react";
import { UserPlus } from "lucide-react";

export const AGENCIES = [
  "INFINITI QUERETARO",
  "INFINITI FORUM",
  "FLOTILLAS FORUM",
  "FORUM",
  "CENTROMAX",
  "CARRANZA",
  "LOMAS",
  "SENDERO",
  "TRUSTYCAR",
  "RIOVERDE",
  "MATEHUALA",
  "NAVA",
  "INFINITI SENDERO",
  "FLOTAS SAN LUIS",
  "INFINITI FLOTAS",
  "INSUR",
  "LA JOYA",
  "TLALPAN",
];

export function AdminUserCreation({ onCreate }: { onCreate: (data: any) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialRole, setSpecialRole] = useState<'none' | 'superuser' | 'extrauser' | 'dev'>('none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }
    
    onCreate({ 
      firstName, 
      lastName, 
      email, 
      agencies: [], // Agencias se asignan ahora desde el Dashboard/Filtros
      password,
      role: specialRole === 'none' ? "user" : specialRole,
      permissions: { areas: [], dashboards: [] },
      mustChangePassword: true
    });
    
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setSpecialRole('none');
    alert("Usuario creado exitosamente");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-[#E85D5D]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Alta de Usuarios</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Roles Especiales */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rol del Usuario</label>
          
          <div className="flex flex-col gap-2">
            <label className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-colors ${specialRole === 'none' ? 'bg-gray-50 border-gray-400' : 'bg-white border-gray-200'}`}>
              <div className="pt-0.5">
                <input type="radio" name="role" checked={specialRole === 'none'} onChange={() => setSpecialRole('none')} className="w-4 h-4 text-[#E85D5D] focus:ring-[#E85D5D]"/>
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900">Usuario Estándar</span>
                <p className="text-xs text-gray-500 mt-1">Acceso normal a los tableros que le sean asignados por la administración.</p>
              </div>
            </label>

            <label className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-colors ${specialRole === 'superuser' ? 'bg-red-50 border-red-300 shadow-sm' : 'bg-white border-gray-200'}`}>
              <div className="pt-0.5">
                <input type="radio" name="role" checked={specialRole === 'superuser'} onChange={() => setSpecialRole('superuser')} className="w-4 h-4 text-red-600 focus:ring-red-600"/>
              </div>
              <div>
                <span className="text-sm font-bold text-red-900">SuperUSER (Finanzas/Ejecutivo)</span>
                <p className="text-xs text-red-700 mt-1">Usuario normal (con tableros asignados) pero con acceso al botón del FP&A Studio (Alpha).</p>
              </div>
            </label>

            <label className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-colors ${specialRole === 'extrauser' ? 'bg-orange-50 border-orange-300 shadow-sm' : 'bg-white border-gray-200'}`}>
              <div className="pt-0.5">
                <input type="radio" name="role" checked={specialRole === 'extrauser'} onChange={() => setSpecialRole('extrauser')} className="w-4 h-4 text-orange-600 focus:ring-orange-600"/>
              </div>
              <div>
                <span className="text-sm font-bold text-orange-900">ExtraUser (Gestor Kanban)</span>
                <p className="text-xs text-orange-700 mt-1">Acceso al FP&A Studio. Rol exclusivo para poder mover tarjetas en el Kanban y recibir notificaciones.</p>
              </div>
            </label>

            <label className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-colors ${specialRole === 'dev' ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-gray-200'}`}>
              <div className="pt-0.5">
                <input type="radio" name="role" checked={specialRole === 'dev'} onChange={() => setSpecialRole('dev')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-600"/>
              </div>
              <div>
                <span className="text-sm font-bold text-indigo-900">Desarrollador (Lienzo DEV)</span>
                <p className="text-xs text-indigo-700 mt-1">Acceso exclusivo al Canvas de Mapeo Interactivo de Datos en lugar del Dashboard.</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
           <input
             type="email"
             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
           />
        </div>



        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Temporal</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            El sistema pedirá el cambio al primer inicio de sesión.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-[#E85D5D] hover:bg-[#DC2626] text-white font-medium py-2 px-4 rounded-lg transition"
        >
          Crear Cuenta
        </button>
      </form>
    </div>
  );
}
