# Dockerfile production cho backend — dùng khi deploy lên Render/Koyeb,
# KHÔNG liên quan tới docker-compose.yml (đó là công cụ dev cục bộ riêng).
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

EXPOSE 8000

# Migration KHÔNG chạy ở đây nữa — xem render.yaml (preDeployCommand).
# Free tier Render "ngủ" sau ~15 phút không traffic rồi cold-start lại khi
# có request mới; nếu để "alembic upgrade head && uvicorn ..." trong CMD,
# lệnh migration sẽ chạy lại ở MỖI lần cold-start (không chỉ lúc deploy),
# tốn thời gian và trộn lẫn lỗi migration với lỗi app trong cùng 1 log khởi
# động. preDeployCommand của Render chạy đúng 1 lần mỗi lần deploy, trước
# khi traffic được route vào — đúng chỗ hơn cho migration.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]