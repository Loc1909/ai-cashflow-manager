import structlog
from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.core.config import settings
from app.core.cookies import REFRESH_COOKIE_NAME, clear_auth_cookies, set_auth_cookies
from app.core.rate_limit import limiter
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import AuthResponse, UserLogin, UserRead, UserRegister, UserUpdate
from app.services import token_service

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = structlog.get_logger(__name__)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit(lambda: settings.RATE_LIMIT_REGISTER)
async def register(request: Request, response: Response, data: UserRegister, db: DbSession) -> AuthResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        business_name=data.business_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    refresh_token = await token_service.issue_refresh_token(db, user.id)
    set_auth_cookies(response, access_token, refresh_token)

    logger.info("user_registered", user_id=str(user.id))
    return AuthResponse(user=UserRead.model_validate(user))


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="User login — sets httpOnly access/refresh cookies",
)
@limiter.limit(lambda: settings.RATE_LIMIT_LOGIN)
async def login(request: Request, response: Response, data: UserLogin, db: DbSession) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        logger.warning("login_failed", email=data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = await token_service.issue_refresh_token(db, user.id)
    set_auth_cookies(response, access_token, refresh_token)

    logger.info("login_succeeded", user_id=str(user.id))
    return AuthResponse(user=UserRead.model_validate(user))


@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Rotate refresh token and issue a new access token",
)
async def refresh(request: Request, response: Response, db: DbSession) -> AuthResponse:
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    rotated = await token_service.rotate_refresh_token(db, raw_refresh_token)
    if rotated is None:
        clear_auth_cookies(response)
        logger.warning("refresh_token_rejected")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_refresh_token, user_id = rotated
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

    access_token = create_access_token(subject=str(user.id))
    set_auth_cookies(response, access_token, new_refresh_token)

    logger.info("token_refreshed", user_id=str(user.id))
    return AuthResponse(user=UserRead.model_validate(user))


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke refresh token and clear auth cookies",
)
async def logout(request: Request, response: Response, db: DbSession) -> None:
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh_token:
        await token_service.revoke_refresh_token(db, raw_refresh_token)
    clear_auth_cookies(response)


@router.get("/me", response_model=UserRead, summary="Get current user profile")
async def get_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead, summary="Update current user profile")
async def update_me(data: UserUpdate, current_user: CurrentUser, db: DbSession) -> UserRead:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)