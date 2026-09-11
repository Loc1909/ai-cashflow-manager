import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionCategory, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionUpdate


async def create(
    db: AsyncSession, user_id: uuid.UUID, data: TransactionCreate
) -> Transaction:
    transaction = Transaction(
        user_id=user_id,
        receipt_id=data.receipt_id,
        type=data.type,
        amount=data.amount,
        category=data.category,
        description=data.description,
        merchant_name=data.merchant_name,
        transaction_date=data.transaction_date,
    )
    db.add(transaction)
    await db.flush()
    await db.refresh(transaction)
    return transaction


async def get_by_id(
    db: AsyncSession, transaction_id: uuid.UUID, user_id: uuid.UUID
) -> Transaction | None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    type_filter: TransactionType | None = None,
    category_filter: TransactionCategory | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Transaction], int]:
    query = select(Transaction).where(Transaction.user_id == user_id)
    count_query = select(func.count()).select_from(Transaction).where(
        Transaction.user_id == user_id
    )

    if type_filter:
        query = query.where(Transaction.type == type_filter)
        count_query = count_query.where(Transaction.type == type_filter)
    if category_filter:
        query = query.where(Transaction.category == category_filter)
        count_query = count_query.where(Transaction.category == category_filter)
    if date_from:
        query = query.where(Transaction.transaction_date >= date_from)
        count_query = count_query.where(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.where(Transaction.transaction_date <= date_to)
        count_query = count_query.where(Transaction.transaction_date <= date_to)

    query = (
        query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update(
    db: AsyncSession,
    transaction: Transaction,
    data: TransactionUpdate,
) -> Transaction:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    await db.flush()
    await db.refresh(transaction)
    return transaction


async def delete(db: AsyncSession, transaction: Transaction) -> None:
    await db.delete(transaction)
    await db.flush()
