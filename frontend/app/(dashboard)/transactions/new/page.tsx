"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transactionApi } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "SALES", label: "Doanh thu bán hàng", type: "income" },
  { value: "SERVICE", label: "Doanh thu dịch vụ", type: "income" },
  { value: "OTHER_INCOME", label: "Thu nhập khác", type: "income" },
  { value: "FOOD", label: "Thực phẩm / Nguyên liệu", type: "expense" },
  { value: "SUPPLIES", label: "Vật tư / Dụng cụ", type: "expense" },
  { value: "SALARY", label: "Lương nhân viên", type: "expense" },
  { value: "UTILITIES", label: "Điện / Nước / Internet", type: "expense" },
  { value: "RENT", label: "Thuê mặt bằng", type: "expense" },
  { value: "TRANSPORT", label: "Vận chuyển / Xăng xe", type: "expense" },
  { value: "MARKETING", label: "Quảng cáo / Marketing", type: "expense" },
  { value: "OTHER", label: "Khác", type: "expense" },
];

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  category: z.string().min(1),
  description: z.string().optional(),
  merchant_name: z.string().optional(),
  transaction_date: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function NewTransactionPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      transaction_date: new Date().toISOString().split("T")[0],
      category: "OTHER",
    },
  });

  const txType = watch("type");
  const filteredCats = CATEGORIES.filter((c) => c.type === txType || c.value === "OTHER");

  const onSubmit = async (data: FormData) => {
    await transactionApi.create(data);
    await qc.invalidateQueries({ queryKey: ["transactions"] });
    await qc.invalidateQueries({ queryKey: ["report"] });
    router.push("/transactions");
  };

  return (
    <div className="p-4 space-y-4 fade-in">
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold text-white">Thêm giao dịch</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Type toggle */}
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setValue("type", t); setValue("category", t === "expense" ? "OTHER" : "SALES"); }}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${
                txType === t
                  ? t === "expense"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {t === "expense" ? "💸 Chi tiêu" : "💰 Thu nhập"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Số tiền (VND) *</label>
          <input
            {...register("amount")}
            type="number"
            placeholder="0"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Danh mục *</label>
          <select
            {...register("category")}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            {filteredCats.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Merchant */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Tên cửa hàng / đơn vị</label>
          <input
            {...register("merchant_name")}
            placeholder="VD: Chợ đầu mối, Siêu thị..."
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Ngày *</label>
          <input
            {...register("transaction_date")}
            type="date"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Ghi chú</label>
          <textarea
            {...register("description")}
            rows={2}
            placeholder="Ghi chú thêm..."
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          id="btn-save-transaction"
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? "Đang lưu..." : "Lưu giao dịch"}
        </button>
      </form>
    </div>
  );
}
