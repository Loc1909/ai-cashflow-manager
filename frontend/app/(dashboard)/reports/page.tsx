"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { Sparkles, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, AlertTriangle, Lightbulb } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const now = new Date();

export default function ReportsPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report-full", year, month],
    queryFn: () => reportApi.monthly(year, month).then((r) => r.data),
  });

  const summary = report?.summary;
  const ai = report?.ai_insights;

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Prepare chart data
  const cashflowData = summary?.daily_cashflow?.map((d: { date: string; income: number; expense: number; net: number }) => ({
    name: new Date(d.date + "T00:00:00").getDate().toString(),
    thu: Math.round(d.income / 1000),
    chi: Math.round(d.expense / 1000),
  })) ?? [];

  const expensePieData = summary?.top_expense_categories?.map((c: { category: string; total_amount: number; percentage: number }) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.total_amount,
    color: CATEGORY_COLORS[c.category] || "#6b7280",
  })) ?? [];

  return (
    <div className="p-4 space-y-4 fade-in pb-6">
      {/* Header + Month nav */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-white">Báo cáo</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white text-sm font-medium w-24 text-center">
            T{month}/{year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
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
              <p className="text-green-400 font-bold text-sm">
                {formatCurrency(summary.total_income)}
              </p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Tổng chi</p>
              <p className="text-red-400 font-bold text-sm">
                {formatCurrency(summary.total_expense)}
              </p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Lợi nhuận</p>
              <p
                className={`font-bold text-sm ${
                  summary.net_cashflow >= 0 ? "text-indigo-400" : "text-red-400"
                }`}
              >
                {formatCurrency(summary.net_cashflow)}
              </p>
            </div>
          </div>

          {/* AI Insights */}
          {ai && (
            <div className="glass rounded-2xl p-4 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-white text-sm font-semibold">Phân tích AI</span>
                {/* Health score badge */}
                <span
                  className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                    ai.health_score >= 70
                      ? "bg-green-500/20 text-green-400"
                      : ai.health_score >= 40
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {ai.health_score}/100
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-3">{ai.summary}</p>

              {ai.insights?.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {ai.insights.map((ins: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <p className="text-slate-300 text-xs">{ins}</p>
                    </div>
                  ))}
                </div>
              )}

              {ai.suggestions?.length > 0 && (
                <div className="bg-indigo-500/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-medium">Gợi ý tối ưu</span>
                  </div>
                  {ai.suggestions.map((sug: string, i: number) => (
                    <p key={i} className="text-slate-300 text-xs mb-1">• {sug}</p>
                  ))}
                </div>
              )}

              {ai.warning_categories?.length > 0 && (
                <div className="flex items-start gap-2 mt-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-orange-400 text-xs">
                    Cần chú ý:{" "}
                    {ai.warning_categories
                      .map((c: string) => CATEGORY_LABELS[c] || c)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cashflow chart */}
          {cashflowData.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-slate-300 text-sm font-semibold mb-3">
                Thu Chi Theo Ngày (nghìn VND)
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={cashflowData} barSize={8} barGap={1}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="thu" name="Thu" fill="#22c55e" radius={[2, 2, 0, 0]} opacity={0.85} />
                  <Bar dataKey="chi" name="Chi" fill="#ef4444" radius={[2, 2, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expense breakdown pie */}
          {expensePieData.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-slate-300 text-sm font-semibold mb-3">
                Cơ Cấu Chi Phí
              </p>
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
                    {expensePieData.map((entry: { color: string }, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val)}
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
