"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { transactionApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

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
    <div className="p-4 space-y-4 fade-in">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-white">Giao dịch</h1>
        <Link
          href="/transactions/new"
          id="btn-add-transaction"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Thêm
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 glass rounded-xl p-1" role="tablist" aria-label="Bộ lọc giao dịch">
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
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                isSelected
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && data?.items?.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm">Không có giao dịch nào</p>
            <Link
              href="/transactions/new"
              id="btn-empty-add-tx"
              className="inline-block mt-3 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
            >
              + Thêm giao dịch ngay →
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
            className="glass rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
              className={`text-sm font-bold flex-shrink-0 ${
                tx.type === "income" ? "text-green-400" : "text-red-400"
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
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Trang trước"
            className="px-4 py-2 glass rounded-xl text-sm text-slate-300 disabled:opacity-40 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            ← Trước
          </button>
          <span className="px-4 py-2 text-slate-400 text-sm" aria-live="polite">
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
            aria-label="Trang sau"
            className="px-4 py-2 glass rounded-xl text-sm text-slate-300 disabled:opacity-40 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
