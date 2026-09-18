"""
token_service.py
------------------
Quản lý vòng đời refresh token trong DB: phát hành, xoay vòng (rotate) khi
refresh, và thu hồi (revoke) khi logout hoặc đổi mật khẩu.

Chỉ hash (sha256) của token được lưu — xem RefreshToken model.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.refresh_token import RefreshToken


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def issue_refresh_token(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Sinh một refresh token mới (opaque, ngẫu nhiên) cho user, lưu hash vào DB."""
    raw_token = secrets.token_urlsafe(64)
    record = RefreshToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(record)
    await db.flush()
    return raw_token


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> tuple[str, uuid.UUID] | None:
    """
    Xác thực `raw_token`, revoke nó, và cấp một token mới thay thế (rotation).
    Trả về (new_raw_token, user_id), hoặc None nếu token không hợp lệ/hết
    hạn/đã bị revoke trước đó — với một token từng hợp lệ, trường hợp "đã
    bị revoke" là dấu hiệu token có thể đã bị đánh cắp và dùng lại (replay).
    """
    token_hash = _hash_token(raw_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    record = result.scalar_one_or_none()
    if record is None or not record.is_active():
        return None

    new_raw_token = secrets.token_urlsafe(64)
    new_record = RefreshToken(
        user_id=record.user_id,
        token_hash=_hash_token(new_raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_record)
    await db.flush()

    record.revoked_at = datetime.now(timezone.utc)
    record.replaced_by_id = new_record.id
    await db.flush()

    return new_raw_token, record.user_id


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    """Thu hồi một refresh token cụ thể — dùng khi logout."""
    token_hash = _hash_token(raw_token)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    """
    Thu hồi TOÀN BỘ refresh token đang hoạt động của một user — nên gọi khi
    đổi mật khẩu hoặc khi nghi ngờ tài khoản bị xâm nhập, để đăng xuất
    người dùng khỏi mọi thiết bị/phiên khác ngay lập tức.
    """
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )