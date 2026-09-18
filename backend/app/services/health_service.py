"""
health_service.py
-------------------
Kiểm tra "sức khỏe" thực tế của các dependency quan trọng cho /health,
thay vì trả `{"status": "ok"}` tĩnh không nói lên điều gì.

- Database: bắt buộc — nếu down thì service không hoạt động được, /health
  trả 503.
- Gemini AI: KHÔNG bắt buộc — hệ thống đã có Rule-Based Insight Engine
  fallback (xem insight_engine.py), nên Gemini down chỉ hạ mức "degraded"
  (vẫn HTTP 200), không kéo cả service xuống "down".
"""
from __future__ import annotations

import time

import httpx
import structlog
from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = structlog.get_logger(__name__)

# Endpoint metadata của model — nhẹ, không tốn quota sinh nội dung như
# generateContent, phù hợp để dùng làm health check gọi thường xuyên.
_GEMINI_MODEL_INFO_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}"


async def check_database() -> dict:
    start = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "latency_ms": round((time.perf_counter() - start) * 1000, 2)}
    except Exception as exc:  # noqa: BLE001 — health check phải bắt mọi lỗi, không để /health tự sập
        logger.error("health_check_database_failed", error=str(exc))
        return {"status": "down", "error": str(exc)}


async def check_gemini() -> dict:
    if not settings.GEMINI_API_KEY:
        return {"status": "not_configured"}

    url = _GEMINI_MODEL_INFO_URL.format(model=settings.GEMINI_MODEL)
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params={"key": settings.GEMINI_API_KEY})
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        if response.status_code == 200:
            return {"status": "ok", "latency_ms": latency_ms}
        return {"status": "degraded", "http_status": response.status_code, "latency_ms": latency_ms}
    except httpx.HTTPError as exc:
        logger.warning("health_check_gemini_unreachable", error=str(exc))
        return {"status": "unreachable", "error": str(exc)}