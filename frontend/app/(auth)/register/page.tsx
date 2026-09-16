"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api-client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Loader2, Mail, Lock, User, Store, BookOpen } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  full_name: z.string().min(1, "Vui lòng nhập họ tên").max(100),
  business_name: z.string().max(100).optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await authApi.register(data);
      await login(data.email, data.password);
      router.push("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-paper">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-paper px-16 py-14 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(251,246,236,1) 1px, transparent 1px)",
            backgroundSize: "100% 2.4rem",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-brass-soft" aria-hidden="true" />
          <span className="font-serif-display text-lg tracking-tight">Sổ Cái AI</span>
        </div>

        <div className="relative max-w-md">
          <p className="font-serif-display text-4xl leading-[1.15] text-balance">
            Mở một cuốn sổ mới
            <br />
            cho việc kinh doanh của bạn.
          </p>
          <p className="mt-5 text-paper/70 text-[15px] leading-relaxed">
            Miễn phí, dựng trong 1 phút. Không cần biết kế toán để bắt đầu
            ghi chép.
          </p>
        </div>

        <div className="relative flex items-center gap-8 text-sm text-paper/60 border-t border-paper/15 pt-6">
          <span>Nhập nhanh</span>
          <span>Báo cáo tự động</span>
          <span>Gợi ý từ AI</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm rise-in">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <BookOpen className="w-6 h-6 text-brass" aria-hidden="true" />
            <span className="font-serif-display text-xl text-ink">Sổ Cái AI</span>
          </div>

          <h1 className="font-serif-display text-2xl text-ink text-center lg:text-left">
            Tạo tài khoản
          </h1>
          <p className="text-ink-muted text-sm mt-1.5 text-center lg:text-left">
            Bắt đầu cuốn sổ thu chi miễn phí
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-7">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Họ và tên *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("full_name")}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
                />
              </div>
              {errors.full_name && (
                <p className="text-expense text-xs mt-1.5">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Tên hộ kinh doanh
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("business_name")}
                  placeholder="Quán ăn Hương Quê (tùy chọn)"
                  className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="email@example.com"
                  className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
                />
              </div>
              {errors.email && (
                <p className="text-expense text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Mật khẩu *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
                />
              </div>
              {errors.password && (
                <p className="text-expense text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-expense-soft border border-expense/25 rounded-xl px-3.5 py-2.5 text-expense text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-register"
              className="w-full bg-ink hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed text-paper font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-ledger"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-sm mt-6">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-brass font-semibold hover:text-brass-dark transition">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
