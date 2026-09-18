"use client";

import { Suspense, useMemo, useCallback, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/lib/api-client";
import type { ReportResponse, InsightItem, AnomalyItem } from "@/lib/types/report";
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { CHART_THEME, chartTooltipStyle } from "@/lib/chart-theme";
import { TREND_LABELS } from "@/lib/constants";
import { ErrorBanner } from "@/components/ui/error-banner";
import { InsightCard } from "@/components/ui/insight-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  ChartPie,
  Info,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type BreakdownType = "expense" | "income";

const CONFIDENCE_LABELS: Record<string, string> = {
  cao: "Cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
  thap_du_lieu_it: "Thấp (ít dữ liệu)",
  khong_du_du_lieu: "Chưa đủ dữ liệu",
};

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 lg:px-8 py-5 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const now = useMemo(() => new Date(), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const yearParam = Number(searchParams.get("year"));
  const monthParam = Number(searchParams.get("month"));
  const year =
    Number.isInteger(yearParam) && yearParam >= 2000 ? yearParam : now.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : now.getMonth() + 1;
  const breakdownType: BreakdownType =
    searchParams.get("breakdown") === "income" ? "income" : "expense";

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

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
  const incomeVolatility = report?.income_volatility;

  const forecastChartData = useMemo(() => {
    if (!forecast?.daily_forecast?.length) return [];
    return forecast.daily_forecast.map((value, index) => ({ day: index + 1, value }));
  }, [forecast]);

  const prevMonth = () => {
    if (month === 1) {
      replaceParams({ year: String(year - 1), month: "12" });
    } else {
      replaceParams({ year: String(year), month: String(month - 1) });
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      replaceParams({ year: String(year + 1), month: "1" });
    } else {
      replaceParams({ year: String(year), month: String(month + 1) });
    }
  };

  const setBreakdownType = (type: BreakdownType) => {
    replaceParams({ breakdown: type === "expense" ? null : type });
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const breakdownSource = breakdownType === "expense" ? summary?.expense_by_category : summary?.income_by_category;

  const breakdownPieData = useMemo(() => {
    return (
      breakdownSource?.map((c) => ({
        name: c.category_label || CATEGORY_LABELS[c.category] || c.category,
        value: c.amount,
        pct: c.share_pct,
        color: CATEGORY_COLORS[c.category] || "#63705f",
      })) ?? []
    );
  }, [breakdownSource]);

  const netCashflow = summary ? summary.net ?? summary.total_income - summary.total_expense : 0;

  const hasAnyBreakdownData =
    (summary?.expense_by_category?.length ?? 0) > 0 || (summary?.income_by_category?.length ?? 0) > 0;

  const cv = incomeVolatility?.cv ?? null;

  return (
    <div className="px-5 lg:px-8 py-5 space-y-6 pb-10 rise-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif-display text-2xl text-ink">Báo cáo</h1>
        <div className="flex items-center gap-1 bg-paper-elevated p-1.5 rounded-xl border border-rule">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Tháng trước"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-ink text-sm font-semibold w-20 text-center tabular" aria-live="polite">
            T{month}/{year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Tháng sau"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-colors disabled:opacity-30 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isError && (
        <ErrorBanner message="Không tải được báo cáo tháng này. Vui lòng thử lại." />
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="ledger-sheet h-24 animate-pulse bg-paper-deep/40" />
            <div className="ledger-sheet h-24 animate-pulse bg-paper-deep/40" />
            <div className="ledger-sheet h-24 animate-pulse bg-paper-deep/40" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ledger-sheet h-32 animate-pulse bg-paper-deep/40" />
          ))}
        </div>
      )}

      {!isLoading && summary && (
        <>
          <div className="ledger-sheet grid grid-cols-3 divide-x divide-dashed divide-rule">
            <div className="p-4 text-center">
              <p className="text-ink-faint text-xs font-medium mb-1.5">Tổng thu</p>
              <p className="text-income font-semibold text-sm truncate tabular">{formatCurrency(summary.total_income)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-ink-faint text-xs font-medium mb-1.5">Tổng chi</p>
              <p className="text-expense font-semibold text-sm truncate tabular">{formatCurrency(summary.total_expense)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-ink-faint text-xs font-medium mb-1.5">Lợi nhuận</p>
              <p className={`font-semibold text-sm truncate tabular ${netCashflow >= 0 ? "text-info" : "text-expense"}`}>
                {formatCurrency(netCashflow)}
              </p>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
            <div className="lg:col-span-2 space-y-6">
              {(trend || (cashRunway && cashRunway.runway_days !== null) || cv !== null) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {trend && (
                    <div className="ledger-sheet p-4 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          trend.direction === "up"
                            ? "bg-income-soft"
                            : trend.direction === "down"
                            ? "bg-expense-soft"
                            : "bg-info-soft"
                        }`}
                      >
                        {trend.direction === "up" ? (
                          <TrendingUp className="w-4 h-4 text-income" aria-hidden="true" />
                        ) : trend.direction === "down" ? (
                          <TrendingDown className="w-4 h-4 text-expense" aria-hidden="true" />
                        ) : (
                          <Info className="w-4 h-4 text-info" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">Xu hướng</p>
                        <p className={`text-sm font-semibold truncate mt-0.5 ${TREND_LABELS[trend.direction]?.color || "text-ink"}`}>
                          {TREND_LABELS[trend.direction]?.label || trend.direction}
                        </p>
                      </div>
                    </div>
                  )}

                  {cv !== null && (
                    <div className="ledger-sheet p-4 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          cv > 0.6 ? "bg-expense-soft" : "bg-info-soft"
                        }`}
                      >
                        <Activity className={`w-4 h-4 ${cv > 0.6 ? "text-expense" : "text-info"}`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">Biến động thu nhập</p>
                        <p className="text-sm font-semibold text-ink tabular mt-0.5 leading-snug">
                          <span className="whitespace-nowrap">CV {cv.toFixed(2)}</span>
                          <span className="text-ink-faint font-normal"> · </span>
                          <span>{cv > 0.6 ? "Bấp bênh" : "Ổn định"}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {cashRunway && cashRunway.runway_days !== null && (
                    <div className="ledger-sheet p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-warning-soft flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">Dự phòng</p>
                        <p className="text-sm font-semibold text-ink truncate tabular mt-0.5">
                          ~{Math.round(cashRunway.runway_days)} ngày
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {forecast && (
                <div className="ledger-sheet p-5 lg:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-soft shrink-0">
                        <TrendingUp className="h-5 w-5 text-info" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="font-serif-display text-lg text-ink">Dự báo dòng tiền</h2>
                        <p className="text-sm text-ink-faint">30 ngày tiếp theo</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {forecast.forecast_total !== null && (
                        <div className="text-right">
                          <p className="text-xs text-ink-faint">Tổng dự báo</p>
                          <p className="text-lg font-semibold text-ink tabular">{formatCurrency(forecast.forecast_total)}</p>
                        </div>
                      )}
                      <div className="rounded-xl border border-brass/25 bg-brass-soft px-3 py-2">
                        <p className="text-xs text-brass-dark/70">Độ tin cậy</p>
                        <p className="text-sm font-semibold text-brass-dark">
                          {CONFIDENCE_LABELS[forecast.confidence] ?? forecast.confidence}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecastChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.rule} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: CHART_THEME.inkFaint, fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `N${v}`}
                          interval={4}
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{ fill: CHART_THEME.inkFaint, fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            if (Math.abs(val) >= 1000000) {
                              return `${(val / 1000000).toFixed(1)}tr`;
                            }
                            return `${Math.round(val / 1000)}k`;
                          }}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(v) => `Ngày ${v}`}
                          formatter={(value) => [formatCurrency(Number(value)), "Dự báo"]}
                        />
                        <Line type="monotone" dataKey="value" stroke={CHART_THEME.info} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 rounded-xl border border-brass/20 bg-brass-soft/50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-dark" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-ink-muted">
                        Dự báo mang tính tham khảo, dựa trên dữ liệu giao dịch hiện tại. Độ tin cậy có thể thay đổi khi có thêm dữ liệu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {anomalies.length > 0 && (
                <div className="ledger-sheet border-l-4 border-expense p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-expense-soft flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-expense" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold text-expense">Giao dịch bất thường phát hiện bởi AI</h3>
                  </div>
                  <div className="space-y-2.5">
                    {anomalies.map((item: AnomalyItem, idx: number) => (
                      <div key={`anomaly-${idx}`} className="bg-paper rounded-xl p-4 text-sm space-y-1 border border-rule">
                        <div className="flex justify-between items-center text-ink font-medium">
                          <span>{item.category_label}</span>
                          <span className="text-expense font-semibold tabular">{formatCurrency(item.amount)}</span>
                        </div>
                        <p className="text-ink-muted text-xs leading-relaxed">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.transaction_count === 0 && (
                <div className="ledger-sheet p-10 text-center flex flex-col items-center gap-3 border-dashed">
                  <Info className="w-7 h-7 text-ink-faint" aria-hidden="true" />
                  <p className="text-ink-muted text-sm">Chưa có dữ liệu giao dịch trong tháng {month}/{year}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {insights.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="w-4 h-4 text-brass" aria-hidden="true" />
                    <h2 className="text-ink text-sm font-semibold">Phân tích AI</h2>
                  </div>
                  <div className="space-y-3">
                    {insights.map((item: InsightItem, idx: number) => (
                      <InsightCard key={`insight-${idx}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {hasAnyBreakdownData && (
                <div className="ledger-sheet p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ChartPie className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                      <h2 className="text-ink text-sm font-semibold">
                        {breakdownType === "expense" ? "Cơ cấu chi phí" : "Cơ cấu thu nhập"}
                      </h2>
                    </div>
                    <div className="inline-flex gap-1 bg-paper p-1 rounded-lg border border-rule text-xs" role="tablist" aria-label="Chọn loại cơ cấu">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={breakdownType === "expense"}
                        onClick={() => setBreakdownType("expense")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          breakdownType === "expense" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        Chi
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={breakdownType === "income"}
                        onClick={() => setBreakdownType("income")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          breakdownType === "income" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        Thu
                      </button>
                    </div>
                  </div>

                  {breakdownPieData.length === 0 ? (
                    <p className="text-ink-faint text-xs text-center py-8">
                      Chưa có dữ liệu {breakdownType === "expense" ? "chi phí" : "thu nhập"} theo danh mục.
                    </p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={breakdownPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                            {breakdownPieData.map((entry) => (
                              <Cell key={`pie-cell-${entry.name}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => formatCurrency(Number(val) || 0)}
                            contentStyle={chartTooltipStyle}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {breakdownPieData
                          .slice()
                          .sort((a, b) => b.value - a.value)
                          .map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2.5 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                              <span className="text-ink-muted truncate flex-1">{entry.name}</span>
                              <span className="text-ink-faint tabular">{entry.pct.toFixed(0)}%</span>
                              <span className="text-ink font-medium tabular w-24 text-right">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
