"""
labels.py
----------
Ánh xạ mã danh mục (TransactionCategory) sang nhãn tiếng Việt dễ đọc,
dùng trong insight_engine và anomaly_detector để hiển thị cho người dùng
thay vì mã enum thô ("FOOD", "SUPPLIES"...).
"""
from __future__ import annotations

from app.models.transaction import TransactionCategory

CATEGORY_LABELS: dict[str, str] = {
    TransactionCategory.SALES.value: "Doanh thu bán hàng",
    TransactionCategory.SERVICE.value: "Doanh thu dịch vụ",
    TransactionCategory.OTHER_INCOME.value: "Thu khác",
    TransactionCategory.FOOD.value: "Thực phẩm/nguyên liệu",
    TransactionCategory.SUPPLIES.value: "Vật tư/dụng cụ",
    TransactionCategory.SALARY.value: "Lương nhân viên",
    TransactionCategory.UTILITIES.value: "Điện/nước/internet",
    TransactionCategory.RENT.value: "Thuê mặt bằng",
    TransactionCategory.TRANSPORT.value: "Vận chuyển/xăng xe",
    TransactionCategory.MARKETING.value: "Quảng cáo/marketing",
    TransactionCategory.OTHER.value: "Khác",
}


def label(category_code: str) -> str:
    """Trả về nhãn tiếng Việt cho mã danh mục; fallback về chính mã đó nếu không có."""
    return CATEGORY_LABELS.get(category_code, category_code)
