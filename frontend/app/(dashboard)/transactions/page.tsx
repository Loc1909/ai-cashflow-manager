"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "@/lib/api-client";
import type { Transaction, TransactionListResponse } from "@/lib/types/transaction";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays,
} from "lucide-react";

type TxType = "all" | "income" | "expense";

interface MonthFilter {
  year: number;
  month: number; // 1-12
}

function toDateRange(filter: MonthFilter | null): { date_from?: string; date_to?: string } {
  if (!filter) return {};
  const { year, month } = filter;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TxType>("all");
  // null = "Tất cả" (no date filtering) — this keeps existing behavior as
  // the default so nobody's current bookmark/workflow changes.
  const [monthFilter, setMonthFilter] = useState<MonthFilter | null>(null);
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const queryClient = useQueryClient();

  const isCurrentOrFutureMonth =
    !!monthFilter &&
    (monthFilter.year > now.getFullYear() ||
      (monthFilter.year === now.getFullYear() && monthFilter.month >= now.getMonth() + 1));

  const goToMonth = (delta: number) => {
    setMonthFilter((prev) => {
      const base = prev ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
      let { year, month } = base;
      month += delta;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
    setPage(1);
  };

  const resetMonthFilter = () => {
    setMonthFilter(null);
    setPage(1);
  };

  const dateRange = useMemo(() => toDateRange(monthFilter), [monthFilter]);

  const { data, isLoading, isError } = useQuery<TransactionListResponse>({
    queryKey: ["transactions", typeFilter, monthFilter, page],
    queryFn: () =>
      transactionApi
        .list({
          type: typeFilter === "all" ? undefined : typeFilter,
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),

    // Xóa khỏi UI ngay lập tức
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions"],
      });

      const queryKey = ["transactions", typeFilter, monthFilter, page];

      const previous =
        queryClient.getQueryData<TransactionListResponse>(queryKey);

      queryClient.setQueryData<TransactionListResponse>(
        queryKey,
        (old) =>
          old
            ? {
              ...old,
              items: old.items.filter((t) => t.id !== id),
              total: Math.max(0, old.total - 1),
            }
            : old
      );

      return { previous, queryKey };
    },

    // Nếu API xóa thất bại → khôi phục dữ liệu cũ
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }

      setDeleteError("Xóa giao dịch thất bại. Vui lòng thử lại.");
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });

      queryClient.removeQueries({
        queryKey: ["report"],
      });

      queryClient.removeQueries({
        queryKey: ["report-full"],
      });
    },

    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const handleDeleteRequest = (id: string) => {
    setDeleteError(null);
    setPendingDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      deleteMutation.mutate(pendingDeleteId);
    }
  };

  const tabs: { key: TxType; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "income", label: "Thu" },
    { key: "expense", label: "Chi" },
  ];

  // Tự lùi trang khi trang hiện tại trống sau khi xóa (và không phải trang 1)
  useEffect(() => {
    if (!isLoading && data && data.items.length === 0 && page > 1) {
      setPage((p) => p - 1);
    }
  }, [isLoading, data, page]);

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

      {isError && (
        <ErrorBanner message="Không tải được danh sách giao dịch. Vui lòng thử lại." />
      )}

      {/* Filters: type tabs + month picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex gap-1 bg-paper-elevated p-1.5 rounded-xl border border-rule"
          role="tablist"
          aria-label="Bộ lọc giao dịch theo loại"
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
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${isSelected ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          className="inline-flex items-center gap-1 bg-paper-elevated p-1.5 rounded-xl border border-rule"
          aria-label="Bộ lọc giao dịch theo tháng"
        >
          <button
            type="button"
            onClick={resetMonthFilter}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${monthFilter === null ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
          >
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            Tất cả thời gian
          </button>
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Tháng trước"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-ink text-sm font-semibold w-16 text-center tabular" aria-live="polite">
            {monthFilter ? `T${monthFilter.month}/${monthFilter.year}` : "—"}
          </span>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            disabled={isCurrentOrFutureMonth}
            aria-label="Tháng sau"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-all disabled:opacity-30 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
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
            <p className="text-ink-muted text-sm">
              {monthFilter
                ? `Không có giao dịch nào trong tháng ${monthFilter.month}/${monthFilter.year}`
                : "Không tìm thấy giao dịch nào"}
            </p>
            <Link
              href="/transactions/new"
              id="btn-empty-add-tx"
              className="inline-block mt-1 px-4 py-2 bg-brass-soft text-brass-dark text-sm font-semibold hover:bg-brass/20 active:scale-95 transition-all rounded-xl"
            >
              Thêm giao dịch ngay
            </Link>
          </div>
        )}

        {data?.items?.map((tx: Transaction) => (
          <div
            key={tx.id}
            className="ledger-row px-5 py-4 flex items-center gap-4 hover:bg-paper-deep/40 transition-colors group"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-income-soft" : "bg-expense-soft"
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
            <div className="flex flex-col items-end gap-1">
              <p
                className={`text-[15px] font-semibold tabular shrink-0 ${tx.type === "income" ? "text-income" : "text-expense"
                  }`}
              >
                {tx.type === "income" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </p>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/transactions/${tx.id}/edit`}
                  aria-disabled={deleteMutation.isPending && pendingDeleteId === tx.id}
                  onClick={(e) => {
                    if (deleteMutation.isPending && pendingDeleteId === tx.id) e.preventDefault();
                  }}
                  className={`p-1.5 text-ink-muted hover:text-ink hover:bg-paper-deep rounded-md transition-colors ${deleteMutation.isPending && pendingDeleteId === tx.id ? "opacity-40 pointer-events-none" : ""
                    }`}
                  aria-label="Sửa"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDeleteRequest(tx.id)}
                  disabled={deleteMutation.isPending && pendingDeleteId === tx.id}
                  className="p-1.5 text-ink-muted hover:text-expense hover:bg-expense-soft/30 rounded-md transition-colors disabled:opacity-50"
                  aria-label="Xóa"
                >
                  {deleteMutation.isPending && pendingDeleteId === tx.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
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
      {deleteError && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <ErrorBanner message={deleteError} />
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Xóa giao dịch này?"
        message="Hành động này không thể hoàn tác."
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}