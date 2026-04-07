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
    const users = JSON.parse(localStorage.getItem("atr_users") || "[]");
    let foundUser = users.find(
      (u: any) =>
        u.email === email &&
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

    const updatedUsers = users.map((u: any) =>
      u.id === foundUser.id ? foundUser : u
    );
    localStorage.setItem("atr_users", JSON.stringify(updatedUsers));
    localStorage.setItem("active_user", JSON.stringify(foundUser));
    localStorage.setItem("isLoggedIn", "true");
    setUser(foundUser);

    // Issue a backend session token
    try {
      const r = await fetch(`${API}/api/auth/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: foundUser.id }),
      });
      if (r.ok) {
        const d = await r.json();
        setToken(d.token);
        localStorage.setItem("atr_token", d.token);
      }
    } catch {
      // Backend can be offline — app still works in offline mode (no SQL queries)
      console.warn("Backend offline — SQL features unavailable.");
    }

    return true;
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

  const updatePassword = (newPass: string) => {
    if (!user) return;
    const users = JSON.parse(localStorage.getItem("atr_users") || "[]");
    const updatedUsers = users.map((u: any) => {
      if (u.id === user.id) {
        return { ...u, password: mockHash(newPass), mustChangePassword: false };
      }
      return u;
    });
    localStorage.setItem("atr_users", JSON.stringify(updatedUsers));
    const activeUpdated = { ...user, mustChangePassword: false };
    setUser(activeUpdated);
    localStorage.setItem("active_user", JSON.stringify(activeUpdated));
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
      value={{ user, token, login, logout, updatePassword, recordActivity }}
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
