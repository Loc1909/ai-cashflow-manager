// AUTH_TOKEN_KEY đã bị loại bỏ — token giờ nằm trong cookie httpOnly do
// backend set/đọc, frontend không còn lưu/đọc token qua localStorage nữa.

export const TREND_LABELS: Record<string, { label: string; color: string }> = {
  up: { label: "Đang tăng", color: "text-income" },
  down: { label: "Đang giảm", color: "text-expense" },
  stable: { label: "Ổn định", color: "text-info" },
  insufficient_data: { label: "Chưa đủ dữ liệu", color: "text-ink-faint" },
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