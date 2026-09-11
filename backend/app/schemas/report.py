from datetime import date
from typing import Any

from pydantic import BaseModel

from app.models.transaction import TransactionCategory, TransactionType


class CategoryBreakdown(BaseModel):
    category: TransactionCategory
    total_amount: float
    count: int
    percentage: float


class DailyCashflow(BaseModel):
    date: date
    income: float
    expense: float
    net: float


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_income: float
    total_expense: float
    net_cashflow: float
    transaction_count: int
    top_expense_categories: list[CategoryBreakdown]
    top_income_categories: list[CategoryBreakdown]
    daily_cashflow: list[DailyCashflow]


class AIInsights(BaseModel):
    """AI-generated cash flow insights and suggestions."""
    summary: str                        # Tóm tắt ngắn gọn
    health_score: int                   # Điểm sức khỏe tài chính 0-100
    insights: list[str]                 # Danh sách nhận xét
    suggestions: list[str]              # Gợi ý tối ưu
    warning_categories: list[str]       # Danh mục chi phí cần chú ý
    generated_at: str


class ReportResponse(BaseModel):
    summary: MonthlySummary
    ai_insights: AIInsights | None = None
