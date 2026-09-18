"""
cookies.py
-----------
Tập trung logic set/clear cookie xác thực ở một chỗ để login, register,
refresh, logout đều set cookie NHẤT QUÁN (cùng path, cùng flag bảo mật) —
tránh tình trạng một endpoint set cookie thiếu `secure`/`samesite` do
copy-paste sai.
"""
from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"

# Refresh token chỉ thật sự cần thiết ở các endpoint dưới /auth — giới hạn
# path để trình duyệt không tự đính kèm nó vào những request khác không
# cần đến (giảm bề mặt lộ, dù cookie đã httpOnly nên JS không đọc được).
_REFRESH_COOKIE_PATH = f"{settings.API_V1_PREFIX}/auth"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path=_REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/", domain=settings.COOKIE_DOMAIN)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=_REFRESH_COOKIE_PATH, domain=settings.COOKIE_DOMAIN)