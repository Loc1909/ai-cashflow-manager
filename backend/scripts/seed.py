import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.transaction import Transaction, TransactionType, TransactionCategory


DEMO_USERS = [
    {
        "email": "demo@cashflow.ai",
        "password": "password123",
        "full_name": "Nguyễn Văn Demo",
        "business_name": "Tiệm Tạp Hóa Demo",
        "transactions_generator": "tap_hoa",
    },
    {
        "email": "cafe@cashflow.ai",
        "password": "password123",
        "full_name": "Trần Thị Mai",
        "business_name": "Quán Cafe Phố",
        "transactions_generator": "cafe",
    },
    {
        "email": "fashion@cashflow.ai",
        "password": "password123",
        "full_name": "Lê Hoàng Nam",
        "business_name": "Shop Thời Trang Chic",
        "transactions_generator": "fashion",
    },
]


def generate_transactions_for_user(user_id, business_type: str, today: date) -> list[Transaction]:
    txs = []
    
    if business_type == "tap_hoa":
        for i in range(30, -1, -1):
            t_date = today - timedelta(days=i)
            day_of_week = t_date.weekday()
            
            sales_amount = 3200000 + (1500000 if day_of_week in (5, 6) else 0) + ((i * 123456) % 800000)
            txs.append(
                Transaction(
                    user_id=user_id,
                    type=TransactionType.income,
                    amount=sales_amount,
                    category=TransactionCategory.SALES,
                    description=f"Doanh thu bán lẻ ngày {t_date.strftime('%d/%m')}",
                    merchant_name="Khách lẻ",
                    transaction_date=t_date,
                )
            )
            
            if i % 4 == 0:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=1800000 + ((i * 78901) % 1000000),
                        category=TransactionCategory.SUPPLIES,
                        description="Nhập nước giải khát, bánh kẹo & đồ gia dụng",
                        merchant_name="NPP Minh Phát",
                        transaction_date=t_date,
                    )
                )
            
            if i == 10:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=1450000,
                        category=TransactionCategory.UTILITIES,
                        description="Tiền điện & internet cửa hàng tháng này",
                        merchant_name="EVN HCMC / Viettel",
                        transaction_date=t_date,
                    )
                )

            if i == 25:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=8000000,
                        category=TransactionCategory.RENT,
                        description="Tiền thuê mặt bằng tạp hóa tháng này",
                        merchant_name="Chủ nhà Bác Tám",
                        transaction_date=t_date,
                    )
                )
                
    elif business_type == "cafe":
        for i in range(30, -1, -1):
            t_date = today - timedelta(days=i)
            day_of_week = t_date.weekday()
            
            sales_amount = 2500000 + (1200000 if day_of_week in (5, 6) else 0) + ((i * 234567) % 600000)
            txs.append(
                Transaction(
                    user_id=user_id,
                    type=TransactionType.income,
                    amount=sales_amount,
                    category=TransactionCategory.SALES,
                    description=f"Doanh thu bán cafe & đồ uống {t_date.strftime('%d/%m')}",
                    merchant_name="Khách vãng lai & Takeaway",
                    transaction_date=t_date,
                )
            )

            if i % 3 == 0:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=1200000 + ((i * 54321) % 500000),
                        category=TransactionCategory.SUPPLIES,
                        description="Nhập hạt cafe Arabica/Robusta & sữa tươi Vinamilk",
                        merchant_name="Xưởng Cafe Roastery",
                        transaction_date=t_date,
                    )
                )

            if i == 15:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=12000000,
                        category=TransactionCategory.SALARY,
                        description="Lương nhân viên pha chế & phục vụ tháng này",
                        merchant_name="Nhân viên quán",
                        transaction_date=t_date,
                    )
                )

            if i == 5:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=1500000,
                        category=TransactionCategory.MARKETING,
                        description="Chạy quảng cáo Facebook & Baemin promo",
                        merchant_name="Meta Ads / GrabFood",
                        transaction_date=t_date,
                    )
                )
                
    elif business_type == "fashion":
        for i in range(30, -1, -1):
            t_date = today - timedelta(days=i)
            day_of_week = t_date.weekday()
            
            sales_amount = 4500000 + (2500000 if day_of_week in (5, 6) else 0) + ((i * 345678) % 1200000)
            txs.append(
                Transaction(
                    user_id=user_id,
                    type=TransactionType.income,
                    amount=sales_amount,
                    category=TransactionCategory.SALES,
                    description=f"Doanh thu bán quần áo & phụ kiện {t_date.strftime('%d/%m')}",
                    merchant_name="Khách mua tại cửa hàng & Online",
                    transaction_date=t_date,
                )
            )

            if i in (28, 12):
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=15000000 + (i * 200000),
                        category=TransactionCategory.SUPPLIES,
                        description="Nhập bộ sưu tập quần áo mùa mới từ xưởng may",
                        merchant_name="Xưởng Garment KTS",
                        transaction_date=t_date,
                    )
                )

            if i % 2 == 0:
                txs.append(
                    Transaction(
                        user_id=user_id,
                        type=TransactionType.expense,
                        amount=250000 + ((i * 1234) % 150000),
                        category=TransactionCategory.TRANSPORT,
                        description="Cước phí vận chuyển & giao hàng COD",
                        merchant_name="Giao Hàng Tiết Kiệm / Viettel Post",
                        transaction_date=t_date,
                    )
                )

    return txs


async def seed_data():
    today = date.today()
    async with AsyncSessionLocal() as db:
        print("🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seeding data)...")
        
        for u_info in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == u_info["email"]))
            user = result.scalar_one_or_none()
            
            if not user:
                user = User(
                    email=u_info["email"],
                    hashed_password=get_password_hash(u_info["password"]),
                    full_name=u_info["full_name"],
                    business_name=u_info["business_name"],
                )
                db.add(user)
                await db.flush()
                await db.refresh(user)
                print(f"✅ Đã tạo tài khoản: {user.email} / {u_info['password']} ({user.business_name})")
            else:
                print(f"ℹ️ Tài khoản đã tồn tại: {user.email}")
                
            tx_count_res = await db.execute(select(Transaction).where(Transaction.user_id == user.id))
            existing_txs = tx_count_res.scalars().all()
            
            if not existing_txs:
                sample_txs = generate_transactions_for_user(user.id, u_info["transactions_generator"], today)
                db.add_all(sample_txs)
                print(f"  └─ Đã tạo {len(sample_txs)} giao dịch mẫu 30 ngày cho {user.email}")
            else:
                print(f"  └─ Đã có {len(existing_txs)} giao dịch, bỏ qua tạo giao dịch mới.")
                
        await db.commit()
        print("\n🎉 Khởi tạo dữ liệu thành công hoàn tất!")


if __name__ == "__main__":
    asyncio.run(seed_data())
