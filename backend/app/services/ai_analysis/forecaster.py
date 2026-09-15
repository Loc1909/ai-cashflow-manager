"""
forecaster.py
--------------
Dự báo dòng tiền ngắn hạn: Linear Regression (xu hướng dài hạn) +
Exponential Smoothing (phản ứng nhanh biến động gần đây), kết hợp có trọng số.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

try:
    from sklearn.linear_model import LinearRegression
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


def _linear_forecast(series: pd.Series, steps: int):
    y = series.values.astype(float)
    x = np.arange(len(y)).reshape(-1, 1)

    if _HAS_SKLEARN:
        model = LinearRegression().fit(x, y)
        residual_std = float(np.std(y - model.predict(x)))
        future_x = np.arange(len(y), len(y) + steps).reshape(-1, 1)
        preds = model.predict(future_x)
    else:
        slope, intercept = np.polyfit(x.flatten(), y, 1)
        residual_std = float(np.std(y - (slope * x.flatten() + intercept)))
        future_idx = np.arange(len(y), len(y) + steps)
        preds = slope * future_idx + intercept

    return preds, residual_std


def _exp_smoothing_forecast(series: pd.Series, steps: int, alpha: float = 0.3) -> np.ndarray:
    y = series.values.astype(float)
    level = y[0]
    for v in y[1:]:
        level = alpha * v + (1 - alpha) * level
    return np.full(steps, level)


def forecast_net_cashflow(df: pd.DataFrame, days_ahead: int = 30) -> dict:
    """Dự báo dòng tiền ròng cho `days_ahead` ngày tới. Trả về dict khớp schema ForecastData."""
    if df.empty:
        return {"forecast_total": None, "daily_forecast": [], "residual_std": None, "confidence": "khong_du_du_lieu"}

    daily = df.copy()
    daily["signed"] = np.where(daily.type == "income", daily.amount, -daily.amount)
    series = daily.groupby(pd.Grouper(key="date", freq="D"))["signed"].sum().fillna(0.0)

    if len(series) < 7:
        avg = float(series.mean())
        return {
            "forecast_total": round(avg * days_ahead, 0),
            "daily_forecast": [round(avg, 0)] * days_ahead,
            "residual_std": None,
            "confidence": "thap_du_lieu_it",
        }

    lin_preds, residual_std = _linear_forecast(series, days_ahead)
    exp_preds = _exp_smoothing_forecast(series, days_ahead)

    # Trọng số: tin xu hướng dài hạn 60%, phản ứng ngắn hạn 40%
    blended = 0.6 * lin_preds + 0.4 * exp_preds

    mean_abs = abs(series.mean()) or 1.0
    confidence = "cao" if residual_std < mean_abs else "trung_binh"

    return {
        "forecast_total": round(float(blended.sum()), 0),
        "daily_forecast": [round(float(v), 0) for v in blended],
        "residual_std": round(residual_std, 0),
        "confidence": confidence,
    }
