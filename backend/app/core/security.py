import bcrypt
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(subject: str) -> str:
    """
    Access token JWT sống NGẮN (mặc định 15 phút — xem
    settings.ACCESS_TOKEN_EXPIRE_MINUTES). Trước đây token này sống 7 ngày
    và đóng luôn vai trò "phiên đăng nhập dài hạn" — vấn đề là JWT không
    thể thu hồi trước hạn (stateless), nên nếu lộ thì không cách nào chặn.
    Giờ "đăng nhập dài hạn" do refresh token đảm nhiệm (xem
    app/services/token_service.py) — refresh token lưu hash ở DB nên revoke
    được, còn access token chỉ cần sống đủ ngắn để nếu lộ thì tự hết hạn
    nhanh.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """
    Trả về subject (user_id) nếu token hợp lệ VÀ đúng loại "access".
    Kiểm tra `type` claim để một refresh token (nếu vô tình gửi nhầm vào
    header Authorization) không thể bị dùng như access token.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")