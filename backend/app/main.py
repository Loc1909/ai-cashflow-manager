from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.logging_config import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.core.rate_limit import limiter
from app.models import Base  # noqa: F401 — ensures all models are registered
from app.services.health_service import check_database, check_gemini

# Cấu hình logging PHẢI chạy trước khi bất kỳ logger nào khác trong app
# được dùng lần đầu, nên gọi ngay ở module scope thay vì trong lifespan.
configure_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Cash Flow Management API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- Rate limiting (chống brute-force cho /auth/login, /auth/register) ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# --- Structured request logging (structlog + request_id) ---
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    # Starlette's CORSMiddleware matches allow_origins as exact strings —
    # "https://*.vercel.app" never matched anything and every Vercel
    # preview deployment (random subdomain per branch/PR) was silently
    # blocked by CORS. Wildcard subdomains need allow_origin_regex instead.
    allow_origin_regex=r"https://.*\.vercel\.app",
    # allow_credentials=True là bắt buộc để trình duyệt gửi kèm cookie
    # httpOnly (access_token/refresh_token) trên các request cross-origin
    # giữa frontend (:3000) và backend (:8000).
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check() -> JSONResponse:
    """
    Health check chi tiết — kiểm tra thật các dependency thay vì trả
    `{"status": "ok"}` tĩnh:

    - database: BẮT BUỘC. Nếu down, service không hoạt động được → overall
      "down", HTTP 503 (để load balancer/orchestrator biết mà loại instance
      này ra khỏi vòng xoay).
    - gemini_ai: KHÔNG bắt buộc, vì hệ thống đã có Rule-Based Insight Engine
      fallback. Nếu Gemini down/degraded, overall chỉ hạ xuống "degraded",
      vẫn trả HTTP 200 vì API vẫn phục vụ được (báo cáo vẫn có insight, chỉ
      là không có phần diễn giải tự nhiên bằng AI).
    """
    db_check = await check_database()
    gemini_check = await check_gemini()

    if db_check["status"] != "ok":
        overall_status = "down"
        http_status = 503
    elif gemini_check["status"] not in ("ok", "not_configured"):
        overall_status = "degraded"
        http_status = 200
    else:
        overall_status = "ok"
        http_status = 200

    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall_status,
            "service": settings.PROJECT_NAME,
            "version": "0.1.0",
            "checks": {
                "database": db_check,
                "gemini_ai": gemini_check,
            },
        },
    )


@app.get("/")
def root():
    return {"message": "Cash Flow Management API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)