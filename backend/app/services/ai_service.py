"""
AI Service — Gemini Vision OCR + LLM cash flow analysis.

Two main functions:
1. scan_receipt(): Extract structured data from receipt image via Gemini Vision
2. generate_insights(): Analyze transactions and produce AI-powered suggestions
"""

import base64
import json
import logging
from datetime import date, datetime, timezone

import google.generativeai as genai

from app.core.config import settings
from app.models.transaction import TransactionCategory, TransactionType
from app.schemas.receipt import ReceiptItem, ReceiptOCRResult
from app.schemas.report import AIInsights

logger = logging.getLogger(__name__)

# Configure Gemini client once at module load
genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel(settings.GEMINI_MODEL)


RECEIPT_OCR_PROMPT = """Bạn là chuyên gia phân tích hóa đơn/biên lai.
Hãy phân tích ảnh hóa đơn/biên lai này và trả về JSON với cấu trúc sau (không có markdown, chỉ JSON thuần):

{
  "merchant_name": "tên cửa hàng/đơn vị (hoặc null)",
  "total_amount": 150000,
  "currency": "VND",
  "transaction_date": "YYYY-MM-DD (hoặc null nếu không rõ)",
  "transaction_type": "income hoặc expense",
  "category": "một trong: SALES, SERVICE, OTHER_INCOME, FOOD, SUPPLIES, SALARY, UTILITIES, RENT, TRANSPORT, MARKETING, OTHER",
  "items": [
    {"name": "tên mặt hàng", "quantity": 1, "unit_price": 50000}
  ],
  "confidence": 0.95,
  "raw_text": "toàn bộ text đọc được từ hóa đơn"
}

Lưu ý:
- transaction_type = "expense" nếu đây là hóa đơn mua hàng/chi phí
- transaction_type = "income" nếu đây là biên lai thu tiền/bán hàng
- confidence từ 0 đến 1 thể hiện mức độ chắc chắn của kết quả
- Nếu không đọc được rõ, hãy đặt confidence thấp và dùng giá trị null
"""

INSIGHTS_PROMPT_TEMPLATE = """Bạn là chuyên gia tư vấn tài chính cho hộ kinh doanh nhỏ.

Dưới đây là dữ liệu thu chi tháng {month}/{year} của hộ kinh doanh:
- Tổng thu: {total_income:,.0f} VND
- Tổng chi: {total_expense:,.0f} VND  
- Lợi nhuận thuần: {net_cashflow:,.0f} VND
- Tỷ lệ lợi nhuận: {profit_margin:.1f}%

Chi tiết chi phí theo danh mục:
{expense_breakdown}

Chi tiết thu nhập theo danh mục:
{income_breakdown}

Hãy phân tích và trả về JSON (không markdown):
{{
  "summary": "Tóm tắt 1-2 câu ngắn gọn về tình hình tài chính",
  "health_score": 75,
  "insights": [
    "Nhận xét 1 về điểm nổi bật",
    "Nhận xét 2",
    "Nhận xét 3"
  ],
  "suggestions": [
    "Gợi ý cụ thể 1 để cải thiện dòng tiền",
    "Gợi ý 2",
    "Gợi ý 3"
  ],
  "warning_categories": ["FOOD", "UTILITIES"]
}}

Lưu ý:
- health_score: 0-100, dựa trên tỷ lệ lợi nhuận và cấu trúc chi phí
- insights: 3-5 nhận xét cụ thể, dễ hiểu cho chủ hộ kinh doanh
- suggestions: 3-5 gợi ý thực tế, có thể áp dụng ngay
- warning_categories: danh mục chi phí bất thường hoặc quá cao
"""


async def scan_receipt(image_bytes: bytes, content_type: str = "image/jpeg") -> ReceiptOCRResult:
    """
    Send receipt image to Gemini Vision and return structured OCR data.
    Falls back to empty result on any error.
    """
    try:
        # Encode to base64 for Gemini
        image_b64 = base64.b64encode(image_bytes).decode()

        image_part = {
            "inline_data": {
                "mime_type": content_type,
                "data": image_b64,
            }
        }

        response = await _model.generate_content_async(
            [image_part, RECEIPT_OCR_PROMPT],
            generation_config=genai.GenerationConfig(
                temperature=0.1,  # Low temp for structured extraction
                max_output_tokens=1024,
            ),
        )

        raw_text = response.text.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        data = json.loads(raw_text)

        return ReceiptOCRResult(
            merchant_name=data.get("merchant_name"),
            total_amount=data.get("total_amount"),
            currency=data.get("currency", "VND"),
            transaction_date=data.get("transaction_date"),
            transaction_type=TransactionType(data.get("transaction_type", "expense")),
            category=TransactionCategory(data.get("category", "OTHER")),
            items=[ReceiptItem(**item) for item in data.get("items", [])],
            confidence=float(data.get("confidence", 0.0)),
            raw_text=data.get("raw_text"),
        )

    except Exception as e:
        logger.error(f"Gemini OCR failed: {e}")
        return ReceiptOCRResult(confidence=0.0)


async def generate_insights(
    year: int,
    month: int,
    total_income: float,
    total_expense: float,
    expense_breakdown: list[dict],
    income_breakdown: list[dict],
) -> AIInsights:
    """
    Generate AI-powered cash flow insights for a given month.
    """
    net_cashflow = total_income - total_expense
    profit_margin = (net_cashflow / total_income * 100) if total_income > 0 else 0.0

    expense_lines = "\n".join(
        f"  - {item['category']}: {item['total_amount']:,.0f} VND ({item['percentage']:.1f}%)"
        for item in expense_breakdown
    )
    income_lines = "\n".join(
        f"  - {item['category']}: {item['total_amount']:,.0f} VND ({item['percentage']:.1f}%)"
        for item in income_breakdown
    )

    prompt = INSIGHTS_PROMPT_TEMPLATE.format(
        month=month,
        year=year,
        total_income=total_income,
        total_expense=total_expense,
        net_cashflow=net_cashflow,
        profit_margin=profit_margin,
        expense_breakdown=expense_lines or "  (không có dữ liệu)",
        income_breakdown=income_lines or "  (không có dữ liệu)",
    )

    try:
        response = await _model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.4,
                max_output_tokens=1024,
            ),
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        return AIInsights(
            summary=data.get("summary", "Không có dữ liệu phân tích."),
            health_score=max(0, min(100, int(data.get("health_score", 50)))),
            insights=data.get("insights", []),
            suggestions=data.get("suggestions", []),
            warning_categories=data.get("warning_categories", []),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as e:
        logger.error(f"Gemini insights failed: {e}")
        return AIInsights(
            summary="Không thể tạo phân tích AI lúc này.",
            health_score=50,
            insights=[],
            suggestions=[],
            warning_categories=[],
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
