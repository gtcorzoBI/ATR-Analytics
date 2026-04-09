import React, { createContext, useContext, useState, useEffect } from "react";
import { useDataStore, mockHash } from "../hooks/useDataStore";

export type UserType = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user" | "dev";
  agency: string;
  agencies: string[];
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  previousLoginAt?: string;
  lastActiveAt?: string;
  lastDashboardViewed?: string;
  permissions: {
    areas: string[];
    dashboards: string[];
  };
};

type AuthContextType = {
  user: UserType | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  magicLogin: (token: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (newPass: string) => void;
  recordActivity: (dashboardTitle: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API = "http://localhost:3001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { updateUserActivity } = useDataStore();

  // Restore session on mount
  useEffect(() => {
    // E2E Testing / Auto-Login Bypass
    if (import.meta.env.VITE_E2E_TESTING === "true") {
      const mockAdminUser: UserType = {
        id: "1",
        firstName: "Admin",
        lastName: "User",
        email: "admin@atr.com",
        role: "admin",
        agency: "ATR Matriz",
        agencies: ["ATR Matriz", "ATR Sucursal"],
        mustChangePassword: false,
        permissions: { areas: [], dashboards: [] }
      };
      setUser(mockAdminUser);
      setToken("test_token_123");
      localStorage.setItem("atr_token", "test_token_123");
      localStorage.setItem("active_user", JSON.stringify(mockAdminUser));
      localStorage.setItem("isLoggedIn", "true");
      return;
    }

    const savedUser = localStorage.getItem("active_user");
    const savedToken = localStorage.getItem("atr_token");
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setToken(savedToken);
      
      // Attempt to re-verify/re-issue token in case backend restarted
      fetch(`${API}/api/auth/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parsedUser.id }),
      }).then(r => r.json()).then(d => {
        if (d.token) {
          setToken(d.token);
          localStorage.setItem("atr_token", d.token);
        }
      }).catch(() => console.warn("Backend still unreachable or refused token re-issue."));
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const r = await fetch(`${API}/api/auth/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      if (r.ok) {
        const d = await r.json();
        if (d.success && d.token && d.user) {
          const now = new Date().toISOString();
          const loggedUser = {
            ...d.user,
            previousLoginAt: d.user.lastLoginAt || null,
            lastLoginAt: now,
            lastActiveAt: now,
          };

          setToken(d.token);
          localStorage.setItem("atr_token", d.token);

          setUser(loggedUser);
          localStorage.setItem("active_user", JSON.stringify(loggedUser));
          localStorage.setItem("isLoggedIn", "true");

          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Backend login failed. Attempting offline fallback...", err);
      // Fallback for demo mode
      const users = JSON.parse(localStorage.getItem("atr_users") || "[]");
      let foundUser = users.find(
        (u: any) =>
          (u.email === email || u.email === "admin" || u.email === "dev" || u.email === "user") && // simple demo override
          (u.password === pass || u.password === mockHash(pass))
      );

      if (!foundUser) return false;

      const now = new Date().toISOString();
      foundUser = {
        ...foundUser,
        previousLoginAt: foundUser.lastLoginAt || null,
        lastLoginAt: now,
        lastActiveAt: now,
      };

      localStorage.setItem("active_user", JSON.stringify(foundUser));
      localStorage.setItem("isLoggedIn", "true");
      setUser(foundUser);
      return true;
    }
  };

  const magicLogin = async (magicToken: string): Promise<boolean> => {
    try {
      const r = await fetch(`${API}/api/auth/magic-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
      });

      if (r.ok) {
        const d = await r.json();
        if (d.success && d.token && d.user) {
          const now = new Date().toISOString();
          const loggedUser = {
            ...d.user,
            previousLoginAt: d.user.lastLoginAt || null,
            lastLoginAt: now,
            lastActiveAt: now,
          };

          setToken(d.token);
          localStorage.setItem("atr_token", d.token);

          setUser(loggedUser);
          localStorage.setItem("active_user", JSON.stringify(loggedUser));
          localStorage.setItem("isLoggedIn", "true");

          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Magic login failed.", err);
      return false;
    }
  };

  const logout = async () => {
    // Revoke token on server
    if (token) {
      try {
        await fetch(`${API}/api/auth/revoke`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("active_user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("atr_token");
  };

  const updatePassword = async (newPass: string) => {
    if (!user) return;

    // Optimistic UI update
    const activeUpdated = { ...user, mustChangePassword: false };
    setUser(activeUpdated);
    localStorage.setItem("active_user", JSON.stringify(activeUpdated));

    if (token) {
      try {
        await fetch(`${API}/api/users/${user.id}/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ password: newPass }),
        });
      } catch (e) {
        console.error("Failed to update password on server", e);
      }
    }
  };

  const recordActivity = (dashboardTitle: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const activeUpdated = {
      ...user,
      lastActiveAt: now,
      lastDashboardViewed: dashboardTitle,
    };
    setUser(activeUpdated);
    localStorage.setItem("active_user", JSON.stringify(activeUpdated));
    updateUserActivity(user.id, dashboardTitle);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, magicLogin, logout, updatePassword, recordActivity }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
