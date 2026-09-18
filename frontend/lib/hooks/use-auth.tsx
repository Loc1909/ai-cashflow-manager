"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfile: (data: { full_name?: string; business_name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await authApi.login({ email, password });
    const meRes = await authApi.getMe();
    setUser(meRes.data);
  };

  const logout = () => {
    setUser(null);
    window.location.href = "/login";
  };

  const updateProfile = async (data: { full_name?: string; business_name?: string }) => {
    const res = await authApi.updateMe(data);
    setUser(res.data);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, isAuthenticated: !!user, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
