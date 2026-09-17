"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { transactionApi } from "@/lib/api-client";
import { TransactionForm } from "@/components/transaction-form";
import type { TransactionFormOutput } from "@/lib/schemas/transaction";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const { data: transaction, isLoading, isError } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionApi.getById(id),
  });

  const handleSubmit = async (data: TransactionFormOutput) => {
    try {
      await transactionApi.update(id, data);
      qc.removeQueries({ queryKey: ["transactions"] });
      qc.removeQueries({ queryKey: ["report"] });
      qc.removeQueries({ queryKey: ["report-full"] });
      router.push("/transactions");
    } catch (e) {
      alert("Lỗi khi cập nhật giao dịch. Vui lòng thử lại.");
    }
  };

  if (isLoading) {
    return (
      <div className="px-5 lg:px-8 py-10 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (isError || !transaction) {
    return (
      <div className="px-5 lg:px-8 py-5 max-w-lg mx-auto">
        <ErrorBanner message="Không tìm thấy giao dịch hoặc có lỗi xảy ra." />
        <button
          onClick={() => router.back()}
          className="mt-4 text-ink-muted underline"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-5 max-w-lg mx-auto space-y-5 rise-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Quay lại"
          className="p-2 rounded-xl bg-paper-elevated border border-rule text-ink-muted hover:text-ink transition"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <h1 className="font-serif-display text-xl text-ink">Sửa giao dịch</h1>
      </div>

      {/* Rendered only once `transaction` has loaded above, so defaultValues
          is always populated from the real record — no useEffect+reset()
          dance needed to sync async data into the form. */}
      <TransactionForm
        defaultValues={{
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description || "",
          merchant_name: transaction.merchant_name || "",
          transaction_date: transaction.transaction_date.split("T")[0],
        }}
        onSubmit={handleSubmit}
        submitLabel="Lưu thay đổi"
        submittingLabel="Đang lưu..."
      />
    </div>
  );
}