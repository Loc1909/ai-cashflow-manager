// Centralized keys used by the auth flow.
export const AUTH_TOKEN_KEY = "access_token";

export const TREND_LABELS: Record<string, { label: string; color: string }> = {
  tang: { label: "Đang tăng", color: "text-income" },
  giam: { label: "Đang giảm", color: "text-expense" },
  on_dinh: { label: "Ổn định", color: "text-info" },
  khong_du_du_lieu: { label: "Chưa đủ dữ liệu", color: "text-ink-faint" },
};

export interface CategoryOption {
  value: string;
  label: string;
  type: "income" | "expense";
}

export const CATEGORIES: CategoryOption[] = [
  { value: "SALES", label: "Doanh thu bán hàng", type: "income" },
  { value: "SERVICE", label: "Doanh thu dịch vụ", type: "income" },
  { value: "OTHER_INCOME", label: "Thu nhập khác", type: "income" },
  { value: "FOOD", label: "Thực phẩm / Nguyên liệu", type: "expense" },
  { value: "SUPPLIES", label: "Vật tư / Dụng cụ", type: "expense" },
  { value: "SALARY", label: "Lương nhân viên", type: "expense" },
  { value: "UTILITIES", label: "Điện / Nước / Internet", type: "expense" },
  { value: "RENT", label: "Thuê mặt bằng", type: "expense" },
  { value: "TRANSPORT", label: "Vận chuyển / Xăng xe", type: "expense" },
  { value: "MARKETING", label: "Quảng cáo / Marketing", type: "expense" },
  { value: "OTHER", label: "Khác", type: "expense" },
];
