"""remove receipts table and receipt_id from transactions

Revision ID: 002_remove_receipts
Revises: 001_initial
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_remove_receipts"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop receipt_id FK constraint and column from transactions
    op.drop_constraint("transactions_receipt_id_fkey", "transactions", type_="foreignkey")
    op.drop_column("transactions", "receipt_id")

    # Drop receipts table (receiptstatus enum will also be dropped)
    op.drop_table("receipts")
    op.execute("DROP TYPE IF EXISTS receiptstatus")


def downgrade() -> None:
    # Recreate receiptstatus enum
    receiptstatus = postgresql.ENUM("draft", "confirmed", "rejected", name="receiptstatus")
    receiptstatus.create(op.get_bind())

    # Recreate receipts table
    op.create_table(
        "receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_filename", sa.String(length=255), nullable=True),
        sa.Column("ocr_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.Enum("draft", "confirmed", "rejected", name="receiptstatus"), nullable=False),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_receipts_status"), "receipts", ["status"], unique=False)
    op.create_index(op.f("ix_receipts_user_id"), "receipts", ["user_id"], unique=False)

    # Re-add receipt_id to transactions
    op.add_column(
        "transactions",
        sa.Column("receipt_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "transactions_receipt_id_fkey",
        "transactions",
        "receipts",
        ["receipt_id"],
        ["id"],
        ondelete="SET NULL",
    )
