"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/hooks/use-auth";
import { Loader2, Mail, Lock, BookOpen } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data.email, data.password);
      router.push("/");
    } catch {
      setError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-paper">
      {/* Brand panel — hidden on mobile, ledger cover art on desktop */}
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
            Mỗi đồng ra vào,
            <br />
            một dòng sổ rõ ràng.
          </p>
          <p className="mt-5 text-paper/70 text-[15px] leading-relaxed">
            Ghi chép thu chi mỗi ngày, để AI đọc số liệu thật và nhắc bạn
            trước khi dòng tiền gặp rủi ro.
          </p>
        </div>

        <div className="relative flex items-center gap-8 text-sm text-paper/60 border-t border-paper/15 pt-6">
          <span>Theo dõi dòng tiền</span>
          <span>Phân tích AI</span>
          <span>Cảnh báo bất thường</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm rise-in">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <BookOpen className="w-6 h-6 text-brass" aria-hidden="true" />
            <span className="font-serif-display text-xl text-ink">Sổ Cái AI</span>
          </div>

          <h1 className="font-serif-display text-2xl text-ink text-center lg:text-left">
            Đăng nhập
          </h1>
          <p className="text-ink-muted text-sm mt-1.5 text-center lg:text-left">
            Mở lại sổ thu chi của bạn
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-7">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="ban@cuahang.vn"
                  className="w-full bg-paper border border-rule rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass transition"
                />
              </div>
              {errors.email && (
                <p className="text-expense text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
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
              id="btn-login"
              className="w-full bg-ink hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed text-paper font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-ledger"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-sm mt-6">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-brass font-semibold hover:text-brass-dark transition">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
