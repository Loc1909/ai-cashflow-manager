"use client";

import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import {
  transactionSchema,
  type TransactionFormInput,
  type TransactionFormOutput,
} from "@/lib/schemas/transaction";

const inputCls =
  "w-full bg-paper border border-rule rounded-xl px-4 py-3 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition";

interface TransactionFormProps {
  /** Initial values. For the edit page, pass this only once the record has
   * loaded (the parent should gate rendering on `isLoading`) — the form
   * owns its own react-hook-form instance and doesn't watch for prop
   * changes after mount. Partial is fine for create (e.g. omit amount). */
  defaultValues: DefaultValues<TransactionFormInput>;
  onSubmit: (data: TransactionFormOutput) => Promise<void> | void;
  submitLabel: string;
  submittingLabel: string;
}

/**
 * Shared form used by both "add transaction" and "edit transaction".
 * Previously each page re-implemented an identical ~150-line form; any
 * field/validation change had to be made twice and could silently drift.
 */
export function TransactionForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submittingLabel,
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormInput, any, TransactionFormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const txType = watch("type");
  const filteredCats = CATEGORIES.filter((c) => c.type === txType);

  return (
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
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
              txType === t
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
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}