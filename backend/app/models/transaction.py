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
    # Thu nhập
    SALES = "SALES"          # Doanh thu bán hàng
    SERVICE = "SERVICE"      # Doanh thu dịch vụ
    OTHER_INCOME = "OTHER_INCOME"  # Thu khác

    # Chi phí
    FOOD = "FOOD"            # Thực phẩm/nguyên liệu
    SUPPLIES = "SUPPLIES"    # Vật tư/dụng cụ
    SALARY = "SALARY"        # Lương nhân viên
    UTILITIES = "UTILITIES"  # Điện/nước/internet
    RENT = "RENT"            # Thuê mặt bằng
    TRANSPORT = "TRANSPORT"  # Vận chuyển/xăng xe
    MARKETING = "MARKETING"  # Quảng cáo/marketing
    OTHER = "OTHER"          # Khác


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
    receipt_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("receipts.id", ondelete="SET NULL"),
        nullable=True,
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
    receipt: Mapped["Receipt | None"] = relationship("Receipt", back_populates="transaction", lazy="select")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} type={self.type} amount={self.amount}>"
