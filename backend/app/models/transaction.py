import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class TransactionCategory(str, enum.Enum):
    SALES = "SALES"
    SERVICE = "SERVICE"
    OTHER_INCOME = "OTHER_INCOME"
    FOOD = "FOOD"
    SUPPLIES = "SUPPLIES"
    SALARY = "SALARY"
    UTILITIES = "UTILITIES"
    RENT = "RENT"
    TRANSPORT = "TRANSPORT"
    MARKETING = "MARKETING"
    OTHER = "OTHER"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType), nullable=False, index=True
    )
    # asdecimal=False: by default SQLAlchemy's Numeric returns
    # decimal.Decimal from the DB driver, not float — that would silently
    # contradict the `Mapped[float]` type hint above (mypy/IDE thinks it's
    # a float, the driver actually hands back a Decimal). Every consumer in
    # this codebase already treats amount as a plain float (Pydantic
    # schemas, CashflowAnalyzer's `float(_get(t, "amount"))`, the frontend
    # `number` type), so asdecimal=False makes the runtime type match what
    # the rest of the code already assumes, instead of relying on implicit
    # Decimal->float coercion at every read site.
    amount: Mapped[float] = mapped_column(
        Numeric(15, 0, asdecimal=False), nullable=False
    )
    category: Mapped[TransactionCategory] = mapped_column(
        Enum(TransactionCategory), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", lazy="select")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} type={self.type} amount={self.amount}>"
