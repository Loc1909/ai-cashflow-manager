import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str | None = Field(None, max_length=255)
    business_name: str | None = Field(None, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    business_name: str | None
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    business_name: str | None = Field(None, max_length=255)


class AuthResponse(BaseModel):
    """
    Trả về sau login/register/refresh. Token KHÔNG còn nằm trong body JSON
    — chúng được set qua httpOnly cookie (xem app/core/cookies.py) nên
    JavaScript phía frontend không đọc được, giảm rủi ro bị đánh cắp qua
    XSS. Body chỉ trả thông tin user để frontend cập nhật UI.
    """

    user: UserRead