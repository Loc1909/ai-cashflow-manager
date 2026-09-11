import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.models.transaction import TransactionCategory, TransactionType
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post(
    "/",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create transaction manually",
)
async def create_transaction(
    data: TransactionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionRead:
    transaction = await transaction_service.create(db, current_user.id, data)
    return TransactionRead.model_validate(transaction)


@router.get("/", response_model=TransactionListResponse, summary="List transactions")
async def list_transactions(
    current_user: CurrentUser,
    db: DbSession,
    type: TransactionType | None = Query(None, description="Filter by type: income/expense"),
    category: TransactionCategory | None = Query(None, description="Filter by category"),
    date_from: date | None = Query(None, description="From date (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="To date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> TransactionListResponse:
    items, total = await transaction_service.list_transactions(
        db=db,
        user_id=current_user.id,
        type_filter=type,
        category_filter=category,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return TransactionListResponse(
        items=[TransactionRead.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{transaction_id}", response_model=TransactionRead, summary="Get transaction detail")
async def get_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionRead:
    transaction = await transaction_service.get_by_id(db, transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return TransactionRead.model_validate(transaction)


@router.patch("/{transaction_id}", response_model=TransactionRead, summary="Update transaction")
async def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionRead:
    transaction = await transaction_service.get_by_id(db, transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    updated = await transaction_service.update(db, transaction, data)
    return TransactionRead.model_validate(updated)


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete transaction",
)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    transaction = await transaction_service.get_by_id(db, transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    await transaction_service.delete(db, transaction)

