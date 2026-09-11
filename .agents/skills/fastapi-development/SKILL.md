---
name: fastapi-development
description: >-
  Provides best practices, patterns, project structure, and step-by-step procedures
  for building, refactoring, and testing high-performance FastAPI applications with Pydantic v2,
  SQLAlchemy 2.0 (async), and modern Python 3.10+ standards.
---

# FastAPI Development Skill Guide

Use this skill when designing, implementing, refactoring, or testing FastAPI services.

## Recommended Project Structure

```text
app/
├── core/
│   ├── config.py         # pydantic-settings BaseSettings
│   ├── database.py       # Async engine & sessionmaker setup
│   └── security.py       # Password hashing, JWT tokens
├── api/
│   ├── v1/
│   │   ├── router.py     # Main API Router aggregator
│   │   └── endpoints/    # Feature route handlers (items.py, users.py)
│   └── dependencies.py   # Shared dependencies (get_db, get_current_user)
├── models/               # SQLAlchemy 2.0 ORM models
├── schemas/              # Pydantic v2 request/response models
├── services/             # Business logic & domain layer
└── main.py               # FastAPI app initialization & middleware
tests/
├── conftest.py           # Pytest fixtures & async DB setup
└── api/                  # Async HTTP integration tests
```

---

## Key Implementation Patterns

### 1. App Configuration (`app/core/config.py`)
```python
from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    PROJECT_NAME: str = "FastAPI Service"
    DEBUG: bool = False
    DATABASE_URL: PostgresDsn

settings = Settings()
```

### 2. Async Database Setup (`app/core/database.py`)
```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

engine = create_async_engine(str(settings.DATABASE_URL), echo=settings.DEBUG, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 3. Pydantic v2 Schemas (`app/schemas/item.py`)
```python
from pydantic import BaseModel, ConfigDict, Field

class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str | None = None

class ItemCreate(ItemBase):
    pass

class ItemRead(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
```

### 4. Router & Dependency Injection (`app/api/v1/endpoints/items.py`)
```python
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.item import ItemCreate, ItemRead
from app.services import item_service

router = APIRouter(prefix="/items", tags=["Items"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.post("/", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(item_in: ItemCreate, db: DbSession) -> ItemRead:
    item = await item_service.create(db, item_in)
    return item

@router.get("/{item_id}", response_model=ItemRead)
async def read_item(item_id: int, db: DbSession) -> ItemRead:
    item = await item_service.get_by_id(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    return item
```

### 5. Async Testing with Pytest & HTTPX (`tests/api/test_items.py`)
```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_item():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post("/api/v1/items/", json={"title": "Test Item"})
    assert response.status_code == 201
    assert response.json()["title"] == "Test Item"
```

---

## Verification & Quality Checklist
1. **Type Checking**: Run `mypy .` to verify type safety across schemas and routes.
2. **Linting & Formatting**: Run `ruff check .` and `ruff format .`.
3. **Async Tests**: Run `pytest` with `pytest-asyncio` configured.
