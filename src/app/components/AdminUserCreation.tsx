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
  const [agencies, setAgencies] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [isDev, setIsDev] = useState(false);

  const toggleAgency = (agency: string) => {
    setAgencies(prev => 
      prev.includes(agency) ? prev.filter(a => a !== agency) : [...prev, agency]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }
    if (agencies.length === 0 && !isDev) {
      alert("Por favor selecciona al menos una agencia o actívalo como Desarrollador.");
      return;
    }
    
    onCreate({ 
      firstName, 
      lastName, 
      email, 
      agencies: isDev ? ["ALL"] : agencies, 
      password,
      role: isDev ? "dev" : "user",
      permissions: { areas: [], dashboards: [] },
      mustChangePassword: true
    });
    
    setFirstName("");
    setLastName("");
    setEmail("");
    setAgencies([]);
    setPassword("");
    setIsDev(false);
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
        {/* Toggle DEV Role */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-3">
          <div className="pt-0.5">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              checked={isDev}
              onChange={(e) => setIsDev(e.target.checked)}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-indigo-900 cursor-pointer" onClick={() => setIsDev(!isDev)}>
              Activar Rol Desarrollador (Lienzo DEV)
            </label>
            <p className="text-xs text-indigo-700 leading-tight mt-1">Este usuario tendrá acceso al Canvas de Mapeo Interactivo de Datos en lugar del Dashboard normal.</p>
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

        {!isDev && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agencias Múltiples</label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
              {AGENCIES.map(ag => (
                <label key={ag} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#E85D5D] focus:ring-[#E85D5D]"
                    checked={agencies.includes(ag)}
                    onChange={() => toggleAgency(ag)}
                  />
                  <span className="text-sm text-gray-700">{ag}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
