"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { transactionApi } from "@/lib/api-client";
import { TransactionForm } from "@/components/transaction-form";
import type { TransactionFormOutput } from "@/lib/schemas/transaction";

export default function NewTransactionPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const handleSubmit = async (data: TransactionFormOutput) => {
    await transactionApi.create(data);
    qc.removeQueries({ queryKey: ["transactions"] });
    qc.removeQueries({ queryKey: ["report"] });
    qc.removeQueries({ queryKey: ["report-full"] });
    router.push("/transactions");
  };

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
        <h1 className="font-serif-display text-xl text-ink">Thêm giao dịch</h1>
      </div>

      <TransactionForm
        defaultValues={{
          type: "expense",
          transaction_date: new Date().toISOString().split("T")[0],
          category: "OTHER",
        }}
        onSubmit={handleSubmit}
        submitLabel="Lưu giao dịch"
        submittingLabel="Đang lưu…"
      />
    </div>
  );
}