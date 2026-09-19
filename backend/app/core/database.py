from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Neon/Aiven (production) bắt buộc kết nối qua SSL nhưng không chấp nhận
# tham số "sslmode" trong URL khi dùng driver asyncpg (xem giải thích ở
# config.py validate_db_url) — SSL được bật đúng cách qua connect_args ở
# đây thay vì qua query string. Local dev (Postgres trong docker-compose)
# không cần SSL nên connect_args rỗng khi DB_SSL_REQUIRE=false (mặc định).
_connect_args = {"ssl": "require"} if settings.DB_SSL_REQUIRE else {}

engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise