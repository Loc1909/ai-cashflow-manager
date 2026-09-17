"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { reportApi, transactionApi } from "@/lib/api-client";
import type { ReportResponse } from "@/lib/types/report";
import type { Transaction, TransactionListResponse } from "@/lib/types/transaction";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { CHART_THEME, chartTooltipStyle } from "@/lib/chart-theme";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightCard } from "@/components/ui/insight-card";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Plus,
  ArrowRight,
  Wallet,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const {
    data: report,
    isLoading: isReportLoading,
    isError: isReportError,
  } = useQuery<ReportResponse>({
    queryKey: ["report", currentYear, currentMonth],
    queryFn: () => reportApi.monthly(currentYear, currentMonth).then((r) => r.data),
  });

  const {
    data: recentTx,
    isLoading: isRecentTxLoading,
    isError: isRecentTxError,
  } = useQuery<TransactionListResponse>({
    queryKey: ["transactions", "recent"],
    queryFn: () => transactionApi.list({ page: 1, page_size: 20 }).then((r) => r.data),
  });

  const summary = report?.summary;
  const insights = report?.insights ?? [];
  // Use the backend-computed net (single source of truth — same value the
  // AI insights/forecast reason about) instead of recomputing it here.
  // reports/page.tsx already does this; this page previously recomputed it
  // independently, which could drift if the two ever rounded differently.
  const netCashflow = summary ? summary.net ?? summary.total_income - summary.total_expense : 0;

  const chartData = useMemo(() => {
    const daysMap = new Map<string, { name: string; thu: number; chi: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const name = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      daysMap.set(iso, { name, thu: 0, chi: 0 });
    }
    if (recentTx?.items) {
      for (const tx of recentTx.items) {
        const txDate = typeof tx.transaction_date === "string" ? tx.transaction_date.slice(0, 10) : "";
        const entry = daysMap.get(txDate);
        if (entry) {
          if (tx.type === "income") entry.thu += tx.amount / 1000;
          else entry.chi += tx.amount / 1000;
        }
      }
    }
    return Array.from(daysMap.values());
  }, [recentTx]);

  const hasChartActivity = chartData.some((d) => d.thu > 0 || d.chi > 0);

  return (
    <div className="px-5 lg:px-8 py-5 space-y-6 rise-in">
      <div>
        <p className="text-ink-faint text-xs">Xin chào,</p>
        <h1 className="font-serif-display text-2xl text-ink text-balance">
          {user?.business_name || user?.full_name || "Bạn"}
        </h1>
      </div>

      {(isReportError || isRecentTxError) && (
        <ErrorBanner message="Không tải được dữ liệu mới nhất. Vui lòng thử tải lại trang." />
      )}

      {/* Hero ledger summary */}
      <div className="relative ledger-sheet receipt-edge px-6 py-6 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-brass" aria-hidden="true" />
          <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
            Dòng tiền ròng · Tháng {currentMonth}/{currentYear}
          </p>
        </div>

        {isReportLoading ? (
          <>
            <Skeleton className="h-10 w-48 mt-1" />
            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-dashed border-rule">
              <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </>
        ) : (
          <>
            <p
              className={`font-serif-display text-4xl tabular tracking-tight ${netCashflow >= 0 ? "text-income" : "text-expense"
                }`}
            >
              {formatCurrency(netCashflow)}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-dashed border-rule">
              <div>
                <div className="flex items-center gap-1.5 text-ink-faint text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-income" aria-hidden="true" />
                  Tổng thu
                </div>
                <p className="text-income font-semibold tabular text-lg">
                  {formatCurrency(summary?.total_income ?? 0)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-ink-faint text-xs mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-expense" aria-hidden="true" />
                  Tổng chi
                </div>
                <p className="text-expense font-semibold tabular text-lg">
                  {formatCurrency(summary?.total_expense ?? 0)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/reports"
          id="btn-quick-reports"
          className="ledger-sheet p-4 flex items-center gap-3 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-info-soft flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-info" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold truncate">Xem báo cáo</p>
            <p className="text-ink-faint text-xs truncate">Phân tích AI</p>
          </div>
        </Link>
        <Link
          href="/transactions/new"
          id="btn-quick-add"
          className="ledger-sheet p-4 flex items-center gap-3 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-income-soft flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-income" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold truncate">Thêm giao dịch</p>
            <p className="text-ink-faint text-xs truncate">Nhập nhanh</p>
          </div>
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {hasChartActivity && (
            <div className="ledger-sheet p-5">
              <p className="text-ink text-sm font-semibold mb-4">
                7 ngày gần nhất <span className="text-ink-faint font-normal text-xs">(nghìn đồng)</span>
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={12} barGap={4}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: CHART_THEME.inkFaint, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(34,48,31,0.05)" }}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: CHART_THEME.inkMuted, marginBottom: 4 }}
                  />
                  <Bar dataKey="thu" name="Thu" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={`bar-thu-${entry.name}`} fill={CHART_THEME.income} />
                    ))}
                  </Bar>
                  <Bar dataKey="chi" name="Chi" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={`bar-chi-${entry.name}`} fill={CHART_THEME.expense} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent transactions */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-ink text-sm font-semibold">Giao dịch gần đây</h2>
              <Link
                href="/transactions"
                className="text-brass text-xs font-semibold flex items-center gap-1 hover:text-brass-dark transition-colors"
              >
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="ledger-sheet overflow-hidden">
              {isRecentTxLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-20 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {recentTx?.items?.length === 0 && (
                    <div className="p-8 text-center text-ink-faint text-sm flex flex-col items-center gap-3">
                      <Wallet className="w-8 h-8 text-ink-faint" />
                      <p>Chưa có giao dịch nào.</p>
                      <Link href="/transactions/new" className="text-brass font-semibold hover:text-brass-dark transition-colors text-sm">
                        + Thêm giao dịch đầu tiên
                      </Link>
                    </div>
                  )}
                  {recentTx?.items?.slice(0, 8).map((tx: Transaction) => (
                    <div key={tx.id} className="ledger-row px-4 py-3.5 flex items-center gap-3 hover:bg-paper-deep/40 transition-colors">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-income-soft" : "bg-expense-soft"
                          }`}
                      >
                        {tx.type === "income" ? (
                          <TrendingUp className="w-4 h-4 text-income" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-expense" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm font-medium truncate">
                          {tx.merchant_name || tx.description || CATEGORY_LABELS[tx.category]}
                        </p>
                        <p className="text-ink-faint text-xs mt-0.5 truncate">
                          {new Date(tx.transaction_date).toLocaleDateString("vi-VN")} · {CATEGORY_LABELS[tx.category]}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold tabular shrink-0 ${tx.type === "income" ? "text-income" : "text-expense"
                          }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI insights column */}
        {isReportLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 mb-1">
              <Sparkles className="w-4 h-4 text-brass" aria-hidden="true" />
              <span className="text-ink text-sm font-semibold">Phân tích AI</span>
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ledger-sheet p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brass" aria-hidden="true" />
                <h2 className="text-ink text-sm font-semibold">Phân tích AI</h2>
              </div>
              <Link
                href="/reports"
                className="lg:hidden text-brass text-xs font-semibold flex items-center gap-1 hover:text-brass-dark transition-colors"
              >
                Chi tiết <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {insights.slice(0, 3).map((item, idx) => (
                <InsightCard key={`dashboard-insight-${idx}`} item={item} showActionBadge={false} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}