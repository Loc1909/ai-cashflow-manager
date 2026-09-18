import axios from "axios";
import type {
  ReportResponse,
  MonthlySummary,
} from "@/lib/types/report";
import type { Transaction, TransactionListResponse } from "@/lib/types/transaction";
import { AUTH_TOKEN_KEY } from "@/lib/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Endpoints where a 401 is an *expected* possible outcome (wrong email/
// password) rather than "your session expired". These must be excluded
// from the auto-logout redirect below, otherwise a wrong-password attempt
// on the login form triggers a hard `window.location.href` navigation
// before the page's own try/catch ever gets to show its error message —
// the user just sees the login page reload with no feedback.
const AUTH_ENDPOINTS_EXCLUDED_FROM_AUTO_LOGOUT = ["/auth/login", "/auth/register"];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS_EXCLUDED_FROM_AUTO_LOGOUT.some((path) => url.includes(path));
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !isAuthEndpoint(error.config?.url) && typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; full_name?: string; business_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<{ access_token: string; token_type: string }>("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateMe: (data: { full_name?: string; business_name?: string }) =>
    api.patch("/auth/me", data),
};

export const transactionApi = {
  list: (params?: {
    type?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => api.get<TransactionListResponse>("/transactions/", { params }),
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`).then(res => res.data),
  create: (data: object) => api.post("/transactions/", data),
  update: (id: string, data: object) => api.patch(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const reportApi = {
  monthly: (year: number, month: number) =>
    api.get<ReportResponse>("/reports/monthly", {
      params: { year, month },
    }),

  summary: (year: number, month: number) =>
    api.get<MonthlySummary>("/reports/summary", {
      params: { year, month },
    }),
};
