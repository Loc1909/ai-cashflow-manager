import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.models.transaction import TransactionCategory


class CategoryAmount(BaseModel):
    category: TransactionCategory
    category_label: str
    amount: float
    share_pct: float


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_income: float
    total_expense: float
    net: float
    transaction_count: int
    income_by_category: list[CategoryAmount] = Field(default_factory=list)
    expense_by_category: list[CategoryAmount] = Field(default_factory=list)


class InsightItem(BaseModel):
    level: Literal["critical", "warning", "good", "info"]
    title: str
    message: str
    action: str


class AnomalyItem(BaseModel):
    transaction_id: uuid.UUID | None = None
    transaction_date: date
    category: TransactionCategory
    category_label: str
    amount: float
    description: str | None = None
    anomaly_score: float
    method: str
    reason: str


class TrendData(BaseModel):
    slope: float
    direction: Literal["up", "down", "stable", "insufficient_data"]


class VolatilityData(BaseModel):
    cv: float | None
    mean: float


class ForecastData(BaseModel):
    forecast_total: float | None
    daily_forecast: list[float] = Field(default_factory=list)
    residual_std: float | None = None
    confidence: str


class CashRunway(BaseModel):
    runway_days: float | None
    avg_daily_net: float



class ReportResponse(BaseModel):
    summary: MonthlySummary
    income_volatility: VolatilityData | None = None
    trend: TrendData | None = None
    anomalies: list[AnomalyItem] = Field(default_factory=list)
    forecast: ForecastData | None = None
    cash_runway: CashRunway | None = None
    insights: list[InsightItem] = Field(default_factory=list)
