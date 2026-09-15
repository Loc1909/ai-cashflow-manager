"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  tang: { label: "Đang tăng", color: "text-emerald-400" },
  giam: { label: "Đang giảm", color: "text-red-400" },
  on_dinh: { label: "Ổn định", color: "text-indigo-400" },
  khong_du_du_lieu: { label: "Chưa đủ dữ liệu", color: "text-slate-400" },
};

export default function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report-full", year, month],
    queryFn: () => reportApi.monthly(year, month).then((r) => r.data),
  });

  const summary = report?.summary;
  const insights = report?.insights ?? [];
  const anomalies = report?.anomalies ?? [];
  const trend = report?.trend;
  const cashRunway = report?.cash_runway;

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const expensePieData = useMemo(() => {
    return (
      summary?.expense_by_category?.map((c: { category: string; category_label: string; amount: number; share_pct: number }) => ({
        name: c.category_label || CATEGORY_LABELS[c.category] || c.category,
        value: c.amount,
        color: CATEGORY_COLORS[c.category] || "#6366f1",
      })) ?? []
    );
  }, [summary?.expense_by_category]);

  const netCashflow = summary ? summary.net ?? (summary.total_income - summary.total_expense) : 0;

  return (
    <div className="p-4 space-y-4 fade-in pb-6">
      {/* Header + Month nav */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-white">Báo cáo</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Tháng trước"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-white text-sm font-medium w-24 text-center" aria-live="polite">
            T{month}/{year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Tháng sau"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Tổng thu</p>
              <p className="text-green-400 font-bold text-sm truncate">
                {formatCurrency(summary.total_income)}
              </p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Tổng chi</p>
              <p className="text-red-400 font-bold text-sm truncate">
                {formatCurrency(summary.total_expense)}
              </p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Lợi nhuận</p>
              <p
                className={`font-bold text-sm truncate ${
                  netCashflow >= 0 ? "text-indigo-400" : "text-red-400"
                }`}
              >
                {formatCurrency(netCashflow)}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar (Trend & Cash Runway) */}
          {(trend || (cashRunway && cashRunway.runway_days !== null)) && (
            <div className="grid grid-cols-2 gap-2">
              {trend && (
                <div className="glass rounded-xl p-3 flex items-center gap-2">
                  {trend.direction === "tang" ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                  ) : trend.direction === "giam" ? (
                    <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px]">Xu hướng dòng tiền</p>
                    <p className={`text-xs font-semibold truncate ${TREND_LABELS[trend.direction]?.color || "text-white"}`}>
                      {TREND_LABELS[trend.direction]?.label || trend.direction}
                    </p>
                  </div>
                </div>
              )}

              {cashRunway && cashRunway.runway_days !== null && (
                <div className="glass rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px]">Dự phòng tiền mặt</p>
                    <p className="text-xs font-semibold text-white truncate">
                      ~{Math.round(cashRunway.runway_days)} ngày
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Insights Section */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <h2 className="text-white text-sm font-semibold">Phân tích AI</h2>
              </div>

              <div className="space-y-2.5">
                {insights.map((item: { level: string; title: string; message: string; action: string }, idx: number) => {
                  const isCritical = item.level === "critical";
                  const isWarning = item.level === "warning";
                  const isGood = item.level === "good";

                  return (
                    <div
                      key={`insight-${idx}`}
                      className={`glass rounded-2xl p-4 border transition ${
                        isCritical
                          ? "border-red-500/30 bg-red-950/10"
                          : isWarning
                          ? "border-amber-500/30 bg-amber-950/10"
                          : isGood
                          ? "border-emerald-500/30 bg-emerald-950/10"
                          : "border-indigo-500/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {isCritical ? (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        ) : isGood ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-white text-sm font-semibold leading-tight">{item.title}</p>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.message}</p>
                          {item.action && (
                            <div className="pt-1.5">
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                                <ArrowRight className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                                <span>{item.action}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Anomalies Detected by Isolation Forest */}
          {anomalies.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-950/10 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-red-300">Giao dịch bất thường phát hiện bởi AI</h3>
              </div>
              <div className="space-y-2">
                {anomalies.map((ano: { category_label: string; amount: number; transaction_date: string; reason: string }, i: number) => (
                  <div key={`anomaly-${i}`} className="bg-slate-900/60 rounded-xl p-2.5 text-xs space-y-0.5">
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>{ano.category_label}</span>
                      <span className="text-red-400 font-bold">{formatCurrency(ano.amount)}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{ano.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense breakdown pie */}
          {expensePieData.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h2 className="text-slate-300 text-sm font-semibold mb-3">
                Cơ Cấu Chi Phí
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensePieData.map((entry: { name: string; value: number; color: string }) => (
                      <Cell key={`pie-cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0)}
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "#94a3b8", fontSize: 10 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {summary.transaction_count === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm">
                Chưa có giao dịch nào trong tháng {month}/{year}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
