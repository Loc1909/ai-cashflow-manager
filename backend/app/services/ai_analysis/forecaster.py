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


# --------------------------------------------------------------------------
# Ensemble tuning constants
#
# Các hằng số dưới đây quyết định cách 3 thành phần (Exponential Smoothing,
# Linear Trend, Day-of-week Seasonality) được blend lại với nhau. Giá trị
# cụ thể được chọn theo kinh nghiệm (empirical), không có công thức toán học
# "đúng" duy nhất — đặt tên rõ ràng ở đây để dễ tinh chỉnh mà không phải mò
# lại ý nghĩa của từng con số rải rác trong thân hàm.
# --------------------------------------------------------------------------

# Dữ liệu lịch sử tối thiểu để chạy ensemble đầy đủ; ít hơn mức này thì dùng
# fallback đơn giản (mean + biến động nhẹ cuối tuần) vì mọi phương pháp
# thống kê phức tạp hơn đều không đáng tin với quá ít điểm dữ liệu.
MIN_TRAINING_DAYS_FOR_ENSEMBLE = 7

# Ngưỡng phân loại "lịch sử ngắn" / "lịch sử trung bình" — dùng để chọn bộ
# trọng số baseline và trend_weight phù hợp.
SHORT_HISTORY_THRESHOLD_DAYS = 14
MEDIUM_HISTORY_THRESHOLD_DAYS = 30

# Hệ số alpha của Exponential Smoothing (mức độ ưu tiên dữ liệu gần đây).
EXP_SMOOTHING_ALPHA = 0.3

# Trọng số blend giữa EMA (nhạy với biến động gần đây) và Mean (ổn định,
# chống nhiễu) khi tính baseline. Lịch sử càng ngắn càng ưu tiên Mean vì
# EMA dễ bị lệch bởi vài điểm dữ liệu đầu.
BASELINE_EMA_WEIGHT_SHORT_HISTORY = 0.65
BASELINE_MEAN_WEIGHT_SHORT_HISTORY = 0.35
BASELINE_EMA_WEIGHT_LONG_HISTORY = 0.75
BASELINE_MEAN_WEIGHT_LONG_HISTORY = 0.25

# Trọng số cho phép trend ảnh hưởng vào forecast, tăng dần khi có nhiều dữ
# liệu hơn để tin tưởng xu hướng đo được hơn.
TREND_WEIGHT_VERY_SHORT_HISTORY = 0.10   # < SHORT_HISTORY_THRESHOLD_DAYS
TREND_WEIGHT_SHORT_HISTORY = 0.20        # < MEDIUM_HISTORY_THRESHOLD_DAYS
TREND_WEIGHT_LONG_HISTORY = 0.30         # >= MEDIUM_HISTORY_THRESHOLD_DAYS

# Giới hạn biên độ điều chỉnh mỗi ngày do trend gây ra, theo tỉ lệ % của
# biên độ trung bình lịch sử — tránh trend ngoại suy phóng đại forecast.
MAX_DAILY_TREND_ADJUSTMENT_RATIO = 0.25

# Mức độ áp dụng mùa vụ theo thứ trong tuần (giảm nhẹ so với mức đo được từ
# lịch sử để tránh overfit khi dữ liệu ít).
SEASONALITY_DAMPING_FACTOR = 0.85

# Biên an toàn: forecast không được vượt quá N lần biên độ trung bình lịch sử.
SAFETY_BOUND_MULTIPLIER = 2.0

# --- Fallback khi dữ liệu quá ít (< MIN_TRAINING_DAYS_FOR_ENSEMBLE) -------
WEEKEND_DAYS = (5, 6)  # Thứ 7, Chủ nhật (Monday=0 theo pandas dayofweek)
WEEKEND_FACTOR = 0.15
WEEKDAY_FACTOR = -0.06
# Sàn biên độ trung bình (VND) để tránh chia/nhân cho một biên độ gần 0 khi
# dữ liệu quá ít và ổn định bất thường.
MIN_MEAN_ABS_FALLBACK = 100_000.0

# --- Ngưỡng đánh giá confidence -------------------------------------------
CONFIDENCE_MIN_TRAINING_DAYS = 10
CONFIDENCE_SHORT_TRAINING_DAYS = 14
CONFIDENCE_HIGH_RELATIVE_ERROR = 0.5
CONFIDENCE_MEDIUM_RELATIVE_ERROR = 1.5


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
    alpha: float = EXP_SMOOTHING_ALPHA,
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

    if training_days < CONFIDENCE_MIN_TRAINING_DAYS:
        return "thap"

    if mean_abs <= 0:
        return "thap"

    relative_error = residual_std / mean_abs

    if training_days < CONFIDENCE_SHORT_TRAINING_DAYS:
        if relative_error < CONFIDENCE_HIGH_RELATIVE_ERROR:
            return "trung_binh"
        return "thap"

    if relative_error < CONFIDENCE_HIGH_RELATIVE_ERROR:
        return "cao"

    if relative_error < CONFIDENCE_MEDIUM_RELATIVE_ERROR:
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

    if training_days < MIN_TRAINING_DAYS_FOR_ENSEMBLE:
        avg = float(series.mean())
        mean_abs = max(float(series.abs().mean()), MIN_MEAN_ABS_FALLBACK)
        last_date = series.index.max() if not series.empty else pd.Timestamp.now()

        forecasts = []
        for day in range(1, days_ahead + 1):
            future_date = last_date + pd.Timedelta(days=day)
            dow = future_date.dayofweek
            # Biến động nhẹ ngày cuối tuần (T7, CN) nếu ít dữ liệu
            dow_factor = WEEKEND_FACTOR if dow in WEEKEND_DAYS else WEEKDAY_FACTOR
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
        alpha=EXP_SMOOTHING_ALPHA,
    )

    if training_days < SHORT_HISTORY_THRESHOLD_DAYS:
        baseline = (
            BASELINE_EMA_WEIGHT_SHORT_HISTORY * exp_level
            + BASELINE_MEAN_WEIGHT_SHORT_HISTORY * mean_daily
        )
    else:
        baseline = (
            BASELINE_EMA_WEIGHT_LONG_HISTORY * exp_level
            + BASELINE_MEAN_WEIGHT_LONG_HISTORY * mean_daily
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

    if training_days < SHORT_HISTORY_THRESHOLD_DAYS:
        trend_weight = TREND_WEIGHT_VERY_SHORT_HISTORY
    elif training_days < MEDIUM_HISTORY_THRESHOLD_DAYS:
        trend_weight = TREND_WEIGHT_SHORT_HISTORY
    else:
        trend_weight = TREND_WEIGHT_LONG_HISTORY

    # Chỉ cho trend ảnh hưởng một phần vào baseline.
    trend_adjustment = (
        slope * trend_weight
    )

    # Giới hạn ảnh hưởng của trend mỗi ngày.
    max_daily_adjustment = max(
        mean_abs * MAX_DAILY_TREND_ADJUSTMENT_RATIO,
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

        season_offset = float(dow_offsets.get(dow, 0.0)) * SEASONALITY_DAMPING_FACTOR

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

    lower_bound = -SAFETY_BOUND_MULTIPLIER * mean_abs
    upper_bound = SAFETY_BOUND_MULTIPLIER * mean_abs

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