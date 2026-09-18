"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Store, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const profileSchema = z.object({
  full_name: z.string().max(255).optional().or(z.literal("")),
  business_name: z.string().max(255).optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      business_name: user?.business_name || "",
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      setError(null);
      await updateProfile({
        full_name: data.full_name || undefined,
        business_name: data.business_name || undefined,
      });
      router.push("/");
    } catch {
      setError("Cập nhật hồ sơ thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="px-5 lg:px-8 py-5 max-w-lg mx-auto space-y-5 rise-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Quay lại"
          className="p-2 rounded-xl bg-paper-elevated border border-rule text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <h1 className="font-serif-display text-xl text-ink text-balance">Hồ sơ của bạn</h1>
      </div>

      <div className="ledger-sheet p-5">
        <p className="text-ink-faint text-xs font-semibold uppercase tracking-wide mb-1.5">Email</p>
        <p className="text-ink text-sm mb-5">{user?.email}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
          <div>
            <label
              htmlFor="field-full-name"
              className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block"
            >
              Họ và tên
            </label>
            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint"
                aria-hidden="true"
              />
              <input
                id="field-full-name"
                {...register("full_name")}
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/40 focus-visible:border-brass transition-[border-color,box-shadow]"
              />
            </div>
            {errors.full_name && (
              <p className="text-expense text-xs mt-1.5">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="field-business-name"
              className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5 block"
            >
              Tên hộ kinh doanh
            </label>
            <div className="relative">
              <Store
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint"
                aria-hidden="true"
              />
              <input
                id="field-business-name"
                {...register("business_name")}
                autoComplete="organization"
                placeholder="Quán ăn Hương Quê"
                className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/40 focus-visible:border-brass transition-[border-color,box-shadow]"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-expense-soft border border-expense/25 rounded-xl px-3.5 py-2.5 text-expense text-sm"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-save-profile"
            className="w-full bg-ink hover:bg-ink/90 disabled:opacity-60 text-paper font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </form>
      </div>
    </div>
  );
}
