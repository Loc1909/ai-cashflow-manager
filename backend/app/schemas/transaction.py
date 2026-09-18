from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator
import uuid

from app.models.transaction import TransactionCategory, TransactionType

# Đồng bộ đúng với CATEGORIES ở frontend/lib/constants.ts
INCOME_CATEGORIES = {"SALES", "SERVICE", "OTHER_INCOME"}
EXPENSE_CATEGORIES = {
    "FOOD", "SUPPLIES", "SALARY", "UTILITIES",
    "RENT", "TRANSPORT", "MARKETING", "OTHER",
}


def _validate_category_matches_type(type_: TransactionType | None, category: TransactionCategory | None):
    if type_ is None or category is None:
        return
    cat_value = category.value if hasattr(category, "value") else category
    type_value = type_.value if hasattr(type_, "value") else type_
    allowed = INCOME_CATEGORIES if type_value == "income" else EXPENSE_CATEGORIES
    if cat_value not in allowed:
        raise ValueError(f"Danh mục '{cat_value}' không hợp lệ với loại giao dịch '{type_value}'")

class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0, description="Amount in VND")
    category: TransactionCategory
    description: str | None = Field(None, max_length=500)
    merchant_name: str | None = Field(None, max_length=255)
    transaction_date: date

    @model_validator(mode="after")
    def check_category_type(self):
        _validate_category_matches_type(self.type, self.category)
        return self


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(None, gt=0)
    category: TransactionCategory | None = None
    description: str | None = Field(None, max_length=500)
    merchant_name: str | None = Field(None, max_length=255)
    transaction_date: date | None = None

    @model_validator(mode="after")
    def check_category_type(self):
        # Với update chỉ validate khi CẢ HAI field cùng được gửi lên,
        # vì update có thể chỉ đổi amount mà không đổi category/type.
        if self.type is not None and self.category is not None:
            _validate_category_matches_type(self.type, self.category)
        return self


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
