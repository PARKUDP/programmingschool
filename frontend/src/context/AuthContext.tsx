import React, { createContext, useContext, useState } from "react";

type AuthUser = {
  id: number;
  username: string;
  is_admin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (user: AuthUser) => {
    setUser(user);
    localStorage.setItem("authUser", JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authUser");
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!user) throw new Error("not logged in");
    const res = await fetch("http://localhost:5050/api/change_password", {
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
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
