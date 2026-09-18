"""
report_service.py
-------------------
Lấy giao dịch của user trong 1 tháng từ PostgreSQL (async SQLAlchemy),
chạy qua AI engine (app/services/ai_analysis/) và trả về schema báo cáo.
"""
from __future__ import annotations

import calendar
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.report import CategoryAmount, MonthlySummary, ReportResponse
from app.services.ai_analysis.cashflow_analyzer import CashflowAnalyzer
from app.services.ai_analysis.insight_engine import InsightEngine
from app.services.ai_analysis.labels import label as category_label


async def _get_month_transactions(
    db: AsyncSession, user_id: uuid.UUID, year: int, month: int
) -> list[Transaction]:
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .where(Transaction.transaction_date >= start)
        .where(Transaction.transaction_date <= end)
        .order_by(Transaction.transaction_date)
    )
    return list(result.scalars().all())


def _to_category_amounts(by_category: list[dict]) -> list[CategoryAmount]:
    return [
        CategoryAmount(
            category=item["category"],
            category_label=category_label(item["category"]),
            amount=item["amount"],
            share_pct=item["share_pct"],
        )
        for item in by_category
    ]


def _build_summary(
    year: int, month: int, totals: dict, expense_breakdown: dict, income_breakdown: dict
) -> MonthlySummary:
    return MonthlySummary(
        year=year,
        month=month,
        total_income=totals.get("total_income", 0),
        total_expense=totals.get("total_expense", 0),
        net=totals.get("net", 0),
        transaction_count=totals.get("num_transactions", 0),
        income_by_category=_to_category_amounts(income_breakdown.get("by_category", [])),
        expense_by_category=_to_category_amounts(expense_breakdown.get("by_category", [])),
    )


async def get_monthly_summary(
    db: AsyncSession, user_id: uuid.UUID, year: int, month: int
) -> MonthlySummary:
    """Tổng hợp thu/chi trong tháng, KHÔNG chạy AI insight — dùng cho màn hình nhẹ/nhanh."""
    transactions = await _get_month_transactions(db, user_id, year, month)
    analyzer = CashflowAnalyzer(transactions)
    totals = analyzer.totals()
    expense_breakdown = analyzer.category_breakdown(tx_type="expense")
    income_breakdown = analyzer.category_breakdown(tx_type="income")
    return _build_summary(year, month, totals, expense_breakdown, income_breakdown)


async def get_report_with_insights(
    db: AsyncSession,
    user_id: uuid.UUID,
    year: int,
    month: int,
    current_balance: float | None = None,
) -> ReportResponse:
    """
    Báo cáo đầy đủ: tổng quan, phân bổ danh mục, độ biến động thu nhập, xu
    hướng, giao dịch bất thường (Isolation Forest), dự báo, và danh sách
    nhận xét/khuyến nghị AI ưu tiên theo mức độ quan trọng.

    `current_balance`: số dư tiền mặt hiện tại (tuỳ chọn) — nếu có sẽ tính
    thêm chỉ số "quỹ tiền mặt còn trụ được bao lâu".
    """
    transactions = await _get_month_transactions(db, user_id, year, month)
    engine = InsightEngine(transactions, current_balance=current_balance)
    report = await engine.build_report()

    summary = _build_summary(
        year,
        month,
        report["summary"],
        report["category_breakdown"],
        report.get("income_category_breakdown", {"by_category": []}),
    )

    return ReportResponse(
        summary=summary,
        income_volatility=report.get("income_volatility"),
        trend=report.get("trend"),
        anomalies=report.get("anomalies", []),
        forecast=report.get("forecast") or None,
        cash_runway=report.get("cash_runway"),
        insights=report.get("insights", []),
    )
