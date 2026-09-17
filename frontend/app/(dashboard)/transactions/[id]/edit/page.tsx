"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transactionApi } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { ErrorBanner } from "@/components/ui/error-banner";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  category: z.string().min(1),
  description: z.string().optional(),
  merchant_name: z.string().optional(),
  transaction_date: z.string().min(1),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const { data: transaction, isLoading, isError } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionApi.getById(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      transaction_date: new Date().toISOString().split("T")[0],
      category: "OTHER",
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description || "",
        merchant_name: transaction.merchant_name || "",
        transaction_date: transaction.transaction_date.split("T")[0],
      });
    }
  }, [transaction, reset]);

  const txType = watch("type");
  const filteredCats = CATEGORIES.filter((c) => c.type === txType);

  const onSubmit = async (data: FormOutput) => {
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

  const inputCls =
    "w-full bg-paper border border-rule rounded-xl px-4 py-3 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition";

  if (isLoading) {
    return (
      <div className="px-5 lg:px-8 py-10 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (isError) {
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

      <form onSubmit={handleSubmit(onSubmit)} className="ledger-sheet p-5 space-y-4">
        {/* Type stamp toggle */}
        <div className="flex gap-2" role="group" aria-label="Loại giao dịch">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setValue("type", t);
                setValue("category", t === "expense" ? "OTHER" : "SALES");
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${txType === t
                  ? t === "expense"
                    ? "bg-expense-soft text-expense border-expense/40"
                    : "bg-income-soft text-income border-income/40"
                  : "bg-paper text-ink-faint border-rule hover:text-ink-muted"
                }`}
            >
              {t === "expense" ? "Chi tiêu" : "Thu nhập"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="field-amount" className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block">
            Số tiền (VND) *
          </label>
          <input
            id="field-amount"
            {...register("amount")}
            type="number"
            placeholder="0"
            className="w-full bg-paper border border-rule rounded-xl px-4 py-3.5 text-ink text-2xl font-serif-display tabular focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
          />
          {errors.amount && <p className="text-expense text-xs mt-1">{errors.amount.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="field-category" className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block">
            Danh mục *
          </label>
          <select id="field-category" {...register("category")} className={inputCls}>
            {filteredCats.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Merchant */}
        <div>
          <label htmlFor="field-merchant" className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block">
            Tên cửa hàng / đơn vị
          </label>
          <input
            id="field-merchant"
            {...register("merchant_name")}
            placeholder="VD: Chợ đầu mối, Siêu thị..."
            className={inputCls}
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="field-date" className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block">
            Ngày *
          </label>
          <input id="field-date" {...register("transaction_date")} type="date" className={inputCls} />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="field-description" className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block">
            Ghi chú
          </label>
          <textarea
            id="field-description"
            {...register("description")}
            rows={2}
            placeholder="Ghi chú thêm..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          id="btn-save-transaction"
          className="w-full bg-ink hover:bg-ink/90 disabled:opacity-60 text-paper font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
