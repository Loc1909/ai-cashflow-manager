import uuid
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cookies import ACCESS_COOKIE_NAME
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """
    Đọc access token ưu tiên từ cookie httpOnly `access_token` — đây là
    đường dùng chính của web app (trình duyệt tự đính kèm cookie, JS không
    cần và không thể đọc token).

    Fallback sang header `Authorization: Bearer <token>` nếu không có
    cookie, để Swagger UI (/docs) và các API client khác (không gửi cookie
    của web app) vẫn dùng được — cùng một hàm decode_access_token, cùng
    một mức bảo mật, chỉ khác nơi lấy token.
    """
    token = access_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id_str = decode_access_token(token)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is disabled",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]