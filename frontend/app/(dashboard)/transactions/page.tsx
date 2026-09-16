"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { transactionApi } from "@/lib/api-client";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown, Receipt, ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="px-5 lg:px-8 py-5 space-y-5 rise-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif-display text-2xl text-ink">Giao dịch</h1>
        <Link
          href="/transactions/new"
          id="btn-add-transaction"
          className="flex items-center gap-1.5 bg-ink hover:bg-ink/90 text-paper text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Thêm mới
        </Link>
      </div>

      {/* Filter tabs */}
      <div
        className="inline-flex gap-1 bg-paper-elevated p-1.5 rounded-xl border border-rule"
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
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isSelected ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Register */}
      <div className="ledger-sheet overflow-hidden">
        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse bg-paper-deep/60" />
            ))}
          </div>
        )}

        {!isLoading && data?.items?.length === 0 && (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
            <Receipt className="w-8 h-8 text-ink-faint" />
            <p className="text-ink-muted text-sm">Không tìm thấy giao dịch nào</p>
            <Link
              href="/transactions/new"
              id="btn-empty-add-tx"
              className="inline-block mt-1 px-4 py-2 bg-brass-soft text-brass-dark text-sm font-semibold hover:bg-brass/20 active:scale-95 transition-all rounded-xl"
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
            className="ledger-row px-5 py-4 flex items-center gap-4 hover:bg-paper-deep/40 transition-colors"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                tx.type === "income" ? "bg-income-soft" : "bg-expense-soft"
              }`}
            >
              {tx.type === "income" ? (
                <TrendingUp className="w-5 h-5 text-income" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-5 h-5 text-expense" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-[15px] font-medium truncate">
                {tx.merchant_name || tx.description || CATEGORY_LABELS[tx.category]}
              </p>
              <p className="text-ink-faint text-xs mt-1 truncate">
                {new Date(tx.transaction_date).toLocaleDateString("vi-VN")} · {CATEGORY_LABELS[tx.category]}
              </p>
            </div>
            <p
              className={`text-[15px] font-semibold tabular shrink-0 ${
                tx.type === "income" ? "text-income" : "text-expense"
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
        <div className="flex justify-center items-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Trang trước"
            className="p-2.5 ledger-sheet text-ink-muted disabled:opacity-30 hover:text-ink active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 text-sm" aria-live="polite">
            <span className="text-ink font-semibold tabular">{page}</span>
            <span className="text-ink-faint mx-1">/</span>
            <span className="text-ink-faint">{Math.ceil(data.total / 20)}</span>
          </div>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
            aria-label="Trang sau"
            className="p-2.5 ledger-sheet text-ink-muted disabled:opacity-30 hover:text-ink active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
