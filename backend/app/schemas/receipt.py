import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.receipt import ReceiptStatus
from app.models.transaction import TransactionCategory, TransactionType
from app.schemas.transaction import TransactionCreate


# --- OCR Result from Gemini ---
class ReceiptItem(BaseModel):
    name: str
    quantity: float = 1
    unit_price: float


class ReceiptOCRResult(BaseModel):
    """Structured data extracted from receipt image by Gemini Vision."""
    merchant_name: str | None = None
    total_amount: float | None = None
    currency: str = "VND"
    transaction_date: str | None = None  # YYYY-MM-DD string from AI
    transaction_type: TransactionType = TransactionType.expense
    category: TransactionCategory = TransactionCategory.OTHER
    items: list[ReceiptItem] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    raw_text: str | None = None


# --- API Schemas ---
class ReceiptScanResponse(BaseModel):
    """Returned to frontend after scanning, user needs to confirm."""
    receipt_id: uuid.UUID
    ocr_result: ReceiptOCRResult
    suggested_transaction: TransactionCreate


class ReceiptConfirmRequest(BaseModel):
    """Frontend sends confirmed/edited data back."""
    transaction: TransactionCreate


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    image_filename: str | None
    ocr_data: dict | None
    status: ReceiptStatus
    scanned_at: datetime
    confirmed_at: datetime | None
