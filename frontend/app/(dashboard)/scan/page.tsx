"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { receiptApi } from "@/lib/api-client";
import { CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

type Step = "pick" | "scanning" | "review" | "done";

const confirmSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  category: z.string().min(1),
  description: z.string().optional(),
  merchant_name: z.string().optional(),
  transaction_date: z.string().min(1, "Vui lòng chọn ngày"),
});

type ConfirmForm = z.infer<typeof confirmSchema>;

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

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmForm>({ resolver: zodResolver(confirmSchema) });

  const txType = watch("type");

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      setStep("scanning");
      setScanError(null);

      try {
        const res = await receiptApi.scan(file);
        const { receipt_id, suggested_transaction } = res.data;
        setReceiptId(receipt_id);

        // Pre-fill form with AI suggestions
        const tx = suggested_transaction;
        setValue("type", tx.type);
        setValue("amount", tx.amount);
        setValue("category", tx.category);
        setValue("description", tx.description || "");
        setValue("merchant_name", tx.merchant_name || "");
        setValue(
          "transaction_date",
          tx.transaction_date || new Date().toISOString().split("T")[0]
        );
        setStep("review");
      } catch {
        setScanError("Không thể đọc hóa đơn. Hãy thử ảnh rõ hơn hoặc nhập thủ công.");
        setStep("pick");
      }
    },
    [setValue]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const onConfirm = async (data: ConfirmForm) => {
    if (!receiptId) return;
    await receiptApi.confirm(receiptId, data);
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="min-h-[80dvh] flex flex-col items-center justify-center p-6 fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Đã lưu thành công!</h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          Giao dịch đã được thêm vào danh sách
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep("pick");
              setPreview(null);
              setReceiptId(null);
            }}
            className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Quét thêm
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div className="min-h-[80dvh] flex flex-col items-center justify-center p-6">
        {preview && (
          <div className="w-40 h-52 relative rounded-2xl overflow-hidden mb-6 border border-indigo-500/30 ai-pulse">
            <Image src={preview} alt="Hóa đơn" fill className="object-cover" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <p className="text-white font-medium">AI đang phân tích hóa đơn...</p>
        </div>
        <p className="text-slate-500 text-sm mt-2">Thường mất 5-10 giây</p>
      </div>
    );
  }

  if (step === "review") {
    const filteredCats = CATEGORIES.filter((c) => c.type === txType || c.value === "OTHER");
    return (
      <div className="p-4 space-y-4 fade-in">
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setStep("pick")}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-white">Xem lại & Xác nhận</h2>
        </div>

        {preview && (
          <div className="w-full h-36 relative rounded-2xl overflow-hidden border border-slate-700">
            <Image src={preview} alt="Hóa đơn" fill className="object-contain bg-slate-900" />
            <div className="absolute top-2 right-2 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI đã điền
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onConfirm)} className="space-y-3">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setValue("type", "expense"); setValue("category", "OTHER"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                txType === "expense"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => { setValue("type", "income"); setValue("category", "SALES"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                txType === "income"
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Thu nhập
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Số tiền (VND)</label>
            <input
              {...register("amount")}
              type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Danh mục</label>
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
            <label className="text-xs text-slate-400 mb-1 block">Tên cửa hàng / đơn vị</label>
            <input
              {...register("merchant_name")}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ngày giao dịch</label>
            <input
              {...register("transaction_date")}
              type="date"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ghi chú (tùy chọn)</label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-confirm-receipt"
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Đang lưu..." : "Xác nhận & Lưu"}
          </button>
        </form>
      </div>
    );
  }

  // Step: pick
  return (
    <div className="p-4 space-y-4 fade-in">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-white">Quét hóa đơn</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          AI sẽ tự động trích xuất thông tin
        </p>
      </div>

      {scanError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {scanError}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
        id="file-input-scan"
      />

      {/* Camera */}
      <button
        onClick={() => fileInputRef.current?.click()}
        id="btn-open-camera"
        className="w-full glass rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-indigo-500/40 transition group active:scale-95"
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition">
          <Camera className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Chụp ảnh hóa đơn</p>
          <p className="text-slate-400 text-xs mt-0.5">Mở camera điện thoại</p>
        </div>
      </button>

      {/* Upload */}
      <label
        htmlFor="file-input-upload"
        className="w-full glass rounded-2xl p-6 flex items-center gap-4 hover:border-indigo-500/40 transition cursor-pointer group active:scale-95"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-700 transition">
          <Upload className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">Chọn từ thư viện ảnh</p>
          <p className="text-slate-400 text-xs">JPEG, PNG, WebP — tối đa 10MB</p>
        </div>
        <input
          id="file-input-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </label>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-medium mb-1">AI tự động điền</p>
            <p className="text-slate-400 text-xs">
              Gemini Vision sẽ đọc và phân loại hóa đơn của bạn. Bạn chỉ cần
              kiểm tra và xác nhận.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
