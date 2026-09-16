"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api-client";
import { AUTH_TOKEN_KEY } from "@/lib/constants";

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(AUTH_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, res.data.access_token);
    const meRes = await authApi.getMe();
    setUser(meRes.data);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, isAuthenticated: !!user }}
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
