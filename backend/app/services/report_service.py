import uuid
from calendar import monthrange
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionCategory, TransactionType
from app.schemas.report import (
    AIInsights,
    CategoryBreakdown,
    DailyCashflow,
    MonthlySummary,
    ReportResponse,
)
from app.services import ai_service


async def get_monthly_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    year: int,
    month: int,
) -> MonthlySummary:
    _, days_in_month = monthrange(year, month)
    date_from = date(year, month, 1)
    date_to = date(year, month, days_in_month)

    # All transactions for the period
    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
    )
    transactions = list(result.scalars().all())

    # Aggregate totals
    total_income = sum(float(t.amount) for t in transactions if t.type == TransactionType.income)
    total_expense = sum(float(t.amount) for t in transactions if t.type == TransactionType.expense)

    # Category breakdowns
    expense_by_cat: dict[str, float] = {}
    income_by_cat: dict[str, float] = {}
    expense_count: dict[str, int] = {}
    income_count: dict[str, int] = {}

    for t in transactions:
        cat = t.category.value
        amount = float(t.amount)
        if t.type == TransactionType.expense:
            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + amount
            expense_count[cat] = expense_count.get(cat, 0) + 1
        else:
            income_by_cat[cat] = income_by_cat.get(cat, 0) + amount
            income_count[cat] = income_count.get(cat, 0) + 1

    top_expense = sorted(
        [
            CategoryBreakdown(
                category=TransactionCategory(cat),
                total_amount=amt,
                count=expense_count[cat],
                percentage=(amt / total_expense * 100) if total_expense > 0 else 0,
            )
            for cat, amt in expense_by_cat.items()
        ],
        key=lambda x: x.total_amount,
        reverse=True,
    )[:5]

    top_income = sorted(
        [
            CategoryBreakdown(
                category=TransactionCategory(cat),
                total_amount=amt,
                count=income_count[cat],
                percentage=(amt / total_income * 100) if total_income > 0 else 0,
            )
            for cat, amt in income_by_cat.items()
        ],
        key=lambda x: x.total_amount,
        reverse=True,
    )[:5]

    # Daily cashflow
    daily: dict[date, dict] = {
        date(year, month, d): {"income": 0.0, "expense": 0.0}
        for d in range(1, days_in_month + 1)
    }
    for t in transactions:
        d = t.transaction_date
        if t.type == TransactionType.income:
            daily[d]["income"] += float(t.amount)
        else:
            daily[d]["expense"] += float(t.amount)

    daily_cashflow = [
        DailyCashflow(
            date=d,
            income=vals["income"],
            expense=vals["expense"],
            net=vals["income"] - vals["expense"],
        )
        for d, vals in sorted(daily.items())
    ]

    return MonthlySummary(
        year=year,
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        net_cashflow=total_income - total_expense,
        transaction_count=len(transactions),
        top_expense_categories=top_expense,
        top_income_categories=top_income,
        daily_cashflow=daily_cashflow,
    )


async def get_report_with_insights(
    db: AsyncSession,
    user_id: uuid.UUID,
    year: int,
    month: int,
) -> ReportResponse:
    summary = await get_monthly_summary(db, user_id, year, month)

    insights: AIInsights | None = None
    if summary.transaction_count > 0:
        insights = await ai_service.generate_insights(
            year=year,
            month=month,
            total_income=summary.total_income,
            total_expense=summary.total_expense,
            expense_breakdown=[
                {
                    "category": c.category.value,
                    "total_amount": c.total_amount,
                    "percentage": c.percentage,
                }
                for c in summary.top_expense_categories
            ],
            income_breakdown=[
                {
                    "category": c.category.value,
                    "total_amount": c.total_amount,
                    "percentage": c.percentage,
                }
                for c in summary.top_income_categories
            ],
        )

    return ReportResponse(summary=summary, ai_insights=insights)
