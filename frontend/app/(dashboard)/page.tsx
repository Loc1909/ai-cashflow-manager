"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { reportApi, transactionApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ScanLine,
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

const now = new Date();

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const { data: report } = useQuery({
    queryKey: ["report", now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      reportApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
  });

  const { data: recentTx } = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () =>
      transactionApi
        .list({ page: 1, page_size: 5 })
        .then((r) => r.data),
  });

  const summary = report;
  const netCashflow = summary
    ? summary.total_income - summary.total_expense
    : 0;

  // Last 7 days from daily cashflow
  const chartData =
    summary?.daily_cashflow?.slice(-7).map((d: { date: string; income: number; expense: number }) => ({
      name: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      thu: d.income / 1000,
      chi: d.expense / 1000,
    })) ?? [];

  return (
    <div className="p-4 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-slate-400 text-xs">Xin chào,</p>
          <h2 className="text-lg font-bold text-white">
            {user?.business_name || user?.full_name || "Bạn"}
          </h2>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          title="Đăng xuất"
          id="btn-logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Net Balance Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-5 shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-indigo-200" />
            <p className="text-indigo-200 text-xs font-medium">
              Dòng tiền tháng {now.getMonth() + 1}/{now.getFullYear()}
            </p>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(netCashflow)}
          </p>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-300" />
              <span className="text-green-300 text-xs">
                {formatCurrency(summary?.total_income ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-300" />
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
          href="/scan"
          id="btn-quick-scan"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-indigo-500/40 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition">
            <ScanLine className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Quét hóa đơn</p>
            <p className="text-slate-400 text-xs">AI tự nhập</p>
          </div>
        </Link>
        <Link
          href="/transactions/new"
          id="btn-quick-add"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-indigo-500/40 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center group-hover:bg-emerald-600/30 transition">
            <Plus className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Thêm thủ công</p>
            <p className="text-slate-400 text-xs">Nhập nhanh</p>
          </div>
        </Link>
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
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
                {chartData.map((_: unknown, i: number) => (
                  <Cell key={i} fill="#22c55e" opacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="chi" name="Chi" radius={[3, 3, 0, 0]}>
                {chartData.map((_: unknown, i: number) => (
                  <Cell key={i} fill="#ef4444" opacity={0.85} />
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
            className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentTx?.items?.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-slate-500 text-sm">
              Chưa có giao dịch nào. Hãy quét hóa đơn đầu tiên!
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
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
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
