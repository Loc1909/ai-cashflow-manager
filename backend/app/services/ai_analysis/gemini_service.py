"""
gemini_service.py
-----------------
Lớp LLM tùy chọn cho Receipt Cashflow AI.

ML/thống kê vẫn là nguồn dữ liệu chính. Gemini chỉ nhận các chỉ số đã
được tính toán và chuyển chúng thành nhận xét + khuyến nghị tiếng Việt.
Nếu API lỗi/timeout/JSON không hợp lệ, hàm trả [] để hệ thống fallback
về InsightEngine rule-based, không làm hỏng báo cáo.
"""
from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import settings

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent"
)

_SYSTEM_INSTRUCTION = """Bạn là chuyên gia phân tích dòng tiền cho hộ kinh doanh nhỏ.
Nhiệm vụ: đọc các chỉ số tài chính đã được tính bởi hệ thống và tạo tối đa 5
insight hữu ích bằng tiếng Việt.

QUY TẮC:
- Không tự bịa số liệu. Chỉ sử dụng số liệu có trong INPUT.
- Không tự tạo ra phần trăm, số tiền, ngưỡng hoặc con số mới.
- Nếu INPUT không có đủ dữ liệu để kết luận, hãy nói rõ rằng dữ liệu chưa đủ.
- Không biến một chỉ số thành benchmark ngành nếu INPUT không cung cấp benchmark.
- Phân biệt rõ:
  + doanh thu/income
  + chi phí/expense
  + dòng tiền ròng/net cashflow
  + dự báo/forecast
- Không gọi forecast là doanh thu nếu INPUT chỉ cung cấp forecast dòng tiền.
- Không nói chắc chắn về tương lai; dùng "dự báo", "có dấu hiệu",
  "có xu hướng", "nên cân nhắc".
- Nếu dữ liệu ít, phải nói rõ độ tin cậy hạn chế.
- Ưu tiên insight có hành động cụ thể, dễ thực hiện.
- Không lặp lại nguyên văn tất cả chỉ số.
- Không đưa lời khuyên đầu tư/chứng khoán.
- Không đưa benchmark ngành nếu INPUT không có benchmark.
- Output CHỈ là JSON array, không markdown, không ```.

Mỗi phần tử phải có đúng 4 field:
{
  "level": "critical" | "warning" | "good" | "info",
  "title": "tiêu đề ngắn",
  "message": "giải thích ngắn gọn",
  "action": "hành động đề xuất"
}
"""

def _extract_json(text: str) -> list[dict[str, Any]]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("[")
    end = text.rfind("]")
    if start < 0 or end <= start:
        return []
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []

    allowed = {"critical", "warning", "good", "info"}
    result: list[dict[str, Any]] = []
    for item in data[:5]:
        if not isinstance(item, dict):
            continue
        level = item.get("level")
        title = item.get("title")
        message = item.get("message")
        action = item.get("action")
        if level not in allowed or not all(isinstance(x, str) and x.strip()
                                           for x in (title, message, action)):
            continue
        result.append({
            "level": level,
            "title": title.strip()[:120],
            "message": message.strip()[:500],
            "action": action.strip()[:500],
        })
    return result


async def generate_insights(context: dict[str, Any]) -> list[dict[str, Any]]:
    """Gọi Gemini bằng HTTP async. Trả [] nếu không thể gọi hoặc parse."""
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
    if not api_key:
        print("❌ Gemini: GEMINI_API_KEY chưa được cấu hình")
        return []
    print(f"🤖 Gemini: đang gọi model {model}...")

    prompt = (
        _SYSTEM_INSTRUCTION
        + "\n\nINPUT (JSON):\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )

    url = _GEMINI_URL.format(model=model)
    payload = {
        "system_instruction": {"parts": [{"text": _SYSTEM_INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(context, ensure_ascii=False, default=str)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                params={"key": api_key},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
            print("✅ Gemini: API trả response thành công")
    except (httpx.HTTPError, ValueError) as exc:
        print(f"❌ Gemini request failed: {exc}")
        return []

    try:
        candidates = body.get("candidates", [])
        text = candidates[0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        print(f"❌ Gemini: không lấy được nội dung response: {exc}")
        return []

    result = _extract_json(text)

    if result:
        print(f"✅ Gemini: tạo thành công {len(result)} insight(s)")
    else:
        print("⚠️ Gemini: response không chứa JSON insight hợp lệ")

    return result
