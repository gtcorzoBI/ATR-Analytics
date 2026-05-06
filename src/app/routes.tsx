import { createBrowserRouter, Navigate } from "react-router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ChangePassword from "./pages/ChangePassword";
import DevDashboard from "./pages/DevDashboard";
import { useAuth } from "./context/AuthContext";

// Componente para proteger rutas generales
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string | string[] }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && window.location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      if (user.role === "dev") return <Navigate to="/dev" replace />;
      if (user.role === "admin") return <Navigate to="/admin" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

// Componente para redireccionar si ya está autenticado
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (user) {
    if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "dev") return <Navigate to="/dev" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <ChangePassword />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requiredRole={["user", "superuser", "extrauser"]}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dev",
    element: (
      <ProtectedRoute requiredRole="dev">
        <DevDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

