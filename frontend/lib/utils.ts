import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Doanh thu bán hàng",
  SERVICE: "Doanh thu dịch vụ",
  OTHER_INCOME: "Thu nhập khác",
  FOOD: "Thực phẩm / Nguyên liệu",
  SUPPLIES: "Vật tư / Dụng cụ",
  SALARY: "Lương nhân viên",
  UTILITIES: "Điện / Nước / Internet",
  RENT: "Thuê mặt bằng",
  TRANSPORT: "Vận chuyển / Xăng xe",
  MARKETING: "Quảng cáo / Marketing",
  OTHER: "Khác",
};

export const CATEGORY_COLORS: Record<string, string> = {
  SALES: "#22c55e",
  SERVICE: "#10b981",
  OTHER_INCOME: "#6ee7b7",
  FOOD: "#f59e0b",
  SUPPLIES: "#ef4444",
  SALARY: "#8b5cf6",
  UTILITIES: "#3b82f6",
  RENT: "#ec4899",
  TRANSPORT: "#14b8a6",
  MARKETING: "#f97316",
  OTHER: "#6b7280",
};
