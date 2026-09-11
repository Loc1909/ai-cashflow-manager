import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.dependencies import CurrentUser, DbSession
from app.models.receipt import Receipt, ReceiptStatus
from app.models.transaction import Transaction
from app.schemas.receipt import ReceiptConfirmRequest, ReceiptRead, ReceiptScanResponse
from app.schemas.transaction import TransactionCreate
from app.services import ai_service
from app.services import transaction_service

router = APIRouter(prefix="/receipts", tags=["Receipts"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


@router.post(
    "/scan",
    response_model=ReceiptScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Scan receipt image with AI",
)
async def scan_receipt(
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(..., description="Receipt image file (JPEG/PNG/WebP)"),
) -> ReceiptScanResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file format. Accepted formats: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 10MB.",
        )

    # Call Gemini Vision
    ocr_result = await ai_service.scan_receipt(image_bytes, file.content_type or "image/jpeg")

    # Save draft receipt
    receipt = Receipt(
        user_id=current_user.id,
        image_filename=file.filename,
        ocr_data=ocr_result.model_dump(),
        status=ReceiptStatus.draft,
    )
    db.add(receipt)
    await db.flush()
    await db.refresh(receipt)

    # Build suggested transaction from OCR
    from datetime import date
    try:
        tx_date = (
            date.fromisoformat(ocr_result.transaction_date)
            if ocr_result.transaction_date
            else date.today()
        )
    except (ValueError, TypeError):
        tx_date = date.today()

    suggested = TransactionCreate(
        type=ocr_result.transaction_type,
        amount=ocr_result.total_amount or 0,
        category=ocr_result.category,
        description=ocr_result.raw_text[:200] if ocr_result.raw_text else None,
        merchant_name=ocr_result.merchant_name,
        transaction_date=tx_date,
        receipt_id=receipt.id,
    )

    return ReceiptScanResponse(
        receipt_id=receipt.id,
        ocr_result=ocr_result,
        suggested_transaction=suggested,
    )


@router.post(
    "/{receipt_id}/confirm",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm receipt and create transaction",
)
async def confirm_receipt(
    receipt_id: uuid.UUID,
    data: ReceiptConfirmRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    from sqlalchemy import select
    result = await db.execute(
        select(Receipt).where(
            Receipt.id == receipt_id,
            Receipt.user_id == current_user.id,
        )
    )
    receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if receipt.status != ReceiptStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Receipt has already been processed",
        )

    # Ensure receipt_id is set on the transaction
    tx_data = data.transaction
    tx_data_with_receipt = TransactionCreate(
        **{**tx_data.model_dump(), "receipt_id": receipt_id}
    )

    transaction = await transaction_service.create(db, current_user.id, tx_data_with_receipt)

    # Update receipt status
    receipt.status = ReceiptStatus.confirmed
    receipt.confirmed_at = datetime.now(timezone.utc)
    await db.flush()

    return {"message": "Transaction saved successfully", "transaction_id": str(transaction.id)}


@router.delete(
    "/{receipt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reject draft receipt",
)
async def reject_receipt(
    receipt_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    from sqlalchemy import select
    result = await db.execute(
        select(Receipt).where(
            Receipt.id == receipt_id,
            Receipt.user_id == current_user.id,
        )
    )
    receipt = result.scalar_one_or_none()

    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    receipt.status = ReceiptStatus.rejected
    await db.flush()

