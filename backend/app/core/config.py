from pathlib import Path

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Cashflow Pro"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: PostgresDsn
    # Neon/Aiven bắt buộc SSL và trả connection string dạng
    # "...?sslmode=require" (cú pháp kiểu psycopg2) — nhưng driver asyncpg
    # KHÔNG hiểu tham số "sslmode" này và sẽ lỗi nếu để nguyên trong URL.
    # validate_db_url() bên dưới tự strip query string khỏi URL; cờ này
    # bật cấu hình SSL đúng cách qua connect_args (xem database.py).
    # Local dev (Postgres trong docker-compose) không cần SSL → để False.
    # Production (Neon/Aiven) → đặt DB_SSL_REQUIRE=true trong env.
    DB_SSL_REQUIRE: bool = False

    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    # Access token JWT giờ sống NGẮN — một khi đã phát hành thì không thể
    # thu hồi trước hạn, nên phải ngắn để giảm thiệt hại nếu bị lộ (XSS,
    # log rò rỉ...). "Đăng nhập lâu dài" chuyển sang cho refresh token đảm
    # nhiệm, vì refresh token lưu hash ở DB nên revoke được bất cứ lúc nào.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Cookie httpOnly cho access_token / refresh_token.
    # COOKIE_SECURE=False chỉ hợp lệ khi chạy local qua http://localhost.
    # PHẢI đặt True khi deploy production (bắt buộc chạy https).
    # Nếu frontend/backend khác domain (cross-site), COOKIE_SAMESITE phải
    # là "none" (và COOKIE_SECURE=True) để trình duyệt còn chịu gửi cookie.
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None

    # Rate limit cho các endpoint nhạy cảm (chống brute-force), cú pháp
    # theo package `limits`: "<số lần>/<đơn vị thời gian>".
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "5/minute"

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.5-flash"

    MAX_UPLOAD_SIZE_MB: int = 10

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        if v.startswith("postgres://"):
            # Một số provider (Neon cũ, Heroku-style) trả về scheme rút gọn
            # "postgres://" thay vì "postgresql://" — asyncpg driver của
            # SQLAlchemy chỉ nhận "postgresql+asyncpg://".
            v = v.replace("postgres://", "postgresql://", 1)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Bỏ toàn bộ query string (?sslmode=require&channel_binding=...):
        # đây là tham số kiểu psycopg2/libpq mà asyncpg không hiểu, truyền
        # thẳng vào sẽ gây lỗi "connect() got an unexpected keyword
        # argument". SSL cho Neon/Aiven được bật riêng qua connect_args
        # trong database.py (dựa trên settings.DB_SSL_REQUIRE), không qua
        # query string.
        return v.split("?", 1)[0]


settings = Settings()  # type: ignore[call-arg]