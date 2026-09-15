"""
cashflow_analyzer.py
---------------------
Thống kê & phân tích dòng tiền — khớp trực tiếp với model Transaction thật
của project (app/models/transaction.py):

    id                : uuid.UUID
    type              : TransactionType  ("income" | "expense")
    amount            : Numeric -> Decimal/float
    category          : TransactionCategory (enum)
    transaction_date  : date
    description       : str | None

Không gọi AI/LLM ngoài — toàn bộ là thống kê/ML chạy local bằng
pandas + numpy (+ scikit-learn nếu có).
"""
from __future__ import annotations

from typing import Any, Iterable, Optional

import numpy as np
import pandas as pd


def _enum_val(x: Any) -> Any:
    """Lấy .value nếu x là Enum (TransactionType/TransactionCategory), giữ nguyên nếu không."""
    return x.value if hasattr(x, "value") else x


def _get(obj: Any, field: str) -> Any:
    """Đọc field cả khi obj là dict hoặc ORM object (SQLAlchemy model)."""
    if isinstance(obj, dict):
        return obj.get(field)
    return getattr(obj, field, None)


def to_dataframe(transactions: Iterable[Any]) -> pd.DataFrame:
    """Chuẩn hoá list Transaction (ORM object hoặc dict) thành DataFrame sạch."""
    rows = []
    for t in transactions:
        rows.append({
            "id": _get(t, "id"),
            "date": _get(t, "transaction_date"),
            "type": _enum_val(_get(t, "type")),
            "amount": float(_get(t, "amount") or 0),
            "category": _enum_val(_get(t, "category")),
            "description": _get(t, "description") or "",
        })
    df = pd.DataFrame(rows, columns=["id", "date", "type", "amount", "category", "description"])
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


class CashflowAnalyzer:
    """Tính các chỉ số thống kê nền tảng từ danh sách Transaction."""

    def __init__(self, transactions: Iterable[Any]):
        self.df = to_dataframe(transactions)

    def is_empty(self) -> bool:
        return self.df.empty

    # ---------- Tổng quan ----------
    def totals(self) -> dict:
        df = self.df
        income = df.loc[df.type == "income", "amount"].sum() if not df.empty else 0.0
        expense = df.loc[df.type == "expense", "amount"].sum() if not df.empty else 0.0
        return {
            "total_income": round(float(income), 0),
            "total_expense": round(float(expense), 0),
            "net": round(float(income - expense), 0),
            "num_transactions": int(len(df)),
        }

    # ---------- Chuỗi thời gian ----------
    def period_series(self, freq: str = "D", tx_type: Optional[str] = None) -> pd.Series:
        """
        Tổng hợp theo chu kỳ (freq='D' ngày / 'W' tuần / 'M' tháng).
        tx_type=None -> net (income - expense); 'income'/'expense' -> tổng riêng loại đó.
        """
        if self.df.empty:
            return pd.Series(dtype=float)
        df = self.df.copy()
        if tx_type:
            df = df[df.type == tx_type]
            series = df.groupby(pd.Grouper(key="date", freq=freq))["amount"].sum()
        else:
            df["signed"] = np.where(df.type == "income", df.amount, -df.amount)
            series = df.groupby(pd.Grouper(key="date", freq=freq))["signed"].sum()
        return series.fillna(0.0)

    # ---------- Phân bổ theo danh mục ----------
    def category_breakdown(self, tx_type: str = "expense") -> dict:
        """
        Tổng theo từng danh mục + tỉ trọng % + chỉ số tập trung HHI
        (Herfindahl-Hirschman Index): 0 = phân tán đều, 1 = dồn hết vào 1 danh mục.
        """
        df = self.df
        if df.empty:
            return {"by_category": [], "hhi": 0.0, "top_category": None}
        sub = df[df.type == tx_type]
        total = sub["amount"].sum()
        if total == 0:
            return {"by_category": [], "hhi": 0.0, "top_category": None}
        grouped = sub.groupby("category")["amount"].sum().sort_values(ascending=False)
        shares = grouped / total
        hhi = float((shares ** 2).sum())
        by_category = [
            {"category": cat, "amount": round(float(v), 0), "share_pct": round(float(shares[cat]) * 100, 1)}
            for cat, v in grouped.items()
        ]
        return {
            "by_category": by_category,
            "hhi": round(hhi, 3),
            "top_category": by_category[0]["category"] if by_category else None,
        }

    # ---------- Biến động thu nhập ----------
    def income_volatility(self, freq: str = "W") -> dict:
        """Hệ số biến thiên (CV) của thu nhập theo tuần: CV>0.6 nghĩa là thu nhập bấp bênh."""
        series = self.period_series(freq=freq, tx_type="income")
        if len(series) < 2 or series.mean() == 0:
            return {"cv": None, "mean": float(series.mean()) if len(series) else 0.0}
        cv = float(series.std() / series.mean())
        return {"cv": round(cv, 3), "mean": round(float(series.mean()), 0)}

    # ---------- Xu hướng ----------
    def trend(self, freq: str = "D") -> dict:
        """Hồi quy tuyến tính trên chuỗi dòng tiền ròng để xác định xu hướng tăng/giảm."""
        series = self.period_series(freq=freq)
        if len(series) < 3:
            return {"slope": 0.0, "direction": "khong_du_du_lieu"}
        y = series.values.astype(float)
        x = np.arange(len(y))
        slope, intercept = np.polyfit(x, y, 1)
        direction = "tang" if slope > 1 else ("giam" if slope < -1 else "on_dinh")
        return {"slope": round(float(slope), 2), "direction": direction}

    # ---------- Quỹ tiền mặt còn trụ được bao lâu ----------
    def cash_runway_days(self, current_balance: float, lookback_days: int = 30) -> dict:
        """Ước tính số ngày quỹ tiền mặt còn trụ dựa trên burn rate trung bình gần đây."""
        if self.df.empty:
            return {"runway_days": None, "avg_daily_net": 0.0}
        cutoff = self.df.date.max() - pd.Timedelta(days=lookback_days)
        recent = self.df[self.df.date >= cutoff]
        if recent.empty:
            return {"runway_days": None, "avg_daily_net": 0.0}
        signed = np.where(recent.type == "income", recent.amount, -recent.amount)
        avg_daily_net = float(signed.sum() / max(lookback_days, 1))
        if avg_daily_net >= 0:
            return {"runway_days": None, "avg_daily_net": round(avg_daily_net, 0)}
        runway = current_balance / abs(avg_daily_net)
        return {"runway_days": round(float(runway), 1), "avg_daily_net": round(avg_daily_net, 0)}
