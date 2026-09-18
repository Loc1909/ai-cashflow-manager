"""
middleware.py
--------------
Middleware log mỗi request (method, path, status_code, duration_ms) và gắn
một `request_id` duy nhất vào context của structlog cho toàn bộ vòng đời
request đó — nhờ vậy mọi log phát sinh trong lúc xử lý request (kể cả từ
gemini_service.py, insight_engine.py...) đều tự động có cùng request_id,
giúp lần theo một request cụ thể trong log tập trung (Datadog/ELK/CloudWatch...).
"""
from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "request_failed",
                method=request.method,
                path=request.url.path,
                duration_ms=duration_ms,
            )
            structlog.contextvars.clear_contextvars()
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        log_method = logger.warning if response.status_code >= 400 else logger.info
        log_method(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        structlog.contextvars.clear_contextvars()
        return response