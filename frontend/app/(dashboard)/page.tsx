"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { reportApi, transactionApi } from "@/lib/api-client";
import type { ReportResponse } from "@/lib/types/report";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Plus,
  ArrowRight,
  Wallet,
  LogOut,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
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
  const { user, logout } = useAuth();
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: report } = useQuery<ReportResponse>({
  queryKey: ["report", currentYear, currentMonth],
  queryFn: () =>
    reportApi.monthly(currentYear, currentMonth).then((r) => r.data),
});

  const { data: recentTx } = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () =>
      transactionApi
        .list({ page: 1, page_size: 20 })
        .then((r) => r.data),
  });

  const summary = report?.summary;
  const insights = report?.insights ?? [];
  const netCashflow = summary
    ? summary.total_income - summary.total_expense
    : 0;

  // Aggregate last 7 days from recent transactions
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
          if (tx.type === "income") {
            entry.thu += tx.amount / 1000;
          } else {
            entry.chi += tx.amount / 1000;
          }
        }
      }
    }

    return Array.from(daysMap.values());
  }, [recentTx]);

  const hasChartActivity = chartData.some((d) => d.thu > 0 || d.chi > 0);

  return (
    <div className="p-5 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-zinc-400 text-xs">Xin chào,</p>
          <h1 className="text-xl font-bold text-white text-balance">
            {user?.business_name || user?.full_name || "Bạn"}
          </h1>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/10 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none shadow-sm"
          title="Đăng xuất"
          aria-label="Đăng xuất"
          id="btn-logout"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Net Balance Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.24)] shadow-indigo-500/30 border border-indigo-400/20 group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent group-hover:opacity-30 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-indigo-100" aria-hidden="true" />
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider">
              Tháng {currentMonth}/{currentYear}
            </p>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
            {formatCurrency(netCashflow)}
          </p>
          <div className="flex gap-5 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-emerald-300" aria-hidden="true" />
              </div>
              <span className="text-emerald-100 text-sm font-medium tabular-nums">
                {formatCurrency(summary?.total_income ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-rose-400/20 flex items-center justify-center">
                <TrendingDown className="w-3 h-3 text-rose-300" aria-hidden="true" />
              </div>
              <span className="text-rose-100 text-sm font-medium tabular-nums">
                {formatCurrency(summary?.total_expense ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/reports"
          id="btn-quick-reports"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500/30 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">Xem báo cáo</p>
            <p className="text-zinc-400 text-xs truncate">Phân tích AI</p>
          </div>
        </Link>
        <Link
          href="/transactions/new"
          id="btn-quick-add"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500/30 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">Thêm giao dịch</p>
            <p className="text-zinc-400 text-xs truncate">Nhập nhanh</p>
          </div>
        </Link>
      </div>

      {/* Mini Chart */}
      {hasChartActivity && (
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-300 text-sm font-semibold mb-4">
            7 ngày gần nhất <span className="text-zinc-500 font-normal text-xs">(nghìn đ)</span>
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={12} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                contentStyle={{
                  background: "rgba(24, 24, 27, 0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#fafafa"
                }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                itemStyle={{ padding: 0 }}
              />
              <Bar dataKey="thu" name="Thu" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`bar-thu-${entry.name}`} fill="#10b981" />
                ))}
              </Bar>
              <Bar dataKey="chi" name="Chi" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`bar-chi-${entry.name}`} fill="#f43f5e" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* AI Insights */}
{insights.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <Sparkles
          className="w-4 h-4 text-indigo-400"
          aria-hidden="true"
        />

        <h2 className="text-white text-sm font-semibold">
          Phân tích AI
        </h2>
      </div>

      <Link
        href="/reports"
        className="text-indigo-400 text-xs font-medium flex items-center gap-1 hover:text-indigo-300 transition-colors"
      >
        Xem chi tiết
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>

    <div className="space-y-2.5">
      {insights.slice(0, 3).map((item, idx) => {
        const isCritical = item.level === "critical";
        const isWarning = item.level === "warning";
        const isGood = item.level === "good";

        return (
          <div
            key={`dashboard-insight-${idx}`}
            className={`rounded-2xl p-4 border ${
              isCritical
                ? "border-rose-500/20 bg-rose-950/20"
                : isWarning
                ? "border-amber-500/20 bg-amber-950/20"
                : isGood
                ? "border-emerald-500/20 bg-emerald-950/20"
                : "border-indigo-500/20 bg-indigo-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
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

              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold leading-tight">
                  {item.title}
                </p>

                <p className="text-zinc-400 text-xs leading-relaxed mt-1.5">
                  {item.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-sm font-semibold">Giao dịch gần đây</h2>
          <Link
            href="/transactions"
            className="text-indigo-400 text-xs font-medium flex items-center gap-1 hover:text-indigo-300 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {recentTx?.items?.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-zinc-600" />
              </div>
              <p>Chưa có giao dịch nào.</p>
              <Link
                href="/transactions/new"
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors text-sm"
              >
                + Thêm giao dịch đầu tiên
              </Link>
            </div>
          )}
          {recentTx?.items?.map((tx: {
            id: string;
            type: string;
            amount: number;
            category: string;
            description?: string;
            merchant_name?: string;
            transaction_date: string;
          }) => (
            <div
              key={tx.id}
              className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors duration-300"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
                }`}
              >
                {tx.type === "income" ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 text-sm font-medium truncate">
                  {tx.merchant_name || tx.description || CATEGORY_LABELS[tx.category]}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">
                  {new Date(tx.transaction_date).toLocaleDateString("vi-VN")} ·{" "}
                  {CATEGORY_LABELS[tx.category]}
                </p>
              </div>
              <p
                className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {tx.type === "income" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
