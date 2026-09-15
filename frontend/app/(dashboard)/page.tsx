"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { reportApi, transactionApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Plus,
  ArrowRight,
  Wallet,
  LogOut,
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

  const { data: report } = useQuery({
    queryKey: ["report", currentYear, currentMonth],
    queryFn: () =>
      reportApi.summary(currentYear, currentMonth).then((r) => r.data),
  });

  const { data: recentTx } = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () =>
      transactionApi
        .list({ page: 1, page_size: 20 })
        .then((r) => r.data),
  });

  const summary = report;
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
    <div className="p-4 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-slate-400 text-xs">Xin chào,</p>
          <h1 className="text-lg font-bold text-white">
            {user?.business_name || user?.full_name || "Bạn"}
          </h1>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          title="Đăng xuất"
          aria-label="Đăng xuất"
          id="btn-logout"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Net Balance Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-5 shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-indigo-200" aria-hidden="true" />
            <p className="text-indigo-200 text-xs font-medium">
              Dòng tiền tháng {currentMonth}/{currentYear}
            </p>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(netCashflow)}
          </p>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-300" aria-hidden="true" />
              <span className="text-green-300 text-xs">
                {formatCurrency(summary?.total_income ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-300" aria-hidden="true" />
              <span className="text-red-300 text-xs">
                {formatCurrency(summary?.total_expense ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/reports"
          id="btn-quick-reports"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-indigo-500/40 transition group focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition">
            <BarChart2 className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Xem báo cáo</p>
            <p className="text-slate-400 text-xs">Phân tích AI</p>
          </div>
        </Link>
        <Link
          href="/transactions/new"
          id="btn-quick-add"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-emerald-500/40 transition group focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center group-hover:bg-emerald-600/30 transition">
            <Plus className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Thêm thu / chi</p>
            <p className="text-slate-400 text-xs">Nhập nhanh</p>
          </div>
        </Link>
      </div>

      {/* Mini Chart */}
      {hasChartActivity && (
        <div className="glass rounded-2xl p-4">
          <p className="text-slate-300 text-sm font-semibold mb-3">
            7 ngày gần nhất (nghìn VND)
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData} barSize={14} barGap={2}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Bar dataKey="thu" name="Thu" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`bar-thu-${entry.name}`} fill="#22c55e" opacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="chi" name="Chi" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`bar-chi-${entry.name}`} fill="#ef4444" opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-300 text-sm font-semibold">Giao dịch gần đây</p>
          <Link
            href="/transactions"
            className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentTx?.items?.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-slate-500 text-sm space-y-2">
              <p>Chưa có giao dịch nào.</p>
              <Link
                href="/transactions/new"
                className="inline-block text-indigo-400 font-medium hover:underline text-xs"
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
            <div key={tx.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === "income" ? "bg-green-500/15" : "bg-red-500/15"
                }`}
              >
                {tx.type === "income" ? (
                  <TrendingUp className="w-4 h-4 text-green-400" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {tx.merchant_name || tx.description || CATEGORY_LABELS[tx.category]}
                </p>
                <p className="text-slate-500 text-xs">
                  {new Date(tx.transaction_date).toLocaleDateString("vi-VN")} ·{" "}
                  {CATEGORY_LABELS[tx.category]}
                </p>
              </div>
              <p
                className={`text-sm font-semibold flex-shrink-0 ${
                  tx.type === "income" ? "text-green-400" : "text-red-400"
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
