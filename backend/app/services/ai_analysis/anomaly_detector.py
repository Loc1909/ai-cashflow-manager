"""
anomaly_detector.py
--------------------
Phát hiện giao dịch chi bất thường bằng Isolation Forest (unsupervised ML),
fallback IQR/Z-score khi ít dữ liệu hoặc chưa cài scikit-learn.
Chạy riêng cho từng TransactionCategory vì thang giá trị mỗi danh mục khác nhau.
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
    upper = q3 + 1.5 * iqr
    lower = q1 - 1.5 * iqr
    return (values > upper) | (values < lower)


def detect_anomalies(df: pd.DataFrame, tx_type: str = "expense", contamination: float = 0.1) -> list[dict]:
    """
    Trả về list dict khớp schema AnomalyItem (app/schemas/report.py):
    transaction_id, transaction_date, category, category_label, amount,
    description, anomaly_score, method, reason.
    """
    if df.empty:
        return []
    sub = df[df.type == tx_type].copy()
    results = []

    for category, group in sub.groupby("category"):
        amounts = group["amount"].values.astype(float)
        n = len(amounts)
        if n < 3:
            continue

        if _HAS_SKLEARN and n >= MIN_SAMPLES_FOR_ML:
            model = IsolationForest(
                contamination=min(contamination, 0.3),
                random_state=42,
                n_estimators=100,
            )
            X = amounts.reshape(-1, 1)
            preds = model.fit_predict(X)            # -1 = bất thường
            scores = -model.score_samples(X)         # càng cao càng bất thường
            flags = preds == -1
            method = "isolation_forest"
        else:
            flags = _iqr_flags(amounts)
            mean, std = amounts.mean(), (amounts.std() or 1.0)
            scores = np.abs((amounts - mean) / std)
            method = "iqr_zscore"

        mean_amount = amounts.mean()
        cat_label = category_label(category)

        for i, is_anom in enumerate(flags):
            if not is_anom:
                continue
            row = group.iloc[i]
            direction = "cao" if row["amount"] > mean_amount else "thấp"
            results.append({
                "transaction_id": row.get("id"),
                "transaction_date": row["date"].date(),
                "category": category,
                "category_label": cat_label,
                "amount": round(float(row["amount"]), 0),
                "description": row.get("description", ""),
                "anomaly_score": round(float(scores[i]), 3),
                "method": method,
                "reason": f"{direction} bất thường so với mức chi trung bình của '{cat_label}' "
                          f"({mean_amount:,.0f}đ)".replace(",", "."),
            })

    results.sort(key=lambda r: r["anomaly_score"], reverse=True)
    return results[:10]
