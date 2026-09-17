"""
insight_engine.py
-------------------
Rule engine chuyển số liệu thống kê/ML thành nhận xét & khuyến nghị tiếng
Việt, phân loại mức độ ưu tiên (critical/warning/good/info). Đây là lớp
"diễn giải" chính — tìm ra chỗ quan trọng trong báo cáo thu chi.
"""
from __future__ import annotations

from typing import Any, Optional

from app.services.ai_analysis.anomaly_detector import detect_anomalies
from app.services.ai_analysis.cashflow_analyzer import CashflowAnalyzer
from app.services.ai_analysis.forecaster import forecast_net_cashflow
from app.services.ai_analysis.gemini_service import generate_insights
from app.services.ai_analysis.labels import label as category_label


def _fmt(n) -> str:
    return f"{n:,.0f}".replace(",", ".") + "đ"


class InsightEngine:
    def __init__(self, transactions, current_balance: Optional[float] = None):
        self.analyzer = CashflowAnalyzer(transactions)
        self.current_balance = current_balance

    async def build_report(self) -> dict[str, Any]:
        if self.analyzer.is_empty():
            empty_breakdown = {"by_category": [], "hhi": 0.0, "top_category": None}
            return {
                "summary": {"total_income": 0, "total_expense": 0, "net": 0, "num_transactions": 0},
                "category_breakdown": empty_breakdown,
                "income_category_breakdown": empty_breakdown,
                "income_volatility": None,
                "trend": None,
                "anomalies": [],
                "forecast": {},
                "cash_runway": None,
                "insights": [{
                    "level": "info",
                    "title": "Chưa có dữ liệu",
                    "message": "Chưa có giao dịch nào trong khoảng thời gian này.",
                    "action": "Hãy ghi nhận giao dịch để AI có thể phân tích.",
                }],
            }

        df = self.analyzer.df
        totals = self.analyzer.totals()
        expense_breakdown = self.analyzer.category_breakdown(tx_type="expense")
        income_breakdown = self.analyzer.category_breakdown(tx_type="income")
        volatility = self.analyzer.income_volatility()
        trend = self.analyzer.trend()
        anomalies = detect_anomalies(df, tx_type="expense")
        forecast = forecast_net_cashflow(df)

        runway = None
        if self.current_balance is not None:
            runway = self.analyzer.cash_runway_days(self.current_balance)

        rule_insights = self._generate_insights(
            totals, expense_breakdown, volatility, trend, anomalies, forecast, runway
        )

        # LLM chỉ nhận số liệu đã được tính, không nhận toàn bộ giao dịch.
        # Nếu Gemini lỗi/timeout thì giữ nguyên rule_insights.
        ai_context = {
            "summary": totals,
            "expense_breakdown": expense_breakdown.get("by_category", [])[:8],
            "income_breakdown": income_breakdown.get("by_category", [])[:8],
            "income_volatility": volatility,
            "trend": trend,
            "top_anomalies": anomalies[:5],
            "forecast": forecast,
            "cash_runway": runway,
            "rule_insights": rule_insights[:5],
        }
        ai_insights = await generate_insights(ai_context)

        # Rule engine là lớp an toàn: giữ các cảnh báo critical/warning quan trọng.
        # Gemini bổ sung cách diễn giải tự nhiên. Nếu Gemini không trả kết quả,
        # report vẫn hoạt động đầy đủ.
        insights = rule_insights
        if ai_insights:
            critical_rules = [i for i in rule_insights if i["level"] == "critical"]
            insights = critical_rules + ai_insights

        return {
            "summary": totals,
            "category_breakdown": expense_breakdown,
            "income_category_breakdown": income_breakdown,
            "income_volatility": volatility,
            "trend": trend,
            "anomalies": anomalies,
            "forecast": forecast,
            "cash_runway": runway,
            "insights": insights,
        }

    # ---------------------------------------------------------------
    def _generate_insights(self, totals, cat_breakdown, volatility, trend, anomalies, forecast, runway):
        insights = []

        # 1) Dòng tiền âm / dương
        if totals["net"] < 0:
            insights.append({
                "level": "critical",
                "title": "Dòng tiền đang âm",
                "message": f"Chi ({_fmt(totals['total_expense'])}) đang vượt thu "
                           f"({_fmt(totals['total_income'])}), âm {_fmt(abs(totals['net']))}.",
                "action": "Rà soát ngay các khoản chi lớn nhất bên dưới để cắt giảm, "
                          "hoặc tìm cách tăng nguồn thu.",
            })
        elif totals["net"] > 0:
            insights.append({
                "level": "good",
                "title": "Dòng tiền dương",
                "message": f"Dòng tiền ròng đang dương {_fmt(totals['net'])}.",
                "action": "Cân nhắc trích một phần làm quỹ dự phòng cho tháng thấp điểm.",
            })

        # 2) Tập trung chi tiêu quá mức vào 1 danh mục (HHI)
        hhi = cat_breakdown.get("hhi", 0)
        top_cat = cat_breakdown.get("top_category")
        if hhi >= 0.5 and top_cat:
            top_item = cat_breakdown["by_category"][0]
            top_label = category_label(top_cat)
            insights.append({
                "level": "warning",
                "title": f"Chi tiêu dồn vào '{top_label}'",
                "message": f"'{top_label}' chiếm {top_item['share_pct']}% tổng chi "
                           f"({_fmt(top_item['amount'])}) — mức độ tập trung cao (HHI = {hhi}).",
                "action": f"Kiểm tra xem có thể thương lượng giá tốt hơn cho '{top_label}' "
                          "hoặc tìm nhà cung cấp thay thế để giảm rủi ro phụ thuộc.",
            })

        # 3) Thu nhập bấp bênh
        cv = volatility.get("cv") if volatility else None
        if cv is not None and cv > 0.6:
            insights.append({
                "level": "warning",
                "title": "Thu nhập không ổn định",
                "message": f"Thu nhập theo tuần biến động mạnh (hệ số biến thiên = {cv}).",
                "action": "Xây quỹ dự phòng bằng trung bình các tuần thu thấp, "
                          "để không bị động khi có tuần ế hàng.",
            })

        # 4) Xu hướng
        if trend and trend.get("direction") == "down":
            insights.append({
                "level": "warning",
                "title": "Xu hướng dòng tiền đang xấu đi",
                "message": f"Dòng tiền ròng đang giảm dần theo thời gian "
                           f"(khoảng {_fmt(abs(trend['slope']))}/ngày).",
                "action": "Xem lại giá bán, chi phí nhập hàng, hoặc lượng khách gần đây "
                          "để tìm nguyên nhân trước khi xu hướng kéo dài.",
            })
        elif trend and trend.get("direction") == "up":
            insights.append({
                "level": "good",
                "title": "Xu hướng dòng tiền đang cải thiện",
                "message": f"Dòng tiền ròng đang tăng dần (khoảng {_fmt(trend['slope'])}/ngày).",
                "action": "Duy trì cách vận hành hiện tại, đây là tín hiệu tốt.",
            })

        # 5) Giao dịch bất thường
        if anomalies:
            top = anomalies[0]
            insights.append({
                "level": "warning",
                "title": "Có giao dịch chi bất thường",
                "message": f"Ngày {top['transaction_date']}, khoản chi '{top['category_label']}' "
                           f"{_fmt(top['amount'])} {top['reason']}.",
                "action": "Kiểm tra lại đây có phải chi phí một lần (sửa chữa, sự cố) "
                          "hay là dấu hiệu chi phí đang tăng cần theo dõi tiếp.",
            })

        # 6) Quỹ tiền mặt sắp cạn
        if runway and runway.get("runway_days") is not None and runway["runway_days"] < 14:
            insights.append({
                "level": "critical",
                "title": "Quỹ tiền mặt sắp cạn",
                "message": f"Với tốc độ chi tiêu hiện tại, quỹ tiền mặt chỉ còn trụ được "
                           f"khoảng {runway['runway_days']:.0f} ngày.",
                "action": "Ưu tiên thu hồi công nợ, giảm nhập hàng tồn kho, "
                          "hoặc tìm nguồn vốn ngắn hạn ngay trong tuần này.",
            })

        # 7) Dự báo xấu sắp tới
        if forecast.get("forecast_total") is not None and forecast["forecast_total"] < 0:
            insights.append({
                "level": "warning",
                "title": "Dự báo sắp tới có thể âm",
                "message": f"Theo xu hướng hiện tại, AI dự báo dòng tiền ròng thời gian tới "
                           f"khoảng {_fmt(forecast['forecast_total'])}.",
                "action": "Đây là dự báo dựa trên xu hướng gần đây, không phải chắc chắn — "
                          "hãy dùng để chủ động lên kế hoạch nhập hàng/chi tiêu.",
            })

        if not insights:
            insights.append({
                "level": "info",
                "title": "Dòng tiền ổn định",
                "message": "Chưa phát hiện dấu hiệu bất thường đáng chú ý.",
                "action": "Tiếp tục ghi chép đều đặn để AI theo dõi chính xác hơn theo thời gian.",
            })

        priority = {"critical": 0, "warning": 1, "good": 2, "info": 3}
        insights.sort(key=lambda i: priority.get(i["level"], 9))
        return insights
