"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { transactionApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown, Receipt } from "lucide-react";

type TxType = "all" | "income" | "expense";

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TxType>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", typeFilter, page],
    queryFn: () =>
      transactionApi
        .list({
          type: typeFilter === "all" ? undefined : typeFilter,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  });

  const tabs: { key: TxType; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "income", label: "Thu" },
    { key: "expense", label: "Chi" },
  ];

  return (
    <div className="p-5 space-y-6 fade-in">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-white text-balance">Giao dịch</h1>
        <Link
          href="/transactions/new"
          id="btn-add-transaction"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Thêm mới
        </Link>
      </div>

      {/* Segmented Control Type filter */}
      <div 
        className="flex gap-1 bg-zinc-900/80 p-1.5 rounded-xl border border-white/5 backdrop-blur-md" 
        role="tablist" 
        aria-label="Bộ lọc giao dịch"
      >
        {tabs.map((tab) => {
          const isSelected = typeFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setTypeFilter(tab.key);
                setPage(1);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                isSelected
                  ? "bg-zinc-800 text-white shadow-md border border-white/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse bg-zinc-800/50" />
            ))}
          </div>
        )}

        {!isLoading && data?.items?.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-3 border-dashed border-2 border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-zinc-400 text-sm">Không tìm thấy giao dịch nào</p>
            <Link
              href="/transactions/new"
              id="btn-empty-add-tx"
              className="inline-block mt-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-xl"
            >
              Thêm giao dịch ngay
            </Link>
          </div>
        )}

        {data?.items?.map((tx: {
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
            className="glass rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-zinc-800/40 hover:border-zinc-700 transition-all duration-300 group"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                tx.type === "income" 
                  ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" 
                  : "bg-rose-500/10 group-hover:bg-rose-500/20"
              }`}
            >
              {tx.type === "income" ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-400" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 text-[15px] font-medium truncate">
                {tx.merchant_name || tx.description || CATEGORY_LABELS[tx.category]}
              </p>
              <p className="text-zinc-500 text-xs mt-1 truncate">
                {new Date(tx.transaction_date).toLocaleDateString("vi-VN")} ·{" "}
                {CATEGORY_LABELS[tx.category]}
              </p>
            </div>
            <p
              className={`text-[15px] font-semibold tabular-nums flex-shrink-0 ${
                tx.type === "income" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {tx.type === "income" ? "+" : "-"}
              {formatCurrency(tx.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Trang trước"
            className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-zinc-300 disabled:opacity-30 hover:bg-zinc-800/50 hover:text-white active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Trước
          </button>
          <div className="px-4 py-2.5 glass rounded-xl flex items-center justify-center min-w-[3rem]" aria-live="polite">
            <span className="text-zinc-300 text-sm font-medium tabular-nums">
              {page} <span className="text-zinc-500 mx-1">/</span> {Math.ceil(data.total / 20)}
            </span>
          </div>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
            aria-label="Trang sau"
            className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-zinc-300 disabled:opacity-30 hover:bg-zinc-800/50 hover:text-white active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
