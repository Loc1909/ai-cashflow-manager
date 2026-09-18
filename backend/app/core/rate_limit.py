"""
rate_limit.py
--------------
Rate limiting cho các endpoint nhạy cảm (login/register) để chống
brute-force. Dùng `slowapi` (wrapper FastAPI của package `limits`), key
theo địa chỉ IP của client.

Lưu ý: nếu backend chạy sau reverse proxy / load balancer (Nginx, Render,
Railway...), cần cấu hình proxy để forward đúng header `X-Forwarded-For`,
nếu không mọi request sẽ bị tính chung 1 IP (IP của proxy) và rate limit
sẽ sai.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)