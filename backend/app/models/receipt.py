import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReceiptStatus(str, enum.Enum):
    draft = "draft"          # Vừa scan xong, chờ user confirm
    confirmed = "confirmed"  # Đã confirm và tạo transaction
    rejected = "rejected"    # User bỏ qua


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Lưu ảnh hóa đơn dưới dạng base64 hoặc path
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Kết quả OCR từ AI (raw JSON)
    ocr_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    status: Mapped[ReceiptStatus] = mapped_column(
        Enum(ReceiptStatus), default=ReceiptStatus.draft, nullable=False, index=True
    )

    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship: 1 receipt → 1 transaction (sau khi confirmed)
    transaction: Mapped["Transaction | None"] = relationship(  # type: ignore[name-defined]
        "Transaction", back_populates="receipt", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Receipt id={self.id} status={self.status}>"
