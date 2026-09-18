import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type {
  ReportResponse,
  MonthlySummary,
} from "@/lib/types/report";
import type { Transaction, TransactionListResponse } from "@/lib/types/transaction";
import type { AuthResponse } from "@/lib/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// Access/refresh token giờ nằm trong cookie httpOnly do BACKEND set —
// JS không còn đọc/ghi token qua localStorage nữa (giảm bề mặt bị đánh
// cắp qua XSS). `withCredentials: true` để trình duyệt tự đính kèm cookie
// trên mọi request tới API, không cần set header Authorization thủ công.
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Endpoints where a 401 is an *expected* possible outcome (wrong email/
// password, hoặc chưa có refresh token hợp lệ) rather than "your session
// expired". Loại các endpoint này khỏi luồng auto-refresh/auto-logout bên
// dưới để lỗi hiển thị đúng ngay tại form thay vì bị redirect/loop.
const AUTH_ENDPOINTS_EXCLUDED_FROM_AUTO_LOGOUT = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/me",
];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS_EXCLUDED_FROM_AUTO_LOGOUT.some((path) => url.includes(path));
}

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Access token giờ sống ngắn (mặc định 15 phút). Khi hết hạn, request gốc
// nhận 401 — thay vì văng người dùng ra login ngay, ta thử gọi
// /auth/refresh MỘT LẦN để xoay refresh token + cấp access token mới, rồi
// retry lại đúng request gốc. `refreshPromise` dùng chung giữa các request
// 401 xảy ra gần như đồng thời để chỉ gọi /auth/refresh một lần duy nhất
// (tránh nhiều request cùng lúc đua nhau rotate refresh token).
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !isAuthEndpoint(originalRequest.url) &&
      typeof window !== "undefined"
    ) {
      if (!originalRequest._retried) {
        originalRequest._retried = true;
        const refreshed = await tryRefresh();
        if (refreshed) {
          return api(originalRequest);
        }
      }
      // Refresh cũng thất bại (refresh token hết hạn/đã bị revoke) —
      // phiên đăng nhập thực sự đã kết thúc, đưa về trang login.
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; full_name?: string; business_name?: string }) =>
    api.post<AuthResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),
  logout: () => api.post("/auth/logout"),
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
