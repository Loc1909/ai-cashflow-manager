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
    # Income
    SALES = "SALES"              # Product sales revenue
    SERVICE = "SERVICE"          # Service revenue
    OTHER_INCOME = "OTHER_INCOME"  # Other income

    # Expense
    FOOD = "FOOD"                # Food/ingredients
    SUPPLIES = "SUPPLIES"        # Supplies/tools
    SALARY = "SALARY"            # Staff salary
    UTILITIES = "UTILITIES"      # Electricity/water/internet
    RENT = "RENT"                # Premises rent
    TRANSPORT = "TRANSPORT"      # Transport/fuel
    MARKETING = "MARKETING"      # Advertising/marketing
    OTHER = "OTHER"              # Other


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
    amount: Mapped[float] = mapped_column(Numeric(15, 0), nullable=False)
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

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="select")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} type={self.type} amount={self.amount}>"
