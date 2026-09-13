import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.transaction import Transaction, TransactionType, TransactionCategory


async def seed_data():
    async with AsyncSessionLocal() as db:
        # Check if demo user already exists
        result = await db.execute(select(User).where(User.email == "demo@cashflow.ai"))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print("Demo user 'demo@cashflow.ai' already exists.")
            return

        demo_user = User(
            email="demo@cashflow.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Nguyễn Văn Demo",
            business_name="Tiệm Tạp Hóa Demo",
        )
        db.add(demo_user)
        await db.flush()
        await db.refresh(demo_user)

        print(f"Created demo user: demo@cashflow.ai / password123 (ID: {demo_user.id})")

        # Create sample transactions for the last 7 days
        today = date.today()
        sample_transactions = [
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.income,
                amount=3500000,
                category=TransactionCategory.SALES,
                description="Doanh thu bán lẻ tạp hóa",
                merchant_name="Khách lẻ",
                transaction_date=today - timedelta(days=6),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.expense,
                amount=1200000,
                category=TransactionCategory.SUPPLIES,
                description="Nhập nước giải khát & bánh kẹo",
                merchant_name="Đại lý Minh Phát",
                transaction_date=today - timedelta(days=5),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.income,
                amount=4200000,
                category=TransactionCategory.SALES,
                description="Doanh thu bán hàng ngày đông khách",
                merchant_name="Khách lẻ",
                transaction_date=today - timedelta(days=4),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.expense,
                amount=850000,
                category=TransactionCategory.UTILITIES,
                description="Thanh toán tiền điện tháng này",
                merchant_name="EVN HCMC",
                transaction_date=today - timedelta(days=3),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.income,
                amount=2900000,
                category=TransactionCategory.SALES,
                description="Doanh thu bán lẻ",
                merchant_name="Khách lẻ",
                transaction_date=today - timedelta(days=2),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.expense,
                amount=500000,
                category=TransactionCategory.FOOD,
                description="Chi phí ăn uống làm việc",
                merchant_name="Cơm tấm Ba Ghiền",
                transaction_date=today - timedelta(days=1),
            ),
            Transaction(
                user_id=demo_user.id,
                type=TransactionType.income,
                amount=3800000,
                category=TransactionCategory.SALES,
                description="Doanh thu hôm nay",
                merchant_name="Khách lẻ",
                transaction_date=today,
            ),
        ]

        db.add_all(sample_transactions)
        await db.commit()
        print("Successfully seeded sample transactions!")


if __name__ == "__main__":
    asyncio.run(seed_data())
