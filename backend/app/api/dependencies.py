import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# auto_error=False: with the default HTTPBearer(), a request with NO
# Authorization header at all gets rejected by FastAPI itself with a 403
# before this function ever runs. A request with a present-but-invalid/
# expired token, on the other hand, reaches get_current_user() and gets a
# 401 from the explicit check below. Two different failure reasons that
# both mean "not authenticated" shouldn't produce two different status
# codes — the frontend's axios interceptor only reacts to 401. Disabling
# auto_error lets us handle the "missing token" case ourselves and return
# the same 401 both ways.
security = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]
BearerToken = Annotated[HTTPAuthorizationCredentials | None, Depends(security)]


async def get_current_user(
    token: BearerToken,
    db: DbSession,
) -> User:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = decode_access_token(token.credentials)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
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