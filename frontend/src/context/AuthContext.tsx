import React, { createContext, useContext, useState } from "react";
import { apiEndpoints } from "../config/api";

type AuthUser = {
  id: number;
  username: string;
  is_admin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("authToken");
  });

  const login = (user: AuthUser, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("authUser", JSON.stringify(user));
    localStorage.setItem("authToken", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
  };

  const authFetch = (input: RequestInfo, init: RequestInit = {}) => {
    const headers = { ...(init.headers || {}) } as Record<string, string>;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(input, { ...init, headers });
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!user) throw new Error("not logged in");
    const res = await fetch(apiEndpoints.changePassword, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        old_password: oldPass,
        new_password: newPass,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "change password failed");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};