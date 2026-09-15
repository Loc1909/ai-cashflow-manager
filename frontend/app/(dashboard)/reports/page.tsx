"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/lib/api-client";
import type {
  ReportResponse,
  InsightItem,
  AnomalyItem,
} from "@/lib/types/report";
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
  ChartPie
} from "lucide-react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  tang: { label: "Đang tăng", color: "text-emerald-400" },
  giam: { label: "Đang giảm", color: "text-rose-400" },
  on_dinh: { label: "Ổn định", color: "text-indigo-400" },
  khong_du_du_lieu: { label: "Chưa đủ dữ liệu", color: "text-zinc-500" },
};

export default function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading, isError } = useQuery<ReportResponse>({
  queryKey: ["report-full", year, month],
  queryFn: () => reportApi.monthly(year, month).then((r) => r.data),
});

  const summary = report?.summary;
  const insights = report?.insights ?? [];
  const anomalies = report?.anomalies ?? [];
  const trend = report?.trend;
  const cashRunway = report?.cash_runway;
  const forecast = report?.forecast;
  const forecastChartData = useMemo(() => {
  if (!forecast?.daily_forecast?.length) {
    return [];
  }

  return forecast.daily_forecast.map((value, index) => ({
    day: `Ngày ${index + 1}`,
    value,
  }));
}, [forecast]);
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
        color: CATEGORY_COLORS[c.category] || "#818cf8",
      })) ?? []
    );
  }, [summary?.expense_by_category]);

  const netCashflow = summary ? summary.net ?? (summary.total_income - summary.total_expense) : 0;

  return (
    <div className="p-5 space-y-6 fade-in pb-8">
      {/* Header + Month nav */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-white text-balance">Báo cáo</h1>
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Tháng trước"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-zinc-200 text-sm font-medium w-20 text-center tabular-nums" aria-live="polite">
            T{month}/{year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Tháng sau"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:hover:bg-transparent active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl h-24 animate-pulse bg-zinc-800/50" />
            <div className="glass rounded-2xl h-24 animate-pulse bg-zinc-800/50" />
            <div className="glass rounded-2xl h-24 animate-pulse bg-zinc-800/50" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl h-32 animate-pulse bg-zinc-800/50" />
          ))}
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 text-center hover:bg-zinc-800/30 transition-colors duration-300">
              <p className="text-zinc-400 text-xs font-medium mb-1.5">Tổng thu</p>
              <p className="text-emerald-400 font-bold text-sm truncate tabular-nums">
                {formatCurrency(summary.total_income)}
              </p>
            </div>
            <div className="glass rounded-2xl p-4 text-center hover:bg-zinc-800/30 transition-colors duration-300">
              <p className="text-zinc-400 text-xs font-medium mb-1.5">Tổng chi</p>
              <p className="text-rose-400 font-bold text-sm truncate tabular-nums">
                {formatCurrency(summary.total_expense)}
              </p>
            </div>
            <div className="glass rounded-2xl p-4 text-center hover:bg-zinc-800/30 transition-colors duration-300">
              <p className="text-zinc-400 text-xs font-medium mb-1.5">Lợi nhuận</p>
              <p
                className={`font-bold text-sm truncate tabular-nums ${
                  netCashflow >= 0 ? "text-indigo-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(netCashflow)}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar (Trend & Cash Runway) */}
          {(trend || (cashRunway && cashRunway.runway_days !== null)) && (
            <div className="grid grid-cols-2 gap-3">
              {trend && (
                <div className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors duration-300">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    trend.direction === "tang" ? "bg-emerald-500/10" : 
                    trend.direction === "giam" ? "bg-rose-500/10" : "bg-indigo-500/10"
                  }`}>
                    {trend.direction === "tang" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    ) : trend.direction === "giam" ? (
                      <TrendingDown className="w-4 h-4 text-rose-400" aria-hidden="true" />
                    ) : (
                      <Info className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider">Xu hướng</p>
                    <p className={`text-sm font-semibold truncate mt-0.5 ${TREND_LABELS[trend.direction]?.color || "text-white"}`}>
                      {TREND_LABELS[trend.direction]?.label || trend.direction}
                    </p>
                  </div>
                </div>
              )}

              {cashRunway && cashRunway.runway_days !== null && (
                <div className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors duration-300">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider">Dự phòng</p>
                    <p className="text-sm font-semibold text-white truncate tabular-nums mt-0.5">
                      ~{Math.round(cashRunway.runway_days)} ngày
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {forecast && (
  <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-6 shadow-xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
            <TrendingUp
              className="h-5 w-5 text-indigo-400"
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Dự báo dòng tiền
            </h2>

            <p className="text-sm text-zinc-400">
              Dự báo cho 30 ngày tiếp theo
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {forecast.forecast_total !== null && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">
              Tổng dự báo
            </p>

            <p className="text-lg font-bold text-white tabular-nums">
              {formatCurrency(forecast.forecast_total)}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
          <p className="text-xs text-zinc-400">
            Độ tin cậy
          </p>

          <p className="text-sm font-semibold text-indigo-300">
            {forecast.confidence === "cao"
              ? "Cao"
              : forecast.confidence === "trung_binh"
              ? "Trung bình"
              : forecast.confidence === "thap"
              ? "Thấp"
              : forecast.confidence}
          </p>
        </div>
      </div>
    </div>

    <div className="mt-6 h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={forecastChartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />

          <XAxis
            dataKey="day"
            tick={{
              fill: "#71717a",
              fontSize: 11,
            }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />

          <YAxis
            tick={{
              fill: "#71717a",
              fontSize: 11,
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              `${Math.round(value / 1000000)}tr`
            }
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              color: "#fff",
            }}
            formatter={(value) => [
              formatCurrency(Number(value)),
              "Dự báo",
            ]}
          />

          <Line
            type="monotone"
            dataKey="value"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="mt-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <Info
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400"
          aria-hidden="true"
        />

        <p className="text-xs leading-relaxed text-zinc-400">
          Dự báo mang tính tham khảo và được xây dựng dựa trên
          dữ liệu giao dịch hiện tại. Độ tin cậy có thể thay đổi
          khi hệ thống có thêm dữ liệu.
        </p>
      </div>
    </div>
  </div>
)}
          {/* AI Insights Section */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <h2 className="text-white text-sm font-semibold">Phân tích AI</h2>
              </div>

              <div className="space-y-3">
                {insights.map((item: InsightItem, idx: number) => {
  const isCritical = item.level === "critical";
  const isWarning = item.level === "warning";
  const isGood = item.level === "good";

  return (
    <div
      key={`insight-${idx}`}
      className={`rounded-3xl p-5 border transition-all duration-300 shadow-lg ${
        isCritical
          ? "border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-zinc-900/60 shadow-rose-500/5"
          : isWarning
          ? "border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-zinc-900/60 shadow-amber-500/5"
          : isGood
          ? "border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-zinc-900/60 shadow-emerald-500/5"
          : "border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-zinc-900/60 shadow-indigo-500/5"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCritical
              ? "bg-rose-500/20"
              : isWarning
              ? "bg-amber-500/20"
              : isGood
              ? "bg-emerald-500/20"
              : "bg-indigo-500/20"
          }`}
        >
          {isCritical ? (
            <AlertCircle
              className="w-4 h-4 text-rose-400"
              aria-hidden="true"
            />
          ) : isWarning ? (
            <AlertTriangle
              className="w-4 h-4 text-amber-400"
              aria-hidden="true"
            />
          ) : isGood ? (
            <CheckCircle2
              className="w-4 h-4 text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <Info
              className="w-4 h-4 text-indigo-400"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-white text-[15px] font-semibold leading-tight text-balance">
            {item.title}
          </p>

          <p className="text-zinc-300 text-sm leading-relaxed">
            {item.message}
          </p>

          {item.action && (
            <div className="pt-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors px-3 py-1.5 rounded-xl cursor-pointer">
                <span>{item.action}</span>
                <ArrowRight
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                />
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
            <div className="rounded-3xl p-5 border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-zinc-900/60 shadow-lg shadow-rose-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-400" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-rose-300">Giao dịch bất thường phát hiện bởi AI</h3>
              </div>
              <div className="space-y-2.5">
                {anomalies.map((item: AnomalyItem, idx: number) => (
  <div
    key={`anomaly-${idx}`}
    className="bg-zinc-950/50 rounded-2xl p-4 text-sm space-y-1 border border-white/5"
  >
    <div className="flex justify-between items-center text-zinc-200 font-medium">
      <span>{item.category_label}</span>

      <span className="text-rose-400 font-bold tabular-nums">
        {formatCurrency(item.amount)}
      </span>
    </div>

    <p className="text-zinc-400 text-xs leading-relaxed">
      {item.reason}
    </p>
  </div>
))}
              </div>
            </div>
          )}

          {/* Expense breakdown pie */}
          {expensePieData.length > 0 && (
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ChartPie className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                <h2 className="text-white text-sm font-semibold">Cơ Cấu Chi Phí</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {expensePieData.map((entry: { name: string; value: number; color: string }) => (
                      <Cell key={`pie-cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0)}
                    contentStyle={{
                      background: "rgba(24, 24, 27, 0.85)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#fafafa"
                    }}
                    itemStyle={{ padding: 0 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 500 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {summary.transaction_count === 0 && (
            <div className="glass rounded-3xl p-10 text-center flex flex-col items-center gap-3 border-dashed border-2 border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <Info className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm">
                Chưa có dữ liệu giao dịch trong tháng {month}/{year}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
