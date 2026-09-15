from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field
import uuid

from app.models.transaction import TransactionCategory, TransactionType


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0, description="Amount in VND")
    category: TransactionCategory
    description: str | None = Field(None, max_length=500)
    merchant_name: str | None = Field(None, max_length=255)
    transaction_date: date


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(None, gt=0)
    category: TransactionCategory | None = None
    description: str | None = Field(None, max_length=500)
    merchant_name: str | None = Field(None, max_length=255)
    transaction_date: date | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: TransactionType
    amount: float
    category: TransactionCategory
    description: str | None
    merchant_name: str | None
    transaction_date: date
    created_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
    page: int
    page_size: int
