---
trigger: always_on
---

# FastAPI Rules & Coding Standards

Follow these guidelines whenever writing, modifying, or refactoring FastAPI application code.

## 1. Type Annotations & Python Standards
- **Python 3.10+ Syntax**: Use modern type hinting (`str | None`, `list[int]`, `dict[str, Any]`) instead of `typing.Optional` or `typing.List`.
- **Dependency Injection with `Annotated`**: Prefer `Annotated[DependencyType, Depends(get_dependency)]` over `Depends(...)` in parameter defaults for cleaner signature reuse and testing mock capabilities.

## 2. Pydantic v2 Usage
- Use **Pydantic v2** constructs:
  - `model_config = ConfigDict(from_attributes=True)` instead of `class Config: orm_mode = True`.
  - Use `@field_validator` and `@model_validator` instead of v1 `@validator` / `@root_validator`.
  - Use `pydantic-settings` (`BaseSettings`) for application configuration loaded from environment variables.
- Separate Request (Input) and Response (Output) schemas (e.g., `UserCreate`, `UserUpdate`, `UserRead`). Never expose raw ORM models in endpoint responses.

## 3. Async vs Synchronous Route Functions
- **`async def`**: Use ONLY when performing non-blocking async operations (`await` with async DB drivers like `asyncpg`, `httpx.AsyncClient`, `aiofiles`).
- **`def` (Sync)**: Use standard `def` when calling synchronous blocking functions (e.g., standard `requests`, sync file I/O, heavy CPU computation). FastAPI automatically dispatches `def` endpoints to a background threadpool to prevent blocking the event loop.

## 4. Route & Router Organization
- Split endpoints into modular `APIRouter` instances grouped by domain or resource.
- Set explicit `prefix`, `tags`, and default `responses` on routers.
- Explicitly declare `response_model`, `status_code` (from `fastapi.status`), and `summary`/`description` on endpoint decorators.

## 5. Error Handling & Security
- Raise standard `HTTPException` with explicit `status_code` and structured JSON `detail`.
- Register custom exception handlers using `@app.exception_handler(...)` for domain exceptions.
- Never hardcode secrets or keys. Load configurations via `pydantic-settings`.
