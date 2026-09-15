"""
anomaly_detector.py
-------------------
Phát hiện giao dịch chi bất thường.

- >= 12 mẫu trong từng danh mục: Isolation Forest.
- ít mẫu: IQR + robust z-score.
- Chỉ phân tích expense để tránh coi doanh thu lớn là "bất thường".
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.services.ai_analysis.labels import label as category_label

try:
    from sklearn.ensemble import IsolationForest
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False

MIN_SAMPLES_FOR_ML = 12


def _iqr_flags(values: np.ndarray) -> np.ndarray:
    q1, q3 = np.percentile(values, [25, 75])
    iqr = q3 - q1
    if iqr == 0:
        # Khi phần lớn giao dịch có cùng giá trị, chỉ đánh dấu
        # các điểm khác biệt rõ rệt.
        median = float(np.median(values))
        return np.abs(values - median) > max(abs(median) * 0.5, 1.0)
    upper = q3 + 1.5 * iqr
    lower = max(0.0, q1 - 1.5 * iqr)
    return (values > upper) | (values < lower)


def detect_anomalies(
    df: pd.DataFrame,
    tx_type: str = "expense",
    contamination: float = 0.1,
) -> list[dict]:
    if df.empty or "type" not in df.columns:
        return []

    sub = df[df.type == tx_type].copy()
    results = []

    for category, group in sub.groupby("category"):
        amounts = group["amount"].astype(float).to_numpy()
        n = len(amounts)
        if n < 3:
            continue

        if _HAS_SKLEARN and n >= MIN_SAMPLES_FOR_ML:
            model = IsolationForest(
                contamination=min(max(contamination, 0.01), 0.3),
                random_state=42,
                n_estimators=150,
            )
            X = amounts.reshape(-1, 1)
            preds = model.fit_predict(X)
            scores = -model.score_samples(X)
            flags = preds == -1
            method = "isolation_forest"
        else:
            flags = _iqr_flags(amounts)
            mean = float(amounts.mean())
            std = float(amounts.std())
            scores = np.abs((amounts - mean) / (std or 1.0))
            method = "iqr_zscore"

        mean_amount = float(amounts.mean())
        median_amount = float(np.median(amounts))
        cat_label = category_label(category)

        for i, is_anom in enumerate(flags):
            if not is_anom:
                continue
            row = group.iloc[i]
            direction = "cao" if float(row["amount"]) > mean_amount else "thấp"
            results.append({
                "transaction_id": row.get("id"),
                "transaction_date": row["date"].date(),
                "category": category,
                "category_label": cat_label,
                "amount": round(float(row["amount"]), 0),
                "description": row.get("description", ""),
                "anomaly_score": round(float(scores[i]), 3),
                "method": method,
                "reason": (
                    f"{direction} bất thường so với mức chi trung bình của "
                    f"'{cat_label}' ({mean_amount:,.0f}đ); "
                    f"trung vị {median_amount:,.0f}đ"
                ).replace(",", "."),
            })

    results.sort(key=lambda r: r["anomaly_score"], reverse=True)
    return results[:10]
