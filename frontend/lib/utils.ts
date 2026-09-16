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

// Ink swatches consistent with the ledger palette — desaturated,
// printed-ink feel rather than neon SaaS chart colors.
export const CATEGORY_COLORS: Record<string, string> = {
  SALES: "#2f6f4e",
  SERVICE: "#4d8f6a",
  OTHER_INCOME: "#8bab74",
  FOOD: "#a13d34",
  SUPPLIES: "#c0703f",
  SALARY: "#a9721f",
  UTILITIES: "#345170",
  RENT: "#6a4a7c",
  TRANSPORT: "#3d7a7a",
  MARKETING: "#b0555c",
  OTHER: "#63705f",
};
