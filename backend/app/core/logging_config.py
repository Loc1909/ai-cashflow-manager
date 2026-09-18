"""
logging_config.py
-------------------
Cấu hình structlog để log ra JSON có cấu trúc (production) hoặc console
dễ đọc (dev, khi DEBUG=True).

Thiết kế cố tình "ít xâm lấn": mọi chỗ trong codebase hiện đang dùng
`logger = logging.getLogger(__name__)` kiểu stdlib (gemini_service.py,
health_service.py...) KHÔNG cần sửa — structlog được cấu hình để bọc quanh
stdlib logging (`structlog.stdlib.ProcessorFormatter`) nên output của
những logger đó cũng tự động thành JSON có cấu trúc, đi kèm request_id
nếu đang trong context của 1 request (xem middleware.py).
"""
from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(debug: bool = False) -> None:
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    renderer = (
        structlog.dev.ConsoleRenderer(colors=True)
        if debug
        else structlog.processors.JSONRenderer()
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Uvicorn access log rất ồn và trùng lặp với RequestLoggingMiddleware
    # (middleware.py đã log mỗi request kèm status_code/duration_ms) —
    # hạ mức để tránh log 2 lần cho cùng 1 request.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if debug else logging.WARNING
    )