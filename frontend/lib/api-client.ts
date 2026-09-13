import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
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
      localStorage.removeItem("access_token");
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
  }) => api.get("/transactions/", { params }),
  create: (data: object) => api.post("/transactions/", data),
  update: (id: string, data: object) => api.patch(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

// --- Receipts ---
export const receiptApi = {
  scan: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/receipts/scan", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  confirm: (receiptId: string, transaction: object) =>
    api.post(`/receipts/${receiptId}/confirm`, { transaction }),
  reject: (receiptId: string) => api.delete(`/receipts/${receiptId}`),
};

// --- Reports ---
export const reportApi = {
  monthly: (year: number, month: number) =>
    api.get("/reports/monthly", { params: { year, month } }),
  summary: (year: number, month: number) =>
    api.get("/reports/summary", { params: { year, month } }),
};
