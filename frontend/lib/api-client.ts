import axios from "axios";
import type {
  ReportResponse,
  MonthlySummary,
} from "@/lib/types/report";
import type { TransactionListResponse } from "@/lib/types/transaction";
import { AUTH_TOKEN_KEY } from "@/lib/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string; business_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<{ access_token: string; token_type: string }>("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateMe: (data: { full_name?: string; business_name?: string }) =>
    api.patch("/auth/me", data),
};

// --- Transactions ---
export const transactionApi = {
  list: (params?: {
    type?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => api.get<TransactionListResponse>("/transactions/", { params }),
  create: (data: object) => api.post("/transactions/", data),
  update: (id: string, data: object) => api.patch(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};


// --- Reports ---
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
