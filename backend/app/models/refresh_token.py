import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RefreshToken(Base):
    """
    Lưu HASH (sha256) của refresh token — KHÔNG BAO GIỜ lưu raw token, y
    hệt nguyên tắc không lưu plaintext password. Nhờ bảng này mà refresh
    token (khác với access token JWT) có thể:

    - Revoke một token cụ thể khi logout.
    - Revoke toàn bộ token của một user khi đổi mật khẩu / nghi ngờ bị
      chiếm tài khoản (xem token_service.revoke_all_for_user).
    - Rotate: mỗi lần gọi /auth/refresh, token cũ bị revoke ngay và một
      token mới được cấp thay thế — nếu một refresh token bị đánh cắp và
      dùng lại (replay) sau khi chủ tài khoản đã refresh, request đó sẽ
      thất bại vì token đã bị revoke.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    # Trỏ tới token đã thay thế token này (rotation) — hữu ích để audit lại
    # cả chuỗi refresh nếu cần revoke toàn bộ do nghi ngờ bị lộ.
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    def is_active(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.now(timezone.utc)

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id} user_id={self.user_id} active={self.is_active()}>"