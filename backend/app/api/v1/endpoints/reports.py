from datetime import date

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUser, DbSession
from app.schemas.report import MonthlySummary, ReportResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/monthly",
    response_model=ReportResponse,
    summary="Monthly financial report with AI insights",
)
async def get_monthly_report(
    current_user: CurrentUser,
    db: DbSession,
    year: int = Query(default=date.today().year, ge=2020, le=2100),
    month: int = Query(default=date.today().month, ge=1, le=12),
    current_balance: float | None = Query(
        default=None,
        description="Số dư tiền mặt hiện tại (tuỳ chọn) — dùng để tính quỹ tiền mặt còn trụ được bao lâu",
    ),
) -> ReportResponse:
    """
    Returns monthly summary of income/expense + AI insights.
    AI insights are generated if there is at least 1 transaction in the month.
    """
    return await report_service.get_report_with_insights(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
        current_balance=current_balance,
    )


@router.get(
    "/summary",
    response_model=MonthlySummary,
    summary="Monthly summary without AI insights",
)
async def get_monthly_summary(
    current_user: CurrentUser,
    db: DbSession,
    year: int = Query(default=date.today().year, ge=2020, le=2100),
    month: int = Query(default=date.today().month, ge=1, le=12),
) -> MonthlySummary:
    return await report_service.get_monthly_summary(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
    )
