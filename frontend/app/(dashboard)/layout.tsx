"use client";

import { useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  LayoutDashboard,
  List,
  BarChart2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/transactions", icon: List, label: "Giao dịch" },
  { href: "/reports", icon: BarChart2, label: "Báo cáo" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" aria-hidden="true" />
        <span className="sr-only">Đang tải…</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto relative">
      {/* Main content — wrapped for view transitions */}
      <main className="flex-1 pb-20 overflow-y-auto" id="main-content">
        <ViewTransition>{children}</ViewTransition>
      </main>

      {/* Bottom Navigation */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 safe-bottom"
      >
        <div className="glass border-t border-slate-700/50 px-2 py-2">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  id={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => startTransition(() => {})}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                    isActive
                      ? "text-indigo-400"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
