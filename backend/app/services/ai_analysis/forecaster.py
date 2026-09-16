"""
forecaster.py
--------------
Dự báo dòng tiền ròng ngắn hạn bằng ensemble:
Baseline + Exponential Smoothing + Damped Linear Trend.

Thiết kế ưu tiên ổn định khi dữ liệu lịch sử còn ít.
Đây là baseline dự báo, không phải dự báo chắc chắn.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

try:
    from sklearn.linear_model import LinearRegression
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


def _linear_slope(series: pd.Series) -> tuple[float, float]:
    """Trả về slope và residual_std của Linear Regression."""
    y = series.astype(float).to_numpy()
    x = np.arange(len(y), dtype=float)

    if len(y) < 2:
        return 0.0, 0.0

    if _HAS_SKLEARN:
        model = LinearRegression().fit(
            x.reshape(-1, 1),
            y,
        )
        fitted = model.predict(
            x.reshape(-1, 1)
        )
        slope = float(model.coef_[0])
    else:
        slope, intercept = np.polyfit(x, y, 1)
        fitted = slope * x + intercept

    residual_std = float(
        np.std(y - fitted)
    )

    return float(slope), residual_std


def _exp_smoothing_level(
    series: pd.Series,
    alpha: float = 0.3,
) -> float:
    """Tính mức dòng tiền gần đây bằng Exponential Smoothing."""
    y = series.astype(float).to_numpy()

    if len(y) == 0:
        return 0.0

    level = float(y[0])

    for value in y[1:]:
        level = (
            alpha * float(value)
            + (1 - alpha) * level
        )

    return float(level)


def _calculate_confidence(
    training_days: int,
    residual_std: float,
    mean_abs: float,
) -> str:
    """Đánh giá confidence dựa trên lượng dữ liệu và sai số."""

    if training_days < 10:
        return "thap"

    if mean_abs <= 0:
        return "thap"

    relative_error = residual_std / mean_abs

    if training_days < 14:
        if relative_error < 0.5:
            return "trung_binh"
        return "thap"

    if relative_error < 0.5:
        return "cao"

    if relative_error < 1.5:
        return "trung_binh"

    return "thap"


def forecast_net_cashflow(
    df: pd.DataFrame,
    days_ahead: int = 30,
) -> dict:

    if df.empty:
        return {
            "forecast_total": None,
            "daily_forecast": [],
            "residual_std": None,
            "confidence": "khong_du_du_lieu",
            "training_days": 0,
        }

    daily = df.copy()

    daily["signed"] = np.where(
        daily.type == "income",
        daily.amount,
        -daily.amount,
    )

    series = (
        daily.groupby(
            pd.Grouper(
                key="date",
                freq="D",
            )
        )["signed"]
        .sum()
        .fillna(0.0)
    )

    training_days = int(len(series))

    # ---------------------------------------------------------
    # Dữ liệu quá ít
    # ---------------------------------------------------------

    if training_days < 7:
        avg = float(series.mean())
        mean_abs = max(float(series.abs().mean()), 100000.0)
        last_date = series.index.max() if not series.empty else pd.Timestamp.now()

        forecasts = []
        for day in range(1, days_ahead + 1):
            future_date = last_date + pd.Timedelta(days=day)
            dow = future_date.dayofweek
            # Biến động nhẹ ngày cuối tuần (T7, CN) nếu ít dữ liệu
            dow_factor = 0.15 if dow in (5, 6) else -0.06
            val = avg + mean_abs * dow_factor
            forecasts.append(round(val, 0))

        return {
            "forecast_total": round(sum(forecasts), 0),
            "daily_forecast": forecasts,
            "residual_std": None,
            "confidence": "thap_du_lieu_it",
            "training_days": training_days,
        }

    values = series.to_numpy(dtype=float)

    mean_daily = float(
        np.mean(values)
    )

    mean_abs = float(
        np.mean(np.abs(values))
    )

    if mean_abs <= 0:
        mean_abs = 1.0

    # ---------------------------------------------------------
    # Baseline
    # ---------------------------------------------------------
    #
    # Exponential Smoothing phản ánh dữ liệu gần đây.
    # Mean daily giúp forecast không bị trend kéo lệch quá mạnh.
    # ---------------------------------------------------------

    exp_level = _exp_smoothing_level(
        series,
        alpha=0.3,
    )

    if training_days < 14:
        baseline = (
            0.65 * exp_level
            + 0.35 * mean_daily
        )
    else:
        baseline = (
            0.75 * exp_level
            + 0.25 * mean_daily
        )

    # ---------------------------------------------------------
    # Linear Trend
    # ---------------------------------------------------------

    slope, residual_std = _linear_slope(
        series
    )

    # ---------------------------------------------------------
    # Damped trend
    # ---------------------------------------------------------
    #
    # Dữ liệu càng ít -> càng ít tin vào trend.
    #
    # Không cho trend tích lũy vô hạn trong 30 ngày.
    # ---------------------------------------------------------

    if training_days < 14:
        trend_weight = 0.10
    elif training_days < 30:
        trend_weight = 0.20
    else:
        trend_weight = 0.30

    # Chỉ cho trend ảnh hưởng một phần vào baseline.
    trend_adjustment = (
        slope * trend_weight
    )

    # Giới hạn ảnh hưởng của trend mỗi ngày.
    max_daily_adjustment = max(
        mean_abs * 0.25,
        1.0,
    )

    trend_adjustment = float(
        np.clip(
            trend_adjustment,
            -max_daily_adjustment,
            max_daily_adjustment,
        )
    )

    # ---------------------------------------------------------
    # Day-of-week Seasonality (Chu kỳ theo thứ trong tuần)
    # ---------------------------------------------------------
    dow_means = series.groupby(series.index.dayofweek).mean()
    dow_offsets = (dow_means - mean_daily).to_dict()

    # ---------------------------------------------------------
    # Tạo forecast
    # ---------------------------------------------------------
    last_date = series.index.max()
    forecasts = []

    for day in range(1, days_ahead + 1):
        future_date = last_date + pd.Timedelta(days=day)
        dow = future_date.dayofweek

        # Trend giảm dần khi càng dự báo xa.
        damping = np.exp(
            -day / max(
                training_days,
                1,
            )
        )

        season_offset = float(dow_offsets.get(dow, 0.0)) * 0.85

        daily_value = (
            baseline
            + trend_adjustment * damping
            + season_offset
        )

        forecasts.append(
            float(daily_value)
        )

    blended = np.array(
        forecasts,
        dtype=float,
    )

    # ---------------------------------------------------------
    # Safety bounds
    # ---------------------------------------------------------
    #
    # Forecast vẫn được phép âm.
    # Chỉ giới hạn trường hợp giá trị vượt quá xa
    # quy mô lịch sử.
    # ---------------------------------------------------------

    lower_bound = -2.0 * mean_abs
    upper_bound = 2.0 * mean_abs

    blended = np.clip(
        blended,
        lower_bound,
        upper_bound,
    )

    # ---------------------------------------------------------
    # Confidence
    # ---------------------------------------------------------

    confidence = _calculate_confidence(
        training_days,
        residual_std,
        mean_abs,
    )

    return {
        "forecast_total": round(
            float(blended.sum()),
            0,
        ),
        "daily_forecast": [
            round(float(v), 0)
            for v in blended
        ],
        "residual_std": round(
            residual_std,
            0,
        ),
        "confidence": confidence,
        "training_days": training_days,
    }